"""WeatherGPT FastAPI application.

Run with ``uvicorn main:app --host 0.0.0.0 --port 3000``.  The API keeps the
same paths as the former Express server and serves the framework-free client.
"""

from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from gemini_service import process_weather_chat
from aviation import get_aviation_data
from marine import get_marine_data
from route_weather import get_route_weather
from sarvam import SarvamError, text_to_speech as sarvam_text_to_speech
from weather_service import weather_service
from weather_hub import get_weather_hub
from database import (
    DatabaseUnavailableError,
    close_database,
    database_is_connected,
    get_profile,
    initialize_database,
    save_profile,
)

load_dotenv()

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "front-end"
DEFAULT_LAT, DEFAULT_LON, DEFAULT_NAME = 19.076, 72.877, "Mumbai"

@asynccontextmanager
async def lifespan(_: FastAPI):
    await initialize_database()
    try:
        yield
    finally:
        await close_database()


app = FastAPI(
    title="WeatherGPT Meteorological Intelligence Server",
    version="2.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class AgricultureRequest(BaseModel):
    location: str = "Mumbai"
    lat: float = Field(DEFAULT_LAT, ge=-90, le=90)
    lon: float = Field(DEFAULT_LON, ge=-180, le=180)
    crop: str = "Kharif Crops"
    growth_stage: str = ""
    soil_moisture: float | None = None
    soil_type: str = ""
    water_capacity: str = ""
    irrigation_status: str = ""
    planting_date: str = ""
    farm_note: str = ""


class TravelRequest(BaseModel):
    origin: str = "Mumbai"
    destination: str = "Pune"


class ChatRequest(BaseModel):
    message: str = Field(max_length=4000)
    currentLocation: dict[str, Any] | None = None
    language: str = "en"
    mode: str = "normal"
    history: list[dict[str, str]] = Field(default_factory=list)


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language: str = "en"
    speaker: str = "priya"


class ProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    location: dict[str, Any] = Field(default_factory=dict)
    language: str = Field(default="en", min_length=2, max_length=20)
    crops_info: str = Field(default="", max_length=2000)


radar_cache: tuple[float, dict[str, Any]] | None = None


def coordinates(request: Request) -> tuple[float, float, str]:
    def number(name: str, default: float) -> float:
        raw = request.query_params.get(name)
        if raw is None:
            return default
        try:
            return float(raw)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid {name}") from exc

    return number("lat", DEFAULT_LAT), number("lon", DEFAULT_LON), request.query_params.get("name", DEFAULT_NAME)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "WeatherGPT Meteorological Intelligence Server",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected" if database_is_connected() else "unavailable",
    }


@app.get("/api/profiles/{profile_type}/{profile_id}")
async def read_profile(profile_type: str, profile_id: UUID) -> dict[str, Any]:
    try:
        profile = await get_profile(profile_type, profile_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail="Profile database is unavailable") from exc
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.put("/api/profiles/{profile_type}/{profile_id}")
async def write_profile(profile_type: str, profile_id: UUID, payload: ProfileRequest) -> dict[str, Any]:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    try:
        return await save_profile(
            profile_type,
            profile_id,
            payload.name.strip(),
            payload.location,
            payload.language,
            payload.crops_info.strip(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail="Profile database is unavailable") from exc


@app.get("/api/location/search")
async def search_location(q: str = "") -> list[dict[str, Any]]:
    return [item.model_dump() if hasattr(item, "model_dump") else item.dict() for item in await weather_service.search_location(q)]


@app.get("/api/location/reverse")
async def reverse_location(lat: str | None = None, lon: str | None = None) -> dict[str, Any]:
    try:
        latitude = float(lat) if lat is not None else None
        longitude = float(lon) if lon is not None else None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Valid latitude and longitude required") from exc
    if latitude is None or longitude is None or not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise HTTPException(status_code=400, detail="Valid latitude and longitude required")
    result = await weather_service.reverse_geocode(latitude, longitude)
    return result.model_dump() if hasattr(result, "model_dump") else result.dict()


@app.get("/api/location/nearby")
async def nearby_locations(request: Request) -> list[dict[str, Any]]:
    lat, lon, _ = coordinates(request)
    try:
        return await weather_service.search_nearby(lat, lon)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Nearby location data temporarily unavailable") from exc


@app.get("/api/weather/current")
async def current_weather(request: Request) -> dict[str, Any]:
    lat, lon, name = coordinates(request)
    try:
        return await weather_service.get_weather_data(lat, lon, name)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Weather data temporarily unavailable from provider. Please try again shortly.") from exc


@app.get("/api/intelligence/hub")
async def intelligence_hub(request: Request) -> dict[str, Any]:
    lat, lon, name = coordinates(request)
    try:
        return await get_weather_hub(weather_service, lat, lon, name)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Weather Intelligence data unavailable") from exc


@app.get("/api/intelligence/aviation")
async def aviation_intelligence(request: Request) -> dict[str, Any]:
    lat, lon, name = coordinates(request)
    airport = request.query_params.get("airport", "VAAH")
    try:
        return await get_aviation_data(weather_service, lat, lon, name, airport)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Aviation intelligence data unavailable") from exc


@app.get("/api/intelligence/marine")
async def marine_intelligence(request: Request) -> dict[str, Any]:
    lat, lon, name = coordinates(request)
    try:
        return await get_marine_data(weather_service, lat, lon, name)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Marine intelligence data unavailable") from exc


@app.get("/api/intelligence/route")
async def route_intelligence(
    origin: str = Query("Ahmedabad", min_length=1),
    destination: str = Query("Mumbai", min_length=1),
    mode: str = Query("general", min_length=1),
) -> dict[str, Any]:
    try:
        return await get_route_weather(weather_service, origin, destination, mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Route intelligence data unavailable") from exc


@app.get("/api/weather/alerts")
async def weather_alerts(request: Request) -> dict[str, Any]:
    lat, lon, name = coordinates(request)
    try:
        data = await weather_service.get_weather_data(lat, lon, name)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Unable to retrieve alert feed") from exc
    current = data.get("current") or {}
    daily = data.get("daily") or []
    raw_alerts = data.get("alerts") or []
    level_map = {"emergency": "emergency", "warning": "warning", "advisory": "info", "watch": "watch"}
    alerts = [
        {
            **alert,
            "level": level_map.get(str(alert.get("severity", "")).lower(), "info"),
            "type": alert.get("event", "Weather alert"),
            "summary": alert.get("headline") or alert.get("description", "Verified weather alert"),
            "affected_area": alert.get("area", name),
            "farmer_advice": alert.get("instruction", ""),
            "ai_explanation": alert.get("description", ""),
        }
        for alert in raw_alerts
    ]
    rain_amount = max(
        [float(day.get("precipitationSum", 0) or 0) for day in daily[:2]]
        + [float(current.get("precipitation", 0) or 0)]
    )
    rain_probability = max(
        [int(day.get("precipitationProbabilityMax", 0) or 0) for day in daily[:2]]
        + [int(current.get("precipitationProbability", 0) or 0)]
    )
    crop_level = "High" if rain_amount >= 50 or current.get("temperature", 0) >= 40 else "Moderate" if rain_amount >= 20 else "Low"
    flood_score = min(100, round(rain_amount * 1.2 + rain_probability * 0.25))
    return {
        "location": name,
        "alerts": alerts,
        "rainfall_24h": {
            "expected": rain_amount > 0 or rain_probability >= 30,
            "amount_mm": round(rain_amount, 1),
            "probability": rain_probability,
            "window": "Next 24 hours",
        },
        "crop_risk": {"level": crop_level, "advice": "Inspect drainage and adjust irrigation to the verified forecast."},
        "flood_risk": {"score": flood_score, "level": "High" if flood_score >= 60 else "Moderate" if flood_score >= 30 else "Low", "summary": "Derived from verified rainfall and precipitation probability."},
        "history": [
            {"type": alert["type"], "level": alert["level"], "time": alert.get("issuedAt", "Recent")}
            for alert in alerts
        ],
        "source": "Official Meteorological Alert Feeds (IMD/WMO Criteria)",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/weather/radar-maps")
async def radar_maps() -> dict[str, Any]:
    global radar_cache
    if radar_cache and time.monotonic() - radar_cache[0] < 120:
        return radar_cache[1]
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(12, connect=5), headers={"User-Agent": "WeatherGPT/2.0"}) as client:
            response = await client.get("https://api.rainviewer.com/public/weather-maps.json")
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise ValueError("Unexpected radar payload")
            radar_cache = (time.monotonic(), data)
            return data
    except (httpx.HTTPError, ValueError):
        rounded = int(time.time() // 600 * 600)
        fallback = {"host": "https://tilecache.rainviewer.com", "radar": {"past": [{"time": rounded, "path": f"/v2/radar/{rounded}/256/{{z}}/{{x}}/{{y}}/2/1_1.png"}], "nowcast": []}, "satellite": {"infrared": [{"time": rounded, "path": f"/v2/satellite/{rounded}/256/{{z}}/{{x}}/{{y}}/0/0_0.png"}]}}
        radar_cache = (time.monotonic(), fallback)
        return fallback


@app.get("/api/cyclones")
async def cyclones(request: Request) -> list[dict[str, Any]]:
    lat, lon, _ = coordinates(request)
    try:
        return await weather_service.get_cyclone_info(lat, lon)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Live cyclone feed unavailable") from exc


@app.get("/api/climate/trends")
async def climate_trends(request: Request) -> dict[str, Any]:
    lat, lon, name = coordinates(request)
    try:
        return await weather_service.get_historical_climate(lat, lon, name)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Historical climate data unavailable") from exc


@app.post("/api/advisory/agriculture")
async def agriculture(payload: AgricultureRequest) -> dict[str, Any]:
    try:
        return await weather_service.generate_agriculture_advisory(
            payload.location, payload.lat, payload.lon, payload.crop,
            payload.growth_stage, payload.soil_moisture, payload.soil_type,
            payload.water_capacity, payload.irrigation_status,
            payload.planting_date, payload.farm_note,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Agriculture advisory generation failed") from exc


@app.post("/api/advisory/travel")
async def travel(payload: TravelRequest) -> dict[str, Any]:
    try:
        return await weather_service.generate_travel_advisory(payload.origin, payload.destination)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Travel advisory generation failed") from exc


@app.post("/api/chat")
async def chat(payload: ChatRequest) -> dict[str, Any]:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message content is required")
    try:
        return await process_weather_chat(payload.model_dump() if hasattr(payload, "model_dump") else payload.dict())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        return {"content": "Weather advisory telemetry is updating. Please try your question again in a moment.", "toolCalls": [], "sources": ["Real-time Meteorological Feed"]}


@app.post("/api/tts")
async def text_to_speech(payload: TTSRequest) -> Response:
    try:
        audio = await sarvam_text_to_speech(payload.text, payload.language, payload.speaker)
        return Response(content=audio, media_type="audio/wav")
    except SarvamError as exc:
        status = 503 if "not configured" in str(exc) else 502
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception) -> JSONResponse:
    # Do not leak provider credentials or stack traces to clients.
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    return JSONResponse(status_code=500, content={"error": "Internal WeatherGPT service error"})


@app.get("/{path:path}", include_in_schema=False)
async def frontend(path: str) -> FileResponse:
    requested = (STATIC_DIR / path).resolve()
    if requested.is_file() and STATIC_DIR.resolve() in requested.parents:
        return FileResponse(requested)
    return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "3000")),
        reload=os.getenv("RELOAD", "false").lower() == "true",
    )

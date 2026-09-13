"""Aviation operational weather intelligence."""

import asyncio
from typing import Any

import httpx

from weather_service import WeatherService

AIRPORTS = {
    "VIDP": ("Delhi", 28.5562, 77.1000),
    "VABB": ("Mumbai", 19.0896, 72.8656),
    "VAAH": ("Ahmedabad", 23.0772, 72.6347),
    "VOGO": ("Goa", 15.3808, 73.8314),
    "VOBL": ("Bengaluru", 13.1986, 77.7066),
}


async def _aviation_feed(icao: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    async with httpx.AsyncClient(timeout=15, headers={"User-Agent": "WeatherGPT/1.0 aviation-demo"}) as client:
        metar_response, taf_response = await asyncio.gather(
            client.get("https://aviationweather.gov/api/data/metar", params={"ids": icao, "format": "json"}),
            client.get("https://aviationweather.gov/api/data/taf", params={"ids": icao, "format": "json"}),
        )
    metar = metar_response.json()[0] if metar_response.is_success and metar_response.json() else None
    taf = taf_response.json()[0] if taf_response.is_success and taf_response.json() else None
    return metar, taf


async def get_aviation_data(
    service: WeatherService, lat: float, lon: float, location_name: str, airport: str = "VAAH"
) -> dict[str, Any]:
    icao = airport.upper().strip() if airport else "VAAH"
    airport_info = AIRPORTS.get(icao)
    if airport_info:
        location_name, lat, lon = airport_info
    weather = await service.get_weather_data(lat, lon, location_name)
    current = weather["current"]
    try:
        metar, taf = await _aviation_feed(icao)
    except (httpx.HTTPError, ValueError, IndexError):
        metar, taf = None, None
    alerts = weather.get("alerts") or []
    storm_alert = next(
        (alert for alert in alerts if "storm" in alert.get("event", "").lower()),
        None,
    )
    risk = min(
        100,
        round(
            current["windSpeed"] * 0.8
            + max(0, 10 - current["visibility"]) * 4
            + current["precipitationProbability"] * 0.25
            + (25 if storm_alert else 0)
        ),
    )
    return {
        "location": f"{location_name} Airport ({icao})",
        "risk": {"score": risk, "level": "HIGH" if risk >= 70 else "MODERATE" if risk >= 35 else "LOW"},
        "metrics": {
            "windSpeed": current["windSpeed"],
            "visibility": current["visibility"],
            "weather": current["weatherDescription"],
            "metar": metar.get("rawOb") if metar else None,
            "taf": taf.get("rawTAF") if taf else None,
            "flightCategory": metar.get("fltCat") if metar else None,
            "ceiling": metar.get("clouds") if metar else None,
        },
        "hazard": {
            "title": storm_alert["event"] if storm_alert else "No active thunderstorm alert",
            "detail": storm_alert["description"] if storm_alert else "Continue monitoring the verified forecast.",
        },
        "updatedAt": weather["updatedAt"],
        "source": "AviationWeather.gov METAR/TAF + Open-Meteo forecast",
        "airport": {"icao": icao, "name": location_name, "latitude": lat, "longitude": lon},
        "dataQuality": {
            "metar": "live" if metar else "unavailable",
            "taf": "live" if taf else "unavailable",
        },
    }

"""Marine operational weather intelligence."""

from typing import Any

from weather_service import WeatherService


async def get_marine_data(
    service: WeatherService, lat: float, lon: float, location_name: str
) -> dict[str, Any]:
    weather = await service.get_weather_data(lat, lon, location_name)
    current = weather["current"]
    marine = await service.get_marine_data(lat, lon, location_name)
    marine_current = marine.get("current") or {}
    wave_height = marine_current.get("wave_height")
    wave_source = "Open-Meteo Marine"
    if wave_height is None:
        wave_height = None
        wave_source = "Wave observation unavailable"
    wave_height = round(float(wave_height), 1) if wave_height is not None else None
    risk = min(100, round(current["windSpeed"] * 1.25 + (wave_height or 0) * 12 + current["precipitationProbability"] * 0.2))
    return {
        "location": location_name,
        "risk": {"score": risk, "level": "HIGH" if risk >= 70 else "MODERATE" if risk >= 35 else "LOW"},
        "metrics": {
            "windSpeed": current["windSpeed"],
            "waveHeight": wave_height,
            "wavePeriod": marine_current.get("wave_period"),
            "waveDirection": marine_current.get("wave_direction"),
            "tide": None,
        },
        "dataQuality": {
            "wave": "measured/provider data" if wave_height is not None else "unavailable",
            "tide": "Tide data unavailable",
            "source": wave_source,
        },
        "seaState": {
            "rainSeverity": "Heavy" if current["precipitationProbability"] >= 70 else "Moderate" if current["precipitationProbability"] >= 35 else "Low",
            "weather": current["weatherDescription"],
        },
        "updatedAt": weather["updatedAt"],
        "source": weather["source"],
    }

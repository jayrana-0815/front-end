"""Weather Intelligence hub data assembled from the shared weather service."""

from typing import Any

from weather_service import WeatherService


async def get_weather_hub(
    service: WeatherService, lat: float, lon: float, location_name: str
) -> dict[str, Any]:
    weather = await service.get_weather_data(lat, lon, location_name)
    current = weather["current"]
    return {
        "location": location_name,
        "coordinates": {"lat": lat, "lon": lon},
        "summary": {
            "temperature": current["temperature"],
            "condition": current["weatherDescription"],
            "windSpeed": current["windSpeed"],
            "precipitationProbability": current["precipitationProbability"],
        },
        "modes": ["aviation", "marine", "routeWeather"],
        "updatedAt": weather["updatedAt"],
        "source": weather["source"],
    }

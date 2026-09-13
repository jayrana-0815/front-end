"""Route weather intelligence backed by the shared travel advisory."""

from typing import Any

from weather_service import WeatherService


async def get_route_weather(
    service: WeatherService, origin: str, destination: str, mode: str = "general"
) -> dict[str, Any]:
    advisory = await service.generate_route_intelligence(origin.strip(), destination.strip(), mode)
    return {
        **advisory,
        "routeRiskScore": advisory.get("routeRiskScore", 50),
        "source": "WeatherGPT route advisory using verified weather telemetry",
    }

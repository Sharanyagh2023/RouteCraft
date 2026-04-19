import httpx

from app.core.config import settings


async def is_raining(lat: float, lng: float) -> bool:
    if not settings.openweather_api_key:
        return False
    params = {
        "lat": lat,
        "lon": lng,
        "appid": settings.openweather_api_key,
        "units": "metric",
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get("https://api.openweathermap.org/data/2.5/weather", params=params)
            response.raise_for_status()
            payload = response.json()
            condition = str(payload.get("weather", [{}])[0].get("main", "")).lower()
            return condition in {"rain", "drizzle", "thunderstorm"}
    except Exception:
        return False

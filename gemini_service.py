"""Gemini-backed chat with a deterministic, telemetry-grounded fallback."""

from __future__ import annotations

import os
import re
from datetime import date, timedelta
from typing import Any

import httpx

from droq_farm import groq_farmer_reply
from weather_service import WeatherService, weather_service


LANGUAGE_NAMES = {"en": "English", "hi": "Hindi (हिन्दी)", "mr": "Marathi (मराठी)", "bn": "Bengali (বাংলা)", "ta": "Tamil (தமிழ்)", "te": "Telugu (తెలుగు)", "gu": "Gujarati (ગુજરાતી)", "kn": "Kannada (ಕನ್ನಡ)", "ml": "Malayalam (മലയാളം)", "pa": "Punjabi (ਪੰਜਾਬੀ)", "or": "Odia (ଓଡ଼ିଆ)"}


def detect_language_from_query(message: str, fallback_lang: str = "en") -> dict[str, str]:
    query = (message or "").lower()
    scripts = [("bn", r"[\u0980-\u09ff]"), ("ta", r"[\u0b80-\u0bff]"), ("te", r"[\u0c00-\u0c7f]"), ("gu", r"[\u0a80-\u0aff]"), ("kn", r"[\u0c80-\u0cff]"), ("ml", r"[\u0d00-\u0d7f]"), ("pa", r"[\u0a00-\u0a7f]"), ("or", r"[\u0b00-\u0b7f]")]
    if any(word in query for word in ("marathi", "मराठी", "marathit")) or re.search(r"\b(havaman|udya|paus|marathi)\b", query):
        code = "mr"
    elif any(word in query for word in ("hindi", "हिंदी", "हिन्दी", "devanagari")) or re.search(r"\b(batao|kaisa|mausam|barish|aaj|aaj|hoga|kyaa|kya|pani|sakt|jaana|du|doon)\b", query) or re.search(r"[\u0900-\u097f]", message or ""):
        code = "hi"
    else:
        code = next((candidate for candidate, pattern in scripts if re.search(pattern, message or "")), "")
        code = code or next((candidate for candidate in LANGUAGE_NAMES if (fallback_lang or "en").lower().startswith(candidate)), "en")
    return {"code": code, "name": LANGUAGE_NAMES.get(code, "English")}


def _format_history(history: list[dict[str, str]] | None) -> str:
    if not history:
        return "No previous conversation."
    entries = []
    for item in history[-8:]:
        role = "User" if item.get("role") == "user" else "WeatherGPT"
        content = (item.get("content") or "").strip()
        if content:
            entries.append(f"{role}: {content[:1200]}")
    return "\n".join(entries) or "No previous conversation."


async def _gemini_reply(
    message: str,
    context: str,
    language: str,
    history: list[dict[str, str]] | None = None,
) -> str | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key in {"MY_GEMINI_API_KEY", "your-api-key"}:
        return None
    models = [os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), "gemini-2.0-flash", "gemini-2.5-flash-lite"]
    prompt = f"""You are WeatherGPT, an authoritative meteorological assistant. Answer the user's exact question first, then give complete, concise actionable advice. Use only the verified telemetry below and answer entirely in {LANGUAGE_NAMES.get(language, 'English')}. The forecast list contains dated daily data; use the requested date, month, or relative day when it is present. Never claim you cannot access a future date if that date appears in the verified forecast. Do not stop mid-sentence or omit requested parts.
Recent conversation:
{_format_history(history)}
Verified telemetry:
{context}
User question: {message}"""
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1800}}
    async with httpx.AsyncClient(timeout=httpx.Timeout(25, connect=8), headers={"User-Agent": "WeatherGPT/2.0"}) as client:
        for model in models:
            try:
                response = await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", params={"key": api_key}, json=body)
                if response.status_code in (429, 500, 502, 503):
                    continue
                response.raise_for_status()
                parts = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
                text = "\n".join(part.get("text", "") for part in parts).strip()
                if text:
                    return text
            except (httpx.HTTPError, ValueError, KeyError, IndexError):
                continue
    return None


async def _direct_response(
    message: str,
    location: dict[str, Any] | None,
    lang: str,
    service: WeatherService,
    is_farmer_chat: bool = False,
) -> dict[str, Any]:
    current_location = location or {"name": "Mumbai", "latitude": 19.076, "longitude": 72.877}
    found_location = current_location
    query = (message or "").lower()
    city_aliases = {
        "मुंबई": "mumbai", "बंबई": "mumbai", "दिल्ली": "delhi", "पुणे": "pune",
        "बेंगलुरु": "bengaluru", "चेन्नई": "chennai", "कोलकाता": "kolkata",
        "हैदराबाद": "hyderabad", "अहमदाबाद": "ahmedabad", "जयपुर": "jaipur",
    }
    requested_city = next((city for city in city_aliases if city in query), None)
    search_city = city_aliases.get(requested_city, requested_city)
    if not search_city:
        cities = ("delhi", "mumbai", "pune", "bengaluru", "bangalore", "chennai", "kolkata", "hyderabad", "ahmedabad", "jaipur", "nagpur", "goa", "kochi", "surat")
        search_city = next((city for city in cities if city in query), None)
    if not search_city:
        romanized_cities = {
            "delhii": "delhi", "dilli": "delhi", "dillii": "delhi",
            "bambai": "mumbai", "mumbaई": "mumbai", "puney": "pune",
        }
        search_city = next((canonical for alias, canonical in romanized_cities.items() if alias in query), None)
    if search_city:
        matches = await service.search_location(search_city)
        if matches:
            found_location = matches[0].model_dump() if hasattr(matches[0], "model_dump") else matches[0].dict()
    try:
        weather = await service.get_weather_data(float(found_location["latitude"]), float(found_location["longitude"]), found_location["name"])
    except RuntimeError:
        return {"content": f"### {found_location['name']} telemetry\n\nLive weather data is temporarily unavailable. Please try again shortly.", "toolCalls": [], "sources": ["Meteorological Network"]}
    cur, aq = weather["current"], weather.get("airQuality") or {}
    target_day = _requested_forecast_day(query, weather.get("daily") or [])
    forecast = target_day or {}
    rain = forecast.get("precipitationProbabilityMax", cur["precipitationProbability"])
    temp = forecast.get("tempMax", cur["temperature"])
    wind = forecast.get("windSpeedMax", cur["windSpeed"])
    target_label = forecast.get("date") or "today"
    is_irrigation_question = any(word in query for word in (
        "pani", "पानी", "sinchai", "सिंचाई", "irrigat", "water", "doon", "dun",
    ))
    if is_irrigation_question and is_farmer_chat:
        irrigation_allowed = rain < 40 and float(forecast.get("precipitationSum", 0) or 0) < 5
        if lang == "hi":
            answer = "आज गेहूं में पानी दे सकते हैं, लेकिन पहले मिट्टी की नमी जाँचें।" if irrigation_allowed else "आज गेहूं में पानी रोकें; बारिश की संभावना या अपेक्षित वर्षा अधिक है।"
            content = f"### 🌾 गेहूं की सिंचाई सलाह\n\n{answer}\n\n- बारिश की संभावना: **{rain}%**\n- अधिकतम तापमान: **{temp}°C**\n- मौसम: **{forecast.get('weatherDescription', cur['weatherDescription'])}**\n\nमिट्टी की ऊपरी 5–7 सेमी परत सूखी हो तभी हल्की सिंचाई करें; खेत में पानी जमा न होने दें।"
        else:
            answer = "You can irrigate wheat today if the topsoil is dry." if irrigation_allowed else "Hold irrigation today because rain is likely."
            content = f"### Wheat irrigation advice\n\n**{answer}**\n\n- Rain probability: **{rain}%**\n- High: **{temp}°C**\n- Sky: **{forecast.get('weatherDescription', cur['weatherDescription'])}**\n\nCheck the top 5–7 cm of soil first and avoid waterlogging."
        return {"content": content, "toolCalls": [], "sources": ["Open-Meteo weather telemetry", "WeatherGPT irrigation guidance"]}
    if lang == "hi":
        if any(word in query for word in ("crop", "konsa", "कौन", "फसल", "खेती", "बोना", "लगाना")):
            content = f"### 🌾 {found_location['name']} फसल सलाह\n\nअभी तापमान **{temp}°C**, बारिश की संभावना **{rain}%** और मौसम **{forecast.get('weatherDescription', cur['weatherDescription'])}** है।\n\n**सुझाव:** कम बारिश और गर्म मौसम में बाजरा, मूंगफली या कपास जैसी फसलें उपयुक्त हो सकती हैं। यदि मिट्टी में नमी अच्छी है तो सब्जियां भी लगाई जा सकती हैं। स्थानीय मिट्टी, पानी और कृषि विभाग की सलाह देखकर अंतिम निर्णय लें।"
            return {"content": content, "toolCalls": [], "sources": ["Open-Meteo weather telemetry", "Seasonal crop guidance"]}
        is_travel = any(word in query for word in ("जा सकता", "जाना", "यात्रा", "सफर", "मुंबई", "delhi", "dilli", "ja", "sakt"))
        verdict = ("यात्रा की जा सकती है; मौसम सामान्य है, लेकिन निकलने से पहले मार्ग और लाइव ट्रैफिक जांचें।"
                   if is_travel and rain < 40 else
                   "बारिश का खतरा है; छाता रखें और सड़क पर सावधानी बरतें।"
                   if rain >= 40 else
                   "मौसम सामान्य और अपेक्षाकृत स्थिर है।")
        content = f"### 📍 {found_location['name']} मौसम ब्रीफिंग ({target_label})\n\n**निर्णय:** {verdict}\n\n- अधिकतम तापमान: **{temp}°C**\n- न्यूनतम तापमान: **{forecast.get('tempMin', cur['temperature'])}°C**\n- स्थिति: **{forecast.get('weatherDescription', cur['weatherDescription'])}**\n- बारिश की संभावना: **{rain}%**\n- हवा: **{wind} km/h**\n- AQI: **{aq.get('aqi', 'N/A')} ({aq.get('status', 'Good')})**\n\nयह गंतव्य के मौसम पर आधारित सलाह है; यात्रा शुरू करने से पहले मार्ग, ट्रैफिक और किसी आधिकारिक चेतावनी की जांच करें।"
    else:
        if any(word in query for word in ("crop", "which crop", "plant", "sow", "farming")):
            content = f"### 🌾 Crop guidance for {found_location['name']}\n\nCurrent conditions are **{forecast.get('weatherDescription', cur['weatherDescription'])}**, with a high of **{temp}°C** and **{rain}%** rain probability.\n\n**Suggestion:** Millet, groundnut, or cotton may suit warm, relatively dry conditions. Vegetables are possible where soil moisture and irrigation are reliable. Confirm soil type, water availability, and local agriculture guidance before planting."
            return {"content": content, "toolCalls": [], "sources": ["Open-Meteo weather telemetry", "Seasonal crop guidance"]}
        verdict = "Carry an umbrella and allow for wet-road delays." if rain >= 40 else "Conditions are broadly suitable for routine outdoor plans."
        if any(word in query for word in ("cricket", "football", "sports", "outdoor", "running")):
            verdict = "Outdoor activity is conditionally suitable; monitor showers and wind." if rain >= 35 else "Outdoor activity is favorable."
        elif any(word in query for word in ("travel", "drive", "trip", "highway", "जा सकता", "जाना", "यात्रा", "सफर", "delhi", "dilli", "ja", "sakt")):
            verdict = "Travel is possible with wet-road caution." if rain >= 35 else "Travel conditions look broadly safe."
        elif any(word in query for word in ("dry", "laundry", "clothes")):
            verdict = "Indoor drying is preferable." if rain >= 30 or cur["relativeHumidity"] >= 70 else "Outdoor drying should be favorable."
        content = f"### 📍 {found_location['name']} weather briefing ({target_label})\n\n**Verdict:** {verdict}\n\n- High: **{temp}°C** · Low: **{forecast.get('tempMin', cur['temperature'])}°C**\n- Sky: **{forecast.get('weatherDescription', cur['weatherDescription'])}**\n- Rain probability: **{rain}%**\n- Wind: **{wind} km/h**\n- AQI: **{aq.get('aqi', 'N/A')} ({aq.get('status', 'Good')})**\n\nFor a trip, check the departure route and live traffic before leaving; weather conditions can change during the day."
    return {"content": content, "toolCalls": [], "weatherSnapshot": {"location": found_location["name"], "temp": temp, "condition": cur["weatherDescription"], "feelsLike": cur["apparentTemperature"], "rainProb": rain, "humidity": cur["relativeHumidity"], "wind": wind}, "sources": ["Official Meteorological Open-Meteo High-Resolution Model", "Real-time Meteorological Feed"]}


def _requested_forecast_day(query: str, daily: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not daily:
        return None
    today = date.today()
    requested = today
    if "day after tomorrow" in query:
        requested = today + timedelta(days=2)
    elif "tomorrow" in query or "कल" in query:
        requested = today + timedelta(days=1)
    else:
        date_match = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", query)
        month_match = re.search(r"\b(?:on|for|in)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)", query)
        try:
            if date_match:
                day, month, year = map(int, (date_match.group(1), date_match.group(2), date_match.group(3) or today.year))
                requested = date(year + 2000 if year < 100 else year, month, day)
            elif month_match:
                month = next(index for index, name in enumerate(("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"), 1) if month_match.group(2).startswith(name))
                requested = date(today.year, month, int(month_match.group(1)))
                if requested < today:
                    requested = requested.replace(year=today.year + 1)
        except (ValueError, StopIteration):
            return None
    return min(daily, key=lambda item: abs((date.fromisoformat(item["date"]) - requested).days)) if any(item.get("date") for item in daily) else None


async def process_weather_chat(params: dict[str, Any]) -> dict[str, Any]:
    message = (params.get("message") or "").strip()
    if not message:
        raise ValueError("Message content is required")
    preferred_language = params.get("language", "en")
    detected = detect_language_from_query(message, preferred_language)
    if preferred_language in LANGUAGE_NAMES and not re.search(r"[\u0900-\u0dff]", message):
        detected = {"code": preferred_language, "name": LANGUAGE_NAMES[preferred_language]}
    location = params.get("currentLocation")
    service = weather_service
    is_farmer_chat = params.get("mode") == "farmer"
    if is_farmer_chat and location:
        country_code = str(location.get("countryCode") or location.get("country_code") or "").upper()
        country = str(location.get("country") or "").casefold()
        if country_code and country_code != "IN" and country not in {"india", "भारत"}:
            return {
                "content": "Farmer Assistant is currently limited to India-origin locations and crops.",
                "toolCalls": [],
                "sources": ["WeatherGPT India agriculture scope"],
            }
    try:
        loc = location or {"name": "Mumbai", "latitude": 19.076, "longitude": 72.877}
        city_matches = re.findall(
            r"\b(ahmedabad|mumbai|pune|delhi|bengaluru|bangalore|chennai|kolkata|hyderabad|jaipur|nagpur|goa|kochi|surat)\b",
            message.lower(),
        )
        if city_matches:
            matches = await service.search_location(city_matches[0])
            if matches:
                loc = matches[0].model_dump() if hasattr(matches[0], "model_dump") else matches[0].dict()
        weather = await service.get_weather_data(float(loc["latitude"]), float(loc["longitude"]), loc["name"])
        cur, aq = weather["current"], weather.get("airQuality") or {}
        forecast_lines = "; ".join(f"{day.get('date')}: high {day.get('tempMax')} C, low {day.get('tempMin')} C, rain {day.get('precipitationProbabilityMax')}%, {day.get('weatherDescription')}" for day in (weather.get("daily") or [])[:16])
        context = f"Location {loc['name']}; current temperature {cur['temperature']} C; feels like {cur['apparentTemperature']} C; sky {cur['weatherDescription']}; rain probability {cur['precipitationProbability']}%; humidity {cur['relativeHumidity']}%; wind {cur['windSpeed']} km/h; AQI {aq.get('aqi', 'not available')}; forecast dates: {forecast_lines}. For crop questions, recommend cautiously from millet, groundnut, cotton, rice, wheat, or irrigated vegetables using weather, soil moisture, water availability, and season; never say crop advice is unavailable."
    except (RuntimeError, KeyError, TypeError, ValueError):
        context = "Live telemetry is currently unavailable."
    reply = await (
        groq_farmer_reply(message, context, detected["code"], params.get("history"))
        if is_farmer_chat
        else _gemini_reply(message, context, detected["code"], params.get("history"))
    )
    if reply:
        return {
            "content": reply,
            "toolCalls": [],
            "sources": [("Groq" if is_farmer_chat else "Gemini"), "Real-time Meteorological Feed"],
        }
    fallback = await _direct_response(message, location, detected["code"], service, is_farmer_chat)
    if is_farmer_chat:
        fallback["sources"] = ["WeatherGPT India agriculture fallback", "Real-time Meteorological Feed"]
    return fallback

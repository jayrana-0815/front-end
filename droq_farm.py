"""Groq-backed farmer chat helpers for India-focused weather and crop advice."""

from __future__ import annotations

import os
import logging

import httpx


logger = logging.getLogger(__name__)


LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi (हिन्दी)", "mr": "Marathi (मराठी)",
    "bn": "Bengali (বাংলা)", "ta": "Tamil (தமிழ்)", "te": "Telugu (తెలుగు)",
    "gu": "Gujarati (ગુજરાતી)", "kn": "Kannada (ಕನ್ನಡ)", "ml": "Malayalam (മലയാളം)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)", "or": "Odia (ଓଡ଼ିଆ)",
}


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


async def groq_farmer_reply(
    message: str,
    context: str,
    language: str,
    history: list[dict[str, str]] | None = None,
) -> str | None:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key or api_key in {"your-groq-api-key", "MY_GROQ_API_KEY"}:
        return None
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()
    prompt = f"""You are WeatherGPT Farmer Assistant, a weather and crop specialist for India-origin farms only.
Answer the user's exact question first, then provide concise, practical advice for Indian farming conditions.
Use only the verified telemetry below. Do not give advice for locations outside India; explain that this assistant is limited to India-origin locations.
Do not invent measurements, diagnoses, pesticides, or government warnings. Mention when local soil testing or an agricultural officer is needed.
Answer entirely in {LANGUAGE_NAMES.get(language, 'English')}.
Recent conversation:
{_format_history(history)}
Verified telemetry:
{context}
User question: {message}"""
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You provide safe, evidence-grounded agricultural and weather guidance for India only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1800,
    }
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "WeatherGPT/2.0",
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(25, connect=8), headers=headers) as client:
            response = await client.post("https://api.groq.com/openai/v1/chat/completions", json=body)
            if response.status_code in (429, 500, 502, 503):
                logger.warning("Groq farmer chat temporarily unavailable: HTTP %s", response.status_code)
                return None
            if response.status_code in (401, 403):
                logger.error("Groq farmer chat authentication failed: HTTP %s", response.status_code)
                return None
            if response.is_error:
                detail = ""
                try:
                    error_payload = response.json().get("error", {})
                    detail = str(error_payload.get("message", ""))[:200]
                except (ValueError, TypeError, AttributeError):
                    detail = ""
                logger.error(
                    "Groq farmer chat provider rejected request: HTTP %s%s",
                    response.status_code,
                    f" ({detail})" if detail else "",
                )
            response.raise_for_status()
            choices = response.json().get("choices", [])
            content = choices[0].get("message", {}).get("content", "") if choices else ""
            if not content.strip():
                logger.warning("Groq farmer chat returned no content")
            return content.strip() or None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
        logger.warning("Groq farmer chat request failed: %s", type(exc).__name__)
        return None

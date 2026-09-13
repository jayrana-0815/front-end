"""Small server-side Sarvam AI text-to-speech client."""

from __future__ import annotations

import base64
import os

import httpx


LANGUAGE_CODES = {
    "en": "en-IN",
    "hi": "hi-IN",
    "gu": "gu-IN",
    "mr": "mr-IN",
    "kn": "kn-IN",
    "ta": "ta-IN",
    "bn": "bn-IN",
    "te": "te-IN",
    "ml": "ml-IN",
    "pa": "pa-IN",
    "or": "od-IN",
}


class SarvamError(RuntimeError):
    """Raised when Sarvam cannot produce audio."""


async def text_to_speech(text: str, language: str, speaker: str = "priya") -> bytes:
    api_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not api_key:
        raise SarvamError("Sarvam text-to-speech is not configured")

    payload = {
        "inputs": [text.strip()],
        "target_language_code": LANGUAGE_CODES.get(language, "en-IN"),
        "speaker": speaker,
        "model": os.getenv("SARVAM_TTS_MODEL", "bulbul:v3"),
        "enable_preprocessing": True,
    }
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(12, connect=5),
            headers={"api-subscription-key": api_key},
        ) as client:
            response = await client.post("https://api.sarvam.ai/text-to-speech", json=payload)
            if response.is_error:
                detail = response.text[:240].replace("\n", " ")
                raise SarvamError(f"Sarvam provider error ({response.status_code}): {detail}")
            result = response.json()
            audio = result.get("audios", [None])[0]
            if not audio:
                raise SarvamError("Sarvam returned no audio")
            return base64.b64decode(audio)
    except SarvamError:
        raise
    except (httpx.HTTPError, ValueError, KeyError, IndexError, base64.binascii.Error) as exc:
        raise SarvamError("Sarvam text-to-speech request failed") from exc

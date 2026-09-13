# WeatherGPT

WeatherGPT is a dark, telemetry-grounded weather dashboard for current
conditions, forecasts, air quality, alerts, RainViewer radar, cyclones,
climate trends, agriculture, travel, and multilingual weather chat.

The application is now a Python-only FastAPI service with a framework-free
HTML/CSS/JavaScript client. It uses Open-Meteo for weather and geocoding,
Nominatim for reverse geocoding, RainViewer for radar timestamps/tiles, and
optionally Gemini for natural-language answers. Without a Gemini key, the
local response engine remains available.

## Setup

Python 3.10 or newer is recommended.

```bash
cd WeatherGPT
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Add `GEMINI_API_KEY` to `.env` when Gemini chat responses are desired. Add
`SARVAM_API_KEY` to enable the speaker button on AI replies. Both are optional;
never commit `.env`.

Set `DATABASE_URL` to a PostgreSQL connection string to persist onboarding
profiles. The service uses SQLAlchemy with the asyncpg PostgreSQL driver and
creates the `farmer` and `citizen` tables automatically when it starts. If
PostgreSQL is unavailable, profiles remain usable from the browser's local
fallback and show a local sync status.

Profile locations are stored as explicit India-focused fields: `country`
(always `India`), `location` (village/area), `state`, and `city`. Existing
JSON location records are migrated automatically at startup.

## Run

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

Open <http://localhost:3000>. The API paths remain compatible with the
previous application:

Run the page through FastAPI rather than opening `static/index.html` directly
when you need live weather data, location search, maps, or chat. The HTML now
uses relative `style.css` and `script.js` links so the stylesheet and browser
script also load correctly in a local file preview.

- `GET /api/health`
- `GET /api/location/search?q=...` and `/api/location/reverse`
- `GET /api/weather/current`, `/api/weather/alerts`, `/api/weather/radar-maps`
- `GET /api/intelligence/hub`, `/api/intelligence/aviation`,
  `/api/intelligence/marine`, `/api/intelligence/mission-briefing`
- `GET /api/intelligence/route?origin=Ahmedabad&destination=Mumbai&mode=general`
- `GET /api/cyclones` and `/api/climate/trends`
- `POST /api/advisory/agriculture`, `/api/advisory/travel`, `/api/chat`, and
  `/api/tts`
- `GET` and `PUT /api/profiles/{farmer|citizen}/{profile_id}`

Sarvam TTS is implemented in `sarvam.py` using the current `bulbul:v3` model. Set `SARVAM_API_KEY` in `.env`; the
browser speaker button calls the backend so the key is never exposed.

Provider failures are handled explicitly with safe HTTP errors and radar
fallback tiles. Responses are cached in memory for a short period to reduce
provider load.

## Validation

```bash
python -m compileall main.py weather_service.py gemini_service.py weather_codes.py
python -c "from fastapi.testclient import TestClient; from main import app; print(TestClient(app).get('/api/health').json())"
```

The client is served from `front-end/` by FastAPI; no Node.js, npm, Vite,
TypeScript, React, or Express step is required.

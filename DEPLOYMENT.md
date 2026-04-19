# Deployment Guide

## Frontend (Vercel)

Set these env vars in Vercel project settings:

- `NEXT_PUBLIC_OPENWEATHER_API_KEY`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_TRACKING_WS_URL`

Then deploy from repository root.

## Backend (Railway/Render)

Set these env vars:

- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `OPENWEATHER_API_KEY` (optional)
- `GEMINI_API_KEY` (optional)
- `FRONTEND_ORIGIN`

Run migrations on deploy:

```bash
cd backend
alembic upgrade head
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## API notes

- This stack uses free providers: OpenStreetMap/Nominatim for search and OSRM for routing.
- OpenWeather and Gemini keys are optional depending on feature usage.

Never commit real secrets. Keep `.env*` files ignored.

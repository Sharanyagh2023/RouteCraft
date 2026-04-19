# RouteCraft

Full-stack AI-powered commute optimization app for Bengaluru.

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind, Zustand, Framer Motion, Leaflet + OpenStreetMap
- Backend: FastAPI, PostgreSQL, SQLAlchemy, Alembic, Redis, WebSockets
- AI/NLP: Gemini Flash + spaCy + scikit-learn ranking

## Folder structure

```text
.
├── src/                       # Next.js frontend (App Router)
├── backend/
│   ├── app/
│   │   ├── api/routes/        # optimize/chat/trips/preferences endpoints
│   │   ├── services/          # route/fare/decision/chat/tracking engines
│   │   ├── websocket/         # /ws/location/{trip_id}
│   │   ├── db/                # SQLAlchemy engine/session/base
│   │   ├── models/            # User/Trip/Preference
│   │   └── main.py            # FastAPI app
│   ├── alembic/
│   │   └── versions/          # DB migration
│   └── requirements.txt
└── .env.example
```

## Frontend setup

1. Install packages:
   - `npm install`
2. Create env file:
   - Copy `.env.example` to `.env.local`
3. Fill required vars:
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
   - `NEXT_PUBLIC_TRACKING_WS_URL=ws://localhost:8000/ws/location`
   - `NEXT_PUBLIC_OPENWEATHER_API_KEY=...`
4. Run frontend:
   - `npm run dev`

## Backend setup

1. Create Python virtual env and install:
   - `pip install -r backend/requirements.txt`
2. Create env file:
   - Copy `backend/.env.example` to `backend/.env`
3. Run migration:
   - `cd backend`
   - `alembic upgrade head`
4. Start backend:
   - `uvicorn app.main:app --reload --port 8000`

## API endpoints

- `POST /api/optimize`
- `POST /api/chat`
- `GET /api/trips`
- `PUT /api/preferences`
- `WS /ws/location/{trip_id}`

## Notes

- Backend route engine uses OSRM + Nominatim and falls back to simulated route generation if routing/weather APIs fail.
- Frontend consumes backend responses dynamically and supports deep-link ride provider redirects.

# Development

## Prerequisites

- Node.js 20+ and npm (tested with Node 24.21.0 and npm 11.17.0)
- Python 3.11+ (tested with Python 3.14.7)
- MongoDB 6+ locally (Docker or Community Server) or an Atlas cluster. This is optional; without it the backend runs in demo fallback mode.

## Installation

```bash
# Database (one option; see DATABASE.md for Atlas and native installs)
docker run -d --name bridgetalk-mongo -p 27017:27017 mongo:8

# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows (PowerShell: .venv\Scripts\Activate.ps1)
source .venv/bin/activate         # macOS/Linux
pip install -r requirements.txt
pip install -r requirements-dev.txt   # optional: TestClient and mongomock for the tests

# Frontend
cd ../frontend
npm install
```

## Environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

| Variable | Where | Notes |
|---|---|---|
| `MONGODB_URI` | backend | Defaults to `mongodb://localhost:27017`. Use an Atlas `mongodb+srv://` URI as needed. It is a secret and is never logged. |
| `MONGODB_DATABASE` | backend | Defaults to `bridgetalk` |
| `MONGODB_TIMEOUT_MS` | backend | Defaults to `3000`; the connect and server-selection timeout |
| `GEMINI_API_KEY` | backend | Empty means the rules engine is used |
| `GEMINI_MODEL` | backend | Defaults to `gemini-3.5-flash` |
| `FRONTEND_ORIGIN` | backend | The CORS origin; defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | frontend | Defaults to `http://localhost:8000`. Restart `npm run dev` after changing it. |

The backend reads these through `app/config.py` (pydantic-settings), from the process environment or `backend/.env`.

## Commands

| Task | Command |
|---|---|
| Run the backend (auto-reload) | `cd backend && python -m uvicorn app.main:app --reload --port 8000` |
| Run the frontend | `cd frontend && npm run dev` |
| Type check | `cd frontend && npx tsc --noEmit` |
| Lint | `cd frontend && npm run lint` |
| Production build | `cd frontend && npm run build && npm start` |
| Smoke test (real MongoDB if reachable, otherwise fallback checks) | `cd backend && python smoke_test.py` |
| Persistence test (in-memory mongomock) | `cd backend && python -m tests.test_mongo_persistence` |
| Python syntax check | `cd backend && python -m py_compile app/*.py app/*/*.py` |
| Regenerate the frontend seed after editing the Python seed | `cd backend && python -m app.data.export_sample` |

## Folder structure

```
bridgetalk/
├── frontend/
│   ├── app/                      # Routes: / (overview), meetings, decisions, action-items, settings, not-found
│   ├── components/
│   │   ├── layout/               # AppShell, AppSidebar, AppHeader (storage indicator), PageHeading
│   │   ├── meeting/              # MeetingOverview, TranscriptPanel, TranscriptSegment, LanguageSelector, MeetingsList
│   │   ├── intelligence/         # SummaryCard, DecisionsList, ActionItemsList, OpenQuestionsPanel, AnalysisControls
│   │   ├── assistant/            # MeetingQA
│   │   ├── providers/            # MeetingProvider (state, hydration, persistence), ToastProvider
│   │   ├── settings/             # SettingsPanels (API, database and AI status)
│   │   └── ui/                   # primitives, CopyButton, SourceChips, BrandMark
│   ├── lib/                      # api.ts, local-intelligence.ts, sample-meeting.ts (generated), utils.ts
│   └── types/meeting.ts
├── backend/
│   ├── app/
│   │   ├── main.py               # App, lifespan (MongoDB), CORS, error handlers, /health
│   │   ├── config.py             # pydantic-settings
│   │   ├── database.py           # AsyncMongoClient lifecycle, indexes, reconnect
│   │   ├── errors.py             # App errors and ObjectId validation
│   │   ├── schemas.py            # Pydantic API models
│   │   ├── repositories/meeting_repository.py  # All MongoDB operations
│   │   ├── routes/meetings.py    # Meeting endpoints
│   │   ├── services/meeting_ai.py  # Gemini integration and fallback
│   │   ├── services/rules.py     # Deterministic engine
│   │   └── data/                 # sample_meeting.py (seed), export_sample.py
│   ├── tests/test_mongo_persistence.py
│   ├── smoke_test.py
│   ├── requirements.txt
│   └── requirements-dev.txt
└── docs/
```

## Conventions

- Route handlers never touch MongoDB directly; add queries to `MeetingRepository`.
- Convert ObjectIds to strings in the repository. API models never contain ObjectIds.
- Validate path or body IDs with `parse_object_id()` before any database call.
- Return `persisted: true` only after a write succeeded.
- Keep `types/meeting.ts` and `schemas.py` in sync, and keep `rules.py` and `lib/local-intelligence.ts` in sync.
- This scaffold uses Next.js 16.4. Check `frontend/node_modules/next/dist/docs/` before using unfamiliar APIs (see `frontend/AGENTS.md`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| The header shows "Demo mode · not saved" | Check `/health`. If `database` is `"unavailable"`, start MongoDB or fix `MONGODB_URI`. The backend retries every 15 seconds, so a restart isn't needed. |
| The log shows `MongoDB unavailable (ServerSelectionTimeoutError)` | MongoDB isn't reachable at `MONGODB_URI`: the service isn't running, the port is wrong, or (on Atlas) your IP isn't allowlisted |
| `MongoDB unavailable (OperationFailure)` | Authentication failed. Check the user and password in the URI (URL-encode special characters). |
| `MongoDB unavailable (ConfigurationError)` | The URI is malformed, or the `mongodb+srv` DNS lookup failed |
| The sidebar shows "Offline mode" | The backend isn't running on port 8000, or `NEXT_PUBLIC_API_URL` is wrong. Click **Re-check** in Settings. |
| CORS error in the browser console | Make `FRONTEND_ORIGIN` exactly match the frontend origin, then restart uvicorn |
| You want to reseed the demo meeting from scratch | Drop the `bridgetalk` database (`mongosh bridgetalk --eval "db.dropDatabase()"`) and restart the backend. The seed never overwrites existing data. |
| The badge says "Rules engine" with a key set | The key must be in `backend/.env` before uvicorn starts. Check that `/health` shows `ai_configured: true`, and check the log for `AI analysis failed (…)`. |
| Bengali or Hindi renders as boxes | Fonts load through `next/font/google` at build time; the first build needs network access |

# BridgeTalk

BridgeTalk helps people who speak different languages understand a meeting and keep track of what was decided. It shows a multilingual transcript with translations, writes a short summary, pulls out decisions, action items and open questions, and answers questions using only what was said in the meeting. Meetings, insights, Q&A history and action-item status are stored in **MongoDB**.

This is a hackathon MVP. It ships with one **simulated** sample meeting (hand-written, not live transcription). It works with no API keys, and even with no database, in a clearly labelled demo mode.

## Features

- **Your own meetings.** Create a meeting from the sidebar: add participants, then paste a `Name: text` transcript or type it line by line. Each line's language (English, Bengali, Hindi) is detected from its script, and Gemini translates every line into all three. Meetings are saved to MongoDB and can be opened, cleared or deleted from the Meetings page.
- **Multilingual transcript.** About 82 seconds, three speakers, in English, Bengali (বাংলা) and Hindi (हिन्दी). Switch the display language and choose Original, Translated or Both.
- **Meeting intelligence.** A summary, explicit decisions, action items and unresolved questions, each linked back to the transcript lines it came from, and saved to MongoDB.
- **Honest owners and deadlines.** These are shown only when someone states them; otherwise the item reads "Unassigned" or "No deadline stated".
- **Checkable action items.** Status changes are saved to MongoDB. If a save fails, the checkbox rolls back with a warning.
- **"Ask this meeting".** Answers quote the transcript and say so when the meeting does not contain the answer. Questions and answers are saved and restored when you reload.
- **Copy buttons** for the summary, decisions, action items, answers and transcript, with a toast to confirm.
- **Reset** clears the demo meeting's saved insights and questions; the transcript is kept.
- **Fallbacks at every level.**
  - Intelligence: Gemini if a key is set, otherwise a rules engine on the backend, otherwise the same rules engine in the browser.
  - Storage: MongoDB, otherwise demo mode (built-in sample, nothing saved, labelled "Demo mode · not saved").

## Architecture summary

| Part | Technology | Role |
|---|---|---|
| `frontend/` | Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, Framer Motion (motion), GSAP, React Bits, Lucide icons | Dashboard UI, session state in React context, typed API client, offline fallback |
| `backend/` | FastAPI, Pydantic v2, pydantic-settings, Uvicorn, Google GenAI SDK (optional) | API, validation, intelligence, repository layer |
| Database | MongoDB through PyMongo's async API (`AsyncMongoClient`) | Collections `meetings`, `transcript_segments`, `meeting_insights` and `meeting_questions` |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DATABASE.md](docs/DATABASE.md).

## Prerequisites

- Node.js 20 or newer (tested with Node 24.21, npm 11.17)
- Python 3.11 or newer (tested with Python 3.14.7)
- MongoDB 6 or newer running locally, or a MongoDB Atlas cluster. This is optional: without it the app runs in demo mode.

## Setup

### Database

```bash
docker run -d --name bridgetalk-mongo -p 27017:27017 mongo:8   # or install MongoDB Community, or use Atlas
```

Atlas instructions are in [docs/DATABASE.md](docs/DATABASE.md#mongodb-atlas-setup).

### Backend

```bash
cd backend
python -m venv .venv
# Windows:      .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # set MONGODB_URI; optionally GEMINI_API_KEY
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # optional; defaults to http://localhost:8000
```

## Environment variables

| File | Variable | Default | Purpose |
|---|---|---|---|
| `backend/.env` | `MONGODB_URI` | `mongodb://localhost:27017` | Local or Atlas (`mongodb+srv://…`) connection string. Never commit it. |
| `backend/.env` | `MONGODB_DATABASE` | `bridgetalk` | Database name |
| `backend/.env` | `GEMINI_API_KEY` | empty | Turns on Gemini analysis. Leave empty to use the rules engine. |
| `backend/.env` | `FRONTEND_ORIGIN` | `http://localhost:3000` | The only origin allowed by CORS |
| `backend/.env` | `GEMINI_MODEL` | `gemini-3.5-flash` | Model used when a key is set |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

## Run

```bash
# Terminal 1: backend (connects to MongoDB, creates indexes, seeds the demo meeting once)
cd backend && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000   # Windows
cd backend && .venv/bin/python -m uvicorn app.main:app --reload --port 8000       # macOS/Linux

# Terminal 2: frontend
cd frontend && npm run dev
```

Open http://localhost:3000. The header shows **Saved to MongoDB** when the database is connected, and **Demo mode · not saved** otherwise.

## Checks

```bash
cd frontend && npx tsc --noEmit && npm run lint && npm run build
cd backend && python smoke_test.py                                 # real database if reachable, else fallback checks
cd backend && pip install -r requirements-dev.txt && python -m tests.test_mongo_persistence   # in-memory mongomock
```

## Demo

1. Start MongoDB, the backend and the frontend. The header should show "Saved to MongoDB".
2. Switch the language to **Bengali** and try **Original / Translated / Both**.
3. Click **Generate intelligence**: a summary, 2 decisions, 3 action items and 1 open question appear, and the toast says "Insights saved to MongoDB".
4. Tick an action item and ask "Who is fixing the payment bugs?", then reload the page. Both are still there.
5. Ask "When is the launch date?": the meeting doesn't say, and the answer says so.

The full script is in [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md).

## Known limitations

- Meetings are entered as text: there is no recording upload, live transcription or speaker diarization.
- Translations are hand-written sample data; nothing is machine-translated at runtime.
- The rules engine reads the English text only and answers English questions only. Bengali and Hindi questions need Gemini.
- In demo mode (no database), nothing is saved and a reload resets the session.
- Persistence has been verified against a real MongoDB Atlas cluster.
- Gemini analysis and Q&A were verified with a real key (gemini-3.5-flash). When a model is overloaded (5xx), rate-limited or retired, the backend tries `GEMINI_FALLBACK_MODELS` in order, then the rules engine.

## Documentation

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API reference](docs/API.md)
- [Development](docs/DEVELOPMENT.md)
- [Demo guide](docs/DEMO_GUIDE.md)
- [Progress log](docs/PROGRESS.md)

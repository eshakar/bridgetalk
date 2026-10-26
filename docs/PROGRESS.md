# Progress

BridgeTalk now uses MongoDB as its primary database, through PyMongo's async API. The UI, routes and existing API contracts are kept. In this environment, persistence was verified against an in-memory stand-in (mongomock) and fallback mode against a real, unreachable MongoDB; no MongoDB server was available for an end-to-end test. Checks ran on Windows 11 with Node 24.21.0, npm 11.17.0 and Python 3.14.7.

## Phase checklist

### MVP (first iteration)
- [x] Phase 1: scaffold, docs, env examples, types and schemas
- [x] Phase 2: dashboard shell, transcript, intelligence panels, Q&A, toasts and reset
- [x] Phase 3: typed API client, in-browser fallback, loading, empty and error states
- [x] Phase 4: FastAPI endpoints, optional Gemini with validation, CORS
- [x] Phase 5: polish (skeletons, motion, focus states, responsive layout)
- [x] Phase 6: verification and documentation

### MongoDB migration
- [x] `config.py` (pydantic-settings), `database.py` (an `AsyncMongoClient` lifespan with ping, indexes, seed, a retry every 15 seconds, and close), `errors.py`
- [x] `repositories/meeting_repository.py`: create and get meetings, ordered transcript, upserted insights, questions, action-item status, demo reset
- [x] Collections `meetings`, `transcript_segments`, `meeting_insights` and `meeting_questions`, with 5 indexes
- [x] Endpoints: `GET /api/meetings`, `GET /api/meetings/{id}` and `PATCH /api/meetings/{id}/action-items/{item_id}` added; `/analyze` and `/ask` now save when given `meeting_id`; `/demo` returns saved insights and questions; `POST /api/meetings/demo/reset` added so the existing Reset button still restores the seeded state
- [x] Frontend: loads saved insights, checkbox states and Q&A history; saves checkbox changes through PATCH, rolling back if the save fails; shows a header indicator (**Saved to MongoDB** or **Demo mode · not saved**); database status appears in the sidebar and Settings
- [x] Docs updated (README, ARCHITECTURE, API, DEVELOPMENT, PROJECT_OVERVIEW, DEMO_GUIDE) and DATABASE.md added. A search found no PostgreSQL or Supabase references to remove.

## Implemented behaviour

- **Seed:** inserted once (a unique sparse `seed_key` guards concurrent starts) and never overwritten. A half-finished seed gets its segments filled in.
- **Translations:** stored as `translations: {lang: text}`, with the original in `original_text`. Insights and questions reference segments by ID and never copy the transcript.
- **IDs:** ObjectIds inside MongoDB, strings in the API. IDs are validated before queries; malformed IDs give 422 and missing records give 404.
- **Database down:** startup still succeeds; `/health` reports `degraded`; `/demo` serves the built-in sample with `persisted: false`; writes return 503 "Nothing was saved".
- **What `persisted: true` means:** it is set only after a successful write. The frontend never reports a save that didn't happen.

## Commands actually executed (MongoDB migration)

| Command | Result |
|---|---|
| `mongod --version`, `mongosh --version`, `docker --version`, `sc query MongoDB` | **Not available**: no MongoDB server, shell or Docker on this machine |
| `pip install pymongo pydantic-settings mongomock`, then `pip install -r requirements-dev.txt` | pymongo 4.19.0 (`AsyncMongoClient` available), pydantic-settings 2.16.1, mongomock 4.3.0 |
| `python -m py_compile app/*.py app/*/*.py tests/*.py smoke_test.py` | **Passed** |
| `python smoke_test.py` against `mongodb://localhost:27017` (unreachable) | **Passed**, fallback branch: startup OK; health `degraded`; `/demo` `persisted: false`; `/api/meetings`, `GET /{id}`, `/analyze {meeting_id}` and `PATCH` all return 503 `database_unavailable`; stateless analysis and Q&A work; invalid IDs give 422 |
| `python -m tests.test_mongo_persistence` (real API and repository on mongomock) | **Passed**: seed is idempotent (1 meeting, 11 segments); segments ordered by timestamp; analysis upserted (1 insights doc, no transcript copy); PATCH saves and survives re-analysis; question saved and returned; 404 and 422 cases; reset clears insights and questions only |
| `uvicorn app.main:app --port 8000`, then `curl` | **Passed**: logs `MongoDB unavailable (ServerSelectionTimeoutError); running in demo fallback mode`, then `Application startup complete`; `/health` gives `database: "unavailable"`; CORS preflight allows `GET, POST, PATCH` from `http://localhost:3000` |
| `npx tsc --noEmit`, `npx eslint .` | **Passed** |
| `npm run build` | **Passed**; 6 routes statically prerendered |

## Commands executed (first iteration)

| Command | Result |
|---|---|
| `npx create-next-app@latest frontend …`, `npm i lucide-react` | Next.js 16.4.3, React 19.3, Tailwind v4 |
| TS/Python rules-engine parity via `npx tsx` | **Passed** (`PARITY: True`) |
| Invalid `GEMINI_API_KEY` fallback test | **Passed**: logged `AuthenticationError`, used rules, key not echoed |

## Known issues and gaps

- **No real MongoDB was tested.** Persistence logic was verified with mongomock, which tests the queries, upserts and positional updates but not driver, network, authentication or Atlas behaviour. Before the demo, start MongoDB and run `python smoke_test.py`: with a reachable database it automatically runs the persistence branch.
- **No visual browser QA.** The Chrome automation extension had two browsers connected and none was selected. Run `docs/DEMO_GUIDE.md` manually once.
- The Gemini success path is untested because no real key was available.
- When MongoDB is down, requests that need it may wait up to about 3 seconds (the connect timeout) at most once every 15 seconds while the backend retries.
- **Clear** in the Q&A panel hides the history only. Saved questions are removed by **Reset sample**.

## Deferred features

- Creating meetings from uploaded transcripts. `create_meeting` exists in the repository, but there is no endpoint for it yet.
- Live transcription and runtime machine translation
- Authentication and per-user data
- Pagination for meetings and question history beyond 100 entries

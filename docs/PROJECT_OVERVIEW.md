# Project overview

BridgeTalk turns a multilingual meeting transcript into something everyone can follow: the transcript in their own language, plus the decisions, owners and open questions, all traceable to what was actually said.

## Problem statement

In teams that mix languages, such as English, Bengali and Hindi in many Indian product teams, people switch languages mid-meeting. Participants who are less fluent in one language miss context. Decisions and commitments made in one language get lost, and meeting notes written afterwards often record things nobody explicitly agreed to.

## Target users

- Members of multilingual product and engineering teams who need to follow and review meetings.
- Team leads who need a reliable record of decisions and owners.
- People who missed a meeting and want to ask "what did we decide about X?"

## Product scope

A single-page dashboard over one **simulated** sample meeting, with:

- the transcript, its translations and display modes
- a summary, decisions, action items and open questions
- question answering grounded in the transcript
- an optional Gemini integration with deterministic fallbacks
- MongoDB persistence for meetings, transcripts, insights, Q&A history and action-item status, with a demo mode when the database is unavailable

## Core features

1. Transcript with speaker labels, roles, timestamps, original-language tags and translations (Original, Translated or Both).
2. A language selector (English, Bengali, Hindi) that changes the transcript display language.
3. Generated summary with a loading state, copy button and engine badge (Gemini, Rules engine or Offline rules).
4. Decisions with source citations; the Decisions page also quotes the original-language lines.
5. Action items with an owner and deadline only when stated, checkboxes, a progress count and filters.
6. Open questions that were raised but not resolved.
7. "Ask this meeting": grounded answers with clickable timestamp sources, and an explicit "not covered by the meeting" state.
8. Reset of the sample meeting, toast confirmations, and API status in the sidebar and Settings.
9. Persistence in MongoDB: insights, questions and checkbox changes survive a reload. A header indicator shows **Saved to MongoDB** or **Demo mode · not saved**.

## MVP acceptance criteria

| Criterion | Status |
|---|---|
| The app works on startup with no API keys | Met |
| The transcript shows three speakers in English, Bengali and Hindi, with translations | Met |
| The language selector and the Original/Translated/Both views change the transcript | Met |
| Analysis returns 2 decisions, 3 action items (2 with owners, 1 with a deadline, 1 unassigned) and 1 open question | Met (rules engine) |
| No owners, deadlines or decisions are invented | Met. The rules engine extracts explicit phrases only; AI output is filtered to real speakers and valid segment IDs. |
| Q&A answers with sources, or says the meeting lacks the information | Met |
| The UI keeps working when the backend is down | Met (in-browser rules engine with a warning toast) |
| Analysis, Q&A and action-item status are saved to MongoDB, and the seed is inserted once without overwriting | Met (verified with an in-memory mongomock stand-in; not yet run against a real MongoDB server) |
| With no database, the app runs in labelled demo mode and never reports a save it didn't make | Met (verified against an unreachable MongoDB) |
| Every visible button does something | Met |
| The production build passes | Met |

## Out of scope

- Video or audio conferencing, recording upload, live transcription and speaker diarization
- Authentication, users or multiple workspaces
- Relational databases (MongoDB is the only store), user data isolation, backups
- WebSocket or real-time infrastructure
- Custom speech or translation models, model training, or multi-agent orchestration
- Payments

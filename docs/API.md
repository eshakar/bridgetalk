# API reference

The base URL is `http://localhost:8000`. All bodies are JSON. Interactive docs are served by FastAPI at `/docs`. MongoDB IDs are always returned as strings.

## Error format

| Status | Body | When |
|---|---|---|
| 404 | `{"error": "not_found", "message": "Meeting not found."}` | Unknown meeting or action item |
| 422 | `{"error": "invalid_request", "details": [{"field": "question", "message": "Field required"}]}` | Body validation failed (the input is not echoed) |
| 422 | `{"error": "invalid_id", "message": "'meeting_id' is not a valid ID."}` | Malformed ObjectId, checked before any database call |
| 503 | `{"error": "database_unavailable", "message": "The database is unavailable. Nothing was saved."}` | MongoDB is needed but unreachable |
| 500 | `{"error": "internal_error", "message": "Something went wrong."}` | Unexpected error (details go to the server log only) |

AI failures never produce errors. The endpoint answers with the rules engine and `"mode": "rules"`.

## Meeting reference: stored meeting or inline transcript

`POST /api/meetings/analyze` and `POST /api/meetings/ask` accept **either** of these:

- `{"meeting_id": "<ObjectId>"}`: loads the transcript from MongoDB and **saves** the result (`persisted: true`).
- `{"title", "speakers", "segments"}`: the original stateless contract. It analyses the inline transcript and saves nothing (`persisted: false`). The frontend uses this for the built-in demo sample.

If both are sent, `meeting_id` wins. If neither is sent, the response is 422. Limits for inline transcripts: `title` 1 to 200 characters, 1 to 50 `speakers`, 1 to 500 `segments`; language codes are `en`, `bn` or `hi`.

---

## GET /health

```json
{ "status": "ok", "version": "0.2.0", "ai_configured": false, "ai_model": null, "database": "connected" }
```

`status` is `"degraded"` and `database` is `"unavailable"` when MongoDB is unreachable. This endpoint never exposes keys or connection strings.

## GET /api/meetings

Lists stored meetings, newest first, up to 100. Returns **503** without a database.

```json
[
  {
    "id": "6720a1f0c2b4e8a1d3f4b5c6",
    "title": "Lumen Beta Launch Sync",
    "description": "",
    "status": "completed",
    "duration_seconds": 82,
    "languages": [{ "code": "en", "label": "English", "native_label": "English" }],
    "is_simulated": true,
    "created_at": "2026-10-26T18:02:11.120000Z",
    "updated_at": "2026-10-26T18:02:11.120000Z"
  }
]
```

## GET /api/meetings/demo

Returns the seeded demo meeting with its saved insights and questions (a `MeetingDetail`). Without MongoDB it returns the built-in sample with `persisted: false`, `insights: null` and `questions: []`, using the sample's own IDs (`lumen-beta-sync`, `s1`…).

```json
{
  "id": "6720a1f0c2b4e8a1d3f4b5c6",
  "title": "Lumen Beta Launch Sync",
  "description": "",
  "status": "completed",
  "date": "2026-10-26",
  "duration_seconds": 82,
  "is_simulated": true,
  "source_note": "Simulated sample meeting. Hand-written transcript and translations; not live transcription.",
  "languages": [{ "code": "bn", "label": "Bengali", "native_label": "বাংলা" }],
  "speakers": [{ "id": "rahul", "name": "Rahul Banerjee", "role": "Engineering Lead", "primary_language": "bn" }],
  "segments": [
    {
      "id": "6720a1f0c2b4e8a1d3f4b5cc", "speaker_id": "rahul", "start_seconds": 38, "end_seconds": 45,
      "original_language": "bn",
      "text": { "bn": "আমি শুক্রবারের মধ্যে পেমেন্টের বাগ দুটো ঠিক করে দেব।", "en": "I will fix the two payment bugs by Friday.", "hi": "…" }
    }
  ],
  "created_at": "2026-10-26T18:02:11.120000Z",
  "updated_at": "2026-10-26T18:02:11.120000Z",
  "persisted": true,
  "insights": null,
  "questions": []
}
```

## POST /api/meetings/demo/reset

Deletes the demo meeting's saved insights and questions; the meeting and transcript are kept. It returns the refreshed `MeetingDetail`. Without MongoDB it returns the built-in sample (`persisted: false`), since there is nothing to reset.

## GET /api/meetings/{meeting_id}

Returns a `MeetingDetail` (same shape as `/demo`). An invalid ID gives 422, an unknown ID gives 404, and no database gives 503.

## POST /api/meetings/analyze

**Request:** a meeting reference.

```json
{ "meeting_id": "6720a1f0c2b4e8a1d3f4b5c6" }
```

**Response 200** (rules engine, demo meeting)
```json
{
  "summary": "Priya, Rahul and Ananya discussed the Lumen Beta Launch Sync in English, Bengali and Hindi. Decisions: …",
  "decisions": [
    { "text": "We launch the beta on Android first, and iOS follows later.", "source_segment_ids": ["6720a1f0c2b4e8a1d3f4b5c9"] }
  ],
  "action_items": [
    { "id": "a1", "task": "Fix the two payment bugs", "owner": "Rahul Banerjee", "deadline": "Friday", "status": "pending", "source_segment_ids": ["6720a1f0c2b4e8a1d3f4b5cc"] },
    { "id": "a3", "task": "Update the Play Store screenshots before we go live", "owner": null, "deadline": null, "status": "pending", "source_segment_ids": ["6720a1f0c2b4e8a1d3f4b5ce"] }
  ],
  "open_questions": [{ "text": "Will the premium features be free during the beta?", "source_segment_ids": ["…", "…"] }],
  "mode": "rules",
  "persisted": true
}
```

**Behaviour**
- With `meeting_id`, the result is upserted into `meeting_insights` (one document per meeting). Action items already marked `done` keep that status when the same task is regenerated.
- `owner` is `null` unless stated (with AI, it must also match a real speaker). `deadline` is `null` unless stated explicitly.
- Every item cites at least one valid segment ID.
- Errors: 422 (invalid body or ID), 404 (unknown meeting), 503 (no database).

## POST /api/meetings/ask

**Request:** a meeting reference plus `question` (2 to 500 characters).

```json
{ "meeting_id": "6720a1f0c2b4e8a1d3f4b5c6", "question": "Who is fixing the payment bugs?" }
```

**Response 200**
```json
{
  "answer": "From the transcript: Rahul Banerjee (00:38): “I will fix the two payment bugs by Friday.”",
  "grounded": true,
  "source_segment_ids": ["6720a1f0c2b4e8a1d3f4b5cc"],
  "mode": "rules",
  "persisted": true
}
```

**Behaviour**
- With `meeting_id`, the question, answer, sources, `grounded` and `mode` are saved to `meeting_questions`. `persisted: true` is set only after the insert succeeds.
- `grounded: false` always comes with an explicit "The meeting does not provide enough information…" message.
- The rules engine answers English questions only; Bengali and Hindi questions need Gemini.

## PATCH /api/meetings/{meeting_id}/action-items/{action_item_id}

Persists an action item's status.

**Request**
```json
{ "status": "done" }
```
`status` must be `"pending"` or `"done"`; anything else is 422.

**Response 200:** the updated action item.
```json
{ "id": "a1", "task": "Fix the two payment bugs", "owner": "Rahul Banerjee", "deadline": "Friday", "status": "done", "source_segment_ids": ["6720a1f0c2b4e8a1d3f4b5cc"] }
```

**Errors:** 422 for an invalid meeting ID, 404 if the meeting has no insights or the item doesn't exist, 503 if there is no database.


## User meetings

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/meetings` | Create a meeting from user input. Body: `title`, optional `description` and `date` (`YYYY-MM-DD`, defaults to today), `participants` (`name`, `role`, `primary_language`), `lines` (`speaker` = participant index, `language`, `text`) and `translate`. When Gemini is configured, every line is translated into `en`, `bn` and `hi`; if translation fails the meeting is still saved with the original text. Returns `201` with the full meeting. Requires MongoDB (`503` otherwise). |
| `POST` | `/api/meetings/{id}/reset` | Clear saved insights and questions for any meeting. The transcript is kept. |
| `DELETE` | `/api/meetings/{id}` | Delete a user-created meeting with its transcript, insights and questions. Returns `204`, or `404` for the protected sample meeting. |

`GET /api/meetings` summaries also include `date`, `speaker_count` and `is_demo`.

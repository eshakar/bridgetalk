"""All MongoDB reads and writes for meetings, transcripts, insights and questions.

Documents use ObjectIds internally; this module converts them to the string IDs
used by the API models in app/schemas.py. Route handlers never touch MongoDB
directly.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.data.sample_meeting import SAMPLE_MEETING
from app.schemas import (
    ActionItem,
    ActionItemStatus,
    AnalysisResult,
    AnswerResult,
    Meeting,
    MeetingDetail,
    MeetingSummary,
    Segment,
    StoredQuestion,
)

DEMO_SEED_KEY = SAMPLE_MEETING.id
QUESTION_HISTORY_LIMIT = 100


def _now() -> datetime:
    return datetime.now(UTC)


def _segment_to_doc(meeting_id: ObjectId, segment: Segment, speaker_names: dict[str, str]) -> dict[str, Any]:
    original = segment.original_language
    return {
        "meeting_id": meeting_id,
        "speaker_id": segment.speaker_id,
        "speaker_name": speaker_names.get(segment.speaker_id, segment.speaker_id),
        "start_seconds": segment.start_seconds,
        "end_seconds": segment.end_seconds,
        "language": original,
        "original_text": segment.text.get(original, ""),
        # Other languages only; the original lives in original_text.
        "translations": {code: text for code, text in segment.text.items() if code != original},
    }


def _doc_to_segment(doc: dict[str, Any]) -> Segment:
    return Segment(
        id=str(doc["_id"]),
        speaker_id=doc["speaker_id"],
        start_seconds=doc["start_seconds"],
        end_seconds=doc["end_seconds"],
        original_language=doc["language"],
        text={**doc.get("translations", {}), doc["language"]: doc["original_text"]},
    )


def _doc_to_question(doc: dict[str, Any]) -> StoredQuestion:
    return StoredQuestion(
        id=str(doc["_id"]),
        question=doc["question"],
        answer=doc["answer"],
        grounded=doc.get("grounded", False),
        source_segment_ids=doc.get("source_segment_ids", []),
        mode=doc.get("mode", "rules"),
        created_at=doc.get("created_at"),
    )


def _doc_to_insights(doc: dict[str, Any]) -> AnalysisResult:
    return AnalysisResult(
        summary=doc["summary"],
        decisions=doc.get("decisions", []),
        action_items=doc.get("action_items", []),
        open_questions=doc.get("open_questions", []),
        mode=doc.get("mode", "rules"),
        persisted=True,
    )


class MeetingRepository:
    def __init__(self, db: Any) -> None:
        self.meetings = db.meetings
        self.segments = db.transcript_segments
        self.insights = db.meeting_insights
        self.questions = db.meeting_questions

    # --- Meetings -------------------------------------------------------------

    async def create_meeting(self, meeting: Meeting, seed_key: str | None = None) -> ObjectId:
        now = _now()
        doc: dict[str, Any] = meeting.model_dump(exclude={"id", "segments", "created_at", "updated_at"})
        doc.update(created_at=now, updated_at=now)
        if seed_key:
            doc["seed_key"] = seed_key
        result = await self.meetings.insert_one(doc)
        await self._insert_segments(result.inserted_id, meeting)
        return result.inserted_id

    async def _insert_segments(self, meeting_id: ObjectId, meeting: Meeting) -> None:
        names = {speaker.id: speaker.name for speaker in meeting.speakers}
        docs = [_segment_to_doc(meeting_id, segment, names) for segment in meeting.segments]
        if docs:
            await self.segments.insert_many(docs, ordered=True)

    async def ensure_demo_meeting(self) -> ObjectId:
        """Seed the demo meeting once. Never overwrites existing data."""
        existing = await self.meetings.find_one({"seed_key": DEMO_SEED_KEY}, {"_id": 1})
        if existing:
            meeting_id = existing["_id"]
            # Repair a half-finished seed (meeting inserted, segments missing).
            if await self.segments.count_documents({"meeting_id": meeting_id}, limit=1) == 0:
                await self._insert_segments(meeting_id, SAMPLE_MEETING)
            return meeting_id
        try:
            return await self.create_meeting(SAMPLE_MEETING, seed_key=DEMO_SEED_KEY)
        except DuplicateKeyError:  # Another process seeded it first.
            existing = await self.meetings.find_one({"seed_key": DEMO_SEED_KEY}, {"_id": 1})
            return existing["_id"]

    async def get_demo_meeting_id(self) -> ObjectId:
        return await self.ensure_demo_meeting()

    async def list_meetings(self) -> list[MeetingSummary]:
        cursor = self.meetings.find({}).sort("created_at", DESCENDING).limit(100)
        return [
            MeetingSummary(
                id=str(doc["_id"]),
                title=doc["title"],
                description=doc.get("description", ""),
                status=doc["status"],
                date=doc.get("date", ""),
                duration_seconds=doc["duration_seconds"],
                languages=doc.get("languages", []),
                speaker_count=len(doc.get("speakers", [])),
                is_simulated=doc.get("is_simulated", False),
                is_demo=doc.get("seed_key") == DEMO_SEED_KEY,
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at"),
            )
            for doc in await cursor.to_list(length=None)
        ]

    async def get_meeting(self, meeting_id: ObjectId) -> Meeting | None:
        doc = await self.meetings.find_one({"_id": meeting_id})
        if doc is None:
            return None
        cursor = self.segments.find({"meeting_id": meeting_id}).sort([("start_seconds", ASCENDING), ("_id", ASCENDING)])
        segments = [_doc_to_segment(d) for d in await cursor.to_list(length=None)]
        fields = {k: v for k, v in doc.items() if k not in {"_id", "seed_key"}}
        return Meeting(id=str(doc["_id"]), segments=segments, **fields)

    async def get_meeting_detail(self, meeting_id: ObjectId) -> MeetingDetail | None:
        meeting = await self.get_meeting(meeting_id)
        if meeting is None:
            return None
        return MeetingDetail(
            **meeting.model_dump(),
            persisted=True,
            insights=await self.get_insights(meeting_id),
            questions=await self.list_questions(meeting_id),
        )

    # --- Insights -------------------------------------------------------------

    async def get_insights(self, meeting_id: ObjectId) -> AnalysisResult | None:
        doc = await self.insights.find_one({"meeting_id": meeting_id})
        return _doc_to_insights(doc) if doc else None

    async def save_insights(self, meeting_id: ObjectId, result: AnalysisResult) -> AnalysisResult:
        """Upsert the single insights document for a meeting.

        Completed statuses are carried over to regenerated items with the same task text.
        """
        previous = await self.insights.find_one({"meeting_id": meeting_id}, {"action_items": 1})
        done_tasks = {
            item["task"].strip().lower()
            for item in (previous or {}).get("action_items", [])
            if item.get("status") == "done"
        }
        items = [
            item.model_copy(update={"status": "done" if item.task.strip().lower() in done_tasks else item.status})
            for item in result.action_items
        ]
        now = _now()
        doc = await self.insights.find_one_and_update(
            {"meeting_id": meeting_id},
            {
                "$set": {
                    "summary": result.summary,
                    "decisions": [d.model_dump() for d in result.decisions],
                    "action_items": [i.model_dump() for i in items],
                    "open_questions": [q.model_dump() for q in result.open_questions],
                    "mode": result.mode,
                    "updated_at": now,
                },
                "$setOnInsert": {"meeting_id": meeting_id, "created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return _doc_to_insights(doc)

    async def update_action_item_status(
        self, meeting_id: ObjectId, action_item_id: str, status: ActionItemStatus
    ) -> ActionItem | None:
        doc = await self.insights.find_one_and_update(
            {"meeting_id": meeting_id, "action_items.id": action_item_id},
            {"$set": {"action_items.$.status": status, "updated_at": _now()}},
            return_document=ReturnDocument.AFTER,
        )
        if doc is None:
            return None
        item = next(i for i in doc["action_items"] if i["id"] == action_item_id)
        return ActionItem.model_validate(item)

    async def delete_meeting(self, meeting_id: ObjectId) -> bool:
        """Delete a user-created meeting and everything stored for it. The demo meeting is protected."""
        result = await self.meetings.delete_one({"_id": meeting_id, "seed_key": {"$exists": False}})
        if result.deleted_count == 0:
            return False
        await self.segments.delete_many({"meeting_id": meeting_id})
        await self.clear_insights_and_questions(meeting_id)
        return True

    async def clear_insights_and_questions(self, meeting_id: ObjectId) -> None:
        """Used by resets. Leaves the meeting and transcript untouched."""
        await self.insights.delete_many({"meeting_id": meeting_id})
        await self.questions.delete_many({"meeting_id": meeting_id})

    # --- Questions ------------------------------------------------------------

    async def save_question(self, meeting_id: ObjectId, question: str, answer: AnswerResult) -> StoredQuestion:
        doc = {
            "meeting_id": meeting_id,
            "question": question,
            "answer": answer.answer,
            "grounded": answer.grounded,
            "source_segment_ids": answer.source_segment_ids,
            "mode": answer.mode,
            "created_at": _now(),
        }
        result = await self.questions.insert_one(doc)
        return _doc_to_question({**doc, "_id": result.inserted_id})

    async def list_questions(self, meeting_id: ObjectId) -> list[StoredQuestion]:
        cursor = (
            self.questions.find({"meeting_id": meeting_id})
            .sort([("created_at", ASCENDING), ("_id", ASCENDING)])
            .limit(QUESTION_HISTORY_LIMIT)
        )
        return [_doc_to_question(d) for d in await cursor.to_list(length=None)]

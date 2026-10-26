"""Persistence test without a MongoDB server.

Runs the real API and repository against mongomock (an in-memory MongoDB
stand-in) behind a thin async adapter. It verifies the query logic (seeding,
ordering, upserts, positional updates, 404s), not network or driver behaviour.
Run from backend/: python -m tests.test_mongo_persistence  (needs requirements-dev.txt)
"""

from __future__ import annotations

import asyncio
from typing import Any

import mongomock
from fastapi.testclient import TestClient

from app.database import create_indexes
from app.main import app
from app.repositories.meeting_repository import MeetingRepository


class _Cursor:
    def __init__(self, cursor: Any) -> None:
        self._cursor = cursor

    def sort(self, *args: Any, **kwargs: Any) -> _Cursor:
        self._cursor = self._cursor.sort(*args, **kwargs)
        return self

    def limit(self, count: int) -> _Cursor:
        self._cursor = self._cursor.limit(count)
        return self

    async def to_list(self, length: int | None = None) -> list[dict[str, Any]]:
        return list(self._cursor)


class _Collection:
    def __init__(self, collection: Any) -> None:
        self._collection = collection

    def find(self, *args: Any, **kwargs: Any) -> _Cursor:
        return _Cursor(self._collection.find(*args, **kwargs))

    def __getattr__(self, name: str) -> Any:
        method = getattr(self._collection, name)

        async def call(*args: Any, **kwargs: Any) -> Any:
            return method(*args, **kwargs)

        return call


class _Database:
    def __init__(self) -> None:
        self._db = mongomock.MongoClient(tz_aware=True).bridgetalk_test

    def __getattr__(self, name: str) -> _Collection:
        return _Collection(self._db[name])

    def raw(self, name: str) -> Any:
        return self._db[name]


class _FakeMongoState:
    def __init__(self, db: _Database) -> None:
        self.db = db

    async def get_db(self) -> _Database:
        return self.db

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        return None


def main() -> None:
    db = _Database()
    asyncio.run(create_indexes(db))  # type: ignore[arg-type]
    first_id = asyncio.run(MeetingRepository(db).ensure_demo_meeting())
    second_id = asyncio.run(MeetingRepository(db).ensure_demo_meeting())
    assert first_id == second_id, "seeding must be idempotent"
    assert db.raw("meetings").count_documents({}) == 1
    assert db.raw("transcript_segments").count_documents({}) == 11
    segment = db.raw("transcript_segments").find_one({"language": "bn"})
    assert segment["original_text"] and "bn" not in segment["translations"] and "en" in segment["translations"]

    with TestClient(app) as client:
        app.state.mongo = _FakeMongoState(db)
        assert client.get("/health").json()["database"] == "connected"

        meetings = client.get("/api/meetings").json()
        assert len(meetings) == 1 and meetings[0]["id"] == str(first_id)

        demo = client.get("/api/meetings/demo").json()
        meeting_id = demo["id"]
        assert demo["persisted"] is True and demo["insights"] is None
        starts = [s["start_seconds"] for s in demo["segments"]]
        assert starts == sorted(starts) and len(starts) == 11
        assert demo["segments"][1]["text"]["bn"].startswith("অ্যান্ড্রয়েড")

        analysis = client.post("/api/meetings/analyze", json={"meeting_id": meeting_id}).json()
        assert analysis["persisted"] is True and len(analysis["action_items"]) == 3
        segment_ids = {s["id"] for s in demo["segments"]}
        assert all(i in segment_ids for item in analysis["action_items"] for i in item["source_segment_ids"])
        assert db.raw("meeting_insights").count_documents({}) == 1
        stored = db.raw("meeting_insights").find_one({})
        assert "segments" not in stored and "transcript" not in stored, "insights must not duplicate the transcript"

        patched = client.patch(f"/api/meetings/{meeting_id}/action-items/a1", json={"status": "done"})
        assert patched.status_code == 200 and patched.json()["status"] == "done"
        assert client.patch(f"/api/meetings/{meeting_id}/action-items/a1", json={"status": "later"}).status_code == 422
        assert client.patch(f"/api/meetings/{meeting_id}/action-items/a9", json={"status": "done"}).status_code == 404

        again = client.post("/api/meetings/analyze", json={"meeting_id": meeting_id}).json()
        assert again["action_items"][0]["status"] == "done", "re-analysis keeps completed status"
        assert db.raw("meeting_insights").count_documents({}) == 1, "insights are upserted, not duplicated"

        answer = client.post("/api/meetings/ask", json={"meeting_id": meeting_id, "question": "Who is fixing the payment bugs?"}).json()
        assert answer["persisted"] and answer["grounded"] and answer["source_segment_ids"][0] in segment_ids

        detail = client.get(f"/api/meetings/{meeting_id}").json()
        assert detail["insights"]["action_items"][0]["status"] == "done"
        assert [q["question"] for q in detail["questions"]] == ["Who is fixing the payment bugs?"]

        assert client.get("/api/meetings/000000000000000000000000").status_code == 404
        assert client.post("/api/meetings/analyze", json={"meeting_id": "000000000000000000000000"}).status_code == 404
        assert client.get("/api/meetings/xyz").status_code == 422

        reset = client.post("/api/meetings/demo/reset").json()
        assert reset["insights"] is None and reset["questions"] == [] and len(reset["segments"]) == 11
        assert db.raw("meetings").count_documents({}) == 1

    print("Persistence test passed (mongomock).")


if __name__ == "__main__":
    main()

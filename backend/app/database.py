"""MongoDB connection lifecycle (PyMongo async API).

One AsyncMongoClient is created per process in the FastAPI lifespan and shared
by all requests. If MongoDB is unreachable at startup, the API still starts in
fallback mode and retries the connection at most every RETRY_SECONDS.
"""

from __future__ import annotations

import asyncio
import logging
import time

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.config import Settings

logger = logging.getLogger("bridgetalk.db")

RETRY_SECONDS = 15.0


async def create_indexes(db: AsyncDatabase) -> None:
    await db.meetings.create_index([("seed_key", ASCENDING)], name="seed_key_unique", unique=True, sparse=True)
    await db.meetings.create_index([("created_at", DESCENDING)], name="created_at_desc")
    await db.transcript_segments.create_index(
        [("meeting_id", ASCENDING), ("start_seconds", ASCENDING)], name="meeting_transcript_order"
    )
    await db.meeting_insights.create_index([("meeting_id", ASCENDING)], name="meeting_unique", unique=True)
    await db.meeting_questions.create_index(
        [("meeting_id", ASCENDING), ("created_at", ASCENDING)], name="meeting_questions_order"
    )


class MongoState:
    """Holds the shared client and whether the database is currently usable."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: AsyncMongoClient | None = None
        self.db: AsyncDatabase | None = None
        self._last_attempt = 0.0
        self._lock = asyncio.Lock()

    async def connect(self, *, force: bool = False) -> bool:
        """Connect, verify with a ping, create indexes and seed the demo meeting."""
        async with self._lock:
            if self.db is not None:
                return True
            now = time.monotonic()
            if not force and self._last_attempt and now - self._last_attempt < RETRY_SECONDS:
                return False
            self._last_attempt = now
            client: AsyncMongoClient | None = None
            try:
                timeout = self._settings.mongodb_timeout_ms
                client = AsyncMongoClient(
                    self._settings.mongodb_uri.get_secret_value(),
                    serverSelectionTimeoutMS=timeout,
                    connectTimeoutMS=timeout,
                    appname="bridgetalk",
                    tz_aware=True,
                )
                await client.admin.command("ping")
                db = client[self._settings.mongodb_database]
                await create_indexes(db)
                # Imported here to avoid a circular import at module load.
                from app.repositories.meeting_repository import MeetingRepository

                await MeetingRepository(db).ensure_demo_meeting()
            except Exception as exc:  # Never log the URI: it may contain credentials.
                logger.warning("MongoDB unavailable (%s); running in demo fallback mode.", type(exc).__name__)
                if client is not None:
                    await client.close()
                return False
            self._client, self.db = client, db
            logger.info("Connected to MongoDB database '%s'.", self._settings.mongodb_database)
            return True

    async def get_db(self) -> AsyncDatabase | None:
        if self.db is None:
            await self.connect()
        return self.db

    async def ping(self) -> bool:
        db = await self.get_db()
        if db is None:
            return False
        try:
            await db.client.admin.command("ping")
            return True
        except Exception as exc:
            logger.warning("MongoDB ping failed (%s).", type(exc).__name__)
            return False

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
        self._client, self.db = None, None

"""Pydantic models shared by the BridgeTalk API.

These are API models only. MongoDB documents (with ObjectIds) are converted to
and from them in app/repositories/meeting_repository.py.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

LanguageCode = Literal["en", "bn", "hi"]


class Language(BaseModel):
    code: LanguageCode
    label: str
    native_label: str


class Speaker(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(default="", max_length=80)
    primary_language: LanguageCode


class Segment(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    speaker_id: str = Field(min_length=1, max_length=40)
    start_seconds: float = Field(ge=0)
    end_seconds: float = Field(ge=0)
    original_language: LanguageCode
    # Text keyed by language code, including the original language. English ("en")
    # is the pivot language used for analysis and question answering.
    text: dict[LanguageCode, str]


class Meeting(BaseModel):
    id: str
    title: str
    description: str = ""
    status: Literal["scheduled", "live", "completed"]
    date: str
    duration_seconds: int
    is_simulated: bool
    source_note: str
    languages: list[Language]
    speakers: list[Speaker]
    segments: list[Segment]
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TranscriptPayload(BaseModel):
    """The part of a meeting needed for analysis and Q&A."""

    model_config = ConfigDict(extra="ignore")

    title: str = Field(min_length=1, max_length=200)
    speakers: list[Speaker] = Field(min_length=1, max_length=50)
    segments: list[Segment] = Field(min_length=1, max_length=500)


class _MeetingReference(BaseModel):
    """Either a stored meeting (meeting_id) or an inline transcript (stateless)."""

    model_config = ConfigDict(extra="ignore")

    meeting_id: str | None = Field(default=None, max_length=64)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    speakers: list[Speaker] | None = Field(default=None, min_length=1, max_length=50)
    segments: list[Segment] | None = Field(default=None, min_length=1, max_length=500)

    @model_validator(mode="after")
    def _require_source(self) -> _MeetingReference:
        if not self.meeting_id and not (self.title and self.speakers and self.segments):
            raise ValueError("Provide meeting_id, or title, speakers and segments.")
        return self

    def inline_transcript(self) -> TranscriptPayload:
        return TranscriptPayload(title=self.title, speakers=self.speakers, segments=self.segments)


class AnalyzeRequest(_MeetingReference):
    pass


class AskRequest(_MeetingReference):
    question: str = Field(min_length=2, max_length=500)


class Decision(BaseModel):
    text: str = Field(min_length=1, max_length=400)
    source_segment_ids: list[str] = Field(min_length=1)


ActionItemStatus = Literal["pending", "done"]


class ActionItem(BaseModel):
    id: str
    task: str = Field(min_length=1, max_length=400)
    owner: str | None = None
    deadline: str | None = None
    status: ActionItemStatus = "pending"
    source_segment_ids: list[str] = Field(min_length=1)


class ActionItemUpdate(BaseModel):
    status: ActionItemStatus


class OpenQuestion(BaseModel):
    text: str = Field(min_length=1, max_length=400)
    source_segment_ids: list[str] = Field(min_length=1)


AnalysisMode = Literal["gemini", "rules"]


class AnalysisResult(BaseModel):
    summary: str
    decisions: list[Decision]
    action_items: list[ActionItem]
    open_questions: list[OpenQuestion] = []
    mode: AnalysisMode = "rules"
    # True only when the result was written to MongoDB.
    persisted: bool = False


class AnswerResult(BaseModel):
    answer: str
    grounded: bool
    source_segment_ids: list[str] = []
    mode: AnalysisMode = "rules"
    persisted: bool = False


class StoredQuestion(BaseModel):
    id: str
    question: str
    answer: str
    grounded: bool
    source_segment_ids: list[str]
    mode: AnalysisMode
    created_at: datetime | None = None


class MeetingDetail(Meeting):
    """A meeting with its saved insights and Q&A history."""

    persisted: bool
    insights: AnalysisResult | None = None
    questions: list[StoredQuestion] = []


class MeetingSummary(BaseModel):
    id: str
    title: str
    description: str
    status: Literal["scheduled", "live", "completed"]
    date: str = ""
    duration_seconds: int
    languages: list[Language]
    speaker_count: int = 0
    is_simulated: bool
    # The seeded sample meeting: it can be reset but not deleted.
    is_demo: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ParticipantInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(default="", max_length=80)
    primary_language: LanguageCode = "en"


class TranscriptLineInput(BaseModel):
    # Index into MeetingCreate.participants.
    speaker: int = Field(ge=0)
    language: LanguageCode
    text: str = Field(min_length=1, max_length=2000)
    # Optional start time; estimated from the text length when omitted.
    start_seconds: float | None = Field(default=None, ge=0)


class MeetingCreate(BaseModel):
    """A meeting entered by the user: participants plus transcript lines."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    date: str = Field(default="", max_length=10, pattern=r"^(\d{4}-\d{2}-\d{2})?$")
    participants: list[ParticipantInput] = Field(min_length=1, max_length=20)
    lines: list[TranscriptLineInput] = Field(min_length=1, max_length=300)
    translate: bool = True

    @model_validator(mode="after")
    def _check_speakers(self) -> MeetingCreate:
        if any(line.speaker >= len(self.participants) for line in self.lines):
            raise ValueError("Every transcript line must reference a listed participant.")
        names = [p.name.strip().lower() for p in self.participants]
        if len(set(names)) != len(names):
            raise ValueError("Participant names must be unique.")
        return self


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    ai_configured: bool
    ai_model: str | None
    database: Literal["connected", "unavailable"]

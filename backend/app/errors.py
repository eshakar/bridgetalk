"""Application errors mapped to safe JSON responses in app/main.py."""

from bson import ObjectId
from bson.errors import InvalidId


class DatabaseUnavailableError(Exception):
    """MongoDB is not reachable; nothing was read or written."""


class NotFoundError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidIdError(Exception):
    def __init__(self, field: str) -> None:
        super().__init__(field)
        self.field = field


def parse_object_id(value: str, field: str = "meeting_id") -> ObjectId:
    """Validate an ObjectId string before it reaches the database."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError) as exc:
        raise InvalidIdError(field) from exc

"""Regenerate frontend/lib/sample-meeting.ts from the Python seed data.

Usage (from backend/): python -m app.data.export_sample
"""

import json
from pathlib import Path

from app.data.sample_meeting import SAMPLE_MEETING

TARGET = Path(__file__).resolve().parents[3] / "frontend" / "lib" / "sample-meeting.ts"

HEADER = (
    "// GENERATED from backend/app/data/sample_meeting.py. Do not edit by hand.\n"
    "// Regenerate with `python -m app.data.export_sample` from backend/.\n"
    "// SIMULATED DATA: fictional, hand-written transcript; not live transcription.\n"
    'import type { Meeting } from "@/types/meeting";\n\n'
)


def main() -> None:
    body = json.dumps(SAMPLE_MEETING.model_dump(), ensure_ascii=False, indent=2)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(f"{HEADER}export const SAMPLE_MEETING: Meeting = {body};\n", encoding="utf-8")
    print(f"Wrote {TARGET}")


if __name__ == "__main__":
    main()

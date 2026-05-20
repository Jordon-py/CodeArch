from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .deterministic import find_duplicates
from .provider import generate_smart_save_suggestion
from .schemas import ErrorResponse, SmartSaveRequest, SmartSaveResponse


def _allowed_origins() -> list[str]:
    raw = os.getenv(
        "SMART_SAVE_ALLOWED_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    )
    return [item.strip() for item in raw.split(",") if item.strip()]


app = FastAPI(
    title="CodeArch Smart Save Autopilot",
    version="0.1.0",
    description="Local-first FastAPI sidecar for Pydantic-validated snippet metadata suggestions.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "smart-save-autopilot"}


@app.post(
    "/api/smart-save/analyze",
    response_model=SmartSaveResponse,
    responses={422: {"model": ErrorResponse}},
)
async def analyze_smart_save(request: SmartSaveRequest) -> SmartSaveResponse:
    duplicate_candidates = find_duplicates(request)
    result = await generate_smart_save_suggestion(request)

    result.suggestion.duplicate_candidates = duplicate_candidates
    if not result.suggestion.related_snippet_ids:
        result.suggestion.related_snippet_ids = [
            candidate.id for candidate in duplicate_candidates if candidate.id
        ][:4]

    warnings = [
        *result.warnings,
        *result.suggestion.warnings,
        *result.suggestion.risk_notes,
    ]
    if duplicate_candidates:
        warnings.append("Possible duplicate detected. Review before saving.")

    return SmartSaveResponse(
        suggestion=result.suggestion,
        duplicateCandidates=duplicate_candidates,
        fallbackUsed=result.fallback_used,
        provider=result.provider,
        validationStatus=result.validation_status,
        warnings=list(dict.fromkeys(warnings)),
    )

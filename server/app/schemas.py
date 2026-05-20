from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

try:
    from pydantic import ConfigDict
except ImportError:  # pragma: no cover - Pydantic v1 compatibility
    ConfigDict = None


class CamelModel(BaseModel):
    if ConfigDict:
        model_config = ConfigDict(populate_by_name=True, extra="forbid", str_strip_whitespace=True)
    else:  # pragma: no cover - Pydantic v1 compatibility
        class Config:
            allow_population_by_field_name = True
            extra = "forbid"
            anystr_strip_whitespace = True


class SnippetMetadata(CamelModel):
    id: str | None = None
    title: str | None = None
    language: str | None = None
    tags: list[str] = Field(default_factory=list)
    collection: str | None = None
    description: str | None = None
    summary: str | None = None
    code: str | None = None


class DuplicateCandidate(CamelModel):
    id: str | None = None
    title: str = "Untitled snippet"
    match_type: Literal["exact", "near-code", "near-title"] = Field(alias="matchType")
    score: float = Field(ge=0, le=1)
    reason: str


class SmartSaveRequest(CamelModel):
    code: str = Field(min_length=1, max_length=200_000)
    existing_snippets: list[SnippetMetadata] = Field(default_factory=list, alias="existingSnippets")
    user_provided_title: str | None = Field(default=None, alias="userProvidedTitle")
    user_provided_language: str | None = Field(default=None, alias="userProvidedLanguage")
    current_collections: list[str] = Field(default_factory=list, alias="currentCollections")
    preferences: dict[str, Any] = Field(default_factory=dict)


class SmartSaveSuggestion(CamelModel):
    title: str = Field(min_length=1, max_length=120)
    language: str = Field(min_length=1, max_length=40)
    tags: list[str] = Field(default_factory=list, max_length=12)
    collection: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=260)
    use_case: str = Field(default="", max_length=260, alias="useCase")
    framework: str = Field(default="None", max_length=80)
    dependencies: list[str] = Field(default_factory=list, max_length=20)
    confidence: float = Field(ge=0, le=1)
    warnings: list[str] = Field(default_factory=list, max_length=12)
    risk_notes: list[str] = Field(default_factory=list, max_length=12, alias="riskNotes")
    related_snippet_ids: list[str] = Field(default_factory=list, max_length=8, alias="relatedSnippetIds")
    duplicate_candidates: list[DuplicateCandidate] = Field(
        default_factory=list,
        max_length=8,
        alias="duplicateCandidates",
    )


class SmartSaveResponse(CamelModel):
    suggestion: SmartSaveSuggestion
    duplicate_candidates: list[DuplicateCandidate] = Field(alias="duplicateCandidates")
    fallback_used: bool = Field(alias="fallbackUsed")
    provider: str
    validation_status: Literal["validated", "repaired", "fallback"] = Field(alias="validationStatus")
    warnings: list[str] = Field(default_factory=list)


class ErrorResponse(CamelModel):
    error: str
    code: str = "SMART_SAVE_ERROR"
    details: dict[str, Any] | None = None


def model_to_alias_dict(model: BaseModel) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump(by_alias=True)
    return model.dict(by_alias=True)


def suggestion_json_schema() -> dict[str, Any]:
    if hasattr(SmartSaveSuggestion, "model_json_schema"):
        return SmartSaveSuggestion.model_json_schema(by_alias=True)
    return SmartSaveSuggestion.schema(by_alias=True)

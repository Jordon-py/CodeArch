from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from .deterministic import deterministic_suggestion
from .schemas import (
    SmartSaveRequest,
    SmartSaveSuggestion,
    model_to_alias_dict,
    suggestion_json_schema,
)


DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:7b"


@dataclass
class ProviderResult:
    suggestion: SmartSaveSuggestion
    provider: str
    fallback_used: bool
    validation_status: str
    warnings: list[str]


def validate_suggestion(payload: dict[str, Any]) -> SmartSaveSuggestion:
    if hasattr(SmartSaveSuggestion, "model_validate"):
        return SmartSaveSuggestion.model_validate(payload)
    return SmartSaveSuggestion.parse_obj(payload)


def _read_env_float(key: str, default: float) -> float:
    try:
        return float(os.getenv(key, default))
    except ValueError:
        return default


def _ollama_config() -> tuple[str, str, float]:
    base_url = os.getenv("OLLAMA_BASE_URL", DEFAULT_OLLAMA_URL).rstrip("/")
    model = os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
    timeout = _read_env_float("OLLAMA_TIMEOUT_SECONDS", 20)
    return base_url, model, timeout


def _compact_snippets(request: SmartSaveRequest) -> list[dict[str, Any]]:
    snippets = []
    for snippet in request.existing_snippets[:80]:
        snippets.append(
            {
                "id": snippet.id,
                "title": snippet.title,
                "language": snippet.language,
                "tags": snippet.tags,
                "collection": snippet.collection,
                "description": snippet.description or snippet.summary,
            }
        )
    return snippets


def _system_prompt() -> str:
    return (
        "You are CodeArch Smart Save Autopilot. Return only valid JSON matching the "
        "provided schema. Keep suggestions concise, local-first, and developer-oriented. "
        "Do not invent external services. Flag security risks such as credentials, tokens, "
        "private keys, dynamic execution, destructive commands, or unsafe auth patterns."
    )


def _user_payload(request: SmartSaveRequest) -> str:
    payload = {
        "code": request.code,
        "userProvidedTitle": request.user_provided_title,
        "userProvidedLanguage": request.user_provided_language,
        "currentCollections": request.current_collections,
        "existingSnippetMetadata": _compact_snippets(request),
        "preferences": request.preferences,
        "requiredOutput": {
            "title": "short filename-like title",
            "language": "detected language",
            "tags": "3-8 useful lowercase tags",
            "collection": "best project or collection",
            "description": "one sentence summary",
            "useCase": "when to reuse this snippet",
            "framework": "detected framework or None",
            "dependencies": "imports/packages/modules",
            "confidence": "0 to 1",
            "warnings": "user-facing warnings",
            "riskNotes": "security or reliability risks",
            "relatedSnippetIds": "IDs from existingSnippetMetadata only",
            "duplicateCandidates": "leave empty unless exact evidence is visible",
        },
    }
    return json.dumps(payload, ensure_ascii=False)


def _post_json(url: str, payload: dict[str, Any], timeout: float) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _extract_json_object(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        parsed = json.loads(text[start : end + 1])
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("Ollama response did not contain a JSON object.")


def _call_ollama_once(request: SmartSaveRequest, repair_context: str | None = None) -> SmartSaveSuggestion:
    base_url, model, timeout = _ollama_config()
    messages = [
        {"role": "system", "content": _system_prompt()},
        {"role": "user", "content": _user_payload(request)},
    ]
    if repair_context:
        messages.append(
            {
                "role": "user",
                "content": (
                    "Repair the previous invalid output. Return only JSON matching the schema. "
                    f"Validation error: {repair_context[:1800]}"
                ),
            }
        )

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "format": suggestion_json_schema(),
        "options": {"temperature": 0.1},
    }
    response = _post_json(f"{base_url}/api/chat", payload, timeout)
    content = response.get("message", {}).get("content", "")
    parsed = _extract_json_object(content)
    return validate_suggestion(parsed)


async def generate_smart_save_suggestion(request: SmartSaveRequest) -> ProviderResult:
    try:
        suggestion = await asyncio.to_thread(_call_ollama_once, request, None)
        return ProviderResult(
            suggestion=suggestion,
            provider=f"ollama:{os.getenv('OLLAMA_MODEL', DEFAULT_OLLAMA_MODEL)}",
            fallback_used=False,
            validation_status="validated",
            warnings=[],
        )
    except (ValidationError, ValueError, json.JSONDecodeError) as error:
        try:
            suggestion = await asyncio.to_thread(_call_ollama_once, request, str(error))
            return ProviderResult(
                suggestion=suggestion,
                provider=f"ollama:{os.getenv('OLLAMA_MODEL', DEFAULT_OLLAMA_MODEL)}",
                fallback_used=False,
                validation_status="repaired",
                warnings=["Ollama output needed one schema repair pass."],
            )
        except Exception as repair_error:
            fallback = deterministic_suggestion(request)
            return ProviderResult(
                suggestion=fallback,
                provider="deterministic-fallback",
                fallback_used=True,
                validation_status="fallback",
                warnings=[
                    "Ollama returned invalid structured output twice; deterministic metadata was used.",
                    type(repair_error).__name__,
                ],
            )
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        fallback = deterministic_suggestion(request)
        return ProviderResult(
            suggestion=fallback,
            provider="deterministic-fallback",
            fallback_used=True,
            validation_status="fallback",
            warnings=[
                "Ollama is unavailable; deterministic metadata was used.",
                type(error).__name__,
            ],
        )
    except Exception as error:
        fallback = deterministic_suggestion(request)
        return ProviderResult(
            suggestion=fallback,
            provider="deterministic-fallback",
            fallback_used=True,
            validation_status="fallback",
            warnings=[
                "Smart Save provider failed safely; deterministic metadata was used.",
                type(error).__name__,
            ],
        )


def response_payload(result: ProviderResult) -> dict[str, Any]:
    return {
        "suggestion": model_to_alias_dict(result.suggestion),
        "duplicateCandidates": [
            model_to_alias_dict(candidate)
            for candidate in result.suggestion.duplicate_candidates
        ],
        "fallbackUsed": result.fallback_used,
        "provider": result.provider,
        "validationStatus": result.validation_status,
        "warnings": result.warnings,
    }

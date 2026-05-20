import asyncio

from fastapi.testclient import TestClient

from app.deterministic import deterministic_suggestion, find_duplicates
from app.main import app
from app import provider
from app.provider import validate_suggestion
from app.schemas import SmartSaveRequest


def test_deterministic_suggestion_detects_react_metadata():
    request = SmartSaveRequest(
        code='import React, { useState } from "react";\nexport function SaveButton(){ return <button>Save</button>; }',
        existingSnippets=[],
        currentCollections=["Frontend"],
    )

    suggestion = deterministic_suggestion(request)

    assert suggestion.language in {"JSX", "JavaScript"}
    assert suggestion.collection == "Frontend"
    assert "react" in suggestion.tags
    assert "react" in suggestion.dependencies


def test_duplicate_detection_finds_exact_match():
    request = SmartSaveRequest(
        code="export function sum(a, b) { return a + b; }",
        existingSnippets=[
            {
                "id": "artifact-sum",
                "title": "sum.js",
                "language": "JavaScript",
                "code": "export function sum(a,b){return a+b}",
            }
        ],
    )

    duplicates = find_duplicates(request)

    assert duplicates
    assert duplicates[0].id == "artifact-sum"


def test_validate_suggestion_rejects_bad_confidence():
    try:
        validate_suggestion(
            {
                "title": "x.js",
                "language": "JavaScript",
                "tags": [],
                "collection": "Workbench",
                "description": "Small helper.",
                "useCase": "Reuse.",
                "framework": "None",
                "dependencies": [],
                "confidence": 2,
                "warnings": [],
                "riskNotes": [],
                "relatedSnippetIds": [],
                "duplicateCandidates": [],
            }
        )
    except Exception as error:
        assert "confidence" in str(error)
    else:
        raise AssertionError("Expected schema validation to fail.")


def test_api_falls_back_when_ollama_is_unavailable(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://127.0.0.1:9")
    client = TestClient(app)

    response = client.post(
        "/api/smart-save/analyze",
        json={
            "code": "from fastapi import APIRouter\nrouter = APIRouter()",
            "existingSnippets": [],
            "currentCollections": ["Backend"],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["fallbackUsed"] is True
    assert payload["validationStatus"] == "fallback"
    assert payload["suggestion"]["collection"] == "Backend"


def test_provider_invalid_structured_output_retries_then_falls_back(monkeypatch):
    calls = []

    def raise_invalid_response(request, repair_context=None):
        calls.append(repair_context)
        raise ValueError("invalid structured output")

    monkeypatch.setattr(provider, "_call_ollama_once", raise_invalid_response)

    request = SmartSaveRequest(
        code="const token = process.env.API_TOKEN;\nexport const config = { token };",
        existingSnippets=[],
        currentCollections=["Security"],
    )

    response = asyncio.run(provider.generate_smart_save_suggestion(request))

    assert len(calls) == 2
    assert calls[0] is None
    assert calls[1] == "invalid structured output"
    assert response.fallback_used is True
    assert response.validation_status == "fallback"
    assert response.suggestion.title
    assert response.suggestion.language in {"JavaScript", "TypeScript", "Unknown"}

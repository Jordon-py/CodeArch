from __future__ import annotations

import re
from difflib import SequenceMatcher

from .schemas import DuplicateCandidate, SmartSaveRequest, SmartSaveSuggestion


LANGUAGE_EXTENSIONS = {
    "Bash": "sh",
    "CSS": "css",
    "HTML": "html",
    "JavaScript": "js",
    "JSON": "json",
    "JSX": "jsx",
    "Markdown": "md",
    "Python": "py",
    "SQL": "sql",
    "TypeScript": "ts",
    "TSX": "tsx",
    "YAML": "yml",
}

SECRET_PATTERNS = [
    (re.compile(r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][^'\"]{8,}['\"]"), "Possible credential assignment"),
    (re.compile(r"sk-[A-Za-z0-9_-]{20,}"), "Possible OpenAI-style API key"),
    (re.compile(r"ghp_[A-Za-z0-9_]{20,}"), "Possible GitHub token"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "Possible AWS access key"),
    (re.compile(r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"), "Private key material"),
]


def normalize_code_for_duplicate(code: str) -> str:
    without_comments = re.sub(r"//.*|#.*", "", code)
    return re.sub(r"\s+", "", without_comments).lower()


def normalize_title(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def code_tokens(code: str) -> set[str]:
    return set(re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", code.lower()))


def detect_language(code: str, fallback: str = "Text") -> str:
    value = code.strip()
    lower = value.lower()

    if not value:
        return fallback
    if lower.startswith("#!/usr/bin/env bash") or lower.startswith("#!/bin/bash"):
        return "Bash"
    if re.search(r"^\s*(select|insert|update|delete|create table|alter table)\b", value, re.I | re.M):
        return "SQL"
    if re.match(r"^\s*[{[]", value) and re.search(r'"[^"]+"\s*:', value):
        return "JSON"
    if "tsx" in lower or ("react" in lower and re.search(r"\btype\s+\w+|\binterface\s+\w+", value)):
        return "TSX"
    if re.search(r"\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean)\b", value):
        return "TypeScript"
    if re.search(r"<[A-Za-z][\s\S]*>|className=|useState\b|\breact\b", value, re.I):
        return "JSX" if "classname=" in lower or "usestate" in lower or "react" in lower or "export function" in lower else "HTML"
    if re.search(r"\bfrom\s+[A-Za-z_][\w.]*\s+import\b|^\s*import\s+[A-Za-z_][\w.]*(?:\s+as\s+\w+)?\s*$|def\s+[A-Za-z_]\w*\s*\(|print\(", value, re.M):
        return "Python"
    if re.search(r"\b(export|const|let|function|async|await|module\.exports|=>)\b", value):
        return "JavaScript"
    if re.search(r"[.#][A-Za-z0-9_-]+\s*\{", value):
        return "CSS"
    if value.startswith("---") or re.search(r"^#\s+", value, re.M):
        return "Markdown"
    if ":" in value and re.search(r"^\s*[A-Za-z0-9_-]+:\s*", value, re.M):
        return "YAML"
    return fallback


def extension_for_language(language: str) -> str:
    return LANGUAGE_EXTENSIONS.get(language, "txt")


def kebab(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", value).strip("-").lower()
    return cleaned or "snippet"


def infer_title(code: str, language: str, user_title: str | None = None) -> str:
    if user_title:
        return user_title.strip()

    patterns = [
        r"\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)",
        r"\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=",
        r"\bdef\s+([A-Za-z_][\w]*)\s*\(",
        r"\bclass\s+([A-Za-z_][\w]*)",
        r"\bexport\s+default\s+function\s+([A-Za-z_$][\w$]*)",
    ]
    for pattern in patterns:
        match = re.search(pattern, code)
        if match:
            return f"{kebab(match.group(1))}.{extension_for_language(language)}"

    route = re.search(r"\b(?:router|app)\.(get|post|put|patch|delete)\(['\"]([^'\"]+)", code)
    if route:
        return f"{route.group(1)}-{kebab(route.group(2))}.{extension_for_language(language)}"

    return f"smart-save-{extension_for_language(language)}"


def extract_dependencies(code: str) -> list[str]:
    dependencies: set[str] = set()
    patterns = [
        r"import\s+(?:[^'\"]+\s+from\s+)?['\"]([^'\"]+)['\"]",
        r"require\(['\"]([^'\"]+)['\"]\)",
        r"from\s+([A-Za-z0-9_.]+)\s+import",
        r"import\s+([A-Za-z0-9_.]+)",
    ]
    for pattern in patterns:
        for item in re.findall(pattern, code):
            if item.startswith("."):
                continue
            dependencies.add(item.split("/")[0])

    return sorted(dependencies)[:20]


def detect_framework(code: str, dependencies: list[str]) -> str:
    text = f"{code} {' '.join(dependencies)}".lower()
    checks = [
        ("FastAPI", ["fastapi", "apirouter"]),
        ("React", ["react", "usestate", "useeffect", "jsx"]),
        ("Express", ["express", "router.get", "app.get"]),
        ("Playwright", ["@playwright/test", "page.goto", "expect("]),
        ("SQLAlchemy", ["sqlalchemy", "sessionmaker", "create_engine"]),
        ("Pandas", ["pandas", "dataframe"]),
        ("Tailwind", ["tailwind", "classname="]),
    ]
    for label, needles in checks:
        if any(needle in text for needle in needles):
            return label
    return "None"


def suggest_tags(code: str, language: str, framework: str, dependencies: list[str]) -> list[str]:
    text = f"{language} {framework} {' '.join(dependencies)} {code}".lower()
    tags: list[str] = []

    def add(tag: str, condition: bool = True) -> None:
        if condition and tag not in tags:
            tags.append(tag)

    add(language.lower())
    add(framework.lower(), framework != "None")
    add("frontend", framework in {"React", "Tailwind"} or "component" in text)
    add("backend", framework in {"FastAPI", "Express", "SQLAlchemy"} or "middleware" in text)
    add("api", any(token in text for token in ["fetch", "axios", "router", "endpoint", "request", "response"]))
    add("auth", any(token in text for token in ["auth", "token", "jwt", "session", "permission"]))
    add("database", any(token in text for token in ["sql", "database", "query", "engine", "sessionmaker"]))
    add("testing", any(token in text for token in ["test", "expect", "pytest", "playwright"]))
    add("ml", any(token in text for token in ["model", "predict", "pandas", "sklearn", "feature"]))
    add("safety", any(token in text for token in ["try", "catch", "except", "fallback", "guard"]))
    add("utility", any(token in text for token in ["helper", "util", "format", "parse", "map", "reduce"]))
    add("config", any(token in text for token in ["env", "settings", "config"]))
    return tags[:8]


def suggest_collection(language: str, framework: str, tags: list[str], current: list[str]) -> str:
    candidates = {
        "frontend": "Frontend",
        "backend": "Backend",
        "database": "Data",
        "testing": "Testing",
        "ml": "Data",
        "config": "Configuration",
        "utility": "Utilities",
    }
    target = "Workbench"
    for tag in tags:
        if tag in candidates:
            target = candidates[tag]
            break
    if framework == "FastAPI":
        target = "Backend"
    if framework == "React":
        target = "Frontend"
    for collection in current:
        if collection.lower() == target.lower():
            return collection
    if language == "SQL":
        return "Data"
    return target


def detect_secret_warnings(code: str) -> list[str]:
    warnings: list[str] = []
    for pattern, label in SECRET_PATTERNS:
        if pattern.search(code) and label not in warnings:
            warnings.append(label)
    return warnings


def find_duplicates(request: SmartSaveRequest) -> list[DuplicateCandidate]:
    normalized_code = normalize_code_for_duplicate(request.code)
    tokens = code_tokens(request.code)
    title = infer_title(
        request.code,
        detect_language(request.code, request.user_provided_language or "Text"),
        request.user_provided_title,
    )
    normalized_candidate_title = normalize_title(title)
    candidates: list[DuplicateCandidate] = []

    for snippet in request.existing_snippets:
        snippet_code = snippet.code or ""
        snippet_title = snippet.title or "Untitled snippet"
        if snippet_code and normalize_code_for_duplicate(snippet_code) == normalized_code:
            candidates.append(
                DuplicateCandidate(
                    id=snippet.id,
                    title=snippet_title,
                    matchType="exact",
                    score=1,
                    reason="Code matches an existing saved snippet after whitespace/comment normalization.",
                )
            )
            continue

        if normalized_candidate_title and normalize_title(snippet_title) == normalized_candidate_title:
            candidates.append(
                DuplicateCandidate(
                    id=snippet.id,
                    title=snippet_title,
                    matchType="near-title",
                    score=0.9,
                    reason="Suggested title is already present in the archive.",
                )
            )
            continue

        if snippet_code:
            snippet_tokens = code_tokens(snippet_code)
            overlap = len(tokens & snippet_tokens) / max(1, len(tokens | snippet_tokens))
            sequence_score = SequenceMatcher(None, normalized_code, normalize_code_for_duplicate(snippet_code)).ratio()
            score = max(overlap, sequence_score)
            if score >= 0.82:
                candidates.append(
                    DuplicateCandidate(
                        id=snippet.id,
                        title=snippet_title,
                        matchType="near-code",
                        score=round(score, 2),
                        reason="Code is highly similar to an existing saved snippet.",
                    )
                )

    return sorted(candidates, key=lambda item: item.score, reverse=True)[:8]


def find_related_snippet_ids(tags: list[str], language: str, collection: str, request: SmartSaveRequest) -> list[str]:
    scores: list[tuple[str, int]] = []
    tag_set = set(tags)
    for snippet in request.existing_snippets:
        score = len(tag_set & set(snippet.tags)) * 4
        if snippet.language == language:
            score += 2
        if snippet.collection == collection:
            score += 2
        if snippet.id and score > 1:
            scores.append((snippet.id, score))
    return [item[0] for item in sorted(scores, key=lambda item: item[1], reverse=True)[:6]]


def deterministic_suggestion(request: SmartSaveRequest) -> SmartSaveSuggestion:
    language = detect_language(request.code, request.user_provided_language or "Text")
    title = infer_title(request.code, language, request.user_provided_title)
    dependencies = extract_dependencies(request.code)
    framework = detect_framework(request.code, dependencies)
    tags = suggest_tags(request.code, language, framework, dependencies)
    collection = suggest_collection(language, framework, tags, request.current_collections)
    duplicate_candidates = find_duplicates(request)
    secret_warnings = detect_secret_warnings(request.code)
    related_ids = find_related_snippet_ids(tags, language, collection, request)
    risk_notes = []
    if secret_warnings:
        risk_notes.append("Review possible secrets before saving or sharing this snippet.")
    if "eval(" in request.code or "new Function" in request.code:
        risk_notes.append("Dynamic code execution detected. Reuse only in trusted contexts.")

    purpose = "Reusable code snippet"
    if framework != "None":
        purpose = f"Reusable {framework} snippet"
    elif tags:
        purpose = f"Reusable {tags[0]} snippet"

    return SmartSaveSuggestion(
        title=title,
        language=language,
        tags=tags,
        collection=collection,
        description=f"{purpose} with {len(request.code.splitlines()) or 1} lines.",
        useCase="Save, search, and reuse this snippet from the CodeArch library.",
        framework=framework,
        dependencies=dependencies,
        confidence=0.72 if not duplicate_candidates else 0.64,
        warnings=secret_warnings,
        riskNotes=risk_notes,
        relatedSnippetIds=related_ids,
        duplicateCandidates=duplicate_candidates,
    )

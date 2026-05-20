import { seedCodeArtifacts } from "../data/codeArtifacts.js";

export const STORAGE_VERSION = 3;
export const STORAGE_KEY = "codearch.savedCodeArtifacts.v3";

const LEGACY_STORAGE_KEYS = [
  "codearch.savedCodeArtifacts.v2",
  "codearch.savedCodeArtifacts.v1",
];
const VERSION_HISTORY_LIMIT = 8;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function makeResponse(data, meta = {}) {
  return { ok: true, data, error: null, meta };
}

function makeError(message, code = "UNKNOWN_ERROR", details = null) {
  return { ok: false, data: null, error: { code, message, details }, meta: {} };
}

function makeId(prefix = "artifact") {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${random}`;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeText).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(",")
          .map(normalizeText)
          .filter(Boolean),
      ),
    ];
  }

  return [];
}

function normalizeDate(value, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getLineCount(code) {
  return normalizeText(code).split("\n").filter(Boolean).length || 1;
}

function extensionForLanguage(language) {
  const normalized = normalizeText(language).toLowerCase();
  const map = {
    bash: "sh",
    css: "css",
    html: "html",
    javascript: "js",
    json: "json",
    jsx: "jsx",
    markdown: "md",
    python: "py",
    shell: "sh",
    sql: "sql",
    text: "txt",
    tsx: "tsx",
    typescript: "ts",
    yaml: "yml",
  };

  return map[normalized] ?? "txt";
}

export function inferLanguageFromCode(code, fallback = "Text") {
  const value = normalizeText(code);
  const lower = value.toLowerCase();

  if (!value) return fallback;
  if (lower.startsWith("#!/usr/bin/env bash") || lower.startsWith("#!/bin/bash")) {
    return "Shell";
  }
  if (/^\s*(select|insert|update|delete|create table|alter table)\b/im.test(value)) {
    return "SQL";
  }
  if (/^\s*[{[]/.test(value) && /"[^"]+"\s*:/.test(value)) {
    return "JSON";
  }
  if (/<[a-z][\s\S]*>/i.test(value) && /<\/[a-z]+>/i.test(value)) {
    return value.includes("className=") || value.includes("useState(") ? "JSX" : "HTML";
  }
  if (/\b(def|from|import)\s+[a-zA-Z_]/.test(value) || /\bprint\(/.test(value)) {
    return "Python";
  }
  if (/\b(interface|type)\s+[A-Z_a-z]|\b:\s*(string|number|boolean)\b|as const/.test(value)) {
    return "TypeScript";
  }
  if (/\b(export|const|let|function|async|await|module\.exports|=>)\b/.test(value)) {
    return "JavaScript";
  }
  if (/[.#][a-zA-Z0-9_-]+\s*\{/.test(value)) {
    return "CSS";
  }
  if (/^---[\s\S]*---/.test(value) || /^#\s+/m.test(value)) {
    return "Markdown";
  }

  return fallback;
}

function titleFromIdentifier(name, language) {
  const cleaned = normalizeText(name).replace(/[^a-zA-Z0-9_.-]/g, "-");
  return `${cleaned}.${extensionForLanguage(language)}`;
}

export function inferTitleFromCode(code, language = "Text", source = "") {
  const value = normalizeText(code);
  const sourceName = normalizeText(source).split(/[\\/]/).filter(Boolean).at(-1);

  if (sourceName && /\.[a-z0-9]+$/i.test(sourceName)) {
    return sourceName;
  }

  const functionMatch = value.match(
    /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
  );
  if (functionMatch) return titleFromIdentifier(functionMatch[1], language);

  const constMatch = value.match(/\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
  if (constMatch) return titleFromIdentifier(constMatch[1], language);

  const pythonMatch = value.match(/\bdef\s+([A-Za-z_][\w]*)\s*\(/);
  if (pythonMatch) return titleFromIdentifier(pythonMatch[1], "Python");

  const classMatch = value.match(/\bclass\s+([A-Za-z_][\w]*)/);
  if (classMatch) return titleFromIdentifier(classMatch[1], language);

  const routeMatch = value.match(/\brouter\.(get|post|put|patch|delete)\(["']([^"']+)/);
  if (routeMatch) {
    return `${routeMatch[1]}-${routeMatch[2].replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.js`;
  }

  return `saved-${extensionForLanguage(language)}-${new Date().toISOString().slice(0, 10)}`;
}

export function suggestTagsForCode({ code = "", language = "", title = "", collection = "" }) {
  const text = `${title} ${collection} ${language} ${code}`.toLowerCase();
  const suggestions = new Set();

  if (language) suggestions.add(normalizeText(language).toLowerCase());
  if (/auth|token|jwt|session|permission/.test(text)) suggestions.add("auth");
  if (/sql|database|db\.|query|engine|sessionmaker/.test(text)) suggestions.add("database");
  if (/test|expect|describe|pytest|playwright/.test(text)) suggestions.add("testing");
  if (/fetch|axios|api|router|endpoint|request|response/.test(text)) suggestions.add("api");
  if (/react|jsx|component|use[A-Z]/.test(text)) suggestions.add("react");
  if (/model|predict|pandas|sklearn|feature/.test(text)) suggestions.add("ml");
  if (/deploy|vercel|build|release|ci|pipeline/.test(text)) suggestions.add("delivery");
  if (/cache|memo|storage|localstorage/.test(text)) suggestions.add("cache");
  if (/error|try|catch|fallback|guard/.test(text)) suggestions.add("safety");
  if (/array|map|reduce|utility|helper/.test(text)) suggestions.add("utilities");

  return [...suggestions].slice(0, 6);
}

export function analyzeCodeDraft({ code = "", title = "", language = "", collection = "", artifacts = [] }) {
  const detectedLanguage = inferLanguageFromCode(code, normalizeText(language) || "Text");
  const suggestedTitle = inferTitleFromCode(code, detectedLanguage);
  const suggestedTags = suggestTagsForCode({
    code,
    language: detectedLanguage,
    title: title || suggestedTitle,
    collection,
  });
  const normalizedCode = normalizeText(code).replace(/\s+/g, " ");
  const normalizedTitle = normalizeText(title || suggestedTitle).toLowerCase();
  const duplicate = artifacts.find((artifact) => {
    const artifactCode = normalizeText(artifact.code).replace(/\s+/g, " ");
    return (
      artifactCode === normalizedCode ||
      normalizeText(artifact.title).toLowerCase() === normalizedTitle
    );
  });

  return {
    detectedLanguage,
    suggestedTitle,
    suggestedTags,
    duplicate,
    lineCount: getLineCount(code),
  };
}

function sanitizeVersionHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .map((entry) => ({
      title: normalizeText(entry?.title),
      code: normalizeText(entry?.code),
      summary: normalizeText(entry?.summary),
      tags: normalizeTags(entry?.tags),
      collection: normalizeText(entry?.collection),
      language: normalizeText(entry?.language),
      savedAt: normalizeDate(entry?.savedAt ?? entry?.updatedAt),
    }))
    .filter((entry) => entry.code)
    .slice(0, VERSION_HISTORY_LIMIT);
}

function estimateHealth(artifact) {
  const missing = [];
  let score = 100;

  if (!artifact.summary || artifact.summary === "Saved code artifact.") {
    missing.push("description");
    score -= 16;
  }
  if (!artifact.tags.length) {
    missing.push("tags");
    score -= 18;
  }
  if (!artifact.collection || artifact.collection === "Inbox" || artifact.collection === "Unfiled") {
    missing.push("collection");
    score -= 10;
  }
  if (!artifact.source) {
    missing.push("source");
    score -= 8;
  }
  if (getLineCount(artifact.code) <= 1) {
    missing.push("context");
    score -= 10;
  }

  const normalized = Math.max(0, Math.min(100, score));
  const label = normalized >= 85 ? "Ready" : normalized >= 65 ? "Useful" : "Needs context";

  return { score: normalized, label, missing };
}

function migrateArtifact(input) {
  const now = new Date().toISOString();
  const code = normalizeText(input?.code);
  const language =
    normalizeText(input?.language) || inferLanguageFromCode(code, "Text");
  const title =
    normalizeText(input?.title) || inferTitleFromCode(code, language, input?.source);
  const createdAt = normalizeDate(input?.createdAt, now);
  const updatedAt = normalizeDate(input?.updatedAt, createdAt);

  const artifact = {
    id: normalizeText(input?.id) || makeId(),
    schemaVersion: STORAGE_VERSION,
    title,
    language,
    tags: normalizeTags(input?.tags),
    collection:
      normalizeText(input?.collection ?? input?.project ?? input?.folder) || "Inbox",
    summary:
      normalizeText(input?.summary ?? input?.description) ||
      `Reusable ${language} snippet with ${getLineCount(code)} lines.`,
    notes: normalizeText(input?.notes),
    source: normalizeText(input?.source ?? input?.context),
    code,
    usageCount: toNumber(input?.usageCount),
    favorite: Boolean(input?.favorite),
    pinned: Boolean(input?.pinned),
    createdAt,
    updatedAt,
    lastCopiedAt: input?.lastCopiedAt ? normalizeDate(input.lastCopiedAt) : null,
    lastOpenedAt: input?.lastOpenedAt ? normalizeDate(input.lastOpenedAt) : null,
    versionHistory: sanitizeVersionHistory(input?.versionHistory),
    relatedIds: Array.isArray(input?.relatedIds)
      ? input.relatedIds.map(normalizeText).filter(Boolean)
      : [],
  };

  return {
    ...artifact,
    health: estimateHealth(artifact),
  };
}

function relationshipScore(a, b) {
  const sharedTags = a.tags.filter((tag) => b.tags.includes(tag));
  let score = sharedTags.length * 4;

  if (a.language === b.language) score += 2;
  if (a.collection === b.collection) score += 2;
  if (a.source && a.source === b.source) score += 1;

  return score;
}

function attachRelatedIds(artifacts) {
  return artifacts.map((artifact) => {
    const relatedIds = artifacts
      .filter((candidate) => candidate.id !== artifact.id)
      .map((candidate) => ({
        id: candidate.id,
        score: relationshipScore(artifact, candidate),
      }))
      .filter((item) => item.score > 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.id);

    return {
      ...artifact,
      relatedIds,
      health: estimateHealth(artifact),
    };
  });
}

function hydrateArtifacts(input) {
  return attachRelatedIds(input.map(migrateArtifact));
}

function mergeMissingSeedArtifacts(artifacts) {
  const hasBoilerplateLibrary = artifacts.some((artifact) =>
    artifact.id.startsWith("artifact-boilerplate-"),
  );

  if (hasBoilerplateLibrary) {
    return { artifacts, changed: false };
  }

  const existingIds = new Set(artifacts.map((artifact) => artifact.id));
  const missingSeeds = seedCodeArtifacts.filter(
    (artifact) =>
      artifact.id.startsWith("artifact-boilerplate-") && !existingIds.has(artifact.id),
  );

  if (!missingSeeds.length) {
    return { artifacts, changed: false };
  }

  return {
    artifacts: attachRelatedIds([...artifacts, ...missingSeeds.map(migrateArtifact)]),
    changed: true,
  };
}

function readStoredArray(key) {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Stored artifact payload for ${key} is not an array.`);
  }

  return parsed;
}

function readArtifactsFromStorage() {
  if (!canUseStorage()) {
    return hydrateArtifacts(seedCodeArtifacts);
  }

  const current = readStoredArray(STORAGE_KEY);
  if (current) {
    const hydrated = hydrateArtifacts(current);
    const merged = mergeMissingSeedArtifacts(hydrated);
    if (merged.changed) {
      writeArtifactsToStorage(merged.artifacts);
    }
    return merged.artifacts;
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = readStoredArray(key);
    if (legacy) {
      const migrated = hydrateArtifacts(legacy);
      const merged = mergeMissingSeedArtifacts(migrated);
      writeArtifactsToStorage(merged.artifacts);
      return merged.artifacts;
    }
  }

  const seeded = hydrateArtifacts(seedCodeArtifacts);
  writeArtifactsToStorage(seeded);
  return seeded;
}

function writeArtifactsToStorage(artifacts) {
  if (canUseStorage()) {
    const persisted = artifacts.map((artifact) => {
      const persistable = { ...artifact };
      delete persistable.health;
      return persistable;
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }
}

function sortByUpdatedAt(artifacts) {
  return [...artifacts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function matchesQuery(artifact, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    artifact.title,
    artifact.language,
    artifact.collection,
    artifact.summary,
    artifact.notes,
    artifact.code,
    artifact.source,
    ...(artifact.tags ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function matchesLanguage(artifact, language) {
  return !language || language === "all" || artifact.language === language;
}

function normalizeArtifact(input, current = null) {
  const now = new Date().toISOString();
  const code = normalizeText(input.code);
  const language =
    normalizeText(input.language) ||
    inferLanguageFromCode(code, current?.language ?? "Text");
  const title =
    normalizeText(input.title) || inferTitleFromCode(code, language, input.source);
  const tags = normalizeTags(input.tags);
  const suggestedTags = tags.length
    ? tags
    : suggestTagsForCode({ code, language, title, collection: input.collection });

  if (!code) {
    return makeError("A saved script needs code content.", "VALIDATION_ERROR", {
      field: "code",
    });
  }

  const normalized = migrateArtifact({
    ...current,
    ...input,
    id: current?.id ?? input.id ?? makeId(),
    title,
    language,
    tags: suggestedTags,
    collection: normalizeText(input.collection) || current?.collection || "Inbox",
    summary:
      normalizeText(input.summary ?? input.description) ||
      current?.summary ||
      `Reusable ${language} snippet with ${getLineCount(code)} lines.`,
    notes: normalizeText(input.notes ?? current?.notes),
    code,
    usageCount:
      input.usageCount !== undefined ? toNumber(input.usageCount) : current?.usageCount ?? 0,
    createdAt: current?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
    lastCopiedAt: input.lastCopiedAt ?? current?.lastCopiedAt ?? null,
    lastOpenedAt: input.lastOpenedAt ?? current?.lastOpenedAt ?? null,
    versionHistory: input.versionHistory ?? current?.versionHistory ?? [],
  });

  return makeResponse(normalized);
}

function shouldCreateVersion(current, patch) {
  return ["title", "language", "collection", "summary", "notes", "code", "tags"].some(
    (field) => patch[field] !== undefined && JSON.stringify(current[field]) !== JSON.stringify(patch[field]),
  );
}

function makeVersionEntry(current) {
  return {
    title: current.title,
    language: current.language,
    collection: current.collection,
    summary: current.summary,
    notes: current.notes,
    tags: current.tags,
    code: current.code,
    savedAt: current.updatedAt,
  };
}

export async function listCodeArtifacts({ query = "", language = "all" } = {}) {
  try {
    const artifacts = readArtifactsFromStorage();
    const filtered = sortByUpdatedAt(artifacts).filter(
      (artifact) => matchesQuery(artifact, query) && matchesLanguage(artifact, language),
    );

    return makeResponse(filtered, {
      total: artifacts.length,
      filtered: filtered.length,
      storageVersion: STORAGE_VERSION,
      source: canUseStorage() ? "localStorage" : "seed",
    });
  } catch (error) {
    return makeError(
      "Saved scripts could not be loaded.",
      "READ_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function getCodeArtifact(id) {
  try {
    const artifacts = readArtifactsFromStorage();
    const artifact = artifacts.find((item) => item.id === id);

    if (!artifact) {
      return makeError("Saved script was not found.", "NOT_FOUND", { id });
    }

    return makeResponse({ ...artifact, tags: [...artifact.tags] });
  } catch (error) {
    return makeError(
      "Saved script could not be loaded.",
      "READ_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function createCodeArtifact(input) {
  const normalized = normalizeArtifact(input);
  if (!normalized.ok) return normalized;

  try {
    const artifacts = readArtifactsFromStorage();
    const nextArtifacts = attachRelatedIds([normalized.data, ...artifacts]);
    writeArtifactsToStorage(nextArtifacts);

    return makeResponse(nextArtifacts[0], {
      total: nextArtifacts.length,
      storageVersion: STORAGE_VERSION,
    });
  } catch (error) {
    return makeError(
      "Saved script could not be created.",
      "CREATE_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function importCodeArtifacts(input, { mode = "merge" } = {}) {
  try {
    if (!Array.isArray(input)) {
      return makeError("Import payload must be an array of saved scripts.", "VALIDATION_ERROR", {
        field: "artifacts",
      });
    }

    const currentArtifacts = mode === "replace" ? [] : readArtifactsFromStorage();
    const usedIds = new Set(currentArtifacts.map((artifact) => artifact.id));
    const importedArtifacts = [];

    for (const item of input) {
      const preferredId = normalizeText(item?.id);
      const normalized = normalizeArtifact({
        ...item,
        id: preferredId && !usedIds.has(preferredId) ? preferredId : undefined,
      });

      if (!normalized.ok) {
        return makeError(
          `Import failed for "${item?.title ?? "untitled"}": ${normalized.error.message}`,
          normalized.error.code,
          normalized.error.details,
        );
      }

      usedIds.add(normalized.data.id);
      importedArtifacts.push(normalized.data);
    }

    const nextArtifacts = attachRelatedIds(sortByUpdatedAt([...importedArtifacts, ...currentArtifacts]));
    writeArtifactsToStorage(nextArtifacts);

    return makeResponse(nextArtifacts, {
      imported: importedArtifacts.length,
      total: nextArtifacts.length,
      mode,
      storageVersion: STORAGE_VERSION,
    });
  } catch (error) {
    return makeError(
      "Saved scripts could not be imported.",
      "IMPORT_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function updateCodeArtifact(id, patch) {
  try {
    const artifacts = readArtifactsFromStorage();
    const current = artifacts.find((artifact) => artifact.id === id);

    if (!current) {
      return makeError("Saved script was not found.", "NOT_FOUND", { id });
    }

    const versionHistory = shouldCreateVersion(current, patch)
      ? [makeVersionEntry(current), ...current.versionHistory].slice(0, VERSION_HISTORY_LIMIT)
      : current.versionHistory;

    const normalized = normalizeArtifact(
      {
        ...current,
        ...patch,
        id: current.id,
        createdAt: current.createdAt,
        usageCount: patch.usageCount ?? current.usageCount,
        versionHistory,
      },
      current,
    );

    if (!normalized.ok) return normalized;

    const nextArtifacts = attachRelatedIds(
      artifacts.map((artifact) =>
        artifact.id === id ? normalized.data : artifact,
      ),
    );
    const nextArtifact = nextArtifacts.find((artifact) => artifact.id === id);
    writeArtifactsToStorage(nextArtifacts);

    return makeResponse(nextArtifact);
  } catch (error) {
    return makeError(
      "Saved script could not be updated.",
      "UPDATE_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function deleteCodeArtifact(id) {
  try {
    const artifacts = readArtifactsFromStorage();
    const nextArtifacts = artifacts.filter((artifact) => artifact.id !== id);

    if (nextArtifacts.length === artifacts.length) {
      return makeError("Saved script was not found.", "NOT_FOUND", { id });
    }

    const hydrated = attachRelatedIds(nextArtifacts);
    writeArtifactsToStorage(hydrated);
    return makeResponse({ id }, { total: hydrated.length });
  } catch (error) {
    return makeError(
      "Saved script could not be deleted.",
      "DELETE_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function summarizeCodeArtifacts(artifacts) {
  const languages = artifacts.reduce((acc, artifact) => {
    acc.set(artifact.language, (acc.get(artifact.language) ?? 0) + 1);
    return acc;
  }, new Map());

  const tags = artifacts.reduce((acc, artifact) => {
    artifact.tags.forEach((tag) => acc.set(tag, (acc.get(tag) ?? 0) + 1));
    return acc;
  }, new Map());

  const collections = artifacts.reduce((acc, artifact) => {
    acc.set(artifact.collection, (acc.get(artifact.collection) ?? 0) + 1);
    return acc;
  }, new Map());

  const recentScripts = sortByUpdatedAt(artifacts).slice(0, 4);
  const lastUpdated = recentScripts[0]?.updatedAt ?? null;
  const totalUsage = artifacts.reduce((sum, artifact) => sum + artifact.usageCount, 0);
  const totalLines = artifacts.reduce(
    (sum, artifact) => sum + getLineCount(artifact.code),
    0,
  );
  const favoriteCount = artifacts.filter((artifact) => artifact.favorite).length;
  const pinnedCount = artifacts.filter((artifact) => artifact.pinned).length;
  const copiedCount = artifacts.filter((artifact) => artifact.lastCopiedAt).length;
  const needsContextCount = artifacts.filter(
    (artifact) => artifact.health?.score < 70,
  ).length;
  const relatedLinkCount = artifacts.reduce(
    (sum, artifact) => sum + (artifact.relatedIds?.length ?? 0),
    0,
  );
  const healthAverage = artifacts.length
    ? Math.round(
        artifacts.reduce((sum, artifact) => sum + (artifact.health?.score ?? 0), 0) /
          artifacts.length,
      )
    : 0;

  return {
    totalScripts: artifacts.length,
    recentScripts,
    mostUsedLanguages: [...languages.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    topTags: [...tags.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    lastUpdated,
    totalUsage,
    totalLines,
    languageCount: languages.size,
    collectionCount: collections.size,
    favoriteCount,
    pinnedCount,
    copiedCount,
    needsContextCount,
    relatedLinkCount,
    healthAverage,
    avgLines: artifacts.length ? Math.round(totalLines / artifacts.length) : 0,
    collectionCounts: [...collections.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  };
}

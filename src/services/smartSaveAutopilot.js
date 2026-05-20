const DEFAULT_COLLECTION = "Workbench";
const SMART_SAVE_API_URL = (import.meta.env.VITE_SMART_SAVE_API_URL ?? "").replace(/\/$/, "");

const secretPatterns = [
  [/((api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}['"])/i, "Possible credential assignment"],
  [/sk-[A-Za-z0-9_-]{20,}/, "Possible OpenAI-style API key"],
  [/ghp_[A-Za-z0-9_]{20,}/, "Possible GitHub token"],
  [/AKIA[0-9A-Z]{16}/, "Possible AWS access key"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "Private key material"],
];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCode(code) {
  return normalizeText(code)
    .replace(/\/\/.*|#.*$/gm, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeTitle(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function codeTokens(code) {
  return new Set(normalizeText(code).toLowerCase().match(/[a-z_][a-z0-9_]{2,}/g) ?? []);
}

function jaccard(a, b) {
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let overlap = 0;
  a.forEach((item) => {
    if (b.has(item)) overlap += 1;
  });
  return overlap / union.size;
}

function extensionForLanguage(language) {
  const extensions = {
    Bash: "sh",
    CSS: "css",
    HTML: "html",
    JavaScript: "js",
    JSON: "json",
    JSX: "jsx",
    Markdown: "md",
    Python: "py",
    SQL: "sql",
    TypeScript: "ts",
    TSX: "tsx",
    YAML: "yml",
  };
  return extensions[language] ?? "txt";
}

function kebab(value) {
  return normalizeText(value).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "snippet";
}

export function detectSmartSaveLanguage(code, fallback = "Text") {
  const value = normalizeText(code);
  const lower = value.toLowerCase();

  if (!value) return fallback;
  if (lower.startsWith("#!/usr/bin/env bash") || lower.startsWith("#!/bin/bash")) return "Bash";
  if (/^\s*(select|insert|update|delete|create table|alter table)\b/im.test(value)) return "SQL";
  if (/^\s*[{[]/.test(value) && /"[^"]+"\s*:/.test(value)) return "JSON";
  if (/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean)\b/.test(value)) return lower.includes("react") ? "TSX" : "TypeScript";
  if (/<[A-Za-z][\s\S]*>|className=|useState\b|\breact\b/i.test(value)) return /className=|useState|\breact\b|export function/i.test(value) ? "JSX" : "HTML";
  if (/\bfrom\s+[A-Za-z_][\w.]*\s+import\b|^\s*import\s+[A-Za-z_][\w.]*(?:\s+as\s+\w+)?\s*$|def\s+[A-Za-z_]\w*\s*\(|print\(/m.test(value)) return "Python";
  if (/\b(export|const|let|function|async|await|module\.exports|=>)\b/.test(value)) return "JavaScript";
  if (/[.#][A-Za-z0-9_-]+\s*\{/.test(value)) return "CSS";
  if (/^---[\s\S]*---/.test(value) || /^#\s+/m.test(value)) return "Markdown";
  if (/^\s*[A-Za-z0-9_-]+:\s*/m.test(value)) return "YAML";
  return fallback;
}

export function inferSmartSaveTitle(code, language = "Text", userTitle = "") {
  if (normalizeText(userTitle)) return normalizeText(userTitle);

  const patterns = [
    /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
    /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/,
    /\bdef\s+([A-Za-z_][\w]*)\s*\(/,
    /\bclass\s+([A-Za-z_][\w]*)/,
    /\bexport\s+default\s+function\s+([A-Za-z_$][\w$]*)/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) return `${kebab(match[1])}.${extensionForLanguage(language)}`;
  }

  const route = code.match(/\b(?:router|app)\.(get|post|put|patch|delete)\(["']([^"']+)/);
  if (route) return `${route[1]}-${kebab(route[2])}.${extensionForLanguage(language)}`;
  return `smart-save-${extensionForLanguage(language)}`;
}

export function extractSmartSaveDependencies(code) {
  const dependencies = new Set();
  const patterns = [
    /import\s+(?:[^'"]+\s+from\s+)?["']([^"']+)["']/g,
    /require\(["']([^"']+)["']\)/g,
    /from\s+([A-Za-z0-9_.]+)\s+import/g,
    /import\s+([A-Za-z0-9_.]+)/g,
  ];

  patterns.forEach((pattern) => {
    for (const match of code.matchAll(pattern)) {
      const item = match[1];
      if (!item || item.startsWith(".")) continue;
      dependencies.add(item.split("/")[0]);
    }
  });

  return [...dependencies].sort().slice(0, 20);
}

export function detectSmartSaveFramework(code, dependencies = []) {
  const text = `${code} ${dependencies.join(" ")}`.toLowerCase();
  if (/fastapi|apirouter/.test(text)) return "FastAPI";
  if (/react|usestate|useeffect|jsx|classname=/.test(text)) return "React";
  if (/express|router\.get|app\.get/.test(text)) return "Express";
  if (/@playwright\/test|page\.goto|expect\(/.test(text)) return "Playwright";
  if (/sqlalchemy|sessionmaker|create_engine/.test(text)) return "SQLAlchemy";
  if (/pandas|dataframe/.test(text)) return "Pandas";
  if (/tailwind/.test(text)) return "Tailwind";
  return "None";
}

function suggestTags({ code, language, framework, dependencies }) {
  const text = `${language} ${framework} ${dependencies.join(" ")} ${code}`.toLowerCase();
  const tags = [];
  const add = (tag, condition = true) => {
    if (condition && !tags.includes(tag)) tags.push(tag);
  };

  add(language.toLowerCase(), language !== "Text");
  add(framework.toLowerCase(), framework !== "None");
  add("frontend", framework === "React" || framework === "Tailwind" || /component|className/.test(text));
  add("backend", framework === "FastAPI" || framework === "Express" || /middleware/.test(text));
  add("api", /fetch|axios|router|endpoint|request|response/.test(text));
  add("auth", /auth|token|jwt|session|permission/.test(text));
  add("database", /sql|database|query|engine|sessionmaker/.test(text));
  add("testing", /test|expect|pytest|playwright/.test(text));
  add("ml", /model|predict|pandas|sklearn|feature/.test(text));
  add("safety", /try|catch|except|fallback|guard/.test(text));
  add("utility", /helper|util|format|parse|map|reduce/.test(text));
  add("config", /env|settings|config/.test(text));
  return tags.slice(0, 8);
}

function suggestCollection({ language, framework, tags, collections }) {
  const preferred = [
    [framework === "React", "Frontend"],
    [framework === "FastAPI" || framework === "Express" || tags.includes("backend"), "Backend"],
    [language === "SQL" || tags.includes("database") || tags.includes("ml"), "Data"],
    [tags.includes("testing"), "Testing"],
    [tags.includes("utility"), "Utilities"],
    [tags.includes("config"), "Configuration"],
  ].find(([condition]) => condition)?.[1] ?? DEFAULT_COLLECTION;

  return collections.find((item) => item.toLowerCase() === preferred.toLowerCase()) ?? preferred;
}

export function detectSecretWarnings(code) {
  return secretPatterns
    .filter(([pattern]) => pattern.test(code))
    .map(([, label]) => label);
}

export function detectDuplicateCandidates(code, artifacts = [], title = "") {
  const normalizedCode = normalizeCode(code);
  const tokens = codeTokens(code);
  const normalizedCandidateTitle = normalizeTitle(title);

  return artifacts
    .map((artifact) => {
      const artifactCode = artifact.code ?? "";
      const artifactTitle = artifact.title ?? "Untitled snippet";

      if (artifactCode && normalizeCode(artifactCode) === normalizedCode) {
        return {
          id: artifact.id,
          title: artifactTitle,
          matchType: "exact",
          score: 1,
          reason: "Code matches an existing snippet after whitespace/comment normalization.",
        };
      }

      if (normalizedCandidateTitle && normalizeTitle(artifactTitle) === normalizedCandidateTitle) {
        return {
          id: artifact.id,
          title: artifactTitle,
          matchType: "near-title",
          score: 0.9,
          reason: "Suggested title is already present in the archive.",
        };
      }

      const overlap = jaccard(tokens, codeTokens(artifactCode));
      if (overlap >= 0.82) {
        return {
          id: artifact.id,
          title: artifactTitle,
          matchType: "near-code",
          score: Number(overlap.toFixed(2)),
          reason: "Code tokens are highly similar to an existing snippet.",
        };
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function relatedSnippetIds({ tags, language, collection, artifacts }) {
  const tagSet = new Set(tags);
  return artifacts
    .map((artifact) => {
      let score = artifact.tags?.filter((tag) => tagSet.has(tag)).length * 4 || 0;
      if (artifact.language === language) score += 2;
      if (artifact.collection === collection) score += 2;
      return { id: artifact.id, score };
    })
    .filter((item) => item.id && item.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.id);
}

export function deterministicSmartSave({ code, artifacts = [], currentCollections = [], userProvidedTitle = "", userProvidedLanguage = "" }) {
  const language = detectSmartSaveLanguage(code, userProvidedLanguage || "Text");
  const title = inferSmartSaveTitle(code, language, userProvidedTitle);
  const dependencies = extractSmartSaveDependencies(code);
  const framework = detectSmartSaveFramework(code, dependencies);
  const tags = suggestTags({ code, language, framework, dependencies });
  const collection = suggestCollection({ language, framework, tags, collections: currentCollections });
  const duplicateCandidates = detectDuplicateCandidates(code, artifacts, title);
  const warnings = detectSecretWarnings(code);
  const riskNotes = [
    warnings.length ? "Review possible secrets before saving or sharing this snippet." : null,
    /eval\(|new Function/.test(code) ? "Dynamic code execution detected. Reuse only in trusted contexts." : null,
  ].filter(Boolean);

  const suggestion = {
    title,
    language,
    tags,
    collection,
    description: `Reusable ${framework !== "None" ? framework : language} snippet with ${code.split("\n").length || 1} lines.`,
    useCase: "Save, search, and reuse this snippet from the CodeArch library.",
    framework,
    dependencies,
    confidence: duplicateCandidates.length ? 0.64 : 0.72,
    warnings,
    riskNotes,
    relatedSnippetIds: relatedSnippetIds({ tags, language, collection, artifacts }),
    duplicateCandidates,
  };

  return {
    suggestion,
    duplicateCandidates,
    fallbackUsed: true,
    provider: "browser-deterministic-fallback",
    validationStatus: "fallback",
    warnings: [
      ...warnings,
      ...riskNotes,
      ...(duplicateCandidates.length ? ["Possible duplicate detected. Review before saving."] : []),
    ],
  };
}

function toBackendSnippet(artifact) {
  return {
    id: artifact.id,
    title: artifact.title,
    language: artifact.language,
    tags: artifact.tags ?? [],
    collection: artifact.collection,
    description: artifact.summary,
    summary: artifact.summary,
    code: artifact.code,
  };
}

export async function analyzeSmartSave(input) {
  const fallback = deterministicSmartSave(input);

  if (!SMART_SAVE_API_URL) {
    return {
      ...fallback,
      warnings: ["Smart Save AI sidecar is not configured; browser fallback was used.", ...fallback.warnings],
    };
  }

  try {
    const response = await fetch(`${SMART_SAVE_API_URL}/api/smart-save/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: input.code,
        existingSnippets: input.artifacts.map(toBackendSnippet),
        userProvidedTitle: input.userProvidedTitle || null,
        userProvidedLanguage: input.userProvidedLanguage || null,
        currentCollections: input.currentCollections ?? [],
        preferences: input.preferences ?? {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Smart Save API returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      ...fallback,
      warnings: [
        "Smart Save sidecar is unavailable; browser fallback was used.",
        error instanceof Error ? error.message : "Unknown sidecar error",
        ...fallback.warnings,
      ],
    };
  }
}

export function smartSuggestionToDraft(suggestion, code) {
  return {
    title: suggestion.title,
    language: suggestion.language,
    collection: suggestion.collection,
    tags: suggestion.tags,
    summary: suggestion.description,
    source: "Smart Save Autopilot",
    notes: [
      suggestion.useCase ? `Use case: ${suggestion.useCase}` : null,
      suggestion.framework && suggestion.framework !== "None" ? `Framework: ${suggestion.framework}` : null,
      suggestion.dependencies?.length ? `Dependencies: ${suggestion.dependencies.join(", ")}` : null,
      suggestion.riskNotes?.length ? `Risk notes: ${suggestion.riskNotes.join(" ")}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    code,
  };
}

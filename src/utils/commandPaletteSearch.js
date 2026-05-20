const SEARCH_FIELDS = [
  { key: "title", label: "title", weight: 140 },
  { key: "language", label: "language", weight: 90 },
  { key: "collection", label: "collection", weight: 85 },
  { key: "tags", label: "tags", weight: 95 },
  { key: "summary", label: "summary", weight: 60 },
  { key: "source", label: "source", weight: 50 },
  { key: "code", label: "code", weight: 24 },
];

const ACTIONS = [
  {
    id: "open",
    label: "Open",
    keywords: ["open", "view", "inspect", "select", "preview"],
    shortcut: "Enter",
    description: "Open the script inspector.",
  },
  {
    id: "copy",
    label: "Copy",
    keywords: ["copy", "clipboard", "paste", "duplicate"],
    shortcut: "Tab, Enter",
    description: "Copy the code to the clipboard.",
  },
  {
    id: "edit",
    label: "Edit",
    keywords: ["edit", "modify", "change", "update"],
    shortcut: "Tab, Enter",
    description: "Open the script editor.",
  },
  {
    id: "workbench",
    label: "Workbench",
    keywords: ["workbench", "run", "reuse", "load", "draft"],
    shortcut: "Tab, Enter",
    description: "Load the script into the workbench.",
  },
  {
    id: "pin",
    label: "Pin",
    activeLabel: "Unpin",
    keywords: ["pin", "unpin", "pinned", "favorite", "quick"],
    shortcut: "Tab, Enter",
    description: "Pin or unpin the script.",
  },
  {
    id: "filter-collection",
    label: "Collection",
    keywords: ["collection", "filter", "group", "folder"],
    shortcut: "Tab, Enter",
    description: "Filter the library to this collection.",
  },
  {
    id: "show-related",
    label: "Related",
    keywords: ["related", "similar", "graph", "links"],
    shortcut: "Tab, Enter",
    description: "Show related scripts in the inspector.",
  },
];

function normalizeText(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).join(" ");
  }

  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTokens(value) {
  const seen = new Set();
  const tokens = normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.filter((token) => {
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

function getArtifactFieldValue(artifact, fieldKey) {
  if (fieldKey === "tags") return artifact.tags ?? [];
  return artifact[fieldKey];
}

function scoreTextMatch(text, token, weight) {
  if (!text || !token) return 0;
  if (text === token) return weight + 80;
  if (text.startsWith(token)) return weight + 48;
  if (text.includes(` ${token}`)) return weight + 32;
  if (text.includes(token)) return weight;
  return 0;
}

function scoreActionMatches(tokens) {
  let bestAction = ACTIONS[0];
  let bestScore = 0;
  const matchedTokens = new Set();

  for (const action of ACTIONS) {
    const actionText = normalizeText([
      action.label,
      action.activeLabel,
      action.description,
      ...action.keywords,
    ]);
    let actionScore = 0;
    const actionMatchedTokens = new Set();

    for (const token of tokens) {
      const tokenScore = scoreTextMatch(actionText, token, 42);
      if (!tokenScore) continue;

      actionScore += tokenScore;
      actionMatchedTokens.add(token);
    }

    if (actionScore > bestScore) {
      bestAction = action;
      bestScore = actionScore;
    }

    for (const token of actionMatchedTokens) {
      matchedTokens.add(token);
    }
  }

  return {
    action: bestAction,
    matchedTokens,
    score: bestScore,
  };
}

function getDefaultScore(artifact) {
  const pinnedScore = artifact.pinned ? 90 : 0;
  const favoriteScore = artifact.favorite ? 55 : 0;
  const usageScore = Math.min(Number(artifact.usageCount) || 0, 75);
  const updatedAt = new Date(artifact.updatedAt ?? 0).getTime();
  const recencyScore = Number.isFinite(updatedAt) ? updatedAt / 1000000000000 : 0;

  return pinnedScore + favoriteScore + usageScore + recencyScore;
}

function compareRankedResults(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (Boolean(b.artifact.pinned) !== Boolean(a.artifact.pinned)) {
    return Number(Boolean(b.artifact.pinned)) - Number(Boolean(a.artifact.pinned));
  }
  if (Boolean(b.artifact.favorite) !== Boolean(a.artifact.favorite)) {
    return Number(Boolean(b.artifact.favorite)) - Number(Boolean(a.artifact.favorite));
  }
  if ((b.artifact.usageCount ?? 0) !== (a.artifact.usageCount ?? 0)) {
    return (b.artifact.usageCount ?? 0) - (a.artifact.usageCount ?? 0);
  }

  const aUpdated = new Date(a.artifact.updatedAt ?? 0).getTime();
  const bUpdated = new Date(b.artifact.updatedAt ?? 0).getTime();
  if (aUpdated !== bUpdated) return bUpdated - aUpdated;

  if (a.originalIndex !== b.originalIndex) return a.originalIndex - b.originalIndex;
  return a.artifact.title.localeCompare(b.artifact.title);
}

function summarizeMatch(matchedFields, action, actionScore) {
  const fieldSummary = matchedFields.length
    ? `Matched ${matchedFields.slice(0, 3).join(", ")}`
    : "Top script by usage and recency";

  if (!actionScore || action.id === "open") return fieldSummary;
  return `${fieldSummary}; suggested action: ${action.label}`;
}

export function createCommandSearchIndex(artifacts = []) {
  return artifacts.map((artifact, originalIndex) => ({
    artifact,
    originalIndex,
    fields: SEARCH_FIELDS.map((field) => ({
      ...field,
      text: normalizeText(getArtifactFieldValue(artifact, field.key)),
    })),
  }));
}

export function getCommandActions(artifact) {
  return ACTIONS.map((action) => ({
    ...action,
    label: action.id === "pin" && artifact?.pinned ? action.activeLabel : action.label,
  }));
}

export function searchCommandPalette(searchIndex, query, limit = 8) {
  const tokens = uniqueTokens(query);

  if (!tokens.length) {
    return [...searchIndex]
      .map((entry) => ({
        artifact: entry.artifact,
        originalIndex: entry.originalIndex,
        matchedFields: [],
        matchSummary: "Top script by usage and recency",
        score: getDefaultScore(entry.artifact),
        suggestedActionId: "open",
      }))
      .sort(compareRankedResults)
      .slice(0, limit);
  }

  const actionMatch = scoreActionMatches(tokens);
  const results = [];

  for (const entry of searchIndex) {
    let fieldScore = 0;
    const matchedFields = new Set();
    const matchedTokens = new Set(actionMatch.matchedTokens);

    for (const token of tokens) {
      for (const field of entry.fields) {
        const tokenScore = scoreTextMatch(field.text, token, field.weight);
        if (!tokenScore) continue;

        fieldScore += tokenScore;
        matchedFields.add(field.label);
        matchedTokens.add(token);
      }
    }

    if (matchedTokens.size !== tokens.length) continue;

    const suggestedAction = actionMatch.score ? actionMatch.action : ACTIONS[0];
    const defaultScore = getDefaultScore(entry.artifact) * 0.08;

    results.push({
      artifact: entry.artifact,
      originalIndex: entry.originalIndex,
      matchedFields: [...matchedFields],
      matchSummary: summarizeMatch([...matchedFields], suggestedAction, actionMatch.score),
      score: fieldScore + actionMatch.score + defaultScore,
      suggestedActionId: suggestedAction.id,
    });
  }

  return results.sort(compareRankedResults).slice(0, limit);
}

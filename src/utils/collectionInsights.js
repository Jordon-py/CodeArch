export const ALL_COLLECTIONS = "all";
export const DEFAULT_COLLECTION = "Inbox";

const QUICK_VIEW_MATCHERS = {
  all: () => true,
  pinned: (artifact) => Boolean(artifact.pinned),
  favorites: (artifact) => Boolean(artifact.favorite),
  needsContext: (artifact) => getArtifactHealthScore(artifact) < 70,
};

function asText(value) {
  return String(value ?? "").trim();
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 70;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getTimestamp(value) {
  const timestamp = new Date(value ?? 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function incrementCount(map, key) {
  const label = asText(key);
  if (!label) return;
  map.set(label, (map.get(label) ?? 0) + 1);
}

function countEntries(map, limit = 4) {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function getRecentArtifacts(artifacts, limit = 3) {
  return [...artifacts]
    .sort((a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt))
    .slice(0, limit);
}

export function normalizeCollectionName(value) {
  return asText(value) || DEFAULT_COLLECTION;
}

export function truncateLabel(value, maxLength = 36) {
  const label = asText(value);
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function getArtifactHealthScore(artifact) {
  return clampScore(artifact?.health?.score);
}

export function getHealthLabel(score) {
  if (score >= 85) return "Ready";
  if (score >= 65) return "Useful";
  return "Needs context";
}

export function matchesQuickView(artifact, quickView = "all") {
  const matcher = QUICK_VIEW_MATCHERS[quickView] ?? QUICK_VIEW_MATCHERS.all;
  return matcher(artifact);
}

export function buildCollectionInsights(artifacts = []) {
  const grouped = new Map();

  for (const artifact of artifacts) {
    const collectionName = normalizeCollectionName(artifact.collection);

    if (!grouped.has(collectionName)) {
      grouped.set(collectionName, {
        name: collectionName,
        artifacts: [],
        count: 0,
        favoriteCount: 0,
        pinnedCount: 0,
        needsContextCount: 0,
        readyCount: 0,
        totalHealth: 0,
        totalUsage: 0,
        latestTimestamp: 0,
        languageCounts: new Map(),
        tagCounts: new Map(),
      });
    }

    const summary = grouped.get(collectionName);
    const healthScore = getArtifactHealthScore(artifact);

    summary.artifacts.push(artifact);
    summary.count += 1;
    summary.favoriteCount += artifact.favorite ? 1 : 0;
    summary.pinnedCount += artifact.pinned ? 1 : 0;
    summary.needsContextCount += healthScore < 70 ? 1 : 0;
    summary.readyCount += healthScore >= 85 ? 1 : 0;
    summary.totalHealth += healthScore;
    summary.totalUsage += Number(artifact.usageCount) || 0;
    summary.latestTimestamp = Math.max(summary.latestTimestamp, getTimestamp(artifact.updatedAt));
    incrementCount(summary.languageCounts, artifact.language);
    (artifact.tags ?? []).forEach((tag) => incrementCount(summary.tagCounts, tag));
  }

  return [...grouped.values()]
    .map((summary) => {
      const healthAverage = summary.count
        ? Math.round(summary.totalHealth / summary.count)
        : 0;
      const topLanguages = countEntries(summary.languageCounts, 3);
      const topTags = countEntries(summary.tagCounts, 5);
      const priorityScore =
        healthAverage +
        summary.pinnedCount * 6 +
        summary.favoriteCount * 4 +
        Math.min(summary.totalUsage, 120) / 6 -
        summary.needsContextCount * 4;

      return {
        name: summary.name,
        count: summary.count,
        favoriteCount: summary.favoriteCount,
        pinnedCount: summary.pinnedCount,
        needsContextCount: summary.needsContextCount,
        readyCount: summary.readyCount,
        healthAverage,
        healthLabel: getHealthLabel(healthAverage),
        totalUsage: summary.totalUsage,
        latestTimestamp: summary.latestTimestamp,
        topLanguages,
        topTags,
        recentArtifacts: getRecentArtifacts(summary.artifacts),
        artifacts: summary.artifacts,
        priorityScore,
      };
    })
    .sort(
      (a, b) =>
        b.pinnedCount - a.pinnedCount ||
        b.favoriteCount - a.favoriteCount ||
        b.priorityScore - a.priorityScore ||
        b.latestTimestamp - a.latestTimestamp ||
        a.name.localeCompare(b.name),
    );
}

export function summarizeCollectionBoard(
  artifacts = [],
  collectionInsights = buildCollectionInsights(artifacts),
) {
  const totalHealth = artifacts.reduce(
    (sum, artifact) => sum + getArtifactHealthScore(artifact),
    0,
  );
  const inboxCount = artifacts.filter((artifact) => {
    const collectionName = normalizeCollectionName(artifact.collection).toLowerCase();
    return collectionName === "inbox" || collectionName === "unfiled";
  }).length;
  const needsContextCount = artifacts.filter((artifact) =>
    matchesQuickView(artifact, "needsContext"),
  ).length;

  return {
    totalArtifacts: artifacts.length,
    collectionCount: collectionInsights.length,
    organizedCount: Math.max(0, artifacts.length - inboxCount),
    inboxCount,
    favoriteCount: artifacts.filter((artifact) => artifact.favorite).length,
    pinnedCount: artifacts.filter((artifact) => artifact.pinned).length,
    needsContextCount,
    healthAverage: artifacts.length ? Math.round(totalHealth / artifacts.length) : 0,
    strongestCollection: collectionInsights[0] ?? null,
  };
}

export function filterCollectionsByQuickView(collections, quickView = "all") {
  if (quickView === "all") return collections;

  return collections.filter((collection) =>
    collection.artifacts.some((artifact) => matchesQuickView(artifact, quickView)),
  );
}

export function filterArtifactsByQuickView(artifacts, quickView = "all") {
  return artifacts.filter((artifact) => matchesQuickView(artifact, quickView));
}

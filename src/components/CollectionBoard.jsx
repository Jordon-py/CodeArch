import { useId, useMemo, useState } from "react";
import {
  ALL_COLLECTIONS,
  buildCollectionInsights,
  filterArtifactsByQuickView,
  filterCollectionsByQuickView,
  summarizeCollectionBoard,
  truncateLabel,
} from "../utils/collectionInsights.js";

const QUICK_FILTERS = [
  { id: "all", label: "All", sortBy: "updated" },
  { id: "pinned", label: "Pinned", sortBy: "pinned" },
  { id: "favorites", label: "Favorites", sortBy: "favorites" },
  { id: "needsContext", label: "Needs context" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value) {
  const timestamp = new Date(value ?? 0);
  if (Number.isNaN(timestamp.getTime())) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

function getQuickFilterCount(summary, quickFilterId) {
  if (quickFilterId === "all") return summary.totalArtifacts;
  if (quickFilterId === "pinned") return summary.pinnedCount;
  if (quickFilterId === "favorites") return summary.favoriteCount;
  if (quickFilterId === "needsContext") return summary.needsContextCount;
  return 0;
}

function getArtifactTitle(artifact) {
  return artifact.title || "Untitled script";
}

function isKnownQuickView(value) {
  return QUICK_FILTERS.some((filter) => filter.id === value);
}

function getRecentPreview(artifacts, limit = 3) {
  return [...artifacts]
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
    .slice(0, limit);
}

export function CollectionBoard({
  artifacts = [],
  activeCollection = ALL_COLLECTIONS,
  selectedId = null,
  quickView,
  maxCollections = 8,
  title = "Collection Board",
  className = "",
  onSelectArtifact,
  onFilterCollection,
  onFilterTag,
  onSortBy,
  onQuickViewChange,
  onUpdateArtifact,
}) {
  const titleId = useId();
  const [localQuickView, setLocalQuickView] = useState("all");
  const isControlledQuickView = quickView !== undefined;
  const requestedQuickView = isControlledQuickView ? quickView : localQuickView;
  const activeQuickView = isKnownQuickView(requestedQuickView) ? requestedQuickView : "all";
  const insights = useMemo(() => buildCollectionInsights(artifacts), [artifacts]);
  const boardSummary = useMemo(
    () => summarizeCollectionBoard(artifacts, insights),
    [artifacts, insights],
  );
  const selectedArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedId) ?? null,
    [artifacts, selectedId],
  );
  const filteredInsights = useMemo(
    () => filterCollectionsByQuickView(insights, activeQuickView),
    [activeQuickView, insights],
  );
  const visibleLimit = Number.isFinite(Number(maxCollections)) ? Number(maxCollections) : 8;
  const visibleInsights =
    visibleLimit > 0 ? filteredInsights.slice(0, visibleLimit) : filteredInsights;
  const hiddenCollectionCount = Math.max(0, filteredInsights.length - visibleInsights.length);

  function applyQuickView(nextQuickView) {
    if (!isControlledQuickView) {
      setLocalQuickView(nextQuickView);
    }

    onQuickViewChange?.(nextQuickView);

    const quickFilter = QUICK_FILTERS.find((item) => item.id === nextQuickView);
    if (quickFilter?.sortBy) {
      onSortBy?.(quickFilter.sortBy);
    }
  }

  function openCollection(collectionName) {
    onFilterCollection?.(collectionName);
  }

  function clearCollectionFilter() {
    onFilterCollection?.(ALL_COLLECTIONS);
  }

  function filterByTag(tag) {
    onFilterTag?.(tag);
  }

  function selectArtifact(artifact) {
    onSelectArtifact?.(artifact.id);
  }

  function moveSelectedTo(collectionName) {
    if (!selectedArtifact || !onUpdateArtifact) return;

    onUpdateArtifact(
      selectedArtifact.id,
      { collection: collectionName },
      `Moved to ${truncateLabel(collectionName, 48)}.`,
    );
  }

  function togglePinned(artifact) {
    onUpdateArtifact?.(
      artifact.id,
      { pinned: !artifact.pinned },
      artifact.pinned ? "Script unpinned." : "Script pinned.",
    );
  }

  function toggleFavorite(artifact) {
    onUpdateArtifact?.(
      artifact.id,
      { favorite: !artifact.favorite },
      artifact.favorite ? "Removed from favorites." : "Added to favorites.",
    );
  }

  if (!boardSummary.totalArtifacts) {
    return (
      <section
        className={cx("panel collection-board", className)}
        aria-labelledby={titleId}
        data-testid="collection-board"
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Library Organization</p>
            <h2 id={titleId}>{title}</h2>
          </div>
        </div>
        <div className="empty-state" data-testid="collection-board-empty">
          <strong>No collections yet.</strong>
          <p>Saved scripts will appear here after the archive has artifact data.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cx("panel collection-board", className)}
      aria-labelledby={titleId}
      data-testid="collection-board"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Library Organization</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          className="panel-link"
          type="button"
          onClick={clearCollectionFilter}
          disabled={!onFilterCollection || activeCollection === ALL_COLLECTIONS}
        >
          All collections
        </button>
      </div>

      <div className="metric-grid collection-board__summary" aria-label="Collection summary">
        <div className="metric">
          <span>Collections</span>
          <strong>{boardSummary.collectionCount}</strong>
          <small>{boardSummary.organizedCount} organized scripts</small>
        </div>
        <div className="metric">
          <span>Pinned</span>
          <strong>{boardSummary.pinnedCount}</strong>
          <small>{boardSummary.favoriteCount} favorites</small>
        </div>
        <div className="metric">
          <span>Health</span>
          <strong>{boardSummary.healthAverage}%</strong>
          <span className="metric-progress" style={{ "--progress": `${boardSummary.healthAverage}%` }} />
          <small>{boardSummary.needsContextCount} need context</small>
        </div>
        <div className="metric">
          <span>Top Collection</span>
          <strong title={boardSummary.strongestCollection?.name}>
            {truncateLabel(boardSummary.strongestCollection?.name ?? "None", 20)}
          </strong>
          <small>{boardSummary.strongestCollection?.count ?? 0} scripts</small>
        </div>
      </div>

      <div className="collection-board__filters" role="toolbar" aria-label="Collection quick filters">
        {QUICK_FILTERS.map((filter) => {
          const count = getQuickFilterCount(boardSummary, filter.id);
          const isActive = activeQuickView === filter.id;

          return (
            <button
              className={cx("state-toggle", isActive && "state-toggle--active")}
              type="button"
              key={filter.id}
              aria-pressed={isActive}
              onClick={() => applyQuickView(filter.id)}
              disabled={filter.id !== "all" && count === 0}
            >
              {filter.label}
              <span className="panel-chip">{count}</span>
            </button>
          );
        })}
      </div>

      {visibleInsights.length ? (
        <div className="collection-board__grid">
          {visibleInsights.map((collection) => {
            const isActiveCollection = activeCollection === collection.name;
            const visibleArtifacts = filterArtifactsByQuickView(collection.artifacts, activeQuickView);
            const previewArtifacts = getRecentPreview(
              visibleArtifacts.length ? visibleArtifacts : collection.artifacts,
            );
            const canMoveSelected =
              Boolean(selectedArtifact) &&
              selectedArtifact.collection !== collection.name &&
              Boolean(onUpdateArtifact);

            return (
              <article
                className={cx(
                  "collection-card",
                  isActiveCollection && "collection-card--active",
                  collection.needsContextCount > 0 && "collection-card--review",
                )}
                key={collection.name}
              >
                <div className="collection-card__header">
                  <button
                    className="collection-card__title"
                    type="button"
                    onClick={() => openCollection(collection.name)}
                    aria-current={isActiveCollection ? "true" : undefined}
                    title={collection.name}
                  >
                    <strong>{truncateLabel(collection.name, 34)}</strong>
                    <small>
                      {collection.count} script{collection.count === 1 ? "" : "s"} updated{" "}
                      {formatDate(collection.latestTimestamp)}
                    </small>
                  </button>
                  <span
                    className={`health-pill health-pill--${collection.healthLabel
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {collection.healthLabel} / {collection.healthAverage}%
                  </span>
                </div>

                <div className="collection-card__signals" aria-label={`${collection.name} signals`}>
                  {collection.pinnedCount ? (
                    <span className="status-badge">{collection.pinnedCount} pinned</span>
                  ) : null}
                  {collection.favoriteCount ? (
                    <span className="status-badge status-badge--favorite">
                      {collection.favoriteCount} favorite{collection.favoriteCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {collection.needsContextCount ? (
                    <span className="status-badge status-badge--warning">
                      {collection.needsContextCount} review
                    </span>
                  ) : null}
                </div>

                <dl className="collection-card__facts">
                  <div>
                    <dt>Languages</dt>
                    <dd>
                      {collection.topLanguages.map((item) => item.label).join(", ") || "None"}
                    </dd>
                  </div>
                  <div>
                    <dt>Reuse</dt>
                    <dd>{collection.totalUsage} opens/copies</dd>
                  </div>
                </dl>

                {collection.topTags.length ? (
                  <div className="tag-cloud" aria-label={`${collection.name} top tags`}>
                    {collection.topTags.map((tag) => (
                      <button
                        className="tag"
                        type="button"
                        key={tag.label}
                        onClick={() => filterByTag(tag.label)}
                        disabled={!onFilterTag}
                        title={tag.label}
                      >
                        {truncateLabel(tag.label, 18)}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="collection-card__artifacts">
                  {previewArtifacts.map((artifact) => {
                    const titleLabel = getArtifactTitle(artifact);
                    return (
                      <div
                        className={cx(
                          "related-script",
                          artifact.id === selectedId && "related-script--active",
                        )}
                        key={artifact.id}
                      >
                        <button
                          className="related-script__main"
                          type="button"
                          onClick={() => selectArtifact(artifact)}
                          title={titleLabel}
                        >
                          <span>
                            <strong>{truncateLabel(titleLabel, 30)}</strong>
                            <small>
                              {artifact.language || "Text"} / {artifact.health?.label ?? "Useful"}
                            </small>
                          </span>
                          <span>{artifact.usageCount ?? 0}</span>
                        </button>
                        {onUpdateArtifact ? (
                          <span className="script-state-actions" aria-label={`${titleLabel} priority controls`}>
                            <button
                              className={cx("state-toggle", artifact.pinned && "state-toggle--active")}
                              type="button"
                              aria-label={artifact.pinned ? "Unpin script" : "Pin script"}
                              aria-pressed={Boolean(artifact.pinned)}
                              onClick={() => togglePinned(artifact)}
                            >
                              Pin
                            </button>
                            <button
                              className={cx("state-toggle", artifact.favorite && "state-toggle--active")}
                              type="button"
                              aria-label={
                                artifact.favorite ? "Remove from favorites" : "Add to favorites"
                              }
                              aria-pressed={Boolean(artifact.favorite)}
                              onClick={() => toggleFavorite(artifact)}
                            >
                              Fav
                            </button>
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="inspector-actions">
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => openCollection(collection.name)}
                    disabled={!onFilterCollection}
                  >
                    Open collection
                  </button>
                  {canMoveSelected ? (
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => moveSelectedTo(collection.name)}
                    >
                      Move selected here
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" data-testid="collection-board-filter-empty">
          <strong>No collections match this view.</strong>
          <p>Switch filters to review the rest of the archive.</p>
          <button className="button button--secondary" type="button" onClick={() => applyQuickView("all")}>
            Show all collections
          </button>
        </div>
      )}

      {hiddenCollectionCount ? (
        <p className="collection-board__overflow">
          {hiddenCollectionCount} more collection{hiddenCollectionCount === 1 ? "" : "s"} hidden by the display limit.
        </p>
      ) : null}
    </section>
  );
}

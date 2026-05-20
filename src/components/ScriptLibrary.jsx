import { useState } from "react";

function getPreview(code) {
  return code.split("\n").length;
}

function formatDate(value) {
  if (!value) return "Unknown";

  const updatedAt = new Date(value);
  const today = new Date();
  const sameDay = updatedAt.toDateString() === today.toDateString();

  if (sameDay) return "Updated today";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(updatedAt);
}

export function ScriptLibrary({
  artifacts,
  selectedId,
  onSelect,
  query,
  setQuery,
  language,
  setLanguage,
  languages,
  tag,
  setTag,
  tags,
  collection,
  setCollection,
  collections,
  sortBy,
  setSortBy,
}) {
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  function toggleExpanded(id) {
    setExpandedRows((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  return (
    <section className="panel library-panel" id="library" aria-labelledby="library-title">
      <div className="library-toolbar">
        <div>
          <h2 id="library-title">Snippet Library</h2>
        </div>
        <label className="field field--inline">
          <span>Search scripts</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search scripts"
            aria-label="Search saved scripts"
            data-testid="artifact-search"
          />
        </label>
        <label className="field field--compact">
          <span>Language</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label="Filter scripts by language"
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All Languages" : item}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--compact">
          <span>Tag</span>
          <select
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            aria-label="Filter scripts by tag"
          >
            {tags.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All Tags" : item}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--compact">
          <span>Collection</span>
          <select
            value={collection}
            onChange={(event) => setCollection(event.target.value)}
            aria-label="Filter scripts by collection"
          >
            {collections.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All Collections" : item}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--compact">
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Sort scripts"
          >
            <option value="updated">Sort: Updated</option>
            <option value="pinned">View: Pinned</option>
            <option value="favorites">View: Favorites</option>
            <option value="usage">Sort: Reuse</option>
            <option value="title">Sort: Title</option>
            <option value="language">Sort: Language</option>
            <option value="size">Sort: Size</option>
          </select>
        </label>
      </div>

      {artifacts.length ? (
        <div className="artifact-table" data-testid="artifact-list">
          <div className="artifact-table__head" aria-hidden="true">
            <span>Name</span>
            <span>Language</span>
            <span>Health</span>
            <span />
          </div>
          {artifacts.map((artifact) => {
            const isExpanded = expandedRows.has(artifact.id);
            const detailsId = `snippet-details-${artifact.id}`;

            return (
              <article
                className={`artifact-table__row snippet-card ${
                  artifact.id === selectedId ? "artifact-row--active" : ""
                }`}
                key={artifact.id}
                data-testid="artifact-row"
              >
                <div className="snippet-card__primary">
                  <span className="artifact-name">
                    <span className="language-dot" aria-hidden="true" />
                    <span className="artifact-title-stack">
                      <strong>{artifact.title}</strong>
                      {(artifact.pinned || artifact.favorite) && (
                        <span className="artifact-badges">
                          {artifact.pinned && <span className="status-badge">Pinned</span>}
                          {artifact.favorite && (
                            <span className="status-badge status-badge--favorite">
                              Favorite
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </span>
                  <p className="snippet-card__summary">{artifact.summary}</p>
                </div>

                <div className="snippet-card__meta" aria-label={`${artifact.title} key details`}>
                  <span className="snippet-card__detail">{artifact.language}</span>
                  <span>
                    <span className={`health-pill health-pill--${artifact.health?.label?.toLowerCase().replace(/\s+/g, "-") ?? "useful"}`}>
                      {artifact.health?.label ?? "Useful"}
                    </span>
                  </span>
                </div>

                <div className="snippet-card__actions">
                  <button
                    className="button button--secondary table-action"
                    type="button"
                    aria-label={`Open ${artifact.title}`}
                    onClick={() => onSelect(artifact.id)}
                  >
                    Open
                  </button>
                  <button
                    className="button button--ghost snippet-card__toggle"
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={detailsId}
                    onClick={() => toggleExpanded(artifact.id)}
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="snippet-card__details" id={detailsId}>
                    <span>
                      <strong>Collection</strong>
                      {artifact.collection}
                    </span>
                    <span>
                      <strong>Updated</strong>
                      {formatDate(artifact.updatedAt)}
                    </span>
                    <span>
                      <strong>Size</strong>
                      {getPreview(artifact.code)} lines
                    </span>
                    <span>
                      <strong>Tags</strong>
                      <span className="artifact-row__tags">
                        {artifact.tags.slice(0, 4).map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    </span>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" data-testid="artifact-empty-state">
          <strong>No saved scripts match this filter.</strong>
          <p>Clear the search or create a new script to repopulate the command center.</p>
        </div>
      )}
    </section>
  );
}

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
  return (
    <section className="panel library-panel" id="library" aria-labelledby="library-title">
      <div className="library-toolbar">
        <div>
          <h2 id="library-title">Flying Scripts</h2>
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
            <span>Collection</span>
            <span>Tags</span>
            <span>Updated</span>
            <span>Size</span>
            <span />
          </div>
          {artifacts.map((artifact) => (
            <button
              className={`artifact-table__row ${
                artifact.id === selectedId ? "artifact-row--active" : ""
              }`}
              type="button"
              key={artifact.id}
              onClick={() => onSelect(artifact.id)}
              data-testid="artifact-row"
            >
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
              <span>{artifact.language}</span>
              <span>{artifact.collection}</span>
              <span className="artifact-row__tags">
                {artifact.tags.slice(0, 3).map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
              <span className="updated-label">{formatDate(artifact.updatedAt)}</span>
              <span>{getPreview(artifact.code)} lines</span>
              <span className="table-action">Open</span>
            </button>
          ))}
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

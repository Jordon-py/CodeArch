function formatDate(value) {
  if (!value) return "No saved activity";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardMetricsPanel({
  metrics,
  query,
  setQuery,
  language,
  setLanguage,
  languages,
  onQuickOpen,
}) {
  return (
    <section className="panel intelligence-panel" id="intelligence" aria-labelledby="metrics-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Artifact Intelligence</p>
          <h2 id="metrics-title">Vault signal</h2>
        </div>
        <span className="panel-chip">Updated {formatDate(metrics.lastUpdated)}</span>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span>Total saved</span>
          <strong>{metrics.totalScripts}</strong>
        </div>
        <div className="metric">
          <span>Reuse signals</span>
          <strong>{metrics.totalUsage}</strong>
        </div>
      </div>

      <div className="control-stack" role="search">
        <label className="field">
          <span>Search/filter controls</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search scripts, tags, language"
            aria-label="Search saved scripts"
            data-testid="artifact-search"
          />
        </label>

        <label className="field">
          <span>Language</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label="Filter scripts by language"
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All languages" : item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mini-list" aria-label="Most used languages">
        {metrics.mostUsedLanguages.slice(0, 4).map((item) => (
          <div className="mini-list__row" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>

      <div className="tag-cloud" aria-label="Top tags">
        {metrics.topTags.length ? (
          metrics.topTags.map((tag) => (
            <span className="tag" key={tag.label}>
              {tag.label}
            </span>
          ))
        ) : (
          <p className="empty-copy">Tags appear after scripts are saved.</p>
        )}
      </div>

      <div className="recent-stack">
        <h3>Recent scripts</h3>
        {metrics.recentScripts.length ? (
          metrics.recentScripts.map((script) => (
            <button
              className="recent-script"
              type="button"
              key={script.id}
              onClick={() => onQuickOpen(script.id)}
            >
              <span>
                <strong>{script.title}</strong>
                <small>{script.language}</small>
              </span>
              <span>Open</span>
            </button>
          ))
        ) : (
          <p className="empty-copy">Save a script to activate intelligence.</p>
        )}
      </div>
    </section>
  );
}

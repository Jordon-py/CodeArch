function getPreview(code) {
  return code.split("\n").slice(0, 4).join("\n");
}

export function ScriptLibrary({ artifacts, selectedId, onSelect }) {
  return (
    <section className="panel library-panel" id="library" aria-labelledby="library-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Script Library</p>
          <h2 id="library-title">Saved code artifacts</h2>
        </div>
        <span className="panel-chip">{artifacts.length} visible</span>
      </div>

      {artifacts.length ? (
        <div className="artifact-list" data-testid="artifact-list">
          {artifacts.map((artifact) => (
            <button
              className={`artifact-row ${
                artifact.id === selectedId ? "artifact-row--active" : ""
              }`}
              type="button"
              key={artifact.id}
              onClick={() => onSelect(artifact.id)}
              data-testid="artifact-row"
            >
              <span className="artifact-row__meta">
                <strong>{artifact.title}</strong>
                <span>
                  {artifact.language} / {artifact.collection}
                </span>
              </span>
              <code>{getPreview(artifact.code)}</code>
              <span className="artifact-row__tags">
                {artifact.tags.slice(0, 3).map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
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

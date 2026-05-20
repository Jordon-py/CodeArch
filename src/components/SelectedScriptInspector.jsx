import { useState } from "react";

function formatDate(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SelectedScriptInspector({
  artifact,
  collections = [],
  relatedArtifacts = [],
  onMarkOpened,
  onUpdateArtifact,
  onSelectArtifact,
  onEdit,
  onDelete,
  onUseInWorkbench,
}) {
  const [copyState, setCopyState] = useState("idle");
  const [expandedArtifactId, setExpandedArtifactId] = useState(null);

  async function copyCode() {
    if (!artifact) return;

    try {
      await navigator.clipboard.writeText(artifact.code);
      await onMarkOpened(
        {
          usageCount: artifact.usageCount + 1,
          lastCopiedAt: new Date().toISOString(),
        },
        "Code copied.",
      );
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("blocked");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  function deleteArtifact() {
    if (window.confirm("Delete this saved script from CodeArch?")) {
      onDelete();
    }
  }

  if (!artifact) {
    return (
      <section className="panel inspector-panel" id="inspector" aria-labelledby="inspector-title">
        <div className="empty-state">
          <h2 id="inspector-title">Selected Script</h2>
          <p>Select a saved script to inspect code, tags, collection, and reuse signals.</p>
        </div>
      </section>
    );
  }

  const isFavorite = Boolean(artifact.favorite);
  const isPinned = Boolean(artifact.pinned);
  const health = artifact.health ?? { score: 0, label: "Needs context", missing: [] };
  const detailRegionId = `selected-script-details-${artifact.id}`;
  const detailsOpen = expandedArtifactId === artifact.id;

  return (
    <section
      className="panel inspector-panel"
      id="inspector"
      aria-labelledby="inspector-title"
      data-testid="selected-script-inspector"
    >
      <div className="panel-heading">
        <div>
          <h2 id="inspector-title">Selected Script</h2>
        </div>
        <div className="inspector-menu">
          <button className="icon-button" type="button" onClick={onEdit} aria-label="Edit selected script">
            Edit
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Show related scripts"
            disabled={!relatedArtifacts.length}
            onClick={() => relatedArtifacts[0] && onSelectArtifact(relatedArtifacts[0].id)}
          >
            Related
          </button>
        </div>
      </div>

      <div className="selected-title">
        <span className="language-dot language-dot--large" aria-hidden="true" />
        <span className="selected-title__copy">
          <strong>{artifact.title}</strong>
          {(isPinned || isFavorite) && (
            <span className="artifact-badges">
              {isPinned && <span className="status-badge">Pinned</span>}
              {isFavorite && (
                <span className="status-badge status-badge--favorite">Favorite</span>
              )}
            </span>
          )}
        </span>
        <span className="panel-chip">{artifact.language}</span>
      </div>

      <div className="script-state-actions" aria-label="Script priority controls">
        <button
          className={`state-toggle ${isFavorite ? "state-toggle--active" : ""}`}
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
          onClick={() =>
            onMarkOpened(
              { favorite: !isFavorite },
              isFavorite ? "Removed from favorites." : "Added to favorites.",
            )
          }
        >
          {isFavorite ? "Favorited" : "Favorite"}
        </button>
        <button
          className={`state-toggle ${isPinned ? "state-toggle--active" : ""}`}
          type="button"
          aria-label={isPinned ? "Unpin script" : "Pin script"}
          aria-pressed={isPinned}
          onClick={() =>
            onMarkOpened(
              { pinned: !isPinned },
              isPinned ? "Script unpinned." : "Script pinned.",
            )
          }
        >
          {isPinned ? "Pinned" : "Pin"}
        </button>
      </div>

      <div className="inspector-compact-summary">
        <span>
          <strong>{health.label}</strong>
          Archive health
        </span>
        <span>
          <strong>{artifact.code.split("\n").length}</strong>
          Lines
        </span>
      </div>

      <div className="description-block">
        <h3>Description</h3>
        <p className="inspector-summary">{artifact.summary}</p>
      </div>

      <button
        className="button button--secondary inspector-detail-toggle"
        type="button"
        aria-expanded={detailsOpen}
        aria-controls={detailRegionId}
        onClick={() => setExpandedArtifactId((current) => (current === artifact.id ? null : artifact.id))}
      >
        {detailsOpen ? "Show fewer details" : "Show more details"}
      </button>

      {detailsOpen ? (
        <div className="inspector-detail-drawer" id={detailRegionId}>
          <div className="inspector-meta">
            <span>
              <strong>{formatDate(artifact.updatedAt)}</strong>
              Updated
            </span>
            <span>
              <strong>{(artifact.code.length / 1024).toFixed(1)} KB</strong>
              Size
            </span>
            <span>
              <strong>{artifact.collection}</strong>
              Collection
            </span>
          </div>

          <div className="archive-health">
            <div>
              <span>Archive health</span>
              <strong>{health.label} / {health.score}%</strong>
            </div>
            <span className="metric-progress" style={{ "--progress": `${health.score}%` }} />
            {health.missing?.length ? (
              <small>Add {health.missing.join(", ")} to make this snippet easier to reuse.</small>
            ) : (
              <small>This script has enough context for fast retrieval.</small>
            )}
          </div>

          <label className="field inspector-collection-control">
            <span>Collection</span>
            <select
              value={artifact.collection}
              onChange={(event) =>
                onUpdateArtifact(
                  artifact.id,
                  { collection: event.target.value },
                  `Moved to ${event.target.value}.`,
                )
              }
              aria-label="Move selected script to collection"
            >
              {[...new Set(["Inbox", artifact.collection, ...collections])].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          {artifact.source ? (
            <div className="description-block">
              <h3>Source</h3>
              <p className="inspector-summary">{artifact.source}</p>
            </div>
          ) : null}

          <div className="description-block">
            <h3>Tags</h3>
          </div>
          <div className="tag-cloud">
            {artifact.tags.length ? (
              artifact.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))
            ) : (
              <span className="tag">untagged</span>
            )}
          </div>

          {relatedArtifacts.length ? (
            <div className="related-stack">
              <div className="description-block">
                <h3>Related Scripts</h3>
              </div>
              {relatedArtifacts.map((related) => (
                <button
                  className="related-script"
                  type="button"
                  key={related.id}
                  onClick={() => onSelectArtifact(related.id)}
                >
                  <span>
                    <strong>{related.title}</strong>
                    <small>{related.collection} / {related.language}</small>
                  </span>
                  <span>Open</span>
                </button>
              ))}
            </div>
          ) : null}

          {artifact.versionHistory?.length ? (
            <details className="version-history">
              <summary>Version history ({artifact.versionHistory.length})</summary>
              {artifact.versionHistory.slice(0, 3).map((version) => (
                <article key={`${version.savedAt}-${version.title}`}>
                  <strong>{version.title || "Untitled revision"}</strong>
                  <small>{formatDate(version.savedAt)}</small>
                </article>
              ))}
            </details>
          ) : null}

          <pre className="code-preview" tabIndex="0">
            <code>{artifact.code}</code>
          </pre>
        </div>
      ) : null}

      <div className="inspector-actions">
        <button className="button button--primary" type="button" onClick={() => onUseInWorkbench?.(artifact)}>
          Use in workbench
        </button>
        <button className="button button--secondary" type="button" onClick={copyCode}>
          {copyState === "copied"
            ? "Copied"
            : copyState === "blocked"
              ? "Copy blocked"
              : "Copy code"}
        </button>
        <button className="button button--danger" type="button" onClick={deleteArtifact}>
          Delete
        </button>
      </div>
    </section>
  );
}

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
  onMarkOpened,
  onEdit,
  onDelete,
}) {
  const [copyState, setCopyState] = useState("idle");

  async function copyCode() {
    if (!artifact) return;

    try {
      await navigator.clipboard.writeText(artifact.code);
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
          <button className="icon-button" type="button" aria-label="More actions">
            ...
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
          <strong>{artifact.code.split("\n").length}</strong>
          Lines
        </span>
      </div>

      <div className="description-block">
        <h3>Description</h3>
        <p className="inspector-summary">{artifact.summary}</p>
      </div>

      <div className="description-block">
        <h3>Tags</h3>
      </div>
      <div className="tag-cloud">
        {artifact.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <pre className="code-preview" tabIndex="0">
        <code>{artifact.code}</code>
      </pre>

      <div className="inspector-actions">
        <button className="button button--primary" type="button" onClick={onMarkOpened}>
          Open
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

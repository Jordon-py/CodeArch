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

  if (!artifact) {
    return (
      <section className="panel inspector-panel" id="inspector" aria-labelledby="inspector-title">
        <div className="empty-state">
          <h2 id="inspector-title">Selected Script Inspector</h2>
          <p>Select a saved script to inspect code, tags, collection, and reuse signals.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="panel inspector-panel"
      id="inspector"
      aria-labelledby="inspector-title"
      data-testid="selected-script-inspector"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Selected Script Inspector</p>
          <h2 id="inspector-title">{artifact.title}</h2>
        </div>
        <span className="panel-chip">{artifact.language}</span>
      </div>

      <p className="inspector-summary">{artifact.summary}</p>

      <div className="inspector-meta">
        <span>
          <strong>{artifact.usageCount}</strong>
          opens
        </span>
        <span>
          <strong>{artifact.collection}</strong>
          collection
        </span>
        <span>
          <strong>{formatDate(artifact.updatedAt)}</strong>
          last updated
        </span>
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
        <button className="button button--danger" type="button" onClick={onDelete}>
          Delete
        </button>
      </div>
    </section>
  );
}

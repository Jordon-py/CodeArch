import { useId, useState } from "react";

const emptyDraft = {
  title: "",
  language: "JavaScript",
  collection: "Backend",
  tags: "",
  summary: "",
  code: "",
  source: "",
};

function toDraft(artifact) {
  if (!artifact) return emptyDraft;

  return {
    title: artifact.title,
    language: artifact.language,
    collection: artifact.collection,
    tags: artifact.tags.join(", "),
    summary: artifact.summary,
    code: artifact.code,
    source: artifact.source ?? "",
  };
}

export function SnippetEditor({ open, mode, artifact, onClose, onSave }) {
  const titleId = useId();
  const codeId = useId();
  const [draft, setDraft] = useState(() => toDraft(artifact));
  const [localError, setLocalError] = useState("");

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.code.trim()) {
      setLocalError("Title and code are required.");
      return;
    }

    const saved = await onSave({
      ...draft,
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    if (saved) {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="snippet-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{mode === "edit" ? "Edit Script" : "New Script"}</p>
              <h2 id={titleId}>{mode === "edit" ? "Refine saved code" : "Archive reusable code"}</h2>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close editor">
              x
            </button>
          </div>

          {localError ? <p className="form-error">{localError}</p> : null}

          <div className="editor-grid">
            <label className="field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="db.client.py"
                required
              />
            </label>
            <label className="field">
              <span>Language</span>
              <input
                value={draft.language}
                onChange={(event) => updateDraft("language", event.target.value)}
                placeholder="Python"
              />
            </label>
            <label className="field">
              <span>Collection</span>
              <input
                value={draft.collection}
                onChange={(event) => updateDraft("collection", event.target.value)}
                placeholder="Backend"
              />
            </label>
            <label className="field">
              <span>Tags</span>
              <input
                value={draft.tags}
                onChange={(event) => updateDraft("tags", event.target.value)}
                placeholder="database, sqlalchemy, connection"
              />
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea
              value={draft.summary}
              onChange={(event) => updateDraft("summary", event.target.value)}
              placeholder="What this snippet does and when to reuse it."
              rows={3}
            />
          </label>

          <label className="field">
            <span>Source / Project</span>
            <input
              value={draft.source}
              onChange={(event) => updateDraft("source", event.target.value)}
              placeholder="Code_Arch backend"
            />
          </label>

          <label className="field">
            <span>Code</span>
            <textarea
              id={codeId}
              className="code-input"
              value={draft.code}
              onChange={(event) => updateDraft("code", event.target.value)}
              placeholder="Paste the reusable code here."
              spellCheck="false"
              required
            />
          </label>

          <div className="inspector-actions">
            <button className="button button--primary" type="submit">
              {mode === "edit" ? "Save changes" : "Save script"}
            </button>
            <button className="button button--secondary" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

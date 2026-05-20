import { useId, useMemo, useState } from "react";
import { analyzeCodeDraft } from "../services/codeArtifactRepository.js";

const emptyDraft = {
  title: "",
  language: "",
  collection: "Inbox",
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
    tags: (artifact.tags ?? []).join(", "),
    summary: artifact.summary,
    code: artifact.code,
    source: artifact.source ?? "",
  };
}

export function SnippetEditor({ open, mode, artifact, artifacts = [], onClose, onSave }) {
  const titleId = useId();
  const codeId = useId();
  const [draft, setDraft] = useState(() => toDraft(artifact));
  const [localError, setLocalError] = useState("");
  const analysis = useMemo(
    () =>
      analyzeCodeDraft({
        code: draft.code,
        title: draft.title,
        language: draft.language,
        collection: draft.collection,
        artifacts: artifacts.filter((item) => item.id !== artifact?.id),
      }),
    [artifact?.id, artifacts, draft.code, draft.collection, draft.language, draft.title],
  );
  const missingSignals = [
    !draft.source.trim() ? "source" : null,
    !draft.summary.trim() ? "description" : null,
    !draft.tags.trim() ? "tags" : null,
    !draft.collection.trim() || draft.collection === "Inbox" ? "collection" : null,
  ].filter(Boolean);

  function updateDraft(field, value) {
    setLocalError("");
    setDraft((current) => {
      const next = { ...current, [field]: value };

      if (field !== "code" || mode !== "create" || !value.trim()) {
        return next;
      }

      const codeAnalysis = analyzeCodeDraft({
        code: value,
        title: current.title,
        language: current.language,
        collection: current.collection,
        artifacts,
      });

      return {
        ...next,
        title: current.title || codeAnalysis.suggestedTitle,
        language: current.language || codeAnalysis.detectedLanguage,
        tags: current.tags || codeAnalysis.suggestedTags.join(", "),
        collection: current.collection || "Inbox",
        summary:
          current.summary ||
          `Reusable ${codeAnalysis.detectedLanguage} snippet with ${codeAnalysis.lineCount} lines.`,
      };
    });
  }

  function applySuggestions() {
    setDraft((current) => ({
      ...current,
      title: analysis.suggestedTitle,
      language: analysis.detectedLanguage,
      tags: analysis.suggestedTags.join(", "),
      collection: current.collection || "Inbox",
      summary:
        current.summary ||
        `Reusable ${analysis.detectedLanguage} snippet with ${analysis.lineCount} lines.`,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!draft.code.trim()) {
      setLocalError("Paste code before saving.");
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
              <h2 id={titleId}>{mode === "edit" ? "Refine saved code" : "Paste code, then save"}</h2>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close editor">
              x
            </button>
          </div>

          {localError ? <p className="form-error">{localError}</p> : null}

          <label className="field field--code-first">
            <span>Code</span>
            <textarea
              id={codeId}
              className="code-input"
              value={draft.code}
              onChange={(event) => updateDraft("code", event.target.value)}
              placeholder="Paste a reusable code block. CodeArch will infer title, language, tags, and archive signals."
              spellCheck="false"
              required
              autoFocus
            />
          </label>

          {draft.code.trim() ? (
            <div className="draft-intelligence" aria-label="Code draft intelligence">
              <div>
                <span>Detected</span>
                <strong>{analysis.detectedLanguage}</strong>
              </div>
              <div>
                <span>Suggested title</span>
                <strong>{analysis.suggestedTitle}</strong>
              </div>
              <div>
                <span>Lines</span>
                <strong>{analysis.lineCount}</strong>
              </div>
              <div>
                <span>Review</span>
                <strong>{missingSignals.length ? missingSignals.join(", ") : "Ready"}</strong>
              </div>
              {analysis.duplicate ? (
                <p className="duplicate-warning">
                  Possible duplicate: {analysis.duplicate.title}
                </p>
              ) : null}
              <button className="button button--secondary" type="button" onClick={applySuggestions}>
                Accept suggestions
              </button>
            </div>
          ) : null}

          <div className="editor-grid">
            <label className="field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="db.client.py"
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

import { useEffect, useMemo, useRef, useState } from "react";

export function CommandPalette({ open, artifacts, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (open) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return artifacts.slice(0, 8);

    return artifacts
      .filter((artifact) =>
        [
          artifact.title,
          artifact.language,
          artifact.collection,
          artifact.summary,
          ...artifact.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [artifacts, query]);

  function selectArtifact(id) {
    onSelect(id);
    setQuery("");
    onClose();
  }

  function onSubmit(event) {
    event.preventDefault();
    if (results[0]) {
      selectArtifact(results[0].id);
    }
  }

  if (!open) return null;

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Script command palette"
        onMouseDown={(event) => event.stopPropagation()}
        data-testid="command-palette"
      >
        <form onSubmit={onSubmit}>
          <label className="field field--command">
            <span>Script Command Palette</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, language, collection, or tag"
              aria-label="Command palette search"
              data-testid="command-palette-input"
            />
          </label>
        </form>

        <div className="command-results" role="listbox" aria-label="Matching scripts">
          {results.length ? (
            results.map((artifact) => (
              <button
                className="command-result"
                type="button"
                key={artifact.id}
                onClick={() => selectArtifact(artifact.id)}
              >
                <span>
                  <strong>{artifact.title}</strong>
                  <small>
                    {artifact.language} / {artifact.tags.join(", ")}
                  </small>
                </span>
                <span>Open</span>
              </button>
            ))
          ) : (
            <p className="empty-copy">No scripts found. Try a language, tag, or title.</p>
          )}
        </div>
      </section>
    </div>
  );
}

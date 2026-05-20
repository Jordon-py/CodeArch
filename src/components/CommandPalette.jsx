import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCommandSearchIndex,
  getCommandActions,
  searchCommandPalette,
} from "../utils/commandPaletteSearch.js";

const RESULT_LIMIT = 8;

function clampIndex(index, length) {
  if (!length) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

function getResultDomId(artifactId) {
  return `command-result-${String(artifactId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function CommandPalette({ open, artifacts = [], onClose, onSelect, onAction }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [actionOverrideId, setActionOverrideId] = useState(null);
  const inputRef = useRef(null);
  const resultRefs = useRef([]);
  const searchIndex = useMemo(() => createCommandSearchIndex(artifacts), [artifacts]);
  const results = useMemo(
    () => searchCommandPalette(searchIndex, query, RESULT_LIMIT),
    [query, searchIndex],
  );
  const safeActiveIndex = clampIndex(activeIndex, results.length);
  const activeResult = results[safeActiveIndex] ?? null;
  const activeArtifact = activeResult?.artifact ?? null;
  const activeActions = useMemo(
    () => (activeArtifact ? getCommandActions(activeArtifact) : []),
    [activeArtifact],
  );
  const suggestedActionIndex = activeActions.findIndex(
    (action) => action.id === activeResult?.suggestedActionId,
  );
  const overrideActionIndex = activeActions.findIndex(
    (action) => action.id === actionOverrideId,
  );
  const safeActiveActionIndex =
    overrideActionIndex >= 0
      ? overrideActionIndex
      : clampIndex(suggestedActionIndex >= 0 ? suggestedActionIndex : 0, activeActions.length);
  const activeAction = activeActions[safeActiveActionIndex] ?? null;
  const queryText = query.trim();
  const activeResultId = activeArtifact ? getResultDomId(activeArtifact.id) : undefined;

  useEffect(() => {
    if (!open) return;

    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setQuery("");
        setActiveIndex(0);
        setActionOverrideId(null);
        onClose();
      }
    }

    if (open) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    resultRefs.current[safeActiveIndex]?.scrollIntoView({ block: "nearest" });
  }, [results.length, safeActiveIndex]);

  function closePalette() {
    setQuery("");
    setActiveIndex(0);
    setActionOverrideId(null);
    onClose();
  }

  async function runAction(action, artifact) {
    if (!artifact) return;

    if (action === "open") {
      onSelect?.(artifact.id);
    }

    await onAction?.(action, artifact);
    setQuery("");
    setActiveIndex(0);
    setActionOverrideId(null);
    onClose();
  }

  function onSubmit(event) {
    event.preventDefault();
    if (activeResult && activeAction) {
      runAction(activeAction.id, activeResult.artifact);
    }
  }

  function moveActiveResult(direction) {
    setActiveIndex((current) => {
      if (!results.length) return 0;
      const boundedIndex = clampIndex(current, results.length);
      return (boundedIndex + direction + results.length) % results.length;
    });
  }

  function moveActiveAction(direction) {
    if (!activeActions.length) return;

    const nextIndex =
      (safeActiveActionIndex + direction + activeActions.length) % activeActions.length;
    setActionOverrideId(activeActions[nextIndex].id);
  }

  function handleInputKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveResult(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveResult(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(results.length - 1, 0));
      return;
    }

    if (event.key === "Tab" && activeActions.length > 1) {
      event.preventDefault();
      moveActiveAction(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === "Enter" && activeResult && activeAction) {
      event.preventDefault();
      runAction(activeAction.id, activeResult.artifact);
    }
  }

  if (!open) return null;

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={closePalette}>
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
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
                setActionOverrideId(null);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search scripts or type actions like copy, pin, edit, workbench"
              aria-label="Command palette search"
              aria-activedescendant={activeResultId}
              aria-controls="command-palette-results"
              aria-autocomplete="list"
              data-testid="command-palette-input"
            />
          </label>
        </form>

        <div className="command-palette__meta" aria-live="polite">
          <span>
            {artifacts.length
              ? `${results.length} of ${artifacts.length} scripts indexed`
              : "No scripts indexed yet"}
          </span>
          {activeResult && activeAction ? (
            <span>
              {activeAction.label} selected. Tab changes action, Enter runs it.
            </span>
          ) : null}
        </div>

        <div
          className="command-results"
          id="command-palette-results"
          role="listbox"
          aria-label="Matching scripts"
        >
          {!artifacts.length ? (
            <div className="empty-copy" role="status">
              <strong>No saved scripts yet.</strong>
              <span>Save a workbench snippet and it will appear here for quick reuse.</span>
            </div>
          ) : results.length ? (
            results.map((result, index) => {
              const artifact = result.artifact;
              const actions = getCommandActions(artifact);

              return (
              <div
                className={`command-result ${index === safeActiveIndex ? "command-result--active" : ""}`}
                key={artifact.id}
                id={getResultDomId(artifact.id)}
                role="option"
                aria-selected={index === safeActiveIndex}
                ref={(element) => {
                  resultRefs.current[index] = element;
                }}
                onMouseEnter={() => {
                  setActiveIndex(index);
                }}
              >
                <button
                  className="command-result__primary"
                  type="button"
                  onClick={() => runAction("open", artifact)}
                  onFocus={() => setActiveIndex(index)}
                >
                  <strong>{artifact.title}</strong>
                  <small>
                    {artifact.language} / {artifact.collection} / {artifact.tags.join(", ")}
                  </small>
                  <small>{result.matchSummary}</small>
                </button>
                <span className="command-actions" aria-label={`Actions for ${artifact.title}`}>
                  {actions.map((action) => (
                    <button
                      className={
                        index === safeActiveIndex && action.id === activeAction?.id
                          ? "command-action--active"
                          : undefined
                      }
                      type="button"
                      key={action.id}
                      title={`${action.description} Shortcut: ${action.shortcut}.`}
                      onClick={() => runAction(action.id, artifact)}
                      onFocus={() => {
                        setActiveIndex(index);
                        setActionOverrideId(action.id);
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </span>
              </div>
              );
            })
          ) : (
            <div className="empty-copy" role="status">
              <strong>No command result for "{queryText}".</strong>
              <span>
                Try a title, language, collection, tag, summary, source, code token, or
                action word like copy or pin.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

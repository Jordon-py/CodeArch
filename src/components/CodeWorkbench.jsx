import { useCallback, useMemo, useRef, useState } from "react";
import { boilerplateCodeSnippets } from "../data/boilerplateSnippets.js";
import { analyzeCodeDraft } from "../services/codeArtifactRepository.js";
import {
  analyzeSmartSave,
  deterministicSmartSave,
  smartSuggestionToDraft,
} from "../services/smartSaveAutopilot.js";

const defaultDraft = {
  title: "quick.script.js",
  language: "JavaScript",
  collection: "Workbench",
  tags: ["workbench", "javascript"],
  summary: "Runnable scratch script drafted in the CodeArch workbench.",
  source: "CodeArch Workbench",
  code: `const tasks = ["save snippet", "run code", "reuse fast"];
const checklist = tasks.map((task, index) => ({
  id: index + 1,
  task,
  done: index < 2,
}));

console.log("CodeArch checklist", checklist);
return checklist.filter((item) => item.done).length;`,
};

const keywordSet = new Set([
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "else",
  "export",
  "false",
  "for",
  "from",
  "function",
  "if",
  "import",
  "let",
  "new",
  "null",
  "return",
  "switch",
  "throw",
  "true",
  "try",
  "undefined",
  "var",
  "while",
]);

const tokenPattern =
  /(\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b)/g;

function serializeConsoleValue(value) {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function makeWorkerSource() {
  return `
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

    function serialize(value) {
      if (typeof value === "string") return value;
      if (value === undefined) return "undefined";
      if (value instanceof Error) return value.message;

      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }

    self.onmessage = async (event) => {
      const logs = [];
      const runnerConsole = {
        log: (...items) => logs.push({ type: "log", text: items.map(serialize).join(" ") }),
        info: (...items) => logs.push({ type: "log", text: items.map(serialize).join(" ") }),
        warn: (...items) => logs.push({ type: "warn", text: items.map(serialize).join(" ") }),
        error: (...items) => logs.push({ type: "error", text: items.map(serialize).join(" ") }),
      };

      try {
        const runner = new AsyncFunction("console", event.data.code);
        const result = await runner(runnerConsole);
        self.postMessage({ ok: true, logs, result: serialize(result) });
      } catch (error) {
        self.postMessage({
          ok: false,
          logs,
          error: error instanceof Error ? error.message : serialize(error),
        });
      }
    };
  `;
}

function tokenizeLine(line) {
  const parts = [];
  let lastIndex = 0;

  for (const match of line.matchAll(tokenPattern)) {
    const [token] = match;
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: "plain", value: line.slice(lastIndex, index) });
    }

    const nextNonSpace = line.slice(index + token.length).match(/\S/)?.[0];
    const previousNonSpace = line.slice(0, index).match(/\S(?=\s*$)/)?.[0];
    let type = "identifier";
    if (token.startsWith("//")) type = "comment";
    else if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) type = "string";
    else if (/^\d/.test(token)) type = "number";
    else if (keywordSet.has(token)) type = "keyword";
    else if (previousNonSpace === "." && nextNonSpace === "(") type = "method";
    else if (nextNonSpace === "(") type = "function";

    parts.push({ type, value: token });
    lastIndex = index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push({ type: "plain", value: line.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: "plain", value: " " }];
}

function SyntaxLine({ line, lineIndex, showLineNumber = true }) {
  return (
    <span className="syntax-line">
      {showLineNumber ? <span className="syntax-line-number">{lineIndex + 1}</span> : null}
      <span className="syntax-line-code">
        {tokenizeLine(line).map((part, partIndex) => (
          <span className={`syntax-token syntax-token--${part.type}`} key={`${partIndex}-${part.value}`}>
            {part.value}
          </span>
        ))}
      </span>
    </span>
  );
}

function HighlightedCodeLayer({ code, highlightRef }) {
  const lines = code.split("\n");

  return (
    <pre className="code-highlight-layer" aria-hidden="true" ref={highlightRef}>
      <code>
        {lines.map((line, lineIndex) => (
          <SyntaxLine
            line={line}
            lineIndex={lineIndex}
            key={`${lineIndex}-${line}`}
            showLineNumber={false}
          />
        ))}
      </code>
    </pre>
  );
}

function SyntaxPreview({ code }) {
  const lines = code.split("\n");

  return (
    <pre className="syntax-preview" aria-label="Syntax highlighted preview" tabIndex="0">
      <code>
        {lines.map((line, lineIndex) => (
          <SyntaxLine line={line} lineIndex={lineIndex} key={`${lineIndex}-${line}`} />
        ))}
      </code>
    </pre>
  );
}

function normalizeDraft(input) {
  return {
    title: input?.title ?? defaultDraft.title,
    language: input?.language ?? defaultDraft.language,
    collection: input?.collection ?? defaultDraft.collection,
    tags: input?.tags ?? defaultDraft.tags,
    summary: input?.summary ?? defaultDraft.summary,
    source: input?.source ?? defaultDraft.source,
    code: input?.code ?? defaultDraft.code,
  };
}

function buildDraft(input) {
  const incomingDraft = normalizeDraft(input);
  const codeAnalysis = analyzeCodeDraft({
    code: incomingDraft.code,
    title: input?.title ?? "",
    language: input?.language ?? "",
    collection: input?.collection ?? incomingDraft.collection,
    artifacts: [],
  });

  return {
    ...incomingDraft,
    title: input?.title || codeAnalysis.suggestedTitle,
    language: input?.language || codeAnalysis.detectedLanguage,
    tags: input?.tags ?? codeAnalysis.suggestedTags,
    summary:
      input?.summary ||
      `Runnable ${codeAnalysis.detectedLanguage} draft with ${codeAnalysis.lineCount} lines.`,
  };
}

function makeOutputEntry(type, text) {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    text,
  };
}

function suggestionToEditable(suggestion) {
  return {
    title: suggestion?.title ?? "",
    language: suggestion?.language ?? "",
    collection: suggestion?.collection ?? DEFAULT_COLLECTION,
    tags: (suggestion?.tags ?? []).join(", "),
    description: suggestion?.description ?? "",
    useCase: suggestion?.useCase ?? "",
    framework: suggestion?.framework ?? "None",
    dependencies: (suggestion?.dependencies ?? []).join(", "),
    riskNotes: (suggestion?.riskNotes ?? []).join(" "),
  };
}

function editableToSuggestion(editable, baseSuggestion = {}) {
  return {
    ...baseSuggestion,
    title: editable.title,
    language: editable.language,
    collection: editable.collection,
    tags: editable.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    description: editable.description,
    useCase: editable.useCase,
    framework: editable.framework || "None",
    dependencies: editable.dependencies.split(",").map((item) => item.trim()).filter(Boolean),
    riskNotes: editable.riskNotes ? [editable.riskNotes] : [],
  };
}

function SmartSavePanel({
  preview,
  smartSave,
  onAnalyze,
  onSaveInstantly,
  onConfirmSave,
  onEditSuggestion,
  onCopySaved,
  onViewSaved,
  onSaveAnother,
}) {
  const suggestion = smartSave.edited
    ? editableToSuggestion(smartSave.edited, smartSave.response?.suggestion)
    : preview.suggestion;
  const duplicateCandidates = smartSave.response?.duplicateCandidates?.length
    ? smartSave.response.duplicateCandidates
    : preview.duplicateCandidates;
  const warnings = smartSave.response?.warnings?.length ? smartSave.response.warnings : preview.warnings;
  const hasCode = Boolean(suggestion.title);

  return (
    <div className="smart-save-card smart-save-inspector" data-testid="smart-save-autopilot">
      <div className="smart-save-card__header">
        <div>
          <p className="eyebrow">Smart Save Autopilot</p>
          <h3>Paste-first metadata</h3>
        </div>
        <span className={`health-pill health-pill--${preview.fallbackUsed ? "useful" : "ready"}`}>
          {smartSave.status === "analyzing" ? "Analyzing" : `${Math.round((suggestion.confidence ?? 0) * 100)}% confidence`}
        </span>
      </div>

      <div className="smart-save-signals" aria-label="Detected Smart Save signals">
        <span>
          <strong>{suggestion.language || "Text"}</strong>
          language
        </span>
        <span>
          <strong>{suggestion.framework || "None"}</strong>
          framework
        </span>
        <span>
          <strong>{suggestion.collection || DEFAULT_COLLECTION}</strong>
          collection
        </span>
      </div>

      {duplicateCandidates.length ? (
        <div className="smart-save-warning" role="alert" data-testid="smart-save-duplicate-warning">
          <strong>Possible duplicate</strong>
          {duplicateCandidates.slice(0, 2).map((candidate) => (
            <span key={`${candidate.id}-${candidate.matchType}`}>
              {candidate.title} / {Math.round(candidate.score * 100)}% / {candidate.matchType}
            </span>
          ))}
        </div>
      ) : null}

      {warnings.length ? (
        <div className="smart-save-warning smart-save-warning--soft">
          {warnings.slice(0, 3).map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}

      {smartSave.status === "review" || smartSave.status === "saved" ? (
        <div className="smart-save-review" data-testid="smart-save-review">
          <label className="field">
            <span>Title</span>
            <input
              value={smartSave.edited.title}
              onChange={(event) => onEditSuggestion("title", event.target.value)}
              aria-label="Smart Save title"
            />
          </label>
          <label className="field">
            <span>Language</span>
            <input
              value={smartSave.edited.language}
              onChange={(event) => onEditSuggestion("language", event.target.value)}
              aria-label="Smart Save language"
            />
          </label>
          <label className="field">
            <span>Collection</span>
            <input
              value={smartSave.edited.collection}
              onChange={(event) => onEditSuggestion("collection", event.target.value)}
              aria-label="Smart Save collection"
            />
          </label>
          <label className="field">
            <span>Tags</span>
            <input
              value={smartSave.edited.tags}
              onChange={(event) => onEditSuggestion("tags", event.target.value)}
              aria-label="Smart Save tags"
            />
          </label>
          <label className="field smart-save-review__wide">
            <span>Description</span>
            <textarea
              value={smartSave.edited.description}
              onChange={(event) => onEditSuggestion("description", event.target.value)}
              aria-label="Smart Save description"
              rows={3}
            />
          </label>
        </div>
      ) : (
        <div className="smart-save-preview">
          <strong>{hasCode ? suggestion.title : "Paste code to generate metadata."}</strong>
          {hasCode ? <span>{suggestion.description}</span> : null}
          {hasCode && suggestion.tags?.length ? (
            <div className="tag-cloud">
              {suggestion.tags.slice(0, 5).map((tag) => (
                <span className="tag" key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {smartSave.savedArtifact ? (
        <div className="smart-save-success" data-testid="smart-save-success">
          <strong>{smartSave.savedArtifact.title} saved.</strong>
          <div className="inspector-actions">
            <button className="button button--secondary" type="button" onClick={onCopySaved}>
              Copy snippet
            </button>
            <button className="button button--primary" type="button" onClick={onViewSaved}>
              View snippet
            </button>
            <button className="button button--secondary" type="button" onClick={onSaveAnother}>
              Save another
            </button>
          </div>
        </div>
      ) : (
        <div className="smart-save-actions">
          <button className="button button--secondary" type="button" onClick={onAnalyze} disabled={smartSave.status === "analyzing"}>
            {smartSave.status === "analyzing" ? "Analyzing..." : "Analyze with Smart Save"}
          </button>
          <button className="button button--secondary" type="button" onClick={onSaveInstantly}>
            Save instantly
          </button>
          <button
            className="button button--gold"
            type="button"
            onClick={onConfirmSave}
            disabled={smartSave.status !== "review"}
          >
            Confirm Smart Save
          </button>
        </div>
      )}
    </div>
  );
}

const DEFAULT_COLLECTION = "Workbench";

export function CodeWorkbench({
  artifacts = [],
  seed,
  selectedArtifact,
  onSelectArtifact,
  onSaveSnippet,
  onOpenLibrary,
}) {
  const workerRef = useRef(null);
  const timeoutRef = useRef(null);
  const highlightRef = useRef(null);
  const [draft, setDraft] = useState(() => buildDraft(seed?.draft ?? defaultDraft));
  const [output, setOutput] = useState([
    makeOutputEntry(
      "system",
      seed?.message ?? "Pick a boilerplate, load a saved snippet, or write JavaScript and run it here.",
    ),
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [templateId, setTemplateId] = useState(boilerplateCodeSnippets[0]?.id ?? "");
  const [smartSave, setSmartSave] = useState({
    status: "idle",
    response: null,
    edited: null,
    savedArtifact: null,
  });
  const [assistantOpen, setAssistantOpen] = useState(false);

  const analysis = useMemo(
    () =>
      analyzeCodeDraft({
        code: draft.code,
        title: draft.title,
        language: draft.language,
        collection: draft.collection,
        artifacts,
      }),
    [artifacts, draft.code, draft.collection, draft.language, draft.title],
  );
  const currentCollections = useMemo(
    () => [...new Set(artifacts.map((artifact) => artifact.collection).filter(Boolean))],
    [artifacts],
  );
  const smartPreview = useMemo(
    () =>
      deterministicSmartSave({
        code: draft.code,
        artifacts,
        currentCollections,
        userProvidedTitle: draft.title,
        userProvidedLanguage: draft.language,
      }),
    [artifacts, currentCollections, draft.code, draft.language, draft.title],
  );

  const resetSmartSave = useCallback(() => {
    setSmartSave({
      status: "idle",
      response: null,
      edited: null,
      savedArtifact: null,
    });
  }, []);

  function updateDraft(field, value) {
    setSaveState("idle");
    setSmartSave((current) => ({
      ...current,
      status: current.status === "saved" ? "idle" : current.status,
      savedArtifact: null,
    }));
    setDraft((current) => {
      const next = { ...current, [field]: value };

      if (field !== "code" || !value.trim()) {
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
        tags: current.tags?.length ? current.tags : codeAnalysis.suggestedTags,
        summary:
          current.summary ||
          `Runnable ${codeAnalysis.detectedLanguage} draft with ${codeAnalysis.lineCount} lines.`,
      };
    });
  }

  const loadDraft = useCallback(
    (input, message) => {
      setDraft(buildDraft(input));
      setOutput([makeOutputEntry("system", message)]);
      setSaveState("idle");
      resetSmartSave();
    },
    [resetSmartSave],
  );

  function applyTemplate(id) {
    const template = boilerplateCodeSnippets.find((item) => item.id === id);
    if (!template) return;

    setTemplateId(id);
    loadDraft(template, `${template.title} loaded into the workbench.`);
  }

  function loadSelectedSnippet() {
    if (!selectedArtifact) return;
    loadDraft(selectedArtifact, `${selectedArtifact.title} is ready to edit, run, or save as a new draft.`);
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft.code);
      setOutput((current) => [makeOutputEntry("system", "Workbench code copied."), ...current]);
    } catch {
      setOutput((current) => [makeOutputEntry("error", "Clipboard access was blocked."), ...current]);
    }
  }

  function cleanupWorker() {
    window.clearTimeout(timeoutRef.current);
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  async function runCode() {
    const language = draft.language.trim().toLowerCase();

    if (!draft.code.trim()) {
      setOutput([makeOutputEntry("error", "Write or load code before running.")]);
      return;
    }

    if (language && language !== "javascript") {
      setOutput([
        makeOutputEntry(
          "system",
          "The in-browser runner executes JavaScript only. This snippet can still be edited, copied, and saved.",
        ),
      ]);
      return;
    }

    cleanupWorker();
    setIsRunning(true);
    setOutput([makeOutputEntry("system", "Running in an isolated browser worker...")]);

    const workerBlob = new Blob([makeWorkerSource()], { type: "text/javascript" });
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;
    URL.revokeObjectURL(workerUrl);

    timeoutRef.current = window.setTimeout(() => {
      cleanupWorker();
      setIsRunning(false);
      setOutput([makeOutputEntry("error", "Execution stopped after 3 seconds.")]);
    }, 3000);

    worker.onmessage = (event) => {
      cleanupWorker();
      setIsRunning(false);

      const logs = event.data.logs.map((entry) => makeOutputEntry(entry.type, entry.text));
      if (event.data.ok) {
        const resultText =
          event.data.result === "undefined"
            ? "Completed without a return value."
            : `Return value: ${event.data.result}`;
        setOutput([...logs, makeOutputEntry("result", resultText)]);
        return;
      }

      setOutput([...logs, makeOutputEntry("error", event.data.error)]);
    };

    worker.onerror = (error) => {
      cleanupWorker();
      setIsRunning(false);
      setOutput([makeOutputEntry("error", error.message || "Runner failed.")]);
    };

    worker.postMessage({ code: draft.code });
  }

  async function saveDraft() {
    if (!draft.code.trim()) {
      setOutput([makeOutputEntry("error", "Write code before saving to the archive.")]);
      return;
    }

    setSaveState("saving");
    const saved = await onSaveSnippet({
      ...draft,
      title: draft.title || analysis.suggestedTitle,
      language: draft.language || analysis.detectedLanguage,
      tags: Array.isArray(draft.tags)
        ? draft.tags
        : String(draft.tags)
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
      collection: draft.collection || "Workbench",
      source: draft.source || "CodeArch Workbench",
    });

    if (saved) {
      setSaveState("saved");
      onSelectArtifact?.(saved.id);
      setOutput((current) => [makeOutputEntry("system", `${saved.title} saved to the archive.`), ...current]);
      return;
    }

    setSaveState("idle");
  }

  function applySuggestionToDraft(suggestion) {
    const nextDraft = smartSuggestionToDraft(suggestion, draft.code);
    setDraft((current) => ({
      ...current,
      ...nextDraft,
      code: current.code,
    }));
  }

  async function runSmartAnalyze() {
    if (!draft.code.trim()) {
      setOutput([makeOutputEntry("error", "Paste code before using Smart Save.")]);
      return null;
    }

    setSmartSave((current) => ({ ...current, status: "analyzing", savedArtifact: null }));
    const response = await analyzeSmartSave({
      code: draft.code,
      artifacts,
      currentCollections,
      userProvidedTitle: draft.title,
      userProvidedLanguage: draft.language,
    });

    applySuggestionToDraft(response.suggestion);
    setSmartSave({
      status: "review",
      response,
      edited: suggestionToEditable(response.suggestion),
      savedArtifact: null,
    });
    setOutput((current) => [
      makeOutputEntry(
        response.fallbackUsed ? "warn" : "system",
        response.fallbackUsed
          ? "Smart Save used local deterministic fallback."
          : `Smart Save suggestion validated by ${response.provider}.`,
      ),
      ...current,
    ]);
    return response;
  }

  function editSmartSuggestion(field, value) {
    setSmartSave((current) => ({
      ...current,
      edited: { ...current.edited, [field]: value },
    }));
  }

  async function saveSmartSuggestion(suggestion) {
    const saved = await onSaveSnippet(smartSuggestionToDraft(suggestion, draft.code));

    if (saved) {
      setSaveState("saved");
      onSelectArtifact?.(saved.id);
      setSmartSave((current) => ({
        ...current,
        status: "saved",
        edited: current.edited ?? suggestionToEditable(suggestion),
        savedArtifact: saved,
      }));
      setOutput((current) => [makeOutputEntry("system", `${saved.title} saved with Smart Save.`), ...current]);
      return saved;
    }

    return null;
  }

  async function saveInstantly() {
    if (!draft.code.trim()) {
      setOutput([makeOutputEntry("error", "Paste code before saving.")]);
      return;
    }

    await saveSmartSuggestion(smartPreview.suggestion);
  }

  async function confirmSmartSave() {
    if (!smartSave.edited) return;
    await saveSmartSuggestion(editableToSuggestion(smartSave.edited, smartSave.response?.suggestion));
  }

  async function copySavedSnippet() {
    if (!smartSave.savedArtifact) return;

    try {
      await navigator.clipboard.writeText(smartSave.savedArtifact.code);
      setOutput((current) => [makeOutputEntry("system", "Saved snippet copied."), ...current]);
    } catch {
      setOutput((current) => [makeOutputEntry("error", "Clipboard access was blocked."), ...current]);
    }
  }

  function viewSavedSnippet() {
    if (!smartSave.savedArtifact) return;
    onSelectArtifact?.(smartSave.savedArtifact.id);
    onOpenLibrary?.();
    window.requestAnimationFrame(() => {
      if (window.location.pathname !== "/library") {
        window.history.pushState({}, "", "/library");
        const navigationEvent =
          typeof PopStateEvent === "function" ? new PopStateEvent("popstate") : new Event("popstate");
        window.dispatchEvent(navigationEvent);
      }

      document.getElementById("library")?.scrollIntoView({ block: "start" });
    });
  }

  function saveAnotherSnippet() {
    setDraft(buildDraft({ ...defaultDraft, code: "" }));
    setOutput([makeOutputEntry("system", "Paste the next snippet to use Smart Save again.")]);
    resetSmartSave();
    setSaveState("idle");
  }

  function syncHighlightScroll(event) {
    if (!highlightRef.current) return;

    highlightRef.current.scrollTop = event.currentTarget.scrollTop;
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  const visibleTemplates = boilerplateCodeSnippets.slice(0, 20);

  return (
    <section className="workbench-shell" id="workbench" aria-labelledby="workbench-title">
      <div className="workbench-header">
        <div>
          <h2 id="workbench-title">Write, run, and save code</h2>
        </div>
        <div className="workbench-actions">
          <button className="button button--secondary" type="button" onClick={loadSelectedSnippet}>
            Load selected
          </button>
          <button className="button button--secondary" type="button" onClick={copyDraft}>
            Copy
          </button>
          <button
            className="button button--secondary workbench-assistant-toggle"
            type="button"
            aria-expanded={assistantOpen}
            aria-controls="workbench-assistant-tools"
            onClick={() => setAssistantOpen((current) => !current)}
          >
            Smart Save tools
          </button>
          <button className="button button--primary" type="button" onClick={runCode} disabled={isRunning}>
            {isRunning ? "Running..." : "Run code"}
          </button>
          <button className="button button--gold" type="button" onClick={saveDraft}>
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save snippet"}
          </button>
        </div>
      </div>

      <div className="workbench-template-strip" aria-label="Boilerplate snippet templates">
        <label className="field field--template">
          <span>Starter snippet</span>
          <select
            value={templateId}
            onChange={(event) => applyTemplate(event.target.value)}
            aria-label="Choose boilerplate snippet"
          >
            {visibleTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
        </label>
        <div className="template-count" aria-label="Boilerplate count">
          <strong>{visibleTemplates.length}</strong>
          <span>boilerplates ready</span>
        </div>
      </div>

      <div className="workbench-grid">
        <div className="workbench-editor">
          <div className="editor-chrome" aria-label="Active draft">
            <span className="file-tab">
              <span className="file-pill">{draft.language.slice(0, 2).toUpperCase() || "JS"}</span>
              <span>{draft.title || "untitled.script"}</span>
            </span>
            <span className="editor-utility">
              {analysis.detectedLanguage} / {analysis.lineCount} lines
            </span>
          </div>

          <div className="workbench-meta-grid">
            <label className="field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                aria-label="Workbench title"
              />
            </label>
            <label className="field">
              <span>Language</span>
              <input
                value={draft.language}
                onChange={(event) => updateDraft("language", event.target.value)}
                aria-label="Workbench language"
              />
            </label>
          </div>

          <label className="field field--workbench-code">
            <span>Code</span>
            <div className="code-editor-shell" data-testid="code-editor-shell">
              <HighlightedCodeLayer code={draft.code} highlightRef={highlightRef} />
              <textarea
                className="workbench-code-input code-editor-input"
                value={draft.code}
                onChange={(event) => updateDraft("code", event.target.value)}
                onScroll={syncHighlightScroll}
                aria-label="Workbench code"
                spellCheck="false"
              />
            </div>
          </label>

          <div className="run-console" data-testid="workbench-console" aria-live="polite">
            <div className="run-console__header">
              <strong>Run Output</strong>
              <span>{isRunning ? "executing" : "ready"}</span>
            </div>
            <div className="run-console__body">
              {output.map((entry) => (
                <pre className={`run-line run-line--${entry.type}`} key={entry.id}>
                  {serializeConsoleValue(entry.text)}
                </pre>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`workbench-preview-column ${assistantOpen ? "workbench-preview-column--open" : ""}`}
          id="workbench-assistant-tools"
          hidden={!assistantOpen}
        >
          <SmartSavePanel
            preview={smartPreview}
            smartSave={smartSave}
            onAnalyze={runSmartAnalyze}
            onSaveInstantly={saveInstantly}
            onConfirmSave={confirmSmartSave}
            onEditSuggestion={editSmartSuggestion}
            onCopySaved={copySavedSnippet}
            onViewSaved={viewSavedSnippet}
            onSaveAnother={saveAnotherSnippet}
          />

          <div className="workbench-intelligence" aria-label="Workbench intelligence">
            <span>
              <strong>{analysis.detectedLanguage}</strong>
              detected
            </span>
            <span>
              <strong>{analysis.lineCount}</strong>
              lines
            </span>
            <span>
              <strong>{analysis.suggestedTags.slice(0, 3).join(", ") || "tags"}</strong>
              suggested
            </span>
          </div>

          <SyntaxPreview code={draft.code} />
        </div>
      </div>
    </section>
  );
}

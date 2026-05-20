import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/AppShell.jsx";
import { CodeWorkbench } from "../components/CodeWorkbench.jsx";
import { CollectionBoard } from "../components/CollectionBoard.jsx";
import { CommandPalette } from "../components/CommandPalette.jsx";
import { DashboardMetricsPanel } from "../components/DashboardMetricsPanel.jsx";
import { ScriptLibrary } from "../components/ScriptLibrary.jsx";
import { SelectedScriptInspector } from "../components/SelectedScriptInspector.jsx";
import { SnippetEditor } from "../components/SnippetEditor.jsx";
import { useCodeArtifacts } from "../hooks/useCodeArtifacts.js";

function viewFromPath(pathname) {
  return pathname === "/library" ? "library" : "workspace";
}

export function DashboardPage() {
  const {
    artifacts,
    filteredArtifacts,
    selectedArtifact,
    selectedId,
    setSelectedId,
    status,
    error,
    query,
    setQuery,
    language,
    setLanguage,
    tag,
    setTag,
    tags,
    collection,
    setCollection,
    collections,
    sortBy,
    setSortBy,
    languages,
    metrics,
    feedback,
    setFeedback,
    createArtifact,
    updateArtifactById,
    updateSelectedArtifact,
    markSelectedAsOpened,
    removeSelectedArtifact,
    exportArtifacts,
    importArtifacts,
  } = useCodeArtifacts();
  const [activeView, setActiveView] = useState(() => viewFromPath(window.location.pathname));
  const [commandOpen, setCommandOpen] = useState(false);
  const [workbenchSeed, setWorkbenchSeed] = useState(null);
  const [editorState, setEditorState] = useState({
    open: false,
    mode: "create",
    artifact: null,
  });

  const navigateTo = useCallback((view) => {
    const nextPath = view === "library" ? "/library" : "/dashboard";

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setActiveView(view);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }, []);

  const openCommandPalette = useCallback(() => setCommandOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandOpen(false), []);
  const openEditEditor = useCallback(
    () => setEditorState({ open: true, mode: "edit", artifact: selectedArtifact }),
    [selectedArtifact],
  );
  const closeEditor = useCallback(
    () => setEditorState((current) => ({ ...current, open: false })),
    [],
  );
  const relatedArtifacts = selectedArtifact?.relatedIds?.length
    ? selectedArtifact.relatedIds
        .map((id) => artifacts.find((artifact) => artifact.id === id))
        .filter(Boolean)
    : [];

  const loadWorkbenchDraft = useCallback((draft = null, message = "Fresh draft ready in the workbench.") => {
    setWorkbenchSeed({
      key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      draft,
      message,
    });
    window.requestAnimationFrame(() =>
      document.getElementById("workbench")?.scrollIntoView({ block: "start" }),
    );
  }, []);

  const openDraftWorkspace = useCallback(() => {
    navigateTo("workspace");
    loadWorkbenchDraft();
  }, [loadWorkbenchDraft, navigateTo]);

  const loadArtifactIntoWorkbench = useCallback(
    (artifact = selectedArtifact) => {
      if (!artifact) return;

      setSelectedId(artifact.id);
      navigateTo("workspace");
      loadWorkbenchDraft(
        artifact,
        `${artifact.title} loaded. Edit it, run it if it is JavaScript, or save a new version.`,
      );
    },
    [loadWorkbenchDraft, navigateTo, selectedArtifact, setSelectedId],
  );

  const showWorkspaceNotice = useCallback(
    (message = "Workspace is ready. Use the command palette to find, copy, or organize scripts.") => {
      setFeedback({ type: "success", message });
    },
    [setFeedback],
  );

  const showAllArtifacts = useCallback(() => {
    setQuery("");
    setLanguage("all");
    setTag("all");
    setCollection("all");
    setSortBy("updated");
    navigateTo("library");
    window.requestAnimationFrame(() =>
      document.getElementById("library")?.scrollIntoView({ block: "start" }),
    );
  }, [navigateTo, setCollection, setLanguage, setQuery, setSortBy, setTag]);

  const openCreateEditorWithCode = useCallback(
    (code = "") => {
      navigateTo("workspace");
      loadWorkbenchDraft(
        {
          title: "",
          language: "",
          collection: "Workbench",
          tags: [],
          summary: "",
          code,
          source: "Clipboard",
        },
        "Clipboard code loaded into the workbench.",
      );
    },
    [loadWorkbenchDraft, navigateTo],
  );

  const handlePaletteAction = useCallback(
    async (action, artifact) => {
      if (!artifact) return;

      if (action === "open") {
        setSelectedId(artifact.id);
        document.getElementById("inspector")?.scrollIntoView({ block: "start" });
        return;
      }

      if (action === "copy") {
        try {
          await navigator.clipboard.writeText(artifact.code);
          await updateArtifactById(
            artifact.id,
            {
              usageCount: artifact.usageCount + 1,
              lastCopiedAt: new Date().toISOString(),
            },
            "Code copied from command palette.",
          );
        } catch {
          setFeedback({ type: "error", message: "Clipboard access was blocked." });
        }
        return;
      }

      if (action === "edit") {
        setSelectedId(artifact.id);
        setEditorState({ open: true, mode: "edit", artifact });
        return;
      }

      if (action === "pin") {
        await updateArtifactById(
          artifact.id,
          { pinned: !artifact.pinned },
          artifact.pinned ? "Script unpinned." : "Script pinned.",
        );
        return;
      }

      if (action === "filter-collection") {
        setCollection(artifact.collection);
        navigateTo("library");
        window.requestAnimationFrame(() =>
          document.getElementById("library")?.scrollIntoView({ block: "start" }),
        );
        return;
      }

      if (action === "workbench") {
        loadArtifactIntoWorkbench(artifact);
        return;
      }

      if (action === "show-related") {
        setSelectedId(artifact.id);
        document.getElementById("inspector")?.scrollIntoView({ block: "start" });
      }
    },
    [loadArtifactIntoWorkbench, navigateTo, setCollection, setFeedback, setSelectedId, updateArtifactById],
  );

  useEffect(() => {
    function onKeyDown(event) {
      const commandKeyPressed = event.ctrlKey || event.metaKey;

      if (commandKeyPressed && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPopState() {
      setActiveView(viewFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function renderMainSurface() {
    if (status === "loading") {
      return (
        <main className="dashboard-grid" aria-busy="true">
          <section className="panel skeleton-panel">
            <p className="eyebrow">Loading</p>
            <h2>Indexing saved scripts</h2>
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line--short" />
          </section>
        </main>
      );
    }

    if (status === "error") {
      return (
        <main className="dashboard-grid">
          <section className="panel error-panel" role="alert" data-testid="data-error-state">
            <p className="eyebrow">Data path</p>
            <h2>Saved scripts could not be loaded.</h2>
            <p>{error}</p>
          </section>
        </main>
      );
    }

    if (activeView === "library") {
      return (
        <main className="library-page" data-testid="library-page">
          <section className="page-hero page-hero--library" aria-labelledby="library-page-title">
            <div>
              <p className="eyebrow">Snippet Library</p>
              <h2 id="library-page-title">Search, organize, and reuse saved code</h2>
            </div>
            <div className="page-hero__stats" aria-label="Library summary">
              <span>
                <strong>{metrics.totalScripts}</strong>
                scripts
              </span>
              <span>
                <strong>{metrics.collectionCount}</strong>
                collections
              </span>
              <span>
                <strong>{metrics.healthAverage}%</strong>
                health
              </span>
            </div>
          </section>

          <div className="library-page-grid">
            <div className="library-page-main">
              <CollectionBoard
                artifacts={artifacts}
                activeCollection={collection}
                selectedId={selectedId}
                title="Collections"
                onSelectArtifact={setSelectedId}
                onFilterCollection={setCollection}
                onFilterTag={setTag}
                onSortBy={setSortBy}
                onUpdateArtifact={updateArtifactById}
              />

              <ScriptLibrary
                artifacts={filteredArtifacts}
                selectedId={selectedId}
                onSelect={setSelectedId}
                query={query}
                setQuery={setQuery}
                language={language}
                setLanguage={setLanguage}
                languages={languages}
                tag={tag}
                setTag={setTag}
                tags={tags}
                collection={collection}
                setCollection={setCollection}
                collections={collections}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </div>

            <aside className="library-page-side" aria-label="Selected script details">
              <SelectedScriptInspector
                artifact={selectedArtifact}
                collections={collections.filter((item) => item !== "all")}
                relatedArtifacts={relatedArtifacts}
                onMarkOpened={markSelectedAsOpened}
                onUpdateArtifact={updateArtifactById}
                onSelectArtifact={setSelectedId}
                onEdit={openEditEditor}
                onDelete={removeSelectedArtifact}
                onUseInWorkbench={loadArtifactIntoWorkbench}
              />
            </aside>
          </div>
        </main>
      );
    }

    return (
      <main className="workspace-page" data-testid="workspace-page">
        <div className="workspace-page-main" data-testid="workbench-canvas">
          <CodeWorkbench
            key={workbenchSeed?.key ?? "default-workbench"}
            artifacts={artifacts}
            seed={workbenchSeed}
            selectedArtifact={selectedArtifact}
            onSelectArtifact={setSelectedId}
            onSaveSnippet={createArtifact}
            onOpenLibrary={() => navigateTo("library")}
          />
        </div>

        <aside
          className="workspace-page-side"
          aria-label="Artifact intelligence and selected script"
          data-testid="right-intelligence-rail"
        >
          <DashboardMetricsPanel metrics={metrics} onViewAll={showAllArtifacts} />

          <SelectedScriptInspector
            artifact={selectedArtifact}
            collections={collections.filter((item) => item !== "all")}
            relatedArtifacts={relatedArtifacts}
            onMarkOpened={markSelectedAsOpened}
            onUpdateArtifact={updateArtifactById}
            onSelectArtifact={setSelectedId}
            onEdit={openEditEditor}
            onDelete={removeSelectedArtifact}
            onUseInWorkbench={loadArtifactIntoWorkbench}
          />
        </aside>
      </main>
    );
  }

  return (
    <AppShell
      activeView={activeView}
      feedback={feedback}
      metrics={metrics}
      pageTitle={activeView === "library" ? "Snippet Library" : "CodeArch Workbench"}
      onCreateArtifact={openDraftWorkspace}
      onNavigate={navigateTo}
      onOpenCommandPalette={openCommandPalette}
      onExportArtifacts={exportArtifacts}
      onImportArtifacts={importArtifacts}
      onShowNotifications={showWorkspaceNotice}
      onCreateFromClipboard={openCreateEditorWithCode}
    >
      {renderMainSurface()}
      <CommandPalette
        open={commandOpen}
        artifacts={artifacts}
        onClose={closeCommandPalette}
        onSelect={setSelectedId}
        onAction={handlePaletteAction}
      />
      <SnippetEditor
        key={`${editorState.mode}-${editorState.artifact?.id ?? "new"}-${editorState.open}`}
        open={editorState.open}
        mode={editorState.mode}
        artifact={editorState.artifact}
        artifacts={artifacts}
        onClose={closeEditor}
        onSave={editorState.mode === "edit" ? updateSelectedArtifact : createArtifact}
      />
    </AppShell>
  );
}

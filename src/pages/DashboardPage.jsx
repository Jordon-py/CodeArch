import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/AppShell.jsx";
import { CommandPalette } from "../components/CommandPalette.jsx";
import { DashboardMetricsPanel } from "../components/DashboardMetricsPanel.jsx";
import { DeployReadinessPanel } from "../components/DeployReadinessPanel.jsx";
import { ScriptLibrary } from "../components/ScriptLibrary.jsx";
import { SelectedScriptInspector } from "../components/SelectedScriptInspector.jsx";
import { SnippetEditor } from "../components/SnippetEditor.jsx";
import { ThreeDashboardScene } from "../components/ThreeDashboardScene.jsx";
import { useCodeArtifacts } from "../hooks/useCodeArtifacts.js";

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
    createArtifact,
    updateSelectedArtifact,
    markSelectedAsOpened,
    removeSelectedArtifact,
    exportArtifacts,
    importArtifacts,
  } = useCodeArtifacts();
  const [commandOpen, setCommandOpen] = useState(false);
  const [editorState, setEditorState] = useState({
    open: false,
    mode: "create",
    artifact: null,
  });

  const openCommandPalette = useCallback(() => setCommandOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandOpen(false), []);
  const openCreateEditor = useCallback(
    () => setEditorState({ open: true, mode: "create", artifact: null }),
    [],
  );
  const openEditEditor = useCallback(
    () => setEditorState({ open: true, mode: "edit", artifact: selectedArtifact }),
    [selectedArtifact],
  );
  const closeEditor = useCallback(
    () => setEditorState((current) => ({ ...current, open: false })),
    [],
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

    return (
      <main className="dashboard-layout">
        <div className="dashboard-main">
          <ThreeDashboardScene
            artifacts={artifacts}
            selectedId={selectedId}
            onSelect={setSelectedId}
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

        <aside className="dashboard-side" aria-label="Artifact intelligence and selected script">
          <DashboardMetricsPanel metrics={metrics} />

          <SelectedScriptInspector
            artifact={selectedArtifact}
            onMarkOpened={markSelectedAsOpened}
            onEdit={openEditEditor}
            onDelete={removeSelectedArtifact}
          />

          <DeployReadinessPanel />
        </aside>
      </main>
    );
  }

  return (
    <AppShell
      artifactCount={artifacts.length}
      collectionCounts={metrics.collectionCounts}
      feedback={feedback}
      onCreateArtifact={openCreateEditor}
      onOpenCommandPalette={openCommandPalette}
      onExportArtifacts={exportArtifacts}
      onImportArtifacts={importArtifacts}
    >
      {renderMainSurface()}
      <CommandPalette
        open={commandOpen}
        artifacts={artifacts}
        onClose={closeCommandPalette}
        onSelect={setSelectedId}
      />
      <SnippetEditor
        key={`${editorState.mode}-${editorState.artifact?.id ?? "new"}-${editorState.open}`}
        open={editorState.open}
        mode={editorState.mode}
        artifact={editorState.artifact}
        onClose={closeEditor}
        onSave={editorState.mode === "edit" ? updateSelectedArtifact : createArtifact}
      />
    </AppShell>
  );
}

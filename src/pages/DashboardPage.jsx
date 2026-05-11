import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/AppShell.jsx";
import { CommandPalette } from "../components/CommandPalette.jsx";
import { DashboardMetricsPanel } from "../components/DashboardMetricsPanel.jsx";
import { ScriptLibrary } from "../components/ScriptLibrary.jsx";
import { SelectedScriptInspector } from "../components/SelectedScriptInspector.jsx";
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
    languages,
    metrics,
    createStarterArtifact,
    markSelectedAsOpened,
    removeSelectedArtifact,
  } = useCodeArtifacts();
  const [commandOpen, setCommandOpen] = useState(false);

  const openCommandPalette = useCallback(() => setCommandOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandOpen(false), []);

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
      <main className="dashboard-grid">
        <ThreeDashboardScene
          artifacts={filteredArtifacts.length ? filteredArtifacts : artifacts}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <DashboardMetricsPanel
          metrics={metrics}
          query={query}
          setQuery={setQuery}
          language={language}
          setLanguage={setLanguage}
          languages={languages}
          onQuickOpen={setSelectedId}
        />

        <ScriptLibrary
          artifacts={filteredArtifacts}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <SelectedScriptInspector
          artifact={selectedArtifact}
          onMarkOpened={markSelectedAsOpened}
          onDelete={removeSelectedArtifact}
        />
      </main>
    );
  }

  return (
    <AppShell
      artifactCount={artifacts.length}
      onCreateArtifact={createStarterArtifact}
      onOpenCommandPalette={openCommandPalette}
    >
      {renderMainSurface()}
      <CommandPalette
        open={commandOpen}
        artifacts={artifacts}
        onClose={closeCommandPalette}
        onSelect={setSelectedId}
      />
    </AppShell>
  );
}

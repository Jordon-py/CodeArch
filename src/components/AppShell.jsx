export function AppShell({
  children,
  onCreateArtifact,
  onOpenCommandPalette,
  onExportArtifacts,
  onImportArtifacts,
  artifactCount,
  collectionCounts = [],
  feedback,
}) {
  function handleImport(event) {
    onImportArtifacts(event.target.files?.[0]);
    event.target.value = "";
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <a className="brand-lockup" href="#dashboard" aria-label="CodeArch dashboard">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="cube" />
          </span>
          <span>
            <strong>CodeArch</strong>
          </span>
        </a>

        <nav className="side-nav" aria-label="Primary">
          <a href="#dashboard" className="side-nav__link side-nav__link--active">
            <Icon name="cube" />
            Command Center
          </a>
          <a href="#library" className="side-nav__link">
            <Icon name="file" />
            Artifacts
          </a>
          <a href="#intelligence" className="side-nav__link">
            <Icon name="graph" />
            Graph Map
          </a>
          <a href="#library" className="side-nav__link">
            <Icon name="nodes" />
            Dependencies
          </a>
          <a href="#intelligence" className="side-nav__link">
            <Icon name="chart" />
            Intelligence
          </a>
          <a href="#inspector" className="side-nav__link">
            <Icon name="terminal" />
            Executions
          </a>
          <a href="#inspector" className="side-nav__link">
            <Icon name="settings" />
            Settings
          </a>
        </nav>

        <div className="sidebar-section">
          <p className="sidebar-section__title">Collections</p>
          <a className="collection-link" href="#library">
            <span>
              <Icon name="file" />
              All Scripts
            </span>
            <strong>{artifactCount}</strong>
          </a>
          {collectionCounts.slice(0, 5).map((item) => (
            <a className="collection-link" href="#library" key={item.label}>
              <span>
                <Icon name="folder" />
                {item.label}
              </span>
              <strong>{item.count}</strong>
            </a>
          ))}
        </div>

        <div className="sidebar-status" aria-label="Workspace plan">
          <span className="avatar" aria-hidden="true">
            DA
          </span>
          <span>
            <strong>Dev Architect</strong>
            <small>Pro Plan</small>
          </span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="page-title">
            <span className="title-icon" aria-hidden="true">
              <Icon name="cube" />
            </span>
            <h1>Command Center</h1>
          </div>

          <button
            className="command-trigger"
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open command palette"
          >
            <Icon name="terminal" />
            <span>Search scripts, functions, symbols...</span>
            <kbd>Ctrl K</kbd>
          </button>

          <div className="topbar-actions">
            <button className="button button--primary" type="button" onClick={onCreateArtifact}>
              <Icon name="plus" />
              New Script
            </button>
            <label className="icon-button" aria-label="Import archive">
              <input
                className="sr-only"
                type="file"
                accept="application/json"
                onChange={handleImport}
              />
              <Icon name="upload" />
            </label>
            <button className="icon-button" type="button" onClick={onExportArtifacts} aria-label="Export archive">
              <Icon name="download" />
            </button>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Icon name="bell" />
            </button>
            <span className="topbar-avatar" aria-hidden="true">
              DA
            </span>
          </div>
        </header>

        {feedback ? (
          <div className={`toast toast--${feedback.type}`} role="status">
            {feedback.message}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}

function Icon({ name }) {
  const paths = {
    bell: (
      <path d="M10 18h4M5 15h14l-2-3V9a5 5 0 0 0-10 0v3l-2 3Z" />
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l3-4 3 2 4-7" />
      </>
    ),
    cube: (
      <>
        <path d="M12 3 4.8 7.1 12 11.2l7.2-4.1L12 3Z" />
        <path d="M4.8 7.1v8.2L12 19.4v-8.2" />
        <path d="M19.2 7.1v8.2L12 19.4" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v10" />
        <path d="m8 10 4 4 4-4" />
        <path d="M5 18h14" />
      </>
    ),
    file: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h4" />
      </>
    ),
    folder: (
      <path d="M4 6h6l2 2h8v10H4V6Z" />
    ),
    graph: (
      <>
        <path d="M6 7a2 2 0 1 0 0 .1" />
        <path d="M18 7a2 2 0 1 0 0 .1" />
        <path d="M12 17a2 2 0 1 0 0 .1" />
        <path d="m7.7 8.2 2.8 6" />
        <path d="m16.3 8.2-2.8 6" />
        <path d="M8 7h8" />
      </>
    ),
    nodes: (
      <>
        <path d="M12 4v5" />
        <path d="M7 14h10" />
        <path d="M7 14v5" />
        <path d="M17 14v5" />
        <path d="M10 4h4v4h-4z" />
        <path d="M5 18h4v3H5z" />
        <path d="M15 18h4v3h-4z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    settings: (
      <>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        <path d="M4 12h2M18 12h2M12 4v2M12 18v2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4" />
      </>
    ),
    terminal: (
      <>
        <path d="m5 7 5 5-5 5" />
        <path d="M12 17h7" />
      </>
    ),
    upload: (
      <>
        <path d="M12 20V10" />
        <path d="m8 14 4-4 4 4" />
        <path d="M5 5h14" />
      </>
    ),
  };

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

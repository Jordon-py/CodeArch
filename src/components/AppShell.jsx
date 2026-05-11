export function AppShell({
  children,
  onCreateArtifact,
  onOpenCommandPalette,
  artifactCount,
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <a className="brand-lockup" href="#dashboard" aria-label="CodeArch dashboard">
          <span className="brand-mark" aria-hidden="true">
            CA
          </span>
          <span>
            <strong>CodeArch</strong>
            <small>Developer Intelligence</small>
          </span>
        </a>

        <nav className="side-nav" aria-label="Primary">
          <a href="#dashboard" className="side-nav__link side-nav__link--active">
            Command Center
          </a>
          <a href="#library" className="side-nav__link">
            Script Library
          </a>
          <a href="#intelligence" className="side-nav__link">
            Intelligence
          </a>
          <a href="#inspector" className="side-nav__link">
            Inspector
          </a>
        </nav>

        <div className="sidebar-status" aria-label="Vault status">
          <span className="status-dot" aria-hidden="true" />
          <span>
            <strong>{artifactCount}</strong> saved scripts
          </span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Command Center</p>
            <h1>Flying Scripts</h1>
          </div>

          <div className="topbar-actions">
            <button
              className="command-trigger"
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open command palette"
            >
              <span>Search scripts</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button className="button button--primary" type="button" onClick={onCreateArtifact}>
              New script
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

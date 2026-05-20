import { useEffect, useState } from "react";

export function AppShell({
  children,
  activeView = "workspace",
  metrics,
  pageTitle = "CodeArch Workbench",
  onCreateArtifact,
  onNavigate,
  onOpenCommandPalette,
  onExportArtifacts,
  onImportArtifacts,
  onShowNotifications,
  onCreateFromClipboard,
  feedback,
}) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("codearch.theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("codearch.theme", theme);
  }, [theme]);

  function handleImport(event) {
    onImportArtifacts(event.target.files?.[0]);
    event.target.value = "";
  }

  async function handlePasteCapture() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onCreateFromClipboard(text);
        return;
      }
      onShowNotifications("Clipboard is empty. Use the workbench to write code manually.");
    } catch {
      onShowNotifications("Clipboard access was blocked. Use the workbench to paste code manually.");
    }
  }

  function handleNavigate(event, view) {
    event.preventDefault();
    onNavigate?.(view);
  }

  const navigationItems = [
    { id: "workspace", href: "/dashboard", icon: "terminal", label: "Workbench" },
    { id: "library", href: "/library", icon: "file", label: "Library" },
  ];

  return (
    <div className="app-shell" data-testid="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation" data-testid="app-sidebar">
        <a
          className="brand-lockup"
          href="/dashboard"
          aria-label="CodeArch dashboard"
          onClick={(event) => handleNavigate(event, "workspace")}
        >
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-glyph">CA</span>
          </span>
          <span>
            <strong>CodeArch</strong>
            <small>Local archive</small>
          </span>
        </a>

        <nav className="side-nav" aria-label="Primary">
          {navigationItems.map((item) => (
            <a
              href={item.href}
              className={`side-nav__link ${
                activeView === item.id ? "side-nav__link--active" : ""
              }`}
              aria-current={activeView === item.id ? "page" : undefined}
              key={item.id}
              onClick={(event) => handleNavigate(event, item.id)}
            >
              <Icon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-section" aria-label="Archive summary">
          <p className="sidebar-section__title">Archive</p>
          <div className="sidebar-stat">
            <span>Scripts</span>
            <strong>{metrics?.totalScripts ?? 0}</strong>
          </div>
          <div className="sidebar-stat">
            <span>Health</span>
            <strong>{metrics?.healthAverage ?? 0}%</strong>
          </div>
          <div className="sidebar-stat">
            <span>Collections</span>
            <strong>{metrics?.collectionCount ?? 0}</strong>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar" data-testid="top-command-bar">
          <div className="page-title">
            <span className="title-icon" aria-hidden="true">
              <Icon name="cube" />
            </span>
            <span>
              <h1>{pageTitle}</h1>
              <small>Private, local-first code memory</small>
            </span>
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
              <Icon name="terminal" />
              New Draft
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={handlePasteCapture}
            >
              <Icon name="clipboard" />
              Paste Save
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
            <button
              className="icon-button theme-toggle"
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "dark"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
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
    clipboard: (
      <>
        <path d="M9 4h6l1 2h3v15H5V6h3l1-2Z" />
        <path d="M9 4v4h6V4" />
        <path d="M8 12h8" />
        <path d="M8 16h6" />
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
    moon: (
      <path d="M19 14.6A7 7 0 0 1 9.4 5a7.4 7.4 0 1 0 9.6 9.6Z" />
    ),
    sun: (
      <>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
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

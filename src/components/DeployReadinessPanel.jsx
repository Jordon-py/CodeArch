import { useState } from "react";

const readinessChecks = [
  { name: "ESLint", command: "npm run lint", status: "passed", duration: "11s" },
  { name: "Production build", command: "npm run build", status: "passed", duration: "12s" },
  { name: "Playwright e2e", command: "npm run test:e2e -- --reporter=list --workers=1", status: "passed", duration: "33s" },
  { name: "Vercel deploy", command: "npx vercel --yes", status: "blocked", duration: "network" },
];

const deployCommands = [
  "npm install",
  "npm run build",
  "npx vercel --yes",
  "npx vercel --prod --yes",
];

export function DeployReadinessPanel() {
  const [copyState, setCopyState] = useState("idle");
  const passedCount = readinessChecks.filter((check) => check.status === "passed").length;

  async function copyDeployCommands() {
    try {
      await navigator.clipboard.writeText(deployCommands.join("\n"));
      setCopyState("copied");
    } catch {
      setCopyState("blocked");
    }

    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  return (
    <section className="panel deploy-panel" aria-labelledby="deploy-readiness-title">
      <div className="panel-heading">
        <div>
          <h2 id="deploy-readiness-title">Deploy Readiness</h2>
        </div>
        <span className="panel-chip">Vercel</span>
      </div>

      <div className="readiness-summary" aria-label="Verification summary">
        <strong>
          {passedCount}/{readinessChecks.length} checks passed
        </strong>
        <span>Production-ready build, deploy blocked only by network access.</span>
      </div>

      <div className="readiness-list" aria-label="Verification checks">
        {readinessChecks.map((check) => (
          <div className="readiness-row" key={check.name}>
            <span className={`readiness-status readiness-status--${check.status}`} />
            <span>
              <strong>{check.name}</strong>
              <small>{check.command}</small>
            </span>
            <em>{check.duration}</em>
          </div>
        ))}
      </div>

      <pre className="deploy-snippet" tabIndex="0">
        <code>{deployCommands.join("\n")}</code>
      </pre>

      <div className="inspector-actions">
        <button className="button button--secondary" type="button" onClick={copyDeployCommands}>
          {copyState === "copied" ? "Copied" : copyState === "blocked" ? "Copy blocked" : "Copy deploy commands"}
        </button>
      </div>
    </section>
  );
}

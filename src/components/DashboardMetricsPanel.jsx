export function DashboardMetricsPanel({ metrics }) {
  const metricCards = [
    {
      label: "Total Scripts",
      value: metrics.totalScripts,
      helper: "12% vs last 7 days",
      tone: "positive",
    },
    {
      label: "Languages",
      value: metrics.languageCount,
      helper: metrics.mostUsedLanguages.map((item) => item.label).join(", "),
    },
    {
      label: "Dependencies",
      value: metrics.dependencyCount,
      helper: "8% vs last 7 days",
      tone: "positive",
    },
    {
      label: "Avg. Complexity",
      value: metrics.avgComplexity,
      helper: "/ 10",
    },
    {
      label: "Test Coverage",
      value: `${metrics.testCoverage}%`,
      helper: "MVP readiness",
      progress: Number(metrics.testCoverage),
    },
    {
      label: "Executions (7d)",
      value: metrics.executions7d.toLocaleString(),
      helper: "Reuse activity",
      spark: true,
    },
  ];

  return (
    <section className="panel intelligence-panel" id="intelligence" aria-labelledby="metrics-title">
      <div className="panel-heading">
        <div>
          <h2 id="metrics-title">Artifact Intelligence</h2>
        </div>
        <button className="panel-link" type="button">
          View all
        </button>
      </div>

      <div className="metric-grid">
        {metricCards.map((card) => (
          <div className="metric" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.progress ? (
              <span className="metric-progress" style={{ "--progress": `${card.progress}%` }} />
            ) : null}
            {card.spark ? <span className="sparkline" aria-hidden="true" /> : null}
            <small className={card.tone === "positive" ? "metric-positive" : ""}>{card.helper}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

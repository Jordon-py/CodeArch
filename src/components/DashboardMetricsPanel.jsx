export function DashboardMetricsPanel({ metrics, onViewAll }) {
  const healthProgress = metrics.healthAverage ?? 0;
  const topLanguages = metrics.mostUsedLanguages.map((item) => item.label).join(", ") || "No languages yet";
  const metricCards = [
    {
      label: "Total Scripts",
      value: metrics.totalScripts,
      helper: `${metrics.collectionCount} organized collections`,
      tone: "positive",
    },
    {
      label: "Languages",
      value: metrics.languageCount,
      helper: topLanguages,
    },
    {
      label: "Related Links",
      value: metrics.relatedLinkCount,
      helper: "Reusable snippet connections",
      tone: "positive",
    },
    {
      label: "Avg. Lines",
      value: metrics.avgLines,
      helper: "Capture size signal",
    },
    {
      label: "Archive Health",
      value: `${healthProgress}%`,
      helper: `${metrics.needsContextCount} need more context`,
      progress: healthProgress,
    },
    {
      label: "Copied Scripts",
      value: metrics.copiedCount,
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
        <button className="panel-link" type="button" onClick={onViewAll}>
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

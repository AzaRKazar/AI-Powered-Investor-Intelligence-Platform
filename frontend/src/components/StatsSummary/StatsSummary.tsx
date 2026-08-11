interface StatsSummaryProps {
  count: number;
}

// Both rows use the same count, matching the backend's current
// total_companies == total_reports == len(metrics) computation.
export function StatsSummary({ count }: StatsSummaryProps) {
  return (
    <div className="stats-summary">
      <div className="stat-row">
        <span className="stat-label">Companies</span>
        <span className="stat-val">{count}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Reports Analyzed</span>
        <span className="stat-val">{count}</span>
      </div>
    </div>
  );
}

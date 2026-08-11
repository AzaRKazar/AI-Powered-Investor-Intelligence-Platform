export function EmptyState() {
  return (
    <div className="deep-dive-card empty-state-card">
      <svg viewBox="0 0 24 24" className="empty-state-icon">
        <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h2>No Corporate Data Yet</h2>
      <p>
        Ingest your first company financial statement (e.g., 10-K, 10-Q reports
        in PDF format) using the sidebar uploader. Our AI engine will parse the
        financial metrics, risks, and growth drivers.
      </p>
    </div>
  );
}

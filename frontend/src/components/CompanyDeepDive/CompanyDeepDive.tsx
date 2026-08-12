import { useEffect, useState } from 'react';
import type { MetricRow } from '../../api/types';
import { splitLines } from '../../utils/metrics';
import { QualitativeColumn } from './QualitativeColumn';

interface CompanyDeepDiveProps {
  metrics: MetricRow[];
}

export function CompanyDeepDive({ metrics }: CompanyDeepDiveProps) {
  const [selectedCompany, setSelectedCompany] = useState(metrics[0]?.company ?? '');

  useEffect(() => {
    // If the currently-selected company is still present after metrics
    // change (e.g. a new upload), keep the selection - the old app's full
    // page reload made this moot, but a proper SPA refetch shouldn't yank
    // the user back to the first company.
    const stillSelected = metrics.some((row) => row.company === selectedCompany);
    if (!stillSelected) {
      setSelectedCompany(metrics[0]?.company ?? '');
    }
  }, [metrics, selectedCompany]);

  const selectedRow = metrics.find((row) => row.company === selectedCompany);

  if (!selectedRow) {
    return null;
  }

  return (
    <section className="deep-dive-section">
      <div className="section-header">
        <div className="section-title">
          <svg viewBox="0 0 24 24">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Qualitative Intelligence Deep-Dive</span>
        </div>
      </div>

      <div className="deep-dive-card">
        <div className="inspector-header">
          <div className="inspector-meta">
            <h2>{selectedRow.company}</h2>
            <p>Fiscal Year {selectedRow.year}</p>
          </div>
          <div className="company-selector-wrapper">
            <label htmlFor="companySelect">Inspect Company</label>
            <select
              id="companySelect"
              className="company-select"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              {metrics.map((row) => (
                <option key={row.company} value={row.company}>
                  {row.company}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="qualitative-grid">
          <QualitativeColumn variant="driver" items={splitLines(selectedRow.growth_drivers)} />
          <QualitativeColumn variant="risk" items={splitLines(selectedRow.risk_factors)} />
        </div>
      </div>
    </section>
  );
}

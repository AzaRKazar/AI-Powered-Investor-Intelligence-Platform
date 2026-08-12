import type { CSSProperties } from 'react';
import { parseNumericValue } from '../../utils/metrics';
import type { MetricRow } from '../../api/types';
import type { KpiDefinition } from '../KpiGrid/kpiDefinitions';

interface KpiCardProps {
  definition: KpiDefinition;
  metrics: MetricRow[];
}

export function KpiCard({ definition, metrics }: KpiCardProps) {
  const rows = metrics.filter((row) => row[definition.key]);
  const parsedValues = rows.map((row) => parseNumericValue(row[definition.key]));
  const maxAbsValue = Math.max(0, ...parsedValues.map((v) => Math.abs(v)));

  const cardStyle = {
    '--kpi-accent': `var(--cat-${definition.catIndex})`,
    '--kpi-accent-bg': `var(--cat-${definition.catIndex}-bg)`,
  } as CSSProperties;

  return (
    <div className="kpi-card" style={cardStyle}>
      <div className="kpi-card-header">
        <div className="kpi-info">
          <h3>{definition.title}</h3>
          <p>{definition.description}</p>
        </div>
        <div className="kpi-icon-wrapper">
          <svg viewBox="0 0 24 24">
            {definition.iconPaths.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        </div>
      </div>
      <div className="kpi-values-list">
        {rows.map((row, idx) => {
          const value = parsedValues[idx];
          const percent = maxAbsValue > 0 ? (Math.abs(value) / maxAbsValue) * 100 : 10;
          // Bug fix vs. the old app: the original JS set this fill color via
          // --accent-blue/--accent-green/etc., none of which are defined
          // anywhere in the stylesheet, so most bars rendered with no fill.
          // Use the card's own accent (real, defined token) for positive
          // values, and the existing --status-critical token for negative.
          const barColor = value < 0 ? 'var(--status-critical)' : 'var(--kpi-accent)';
          const barSecondStop = value < 0 ? 'rgba(208, 59, 59, 0.4)' : 'rgba(255, 255, 255, 0.03)';

          return (
            <div className="kpi-value-row" key={`${row.company}-${row.year}`}>
              <div className="kpi-company-label">
                <span className="company-badge-name">
                  <span className="company-logo-avatar">
                    {row.company.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    {row.company} ({row.year})
                  </span>
                </span>
                <span className="kpi-val-number">{row[definition.key]}</span>
              </div>
              <div className="kpi-compare-bar-bg">
                <div
                  className="kpi-compare-bar-fill"
                  style={{
                    width: `${percent}%`,
                    background: `linear-gradient(to right, ${barColor}, ${barSecondStop})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

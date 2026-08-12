import { KPI_DEFINITIONS } from './kpiDefinitions';
import { KpiCard } from '../KpiCard/KpiCard';
import type { MetricRow } from '../../api/types';

interface KpiGridProps {
  metrics: MetricRow[];
}

export function KpiGrid({ metrics }: KpiGridProps) {
  return (
    <section className="kpi-grid">
      {KPI_DEFINITIONS.map((definition) => (
        <KpiCard key={definition.key} definition={definition} metrics={metrics} />
      ))}
    </section>
  );
}

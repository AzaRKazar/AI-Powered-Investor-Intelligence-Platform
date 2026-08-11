import './MainContent.css';
import type { MetricRow } from '../../api/types';
import { KpiGrid } from '../KpiGrid/KpiGrid';
import { EmptyState } from './EmptyState';

interface MainContentProps {
  metrics: MetricRow[];
}

export function MainContent({ metrics }: MainContentProps) {
  return (
    <main className="main-content">
      <header className="header-container">
        <div className="header-title-section">
          <h1>AI-Powered Investor Intelligence Platform</h1>
          <p>Real-time corporate insights and KPI extraction</p>
        </div>
      </header>

      {metrics.length > 0 ? <KpiGrid metrics={metrics} /> : <EmptyState />}
    </main>
  );
}

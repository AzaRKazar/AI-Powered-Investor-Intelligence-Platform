import './Sidebar.css';
import { StatsSummary } from '../StatsSummary/StatsSummary';

interface SidebarProps {
  companyCount: number;
}

export function Sidebar({ companyCount }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="logo-section">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
            />
          </svg>
        </div>
        <span className="logo-text">Investor Intelligence</span>
      </div>

      <div>Upload dropzone placeholder</div>

      <StatsSummary count={companyCount} />
    </aside>
  );
}

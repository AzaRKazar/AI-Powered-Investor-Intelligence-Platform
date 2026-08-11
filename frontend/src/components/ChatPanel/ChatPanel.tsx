import './ChatPanel.css';

interface ChatPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function ChatPanel({ collapsed, onToggleCollapsed }: ChatPanelProps) {
  return (
    <aside className={`chat-panel${collapsed ? ' collapsed' : ''}`}>
      <div className="chat-panel-header">
        <div className="chat-panel-title">
          <div className="chat-panel-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <span className="chat-header-text">AI Analyst</span>
            <span className="chat-header-sub">Ask about your financial data</span>
          </div>
        </div>
        <button
          className="chat-panel-toggle"
          onClick={onToggleCollapsed}
          title="Collapse panel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div>Chat messages placeholder</div>
      <div>Chat composer placeholder</div>
    </aside>
  );
}

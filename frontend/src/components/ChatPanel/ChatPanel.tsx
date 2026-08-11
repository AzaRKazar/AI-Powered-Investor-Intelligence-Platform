import './ChatPanel.css';
import { ChatMessageList } from './ChatMessageList';
import type { ChatMessageData } from './ChatMessage';

interface ChatPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Temporary seed data to verify bubble/markdown styling before the next
// step wires this up to the real POST /api/chat call.
const SAMPLE_MESSAGES: ChatMessageData[] = [
  { id: 'sample-1', role: 'user', text: 'What was MSFT revenue in 2025?' },
  {
    id: 'sample-2',
    role: 'bot',
    text: "MSFT reported **$281,724** in revenue for fiscal year 2025. Key growth drivers include:\n\n- Intelligent Cloud revenue increased driven by Azure\n- Productivity and Business Processes revenue increased driven by Microsoft 365",
  },
];

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

      <ChatMessageList messages={SAMPLE_MESSAGES} isTyping={true} />

      <div>Chat composer placeholder</div>
    </aside>
  );
}

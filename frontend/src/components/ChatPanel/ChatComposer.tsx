import { useState, type KeyboardEvent } from 'react';
import type { MetricRow } from '../../api/types';

interface ChatComposerProps {
  metrics: MetricRow[];
  onSend: (question: string, selectedCompany: string) => void;
}

// The company-scope selector here is intentionally independent from
// CompanyDeepDive's own selector - the old app never synced them.
export function ChatComposer({ metrics, onSend }: ChatComposerProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onSend(trimmed, selectedCompany);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-area">
      <div className="chat-context-bar">
        <label className="chat-context-label">Company</label>
        <select
          className="chat-context-select"
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
        >
          <option value="">All Companies</option>
          {metrics.map((row) => (
            <option key={row.company} value={row.company}>
              {row.company} ({row.year})
            </option>
          ))}
        </select>
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          className="chat-text-input"
          placeholder="Ask about revenue, risks, growth..."
          autoComplete="off"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="chat-send-btn" onClick={handleSend} title="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

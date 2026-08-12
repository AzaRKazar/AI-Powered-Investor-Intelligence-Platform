import { useState } from 'react';
import './App.css';
import { useMetrics } from './hooks/useMetrics';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainContent } from './components/MainContent/MainContent';
import { ChatPanel } from './components/ChatPanel/ChatPanel';

function App() {
  const { metrics, isLoading, error, refetch } = useMetrics();
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const toggleChat = () => setChatCollapsed((collapsed) => !collapsed);

  return (
    <>
      <div className={`dashboard-wrapper${chatCollapsed ? ' chat-collapsed' : ''}`}>
        <Sidebar companyCount={metrics.length} onUploadSuccess={refetch} />
        {error ? (
          <main className="main-content">
            <p>Failed to load metrics: {error}</p>
          </main>
        ) : isLoading ? (
          <main className="main-content">
            <p>Loading...</p>
          </main>
        ) : (
          <MainContent metrics={metrics} />
        )}
        <ChatPanel metrics={metrics} collapsed={chatCollapsed} onToggleCollapsed={toggleChat} />
      </div>

      <div
        className={`chat-collapsed-tab${chatCollapsed ? ' visible' : ''}`}
        onClick={toggleChat}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>
    </>
  );
}

export default App;

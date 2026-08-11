import './App.css';
import { useMetrics } from './hooks/useMetrics';

function App() {
  const { metrics, isLoading, error } = useMetrics();

  return (
    <div className="dashboard-wrapper">
      <div>Sidebar placeholder</div>
      <div>
        <h1>AI-Powered Investor Intelligence Platform</h1>
        {isLoading && <p>Loading metrics...</p>}
        {error && <p>Error: {error}</p>}
        <pre>{JSON.stringify(metrics, null, 2)}</pre>
      </div>
      <div>Chat panel placeholder</div>
    </div>
  );
}

export default App;

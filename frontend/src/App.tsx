import './App.css';
import { useMetrics } from './hooks/useMetrics';
import { Sidebar } from './components/Sidebar/Sidebar';

function App() {
  const { metrics, isLoading, error, refetch } = useMetrics();

  return (
    <div className="dashboard-wrapper">
      <Sidebar companyCount={metrics.length} onUploadSuccess={refetch} />
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

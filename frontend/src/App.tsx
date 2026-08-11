import './App.css';
import { useMetrics } from './hooks/useMetrics';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainContent } from './components/MainContent/MainContent';

function App() {
  const { metrics, isLoading, error, refetch } = useMetrics();

  return (
    <div className="dashboard-wrapper">
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
      <div>Chat panel placeholder</div>
    </div>
  );
}

export default App;

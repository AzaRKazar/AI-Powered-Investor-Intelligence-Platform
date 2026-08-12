import { useCallback, useEffect, useState } from 'react';
import { getMetrics } from '../api/client';
import type { MetricRow } from '../api/types';

interface UseMetricsResult {
  metrics: MetricRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMetrics(): UseMetricsResult {
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => {
    setRefetchToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    getMetrics()
      .then((rows) => {
        if (!cancelled) {
          setMetrics(rows);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refetchToken]);

  return { metrics, isLoading, error, refetch };
}

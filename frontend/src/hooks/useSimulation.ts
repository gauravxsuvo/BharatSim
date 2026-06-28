'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { SimulationRun, SimulationParams } from '@/lib/types';

export function useSimulation() {
  const [simulations, setSimulations] = useState<SimulationRun[]>([]);
  const [currentResult, setCurrentResult] = useState<SimulationRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async (params: SimulationParams) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.simulations.run(params);
      setCurrentResult(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSimulations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.simulations.list();
      setSimulations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch simulations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResult = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const data = await api.simulations.get(id);
      setCurrentResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch result');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { simulations, currentResult, loading, error, runSimulation, fetchSimulations, fetchResult };
}

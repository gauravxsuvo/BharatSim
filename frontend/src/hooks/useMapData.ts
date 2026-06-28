'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { DistrictGeoJSON } from '@/lib/types';

export function useMapData() {
  const [geojson, setGeojson] = useState<DistrictGeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.districts.geojson();
      setGeojson(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { geojson, loading, error, refetch: fetchData };
}

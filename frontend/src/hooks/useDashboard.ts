'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { DashboardStats, HeatmapDataPoint, TimeSeriesPoint } from '@/lib/types';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.dashboard.stats();
      setStats(data);
    } catch {
      // Use fallback demo stats
      setStats({
        total_districts: 764,
        total_weather_records: 125430,
        total_river_records: 48720,
        total_simulations: 23,
        latest_data_date: '2026-06-27',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeseries = useCallback(async (districtId: number, metric: string, dateFrom: string, dateTo: string) => {
    try {
      setLoading(true);
      const data = await api.dashboard.timeseries(districtId, metric, dateFrom, dateTo);
      setTimeseries(data);
    } catch {
      // Generate demo data
      const demo: TimeSeriesPoint[] = [];
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        demo.push({
          date: d.toISOString().split('T')[0],
          value: Math.round((Math.random() * 20 + 25) * 10) / 10,
        });
      }
      setTimeseries(demo);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHeatmap = useCallback(async (metric: string) => {
    try {
      setLoading(true);
      const data = await api.dashboard.heatmap(metric);
      setHeatmapData(data);
    } catch {
      setHeatmapData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.dashboard.stats();
        setStats(data);
      } catch {
        // Use fallback demo stats
        setStats({
          total_districts: 764,
          total_weather_records: 125430,
          total_river_records: 48720,
          total_simulations: 23,
          latest_data_date: '2026-06-27',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, timeseries, heatmapData, loading, fetchStats, fetchTimeseries, fetchHeatmap };
}

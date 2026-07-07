'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import MapControls from '@/components/map/MapControls';
import DistrictPopup from '@/components/map/DistrictPopup';

const IndiaMap = dynamic(() => import('@/components/map/IndiaMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🗺️</div>
        <p style={{ color: 'var(--text-muted)' }}>Loading map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const handleDistrictClick = useCallback((district: any) => setSelectedDistrict(district), []);

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 64px)', margin: '-32px', overflow: 'hidden' }}>
      <IndiaMap
        selectedMetric={selectedMetric}
        onDistrictClick={handleDistrictClick}
      />
      <MapControls
        selectedMetric={selectedMetric}
        onMetricChange={setSelectedMetric}
      />
      {selectedDistrict && (
        <DistrictPopup
          district={selectedDistrict}
          onClose={() => setSelectedDistrict(null)}
        />
      )}
    </div>
  );
}

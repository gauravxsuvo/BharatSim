'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import MapControls from '@/components/map/MapControls';
import DistrictPopup from '@/components/map/DistrictPopup';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DistrictMetrics } from '@/lib/indiaData';

const IndiaMap = dynamic(() => import('@/components/map/IndiaMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center" style={{ background: '#000000' }}>
      <LoadingSpinner label="Loading map" inverted />
    </div>
  ),
});

export default function MapPage() {
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictMetrics | null>(null);
  const handleDistrictClick = useCallback((district: DistrictMetrics) => setSelectedDistrict(district), []);

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

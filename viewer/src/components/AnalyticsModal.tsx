'use client';

import { useEffect, useState } from 'react';
import { AnalyticsData } from '@/lib/types';

interface AnalyticsModalProps {
  onClose: () => void;
}

export default function AnalyticsModal({ onClose }: AnalyticsModalProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch('/data/analytics.json')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error('Failed to load analytics:', err));
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value', 'Unit'],
      ['Total Buildings', data.totalBuildings, 'units'],
      ['Total Footprint Area', data.totalFootprintAreaM2, 'm²'],
      ['Total Built-up Volume', data.totalBuiltVolumeM3, 'm³'],
      ['Gross Floor Area (GFA)', data.grossFloorAreaM2, 'm²'],
      ['Usable Solar Rooftop Area', data.solar.usableRooftopAreaM2, 'm²'],
      ['Daily Solar Generation', data.solar.dailyGenerationKwh, 'kWh/day'],
      ['Annual Clean Solar Generation', data.solar.annualGenerationMwh, 'MWh/year'],
      ['Annual CO2 Offset', data.solar.annualCo2OffsetTons, 'Metric Tons CO2'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'hyderabad_durgam_cheruvu_urban_analytics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 text-white"
        style={{
          background: 'rgba(12, 18, 36, 0.95)',
          border: '1px solid rgba(0, 245, 255, 0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 60px rgba(0, 245, 255, 0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl">
              📊
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide">
                Hyderabad Digital Twin — Urban Intelligence
              </h2>
              <p className="text-xs text-gray-400">
                3 km² AOI around Durgam Cheruvu & HITEC City · SIH26011
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Total Buildings</p>
            <p className="text-2xl font-bold font-mono text-cyan-400">
              {data.totalBuildings.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">3D Extruded Meshes</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Built-Up Volume</p>
            <p className="text-2xl font-bold font-mono text-emerald-400">
              {(data.totalBuiltVolumeM3 / 1000000).toFixed(2)}M
              <span className="text-xs font-normal text-gray-400 ml-1">m³</span>
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">3D Spatial Density</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Gross Floor Area</p>
            <p className="text-2xl font-bold font-mono text-amber-400">
              {(data.grossFloorAreaM2 / 1000000).toFixed(2)}M
              <span className="text-xs font-normal text-gray-400 ml-1">m²</span>
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">Usable Floor Space</p>
          </div>
        </div>

        {/* Rooftop Solar Clean Energy Potential */}
        <div
          className="rounded-xl p-5 mb-6 border"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 214, 0, 0.08), rgba(255, 109, 0, 0.04))',
            borderColor: 'rgba(255, 214, 0, 0.25)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <h3 className="text-sm font-bold text-yellow-400 tracking-wide">
                  Rooftop Solar & Carbon Offset Potential
                </h3>
                <p className="text-xs text-gray-400">
                  Solar irradiance heuristic for Hyderabad (GHI: 5.5 kWh/m²/day)
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
              GREEN INITIATIVE
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Usable Roof Area</p>
              <p className="text-lg font-bold font-mono text-white mt-0.5">
                {(data.solar.usableRooftopAreaM2 / 1000).toFixed(1)}k{' '}
                <span className="text-xs text-gray-400">m²</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Annual Generation</p>
              <p className="text-lg font-bold font-mono text-yellow-400 mt-0.5">
                {data.solar.annualGenerationMwh.toLocaleString()}{' '}
                <span className="text-xs text-gray-400">MWh/yr</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">CO₂ Abatement</p>
              <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {data.solar.annualCo2OffsetTons.toLocaleString()}{' '}
                <span className="text-xs text-gray-400">Tons/yr</span>
              </p>
            </div>
          </div>
        </div>

        {/* Height Distribution Histogram */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Building Height Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(data.heightBuckets).map(([bucket, count]) => {
              const pct = (count / data.totalBuildings) * 100;
              return (
                <div key={bucket} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300">{bucket}</span>
                    <span className="text-cyan-400 font-semibold">
                      {count.toLocaleString()} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 1.5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-[11px] text-gray-500">
            Powered by OpenStreetMap + Copernicus GLO-30 DSM + SRTM DEM
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <span>📥</span> Export CSV Dataset
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

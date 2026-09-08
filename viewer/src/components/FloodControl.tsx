'use client';

import { useMemo } from 'react';
import { BuildingData } from '@/lib/types';

interface FloodControlProps {
  floodLevel: number;
  onFloodLevelChange: (level: number) => void;
  buildings: BuildingData[];
  onClose: () => void;
}

export default function FloodControl({
  floodLevel,
  onFloodLevelChange,
  buildings,
  onClose,
}: FloodControlProps) {
  // Compute real-time inundated metrics
  const { submergedCount, submergedPercent, affectedPop, commercialCount } = useMemo(() => {
    let count = 0;
    let commercial = 0;
    let totalGfa = 0;

    for (const b of buildings) {
      if (b.baseElevation !== undefined && b.baseElevation <= floodLevel) {
        count++;
        if (b.buildingType === 'commercial' || b.buildingType === 'retail' || b.buildingType === 'office') {
          commercial++;
        }
        totalGfa += (b.coordinates?.length || 4) * 20 * b.estimatedFloors;
      }
    }

    const pct = ((count / Math.max(buildings.length, 1)) * 100).toFixed(1);
    // Rough heuristic: 1 person per 25 m2 residential/work space
    const pop = Math.round(totalGfa / 30);

    return {
      submergedCount: count,
      submergedPercent: pct,
      affectedPop: pop,
      commercialCount: commercial,
    };
  }, [buildings, floodLevel]);

  const riseDelta = floodLevel - 533;

  const severityBadge = useMemo(() => {
    if (riseDelta === 0) return { text: 'BASELINE SAFE', color: '#00e676', bg: 'rgba(0, 230, 118, 0.15)' };
    if (riseDelta < 5) return { text: 'STAGE 1 ADVISORY', color: '#ffea00', bg: 'rgba(255, 234, 0, 0.15)' };
    if (riseDelta < 12) return { text: 'STAGE 2 WARNING', color: '#ff9100', bg: 'rgba(255, 145, 0, 0.15)' };
    return { text: 'STAGE 3 SEVERE FLOOD', color: '#ff1744', bg: 'rgba(255, 23, 68, 0.2)' };
  }, [riseDelta]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-40 rounded-2xl p-5 animate-slide-up"
      style={{
        background: 'rgba(10, 15, 30, 0.92)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(0, 245, 255, 0.25)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 50px rgba(0, 245, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🌊</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white text-sm font-bold tracking-wide">
                Durgam Cheruvu Flood Inundation Simulator
              </h3>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
                style={{ color: severityBadge.color, background: severityBadge.bg }}
              >
                {severityBadge.text}
              </span>
            </div>
            <p className="text-gray-400 text-xs">
              Simulate reservoir overflow impact on surrounding HITEC City terrain
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Slider Control */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400 font-mono">
            Lake Surface Level: <strong className="text-cyan-400 font-bold">{floodLevel.toFixed(1)}m MSL</strong>
          </span>
          <span className="text-amber-400 font-mono font-semibold">
            {riseDelta > 0 ? `+${riseDelta.toFixed(1)}m Water Rise` : 'Normal Baseline'}
          </span>
        </div>
        <input
          type="range"
          min="533"
          max="560"
          step="0.5"
          value={floodLevel}
          onChange={(e) => onFloodLevelChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-400 bg-gray-700"
        />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>533m (Lake Base)</span>
          <span>545m (Bridge Deck)</span>
          <span>560m (Valley Rim)</span>
        </div>
      </div>

      {/* Live Impact Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white/5 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Inundated</p>
          <p className="text-base font-bold font-mono text-red-400">
            {submergedCount} <span className="text-xs text-gray-400">({submergedPercent}%)</span>
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Commercial</p>
          <p className="text-base font-bold font-mono text-amber-400">{commercialCount}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Displaced Pop.</p>
          <p className="text-base font-bold font-mono text-cyan-400">{affectedPop.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Safe Zone</p>
          <p className="text-base font-bold font-mono text-emerald-400">
            {buildings.length - submergedCount}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translate(-50%, 20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}

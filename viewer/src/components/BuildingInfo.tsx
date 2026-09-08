'use client';

import { SelectedBuilding } from '@/lib/types';
import { getColorForHeight } from '@/lib/colors';

interface BuildingInfoProps {
  building: SelectedBuilding | null;
  onClose: () => void;
  onFlyTo?: (building: SelectedBuilding) => void;
}

export default function BuildingInfo({ building, onClose, onFlyTo }: BuildingInfoProps) {
  if (!building) return null;

  const heightColor = getColorForHeight(building.height);
  const baseElev = building.baseElevation ?? 569.0;
  const roofElev = baseElev + building.height;

  // Approximate footprint area in m²
  const estFootprint = (building.coordinates?.length || 4) * 25;
  // Approximate solar potential: 5.5 kWh/m2/day * 0.75 usable * 18% eff
  const dailySolarKwh = (estFootprint * 0.75 * 5.5 * 0.18).toFixed(1);

  return (
    <div
      className="fixed right-4 top-20 w-84 rounded-2xl overflow-hidden z-40 animate-slide-in"
      style={{
        background: 'rgba(10, 15, 32, 0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 245, 255, 0.25)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 50px rgba(0, 245, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, ${heightColor}25, transparent)`,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-[80%]">
          <h3 className="text-white font-bold text-sm tracking-wide truncate">
            {building.name || `Building #${building.osmId || building.id.slice(0, 8)}`}
          </h3>
          <p className="text-gray-400 text-xs mt-0.5 capitalize">
            {building.buildingType !== 'yes' ? building.buildingType : 'General Structure'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          ✕
        </button>
      </div>

      {/* Height graphic & summary */}
      <div className="px-5 py-4">
        <div className="flex items-end gap-3 mb-4">
          <div
            className="w-12 rounded-lg relative"
            style={{
              height: `${Math.max(Math.min(building.height * 1.5, 90), 20)}px`,
              background: `linear-gradient(to top, ${heightColor}88, ${heightColor})`,
              boxShadow: `0 0 20px ${heightColor}55`,
            }}
          >
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-14 h-0.5 rounded"
              style={{ background: heightColor }}
            />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {building.height.toFixed(1)}
              <span className="text-base font-normal text-gray-400 ml-1">m</span>
            </p>
            <p className="text-gray-400 text-xs">
              {building.estimatedFloors} {building.estimatedFloors === 1 ? 'Floor' : 'Floors'} ·{' '}
              {building.heightSource.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Geospatial & Elevation Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <InfoItem label="Base Ground MSL" value={`${baseElev.toFixed(1)}m`} />
          <InfoItem label="Rooftop MSL" value={`${roofElev.toFixed(1)}m`} />
          <InfoItem label="Est. Footprint" value={`~${estFootprint} m²`} />
          <InfoItem label="Solar Potential" value={`~${dailySolarKwh} kWh/d`} highlight />
        </div>

        {/* Action: Fly to building */}
        {onFlyTo && (
          <button
            onClick={() => onFlyTo(building)}
            className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🎯</span> Focus Camera on Building
          </button>
        )}
      </div>

      {/* Footer */}
      {building.osmId && (
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <a
            href={`https://www.openstreetmap.org/way/${building.osmId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1.5 transition-colors"
            style={{ color: '#00f5ff' }}
          >
            <span>↗</span> OpenStreetMap #{building.osmId}
          </a>
          <span className="text-[10px] text-gray-500 font-mono">EPSG:32644</span>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={`text-xs font-mono font-semibold ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

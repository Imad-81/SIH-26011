'use client';

import { useState } from 'react';
import { SelectedBuilding, BuildingCadastreRecord } from '@/lib/types';
import { getColorForHeight } from '@/lib/colors';

interface BuildingInfoProps {
  building: SelectedBuilding | null;
  onClose: () => void;
  onFlyTo?: (building: SelectedBuilding) => void;
  cadastreRecord?: BuildingCadastreRecord | null;
  selectedFloorIndex?: number;
  onSelectFloor?: (floorIndex: number) => void;
  selectedUnitId?: string | null;
  onSelectUnit?: (unitId: string | null) => void;
  isFloorIsolated?: boolean;
  onToggleFloorIsolation?: () => void;
}

function getSourceBadge(source: string): { label: string; color: string; icon: string } {
  switch (source) {
    case 'landmark_registry':
      return { label: 'Architectural Registry', color: '#fbbf24', icon: '🏢' };
    case 'osm_tag':
      return { label: 'OSM Explicit Height', color: '#34d399', icon: '🏷️' };
    case 'osm_levels':
      return { label: 'OSM Levels Data', color: '#60a5fa', icon: '📐' };
    case 'raster_annular':
      return { label: 'Annular DSM Model', color: '#c084fc', icon: '🛰️' };
    case 'morphological_office':
      return { label: 'Corporate IT Typology', color: '#f472b6', icon: '💼' };
    case 'morphological_retail':
      return { label: 'Retail / Mall Scale', color: '#fb923c', icon: '🛍️' };
    case 'morphological_residential':
      return { label: 'GHMC Residential Bylaw', color: '#22d3ee', icon: '🏡' };
    case 'morphological_midrise':
      return { label: 'Mid-Rise Footprint Model', color: '#818cf8', icon: '🏢' };
    case 'morphological_large':
      return { label: 'High-Capacity Campus Scale', color: '#a78bfa', icon: '🏗️' };
    case 'morphological_small':
      return { label: 'Auxiliary Lot', color: '#94a3b8', icon: '🏠' };
    default:
      return { label: source.replace(/_/g, ' '), color: '#cbd5e1', icon: '📍' };
  }
}

export default function BuildingInfo({
  building,
  onClose,
  onFlyTo,
  cadastreRecord,
  selectedFloorIndex = 0,
  onSelectFloor,
  selectedUnitId,
  onSelectUnit,
  isFloorIsolated = false,
  onToggleFloorIsolation,
}: BuildingInfoProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'cadastre' | 'spatial'>('cadastre');

  if (!building) return null;

  const heightColor = getColorForHeight(building.height);
  const baseElev = building.baseElevation ?? 569.0;
  const roofElev = baseElev + building.height;

  // Approximate footprint area in m²
  const estFootprint = (building.coordinates?.length || 4) * 25;
  const dailySolarKwh = (estFootprint * 0.75 * 5.5 * 0.18).toFixed(1);

  // Cadastral data resolution
  const ulpin2d = cadastreRecord?.ulpin2d || building.ulpin2d || '36210501021001';
  const surveyNo = cadastreRecord?.surveyNumber || building.surveyNumber || '64';
  const villageName = cadastreRecord?.villageName || building.villageName || 'Madhapur';
  const floorsCount = cadastreRecord?.totalFloors || building.estimatedFloors || 1;
  const hasFloorPlan = cadastreRecord?.hasFloorPlan || building.hasFloorPlan || false;

  const floorsList = cadastreRecord?.floors || [];
  const currentFloor = floorsList.find((f) => f.floorIndex === selectedFloorIndex) || floorsList[0];
  const unitsOnFloor = currentFloor?.units || [];
  const activeUnit = unitsOnFloor.find((u) => u.unitId === selectedUnitId) || unitsOnFloor[0];

  const activeFloorUlpin = currentFloor?.ulpin3d || `${ulpin2d}-FL${selectedFloorIndex.toString().padStart(2, '0')}`;
  const activeUnitUlpin = activeUnit?.ulpin3d || activeFloorUlpin;

  const handleCopyUlpin = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed right-4 top-20 w-92 max-h-[85vh] rounded-2xl overflow-y-auto z-40 animate-slide-in custom-scrollbar"
      style={{
        background: 'rgba(10, 15, 32, 0.94)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(0, 245, 255, 0.28)',
        boxShadow: '0 16px 44px rgba(0, 0, 0, 0.6), 0 0 50px rgba(0, 245, 255, 0.12)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: `linear-gradient(135deg, ${heightColor}30, rgba(10, 15, 32, 0.98))`,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-[78%]">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              SIH26011 3D ULPIN
            </span>
            {hasFloorPlan && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Floor Plan Mapped
              </span>
            )}
          </div>
          <h3 className="text-white font-bold text-sm tracking-wide truncate">
            {building.name || `Building #${building.osmId || building.id.slice(0, 8)}`}
          </h3>
          <p className="text-gray-400 text-xs truncate">
            Sy. No. {surveyNo}, {villageName} • Serilingampally
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-5 pt-2 bg-black/20">
        <button
          onClick={() => setActiveTab('cadastre')}
          className={`pb-2 text-xs font-semibold tracking-wide transition-all border-b-2 mr-4 ${
            activeTab === 'cadastre'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          🏛️ 3D Cadastre (Bhu-Aadhaar)
        </button>
        <button
          onClick={() => setActiveTab('spatial')}
          className={`pb-2 text-xs font-semibold tracking-wide transition-all border-b-2 ${
            activeTab === 'spatial'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          🛰️ 3D Geometry & Solar
        </button>
      </div>

      {activeTab === 'cadastre' ? (
        <div className="px-5 py-4 space-y-4">
          {/* Official 2D ULPIN Bhu-Aadhaar Card */}
          <div
            className="rounded-xl p-3.5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(16, 185, 129, 0.04))',
              border: '1px solid rgba(0, 245, 255, 0.35)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-wider">
                Government 2D Bhu-Aadhaar (ULPIN)
              </span>
              <button
                onClick={() => handleCopyUlpin(ulpin2d)}
                className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono flex items-center gap-1 transition-all"
                title="Copy 14-digit ULPIN"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <p className="text-base font-mono font-extrabold text-white tracking-wider">
              {ulpin2d}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px] text-gray-300">
              <div className="bg-black/30 rounded p-1 border border-white/5">
                <span className="text-gray-400 block">State/Dist</span>
                <span className="font-semibold text-cyan-200">TS-36 / RR-21</span>
              </div>
              <div className="bg-black/30 rounded p-1 border border-white/5">
                <span className="text-gray-400 block">Survey No</span>
                <span className="font-semibold text-emerald-300">Sy. {surveyNo}</span>
              </div>
              <div className="bg-black/30 rounded p-1 border border-white/5">
                <span className="text-gray-400 block">Village Code</span>
                <span className="font-semibold text-yellow-300">{villageName}</span>
              </div>
            </div>
            {cadastreRecord?.reraId && (
              <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                <span className="text-emerald-400">🛡️ TS-RERA:</span> {cadastreRecord.reraId}
              </div>
            )}
          </div>

          {/* Vertical Property Explorer (Floor Selector) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-200 flex items-center gap-1">
                <span>🏢</span> Vertical Floor Navigator ({floorsCount} Floors)
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Level {selectedFloorIndex}
              </span>
            </div>

            {/* Floor Stepper Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
              {Array.from({ length: floorsCount }).map((_, idx) => {
                const isSelected = selectedFloorIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectFloor?.(idx);
                      // Auto-select first unit on this floor if available
                      const flRec = floorsList.find((f) => f.floorIndex === idx);
                      if (flRec && flRec.units.length > 0) {
                        onSelectUnit?.(flRec.units[0].unitId);
                      } else {
                        onSelectUnit?.(null);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40 scale-105'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                  >
                    {idx === 0 ? 'G' : `F${idx}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Floor Cadastral Record */}
          <div
            className="rounded-xl p-3"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-gray-400">
                Floor-Level 3D ULPIN
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                {currentFloor ? `${currentFloor.zMin}m – ${currentFloor.zMax}m MSL` : `${baseElev.toFixed(1)}m MSL`}
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-cyan-300 break-all select-all">
              {activeFloorUlpin}
            </p>
          </div>

          {/* CASE A: Flat/Unit Level Explorer (for buildings with floor plans) */}
          {hasFloorPlan && unitsOnFloor.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                  <span>📐</span> Floor Plan Units ({unitsOnFloor.length} Units Mapped)
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  ISO 19152 LADM
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {unitsOnFloor.map((unit) => {
                  const isUnitSelected = selectedUnitId === unit.unitId || (!selectedUnitId && unit === activeUnit);
                  return (
                    <div
                      key={unit.unitId}
                      onClick={() => onSelectUnit?.(unit.unitId)}
                      className={`p-2 rounded-xl cursor-pointer transition-all border ${
                        isUnitSelected
                          ? 'bg-emerald-500/15 border-emerald-400/50 shadow-md shadow-emerald-950'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {unit.unitName}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-yellow-300">
                          ~{unit.carpetAreaM2} m²
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] font-mono text-cyan-300 truncate max-w-[70%]">
                          {unit.ulpin3d}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300 uppercase">
                          {unit.unitType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Unit Highlight Card */}
              {activeUnit && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-300">
                      Active Flat 3D ULPIN
                    </span>
                    <button
                      onClick={() => handleCopyUlpin(activeUnitUlpin)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-200 font-mono"
                    >
                      📋 Copy 3D ID
                    </button>
                  </div>
                  <p className="font-mono font-bold text-white text-xs mt-0.5 break-all">
                    {activeUnitUlpin}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-gray-300">
              <p className="flex items-center gap-1.5 text-cyan-300 font-semibold mb-1">
                <span>ℹ️</span> Floor-Level 3D ULPIN Mode
              </p>
              <p className="text-[11px] leading-relaxed text-gray-400">
                This building does not have a registered architectural BIM/floor plan. In compliance with SIH 26011 guidelines, a dedicated 3D ULPIN has been automatically synthesized for each vertical floor slab.
              </p>
            </div>
          )}

          {/* 3D Floor Isolation Action */}
          {onToggleFloorIsolation && (
            <button
              onClick={onToggleFloorIsolation}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                isFloorIsolated
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/40 font-bold'
                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25'
              }`}
            >
              <span>{isFloorIsolated ? '✨' : '🔍'}</span>
              {isFloorIsolated ? 'Exit Floor Isolation Mode' : `Isolate Level ${selectedFloorIndex} in 3D`}
            </button>
          )}
        </div>
      ) : (
        /* Spatial & Geometry Tab */
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
            <div className="flex-1 min-w-0">
              <p className="text-3xl font-extrabold text-white tracking-tight">
                {building.height.toFixed(1)}
                <span className="text-base font-normal text-gray-400 ml-1">m</span>
              </p>
              <p className="text-gray-300 text-xs font-semibold">
                {building.estimatedFloors} {building.estimatedFloors === 1 ? 'Storey' : 'Storeys'}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold border inline-flex items-center gap-1 truncate max-w-full"
                  style={{
                    color: getSourceBadge(building.heightSource).color,
                    borderColor: `${getSourceBadge(building.heightSource).color}55`,
                    backgroundColor: `${getSourceBadge(building.heightSource).color}15`,
                  }}
                  title={getSourceBadge(building.heightSource).label}
                >
                  <span>{getSourceBadge(building.heightSource).icon}</span>
                  <span className="truncate">{getSourceBadge(building.heightSource).label}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <InfoItem label="Base Ground MSL" value={`${baseElev.toFixed(1)}m`} />
            <InfoItem label="Rooftop MSL" value={`${roofElev.toFixed(1)}m`} />
            <InfoItem label="Est. Footprint" value={`~${estFootprint} m²`} />
            <InfoItem label="Solar Potential" value={`~${dailySolarKwh} kWh/d`} highlight />
          </div>

          {onFlyTo && (
            <button
              onClick={() => onFlyTo(building)}
              className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>🎯</span> Focus Camera on Building
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className="px-5 py-2.5 flex items-center justify-between text-[10px] text-gray-400"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span>Department of Land Resources (DoLR)</span>
        <span className="text-cyan-400 font-mono">EPSG:32644</span>
      </div>

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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 245, 255, 0.3);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xs font-mono font-semibold ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Building2,
  Layers,
  MapPin,
  Compass,
  Sun,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Grid3X3,
  LandPlot,
  Mountain,
  ChevronLeft,
  ChevronRight,
  FileText,
  BadgeCheck,
} from 'lucide-react';
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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
  const mandalName = cadastreRecord?.mandalName || 'Serilingampally';
  const districtName = cadastreRecord?.districtName || 'Ranga Reddy';
  const floorsCount = Math.max(1, cadastreRecord?.totalFloors || building.estimatedFloors || 1);
  const hasFloorPlan = cadastreRecord?.hasFloorPlan || building.hasFloorPlan || false;

  const floorsList = cadastreRecord?.floors || [];
  const currentFloor = floorsList.find((f) => f.floorIndex === selectedFloorIndex) || floorsList[0];
  const unitsOnFloor = currentFloor?.units || [];
  const activeUnit = unitsOnFloor.find((u) => u.unitId === selectedUnitId) || unitsOnFloor[0];

  const activeFloorUlpin = currentFloor?.ulpin3d || `${ulpin2d}-FL${selectedFloorIndex.toString().padStart(2, '0')}`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handlePrevFloor = () => {
    if (selectedFloorIndex > 0) {
      const nextIdx = selectedFloorIndex - 1;
      onSelectFloor?.(nextIdx);
      const flRec = floorsList.find((f) => f.floorIndex === nextIdx);
      if (flRec && flRec.units.length > 0) {
        onSelectUnit?.(flRec.units[0].unitId);
      } else {
        onSelectUnit?.(null);
      }
    }
  };

  const handleNextFloor = () => {
    if (selectedFloorIndex < floorsCount - 1) {
      const nextIdx = selectedFloorIndex + 1;
      onSelectFloor?.(nextIdx);
      const flRec = floorsList.find((f) => f.floorIndex === nextIdx);
      if (flRec && flRec.units.length > 0) {
        onSelectUnit?.(flRec.units[0].unitId);
      } else {
        onSelectUnit?.(null);
      }
    }
  };

  return (
    <div
      className="fixed right-5 top-20 w-[425px] max-w-[calc(100vw-2rem)] max-h-[86vh] rounded-3xl overflow-hidden z-40 animate-slide-in flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(11, 16, 33, 0.96) 0%, rgba(7, 10, 22, 0.98) 100%)',
        backdropFilter: 'blur(32px) saturate(190%)',
        WebkitBackdropFilter: 'blur(32px) saturate(190%)',
        border: '1px solid rgba(56, 189, 248, 0.22)',
        boxShadow:
          '0 24px 60px -15px rgba(0, 0, 0, 0.8), 0 0 45px rgba(6, 182, 212, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
      }}
    >
      {/* Header Bar */}
      <div
        className="px-5 pt-4 pb-3.5 relative z-10 shrink-0"
        style={{
          background: `linear-gradient(135deg, ${heightColor}25, rgba(11, 16, 33, 0.98))`,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                SIH26011 3D ULPIN
              </span>
              {hasFloorPlan ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Floor Plan Mapped
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                  Volumetric 3D
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-white font-bold text-base tracking-tight leading-snug break-words">
              {building.name || `Building #${building.osmId || building.id.slice(0, 8)}`}
            </h3>

            {/* Subtitle / Location */}
            <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1 truncate">
              <MapPin size={12} className="text-cyan-400 shrink-0" />
              <span>
                Sy. No. {surveyNo}, {villageName} • {mandalName}
              </span>
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close building inspector"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="px-5 pt-3 pb-1 shrink-0">
        <div className="p-1 bg-slate-900/70 rounded-2xl border border-white/[0.08] flex gap-1">
          <button
            onClick={() => setActiveTab('cadastre')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'cadastre'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 border border-cyan-500/35 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <span>🏛️</span>
            <span>3D Cadastre (Bhu-Aadhaar)</span>
          </button>
          <button
            onClick={() => setActiveTab('spatial')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'spatial'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 border border-cyan-500/35 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <span>📡</span>
            <span>Geometry & Solar</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 custom-scrollbar">
        {activeTab === 'cadastre' ? (
          <>
            {/* Official 2D Bhu-Aadhaar (ULPIN) Card */}
            <div className="rounded-2xl p-4 relative overflow-hidden bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-950/80 border border-cyan-500/25 shadow-lg">
              {/* Subtle decorative glow accent */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <LandPlot size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold tracking-wider">
                    Official 2D Bhu-Aadhaar (ULPIN)
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(ulpin2d, 'ulpin2d')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copy 14-digit 2D ULPIN"
                >
                  {copiedKey === 'ulpin2d' ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-300 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* 14-Digit ULPIN Code */}
              <p className="text-lg font-mono font-extrabold text-white tracking-widest my-2 select-all break-all">
                {ulpin2d}
              </p>

              {/* 3-Column Metadata Grid */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-950/50 rounded-xl p-2.5 border border-white/[0.06] flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                    State / Dist
                  </span>
                  <span className="font-semibold text-cyan-200 truncate">
                    TS-36 / RR-21
                  </span>
                </div>
                <div className="bg-slate-950/50 rounded-xl p-2.5 border border-white/[0.06] flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                    Survey No
                  </span>
                  <span className="font-semibold text-emerald-300 truncate">
                    Sy. {surveyNo}
                  </span>
                </div>
                <div className="bg-slate-950/50 rounded-xl p-2.5 border border-white/[0.06] flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                    Village Code
                  </span>
                  <span className="font-semibold text-amber-300 truncate">
                    {villageName}
                  </span>
                </div>
              </div>

              {/* Verified TS-RERA / PTIN Credentials */}
              {(cadastreRecord?.reraId || cadastreRecord?.ptinGhmc) && (
                <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-300">
                  {cadastreRecord.reraId && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-slate-400">TS-RERA:</span>
                      <span className="font-mono font-semibold">{cadastreRecord.reraId}</span>
                    </div>
                  )}
                  {cadastreRecord.ptinGhmc && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400 font-mono text-[10px]">
                      <FileText size={11} className="text-cyan-400 shrink-0" />
                      <span>PTIN: {cadastreRecord.ptinGhmc}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vertical Floor Navigator Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Layers size={14} className="text-cyan-400" />
                  <span>Vertical Floor Navigator</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevFloor}
                    disabled={selectedFloorIndex <= 0}
                    className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Previous Floor"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-[11px] font-mono text-cyan-300 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/50">
                    Floor {selectedFloorIndex} of {floorsCount - 1}
                  </span>
                  <button
                    onClick={handleNextFloor}
                    disabled={selectedFloorIndex >= floorsCount - 1}
                    className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Next Floor"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Floor Stepper Carousel Pills */}
              <div className="flex gap-2 overflow-x-auto py-1 px-0.5 custom-scrollbar">
                {Array.from({ length: floorsCount }).map((_, idx) => {
                  const isSelected = selectedFloorIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectFloor?.(idx);
                        const flRec = floorsList.find((f) => f.floorIndex === idx);
                        if (flRec && flRec.units.length > 0) {
                          onSelectUnit?.(flRec.units[0].unitId);
                        } else {
                          onSelectUnit?.(null);
                        }
                      }}
                      className={`min-w-[42px] h-9 px-3 rounded-xl text-xs font-mono font-bold transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300 scale-105'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {idx === 0 ? 'G' : `F${idx}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Floor Cadastral Record Banner */}
            <div className="rounded-2xl p-3.5 bg-slate-900/50 border border-cyan-500/20 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Floor 3D ULPIN • Level {selectedFloorIndex}
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/60 shrink-0">
                  {currentFloor ? `${currentFloor.zMin}m – ${currentFloor.zMax}m MSL` : `${baseElev.toFixed(1)}m MSL`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-mono font-bold text-cyan-300 break-all select-all">
                  {activeFloorUlpin}
                </p>
                <button
                  onClick={() => handleCopy(activeFloorUlpin, 'floorUlpin')}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 hover:text-cyan-100 font-mono flex items-center gap-1 shrink-0 cursor-pointer transition-all"
                  title="Copy Floor ULPIN"
                >
                  {copiedKey === 'floorUlpin' ? (
                    <>
                      <Check size={11} className="text-emerald-400" />
                      <span className="text-emerald-300 text-[10px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Floor Plan Units (LADM ISO 19152) */}
            {hasFloorPlan && unitsOnFloor.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Grid3X3 size={14} />
                    <span>Floor Plan Units ({unitsOnFloor.length} Units Mapped)</span>
                  </span>
                  <span className="text-[10px] text-emerald-400/90 font-mono px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/20">
                    ISO 19152 LADM
                  </span>
                </div>

                {/* Unit Cards List */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {unitsOnFloor.map((unit) => {
                    const isUnitSelected =
                      selectedUnitId === unit.unitId || (!selectedUnitId && unit === activeUnit);
                    const unitCopyKey = `unit_${unit.unitId}`;

                    return (
                      <div
                        key={unit.unitId}
                        onClick={() => onSelectUnit?.(unit.unitId)}
                        className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                          isUnitSelected
                            ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-400/60 ring-1 ring-emerald-400/30 shadow-md shadow-emerald-950/40'
                            : 'bg-slate-900/40 border-white/[0.06] hover:bg-slate-800/60 hover:border-white/[0.14] text-slate-300'
                        }`}
                      >
                        {/* Top Line: Selection Indicator + Title + Area Pill */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                                isUnitSelected
                                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400 ring-2 ring-emerald-400/30'
                                  : 'bg-slate-600'
                              }`}
                            />
                            <span className="text-xs font-semibold text-white truncate">
                              {unit.unitName}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 shrink-0">
                            ~{unit.carpetAreaM2} m²
                          </span>
                        </div>

                        {/* Middle Line: Unit 3D ULPIN Code + Copy + Type */}
                        <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/[0.05]">
                          <span className="text-[10px] font-mono text-cyan-300/90 truncate max-w-[62%]">
                            {unit.ulpin3d}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(unit.ulpin3d, unitCopyKey);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white font-mono flex items-center gap-1 transition-all"
                              title="Copy unit 3D ULPIN"
                            >
                              {copiedKey === unitCopyKey ? (
                                <Check size={10} className="text-emerald-400" />
                              ) : (
                                <Copy size={10} />
                              )}
                            </button>
                            <span className="text-[9px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300">
                              {unit.unitType.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Extra Unit Details if selected */}
                        {isUnitSelected && (unit.bedrooms || unit.facing || unit.status) && (
                          <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-emerald-500/20 text-[10px] text-emerald-200/90">
                            {unit.bedrooms && <span>🛏️ {unit.bedrooms} BHK</span>}
                            {unit.facing && <span>🧭 {unit.facing}</span>}
                            {unit.status && (
                              <span className="inline-flex items-center gap-1 text-emerald-300">
                                <BadgeCheck size={12} />
                                {unit.status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-slate-300 space-y-1.5">
                <p className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Sparkles size={13} />
                  <span>Floor-Level 3D ULPIN Mode</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  This building does not have a registered architectural BIM/floor plan. In compliance with SIH 26011 guidelines, a dedicated 3D ULPIN has been automatically synthesized for each vertical floor slab.
                </p>
              </div>
            )}
          </>
        ) : (
          /* Spatial & Geometry Tab */
          <div className="space-y-4">
            {/* Building Height Hero */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/[0.08] flex items-center gap-4">
              <div
                className="w-12 rounded-xl relative shrink-0"
                style={{
                  height: `${Math.max(Math.min(building.height * 1.5, 90), 28)}px`,
                  background: `linear-gradient(to top, ${heightColor}88, ${heightColor})`,
                  boxShadow: `0 0 24px ${heightColor}66`,
                }}
              >
                <div
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full"
                  style={{ background: heightColor }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-extrabold text-white tracking-tight">
                    {building.height.toFixed(1)}
                  </p>
                  <span className="text-sm font-medium text-slate-400">m height</span>
                </div>
                <p className="text-slate-300 text-xs font-semibold mt-0.5">
                  {building.estimatedFloors} {building.estimatedFloors === 1 ? 'Storey' : 'Storeys'}
                </p>
                <div className="mt-2">
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full font-semibold border inline-flex items-center gap-1.5 truncate max-w-full"
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

            {/* Metric Items Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <InfoItem
                icon={<Mountain size={14} className="text-cyan-400" />}
                label="Base Ground MSL"
                value={`${baseElev.toFixed(1)}m`}
              />
              <InfoItem
                icon={<Building2 size={14} className="text-blue-400" />}
                label="Rooftop MSL"
                value={`${roofElev.toFixed(1)}m`}
              />
              <InfoItem
                icon={<LandPlot size={14} className="text-emerald-400" />}
                label="Est. Footprint"
                value={`~${estFootprint} m²`}
              />
              <InfoItem
                icon={<Sun size={14} className="text-amber-400" />}
                label="Solar Potential"
                value={`~${dailySolarKwh} kWh/d`}
                highlight
              />
            </div>

            {/* Camera Fly-to Action */}
            {onFlyTo && (
              <button
                onClick={() => onFlyTo(building)}
                className="w-full py-3 px-4 rounded-2xl text-xs font-semibold text-cyan-200 bg-cyan-500/15 border border-cyan-500/35 hover:bg-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <Compass size={15} />
                <span>Focus Camera on Building</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action: 3D Floor Isolation (Cadastre tab) */}
      {activeTab === 'cadastre' && onToggleFloorIsolation && (
        <div className="px-5 py-2.5 border-t border-white/[0.06] bg-slate-950/40 shrink-0">
          <button
            onClick={onToggleFloorIsolation}
            className={`w-full py-2.5 px-4 rounded-2xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              isFloorIsolated
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-amber-500/30 hover:brightness-105 active:scale-[0.99]'
                : 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 border border-cyan-500/40 shadow-cyan-950/50 hover:border-cyan-400/60 active:scale-[0.99]'
            }`}
          >
            {isFloorIsolated ? (
              <>
                <EyeOff size={14} />
                <span>Exit Floor Isolation Mode</span>
              </>
            ) : (
              <>
                <Layers size={14} />
                <span>Isolate Level {selectedFloorIndex} in 3D</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer Credentials */}
      <div
        className="px-5 py-2.5 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 shrink-0"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <span className="flex items-center gap-1.5">
          <span>🇮🇳</span>
          <span>Department of Land Resources (DoLR)</span>
        </span>
        <span className="text-cyan-400 font-mono font-medium">EPSG:32644</span>
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
          animation: slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.25);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.45);
        }
      `}</style>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl p-3 bg-slate-950/40 border border-white/[0.06] flex flex-col justify-between">
      <div className="flex items-center gap-1.5 mb-1 text-slate-400">
        {icon}
        <span className="text-[10px] uppercase font-semibold tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-mono font-bold ${highlight ? 'text-amber-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

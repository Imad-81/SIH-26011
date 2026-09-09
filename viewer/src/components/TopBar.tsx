'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { BuildingData, RenderMode, TimeOfDay } from '@/lib/types';
import { CAMERA_PRESETS } from './CameraController';

interface TopBarProps {
  buildings: BuildingData[];
  renderMode: RenderMode;
  onRenderModeChange: (mode: RenderMode) => void;
  timeOfDay: TimeOfDay;
  onTimeOfDayChange: (time: TimeOfDay) => void;
  isTourActive: boolean;
  onToggleTour: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  showRoads?: boolean;
  onToggleRoads?: () => void;
  showTraffic?: boolean;
  onToggleTraffic?: () => void;
  onSelectPreset: (presetKey: string) => void;
  onSelectBuilding: (building: BuildingData) => void;
  onOpenAnalytics: () => void;
  floodControlOpen: boolean;
  onToggleFloodControl: () => void;
}

export default function TopBar({
  buildings,
  renderMode,
  onRenderModeChange,
  timeOfDay,
  onTimeOfDayChange,
  isTourActive,
  onToggleTour,
  autoRotate,
  onToggleAutoRotate,
  showRoads = true,
  onToggleRoads,
  showTraffic = true,
  onToggleTraffic,
  onSelectPreset,
  onSelectBuilding,
  onOpenAnalytics,
  floodControlOpen,
  onToggleFloodControl,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const q = searchQuery.toLowerCase().trim();

    // Support height filter like >30 or >50
    if (q.startsWith('>')) {
      const minH = parseFloat(q.slice(1));
      if (!isNaN(minH)) {
        return buildings
          .filter((b) => b.height >= minH)
          .sort((a, b) => b.height - a.height)
          .slice(0, 10);
      }
    }

    const results: BuildingData[] = [];
    for (let i = 0; i < buildings.length && results.length < 10; i++) {
      const b = buildings[i];
      const nameMatch = b.name && b.name.toLowerCase().includes(q);
      const typeMatch = b.buildingType && b.buildingType.toLowerCase().includes(q);
      const idMatch = b.osmId && b.osmId.toString().includes(q);
      const ulpinMatch = b.ulpin2d && b.ulpin2d.toLowerCase().includes(q);
      const surveyMatch = b.surveyNumber && (b.surveyNumber.toLowerCase().includes(q) || q.includes(b.surveyNumber.toLowerCase()));
      const ulpin3dMatch = b.ulpin3dSample && b.ulpin3dSample.toLowerCase().includes(q);
      if (nameMatch || typeMatch || idMatch || ulpinMatch || surveyMatch || ulpin3dMatch) {
        results.push(b);
      }
    }
    return results;
  }, [searchQuery, buildings]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPresetsOpen(false);
        setModesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
      {/* Left: Branding & Status */}
      <div
        className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-2xl"
        style={{
          background: 'rgba(10, 15, 32, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 245, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(0, 128, 255, 0.2))',
            border: '1px solid rgba(0, 245, 255, 0.4)',
          }}
        >
          🏙️
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-white text-xs font-bold tracking-wider font-mono">
              SIH<span className="text-cyan-400">26011</span>
            </h1>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">
            Hyderabad 100 km² Digital Twin · 68K Buildings
          </p>
        </div>
      </div>

      {/* Middle: Search Bar */}
      <div className="pointer-events-auto relative w-72 max-w-sm">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
          style={{
            background: 'rgba(10, 15, 32, 0.88)',
            backdropFilter: 'blur(20px)',
            border: searchFocused
              ? '1px solid rgba(0, 245, 255, 0.6)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: searchFocused
              ? '0 0 20px rgba(0, 245, 255, 0.2)'
              : '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search Qualcomm, 2D/3D ULPIN, Sy No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="w-full bg-transparent text-white placeholder-gray-500 outline-none text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchFocused && searchResults.length > 0 && (
          <div
            className="absolute top-11 left-0 right-0 rounded-xl overflow-hidden z-50 animate-fade-in"
            style={{
              background: 'rgba(10, 15, 32, 0.96)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(0, 245, 255, 0.25)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            }}
          >
            {searchResults.map((b) => (
              <div
                key={b.id}
                onMouseDown={() => {
                  onSelectBuilding(b);
                  setSearchQuery(b.name || `Building #${b.osmId}`);
                }}
                className="px-3.5 py-2 hover:bg-cyan-500/15 cursor-pointer border-b border-white/5 transition-colors flex items-center justify-between"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-xs font-semibold text-white truncate">
                    {b.name || `Building #${b.osmId || b.id.slice(0, 8)}`}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                    {b.surveyNumber && (
                      <span className="text-emerald-400 font-mono">Sy.{b.surveyNumber}</span>
                    )}
                    {b.ulpin2d && (
                      <span className="font-mono text-cyan-400/80 truncate max-w-[110px]">{b.ulpin2d}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-cyan-400 block">
                    {b.height.toFixed(1)}m
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {b.estimatedFloors} fl
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Controls & Tools */}
      <div
        ref={dropdownRef}
        className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl"
        style={{
          background: 'rgba(10, 15, 32, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 245, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Time of Day Toggle */}
        <div className="flex bg-white/5 rounded-xl p-1 gap-1 border border-white/5">
          {(['dawn', 'day', 'dusk', 'night'] as TimeOfDay[]).map((t) => (
            <button
              key={t}
              onClick={() => onTimeOfDayChange(t)}
              title={t.toUpperCase()}
              className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-all ${
                timeOfDay === t
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t === 'dawn' ? '🌅' : t === 'day' ? '☀️' : t === 'dusk' ? '🌇' : '🌃'}
            </button>
          ))}
        </div>

        {/* Render Mode Selector Button */}
        <div className="relative">
          <button
            onClick={() => setModesOpen(!modesOpen)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
          >
            <span>🎨</span>
            <span className="capitalize">{renderMode}</span>
            <span className="text-[10px] text-gray-400">▾</span>
          </button>

          {modesOpen && (
            <div
              className="absolute top-10 right-0 w-44 rounded-xl overflow-hidden z-50 py-1"
              style={{
                background: 'rgba(10, 15, 32, 0.96)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 245, 255, 0.25)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              }}
            >
              {[
                { key: 'height', label: 'Height Spectrum', icon: '🎨' },
                { key: 'type', label: 'Land Use / Type', icon: '🏢' },
                { key: 'quality', label: 'Copernicus Source', icon: '🛰️' },
                { key: 'solar', label: 'Rooftop Solar', icon: '⚡' },
                { key: 'xray', label: 'X-Ray Wireframe', icon: '🌐' },
                { key: 'flood', label: 'Flood Risk Inundation', icon: '🌊' },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    onRenderModeChange(m.key as RenderMode);
                    setModesOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-cyan-500/15 transition-colors ${
                    renderMode === m.key ? 'text-cyan-300 font-bold bg-cyan-500/10' : 'text-gray-300'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Camera Presets Selector */}
        <div className="relative">
          <button
            onClick={() => setPresetsOpen(!presetsOpen)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
          >
            <span>📷</span>
            <span>Views</span>
            <span className="text-[10px] text-gray-400">▾</span>
          </button>

          {presetsOpen && (
            <div
              className="absolute top-10 right-0 w-48 rounded-xl overflow-hidden z-50 py-1"
              style={{
                background: 'rgba(10, 15, 32, 0.96)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 245, 255, 0.25)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              }}
            >
              {Object.entries(CAMERA_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => {
                    onSelectPreset(key);
                    setPresetsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:text-cyan-300 hover:bg-cyan-500/15 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Drone Flythrough Tour Button */}
        <button
          onClick={onToggleTour}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            isTourActive
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm animate-pulse'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>🚁</span>
          <span>{isTourActive ? 'Stop Tour' : 'Drone Tour'}</span>
        </button>

        {/* Auto Orbit */}
        <button
          onClick={onToggleAutoRotate}
          title="Toggle Continuous Orbit"
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            autoRotate
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          🔄
        </button>

        {/* Roads & Flyovers Toggle */}
        {onToggleRoads && (
          <button
            onClick={onToggleRoads}
            title="Toggle 3D Road Network & Elevated Flyovers"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              showRoads
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <span>🛣️</span>
            <span>Roads</span>
          </button>
        )}

        {/* Traffic Flow Animation Toggle */}
        {onToggleTraffic && (
          <button
            onClick={onToggleTraffic}
            title="Toggle Live Traffic Stream Animation"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              showTraffic
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <span>⚡</span>
            <span>Traffic</span>
          </button>
        )}

        {/* Flood Risk Toggle */}
        <button
          onClick={onToggleFloodControl}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            floodControlOpen || renderMode === 'flood'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>🌊</span>
          <span>Flood Sim</span>
        </button>

        {/* Urban Analytics & Solar */}
        <button
          onClick={onOpenAnalytics}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 transition-all flex items-center gap-1.5"
        >
          <span>📊</span>
          <span>Analytics</span>
        </button>
      </div>
    </header>
  );
}

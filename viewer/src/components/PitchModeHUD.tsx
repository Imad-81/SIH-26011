'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AnalyticsData, RenderMode } from '@/lib/types';

interface PitchModeHUDProps {
  cityName: string;
  buildingCount: number;
  pitchPaused: boolean;
  onTogglePause: () => void;
  renderMode: RenderMode;
  onSelectRenderMode: (mode: RenderMode) => void;
  onExit: () => void;
  cityId?: string | null;
}

export default function PitchModeHUD({
  cityName,
  buildingCount,
  pitchPaused,
  onTogglePause,
  renderMode,
  onSelectRenderMode,
  onExit,
  cityId,
}: PitchModeHUDProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Load analytics for current city
  useEffect(() => {
    const url = cityId ? `/data/cities/${cityId}/analytics.json` : '/data/analytics.json';
    fetch(url)
      .then((res) => {
        if (!res.ok && cityId) {
          return fetch('/data/analytics.json');
        }
        return res;
      })
      .then((res) => res.json())
      .then((data: AnalyticsData) => setAnalytics(data))
      .catch((err) => console.warn('Could not load pitch mode analytics:', err));
  }, [cityId]);

  // Target values for counters
  const targetMetrics = useMemo(() => {
    if (analytics) {
      return {
        volumeM3: analytics.totalBuiltVolumeM3,
        ulpins3d: analytics.cadastre?.total3DVerticalParcels ?? buildingCount * 5,
        solarMwh: analytics.solar.annualGenerationMwh,
        co2Tons: analytics.solar.annualCo2OffsetTons,
      };
    }
    // Fallback estimates if analytics still loading
    const isMumbai = (cityId || '').toLowerCase().includes('mumbai');
    if (isMumbai) {
      return {
        volumeM3: 8240000,
        ulpins3d: 480,
        solarMwh: 18400,
        co2Tons: 15088,
      };
    }
    return {
      volumeM3: 60374288,
      ulpins3d: 22761,
      solarMwh: 429343,
      co2Tons: 352062,
    };
  }, [analytics, cityId]);

  // Smooth Counter Roll-up Animation (0 -> target)
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    setAnimatedProgress(0);
    const duration = 1400; // ms
    const startTime = performance.now();

    let animationFrameId: number;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedProgress(eased);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetMetrics]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePause();
      } else if (e.key === '1') {
        e.preventDefault();
        onSelectRenderMode(renderMode === 'type' ? 'height' : 'type');
      } else if (e.key === '2') {
        e.preventDefault();
        onSelectRenderMode(renderMode === 'flood' ? 'height' : 'flood');
      } else if (e.key === '3') {
        e.preventDefault();
        onSelectRenderMode(renderMode === 'solar' ? 'height' : 'solar');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePause, onSelectRenderMode, onExit, renderMode]);

  // Interpolated display values
  const currentVolume = targetMetrics.volumeM3 * animatedProgress;
  const currentUlpins = Math.round(targetMetrics.ulpins3d * animatedProgress);
  const currentSolarGwh = (targetMetrics.solarMwh * animatedProgress) / 1000.0;
  const currentCo2 = Math.round(targetMetrics.co2Tons * animatedProgress);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-6">
      {/* Top Presentation Bar */}
      <div className="w-full flex items-center justify-between">
        {/* Left: Pitch Mode Live Badge */}
        <div
          className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{
            background: 'rgba(10, 15, 32, 0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(168, 85, 247, 0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
              PITCH MODE
            </span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-sm">🏙️</span>
            <span className="text-xs font-semibold text-white tracking-wide">
              {cityName}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {buildingCount.toLocaleString()} High-Rise Parcels
            </span>
          </div>
        </div>

        {/* Center: Live Shortcuts Quick Reference */}
        <div
          className="pointer-events-auto hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl"
          style={{
            background: 'rgba(10, 15, 32, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 245, 255, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              pitchPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded">Space</kbd>
            <span>{pitchPaused ? '▶️ Resume Orbit' : '⏸️ Pause Orbit'}</span>
          </button>

          <button
            onClick={() => onSelectRenderMode(renderMode === 'type' ? 'height' : 'type')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              renderMode === 'type'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded">1</kbd>
            <span>📐 Cadastre Land Use</span>
          </button>

          <button
            onClick={() => onSelectRenderMode(renderMode === 'flood' ? 'height' : 'flood')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              renderMode === 'flood'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded">2</kbd>
            <span>🌊 Flood Inundation</span>
          </button>

          <button
            onClick={() => onSelectRenderMode(renderMode === 'solar' ? 'height' : 'solar')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              renderMode === 'solar'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                : 'bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded">3</kbd>
            <span>⚡ Solar Rooftop PV</span>
          </button>
        </div>

        {/* Right: Exit Pitch Mode */}
        <button
          onClick={onExit}
          className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold text-gray-200 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:border-rose-500/70 shadow-lg transition-all"
        >
          <span>✕ Exit Pitch</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded text-gray-300">
            ESC
          </kbd>
        </button>
      </div>

      {/* Bottom Cinematic Presentation Metrics Deck */}
      <div className="w-full flex justify-center">
        <div
          className="pointer-events-auto grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 rounded-3xl max-w-5xl w-full"
          style={{
            background: 'rgba(8, 12, 28, 0.94)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(0, 245, 255, 0.3)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 245, 255, 0.15)',
          }}
        >
          {/* Metric 1: Total Built Volume */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between group hover:border-cyan-400/40 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-semibold tracking-wider">
                Total Built Volume
              </span>
              <span className="text-base">📦</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-cyan-300 tracking-tight">
                {(currentVolume / 1000000).toFixed(1)}M
              </span>
              <span className="text-xs font-mono text-gray-400 font-medium">m³</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              3D Extruded Digital Twin
            </p>
          </div>

          {/* Metric 2: 3D Vertical ULPINs */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between group hover:border-indigo-400/40 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-semibold tracking-wider">
                3D Vertical ULPINs
              </span>
              <span className="text-base">📐</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-indigo-300 tracking-tight">
                {currentUlpins.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-gray-400 font-medium">Parcels</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              DoLR Bhu-Aadhaar Compliant
            </p>
          </div>

          {/* Metric 3: Clean Solar PV Potential */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between group hover:border-yellow-400/40 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-semibold tracking-wider">
                Rooftop Solar PV
              </span>
              <span className="text-base">⚡</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-yellow-300 tracking-tight">
                {currentSolarGwh.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-gray-400 font-medium">GWh/yr</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Est. Clean Energy Harvest
            </p>
          </div>

          {/* Metric 4: Annual CO2 Offset */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between group hover:border-emerald-400/40 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-semibold tracking-wider">
                CO₂ Abatement
              </span>
              <span className="text-base">🌱</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-emerald-300 tracking-tight">
                {currentCo2.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-gray-400 font-medium">Tons</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Annual Carbon Footprint Saved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

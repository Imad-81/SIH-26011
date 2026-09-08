'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useBuildingData } from '@/hooks/useBuildingData';
import { SelectedBuilding, LandmarkData, RenderMode, TimeOfDay, BuildingData } from '@/lib/types';
import LoadingScreen from '@/components/LoadingScreen';
import BuildingInfo from '@/components/BuildingInfo';
import LandmarkModal from '@/components/LandmarkModal';
import Legend from '@/components/Legend';
import TopBar from '@/components/TopBar';
import FloodControl from '@/components/FloodControl';
import AnalyticsModal from '@/components/AnalyticsModal';
import { CAMERA_PRESETS } from '@/components/CameraController';
import { SCALE } from '@/lib/geo';

// Dynamic import for Scene to avoid SSR issues with Three.js
const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const { buildings, terrain, loading, error, progress } = useBuildingData();
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<LandmarkData | null>(null);
  const [legendVisible, setLegendVisible] = useState(true);
  const [loadingComplete, setLoadingComplete] = useState(false);

  // Advanced Visual & Simulation States
  const [renderMode, setRenderMode] = useState<RenderMode>('height');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('night');
  const [floodLevelMeters, setFloodLevelMeters] = useState(533.0);
  const [floodControlOpen, setFloodControlOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  // Camera flight targets
  const [cameraTargetPos, setCameraTargetPos] = useState<[number, number, number] | null>(null);
  const [cameraLookAt, setCameraLookAt] = useState<[number, number, number] | null>(null);

  const handleLoadingComplete = useCallback(() => {
    setLoadingComplete(true);
  }, []);

  const handleBuildingSelect = useCallback((building: SelectedBuilding | null) => {
    setSelectedBuilding(building);
    if (building) setSelectedLandmark(null);
  }, []);

  const handleLandmarkSelect = useCallback((landmark: LandmarkData) => {
    setSelectedLandmark(landmark);
    setSelectedBuilding(null);
    setCameraTargetPos(landmark.cameraPos);
    setCameraLookAt(landmark.target);
  }, []);

  const handleFlyToBuilding = useCallback((b: BuildingData) => {
    const coords = b.coordinates;
    if (coords && coords.length > 0) {
      let cx = 0,
        cy = 0;
      for (const [x, y] of coords) {
        cx += x;
        cy += y;
      }
      cx = (cx / coords.length) * SCALE;
      cy = (cy / coords.length) * SCALE;
      const h = b.height * SCALE;

      setCameraTargetPos([cx + 60, h + 50, -cy + 60]);
      setCameraLookAt([cx, h / 2, -cy]);
    }
  }, []);

  const handleSelectPreset = useCallback((key: string) => {
    const preset = CAMERA_PRESETS[key];
    if (preset) {
      setIsTourActive(false);
      setCameraTargetPos(preset.camPos);
      setCameraLookAt(preset.target);
    }
  }, []);

  const handleToggleFlood = useCallback(() => {
    setFloodControlOpen((prev) => {
      const next = !prev;
      if (next) {
        setRenderMode('flood');
      } else if (renderMode === 'flood') {
        setRenderMode('height');
      }
      return next;
    });
  }, [renderMode]);

  const handleRenderModeChange = useCallback((mode: RenderMode) => {
    setRenderMode(mode);
    if (mode === 'flood') {
      setFloodControlOpen(true);
    }
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="glass-panel p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-white text-lg font-semibold mb-2">Data Not Found</h2>
          <p className="text-gray-400 text-sm mb-4">
            Could not load building data. Make sure you&apos;ve run the pipeline first:
          </p>
          <code
            className="block text-xs px-4 py-3 rounded-lg font-mono"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#00f5ff' }}
          >
            python scripts/pipeline.py
          </code>
          <p className="text-gray-500 text-xs mt-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden relative">
      {/* Loading screen */}
      {(loading || !loadingComplete) && (
        <LoadingScreen progress={progress} onComplete={handleLoadingComplete} />
      )}

      {/* 3D Scene */}
      {buildings && loadingComplete && (
        <div className="scene-container">
          <Scene
            data={buildings}
            terrain={terrain}
            renderMode={renderMode}
            timeOfDay={timeOfDay}
            floodLevelMeters={floodLevelMeters}
            isTourActive={isTourActive}
            onTourEnd={() => setIsTourActive(false)}
            autoRotate={autoRotate}
            cameraTargetPos={cameraTargetPos}
            cameraLookAt={cameraLookAt}
            onBuildingSelect={handleBuildingSelect}
            selectedBuilding={selectedBuilding}
            onSelectLandmark={handleLandmarkSelect}
            selectedLandmarkId={selectedLandmark?.id || null}
          />
        </div>
      )}

      {/* Top HUD Navigation & Control Bar */}
      {loadingComplete && buildings && (
        <TopBar
          buildings={buildings.buildings}
          renderMode={renderMode}
          onRenderModeChange={handleRenderModeChange}
          timeOfDay={timeOfDay}
          onTimeOfDayChange={setTimeOfDay}
          isTourActive={isTourActive}
          onToggleTour={() => setIsTourActive(!isTourActive)}
          autoRotate={autoRotate}
          onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
          onSelectPreset={handleSelectPreset}
          onSelectBuilding={(b) => {
            handleBuildingSelect(b as SelectedBuilding);
            handleFlyToBuilding(b);
          }}
          onOpenAnalytics={() => setAnalyticsOpen(true)}
          floodControlOpen={floodControlOpen}
          onToggleFloodControl={handleToggleFlood}
        />
      )}

      {/* Building Inspection Dossier */}
      {loadingComplete && (
        <BuildingInfo
          building={selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
          onFlyTo={handleFlyToBuilding}
        />
      )}

      {/* Landmark Briefing Card */}
      {loadingComplete && (
        <LandmarkModal
          landmark={selectedLandmark}
          onClose={() => setSelectedLandmark(null)}
          onFlyTo={(l) => {
            setCameraTargetPos(l.cameraPos);
            setCameraLookAt(l.target);
          }}
        />
      )}

      {/* Interactive Flood Inundation Simulator Panel */}
      {loadingComplete && floodControlOpen && buildings && (
        <FloodControl
          floodLevel={floodLevelMeters}
          onFloodLevelChange={setFloodLevelMeters}
          buildings={buildings.buildings}
          onClose={() => setFloodControlOpen(false)}
        />
      )}

      {/* Urban Analytics & Solar Clean Energy Modal */}
      {analyticsOpen && (
        <AnalyticsModal onClose={() => setAnalyticsOpen(false)} />
      )}

      {/* Dynamic Render Mode Legend */}
      {loadingComplete && (
        <Legend
          stats={buildings?.stats || null}
          renderMode={renderMode}
          visible={legendVisible}
          onToggle={() => setLegendVisible(!legendVisible)}
        />
      )}

      {/* Controls HUD Hint */}
      {loadingComplete && (
        <div className="controls-hint flex items-center gap-2">
          <span>orbit: drag</span> · <span>zoom: scroll</span> · <span>pan: right-click</span> ·{' '}
          <span className="text-cyan-400">drone: top bar</span>
        </div>
      )}
    </main>
  );
}

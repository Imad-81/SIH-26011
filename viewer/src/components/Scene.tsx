'use client';

import '@/lib/three-config';
import { useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Buildings from './Buildings';
import Terrain from './Terrain';
import Water from './Water';
import Bridge from './Bridge';
import Roads from './Roads';
import Landmarks from './Landmarks';
import SunSky from './SunSky';
import CameraController from './CameraController';
import ParallaxSky from './ParallaxSky';
import SkyParallaxTracker from './SkyParallaxTracker';
import PerformanceHUD, { PerformanceTracker } from './PerformanceMonitor';
import FloorVisualizer from './FloorVisualizer';
import {
  BuildingData,
  BuildingsDataset,
  TerrainData,
  SelectedBuilding,
  LandmarkData,
  RenderMode,
  TimeOfDay,
  BuildingCadastreRecord,
} from '@/lib/types';

interface SceneProps {
  data: BuildingsDataset;
  terrain: TerrainData | null;
  renderMode: RenderMode;
  timeOfDay: TimeOfDay;
  floodLevelMeters: number;
  isTourActive: boolean;
  onTourEnd: () => void;
  autoRotate: boolean;
  showRoads?: boolean;
  showTraffic?: boolean;
  highlightedIds?: Set<string>;
  cameraTargetPos?: [number, number, number] | null;
  cameraLookAt?: [number, number, number] | null;
  onBuildingSelect: (building: SelectedBuilding | null) => void;
  selectedBuilding: SelectedBuilding | null;
  onSelectLandmark: (landmark: LandmarkData) => void;
  selectedLandmarkId?: string | null;
  cadastreRecord?: BuildingCadastreRecord | null;
  selectedFloorIndex?: number;
  selectedUnitId?: string | null;
  isFloorIsolated?: boolean;
}

function SceneContent({
  data,
  terrain,
  renderMode,
  timeOfDay,
  floodLevelMeters,
  isTourActive,
  onTourEnd,
  autoRotate,
  highlightedIds,
  cameraTargetPos,
  cameraLookAt,
  onBuildingSelect,
  selectedBuilding,
  onSelectLandmark,
  selectedLandmarkId,
  showRoads = true,
  showTraffic = true,
  cadastreRecord,
  selectedFloorIndex = 0,
  selectedUnitId = null,
  isFloorIsolated = false,
}: SceneProps) {
  const areaSize = data.aoi.sizeKm;
  const centerElev = terrain?.centerElevation ?? 569.0;

  const handleBuildingClick = useCallback(
    (building: BuildingData) => {
      onBuildingSelect(building as SelectedBuilding);
    },
    [onBuildingSelect]
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={[2400, 1400, 2400]} fov={48} near={2} far={35000} />

      {/* Real-time WebGL Telemetry Tracker */}
      <PerformanceTracker />

      {/* Real-time 2D Parallax Camera Tracker */}
      <SkyParallaxTracker />

      {/* Camera Controller & Autopilot Tour */}
      <CameraController
        targetPosition={cameraTargetPos}
        targetLookAt={cameraLookAt}
        isTourActive={isTourActive}
        onTourEnd={onTourEnd}
        autoRotate={autoRotate}
      />

      {/* Dynamic Sun, Sky, Lighting & Fog */}
      <SunSky timeOfDay={timeOfDay} />

      {/* Topography Terrain */}
      <Terrain terrain={terrain} areaSize={areaSize} timeOfDay={timeOfDay} />

      {/* Durgam Cheruvu Animated Water Surface & Dynamic Flood Plane */}
      <Water
        centerElevation={centerElev}
        floodLevelMeters={floodLevelMeters}
        timeOfDay={timeOfDay}
      />

      {/* Durgam Cheruvu Cable-Stayed Bridge */}
      <Bridge centerElevation={centerElev} />

      {/* 3D Road Network & Multi-Level Elevated Flyovers */}
      <Roads
        centerElevation={centerElev}
        timeOfDay={timeOfDay}
        showRoads={showRoads}
        showTraffic={showTraffic}
      />

      {/* 🚀 Ultra-Optimized Batched 3D Buildings (Single Draw Call) */}
      <Buildings
        buildings={data.buildings}
        centerElevation={centerElev}
        renderMode={renderMode}
        floodLevelMeters={floodLevelMeters}
        highlightedIds={highlightedIds}
        onBuildingClick={handleBuildingClick}
        selectedId={selectedBuilding?.id || null}
      />

      {/* 📐 3D Cadastre Floor Slice & Unit Highlight */}
      <FloorVisualizer
        building={selectedBuilding}
        cadastreRecord={cadastreRecord ?? null}
        selectedFloorIndex={selectedFloorIndex}
        selectedUnitId={selectedUnitId}
        isFloorIsolated={isFloorIsolated}
        centerElevation={centerElev}
      />

      {/* 3D Floating Landmark Badges & Beacon Lasers */}
      <Landmarks
        onSelectLandmark={onSelectLandmark}
        selectedLandmarkId={selectedLandmarkId}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  return (
    <div className="relative w-full h-full">
      {/* 2D Multi-Tiered Parallax Sky Engine */}
      <ParallaxSky timeOfDay={props.timeOfDay} />

      {/* Live WebGL Performance Telemetry HUD */}
      <PerformanceHUD />

      {/* High-Performance 3D Canvas Layer */}
      <Canvas
        shadows="percentage"
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: props.timeOfDay === 'day' ? 1.35 : 1.1,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          if (gl.shadowMap) {
            gl.shadowMap.type = THREE.PCFShadowMap;
          }
        }}
        style={{
          background: 'transparent',
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
        }}
        onPointerMissed={() => props.onBuildingSelect(null)}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}

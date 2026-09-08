'use client';

import { useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Buildings from './Buildings';
import Terrain from './Terrain';
import Water from './Water';
import Bridge from './Bridge';
import Landmarks from './Landmarks';
import SunSky from './SunSky';
import CameraController from './CameraController';
import {
  BuildingData,
  BuildingsDataset,
  TerrainData,
  SelectedBuilding,
  LandmarkData,
  RenderMode,
  TimeOfDay,
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
  highlightedIds?: Set<string>;
  cameraTargetPos?: [number, number, number] | null;
  cameraLookAt?: [number, number, number] | null;
  onBuildingSelect: (building: SelectedBuilding | null) => void;
  selectedBuilding: SelectedBuilding | null;
  onSelectLandmark: (landmark: LandmarkData) => void;
  selectedLandmarkId?: string | null;
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
      <PerspectiveCamera makeDefault position={[800, 600, 800]} fov={48} near={1} far={50000} />

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
      <Terrain terrain={terrain} areaSize={areaSize} />

      {/* Durgam Cheruvu Animated Water Surface & Dynamic Flood Plane */}
      <Water
        centerElevation={centerElev}
        floodLevelMeters={floodLevelMeters}
        timeOfDay={timeOfDay}
      />

      {/* Durgam Cheruvu Cable-Stayed Bridge */}
      <Bridge centerElevation={centerElev} />

      {/* 3D Extruded Buildings with Multi-Mode Materials & Shadows */}
      <Buildings
        buildings={data.buildings}
        centerElevation={centerElev}
        renderMode={renderMode}
        floodLevelMeters={floodLevelMeters}
        highlightedIds={highlightedIds}
        onBuildingClick={handleBuildingClick}
        selectedId={selectedBuilding?.id || null}
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
  const bgColor =
    props.timeOfDay === 'day'
      ? '#14213d'
      : props.timeOfDay === 'dawn'
      ? '#1d152b'
      : props.timeOfDay === 'dusk'
      ? '#1c1226'
      : '#0a0a1a';

  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: props.timeOfDay === 'day' ? 1.4 : 1.1,
      }}
      style={{ background: bgColor }}
      onPointerMissed={() => props.onBuildingSelect(null)}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}

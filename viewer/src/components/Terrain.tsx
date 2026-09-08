'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { TerrainData, TimeOfDay } from '@/lib/types';
import { SCALE, getTerrainY } from '@/lib/geo';

interface TerrainProps {
  terrain: TerrainData | null;
  areaSize: number; // in km
  timeOfDay?: TimeOfDay;
}

export default function Terrain({ terrain, areaSize, timeOfDay = 'night' }: TerrainProps) {
  const halfSize = (areaSize * 1000 * SCALE) / 2;

  // Create terrain mesh from elevation data with hypsometric altitude tinting
  const terrainGeometry = useMemo(() => {
    if (!terrain || !terrain.grid || terrain.grid.length === 0) {
      return new THREE.PlaneGeometry(halfSize * 2, halfSize * 2, 1, 1);
    }

    const rows = terrain.grid.length;
    const cols = terrain.grid[0].length;
    const geometry = new THREE.PlaneGeometry(
      halfSize * 2,
      halfSize * 2,
      cols - 1,
      rows - 1
    );

    const positions = geometry.attributes.position;
    const centerElev = terrain.centerElevation;
    const minElev = terrain.minElevation;
    const maxElev = terrain.maxElevation;
    const elevRange = Math.max(1, maxElev - minElev);

    // Vertex color buffer for altitude gradient
    const colors = new Float32Array(rows * cols * 3);

    // Hypsometric tint palettes
    const isNight = timeOfDay === 'night';
    const lowColor = new THREE.Color(isNight ? '#081726' : '#1e334a'); // Basin / Durgam Cheruvu depression
    const midColor = new THREE.Color(isNight ? '#0d2238' : '#2a4868'); // Midland urban IT corridor
    const highColor = new THREE.Color(isNight ? '#163854' : '#3d6c96'); // Elevated granite ridges
    const ridgePeak = new THREE.Color(isNight ? '#1d4f72' : '#528cb8'); // High hilltops (~627m)

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const idx = i * cols + j;
        const val = terrain.grid[i][j];
        
        // True-scale 3D vertical relief
        const elevation = getTerrainY(val, centerElev);
        positions.setZ(idx, elevation);

        // Normalize altitude (0 to 1)
        const norm = Math.max(0, Math.min(1, (val - minElev) / elevRange));
        const c = new THREE.Color();
        if (norm < 0.35) {
          c.copy(lowColor).lerp(midColor, norm / 0.35);
        } else if (norm < 0.75) {
          c.copy(midColor).lerp(highColor, (norm - 0.35) / 0.4);
        } else {
          c.copy(highColor).lerp(ridgePeak, (norm - 0.75) / 0.25);
        }

        colors[idx * 3] = c.r;
        colors[idx * 3 + 1] = c.g;
        colors[idx * 3 + 2] = c.b;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [terrain, halfSize, timeOfDay]);

  return (
    <group>
      {/* 3D Topography Surface Mesh with Altitude Gradients */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <primitive object={terrainGeometry} attach="geometry" />
        <meshStandardMaterial
          vertexColors
          roughness={0.88}
          metalness={0.12}
        />
      </mesh>

      {/* Draped Topographical Contour Grid following the natural 3D hills & valleys */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.15, 0]}
      >
        <primitive object={terrainGeometry} attach="geometry" />
        <meshBasicMaterial
          color="#00f5ff"
          wireframe
          transparent
          opacity={timeOfDay === 'night' ? 0.12 : 0.08}
        />
      </mesh>
    </group>
  );
}

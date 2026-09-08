'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { TerrainData } from '@/lib/types';
import { SCALE } from '@/lib/geo';

interface TerrainProps {
  terrain: TerrainData | null;
  areaSize: number; // in km
}

export default function Terrain({ terrain, areaSize }: TerrainProps) {
  const halfSize = (areaSize * 1000 * SCALE) / 2;

  // Create terrain mesh from elevation data
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

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const idx = i * cols + j;
        const elevation = (terrain.grid[i][j] - centerElev) * SCALE * 0.3;
        positions.setZ(idx, elevation);
      }
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [terrain, halfSize]);

  return (
    <group>
      {/* Main topography terrain mesh */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <primitive object={terrainGeometry} attach="geometry" />
        <meshStandardMaterial
          color="#0d1527"
          roughness={0.92}
          metalness={0.08}
        />
      </mesh>

      {/* Futuristic Tactical Geospatial Grid */}
      <gridHelper
        args={[halfSize * 2, 40, '#00f5ff', '#1e293b']}
        position={[0, 0.05, 0]}
      />

      {/* AOI boundary box in glowing cyan */}
      <lineSegments position={[0, 0.6, 0]}>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(halfSize * 2, halfSize * 2)]}
        />
        <lineBasicMaterial color="#00f5ff" transparent opacity={0.6} linewidth={2} />
      </lineSegments>
    </group>
  );
}

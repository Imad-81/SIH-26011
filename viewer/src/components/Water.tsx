'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { WaterDataset } from '@/lib/types';
import { SCALE, getTerrainY } from '@/lib/geo';

interface WaterProps {
  centerElevation: number;
  floodLevelMeters: number; // e.g. 533 (base) up to 560
  timeOfDay?: 'dawn' | 'day' | 'dusk' | 'night';
}

export default function Water({ centerElevation, floodLevelMeters, timeOfDay = 'night' }: WaterProps) {
  const [waterData, setWaterData] = useState<WaterDataset | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    fetch('/data/water.json')
      .then((res) => res.json())
      .then((data) => setWaterData(data))
      .catch((err) => console.error('Failed to load water data:', err));
  }, []);

  // Calculate 3D water surface Y level
  // Base lake surface elevation is ~533m
  const waterElevation = Math.max(533, floodLevelMeters);
  const waterY = getTerrainY(waterElevation, centerElevation) + 0.3;

  // Build high-performance merged 3D lake geometries (Consolidates 198 draw calls into 2)
  const { mergedWaterGeometry, mergedEdgesGeometry } = useMemo(() => {
    if (!waterData || !waterData.water || waterData.water.length === 0) {
      return { mergedWaterGeometry: null, mergedEdgesGeometry: null };
    }

    const geoms: THREE.BufferGeometry[] = [];
    const edgeGeoms: THREE.BufferGeometry[] = [];

    for (const lake of waterData.water) {
      const coords = lake.coordinates;
      if (!coords || coords.length < 3) continue;

      try {
        const shape = new THREE.Shape();
        shape.moveTo(coords[0][0] * SCALE, coords[0][1] * SCALE);
        for (let i = 1; i < coords.length; i++) {
          shape.lineTo(coords[i][0] * SCALE, coords[i][1] * SCALE);
        }
        shape.closePath();

        // ShapeGeometry in XY plane, rotate to XZ
        const geom = new THREE.ShapeGeometry(shape);
        geom.rotateX(-Math.PI / 2);
        geoms.push(geom);

        const edgeG = new THREE.EdgesGeometry(geom);
        edgeGeoms.push(edgeG);
      } catch {
        // Skip invalid polygon
      }
    }

    let mergedWater: THREE.BufferGeometry | null = null;
    let mergedEdges: THREE.BufferGeometry | null = null;

    if (geoms.length > 0) {
      try {
        mergedWater = mergeGeometries(geoms, false);
      } catch (err) {
        console.warn('Failed to merge water geometries:', err);
      }
    }

    if (edgeGeoms.length > 0) {
      try {
        mergedEdges = mergeGeometries(edgeGeoms, false);
      } catch (err) {
        console.warn('Failed to merge water edge geometries:', err);
      }
    }

    return { mergedWaterGeometry: mergedWater, mergedEdgesGeometry: mergedEdges };
  }, [waterData]);

  // Subtle wave shimmer animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (materialRef.current) {
      materialRef.current.roughness = 0.15 + Math.sin(t * 1.5) * 0.05;
    }
  });

  const isDay = timeOfDay === 'day' || timeOfDay === 'dawn';
  const waterColor = isDay ? '#0077be' : '#00e5ff';
  const waterEmissive = isDay ? '#003366' : '#005577';

  if (!mergedWaterGeometry) return null;

  return (
    <group position={[0, waterY, 0]}>
      {/* 🚀 Merged 99 Lake Surfaces: 1 Single Draw Call */}
      <mesh geometry={mergedWaterGeometry} receiveShadow ref={meshRef}>
        <meshStandardMaterial
          ref={materialRef}
          color={waterColor}
          emissive={waterEmissive}
          emissiveIntensity={0.35}
          roughness={0.15}
          metalness={0.85}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 🌊 Merged Shoreline Glowing Foam Outlines: 1 Single Draw Call */}
      {mergedEdgesGeometry && (
        <lineSegments geometry={mergedEdgesGeometry} position={[0, 0.05, 0]}>
          <lineBasicMaterial
            color="#64ffda"
            transparent
            opacity={0.65}
            linewidth={2}
          />
        </lineSegments>
      )}
    </group>
  );
}

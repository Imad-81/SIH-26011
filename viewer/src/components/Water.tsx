'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WaterDataset } from '@/lib/types';
import { SCALE } from '@/lib/geo';

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
  const waterY = (waterElevation - centerElevation) * SCALE * 0.3;

  // Build 3D lake polygon geometries
  const lakeGeometries = useMemo(() => {
    if (!waterData || !waterData.water) return [];

    const geoms: THREE.BufferGeometry[] = [];

    for (const lake of waterData.water) {
      const coords = lake.coordinates;
      if (!coords || coords.length < 3) continue;

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
    }

    return geoms;
  }, [waterData]);

  // Subtle wave shimmer animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (materialRef.current) {
      // Subtle pulse on water opacity and roughness
      materialRef.current.roughness = 0.15 + Math.sin(t * 1.5) * 0.05;
    }
  });

  const isDay = timeOfDay === 'day' || timeOfDay === 'dawn';
  const waterColor = isDay ? '#0077be' : '#00e5ff';
  const waterEmissive = isDay ? '#003366' : '#005577';

  if (!waterData || lakeGeometries.length === 0) return null;

  return (
    <group position={[0, waterY, 0]}>
      {lakeGeometries.map((geom, idx) => (
        <mesh key={idx} geometry={geom} receiveShadow ref={idx === 0 ? meshRef : undefined}>
          <meshStandardMaterial
            ref={idx === 0 ? materialRef : undefined}
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
      ))}

      {/* Shoreline glowing foam / boundary contour */}
      {lakeGeometries.map((geom, idx) => (
        <lineSegments key={`edge-${idx}`} position={[0, 0.05, 0]}>
          <edgesGeometry args={[geom]} />
          <lineBasicMaterial
            color="#64ffda"
            transparent
            opacity={0.65}
            linewidth={2}
          />
        </lineSegments>
      ))}
    </group>
  );
}

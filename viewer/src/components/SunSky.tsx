'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Stars } from '@react-three/drei';
import { TimeOfDay } from '@/lib/types';

interface SunSkyProps {
  timeOfDay: TimeOfDay;
}

export default function SunSky({ timeOfDay }: SunSkyProps) {
  const config = useMemo(() => {
    switch (timeOfDay) {
      case 'dawn':
        return {
          sunPos: [700, 250, 400] as [number, number, number],
          sunColor: '#ffb07c',
          sunIntensity: 1.4,
          ambientColor: '#2b1b3d',
          ambientIntensity: 0.6,
          fillColor: '#5c4d7d',
          fogColor: '#1d152b',
          fogNear: 800,
          fogFar: 4500,
          starsCount: 800,
          starsFade: true,
        };
      case 'day':
        return {
          sunPos: [400, 950, 200] as [number, number, number],
          sunColor: '#fff9e6',
          sunIntensity: 1.8,
          ambientColor: '#3a4d6b',
          ambientIntensity: 0.7,
          fillColor: '#87ceeb',
          fogColor: '#1a233a',
          fogNear: 1500,
          fogFar: 6000,
          starsCount: 0,
          starsFade: false,
        };
      case 'dusk':
        return {
          sunPos: [-700, 200, -300] as [number, number, number],
          sunColor: '#ff6f00',
          sunIntensity: 1.5,
          ambientColor: '#2a1a38',
          ambientIntensity: 0.5,
          fillColor: '#9c27b0',
          fogColor: '#1c1226',
          fogNear: 800,
          fogFar: 4500,
          starsCount: 1200,
          starsFade: true,
        };
      case 'night':
      default:
        return {
          sunPos: [500, 800, 300] as [number, number, number],
          sunColor: '#80d8ff',
          sunIntensity: 0.7,
          ambientColor: '#0d1b2a',
          ambientIntensity: 0.35,
          fillColor: '#00e5ff',
          fogColor: '#0a0a1a',
          fogNear: 1000,
          fogFar: 5000,
          starsCount: 3500,
          starsFade: true,
        };
    }
  }, [timeOfDay]);

  return (
    <>
      {/* Dynamic Directional Sunlight */}
      <directionalLight
        position={config.sunPos}
        intensity={config.sunIntensity}
        color={config.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={5000}
        shadow-camera-left={-1800}
        shadow-camera-right={1800}
        shadow-camera-top={1800}
        shadow-camera-bottom={-1800}
        shadow-bias={-0.0005}
      />

      {/* Secondary Fill Light */}
      <directionalLight
        position={[-config.sunPos[0] * 0.5, 300, -config.sunPos[2] * 0.5]}
        intensity={0.4}
        color={config.fillColor}
      />

      {/* Ambient Lighting */}
      <ambientLight intensity={config.ambientIntensity} color={config.ambientColor} />

      {/* Hemisphere fill */}
      <hemisphereLight
        args={[config.fillColor, '#0a0f1d', 0.4]}
      />

      {/* Depth Fog */}
      <fog attach="fog" args={[config.fogColor, config.fogNear, config.fogFar]} />

      {/* Twinkling Starfield */}
      {config.starsCount > 0 && (
        <Stars
          radius={3000}
          depth={80}
          count={config.starsCount}
          factor={4}
          saturation={0.6}
          fade={config.starsFade}
        />
      )}
    </>
  );
}

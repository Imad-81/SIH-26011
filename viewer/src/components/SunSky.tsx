'use client';

import { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import { TimeOfDay } from '@/lib/types';
import { SKY_CONFIGS } from '@/lib/skyConfig';

interface SunSkyProps {
  timeOfDay: TimeOfDay;
}

export default function SunSky({ timeOfDay }: SunSkyProps) {
  const config = useMemo(() => SKY_CONFIGS[timeOfDay] || SKY_CONFIGS.night, [timeOfDay]);

  return (
    <>
      {/* Dynamic Directional Sunlight aligned with Celestial Disc */}
      <directionalLight
        position={config.directionalLight.position}
        intensity={config.directionalLight.intensity}
        color={config.directionalLight.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={18000}
        shadow-camera-left={-5500}
        shadow-camera-right={5500}
        shadow-camera-top={5500}
        shadow-camera-bottom={-5500}
        shadow-bias={-0.0005}
      />

      {/* Secondary Atmosphere Fill Light */}
      <directionalLight
        position={[-config.directionalLight.position[0] * 0.5, 800, -config.directionalLight.position[2] * 0.5]}
        intensity={config.fillLight.intensity}
        color={config.fillLight.color}
      />

      {/* Ambient Lighting */}
      <ambientLight intensity={config.ambientLight.intensity} color={config.ambientLight.color} />

      {/* Hemisphere fill linking sky to ground haze */}
      <hemisphereLight
        args={[config.fillLight.color, config.fogColor, 0.45]}
      />

      {/* Depth Fog - Perfectly color-matched to ParallaxSky horizon haze */}
      <fog attach="fog" args={[config.fogColor, config.fogNear, config.fogFar]} />

      {/* 3D Deep Space Starfield */}
      {config.stars.count > 0 && (
        <Stars
          radius={8000}
          depth={150}
          count={config.stars.count}
          factor={4}
          saturation={0.6}
          fade={true}
        />
      )}
    </>
  );
}

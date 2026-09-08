'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export interface CameraPreset {
  name: string;
  camPos: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  default: {
    name: 'Overview',
    camPos: [800, 600, 800],
    target: [0, 0, 0],
  },
  lake: {
    name: 'Durgam Cheruvu Lake',
    camPos: [450, 90, -180],
    target: [488, 0, -346],
  },
  bridge: {
    name: 'Cable Bridge',
    camPos: [420, 50, -250],
    target: [420, 10, -380],
  },
  skyscrapers: {
    name: 'HITEC Skyline',
    camPos: [-52, 110, -160],
    target: [-80, 35, -296],
  },
  ortho: {
    name: 'Top-Down GIS',
    camPos: [0, 1900, 1],
    target: [0, 0, 0],
  },
};

// 5-waypoint Cinematic Drone Flythrough Tour
const TOUR_WAYPOINTS = [
  {
    camPos: new THREE.Vector3(700, 140, -150),
    target: new THREE.Vector3(488, 5, -346),
    duration: 6.0,
  },
  {
    camPos: new THREE.Vector3(410, 40, -260),
    target: new THREE.Vector3(420, 15, -380),
    duration: 6.0,
  },
  {
    camPos: new THREE.Vector3(80, 80, -220),
    target: new THREE.Vector3(-52, 45, -296),
    duration: 6.5,
  },
  {
    camPos: new THREE.Vector3(200, 100, -420),
    target: new THREE.Vector3(296, 15, -555),
    duration: 6.0,
  },
  {
    camPos: new THREE.Vector3(850, 650, 850),
    target: new THREE.Vector3(0, 0, 0),
    duration: 7.0,
  },
];

interface CameraControllerProps {
  targetPosition?: [number, number, number] | null;
  targetLookAt?: [number, number, number] | null;
  isTourActive: boolean;
  onTourEnd?: () => void;
  autoRotate: boolean;
}

export default function CameraController({
  targetPosition,
  targetLookAt,
  isTourActive,
  onTourEnd,
  autoRotate,
}: CameraControllerProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Animation state
  const animTargetCam = useRef<THREE.Vector3 | null>(null);
  const animTargetLook = useRef<THREE.Vector3 | null>(null);
  const isTransitioning = useRef(false);

  // Drone tour state
  const tourIndex = useRef(0);
  const tourElapsed = useRef(0);

  // Trigger smooth flight when target props change
  useEffect(() => {
    if (targetPosition && targetLookAt && !isTourActive) {
      animTargetCam.current = new THREE.Vector3(...targetPosition);
      animTargetLook.current = new THREE.Vector3(...targetLookAt);
      isTransitioning.current = true;
    }
  }, [targetPosition, targetLookAt, isTourActive]);

  // Start / restart drone tour
  useEffect(() => {
    if (isTourActive) {
      tourIndex.current = 0;
      tourElapsed.current = 0;
      isTransitioning.current = false;
    }
  }, [isTourActive]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Handle Cinematic Drone Tour
    if (isTourActive) {
      const currentWp = TOUR_WAYPOINTS[tourIndex.current];
      tourElapsed.current += delta;

      const progress = Math.min(tourElapsed.current / currentWp.duration, 1);
      // Smooth smoothstep easing
      const t = progress * progress * (3 - 2 * progress);

      const prevWpIndex = (tourIndex.current - 1 + TOUR_WAYPOINTS.length) % TOUR_WAYPOINTS.length;
      const startCam = TOUR_WAYPOINTS[prevWpIndex].camPos;
      const startTarget = TOUR_WAYPOINTS[prevWpIndex].target;

      camera.position.lerpVectors(startCam, currentWp.camPos, t);
      controlsRef.current.target.lerpVectors(startTarget, currentWp.target, t);
      controlsRef.current.update();

      if (progress >= 1) {
        tourElapsed.current = 0;
        tourIndex.current += 1;
        if (tourIndex.current >= TOUR_WAYPOINTS.length) {
          tourIndex.current = 0;
          onTourEnd?.();
        }
      }
      return;
    }

    // Handle Interactive Smooth Flight
    if (isTransitioning.current && animTargetCam.current && animTargetLook.current) {
      const camDist = camera.position.distanceTo(animTargetCam.current);
      const lookDist = controlsRef.current.target.distanceTo(animTargetLook.current);

      camera.position.lerp(animTargetCam.current, delta * 3.5);
      controlsRef.current.target.lerp(animTargetLook.current, delta * 3.5);
      controlsRef.current.update();

      if (camDist < 1.0 && lookDist < 1.0) {
        isTransitioning.current = false;
        animTargetCam.current = null;
        animTargetLook.current = null;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={20}
      maxDistance={6000}
      autoRotate={autoRotate && !isTourActive}
      autoRotateSpeed={0.7}
    />
  );
}

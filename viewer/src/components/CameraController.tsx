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
    camPos: [1100, 650, 1100],
    target: [0, 0, 0],
  },
  qualcomm: {
    name: 'Qualcomm Commerzone',
    camPos: [0.5, 170, 1000],
    target: [0.5, 50, 852],
  },
  cybertowers: {
    name: 'Cyber Towers',
    camPos: [139, 110, -1350],
    target: [139, 41, -1491],
  },
  wellsfargo: {
    name: 'Wells Fargo Tower 4',
    camPos: [-287, 140, 1480],
    target: [-287, 50, 1328],
  },
  bridge: {
    name: 'Cable Bridge',
    camPos: [1148, 70, 680],
    target: [1148, -10, 493],
  },
  lake: {
    name: 'Durgam Cheruvu Lake',
    camPos: [1084, 80, 960],
    target: [1084, -73, 760],
  },
  ortho: {
    name: 'Top-Down GIS',
    camPos: [0, 2600, 1],
    target: [0, 0, 0],
  },
};

// 5-waypoint Cinematic Drone Flythrough Tour
const TOUR_WAYPOINTS = [
  {
    // Waypoint 1: Cyber Towers
    camPos: new THREE.Vector3(139, 110, -1350),
    target: new THREE.Vector3(139, 41, -1491),
    duration: 6.0,
  },
  {
    // Waypoint 2: Qualcomm Commerzone Skyscraper
    camPos: new THREE.Vector3(0.5, 170, 1000),
    target: new THREE.Vector3(0.5, 50, 852),
    duration: 6.0,
  },
  {
    // Waypoint 3: Durgam Cable Bridge
    camPos: new THREE.Vector3(1148, 70, 680),
    target: new THREE.Vector3(1148, -10, 493),
    duration: 6.5,
  },
  {
    // Waypoint 4: Wells Fargo & Knowledge City
    camPos: new THREE.Vector3(-287, 140, 1480),
    target: new THREE.Vector3(-287, 50, 1328),
    duration: 6.0,
  },
  {
    // Waypoint 5: Panoramic 3D Topography Overview
    camPos: new THREE.Vector3(1200, 750, 1200),
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

'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoadDataset, RoadSegment, TimeOfDay } from '@/lib/types';
import { SCALE, getTerrainY } from '@/lib/geo';

interface RoadsProps {
  centerElevation?: number;
  timeOfDay?: TimeOfDay;
  showRoads?: boolean;
  showTraffic?: boolean;
}

interface TrafficParticle {
  pathIndex: number;
  t: number;
  speed: number;
  direction: 1 | -1;
  isHeadlight: boolean;
}

export default function Roads({
  centerElevation = 593.0,
  timeOfDay = 'night',
  showRoads = true,
  showTraffic = true,
}: RoadsProps) {
  const [roadData, setRoadData] = useState<RoadDataset | null>(null);
  const trafficMeshRef = useRef<THREE.InstancedMesh>(null);
  const trafficParticlesRef = useRef<TrafficParticle[]>([]);

  useEffect(() => {
    fetch('/data/roads.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: RoadDataset) => setRoadData(data))
      .catch((err) => console.error('Failed to load roads dataset:', err));
  }, []);

  const isNight = timeOfDay === 'night';

  // Build high-performance merged road geometries
  const {
    tier1Geometry,
    tier2Geometry,
    tier3Geometry,
    bridgeSidesGeometry,
    piersGeometry,
    piersMatrices,
    trafficPaths,
  } = useMemo(() => {
    if (!roadData || !roadData.roads || roadData.roads.length === 0) {
      return {
        tier1Geometry: null,
        tier2Geometry: null,
        tier3Geometry: null,
        bridgeSidesGeometry: null,
        piersGeometry: null,
        piersMatrices: [],
        trafficPaths: [],
      };
    }

    const t1Positions: number[] = [];
    const t2Positions: number[] = [];
    const t3Positions: number[] = [];
    const bSidesPositions: number[] = [];
    const tPaths: THREE.Vector3[][] = [];

    // Road ribbon widths (in meters)
    const TIER_WIDTHS: Record<number, number> = {
      1: 7.0,
      2: 4.5,
      3: 2.5,
    };

    // Micro elevation offsets above terrain for surface roads to guarantee zero Z-fighting
    const TIER_OFFSETS: Record<number, number> = {
      1: 0.65,
      2: 0.48,
      3: 0.32,
    };

    // Helper: generate 3D ribbon triangles for a road polyline
    const processRoad = (road: RoadSegment) => {
      const coords = road.coords;
      if (!coords || coords.length < 2) return;

      const width = TIER_WIDTHS[road.tier] || 2.5;
      const halfW = width / 2;
      const isBridge = !!road.isBridge;
      const isUnderpass = !!road.isUnderpass;
      const surfaceOffset = isBridge ? 0.75 : isUnderpass ? -0.1 : (TIER_OFFSETS[road.tier] || 0.32);

      // Collect 3D centerline points
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < coords.length; i++) {
        const [rx, elev, ry] = coords[i];
        const x = rx * SCALE;
        const z = -ry * SCALE;
        const y = getTerrainY(elev, centerElevation) + surfaceOffset;
        pts.push(new THREE.Vector3(x, y, z));
      }

      if (pts.length < 2) return;

      // Save longer Tier 1 paths for animated traffic flow
      if (road.tier === 1 && pts.length >= 3 && road.length >= 60) {
        tPaths.push(pts);
      }

      // Compute horizontal perpendicular normal at each node
      const leftVerts: THREE.Vector3[] = [];
      const rightVerts: THREE.Vector3[] = [];
      const leftBotVerts: THREE.Vector3[] = [];
      const rightBotVerts: THREE.Vector3[] = [];

      for (let i = 0; i < pts.length; i++) {
        let dx: number;
        let dz: number;

        if (i === 0) {
          dx = pts[1].x - pts[0].x;
          dz = pts[1].z - pts[0].z;
        } else if (i === pts.length - 1) {
          dx = pts[i].x - pts[i - 1].x;
          dz = pts[i].z - pts[i - 1].z;
        } else {
          dx = pts[i + 1].x - pts[i - 1].x;
          dz = pts[i + 1].z - pts[i - 1].z;
        }

        const len = Math.hypot(dx, dz);
        const nx = len > 0.0001 ? -dz / len : 0;
        const nz = len > 0.0001 ? dx / len : 1;

        const p = pts[i];
        leftVerts.push(new THREE.Vector3(p.x + nx * halfW, p.y, p.z + nz * halfW));
        rightVerts.push(new THREE.Vector3(p.x - nx * halfW, p.y, p.z - nz * halfW));

        if (isBridge) {
          const deckThickness = 0.85;
          leftBotVerts.push(new THREE.Vector3(p.x + nx * halfW, p.y - deckThickness, p.z + nz * halfW));
          rightBotVerts.push(new THREE.Vector3(p.x - nx * halfW, p.y - deckThickness, p.z - nz * halfW));
        }
      }

      // Target vertex array for road deck surface
      const targetPos = road.tier === 1 ? t1Positions : road.tier === 2 ? t2Positions : t3Positions;

      // Generate road surface quads
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = leftVerts[i];
        const p2 = rightVerts[i];
        const p3 = leftVerts[i + 1];
        const p4 = rightVerts[i + 1];

        // Triangle 1: p1 -> p2 -> p3
        targetPos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
        // Triangle 2: p2 -> p4 -> p3
        targetPos.push(p2.x, p2.y, p2.z, p4.x, p4.y, p4.z, p3.x, p3.y, p3.z);

        // For elevated bridges and flyovers: generate 3D solid deck side skirts & underside
        if (isBridge) {
          const lb1 = leftBotVerts[i];
          const lb2 = leftBotVerts[i + 1];
          const rb1 = rightBotVerts[i];
          const rb2 = rightBotVerts[i + 1];

          // Left side barrier/skirt
          bSidesPositions.push(p1.x, p1.y, p1.z, lb1.x, lb1.y, lb1.z, p3.x, p3.y, p3.z);
          bSidesPositions.push(lb1.x, lb1.y, lb1.z, lb2.x, lb2.y, lb2.z, p3.x, p3.y, p3.z);

          // Right side barrier/skirt
          bSidesPositions.push(p2.x, p2.y, p2.z, p4.x, p4.y, p4.z, rb1.x, rb1.y, rb1.z);
          bSidesPositions.push(p4.x, p4.y, p4.z, rb2.x, rb2.y, rb2.z, rb1.x, rb1.y, rb1.z);

          // Underside soffit
          bSidesPositions.push(lb1.x, lb1.y, lb1.z, rb1.x, rb1.y, rb1.z, lb2.x, lb2.y, lb2.z);
          bSidesPositions.push(rb1.x, rb1.y, rb1.z, rb2.x, rb2.y, rb2.z, lb2.x, lb2.y, lb2.z);
        }
      }
    };

    // Process all roads
    for (const r of roadData.roads) {
      processRoad(r);
    }

    // Helper to create THREE.BufferGeometry from position array
    const createGeo = (positions: number[]) => {
      if (positions.length === 0) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      return geo;
    };

    const g1 = createGeo(t1Positions);
    const g2 = createGeo(t2Positions);
    const g3 = createGeo(t3Positions);
    const gSides = createGeo(bSidesPositions);

    // Build instanced concrete pier matrices
    const pierMatrices: THREE.Matrix4[] = [];
    if (roadData.piers && roadData.piers.length > 0) {
      const pGeom = new THREE.CylinderGeometry(0.9, 1.15, 1.0, 10);
      pGeom.translate(0, 0.5, 0); // Base at y=0, top at y=1

      for (const pier of roadData.piers) {
        const baseY = getTerrainY(pier.groundY, centerElevation);
        const topY = getTerrainY(pier.deckY, centerElevation);
        const height = Math.max(0.6, topY - baseY);

        const matrix = new THREE.Matrix4();
        matrix.compose(
          new THREE.Vector3(pier.x * SCALE, baseY, pier.z * SCALE),
          new THREE.Quaternion(),
          new THREE.Vector3(1, height, 1)
        );
        pierMatrices.push(matrix);
      }
    }

    return {
      tier1Geometry: g1,
      tier2Geometry: g2,
      tier3Geometry: g3,
      bridgeSidesGeometry: gSides,
      piersGeometry: new THREE.CylinderGeometry(0.85, 1.1, 1.0, 10).translate(0, 0.5, 0),
      piersMatrices: pierMatrices,
      trafficPaths: tPaths,
    };
  }, [roadData, centerElevation]);

  // Set up instanced support piers mesh
  const instancedPiersMesh = useMemo(() => {
    if (!piersGeometry || piersMatrices.length === 0) return null;

    const mesh = new THREE.InstancedMesh(
      piersGeometry,
      new THREE.MeshStandardMaterial({
        color: isNight ? '#1e293b' : '#9ca3af',
        roughness: 0.85,
        metalness: 0.2,
      }),
      piersMatrices.length
    );

    for (let i = 0; i < piersMatrices.length; i++) {
      mesh.setMatrixAt(i, piersMatrices[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, [piersGeometry, piersMatrices, isNight]);

  // Initialize animated traffic particles
  useEffect(() => {
    if (trafficPaths.length === 0) return;

    const count = 180;
    const particles: TrafficParticle[] = [];

    for (let i = 0; i < count; i++) {
      const pathIndex = Math.floor(Math.random() * trafficPaths.length);
      particles.push({
        pathIndex,
        t: Math.random(),
        speed: 0.04 + Math.random() * 0.05,
        direction: Math.random() > 0.4 ? 1 : -1,
        isHeadlight: i % 2 === 0,
      });
    }

    trafficParticlesRef.current = particles;

    if (trafficMeshRef.current) {
      const dummy = new THREE.Object3D();
      const whiteColor = new THREE.Color('#ffffff');
      const amberColor = new THREE.Color('#ffaa33');
      const redColor = new THREE.Color('#ff2244');

      for (let i = 0; i < particles.length; i++) {
        dummy.position.set(0, -9999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        trafficMeshRef.current.setMatrixAt(i, dummy.matrix);

        // Color instances
        const p = particles[i];
        const color = p.isHeadlight ? (i % 4 === 0 ? whiteColor : amberColor) : redColor;
        trafficMeshRef.current.setColorAt(i, color);
      }
      trafficMeshRef.current.instanceMatrix.needsUpdate = true;
      if (trafficMeshRef.current.instanceColor) {
        trafficMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [trafficPaths]);

  // Animate traffic along highway and flyover curves
  useFrame((_, delta) => {
    if (!showTraffic || !trafficMeshRef.current || trafficPaths.length === 0) return;

    const particles = trafficParticlesRef.current;
    const mesh = trafficMeshRef.current;
    const dummy = new THREE.Object3D();
    const dt = Math.min(delta, 0.1);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.t += p.speed * p.direction * dt;
      if (p.t > 1.0) p.t = 0.0;
      if (p.t < 0.0) p.t = 1.0;

      const path = trafficPaths[p.pathIndex];
      if (!path || path.length < 2) continue;

      // Sample position along polyline
      const totalSegments = path.length - 1;
      const progress = p.t * totalSegments;
      const segIndex = Math.min(Math.floor(progress), totalSegments - 1);
      const segT = progress - segIndex;

      const p0 = path[segIndex];
      const p1 = path[segIndex + 1];

      const x = p0.x + (p1.x - p0.x) * segT;
      const y = p0.y + (p1.y - p0.y) * segT + 0.35;
      const z = p0.z + (p1.z - p0.z) * segT;

      // Lateral lane offset
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const len = Math.hypot(dx, dz);
      const nx = len > 0.001 ? -dz / len : 0;
      const nz = len > 0.001 ? dx / len : 1;
      const laneOffset = p.direction * 1.6;

      dummy.position.set(x + nx * laneOffset, y, z + nz * laneOffset);
      dummy.scale.set(1.4, 0.9, 2.2);
      dummy.rotation.y = Math.atan2(dx, dz);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!showRoads) return null;

  // Material configurations
  const t1Color = isNight ? '#16202c' : '#1e293b';
  const t2Color = isNight ? '#111923' : '#334155';
  const t3Color = isNight ? '#0b1118' : '#475569';
  const bridgeSideColor = isNight ? '#1e293b' : '#94a3b8';

  return (
    <group name="road-network">
      {/* Tier 3: Local & Residential Streets */}
      {tier3Geometry && (
        <mesh geometry={tier3Geometry}>
          <meshStandardMaterial
            color={t3Color}
            roughness={0.92}
            metalness={0.08}
            polygonOffset
            polygonOffsetFactor={-1.0}
            polygonOffsetUnits={-1.0}
          />
        </mesh>
      )}

      {/* Tier 2: Secondary Corridors & Avenues */}
      {tier2Geometry && (
        <mesh geometry={tier2Geometry}>
          <meshStandardMaterial
            color={t2Color}
            roughness={0.85}
            metalness={0.15}
            polygonOffset
            polygonOffsetFactor={-1.5}
            polygonOffsetUnits={-2.0}
          />
        </mesh>
      )}

      {/* Tier 1: Arterial Highways & Main Flyovers */}
      {tier1Geometry && (
        <mesh geometry={tier1Geometry} receiveShadow>
          <meshStandardMaterial
            color={t1Color}
            roughness={0.78}
            metalness={0.22}
            polygonOffset
            polygonOffsetFactor={-2.0}
            polygonOffsetUnits={-3.0}
          />
        </mesh>
      )}

      {/* 3D Elevated Flyover Slabs & Concrete Side Skirts */}
      {bridgeSidesGeometry && (
        <mesh geometry={bridgeSidesGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={bridgeSideColor}
            roughness={0.65}
            metalness={0.35}
          />
        </mesh>
      )}

      {/* Instanced Concrete Support Piers beneath Elevated Flyovers */}
      {instancedPiersMesh && <primitive object={instancedPiersMesh} />}

      {/* Night Emissive Highway Edge Rails */}
      {isNight && tier1Geometry && (
        <mesh geometry={tier1Geometry} position={[0, 0.08, 0]}>
          <meshBasicMaterial
            color="#ffa133"
            wireframe
            transparent
            opacity={0.16}
          />
        </mesh>
      )}

      {/* Night Emissive Flyover & Viaduct Glowing Parapets */}
      {isNight && bridgeSidesGeometry && (
        <mesh geometry={bridgeSidesGeometry} position={[0, 0.08, 0]}>
          <meshBasicMaterial
            color="#00f5ff"
            wireframe
            transparent
            opacity={0.25}
          />
        </mesh>
      )}

      {/* Animated Glowing Traffic Flow */}
      {showTraffic && (
        <instancedMesh
          ref={trafficMeshRef}
          args={[undefined, undefined, 180]}
          frustumCulled={false}
        >
          <boxGeometry args={[0.8, 0.5, 1.4]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
}

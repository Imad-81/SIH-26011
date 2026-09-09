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
  lane: 'inner' | 'outer';
  vehicleType: 'car' | 'suv' | 'bus';
}

/**
 * Procedural Canvas Texture Generator for realistic Asphalt and Road Markings
 * - Zero raster network overhead, instant in-memory creation
 * - Generates high-res diffuse asphalt + crisp vector markings
 * - Generates emissive maps for night mode luminescence
 */
function createRoadTextures(isNight: boolean) {
  if (typeof document === 'undefined') return null;

  const createTexture = (tier: number, isEmissive: boolean) => {
    const W = 512;
    const H = 512; // Represents 12 meters along the road
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (isEmissive) {
      // Emissive Map: Pure black background, only reflective painted markings illuminate
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      if (isNight) {
        // Outer boundary guide lines (crisp light blue/white glow)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(20, 0, 9, H);
        ctx.fillRect(W - 29, 0, 9, H);

        if (tier === 1) {
          // Double amber central median glow
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(W * 0.5 - 9, 0, 6, H);
          ctx.fillRect(W * 0.5 + 3, 0, 6, H);

          // Dashed lane dividers (bright white retroreflective glow)
          ctx.fillStyle = '#ffffff';
          const dashH = H * 0.5;
          ctx.fillRect(W * 0.28 - 4, 0, 8, dashH);
          ctx.fillRect(W * 0.72 - 4, 0, 8, dashH);
        } else if (tier === 2) {
          // Secondary road dashed center line
          ctx.fillStyle = '#fbbf24';
          const dashH = H * 0.48;
          ctx.fillRect(W * 0.5 - 4, 0, 8, dashH);
        } else {
          // Tier 3: subtle residential dashed centerline
          ctx.fillStyle = '#94a3b8';
          const dashH = H * 0.4;
          ctx.fillRect(W * 0.5 - 3, 0, 6, dashH);
        }
      }
    } else {
      // Base Diffuse Color Map: Dark asphalt with textured grain
      const asphaltColor = isNight ? '#121620' : '#232731';
      ctx.fillStyle = asphaltColor;
      ctx.fillRect(0, 0, W, H);

      // Subtle asphalt grain texture
      const imgData = ctx.getImageData(0, 0, W, H);
      const data = imgData.data;
      const noiseAmp = isNight ? 8 : 15;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * noiseAmp;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);

      // Concrete curbs along left and right shoulders
      const curbColor = isNight ? '#1e2532' : '#525d6d';
      ctx.fillStyle = curbColor;
      ctx.fillRect(0, 0, 16, H);
      ctx.fillRect(W - 16, 0, 16, H);

      // Solid outer boundary edge lines (white thermoplastic paint)
      const edgeLineColor = isNight ? '#38bdf8' : '#ffffff';
      ctx.fillStyle = edgeLineColor;
      ctx.fillRect(20, 0, 9, H);
      ctx.fillRect(W - 29, 0, 9, H);

      // Lane markings based on tier
      if (tier === 1) {
        // Double solid yellow/amber median divider
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(W * 0.5 - 9, 0, 6, H);
        ctx.fillRect(W * 0.5 + 3, 0, 6, H);

        // Dashed white lane dividers (dash length = 6m, gap = 6m)
        ctx.fillStyle = '#ffffff';
        const dashH = H * 0.5;
        ctx.fillRect(W * 0.28 - 4, 0, 8, dashH);
        ctx.fillRect(W * 0.72 - 4, 0, 8, dashH);
      } else if (tier === 2) {
        // Single dashed center line
        ctx.fillStyle = isNight ? '#fbbf24' : '#fcd34d';
        const dashH = H * 0.48;
        ctx.fillRect(W * 0.5 - 4, 0, 8, dashH);
      } else {
        // Tier 3: subtle residential dashed centerline
        ctx.fillStyle = isNight ? '#64748b' : '#cbd5e1';
        const dashH = H * 0.4;
        ctx.fillRect(W * 0.5 - 3, 0, 6, dashH);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  };

  return {
    t1Map: createTexture(1, false),
    t1Emissive: createTexture(1, true),
    t2Map: createTexture(2, false),
    t2Emissive: createTexture(2, true),
    t3Map: createTexture(3, false),
    t3Emissive: createTexture(3, true),
  };
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

  // Procedural high-performance road textures
  const textures = useMemo(() => {
    return createRoadTextures(isNight);
  }, [isNight]);

  // Build high-performance merged road geometries
  const {
    tier1Geometry,
    tier2Geometry,
    tier3Geometry,
    bridgeStructureGeometry,
    parapetGlowGeometry,
    piersGeometry,
    piersMatrices,
    trafficPaths,
  } = useMemo(() => {
    if (!roadData || !roadData.roads || roadData.roads.length === 0) {
      return {
        tier1Geometry: null,
        tier2Geometry: null,
        tier3Geometry: null,
        bridgeStructureGeometry: null,
        parapetGlowGeometry: null,
        piersGeometry: null,
        piersMatrices: [],
        trafficPaths: [],
      };
    }

    // Vertex and UV arrays for road decks
    const t1Positions: number[] = [];
    const t1UVs: number[] = [];
    const t2Positions: number[] = [];
    const t2UVs: number[] = [];
    const t3Positions: number[] = [];
    const t3UVs: number[] = [];

    // Elevated flyover concrete structure (parapets + box girder)
    const bridgePositions: number[] = [];
    // Night glow strip on top of flyover parapet barriers
    const parapetGlowPositions: number[] = [];

    const tPaths: THREE.Vector3[][] = [];

    // Realistic road ribbon widths matching modern urban & MoRTH standards
    const TIER_WIDTHS: Record<number, number> = {
      1: 20.0, // 4-6 lane arterial highway / express flyover with median
      2: 13.0, // 2-4 lane secondary connector / avenue
      3: 8.0,  // 2-lane residential & local street
    };

    // Elevation offsets above terrain to guarantee crisp visibility and zero Z-fighting
    const TIER_OFFSETS: Record<number, number> = {
      1: 0.95,
      2: 0.75,
      3: 0.55,
    };

    const REPEAT_LEN = 12.0; // Texture repeats every 12 meters along the road

    // Helper: generate 3D ribbon triangles, UVs, and flyover structures
    const processRoad = (road: RoadSegment) => {
      const coords = road.coords;
      if (!coords || coords.length < 2) return;

      const width = TIER_WIDTHS[road.tier] || 8.0;
      const halfW = width / 2;
      const isBridge = !!road.isBridge;
      const isUnderpass = !!road.isUnderpass;
      const surfaceOffset = isBridge ? 1.05 : isUnderpass ? -0.1 : (TIER_OFFSETS[road.tier] || 0.55);

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

      // Cumulative distance along the road in meters
      const dists: number[] = [0.0];
      for (let i = 1; i < pts.length; i++) {
        const segDist = pts[i].distanceTo(pts[i - 1]);
        dists.push(dists[dists.length - 1] + segDist);
      }

      // Save longer Tier 1 highway paths for animated multi-lane traffic flow
      if (road.tier === 1 && pts.length >= 3 && dists[dists.length - 1] >= 60) {
        tPaths.push(pts);
      }

      // Compute horizontal perpendicular normal at each node
      const leftVerts: THREE.Vector3[] = [];
      const rightVerts: THREE.Vector3[] = [];

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
      }

      // Target vertex and UV arrays for road deck surface
      const targetPos = road.tier === 1 ? t1Positions : road.tier === 2 ? t2Positions : t3Positions;
      const targetUV = road.tier === 1 ? t1UVs : road.tier === 2 ? t2UVs : t3UVs;

      // Generate road surface quads with texture coordinates (CCW winding pointing upwards +Y)
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = leftVerts[i];
        const p2 = rightVerts[i];
        const p3 = leftVerts[i + 1];
        const p4 = rightVerts[i + 1];

        const vCurr = dists[i] / REPEAT_LEN;
        const vNext = dists[i + 1] / REPEAT_LEN;

        // Triangle 1 (CCW: p1 -> p3 -> p2) -> Normal points +Y (up to sky)
        targetPos.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
        targetUV.push(0.0, vCurr, 0.0, vNext, 1.0, vCurr);

        // Triangle 2 (CCW: p2 -> p3 -> p4) -> Normal points +Y (up to sky)
        targetPos.push(p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z);
        targetUV.push(1.0, vCurr, 0.0, vNext, 1.0, vNext);

        // For elevated flyovers & viaducts: Generate solid 3D concrete crash barriers & box girder underside
        if (isBridge) {
          const parapetH = 1.15; // 1.15m standard MoRTH concrete parapet barrier
          const girderDepth = 1.8; // 1.8m structural box girder

          const p1Top = new THREE.Vector3(p1.x, p1.y + parapetH, p1.z);
          const p2Top = new THREE.Vector3(p2.x, p2.y + parapetH, p2.z);
          const p3Top = new THREE.Vector3(p3.x, p3.y + parapetH, p3.z);
          const p4Top = new THREE.Vector3(p4.x, p4.y + parapetH, p4.z);

          // Box girder underside soffit (chamfered inward)
          const p1Bot = new THREE.Vector3(p1.x * 0.88 + pts[i].x * 0.12, p1.y - girderDepth, p1.z * 0.88 + pts[i].z * 0.12);
          const p2Bot = new THREE.Vector3(p2.x * 0.88 + pts[i].x * 0.12, p2.y - girderDepth, p2.z * 0.88 + pts[i].z * 0.12);
          const p3Bot = new THREE.Vector3(p3.x * 0.88 + pts[i + 1].x * 0.12, p3.y - girderDepth, p3.z * 0.88 + pts[i + 1].z * 0.12);
          const p4Bot = new THREE.Vector3(p4.x * 0.88 + pts[i + 1].x * 0.12, p4.y - girderDepth, p4.z * 0.88 + pts[i + 1].z * 0.12);

          // Left concrete parapet barrier wall
          bridgePositions.push(p1.x, p1.y, p1.z, p1Top.x, p1Top.y, p1Top.z, p3.x, p3.y, p3.z);
          bridgePositions.push(p1Top.x, p1Top.y, p1Top.z, p3Top.x, p3Top.y, p3Top.z, p3.x, p3.y, p3.z);

          // Right concrete parapet barrier wall
          bridgePositions.push(p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p2Top.x, p2Top.y, p2Top.z);
          bridgePositions.push(p2Top.x, p2Top.y, p2Top.z, p4.x, p4.y, p4.z, p4Top.x, p4Top.y, p4Top.z);

          // Chamfered box girder left flank
          bridgePositions.push(p1.x, p1.y, p1.z, p1Bot.x, p1Bot.y, p1Bot.z, p3.x, p3.y, p3.z);
          bridgePositions.push(p1Bot.x, p1Bot.y, p1Bot.z, p3Bot.x, p3Bot.y, p3Bot.z, p3.x, p3.y, p3.z);

          // Chamfered box girder right flank
          bridgePositions.push(p2.x, p2.y, p2.z, p4.x, p4.y, p4.z, p2Bot.x, p2Bot.y, p2Bot.z);
          bridgePositions.push(p4.x, p4.y, p4.z, p4Bot.x, p4Bot.y, p4Bot.z, p2Bot.x, p2Bot.y, p2Bot.z);

          // Box girder bottom soffit
          bridgePositions.push(p1Bot.x, p1Bot.y, p1Bot.z, p2Bot.x, p2Bot.y, p2Bot.z, p3Bot.x, p3Bot.y, p3Bot.z);
          bridgePositions.push(p2Bot.x, p2Bot.y, p2Bot.z, p4Bot.x, p4Bot.y, p4Bot.z, p3Bot.x, p3Bot.y, p3Bot.z);

          // Night parapet reflector strip along the top of crash barriers
          parapetGlowPositions.push(p1Top.x, p1Top.y + 0.05, p1Top.z, p3Top.x, p3Top.y + 0.05, p3Top.z, p1Top.x + 0.15, p1Top.y + 0.05, p1Top.z + 0.15);
          parapetGlowPositions.push(p2Top.x, p2Top.y + 0.05, p2Top.z, p4Top.x, p4Top.y + 0.05, p4Top.z, p2Top.x + 0.15, p2Top.y + 0.05, p2Top.z + 0.15);
        }
      }
    };

    // Process all roads
    for (const r of roadData.roads) {
      processRoad(r);
    }

    // Helper to create THREE.BufferGeometry from positions & UVs
    const createGeo = (positions: number[], uvs?: number[]) => {
      if (positions.length === 0) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      if (uvs && uvs.length > 0) {
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      }
      geo.computeVertexNormals();
      return geo;
    };

    const g1 = createGeo(t1Positions, t1UVs);
    const g2 = createGeo(t2Positions, t2UVs);
    const g3 = createGeo(t3Positions, t3UVs);
    const gBridge = createGeo(bridgePositions);
    const gParapetGlow = createGeo(parapetGlowPositions);

    // Build instanced concrete support pier matrices with realistic wide columns & flared caps
    const pierMatrices: THREE.Matrix4[] = [];
    if (roadData.piers && roadData.piers.length > 0) {
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

    // Flared concrete viaduct pier: radius 2.4m flared head at deck, radius 1.8m column at ground
    const pierGeom = new THREE.CylinderGeometry(2.4, 1.8, 1.0, 14);
    pierGeom.translate(0, 0.5, 0); // Base at y=0, top at y=1

    return {
      tier1Geometry: g1,
      tier2Geometry: g2,
      tier3Geometry: g3,
      bridgeStructureGeometry: gBridge,
      parapetGlowGeometry: gParapetGlow,
      piersGeometry: pierGeom,
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
        color: isNight ? '#273142' : '#94a3b8',
        roughness: 0.85,
        metalness: 0.15,
        side: THREE.DoubleSide,
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

  // Initialize animated multi-lane traffic particles
  useEffect(() => {
    if (trafficPaths.length === 0) return;

    const count = 240;
    const particles: TrafficParticle[] = [];

    for (let i = 0; i < count; i++) {
      const pathIndex = Math.floor(Math.random() * trafficPaths.length);
      const vType = i % 9 === 0 ? 'bus' : i % 3 === 0 ? 'suv' : 'car';
      particles.push({
        pathIndex,
        t: Math.random(),
        speed: vType === 'bus' ? 0.02 + Math.random() * 0.02 : 0.03 + Math.random() * 0.035,
        direction: Math.random() > 0.5 ? 1 : -1,
        lane: Math.random() > 0.5 ? 'inner' : 'outer',
        vehicleType: vType,
      });
    }

    trafficParticlesRef.current = particles;

    if (trafficMeshRef.current) {
      const dummy = new THREE.Object3D();
      const whiteColor = new THREE.Color('#ffffff');
      const amberColor = new THREE.Color('#ffaa22');
      const redColor = new THREE.Color('#ff2244');
      const dayCarColors = [
        new THREE.Color('#f8fafc'), // Pearl White
        new THREE.Color('#94a3b8'), // Metallic Silver
        new THREE.Color('#334155'), // Slate Charcoal
        new THREE.Color('#f59e0b'), // Taxi Gold
        new THREE.Color('#ef4444'), // Crimson Red
        new THREE.Color('#3b82f6'), // Royal Blue
      ];

      for (let i = 0; i < particles.length; i++) {
        dummy.position.set(0, -9999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        trafficMeshRef.current.setMatrixAt(i, dummy.matrix);

        // Color instances: night has glowing headlights / taillights; day has rich car livery colors
        const p = particles[i];
        if (isNight) {
          const color = p.direction === 1 ? (i % 3 === 0 ? amberColor : whiteColor) : redColor;
          trafficMeshRef.current.setColorAt(i, color);
        } else {
          trafficMeshRef.current.setColorAt(i, dayCarColors[i % dayCarColors.length]);
        }
      }
      trafficMeshRef.current.instanceMatrix.needsUpdate = true;
      if (trafficMeshRef.current.instanceColor) {
        trafficMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [trafficPaths, isNight]);

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
      const y = p0.y + (p1.y - p0.y) * segT + (p.vehicleType === 'bus' ? 1.4 : 0.7);
      const z = p0.z + (p1.z - p0.z) * segT;

      // Lateral multi-lane offset on 20m wide highway
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const len = Math.hypot(dx, dz);
      const nx = len > 0.001 ? -dz / len : 0;
      const nz = len > 0.001 ? dx / len : 1;

      // In India driving is on the left side: outbound lane = positive offset, inbound = negative
      const laneOffset = p.direction * (p.lane === 'outer' ? 6.2 : 2.5);

      dummy.position.set(x + nx * laneOffset, y, z + nz * laneOffset);

      // Scale based on vehicle type
      if (p.vehicleType === 'bus') {
        dummy.scale.set(2.6, 2.5, 8.5);
      } else if (p.vehicleType === 'suv') {
        dummy.scale.set(2.2, 1.6, 4.6);
      } else {
        dummy.scale.set(2.0, 1.3, 4.2);
      }

      // Rotate to follow highway heading
      dummy.rotation.y = Math.atan2(dx * p.direction, dz * p.direction);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!showRoads) return null;

  const bridgeConcreteColor = isNight ? '#253040' : '#8896a8';

  return (
    <group name="road-network">
      {/* Tier 3: Local & Residential Streets (8m wide, asphalt + curbs + centerline) */}
      {tier3Geometry && textures && (
        <mesh geometry={tier3Geometry} receiveShadow>
          <meshStandardMaterial
            map={textures.t3Map || undefined}
            emissiveMap={textures.t3Emissive || undefined}
            emissive="#ffffff"
            emissiveIntensity={isNight ? 0.85 : 0.0}
            roughness={0.85}
            metalness={0.12}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-3.0}
            polygonOffsetUnits={-4.0}
          />
        </mesh>
      )}

      {/* Tier 2: Secondary Corridors & Avenues (13m wide, asphalt + dashed divider + curbs) */}
      {tier2Geometry && textures && (
        <mesh geometry={tier2Geometry} receiveShadow>
          <meshStandardMaterial
            map={textures.t2Map || undefined}
            emissiveMap={textures.t2Emissive || undefined}
            emissive="#ffffff"
            emissiveIntensity={isNight ? 0.95 : 0.0}
            roughness={0.82}
            metalness={0.16}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-3.5}
            polygonOffsetUnits={-5.0}
          />
        </mesh>
      )}

      {/* Tier 1: Arterial Highways & Main Flyovers (20m wide, 4-6 lanes + median + lane dashes) */}
      {tier1Geometry && textures && (
        <mesh geometry={tier1Geometry} receiveShadow>
          <meshStandardMaterial
            map={textures.t1Map || undefined}
            emissiveMap={textures.t1Emissive || undefined}
            emissive="#ffffff"
            emissiveIntensity={isNight ? 1.0 : 0.0}
            roughness={0.78}
            metalness={0.2}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-4.0}
            polygonOffsetUnits={-6.0}
          />
        </mesh>
      )}

      {/* 3D Elevated Flyovers: Solid Concrete Crash Barriers & Box Girder Underside */}
      {bridgeStructureGeometry && (
        <mesh geometry={bridgeStructureGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={bridgeConcreteColor}
            roughness={0.72}
            metalness={0.28}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Instanced Concrete Support Piers beneath Elevated Flyovers */}
      {instancedPiersMesh && <primitive object={instancedPiersMesh} />}

      {/* Night Emissive Flyover Reflector Guides along Barrier Tops */}
      {isNight && parapetGlowGeometry && (
        <mesh geometry={parapetGlowGeometry}>
          <meshBasicMaterial
            color="#ff9f1c"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Animated Multi-Lane Traffic Stream */}
      {showTraffic && (
        <instancedMesh
          ref={trafficMeshRef}
          args={[undefined, undefined, 240]}
          frustumCulled={false}
          castShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          {isNight ? (
            <meshBasicMaterial toneMapped={false} />
          ) : (
            <meshStandardMaterial roughness={0.3} metalness={0.6} />
          )}
        </instancedMesh>
      )}
    </group>
  );
}

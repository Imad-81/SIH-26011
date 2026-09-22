'use client';

import { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { RoadDataset, RoadSegment } from '@/lib/types';
import { SCALE, getTerrainY } from '@/lib/geo';

interface BridgeProps {
  centerElevation: number;
}

export default function Bridge({ centerElevation }: BridgeProps) {
  const [roadData, setRoadData] = useState<RoadDataset | null>(null);

  useEffect(() => {
    fetch('/data/roads.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: RoadDataset) => setRoadData(data))
      .catch((err) => console.error('Failed to load bridge road data:', err));
  }, []);

  const bridgeModel = useMemo(() => {
    if (!roadData || !roadData.roads || roadData.roads.length === 0) return null;

    // Find elevated bridge road segments
    const bridgeRoads = roadData.roads.filter((r) => r.isBridge && r.coords && r.coords.length >= 2);
    if (bridgeRoads.length === 0) return null;

    // Pick the longest bridge segment for the iconic structural span / cable stayed landmark
    let primaryBridge: RoadSegment = bridgeRoads[0];
    for (const b of bridgeRoads) {
      if ((b.length || 0) > (primaryBridge.length || 0)) {
        primaryBridge = b;
      }
    }

    if (!primaryBridge.coords || primaryBridge.coords.length < 2) return null;

    // Convert coords [rx, elev, ry] into 3D world coordinates dynamically
    const pts = primaryBridge.coords.map(([rx, elev, ry]) => {
      const y = getTerrainY(elev, centerElevation) + 0.6;
      return new THREE.Vector3(rx * SCALE, y, -ry * SCALE);
    });

    if (pts.length < 2) return null;

    // Create curve along dynamic bridge deck
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 2.2, 8, false);

    // Central pylon tower position (at middle of curve)
    const midPoint = curve.getPoint(0.5);
    const pylonHeight = Math.max(20, Math.min(45, (primaryBridge.length || 100) * 0.25));
    const pylonTop = new THREE.Vector3(midPoint.x, midPoint.y + pylonHeight, midPoint.z);

    // Cable stays
    const cablePoints: THREE.Vector3[] = [];
    const numCables = 12;
    for (let i = 0; i < numCables; i++) {
      const t = 0.15 + (i / (numCables - 1)) * 0.7; // span along deck
      const deckAnchor = curve.getPoint(t);
      // Left and right cables
      cablePoints.push(pylonTop.clone(), deckAnchor.clone());
    }

    const cableGeometry = new THREE.BufferGeometry().setFromPoints(cablePoints);

    return {
      deckGeometry: tubeGeometry,
      midPoint,
      pylonHeight,
      pylonTop,
      cableGeometry,
    };
  }, [roadData, centerElevation]);

  if (!bridgeModel) return null;

  return (
    <group>
      {/* Bridge Deck */}
      <mesh geometry={bridgeModel.deckGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#37474f"
          roughness={0.4}
          metalness={0.7}
        />
      </mesh>

      {/* Glowing roadway edge strip */}
      <mesh geometry={bridgeModel.deckGeometry} position={[0, 0.2, 0]}>
        <meshBasicMaterial color="#00f5ff" wireframe transparent opacity={0.3} />
      </mesh>

      {/* Iconic Central Pylon Tower (Inverted Y / Needle Tower) */}
      <group position={[bridgeModel.midPoint.x, bridgeModel.midPoint.y, bridgeModel.midPoint.z]}>
        {/* Main Pylon Column */}
        <mesh position={[0, bridgeModel.pylonHeight / 2, 0]} castShadow>
          <cylinderGeometry
            args={[0.8, 2.2, bridgeModel.pylonHeight, 16]}
          />
          <meshStandardMaterial
            color="#eceff1"
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>

        {/* Pylon Tip Beacon (Red Aviation Warning Light) */}
        <mesh position={[0, bridgeModel.pylonHeight + 0.5, 0]}>
          <sphereGeometry args={[0.6, 12, 12]} />
          <meshBasicMaterial color="#ff1744" />
        </mesh>

        {/* Point light on top of pylon */}
        <pointLight
          position={[0, bridgeModel.pylonHeight, 0]}
          color="#00f5ff"
          intensity={1.5}
          distance={100}
        />
      </group>

      {/* Illuminated Cable Stays */}
      <lineSegments geometry={bridgeModel.cableGeometry}>
        <lineBasicMaterial
          color="#00f5ff"
          transparent
          opacity={0.8}
          linewidth={2}
        />
      </lineSegments>
    </group>
  );
}

'use client';

import { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { WaterDataset } from '@/lib/types';
import { SCALE } from '@/lib/geo';

interface BridgeProps {
  centerElevation: number;
}

export default function Bridge({ centerElevation }: BridgeProps) {
  const [waterData, setWaterData] = useState<WaterDataset | null>(null);

  useEffect(() => {
    fetch('/data/water.json')
      .then((res) => res.json())
      .then((data) => setWaterData(data))
      .catch((err) => console.error('Failed to load bridge data:', err));
  }, []);

  const bridgeModel = useMemo(() => {
    if (!waterData || !waterData.bridges || waterData.bridges.length === 0) return null;

    // Base elevation for bridge deck (water is at ~533m, bridge deck is at ~545m, ~12m clearance)
    const deckY = (546 - centerElevation) * SCALE * 0.3 + 4.0;

    // Collect bridge coordinate points
    // Filter to the section across Durgam Cheruvu (rel x ~ 700 to 1250, rel y ~ 700 to 900)
    const primaryBridge = waterData.bridges[0];
    const pts = primaryBridge.coordinates.map(([x, y]) => new THREE.Vector3(x * SCALE, deckY, -y * SCALE));

    // Sample the lake crossing span
    const lakeSpanPts = pts.filter((p) => p.x > 350 && p.x < 620 && p.z < -300 && p.z > -450);
    const spanPts = lakeSpanPts.length >= 4 ? lakeSpanPts : pts.slice(0, 15);

    if (spanPts.length < 2) return null;

    // Create curve along bridge deck
    const curve = new THREE.CatmullRomCurve3(spanPts);
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 2.2, 8, false);

    // Central pylon tower position (at middle of curve)
    const midPoint = curve.getPoint(0.5);
    const pylonHeight = 32;
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
  }, [waterData, centerElevation]);

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

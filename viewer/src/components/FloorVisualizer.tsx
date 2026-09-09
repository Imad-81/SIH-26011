'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BuildingData, BuildingCadastreRecord } from '@/lib/types';
import { SCALE, getTerrainY } from '@/lib/geo';

interface FloorVisualizerProps {
  building: BuildingData | null;
  cadastreRecord: BuildingCadastreRecord | null;
  selectedFloorIndex: number;
  selectedUnitId: string | null;
  isFloorIsolated: boolean;
  centerElevation?: number;
}

export default function FloorVisualizer({
  building,
  cadastreRecord,
  selectedFloorIndex,
  selectedUnitId,
  isFloorIsolated,
  centerElevation = 573.0,
}: FloorVisualizerProps) {
  const pulseRef = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  // Pulse animation for the active floor slice
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    pulseRef.current = Math.sin(t * 3.5) * 0.2 + 0.8;
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = isFloorIsolated ? 0.65 : 0.35 * pulseRef.current;
      }
    }
  });

  const visualData = useMemo(() => {
    if (!building || !building.coordinates || building.coordinates.length < 3) return null;

    const coords = building.coordinates;
    const shape = new THREE.Shape();
    shape.moveTo(coords[0][0] * SCALE, coords[0][1] * SCALE);
    for (let i = 1; i < coords.length; i++) {
      shape.lineTo(coords[i][0] * SCALE, coords[i][1] * SCALE);
    }
    shape.closePath();

    const floorsCount = Math.max(1, cadastreRecord?.totalFloors || building.estimatedFloors || 1);
    const floorIndex = Math.min(Math.max(0, selectedFloorIndex), floorsCount - 1);
    
    // Find floor record
    const floorRec = cadastreRecord?.floors?.find((f) => f.floorIndex === floorIndex);
    const floorHeight = floorRec ? floorRec.heightM : building.height / floorsCount;
    
    // Base elevation of the building
    const baseMSL = building.baseElevation ?? centerElevation;
    const floorBaseMSL = floorRec ? floorRec.zMin : baseMSL + (floorIndex * (building.height / floorsCount));
    
    // Convert MSL to Three.js Y
    const worldY = getTerrainY(floorBaseMSL, centerElevation);
    const extrudeHeight = Math.max(floorHeight * SCALE, 0.6);

    try {
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: extrudeHeight,
        bevelEnabled: false,
      });
      geom.rotateX(-Math.PI / 2);

      const edgeGeom = new THREE.EdgesGeometry(geom, 15);

      return {
        geometry: geom,
        edgeGeometry: edgeGeom,
        worldY,
        floorBaseMSL,
        floorTopMSL: floorRec ? floorRec.zMax : floorBaseMSL + floorHeight,
        height: extrudeHeight,
        centroid: building.centroid,
      };
    } catch {
      return null;
    }
  }, [building, cadastreRecord, selectedFloorIndex, centerElevation]);

  if (!visualData) return null;

  const colorHex = isFloorIsolated ? '#f59e0b' : '#00f5ff';
  const edgeColor = isFloorIsolated ? '#fbbf24' : '#38bdf8';

  return (
    <group name="3d-cadastre-floor-slice" position={[0, visualData.worldY, 0]}>
      {/* Volumetric Floor Slab */}
      <mesh ref={meshRef} geometry={visualData.geometry}>
        <meshBasicMaterial
          color={colorHex}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Glowing Cadastral Boundary Edges */}
      <lineSegments ref={edgesRef} geometry={visualData.edgeGeometry}>
        <lineBasicMaterial color={edgeColor} linewidth={2} />
      </lineSegments>

      {/* Floor Elevation Marker Beacon (if isolated) */}
      {isFloorIsolated && visualData.centroid && (
        <group position={[visualData.centroid[0] * SCALE, visualData.height + 2, -visualData.centroid[1] * SCALE]}>
          <mesh>
            <sphereGeometry args={[1.5, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
          <pointLight color="#fbbf24" intensity={2.5} distance={60} />
        </group>
      )}
    </group>
  );
}

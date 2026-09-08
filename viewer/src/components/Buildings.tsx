'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { BuildingData, RenderMode } from '@/lib/types';
import { getBuildingColor } from '@/lib/colors';
import { SCALE, getTerrainY } from '@/lib/geo';

interface BuildingsProps {
  buildings: BuildingData[];
  centerElevation?: number;
  renderMode?: RenderMode;
  floodLevelMeters?: number;
  highlightedIds?: Set<string>;
  onBuildingClick?: (building: BuildingData) => void;
  onBuildingHover?: (building: BuildingData | null) => void;
  selectedId?: string | null;
}

export default function Buildings({
  buildings,
  centerElevation = 569.0,
  renderMode = 'height',
  floodLevelMeters = 533.0,
  highlightedIds,
  onBuildingClick,
  onBuildingHover,
  selectedId,
}: BuildingsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const pulseRef = useRef(0);

  // Maximum height in dataset for gradient normalization
  const maxHeight = useMemo(() => {
    return Math.min(Math.max(...buildings.map((b) => b.height), 10), 65);
  }, [buildings]);

  // Create building geometries and metadata
  const buildingMeshes = useMemo(() => {
    const meshes: {
      geometry: THREE.BufferGeometry;
      edgeGeometry: THREE.BufferGeometry | null;
      building: BuildingData;
      baseY: number;
      centroid: [number, number];
    }[] = [];

    for (const building of buildings) {
      const coords = building.coordinates;
      if (!coords || coords.length < 3) continue;

      try {
        // Create 2D shape in relative meters
        const shape = new THREE.Shape();
        shape.moveTo(coords[0][0] * SCALE, coords[0][1] * SCALE);
        for (let i = 1; i < coords.length; i++) {
          shape.lineTo(coords[i][0] * SCALE, coords[i][1] * SCALE);
        }
        shape.closePath();

        // Extrude to height
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: Math.max(building.height * SCALE, 0.5),
          bevelEnabled: false,
        });

        // Rotate so extrusion goes up (Y axis)
        geometry.rotateX(-Math.PI / 2);

        // Ground elevation offset relative to center elevation
        const baseElev = building.baseElevation ?? centerElevation;
        const baseY = getTerrainY(baseElev, centerElevation);

        // Centroid calculation
        let cx = 0,
          cy = 0;
        for (const [x, y] of coords) {
          cx += x;
          cy += y;
        }
        cx /= coords.length;
        cy /= coords.length;

        // Edge geometry for prominent buildings (e.g. >20m tall or named)
        let edgeGeometry: THREE.BufferGeometry | null = null;
        if (building.height >= 18 || building.name) {
          edgeGeometry = new THREE.EdgesGeometry(geometry, 25);
        }

        meshes.push({
          geometry,
          edgeGeometry,
          building,
          baseY,
          centroid: [cx, cy],
        });
      } catch {
        // Skip invalid geometries
      }
    }

    return meshes;
  }, [buildings, centerElevation]);

  // Frame tick for pulse animations
  useFrame(({ clock }) => {
    pulseRef.current = Math.sin(clock.getElapsedTime() * 3) * 0.5 + 0.5;
  });

  const handlePointerOver = useCallback(
    (building: BuildingData) => {
      setHoveredId(building.id);
      onBuildingHover?.(building);
      document.body.style.cursor = 'pointer';
    },
    [onBuildingHover]
  );

  const handlePointerOut = useCallback(() => {
    setHoveredId(null);
    onBuildingHover?.(null);
    document.body.style.cursor = 'default';
  }, [onBuildingHover]);

  const handleClick = useCallback(
    (building: BuildingData, event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      onBuildingClick?.(building);
    },
    [onBuildingClick]
  );

  return (
    <group>
      {buildingMeshes.map(({ geometry, edgeGeometry, building, baseY }) => {
        const isHovered = hoveredId === building.id;
        const isSelected = selectedId === building.id;
        const isHighlighted = highlightedIds ? highlightedIds.has(building.id) : true;
        const isSubmerged =
          renderMode === 'flood' &&
          building.baseElevation !== undefined &&
          building.baseElevation <= floodLevelMeters;

        // Determine building color
        const colorHex = getBuildingColor(building, renderMode, maxHeight, floodLevelMeters);
        const color = new THREE.Color(colorHex);

        // Material properties based on state & render mode
        const isXray = renderMode === 'xray';
        let opacity = isXray ? 0.45 : isHighlighted ? 1.0 : 0.25;
        let roughness = isXray ? 0.1 : 0.5;
        let metalness = isXray ? 0.8 : 0.2;

        let emissiveColor = color;
        let emissiveIntensity = 0;

        if (isSelected) {
          emissiveColor = new THREE.Color('#ff007f');
          emissiveIntensity = 0.8;
          opacity = 1.0;
        } else if (isHovered) {
          emissiveColor = new THREE.Color('#00f5ff');
          emissiveIntensity = 0.5;
          opacity = 1.0;
        } else if (isSubmerged) {
          emissiveColor = new THREE.Color('#ff1744');
          emissiveIntensity = 0.4 + pulseRef.current * 0.4;
        } else if (isXray) {
          emissiveIntensity = 0.15;
        }

        return (
          <group key={building.id} position={[0, baseY + (isHovered ? 0.8 : 0), 0]}>
            {/* 3D Extruded Building Mesh */}
            <mesh
              geometry={geometry}
              onPointerOver={() => handlePointerOver(building)}
              onPointerOut={handlePointerOut}
              onClick={(e) => handleClick(building, e)}
              castShadow={!isXray}
              receiveShadow={!isXray}
            >
              <meshStandardMaterial
                color={isSelected ? '#ff007f' : color}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                roughness={roughness}
                metalness={metalness}
                transparent={isXray || !isHighlighted || isHovered || isSelected}
                opacity={opacity}
                wireframe={isXray && building.height < 10}
              />
            </mesh>

            {/* Architectural CAD Wireframe Outlines for High-Rises & Selected Buildings */}
            {(isSelected || isHovered || isXray || (edgeGeometry && isHighlighted)) && edgeGeometry && (
              <lineSegments geometry={edgeGeometry}>
                <lineBasicMaterial
                  color={
                    isSelected
                      ? '#ff007f'
                      : isHovered
                      ? '#00f5ff'
                      : isXray
                      ? '#00f5ff'
                      : '#ffffff'
                  }
                  transparent
                  opacity={isSelected ? 0.9 : isHovered ? 0.8 : isXray ? 0.7 : 0.35}
                />
              </lineSegments>
            )}

            {/* Pulsing Selection Beacon Ring for Target Building */}
            {isSelected && (
              <mesh position={[0, building.height * SCALE + 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[6, 7.5, 32]} />
                <meshBasicMaterial color="#ff007f" side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

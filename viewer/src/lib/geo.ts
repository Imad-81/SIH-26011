// Geo utilities — coordinate transforms for the viewer

import * as THREE from 'three';
import { BuildingData } from './types';

// Scale factor: real meters → Three.js units
// 1 Three.js unit = 1 meter (keeps things intuitive)
export const SCALE = 1;

/**
 * Convert building 2D coordinates (UTM relative to center) into a THREE.Shape
 */
export function buildingToShape(building: BuildingData): THREE.Shape | null {
  const coords = building.coordinates;
  if (!coords || coords.length < 3) return null;

  const shape = new THREE.Shape();
  
  // Note: coordinates are already relative to AOI center in meters
  // We swap Y and Z for Three.js (Y is up)
  shape.moveTo(coords[0][0] * SCALE, coords[0][1] * SCALE);
  
  for (let i = 1; i < coords.length; i++) {
    shape.lineTo(coords[i][0] * SCALE, coords[i][1] * SCALE);
  }
  
  shape.closePath();
  return shape;
}

/**
 * Create extruded geometry for a building
 */
export function createBuildingGeometry(
  building: BuildingData
): THREE.ExtrudeGeometry | null {
  const shape = buildingToShape(building);
  if (!shape) return null;

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: building.height * SCALE,
    bevelEnabled: false,
  };

  try {
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  } catch {
    return null;
  }
}

/**
 * Compute the centroid of a building footprint
 */
export function getBuildingCentroid(building: BuildingData): [number, number] {
  const coords = building.coordinates;
  if (!coords || coords.length === 0) return [0, 0];

  let sumX = 0;
  let sumY = 0;
  const n = coords.length;

  for (const [x, y] of coords) {
    sumX += x;
    sumY += y;
  }

  return [sumX / n, sumY / n];
}

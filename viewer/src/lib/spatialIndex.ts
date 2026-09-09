import { BuildingData } from './types';

/**
 * 2D Uniform Spatial Grid Index for O(1) Building Lookups
 * Partitions the 10.0 km × 10.0 km Area of Interest into 150m grid cells.
 */
export class SpatialGridIndex {
  private cellSize: number;
  private grid: Map<string, BuildingData[]>;

  constructor(cellSize: number = 150) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx}:${cz}`;
  }

  /**
   * Populate the spatial grid with building datasets
   */
  public build(buildings: BuildingData[]) {
    this.grid.clear();

    for (const b of buildings) {
      const coords = b.coordinates;
      if (!coords || coords.length === 0) continue;

      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (const [x, y] of coords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        // In Three.js, world Z = -rel_y
        const z = -y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }

      const minCX = Math.floor(minX / this.cellSize);
      const maxCX = Math.floor(maxX / this.cellSize);
      const minCZ = Math.floor(minZ / this.cellSize);
      const maxCZ = Math.floor(maxZ / this.cellSize);

      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cz = minCZ; cz <= maxCZ; cz++) {
          const key = `${cx}:${cz}`;
          let cell = this.grid.get(key);
          if (!cell) {
            cell = [];
            this.grid.set(key, cell);
          }
          cell.push(b);
        }
      }
    }
  }

  /**
   * Fast point-in-polygon test
   */
  private pointInPolygon(x: number, z: number, coords: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = coords[i][0];
      const zi = -coords[i][1];
      const xj = coords[j][0];
      const zj = -coords[j][1];

      const intersect =
        zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-10) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * O(1) query for building at world (X, Z) ground coordinate
   */
  public queryPoint(x: number, z: number): BuildingData | null {
    const key = this.getKey(x, z);
    const candidates = this.grid.get(key);
    if (!candidates || candidates.length === 0) return null;

    for (const b of candidates) {
      if (this.pointInPolygon(x, z, b.coordinates)) {
        return b;
      }
    }

    return null;
  }
}

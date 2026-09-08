// Type definitions for the 3D Building Viewer

export interface BuildingData {
  id: string;
  osmId: number | null;
  coordinates: [number, number][];
  height: number;
  estimatedFloors: number;
  osmLevels: number | null;
  buildingType: string;
  name: string | null;
  heightSource: string;
  baseElevation?: number;
  centroid?: [number, number];
}

export interface AOIData {
  center: { lat: number; lon: number };
  centerUtm: { x: number; y: number };
  bbox: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  sizeKm: number;
}

export interface DataStats {
  total: number;
  withRasterHeight: number;
  withOsmHeight: number;
  withOsmLevels: number;
  withDefault: number;
}

export interface TerrainData {
  grid: number[][];
  gridSize: [number, number];
  bounds: {
    left: number;
    right: number;
    bottom: number;
    top: number;
  };
  centerElevation: number;
  minElevation: number;
  maxElevation: number;
}

export interface BuildingsDataset {
  aoi: AOIData;
  buildings: BuildingData[];
  stats: DataStats;
  generatedAt: string;
}

export interface SelectedBuilding extends BuildingData {
  screenPosition?: { x: number; y: number };
}

export interface LandmarkData {
  id: string;
  name: string;
  category: string;
  description: string;
  pos: [number, number, number];
  cameraPos: [number, number, number];
  target: [number, number, number];
  height: number;
  badge: string;
}

export interface WaterFeature {
  id: string;
  name: string;
  coordinates: [number, number][];
}

export interface BridgeFeature {
  id: string;
  name: string;
  coordinates: [number, number][];
}

export interface WaterDataset {
  water: WaterFeature[];
  bridges: BridgeFeature[];
}

export interface AnalyticsData {
  totalBuildings: number;
  totalFootprintAreaM2: number;
  totalBuiltVolumeM3: number;
  grossFloorAreaM2: number;
  heightBuckets: Record<string, number>;
  typeBreakdown: Record<string, number>;
  solar: {
    usableRooftopAreaM2: number;
    dailyGenerationKwh: number;
    annualGenerationMwh: number;
    annualCo2OffsetTons: number;
    ghiAverage: number;
  };
}

export type RenderMode = 'height' | 'type' | 'quality' | 'xray' | 'solar' | 'flood';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

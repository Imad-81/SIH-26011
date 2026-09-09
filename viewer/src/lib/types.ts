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
  ulpin2d?: string;
  surveyNumber?: string;
  villageName?: string;
  hasFloorPlan?: boolean;
  floorsCount?: number;
  unitsCount?: number;
  ulpin3dSample?: string;
}

export interface UlpinUnit {
  unitId: string;
  unitName: string;
  ulpin3d: string;
  unitType: string;
  carpetAreaM2: number;
  zMin: number;
  zMax: number;
  bedrooms?: number;
  facing?: string;
  status?: string;
  coordinates?: [number, number][];
}

export interface FloorCadastre {
  floorIndex: number;
  floorLabel: string;
  ulpin3d: string;
  zMin: number;
  zMax: number;
  heightM: number;
  units: UlpinUnit[];
}

export interface BuildingCadastreRecord {
  buildingId: string;
  osmId: number | null;
  buildingName: string | null;
  ulpin2d: string;
  hasFloorPlan: boolean;
  surveyNumber: string;
  villageName: string;
  mandalName: string;
  districtName: string;
  khataNumber: string;
  ptinGhmc: string;
  reraId: string;
  totalFloors: number;
  totalUnits: number;
  floors: FloorCadastre[];
}

export type Ulpin3DDataset = Record<string, BuildingCadastreRecord>;

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
  withRasterHeight?: number;
  withRasterAnnular?: number;
  withOsmHeight?: number;
  withOsmLevels?: number;
  withLandmarkRegistry?: number;
  withMorphological?: number;
  withDefault?: number;
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

export interface RoadSegment {
  id: number;
  name?: string;
  type: string;
  tier: 1 | 2 | 3;
  length: number;
  coords: [number, number, number][]; // [rel_x, elevation_meters, rel_y]
  isBridge?: boolean;
  isUnderpass?: boolean;
  layer?: number;
}

export interface BridgePier {
  x: number;
  z: number;
  groundY: number;
  deckY: number;
  height: number;
  bridge: string;
}

export interface RoadStats {
  totalLengthKm: number;
  tier1LengthKm: number;
  tier2LengthKm: number;
  tier3LengthKm: number;
  bridgeCount: number;
  underpassCount: number;
  pierCount: number;
  segmentCount: number;
}

export interface RoadDataset {
  stats: RoadStats;
  piers: BridgePier[];
  roads: RoadSegment[];
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

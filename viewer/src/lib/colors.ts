// Height and attribute-based color mapping for buildings
import { BuildingData, RenderMode } from './types';

export interface HeightRange {
  min: number;
  max: number;
  color: string;
  label: string;
}

export const HEIGHT_RANGES: HeightRange[] = [
  { min: 0, max: 5, color: '#00f5ff', label: '0–5m (Low-rise)' },
  { min: 5, max: 15, color: '#00e676', label: '5–15m (Mid-rise)' },
  { min: 15, max: 30, color: '#ffea00', label: '15–30m (Tall)' },
  { min: 30, max: 60, color: '#ff9100', label: '30–60m (High-rise)' },
  { min: 60, max: 500, color: '#ff1744', label: '60m+ (Skyscraper)' },
];

// Building Type Colors
export const TYPE_COLORS: Record<string, { color: string; label: string }> = {
  commercial: { color: '#00f5ff', label: 'Commercial' },
  apartments: { color: '#00e676', label: 'Apartments' },
  residential: { color: '#69f0ae', label: 'Residential' },
  retail: { color: '#ffd600', label: 'Retail / Mall' },
  office: { color: '#00b0ff', label: 'Office' },
  hotel: { color: '#d500f9', label: 'Hospitality' },
  civic: { color: '#ff6d00', label: 'Civic / Gov' },
  school: { color: '#ffab40', label: 'Education' },
  yes: { color: '#78909c', label: 'General / Unclassified' },
};

// Data Source / Quality Colors
export const SOURCE_COLORS: Record<string, { color: string; label: string }> = {
  raster: { color: '#00e676', label: 'Copernicus DSM/DEM' },
  osm_tag: { color: '#d500f9', label: 'OSM Height Tag' },
  osm_levels: { color: '#00b0ff', label: 'OSM Floor Levels' },
  default: { color: '#78909c', label: 'Algorithmic Fallback' },
};

export function getColorForHeight(height: number): string {
  for (const range of HEIGHT_RANGES) {
    if (height >= range.min && height < range.max) {
      return range.color;
    }
  }
  return HEIGHT_RANGES[HEIGHT_RANGES.length - 1].color;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return { r: isNaN(r) ? 1 : r, g: isNaN(g) ? 1 : g, b: isNaN(b) ? 1 : b };
}

// Lerp between two hex colors
export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round((c1.r + (c2.r - c1.r) * t) * 255);
  const g = Math.round((c1.g + (c2.g - c1.g) * t) * 255);
  const b = Math.round((c1.b + (c2.b - c1.b) * t) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Smooth gradient for height
export function getGradientColor(height: number, maxHeight: number = 60): string {
  const t = Math.min(height / maxHeight, 1);
  
  if (t < 0.15) return lerpColor('#00f5ff', '#00e676', t / 0.15);
  if (t < 0.4) return lerpColor('#00e676', '#ffea00', (t - 0.15) / 0.25);
  if (t < 0.7) return lerpColor('#ffea00', '#ff9100', (t - 0.4) / 0.3);
  return lerpColor('#ff9100', '#ff1744', (t - 0.7) / 0.3);
}

// Solar energy potential color based on roof footprint and height
export function getSolarColor(building: BuildingData): string {
  const estArea = (building.coordinates?.length || 4) * 25; // heuristic footprint
  if (estArea > 1500) return '#ffd600'; // high solar potential
  if (estArea > 500) return '#ffab00'; // medium
  return '#ff6d00'; // low
}

// Master color resolver based on active render mode
export function getBuildingColor(
  building: BuildingData,
  mode: RenderMode,
  maxHeight: number = 60,
  floodLevelMeters?: number
): string {
  if (mode === 'flood') {
    if (floodLevelMeters !== undefined && building.baseElevation !== undefined) {
      if (building.baseElevation <= floodLevelMeters) {
        return '#ff1744'; // submerged! Red warning
      }
    }
    return '#37474f'; // safe, muted dark slate
  }

  if (mode === 'xray') {
    return '#00f5ff';
  }

  if (mode === 'type') {
    const type = building.buildingType?.toLowerCase() || 'yes';
    return TYPE_COLORS[type]?.color || TYPE_COLORS['yes'].color;
  }

  if (mode === 'quality') {
    const src = building.heightSource || 'default';
    return SOURCE_COLORS[src]?.color || SOURCE_COLORS['default'].color;
  }

  if (mode === 'solar') {
    return getSolarColor(building);
  }

  // Default 'height' mode
  return getGradientColor(building.height, maxHeight);
}

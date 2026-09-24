'use client';

import { useState, useEffect } from 'react';
import { BuildingsDataset, TerrainData, WaterDataset } from '@/lib/types';

interface DataState {
  buildings: BuildingsDataset | null;
  terrain: TerrainData | null;
  water: WaterDataset | null;
  loading: boolean;
  error: string | null;
  progress: number;
}

export function useBuildingData(cityId?: string | null): DataState {
  const [state, setState] = useState<DataState>({
    buildings: null,
    terrain: null,
    water: null,
    loading: true,
    error: null,
    progress: 0,
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setState(prev => ({ ...prev, loading: true, progress: 10, error: null }));

        const buildingsUrl = cityId ? `/data/cities/${cityId}/buildings.json` : '/data/buildings.json';
        const terrainUrl = cityId ? `/data/cities/${cityId}/terrain.json` : '/data/terrain.json';
        const waterUrl = cityId ? `/data/cities/${cityId}/water.json` : '/data/water.json';

        // Load buildings data with fallback
        let buildingsResp = await fetch(buildingsUrl);
        if (!buildingsResp.ok && cityId) {
          buildingsResp = await fetch('/data/buildings.json');
        }
        if (!buildingsResp.ok) {
          throw new Error(`Failed to load buildings: ${buildingsResp.status}`);
        }
        if (isCancelled) return;
        setState(prev => ({ ...prev, progress: 40 }));
        
        const buildingsData: BuildingsDataset = await buildingsResp.json();
        if (isCancelled) return;
        setState(prev => ({ ...prev, progress: 60, buildings: buildingsData }));

        // Load terrain data (optional)
        let terrainData: TerrainData | null = null;
        try {
          let terrainResp = await fetch(terrainUrl);
          if (!terrainResp.ok && cityId) {
            terrainResp = await fetch('/data/terrain.json');
          }
          if (terrainResp.ok) {
            terrainData = await terrainResp.json();
          }
        } catch {
          console.warn('Terrain data not available');
        }
        if (isCancelled) return;
        if (terrainData) {
          setState(prev => ({ ...prev, terrain: terrainData, progress: 80 }));
        }

        // Load water data (optional)
        let waterData: WaterDataset | null = null;
        try {
          let waterResp = await fetch(waterUrl);
          if (!waterResp.ok && cityId) {
            waterResp = await fetch('/data/water.json');
          }
          if (waterResp.ok) {
            waterData = await waterResp.json();
          }
        } catch {
          console.warn('Water data not available');
        }
        if (isCancelled) return;
        if (waterData) {
          setState(prev => ({ ...prev, water: waterData }));
        }

        setState(prev => ({
          ...prev,
          loading: false,
          progress: 100,
        }));
      } catch (err) {
        if (!isCancelled) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }));
        }
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [cityId]);

  return state;
}

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

export function useBuildingData(): DataState {
  const [state, setState] = useState<DataState>({
    buildings: null,
    terrain: null,
    water: null,
    loading: true,
    error: null,
    progress: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        setState(prev => ({ ...prev, progress: 10 }));

        // Load buildings data
        const buildingsResp = await fetch('/data/buildings.json');
        if (!buildingsResp.ok) {
          throw new Error(`Failed to load buildings: ${buildingsResp.status}`);
        }
        setState(prev => ({ ...prev, progress: 40 }));
        
        const buildingsData: BuildingsDataset = await buildingsResp.json();
        setState(prev => ({ ...prev, progress: 60, buildings: buildingsData }));

        // Load terrain data (optional)
        try {
          const terrainResp = await fetch('/data/terrain.json');
          if (terrainResp.ok) {
            const terrainData: TerrainData = await terrainResp.json();
            setState(prev => ({ ...prev, terrain: terrainData, progress: 80 }));
          }
        } catch {
          console.warn('Terrain data not available');
        }

        // Load water data (optional)
        try {
          const waterResp = await fetch('/data/water.json');
          if (waterResp.ok) {
            const waterData: WaterDataset = await waterResp.json();
            setState(prev => ({ ...prev, water: waterData }));
          }
        } catch {
          console.warn('Water data not available');
        }

        setState(prev => ({
          ...prev,
          loading: false,
          progress: 100,
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    }

    loadData();
  }, []);

  return state;
}

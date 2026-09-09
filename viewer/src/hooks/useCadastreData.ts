'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ulpin3DDataset, BuildingCadastreRecord, FloorCadastre, UlpinUnit } from '@/lib/types';

interface CadastreState {
  data: Ulpin3DDataset | null;
  loading: boolean;
  error: string | null;
}

export function useCadastreData() {
  const [state, setState] = useState<CadastreState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCadastre() {
      try {
        const resp = await fetch('/data/ulpins_3d.json');
        if (!resp.ok) {
          throw new Error(`Failed to load 3D ULPIN cadastre: ${resp.status}`);
        }
        const data: Ulpin3DDataset = await resp.json();
        if (isMounted) {
          setState({
            data,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (isMounted) {
          console.warn('3D ULPIN cadastre data not available yet, will use fallback:', err);
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    loadCadastre();
    return () => {
      isMounted = false;
    };
  }, []);

  const getBuildingCadastre = useCallback(
    (buildingId: string): BuildingCadastreRecord | null => {
      if (!state.data) return null;
      return state.data[buildingId] || null;
    },
    [state.data]
  );

  const searchUlpin = useCallback(
    (query: string): { buildingId: string; floorIndex?: number; unitId?: string } | null => {
      if (!state.data || !query.trim()) return null;
      const q = query.trim().toUpperCase();

      for (const [bId, rec] of Object.entries(state.data)) {
        // Direct 2D ULPIN match
        if (rec.ulpin2d.toUpperCase() === q || rec.ulpin2d.toUpperCase().includes(q)) {
          return { buildingId: bId };
        }
        // Survey number match (e.g. "SY 64" or "64/1")
        if (rec.surveyNumber && (rec.surveyNumber.toUpperCase() === q || q.includes(rec.surveyNumber.toUpperCase()))) {
          return { buildingId: bId };
        }
        // 3D ULPIN match across floors & units
        for (const fl of rec.floors) {
          if (fl.ulpin3d.toUpperCase() === q || fl.ulpin3d.toUpperCase().endsWith(q)) {
            return { buildingId: bId, floorIndex: fl.floorIndex };
          }
          for (const u of fl.units) {
            if (u.ulpin3d.toUpperCase() === q || u.ulpin3d.toUpperCase().endsWith(q) || u.unitId.toUpperCase() === q) {
              return { buildingId: bId, floorIndex: fl.floorIndex, unitId: u.unitId };
            }
          }
        }
      }
      return null;
    },
    [state.data]
  );

  return {
    cadastreData: state.data,
    loading: state.loading,
    error: state.error,
    getBuildingCadastre,
    searchUlpin,
  };
}

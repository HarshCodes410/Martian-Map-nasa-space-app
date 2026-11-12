import { useEffect, useRef, useState } from 'react';
import type { LayerType, MissionSite, RouteTraverse, Waypoint } from '../types/mars';
import type { TerrainCell } from '../utils/pathfinder';

export type PageId = 'overview' | 'planner' | 'visor' | 'rover' | 'science' | 'ai' | 'crew' | 'plan';

export interface Ctx {
  site: MissionSite;
  grid: TerrainCell[][];
  route: RouteTraverse;
  layer: LayerType;
  setLayer: (l: LayerType) => void;
  selected: Waypoint | null;
  base: Waypoint;
  pickWaypoint: (w: Waypoint) => void;
  mapClick: (c: { x: number; y: number }) => void;
  toBase: () => void;
  emergency: () => void;
  go: (p: PageId) => void;
}

export const LAYERS: { id: LayerType; name: string; mission: string }[] = [
  { id: 'optical', name: 'HiRISE Optical', mission: 'MRO · 0.25 m/px' },
  { id: 'topography', name: 'Elevation & Slope', mission: 'MOLA / HRSC DTM' },
  { id: 'radiation', name: 'Radiation Exposure', mission: 'Curiosity RAD' },
  { id: 'spectral', name: 'CRISM Mineralogy', mission: 'MRO CRISM' },
  { id: 'thermal', name: 'Thermal Inertia', mission: 'Odyssey THEMIS' },
];

export const TYPE_LABEL: Record<Waypoint['type'], string> = {
  base: 'Habitat', science: 'Science', hazard: 'Hazard', cache: 'Cache', rover: 'Rover',
};

export const useCountUp = (to: number, decimals: number) => {
  const safeTo = Number.isFinite(to) ? to : 0;
  const [v, setV] = useState(safeTo);
  const currentRef = useRef(safeTo);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const from = hasMountedRef.current ? currentRef.current : 0;
    hasMountedRef.current = true;
    const duration = Math.abs(safeTo - from) > 0 ? 450 : 0;
    if (duration === 0) {
      currentRef.current = safeTo;
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const next = from + (safeTo - from) * (1 - Math.pow(1 - k, 3));
      currentRef.current = next;
      setV(next);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [safeTo]);

  return v.toFixed(decimals);
};

export const hazardTone = (score: number) => (score < 35 ? 'ok' : score < 65 ? 'warn' : 'bad');
export const hazardText = (score: number) => (score < 35 ? 'Low risk' : score < 65 ? 'Moderate risk' : 'High risk');
export const slopeTone = (deg: number) => (deg > 15 ? 'bad' : deg > 10 ? 'warn' : 'ok');

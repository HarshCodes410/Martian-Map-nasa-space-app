import React, { useEffect, useState } from 'react';
import type { LayerType, MissionSite, RouteTraverse, Waypoint } from '../types/mars';
import type { TerrainCell } from '../utils/pathfinder';

export type PageId = 'overview' | 'planner' | 'visor' | 'science' | 'ai' | 'crew' | 'plan';

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
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now(), from = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 800);
      setV(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return v.toFixed(decimals);
};

const Num: React.FC<{ v: number; d: number }> = ({ v, d }) => <>{useCountUp(v, d)}</>;

export const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string | number; unit?: string }> = ({ icon, label, value, unit }) => {
  const s = String(value);
  const numeric = /^-?\d+(\.\d+)?$/.test(s);
  return (
    <div className="kpi">
      <div className="ic">{icon}</div>
      <span>{label}</span>
      <b>{numeric ? <Num v={Number(s)} d={(s.split('.')[1] || '').length} /> : s}</b>{unit && <em>{unit}</em>}
    </div>
  );
};

export const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="row"><span>{k}</span><b>{v}</b></div>
);

export const hazardTone = (score: number) => (score < 35 ? 'ok' : score < 65 ? 'warn' : 'bad');
export const hazardText = (score: number) => (score < 35 ? 'Low risk' : score < 65 ? 'Moderate risk' : 'High risk');
export const slopeTone = (deg: number) => (deg > 15 ? 'bad' : deg > 10 ? 'warn' : 'ok');

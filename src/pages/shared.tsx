import React from 'react';
import { useCountUp } from './missionHelpers';

export type { Ctx, PageId } from './missionHelpers';

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

import React from 'react';
import { Activity, Flame, Heart, Zap } from 'lucide-react';
import { Passes, Weather } from './parts';
import { Row, type Ctx } from './shared';

const Vital: React.FC<{ icon: React.ReactNode; k: string; v: string }> = ({ icon, k, v }) => (
  <div className="row"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{icon}{k}</span><b>{v}</b></div>
);

export const Crew: React.FC<Ctx> = (c) => {
  const o2Rem = Math.max(0, Math.round(600 - c.route.estimatedOxygenUsedL));
  const o2Pct = Math.round((o2Rem / 600) * 100);
  const batPct = Math.max(0, Math.round(((2.5 - c.route.estimatedEnergyUsedKwh) / 2.5) * 100));
  const batHrs = ((batPct / 100) * 7.8).toFixed(1);
  const estBpm = Math.round(86 + c.route.maxSlopeDeg * 1.4);
  const estWatts = Math.round(210 + c.route.maxSlopeDeg * 6);

  return (
    <>
      <div className="g3">
        <div className="card">
          <h3>Cdr. M. Watney <span className="badge brand">Active EVA · Lead</span></h3>
          <Vital icon={<Heart size={15} />} k="Projected pulse" v={`${estBpm} BPM`} />
          <Vital icon={<Flame size={15} />} k="Metabolic load" v={`${estWatts} W`} />
          <Vital icon={<Activity size={15} />} k="Post-EVA O₂" v={`${o2Pct}% · ${o2Rem} L`} />
          <Vital icon={<Zap size={15} />} k="PLSS reserve" v={`${batPct}% · ${batHrs} h`} />
          <Row k="Target zone" v={c.selected?.name ?? 'Custom traverse point'} />
          <Row k="Suit pressure" v="29.6 kPa" />
        </div>
        <div className="card">
          <h3>Dr. A. Jemison <span className="badge">Habitat monitor · Science</span></h3>
          <Vital icon={<Heart size={15} />} k="Pulse" v="68 BPM" />
          <Vital icon={<Flame size={15} />} k="Metabolic rate" v="110 W" />
          <Vital icon={<Activity size={15} />} k="Hab O₂" v="21.2 kPa" />
          <Vital icon={<Zap size={15} />} k="Hab array" v="98% solar" />
          <Row k="Role" v={<button className="badge brand" style={{ cursor: 'pointer', border: 0 }} onClick={() => c.go('rover')}>Rover teleoperation ↗</button>} />
          <Row k="Status" v={<span className="badge ok">Systems nominal</span>} />
        </div>
        <div className="card"><h3>Surface meteorology <small>Sol {c.site.weather.sol}</small></h3><Weather c={c} /></div>
      </div>
      <div className="g2">
        <div className="card"><h3>Communications windows <small>Earth comm delay 14m 22s</small></h3><Passes /></div>
        <div className="card">
          <h3>Core sample manifest</h3>
          {c.site.waypoints.filter((w) => w.sample).map((w) => (
            <div className="row" key={w.id}>
              <div><b>{w.sample!.name}</b><div className="xs muted">{w.sample!.id} · {w.sample!.targetType} · {w.sample!.massGrams} g</div></div>
              <span className="badge ok">Retrieval ready</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

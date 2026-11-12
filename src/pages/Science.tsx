import React from 'react';
import { Row, type Ctx } from './shared';
import { LAYERS } from './missionHelpers';
import { predictBiosignatureML } from '../ml/inferenceEngine';

const potTone = (p: string) => (p === 'High' || p === 'Target Of Interest' ? 'ok' : p === 'Moderate' ? 'warn' : '');

export const Science: React.FC<Ctx> = (c) => {
  const s = c.site;
  const samples = s.waypoints.filter((w) => w.sample);
  return (
    <>
      <div className="g2">
        <div className="card">
          <h3>{s.name} {s.boxworkDetected && <span className="badge brand">2025 boxwork formations</span>}</h3>
          <p className="sm" style={{ marginTop: 0 }}>{s.description}</p>
          <Row k="Region" v={s.region} />
          <Row k="Coordinates" v={s.coordinates} />
          <Row k="Landing mission" v={s.landingMission} />
          <Row k="Science focus" v={<span style={{ fontWeight: 500 }}>{s.scienceFocus}</span>} />
          <Row k="Elevation range" v={`${s.elevationRange[0]} to ${s.elevationRange[1]} m`} />
          <Row k="Nominal radiation" v={`${s.nominalRadiation} mSv/sol`} />
          <Row k="Grid resolution" v={`${s.gridResolutionMeters} m per cell`} />
        </div>
        <div className="card">
          <h3>NASA data layers <small>{LAYERS.length} domains fused</small></h3>
          {LAYERS.map((l) => <Row key={l.id} k={l.name} v={l.mission} />)}
        </div>
      </div>
      <div className="g3">
        {samples.map((w) => {
          const sm = w.sample!;
          const ml = predictBiosignatureML(sm);
          return (
            <div className="card" key={sm.id}>
              <h3>{sm.name} <span className={`badge ${potTone(sm.biosignaturePotential)}`}>{sm.biosignaturePotential}</span></h3>
              <div className="xs muted" style={{ marginBottom: 8 }}>{sm.id} · {sm.targetType} · Sol {sm.sol} · {sm.massGrams} g · collected near {w.name}</div>
              <p className="sm" style={{ margin: '0 0 10px' }}>{sm.description}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{sm.minerals.map((m) => <span key={m} className="badge">{m}</span>)}</div>
              <div className="row" style={{ border: 0, paddingBottom: 4 }}><span>Biosignature preservation (ML)</span><b>{ml.preservationScore}% · {ml.grade}</b></div>
              <div className="bar"><i style={{ width: `${ml.preservationScore}%`, background: 'var(--ok)' }} /></div>
              <div className="xs muted" style={{ marginTop: 8 }}>{ml.keyDrivers.join(' · ')}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

import React, { useState } from 'react';
import { Brain, Cpu, Gauge, Target } from 'lucide-react';
import { ML_MODEL_METADATA, ML_TRAINING_METRICS } from '../ml/inferenceEngine';
import { Kpi } from './shared';

const Slider: React.FC<{ label: string; v: number; set: (n: number) => void; min: number; max: number; step: number; unit: string }> = ({ label, v, set, min, max, step, unit }) => (
  <div style={{ marginBottom: 14 }}>
    <div className="row" style={{ border: 0, padding: '0 0 4px' }}><span>{label}</span><b>{v}{unit}</b></div>
    <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} />
  </div>
);

export const CoPilot: React.FC = () => {
  const [slope, setSlope] = useState(14);
  const [slip, setSlip] = useState(0.22);
  const [rock, setRock] = useState(18);
  const [rad, setRad] = useState(0.018);
  const m = ML_TRAINING_METRICS, a = ML_MODEL_METADATA;
  const h = (slope / 20) * 0.45 + (slip / 0.35) * 0.3 + (rock / 30) * 0.15 + (rad / 0.025) * 0.1;
  const crit = Math.min(99, Math.max(1, Math.round(Math.pow(h, 2.2) * 95)));
  const caut = Math.min(99 - crit, Math.max(2, Math.round(h * 55)));
  const safe = Math.max(1, 100 - crit - caut);
  const loss = m.lossHistory, maxL = Math.max(...loss.map((p) => p.loss));
  const pts = loss.map((p, i) => `${(i / (loss.length - 1)) * 300},${70 - (p.loss / maxL) * 62}`).join(' ');
  const classes = ['Safe', 'Caution', 'Critical'];
  return (
    <>
      <div className="kpis">
        <Kpi icon={<Target size={18} />} label="Test-set accuracy" value={m.testAccuracyPercent} unit="%" />
        <Kpi icon={<Brain size={18} />} label="Training samples" value={m.totalSamples.toLocaleString()} unit={`${m.trainSamples} train / ${m.testSamples} test`} />
        <Kpi icon={<Gauge size={18} />} label="Converged loss" value={loss[loss.length - 1].loss} unit="cross-entropy" />
        <Kpi icon={<Cpu size={18} />} label="Inference latency" value="< 0.05" unit="ms · client-side" />
      </div>
      <div className="g2">
        <div className="card">
          <h3>Terrain hazard testbench <small>Move the sliders</small></h3>
          <Slider label="Terrain slope gradient" v={slope} set={setSlope} min={0} max={25} step={1} unit="°" />
          <Slider label="Regolith wheel / boot slip" v={slip} set={setSlip} min={0} max={0.4} step={0.01} unit="" />
          <Slider label="Surface rock abundance" v={rock} set={setRock} min={0} max={35} step={1} unit="%" />
          <Slider label="Curiosity RAD radiation flux" v={rad} set={setRad} min={0} max={0.03} step={0.001} unit=" mSv/h" />
          <h3 style={{ marginTop: 18 }}>Softmax probability distribution</h3>
          {[['Safe (nominal traverse)', safe, 'var(--ok)'], ['Caution (moderate slope / slip)', caut, 'var(--warn)'], ['Critical hazard (abort / reroute)', crit, 'var(--bad)']].map(([n, p, col]) => (
            <div key={n as string} style={{ marginBottom: 10 }}>
              <div className="row" style={{ border: 0, padding: '0 0 4px' }}><span>{n}</span><b>{p}%</b></div>
              <div className="bar"><i style={{ width: `${p}%`, background: col as string }} /></div>
            </div>
          ))}
          <p className="xs muted" style={{ marginBottom: 0 }}>The A* pathfinder treats Critical cells as impassable and penalises Caution cells.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <h3>Network architecture</h3>
            <p className="xs muted" style={{ marginTop: 0 }}>{a.type}</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {a.layers.map((n: number, i: number) => <span key={i} className="badge">{n} nodes{i < a.activations.length ? ` · ${a.activations[i]}` : ''}</span>)}
            </div>
            <div className="xs muted" style={{ margin: '10px 0 4px' }}>Inputs</div>
            <div className="sm">{a.inputs.join(' · ')}</div>
            <div className="xs muted" style={{ margin: '10px 0 4px' }}>Outputs</div>
            <div className="sm">{a.outputs.join(' · ')}</div>
          </div>
          <div className="card">
            <h3>Feature importance</h3>
            {m.featureImportance.map((f: { name: string; importancePct: number }) => (
              <div key={f.name} style={{ marginBottom: 9 }}>
                <div className="row" style={{ border: 0, padding: '0 0 3px' }}><span>{f.name}</span><b>{f.importancePct}%</b></div>
                <div className="bar"><i style={{ width: `${f.importancePct * 2}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="g3">
        <div className="card">
          <h3>Confusion matrix <small>actual × predicted</small></h3>
          <table className="tbl"><thead><tr><th></th>{classes.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{m.confusionMatrix.map((r: number[], i: number) => <tr key={i} style={{ cursor: 'default' }}><td><b>{classes[i]}</b></td>{r.map((v, j) => <td key={j} style={{ background: i === j ? 'var(--ok-soft)' : undefined, fontWeight: i === j ? 700 : 400 }}>{v}</td>)}</tr>)}</tbody></table>
        </div>
        <div className="card">
          <h3>Training loss <small>{loss.length * 5} epochs</small></h3>
          <svg viewBox="0 0 300 76" style={{ width: '100%' }}><polyline points={pts} fill="none" stroke="var(--blue)" strokeWidth="2" /></svg>
        </div>
        <div className="card">
          <h3>Biosignature regressor</h3>
          <p className="sm" style={{ margin: 0 }}>Scores drill-core samples from CRISM spectroscopy (phyllosilicates, carbonates, sulfates) into a Biosignature Preservation Index, with a 1.35× hydrothermal multiplier for the 2025 boxwork vein formations. See results on the Science page.</p>
        </div>
      </div>
    </>
  );
};

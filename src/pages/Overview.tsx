import React from 'react';
import { Glasses, Map as MapIcon, Undo2 } from 'lucide-react';
import { TerrainMap2D } from '../components/TerrainMap2D';
import { LayerSwitch, Passes, RouteKpis, Timeline, Weather, hazardText, hazardTone } from './parts';
import { ElevationProfile, Ring } from './ui';
import { Row, TYPE_LABEL, slopeTone, type Ctx } from './shared';

export const Overview: React.FC<Ctx> = (c) => {
  const t = c.selected;
  return (
    <>
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="eyebrow">Active traverse · Sol {c.site.weather.sol}</span>
          <h2>{c.base.name} → {t ? t.name : 'Custom point'}</h2>
          <p>{t ? t.scienceGoal : 'Exploration traverse to a point selected on the map.'}</p>
          <div className="acts">
            <button className="btn pri" onClick={() => c.go('planner')}><MapIcon size={16} />Open route planner</button>
            <button className="btn" onClick={() => c.go('visor')}><Glasses size={16} />Visor view</button>
            <button className="btn" onClick={c.toBase}><Undo2 size={16} />Return to base</button>
          </div>
        </div>
        <div className="rings">
          <Ring value={c.route.hazardScore} label="Hazard score" color="#ffa24d" suffix="" />
          <Ring value={88} label="O₂ reserve" color="#4ff0c0" />
          <Ring value={82} label="PLSS battery" color="#9a8cff" />
        </div>
      </section>

      <RouteKpis c={c} />

      <div className="g2">
        <div className="card">
          <h3>Live traverse map <LayerSwitch c={c} /></h3>
          <div className="map">
            <TerrainMap2D site={c.site} grid={c.grid} route={c.route} activeLayer={c.layer} selectedWaypoint={c.selected} onSelectWaypoint={c.pickWaypoint} onMapClickToRoute={c.mapClick} />
          </div>
          <p className="xs muted" style={{ margin: '12px 0 0' }}>Click anywhere on the map to route from {c.base.name}. Slopes above 15° are flagged as hazards.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3>Current traverse <span className={`badge ${hazardTone(c.route.hazardScore)}`}>{hazardText(c.route.hazardScore)}</span></h3>
            <Timeline c={c} />
            <div style={{ marginTop: 16 }}>
              <Row k="Elevation gain / loss" v={`+${Math.round(c.route.elevationGainM)} m / −${Math.round(c.route.elevationLossM)} m`} />
              {t && <Row k="Target mineral" v={t.targetMineral} />}
            </div>
          </div>
          <div className="card"><h3>Surface weather <small>Sol {c.site.weather.sol}</small></h3><Weather c={c} /></div>
        </div>
      </div>

      <div className="card"><h3>Elevation profile <small>Hover to inspect the traverse</small></h3><ElevationProfile c={c} /></div>

      <div>
        <h3 style={{ font: "700 16px var(--head)", margin: '0 0 10px' }}>Waypoints <span className="muted" style={{ font: '500 12px var(--sans)', marginLeft: 8 }}>Select a card to route</span></h3>
        <div className="wps">
          {c.site.waypoints.map((w) => (
            <button key={w.id} className={`wp${c.selected?.id === w.id ? ' on' : ''}`} onClick={() => c.pickWaypoint(w)} style={{ ['--c' as string]: w.type === 'hazard' ? 'var(--red)' : w.type === 'base' ? 'var(--teal)' : w.type === 'science' ? 'var(--violet)' : 'var(--amber)' }}>
              <span className="tag">● {TYPE_LABEL[w.type]}</span>
              <b>{w.name}</b>
              <div className="xs muted">{w.title}</div>
              <div className="m"><span className={`badge ${slopeTone(w.slopeRisk)}`}>{w.slopeRisk}° slope</span><span className="badge">{w.radiationLevel} mSv/h</span></div>
              <div className="xs muted" style={{ marginTop: 10 }}>{w.targetMineral} · {w.coord.elevation} m</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card"><h3>Orbital relay passes <small>Earth comm delay 14m 22s</small></h3><Passes /></div>
    </>
  );
};

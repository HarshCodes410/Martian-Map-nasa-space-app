import React, { useState } from 'react';
import { AlertTriangle, Box, Map as MapIcon } from 'lucide-react';
import { Terrain3D } from '../components/Terrain3D';
import { TerrainMap2D } from '../components/TerrainMap2D';
import { Row, type Ctx } from './shared';
import { LAYERS, TYPE_LABEL } from './missionHelpers';
import { RouteKpis, WaypointTable } from './parts';

export const Planner: React.FC<Ctx> = (c) => {
  const [dim, setDim] = useState<'3d' | '2d'>('3d');
  const w = c.selected;
  const layer = LAYERS.find((l) => l.id === c.layer)!;
  return (
    <>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
        {LAYERS.map((l) => (
          <button key={l.id} className="kpi" onClick={() => c.setLayer(l.id)} style={{ textAlign: 'left', cursor: 'pointer', borderColor: c.layer === l.id ? 'var(--brand)' : undefined, background: c.layer === l.id ? 'var(--brand-soft)' : undefined, font: 'inherit' }}>
            <span>{l.mission}</span><b style={{ fontSize: 16 }}>{l.name}</b>
          </button>
        ))}
      </div>
      <div className="g2">
        <div className="card">
          <h3>{layer.name} <div className="seg">
            <button aria-pressed={dim === '3d'} onClick={() => setDim('3d')}><Box size={14} />3D terrain</button>
            <button aria-pressed={dim === '2d'} onClick={() => setDim('2d')}><MapIcon size={14} />2D map</button>
          </div></h3>
          <div className="map" style={{ height: 560 }}>
            {dim === '3d'
              ? <Terrain3D site={c.site} grid={c.grid} route={c.route} activeLayer={c.layer} selectedWaypoint={c.selected} onSelectWaypoint={c.pickWaypoint} />
              : <TerrainMap2D site={c.site} grid={c.grid} route={c.route} activeLayer={c.layer} selectedWaypoint={c.selected} onSelectWaypoint={c.pickWaypoint} onMapClickToRoute={c.mapClick} />}
          </div>
        </div>
        <div className="card">
          {w ? (
            <>
              <img src={w.groundPhotoUrl} alt={w.name} style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 12, background: '#e6e9f0' }} onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
              <h3 style={{ marginTop: 14, marginBottom: 4 }}>{w.name} <span className="badge brand">{TYPE_LABEL[w.type]}</span></h3>
              <div className="xs muted" style={{ marginBottom: 10 }}>{w.title}</div>
              <p className="sm" style={{ margin: '0 0 10px' }}>{w.description}</p>
              <Row k="Science goal" v={<span style={{ fontWeight: 500 }}>{w.scienceGoal}</span>} />
              <Row k="Target mineral" v={w.targetMineral} />
              <Row k="Slope risk" v={`${w.slopeRisk}°`} />
              <Row k="Radiation" v={`${w.radiationLevel} mSv/h`} />
              <Row k="Coordinates" v={`${w.coord.lat.toFixed(3)}°, ${w.coord.lng.toFixed(3)}°`} />
              {w.slopeRisk > 15 && <div className="badge bad" style={{ marginTop: 10 }}><AlertTriangle size={14} />Slope exceeds 15° suit limit</div>}
            </>
          ) : <p className="sm muted">Custom point selected on the map. Choose a waypoint to see its science brief.</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn" onClick={c.toBase}>Reset to base</button>
            <button className="btn pri" onClick={c.emergency}>Emergency return</button>
          </div>
        </div>
      </div>
      <RouteKpis c={c} />
      <div className="card"><h3>All waypoints</h3><WaypointTable c={c} /></div>
    </>
  );
};

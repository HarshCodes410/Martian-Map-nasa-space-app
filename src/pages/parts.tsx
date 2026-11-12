import React from 'react';
import { Activity, Clock, Mountain, Route, Wind, Zap } from 'lucide-react';
import { SATELLITE_PASS_SCHEDULE } from '../data/marsDatasets';
import { Kpi, Row, type Ctx } from './shared';
import { LAYERS, TYPE_LABEL, slopeTone } from './missionHelpers';

export const RouteKpis: React.FC<{ c: Ctx }> = ({ c }) => {
  const r = c.route;
  return (
    <div className="kpis">
      <Kpi icon={<Route size={18} />} label="Traverse distance" value={r.totalDistanceKm.toFixed(2)} unit="km" />
      <Kpi icon={<Clock size={18} />} label="Estimated duration" value={Math.round(r.estimatedDurationMins)} unit="min" />
      <Kpi icon={<Wind size={18} />} label="Oxygen consumed" value={r.estimatedOxygenUsedL.toFixed(0)} unit="L" />
      <Kpi icon={<Zap size={18} />} label="PLSS battery draw" value={r.estimatedEnergyUsedKwh.toFixed(2)} unit="kWh" />
      <Kpi icon={<Mountain size={18} />} label="Max slope" value={r.maxSlopeDeg.toFixed(1)} unit="°" />
      <Kpi icon={<Activity size={18} />} label="Hazard score" value={Math.round(r.hazardScore)} unit="/ 100" />
    </div>
  );
};

export const LayerSwitch: React.FC<{ c: Ctx }> = ({ c }) => (
  <div className="seg" style={{ flexWrap: 'wrap' }}>
    {LAYERS.map((l) => (
      <button key={l.id} aria-pressed={c.layer === l.id} onClick={() => c.setLayer(l.id)} title={l.mission}>{l.name}</button>
    ))}
  </div>
);

export const WaypointTable: React.FC<{ c: Ctx }> = ({ c }) => (
  <div style={{ overflowX: 'auto' }}>
    <table className="tbl">
      <thead><tr><th>Waypoint</th><th>Type</th><th>Target mineral</th><th>Slope</th><th>Radiation</th><th>Elevation</th></tr></thead>
      <tbody>
        {c.site.waypoints.map((w) => (
          <tr key={w.id} className={c.selected?.id === w.id ? 'on' : ''} onClick={() => c.pickWaypoint(w)}>
            <td><b>{w.name}</b><div className="xs muted">{w.title}</div></td>
            <td><span className={`badge ${w.type === 'hazard' ? 'bad' : w.type === 'base' ? 'ok' : ''}`}>{TYPE_LABEL[w.type]}</span></td>
            <td>{w.targetMineral}</td>
            <td><span className={`badge ${slopeTone(w.slopeRisk)}`}>{w.slopeRisk}°</span></td>
            <td>{w.radiationLevel} mSv/h</td>
            <td>{w.coord.elevation} m</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Timeline: React.FC<{ c: Ctx }> = ({ c }) => {
  const stops = c.route.waypointsVisited.length ? c.route.waypointsVisited : [c.base];
  return (
    <ul className="tl" style={{ margin: 0, paddingLeft: 28 }}>
      {stops.map((w, i) => (
        <li key={w.id + i} className={i === 0 ? 'start' : i === stops.length - 1 && c.selected != null ? 'end' : ''}>
          <b className="sm">{w.name}</b>
          <div className="xs muted">{w.title}</div>
          <div className="xs muted">{w.coord.lat.toFixed(3)}°, {w.coord.lng.toFixed(3)}° · {w.coord.elevation} m</div>
        </li>
      ))}
      {c.selected == null && <li className="end"><b className="sm">Custom point</b><div className="xs muted">Selected on the map</div></li>}
    </ul>
  );
};

export const Passes: React.FC = () => (
  <>
    {SATELLITE_PASS_SCHEDULE.map((s) => (
      <div className="row" key={s.satelliteName}>
        <div><b>{s.satelliteName}</b><div className="xs muted">{s.status === 'In View' ? `Pass lasts ${s.durationMinutes} min` : `Next pass in ${s.nextPassTimeMinutes} min · ${s.durationMinutes} min`} · {s.elevationDegrees}° elev.</div></div>
        <div style={{ textAlign: 'right' }}><span className={`badge ${s.status === 'In View' ? 'ok' : s.status === 'Approaching' ? 'warn' : ''}`}>{s.status}</span><div className="xs muted">{s.bandwidthMbps} Mbps</div></div>
      </div>
    ))}
  </>
);

export const Weather: React.FC<{ c: Ctx }> = ({ c }) => {
  const w = c.site.weather;
  return (
    <>
      <Row k="Ground temperature" v={`${w.groundTempC} °C`} />
      <Row k="Air temperature" v={`${w.airTempC} °C`} />
      <Row k="Pressure" v={`${w.pressurePa} Pa`} />
      <Row k="Wind" v={`${w.windSpeedMs} m/s · ${w.windDirection}`} />
      <Row k="Dust opacity (τ)" v={w.opticalDepthTau} />
      <Row k="UV index" v={w.uvIndex} />
      <Row k="Solar flux" v={`${w.solarFluxWm2} W/m²`} />
    </>
  );
};

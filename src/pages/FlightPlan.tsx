import React from 'react';
import { Download, Printer } from 'lucide-react';
import { RouteKpis, Timeline, hazardText, hazardTone } from './parts';
import { Row, type Ctx } from './shared';

export const FlightPlan: React.FC<Ctx> = (c) => {
  const { site, route, selected: t } = c;
  const download = () => {
    const data = {
      missionTitle: 'ARES Navigator: Martian EVA Surface Traverse Plan',
      timestamp: new Date().toISOString(),
      site: { id: site.id, name: site.name, coordinates: site.coordinates, missionBasis: site.landingMission, weather: site.weather },
      targetObjective: t ? { name: t.name, goal: t.scienceGoal, targetMineral: t.targetMineral, sample: t.sample } : 'Exploration traverse',
      traverseMetrics: { distanceKm: route.totalDistanceKm, durationMins: route.estimatedDurationMins, oxygenConsumptionL: route.estimatedOxygenUsedL, energyExpenditureKwh: route.estimatedEnergyUsedKwh, maxSlopeDegrees: route.maxSlopeDeg, hazardScore: route.hazardScore, elevationGainM: route.elevationGainM, elevationLossM: route.elevationLossM },
      safetyProtocols: { abortSlopeThresholdDeg: 15, emergencyO2ReservePct: 20, radiationThresholdMsv: 0.05 },
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `flight-plan-${site.id}.json`;
    a.click();
  };
  return (
    <>
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <b style={{ fontSize: 17 }}>EVA surface traverse plan</b>
          <div className="sm muted">{site.name} · {site.coordinates} · generated {new Date().toLocaleDateString()}</div>
        </div>
        <span className={`badge ${hazardTone(route.hazardScore)}`}>{hazardText(route.hazardScore)}</span>
        <button className="btn" onClick={() => window.print()}><Printer size={16} />Print</button>
        <button className="btn pri" onClick={download}><Download size={16} />Download JSON</button>
      </div>
      <RouteKpis c={c} />
      <div className="g2">
        <div className="card"><h3>Route</h3><Timeline c={c} /></div>
        <div className="card">
          <h3>Objective</h3>
          {t ? (<>
            <Row k="Target" v={t.name} /><Row k="Science goal" v={<span style={{ fontWeight: 500 }}>{t.scienceGoal}</span>} /><Row k="Target mineral" v={t.targetMineral} />
            {t.sample && <Row k="Sample" v={`${t.sample.name} · ${t.sample.massGrams} g`} />}
          </>) : <p className="sm muted">Exploration traverse to a custom point.</p>}
          <h3 style={{ marginTop: 18 }}>Safety protocols</h3>
          <Row k="Abort slope threshold" v="15°" /><Row k="Emergency O₂ reserve" v="20%" /><Row k="Radiation threshold" v="0.05 mSv/h" />
        </div>
      </div>
    </>
  );
};

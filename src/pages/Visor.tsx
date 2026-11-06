import React from 'react';
import { VisorHUD } from '../components/VisorHUD';
import type { Ctx } from './shared';

export const Visor: React.FC<Ctx> = (c) => (
  <div className="card" style={{ background: '#0d1330', borderColor: '#0d1330' }}>
    <div className="noprint" style={{ color: '#aab2dd', fontSize: 13, marginBottom: 12 }}>
      Simulated first-person helmet display for the current traverse to <b style={{ color: '#fff' }}>{c.selected?.name ?? 'custom point'}</b>. Artificial horizon, compass tape, suit consumables and hazard alerts update live.
    </div>
    <VisorHUD site={c.site} route={c.route} targetWaypoint={c.selected} onEmergencyReturn={c.emergency} onSwitchMode={(m) => c.go(m === 'tablet' ? 'planner' : 'crew')} />
  </div>
);

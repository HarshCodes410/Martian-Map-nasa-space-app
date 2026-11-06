import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Brain, Check, FileText, FlaskConical, Glasses, LayoutDashboard, MapPin, Moon, PanelLeftClose, PanelLeftOpen, Route, Satellite, Sun, Users, Volume2, VolumeX } from 'lucide-react';
import type { LayerType, RouteTraverse, Waypoint } from './types/mars';
import { MISSION_SITES, SATELLITE_PASS_SCHEDULE } from './data/marsDatasets';
import { calculateEVAPath, generateTerrainGrid } from './utils/pathfinder';
import { marsAudio } from './utils/audioSystem';
import type { Ctx, PageId } from './pages/shared';
import { CommandPalette, SearchBox, type CmdItem } from './pages/ui';
import { Overview } from './pages/Overview';
import { Planner } from './pages/Planner';
import { Visor } from './pages/Visor';
import { Science } from './pages/Science';
import { CoPilot } from './pages/CoPilot';
import { Crew } from './pages/Crew';
import { FlightPlan } from './pages/FlightPlan';

const NAV: { group: string; items: { id: PageId; label: string; sub: string; Icon: React.ElementType }[] }[] = [
  { group: 'Operations', items: [
    { id: 'overview', label: 'Overview', sub: 'Mission control at a glance', Icon: LayoutDashboard },
    { id: 'planner', label: 'Route planner', sub: 'Layers, terrain and traverse design', Icon: Route },
    { id: 'visor', label: 'Visor simulator', sub: 'First-person EVA heads-up display', Icon: Glasses },
  ] },
  { group: 'Intelligence', items: [
    { id: 'science', label: 'Science & samples', sub: 'Targets, minerals and datasets', Icon: FlaskConical },
    { id: 'ai', label: 'AI co-pilot', sub: 'Terrain hazard and biosignature models', Icon: Brain },
  ] },
  { group: 'Base', items: [
    { id: 'crew', label: 'Crew & comms', sub: 'Habitat operations command', Icon: Users },
    { id: 'plan', label: 'Flight plan', sub: 'Mission brief and export', Icon: FileText },
  ] },
];

export const App: React.FC = () => {
  const [siteId, setSiteId] = useState<'jezero' | 'gale'>('jezero');
  const [page, setPage] = useState<PageId>('overview');
  const [layer, setLayer] = useState<LayerType>('optical');
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [palette, setPalette] = useState(false);
  const [bell, setBell] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const toast = (msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((a) => [...a.slice(-2), { id, msg }]);
    setTimeout(() => setToasts((a) => a.filter((x) => x.id !== id)), 3600);
  };

  const site = MISSION_SITES[siteId];
  const grid = useMemo(() => generateTerrainGrid(siteId), [siteId]);
  const base = site.waypoints.find((w) => w.type === 'base') || site.waypoints[0];
  const firstTarget = (s: typeof site) => s.waypoints.find((w) => w.type === 'science') || s.waypoints[1];

  const [selected, setSelected] = useState<Waypoint | null>(() => firstTarget(site));
  const [target, setTarget] = useState(() => ({ x: firstTarget(site).coord.x, y: firstTarget(site).coord.y }));

  const route: RouteTraverse = useMemo(
    () => calculateEVAPath(grid, { x: base.coord.x, y: base.coord.y }, target, [base, selected].filter(Boolean) as Waypoint[], site.gridResolutionMeters),
    [grid, base, target, selected, site.gridResolutionMeters],
  );

  const chooseSite = (id: 'jezero' | 'gale') => {
    marsAudio.playClick();
    setSiteId(id);
    const t = firstTarget(MISSION_SITES[id]);
    setSelected(t);
    setTarget({ x: t.coord.x, y: t.coord.y });
  };
  const ctx: Ctx = {
    site, grid, route, layer, setLayer, selected, base,
    pickWaypoint: (w) => { marsAudio.playRadarPing(); setSelected(w); setTarget({ x: w.coord.x, y: w.coord.y }); },
    mapClick: (c) => {
      marsAudio.playClick(640);
      setTarget(c);
      setSelected(site.waypoints.find((w) => Math.hypot(w.coord.x - c.x, w.coord.y - c.y) < 8) || null);
    },
    toBase: () => { marsAudio.playClick(); setSelected(base); setTarget({ x: base.coord.x, y: base.coord.y }); },
    emergency: () => { marsAudio.playHazardAlert(); setSelected(base); setTarget({ x: base.coord.x, y: base.coord.y }); },
    go: (p) => { marsAudio.playClick(); setPage(p); },
  };

  useEffect(() => {
    const start = () => { marsAudio.startMarsWind(); window.removeEventListener('click', start); };
    window.addEventListener('click', start);
    return () => window.removeEventListener('click', start);
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    toast(`Route updated · ${route.totalDistanceKm.toFixed(2)} km · ${Math.round(route.estimatedDurationMins)} min`);
  }, [route.totalDistanceKm, route.estimatedDurationMins]);

  const alerts = [
    ...site.waypoints.filter((w) => w.slopeRisk > 15).map((w) => ({ Icon: AlertTriangle, text: `${w.name}: slope ${w.slopeRisk}° exceeds the 15° suit limit` })),
    ...SATELLITE_PASS_SCHEDULE.filter((s) => s.status !== 'Out of Range').map((s) => ({ Icon: Satellite, text: `${s.satelliteName.split(' (')[0]} ${s.status.toLowerCase()} · ${s.bandwidthMbps} Mbps` })),
  ];
  const items: CmdItem[] = [
    ...NAV.flatMap((g) => g.items.map((i) => ({ group: 'Go to', label: i.label, hint: i.sub, Icon: i.Icon, run: () => ctx.go(i.id) }))),
    ...site.waypoints.map((w) => ({ group: 'Waypoints', label: w.name, hint: w.title, Icon: MapPin, run: () => { ctx.pickWaypoint(w); setPage('planner'); } })),
    { group: 'Landing site', label: 'Jezero Crater Delta', Icon: MapPin, run: () => chooseSite('jezero') },
    { group: 'Landing site', label: 'Gale Crater · Boxwork', Icon: MapPin, run: () => chooseSite('gale') },
    { group: 'Actions', label: 'Emergency return to base', Icon: AlertTriangle, run: ctx.emergency },
    { group: 'Actions', label: dark ? 'Switch to light theme' : 'Switch to dark theme', Icon: dark ? Sun : Moon, run: () => setDark(!dark) },
  ];

  const current = NAV.flatMap((g) => g.items).find((i) => i.id === page)!;

  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}`}>
      <aside className="side">
        <button className="nav" aria-label="Collapse sidebar" title="Collapse sidebar" onClick={() => setCollapsed(!collapsed)} style={{ width: 'auto', alignSelf: collapsed ? 'center' : 'flex-end', padding: 8 }}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
        <div className="brand"><i><Route size={20} color="#fff" /></i><span>ARES Navigator</span></div>
        {NAV.map((g) => (
          <React.Fragment key={g.group}>
            <div className="grp">{g.group}</div>
            {g.items.map(({ id, label, Icon }) => (
              <button key={id} className="nav" aria-current={page === id ? 'page' : undefined} title={label} onClick={() => ctx.go(id)}>
                <Icon size={19} aria-hidden /><span>{label}</span>
              </button>
            ))}
          </React.Fragment>
        ))}
        <div className="sitebox">
          <div className="grp" style={{ padding: '0 8px 6px' }}>Landing site</div>
          <button aria-pressed={siteId === 'jezero'} onClick={() => chooseSite('jezero')}>Jezero Crater Delta</button>
          <button aria-pressed={siteId === 'gale'} onClick={() => chooseSite('gale')}>Gale Crater · Boxwork</button>
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header className="top">
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1>{current.label}</h1>
            <p>{current.sub} · {site.name}</p>
          </div>
          <SearchBox onClick={() => setPalette(true)} />
          <span className="badge ok">● Systems nominal</span>
          <span className="badge brand">Sol {site.weather.sol}</span>
          <button className="btn round" aria-label="Toggle theme" title="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button className="btn hex" aria-label="Toggle ambient audio" title="Ambient audio" onClick={() => { marsAudio.startMarsWind(); setMuted(marsAudio.toggleMute()); }}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
          <div style={{ position: 'relative' }}>
            <button className="btn round" style={{ borderRadius: 14, position: 'relative' }} aria-label="Alerts" onClick={() => setBell(!bell)}><Bell size={17} />{alerts.length > 0 && <span className="dotn" />}</button>
            {bell && (
              <div className="pop" onMouseLeave={() => setBell(false)}>
                <h3 style={{ margin: '0 0 8px' }}>Alerts <small>{alerts.length} active</small></h3>
                {alerts.map((a, n) => <div className="row" key={n}><span style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--ink)' }}><a.Icon size={16} color="var(--brand)" />{a.text}</span></div>)}
              </div>
            )}
          </div>
          <button className="btn pri" onClick={() => ctx.go('plan')}><FileText size={16} />Flight plan</button>
        </header>
        <main className="page" key={page + siteId}>
          {page === 'overview' && <Overview {...ctx} />}
          {page === 'planner' && <Planner {...ctx} />}
          {page === 'visor' && <Visor {...ctx} />}
          {page === 'science' && <Science {...ctx} />}
          {page === 'ai' && <CoPilot />}
          {page === 'crew' && <Crew {...ctx} />}
          {page === 'plan' && <FlightPlan {...ctx} />}
        </main>
      </div>
      {palette && <CommandPalette items={items} onClose={() => setPalette(false)} />}
      <div className="toasts">{toasts.map((x) => <div className="toast" key={x.id}><i><Check size={15} /></i>{x.msg}</div>)}</div>
    </div>
  );
};

export default App;

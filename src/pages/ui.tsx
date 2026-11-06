import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Ctx } from './shared';

export const Ring: React.FC<{ value: number; label: string; color: string; suffix?: string }> = ({ value, label, color, suffix = '%' }) => (
  <div className="ring" style={{ ['--v' as string]: Math.max(2, Math.min(100, value)), ['--c' as string]: color }} title={`${label}: ${Math.round(value)}${suffix}`}>
    <div className="dial"><b>{Math.round(value)}<small style={{ fontSize: 11, opacity: .7 }}>{suffix}</small></b></div>
    {label}
  </div>
);

export const ElevationProfile: React.FC<{ c: Ctx }> = ({ c }) => {
  const [hover, setHover] = useState<number | null>(null);
  const path = c.route.path;
  if (path.length < 2) return <p className="sm muted">Select a destination to see the elevation profile.</p>;
  const els = path.map((p) => p.elevation);
  const lo = Math.min(...els), hi = Math.max(...els), span = Math.max(1, hi - lo);
  const X = (i: number) => (i / (path.length - 1)) * 600, Y = (e: number) => 150 - ((e - lo) / span) * 120;
  const line = els.map((e, i) => `${X(i)},${Y(e)}`).join(' ');
  const km = (i: number) => ((i / (path.length - 1)) * c.route.totalDistanceKm).toFixed(2);
  return (
    <div className="prof" onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (path.length - 1))); }}>
      <svg viewBox="0 0 600 170" preserveAspectRatio="none">
        <defs><linearGradient id="pf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity=".45" /><stop offset="1" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,170 ${line} 600,170`} fill="url(#pf)" />
        <polyline points={line} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {hover != null && <><line x1={X(hover)} x2={X(hover)} y1="0" y2="170" stroke="var(--violet)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" /><circle cx={X(hover)} cy={Y(els[hover])} r="6" fill="var(--card)" stroke="var(--brand)" strokeWidth="3" vectorEffect="non-scaling-stroke" /></>}
      </svg>
      {hover != null && <div className="tip" style={{ left: `${(hover / (path.length - 1)) * 100}%`, top: `${(Y(els[hover]) / 170) * 190}px` }}>{Math.round(els[hover])} m · {km(hover)} km</div>}
      <div className="row" style={{ border: 0, paddingBottom: 0 }}><span>Low {Math.round(lo)} m</span><span>High {Math.round(hi)} m</span></div>
    </div>
  );
};

export interface CmdItem { group: string; label: string; hint?: string; Icon: React.ElementType; run: () => void }

export const CommandPalette: React.FC<{ items: CmdItem[]; onClose: () => void }> = ({ items, onClose }) => {
  const [q, setQ] = useState(''); const [i, setI] = useState(0);
  const list = useMemo(() => items.filter((x) => (x.label + x.group + (x.hint || '')).toLowerCase().includes(q.toLowerCase())), [items, q]);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const run = (x?: CmdItem) => { if (x) { x.run(); onClose(); } };
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="cmd" onMouseDown={(e) => e.stopPropagation()}>
        <input ref={ref} value={q} placeholder="Search pages, waypoints, actions…" onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(list.length - 1, n + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(0, n - 1)); }
            if (e.key === 'Enter') run(list[i]);
            if (e.key === 'Escape') onClose();
          }} />
        <ul>
          {list.length === 0 && <li className="muted">No matches</li>}
          {list.map((x, n) => (
            <React.Fragment key={x.group + x.label}>
              {(n === 0 || list[n - 1].group !== x.group) && <div className="h">{x.group}</div>}
              <li className={n === i ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => run(x)}>
                <i><x.Icon size={16} /></i>{x.label}{x.hint && <small>{x.hint}</small>}
              </li>
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const SearchBox: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button className="search" onClick={onClick}><Search size={16} />Search or jump to…<kbd>Ctrl K</kbd></button>
);

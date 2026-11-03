import React from 'react';
import {
  Activity,
  Flame,
  HardDrive,
  Heart,
  Satellite,
  Sparkles,
  Thermometer,
  Users,
  Zap,
} from 'lucide-react';
import type { MissionSite } from '../types/mars';
import { SATELLITE_PASS_SCHEDULE } from '../data/marsDatasets';

interface CommandCenterProps {
  site: MissionSite;
  onSelectSite: (siteId: 'jezero' | 'gale') => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ site, onSelectSite }) => {
  const samples = site.waypoints.filter((wp) => wp.sample).map((wp) => wp.sample!);

  return (
    <div className="w-full flex flex-col gap-5 font-mono-tactical text-slate-200">
      {/* Top Banner: Habitat Status & Mission Target Switcher */}
      <div className="hud-glass p-4 rounded-xl border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>HABITAT ALPHA • SURFACE OPERATIONS COMMAND</span>
          </div>
          <div className="text-xl font-bold text-white tracking-wide">{site.name}</div>
          <div className="text-xs text-slate-400">{site.region} • {site.coordinates} • {site.landingMission}</div>
        </div>

        {/* Site Switcher Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectSite('jezero')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              site.id === 'jezero'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            JEZERO DELTA
          </button>
          <button
            onClick={() => onSelectSite('gale')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              site.id === 'gale'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            GALE (BOXWORK 2025)
          </button>
        </div>
      </div>

      {/* Grid: 3 Main Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col 1: Dual-Crew Biotelemetry Monitoring */}
        <div className="flex flex-col gap-4">
          <div className="hud-glass p-4 rounded-xl border border-cyan-500/30">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-cyan-500/20 pb-2 mb-3">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Users className="w-4 h-4" /> CREW EVA TELEMETRY
              </span>
              <span className="text-emerald-400 text-[10px]">SYNC ACTIVE</span>
            </div>

            {/* Astronaut 1: Lead Explorer */}
            <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 mb-3">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  CDR. M. WATNEY (EVA LEAD)
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold">
                  ACTIVE EVA
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-red-400 animate-pulse" />
                  <span className="text-slate-400">PULSE:</span>
                  <span className="text-white font-bold">96 BPM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-slate-400">METABOLIC:</span>
                  <span className="text-white font-bold">250 W</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span className="text-slate-400">O2 RES:</span>
                  <span className="text-cyan-300 font-bold">88% (528 L)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-slate-400">PLSS BATT:</span>
                  <span className="text-amber-300 font-bold">82% (6.4h)</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 flex justify-between">
                <span>LOCATION: DELTA FRONT #3</span>
                <span className="text-emerald-400">SUIT PRESS: 29.6 kPa</span>
              </div>
            </div>

            {/* Astronaut 2: Habitat Operations & Rover Control */}
            <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  DR. A. JEMISON (SCIENCE SPEC)
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                  HABITAT MONITOR
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-red-400" />
                  <span className="text-slate-400">PULSE:</span>
                  <span className="text-white font-bold">68 BPM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-slate-400">METABOLIC:</span>
                  <span className="text-white font-bold">110 W</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span className="text-slate-400">HAB O2:</span>
                  <span className="text-emerald-300 font-bold">21.2 kPa (O2)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-slate-400">HAB ARRAY:</span>
                  <span className="text-amber-300 font-bold">98% (Solar/Kilo)</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 flex justify-between">
                <span>ROLE: ROVER TELEOPERATION</span>
                <span className="text-emerald-400">SYSTEMS NOMINAL</span>
              </div>
            </div>
          </div>

          {/* Environmental Summary Card */}
          <div className="hud-glass p-4 rounded-xl border border-cyan-500/20">
            <div className="text-xs text-slate-400 font-bold mb-2 flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
              <span>SOL {site.weather.sol} SURFACE METEOROLOGY</span>
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/60 p-2 rounded">
                <div className="text-[10px] text-slate-400">GROUND TEMP</div>
                <div className="text-white font-bold">{site.weather.groundTempC}°C</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded">
                <div className="text-[10px] text-slate-400">AIR TEMP</div>
                <div className="text-cyan-300 font-bold">{site.weather.airTempC}°C</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded">
                <div className="text-[10px] text-slate-400">PRESSURE</div>
                <div className="text-white font-bold">{site.weather.pressurePa} Pa</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded">
                <div className="text-[10px] text-slate-400">DUST OPACITY (τ)</div>
                <div className="text-amber-400 font-bold">{site.weather.opticalDepthTau}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Deep Space & Satellite Relay Comms Windows */}
        <div className="flex flex-col gap-4">
          <div className="hud-glass p-4 rounded-xl border border-cyan-500/30">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-cyan-500/20 pb-2 mb-3">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Satellite className="w-4 h-4" /> ORBITAL RELAY CONSTELLATION
              </span>
              <span className="text-xs text-slate-300">EARTH COMM DELAY: 14m 22s</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {SATELLITE_PASS_SCHEDULE.map((sat) => {
                const isInView = sat.status === 'In View';
                const isApproaching = sat.status === 'Approaching';
                return (
                  <div
                    key={sat.satelliteName}
                    className={`p-3 rounded-lg border transition-all ${
                      isInView
                        ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                        : isApproaching
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-white">{sat.satelliteName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          isInView
                            ? 'bg-cyan-500 text-black'
                            : isApproaching
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {sat.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 mt-2">
                      <div>
                        <span>PASS TIME:</span>{' '}
                        <span className="text-white font-bold">
                          {sat.nextPassTimeMinutes === 0 ? 'NOW' : `T-${sat.nextPassTimeMinutes}m`}
                        </span>
                      </div>
                      <div>
                        <span>WINDOW:</span> <span className="text-white font-bold">{sat.durationMinutes}m</span>
                      </div>
                      <div>
                        <span>UPLINK:</span> <span className="text-cyan-300 font-bold">{sat.bandwidthMbps} Mbps</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2025 Science Discovery: Boxwork Formations Spotlight */}
          {site.boxworkDetected && (
            <div className="hud-glass-science p-4 rounded-xl border border-emerald-500/40">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> 2025 NASA SCIENCE HIGHLIGHT
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                  BOXWORK RIDGES
                </span>
              </div>
              <div className="text-xs text-white font-bold mb-1">
                Hydrothermal Mineral Fracture Lattices in Mount Sharp
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                As targeted in the 2025 Curiosity campaign, boxwork structures formed when mineral-saturated subterranean waters cemented rock fissures. Once softer surrounding mudstones eroded, these knife-edge mineral blades were left exposed, serving as premier targets for ancient microbial biosignature detection.
              </div>
            </div>
          )}
        </div>

        {/* Col 3: Geological Sample Return Manifest */}
        <div className="flex flex-col gap-4">
          <div className="hud-glass p-4 rounded-xl border border-cyan-500/30">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-cyan-500/20 pb-2 mb-3">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" /> SAMPLE RETURN CACHE ({samples.length})
              </span>
              <span className="text-xs text-emerald-400">RETRIEVAL READY</span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto">
              {samples.map((s) => (
                <div key={s.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white">{s.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        s.biosignaturePotential === 'High'
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {s.biosignaturePotential.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{s.targetType} • Mass: {s.massGrams}g • Sol {s.sol}</div>
                  <div className="text-[11px] text-slate-300 mt-1">{s.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.minerals.map((m) => (
                      <span key={m} className="bg-slate-950 text-cyan-300 text-[9px] px-1.5 py-0.5 rounded border border-slate-800">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

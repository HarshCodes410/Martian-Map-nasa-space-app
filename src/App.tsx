import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  FileText,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  LayerType,
  OperationalMode,
  RouteTraverse,
  Waypoint,
} from './types/mars';
import { MISSION_SITES } from './data/marsDatasets';
import {
  calculateEVAPath,
  generateTerrainGrid,
  type TerrainCell,
} from './utils/pathfinder';
import { marsAudio } from './utils/audioSystem';
import { VisorHUD } from './components/VisorHUD';
import { TabletMode } from './components/TabletMode';
import { CommandCenter } from './components/CommandCenter';
import { MissionBriefModal } from './components/MissionBriefModal';
import { AIDashboardModal } from './components/AIDashboardModal';

export const App: React.FC = () => {
  const [siteId, setSiteId] = useState<'jezero' | 'gale'>('jezero');
  const [mode, setMode] = useState<OperationalMode>('tablet');
  const [activeLayer, setActiveLayer] = useState<LayerType>('optical');
  const [isMuted, setIsMuted] = useState(false);
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const site = MISSION_SITES[siteId];

  // Generate localized Martian DEM grid
  const terrainGrid: TerrainCell[][] = useMemo(() => {
    return generateTerrainGrid(siteId);
  }, [siteId]);

  // Selected waypoint
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(() => {
    // Default to the first science waypoint
    return site.waypoints.find((wp) => wp.type === 'science') || site.waypoints[1];
  });

  // Target destination coordinate for pathfinding
  const [targetCoord, setTargetCoord] = useState<{ x: number; y: number }>(() => {
    const initialTarget = site.waypoints.find((wp) => wp.type === 'science') || site.waypoints[1];
    return { x: initialTarget.coord.x, y: initialTarget.coord.y };
  });

  // Re-calculate route when site or target coordinate changes
  const baseWaypoint = site.waypoints.find((wp) => wp.type === 'base') || site.waypoints[0];

  const calculatedRoute: RouteTraverse = useMemo(() => {
    return calculateEVAPath(
      terrainGrid,
      { x: baseWaypoint.coord.x, y: baseWaypoint.coord.y },
      targetCoord,
      [baseWaypoint, selectedWaypoint].filter(Boolean) as Waypoint[],
      site.gridResolutionMeters
    );
  }, [terrainGrid, baseWaypoint, targetCoord, selectedWaypoint, site.gridResolutionMeters]);

  // When site switches, update default target
  const handleSelectSite = (newSiteId: 'jezero' | 'gale') => {
    marsAudio.playClick();
    setSiteId(newSiteId);
    const newSite = MISSION_SITES[newSiteId];
    const newTarget = newSite.waypoints.find((wp) => wp.type === 'science') || newSite.waypoints[1];
    setSelectedWaypoint(newTarget);
    setTargetCoord({ x: newTarget.coord.x, y: newTarget.coord.y });
  };

  const handleSelectWaypoint = (wp: Waypoint) => {
    marsAudio.playRadarPing();
    setSelectedWaypoint(wp);
    setTargetCoord({ x: wp.coord.x, y: wp.coord.y });
  };

  const handleMapClickToRoute = (coord: { x: number; y: number }) => {
    marsAudio.playClick(640);
    setTargetCoord(coord);
    // Find closest waypoint or set custom
    const closest = site.waypoints.find((w) => Math.hypot(w.coord.x - coord.x, w.coord.y - coord.y) < 8);
    setSelectedWaypoint(closest || null);
  };

  const handleResetRouteToBase = () => {
    marsAudio.playClick();
    setTargetCoord({ x: baseWaypoint.coord.x, y: baseWaypoint.coord.y });
    setSelectedWaypoint(baseWaypoint);
  };

  const handleEmergencyReturn = () => {
    marsAudio.playHazardAlert();
    setTargetCoord({ x: baseWaypoint.coord.x, y: baseWaypoint.coord.y });
    setSelectedWaypoint(baseWaypoint);
  };

  const handleToggleAudio = () => {
    marsAudio.startMarsWind();
    const muted = marsAudio.toggleMute();
    setIsMuted(muted);
  };

  // Start Mars audio on first user touch anywhere
  useEffect(() => {
    const handleFirstGesture = () => {
      marsAudio.startMarsWind();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);
    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans-human selection:bg-orange-500 selection:text-white relative">
      {/* Top Universal Aerospace Header */}
      <header className="sticky top-0 z-40 bg-[#111827]/85 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-[0_0_16px_rgba(249,115,22,0.4)]">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wider text-white">ARES-SURVIVOR</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 font-medium">
                  NASA SPACE APPS
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-sans-human">
                Martian Tactical EVA Navigator & Planetary Survival Guide
              </div>
            </div>
          </div>

          {/* Operational Tri-Mode Switcher */}
          <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-700/60 flex items-center gap-1 shadow-inner font-mono-tactical">
            <button
              onClick={() => {
                marsAudio.playClick();
                setMode('hud');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'hud'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-sm">🪖</span>
              <span>VISOR HUD</span>
            </button>
            <button
              onClick={() => {
                marsAudio.playClick();
                setMode('tablet');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'tablet'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-sm">📟</span>
              <span>EVA TABLET</span>
            </button>
            <button
              onClick={() => {
                marsAudio.playClick();
                setMode('habitat');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'habitat'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-sm">🛰️</span>
              <span>HABITAT OPS</span>
            </button>
          </div>

          {/* Right Header Controls: Audio & Mission Brief Export */}
          <div className="flex items-center gap-2 font-mono-tactical">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleAudio}
              className={`p-2 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-slate-900 border-slate-700 text-slate-500'
                  : 'bg-orange-950/60 border-orange-500/40 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
              }`}
              title={isMuted ? 'Unmute Martian Wind Ambiance' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>

            {/* AI/ML Neural Co-Pilot Trigger */}
            <button
              onClick={() => {
                marsAudio.playClick(1040);
                setIsAIOpen(true);
              }}
              className="bg-purple-950/70 hover:bg-purple-900/90 text-purple-200 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all font-bold"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>AI CO-PILOT</span>
            </button>

            {/* Mission Briefing Modal Trigger */}
            <button
              onClick={() => {
                marsAudio.playClick();
                setIsBriefOpen(true);
              }}
              className="hud-glass hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-white/10 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>FLIGHT PLAN</span>
            </button>

            {/* Site Picker Pill */}
            <div className="hidden sm:flex bg-slate-900 border border-slate-700/60 rounded-xl p-0.5 text-[11px]">
              <button
                onClick={() => handleSelectSite('jezero')}
                className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                  siteId === 'jezero' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                JEZERO DELTA
              </button>
              <button
                onClick={() => handleSelectSite('gale')}
                className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                  siteId === 'gale' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                GALE (BOXWORK)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Human Explorer Context Banner */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-4 pb-1">
        <div className="hud-glass p-3.5 md:p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-orange-950/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-300 p-0.5 shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-base">
                  🧑‍🚀
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" title="Vitals Nominal" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  Commander Mark Watney • Expedition Lead
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                  ● Life Support 100%
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Sol {site.weather.sol} Martian Morning</span>
                <span>•</span>
                <span className="text-orange-300">Surface Temp: {site.weather.groundTempC}°C</span>
                <span>•</span>
                <span className="text-cyan-300">Target: {selectedWaypoint ? selectedWaypoint.name : 'Surface Recon'}</span>
              </div>
            </div>
          </div>

          {/* Quick Help Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 flex items-center gap-1.5 transition-colors">
              <span>🗺️ Click map to route</span>
            </div>
            <div className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 flex items-center gap-1.5 transition-colors">
              <span>⛰️ Slopes &gt;15° flagged</span>
            </div>
            <div className="bg-purple-950/60 text-purple-200 px-2.5 py-1 rounded-lg border border-purple-500/30 flex items-center gap-1.5">
              <span>🧠 95.9% Neural Co-Pilot</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-4">
        {mode === 'hud' && (
          <VisorHUD
            site={site}
            route={calculatedRoute}
            targetWaypoint={selectedWaypoint}
            onEmergencyReturn={handleEmergencyReturn}
            onSwitchMode={(newMode) => setMode(newMode)}
          />
        )}

        {mode === 'tablet' && (
          <TabletMode
            site={site}
            grid={terrainGrid}
            route={calculatedRoute}
            activeLayer={activeLayer}
            onChangeLayer={setActiveLayer}
            selectedWaypoint={selectedWaypoint}
            onSelectWaypoint={handleSelectWaypoint}
            onMapClickToRoute={handleMapClickToRoute}
            onResetRouteToBase={handleResetRouteToBase}
          />
        )}

        {mode === 'habitat' && (
          <CommandCenter site={site} onSelectSite={handleSelectSite} />
        )}
      </main>

      {/* Global Mission Briefing Modal */}
      <MissionBriefModal
        isOpen={isBriefOpen}
        onClose={() => setIsBriefOpen(false)}
        site={site}
        route={calculatedRoute}
        targetWaypoint={selectedWaypoint}
      />

      {/* AI / ML Neural Co-Pilot Dashboard Modal */}
      <AIDashboardModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />

      {/* Humanized Aerospace Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0d121f]/90 px-4 py-4 text-xs text-slate-400 font-sans-human">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-slate-300 font-medium">NASA Space Apps Challenge • Interplanetary Survival Guide: Martian Map</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Missions: MRO HiRISE • Curiosity RAD • Perseverance MEDA</span>
            <span className="text-slate-600">|</span>
            <span className="text-orange-400 font-mono-tactical">ARES-SURVIVOR v2.4</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

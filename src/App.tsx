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
    <div className="min-h-screen bg-[#05070c] text-slate-100 flex flex-col font-mono-tactical selection:bg-cyan-500 selection:text-black">
      {/* Top Universal Aerospace Header */}
      <header className="sticky top-0 z-40 bg-[#080d18]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black text-xs shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              ARES
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wider text-white">ARES-SURVIVOR</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
                  NASA SPACE APPS
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                MARTIAN TACTICAL EVA NAVIGATOR & BIO-GEOLOGY SYSTEM
              </div>
            </div>
          </div>

          {/* Operational Tri-Mode Switcher */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => {
                marsAudio.playClick();
                setMode('hud');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'hud'
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,240,255,0.5)]'
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
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,240,255,0.5)]'
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
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-sm">🛰️</span>
              <span>HABITAT OPS</span>
            </button>
          </div>

          {/* Right Header Controls: Audio & Mission Brief Export */}
          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleAudio}
              className={`p-2 rounded-lg border transition-all ${
                isMuted
                  ? 'bg-slate-900 border-slate-700 text-slate-500'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
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
              className="bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all animate-pulse"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>AI CO-PILOT (ML)</span>
            </button>

            {/* Mission Briefing Modal Trigger */}
            <button
              onClick={() => {
                marsAudio.playClick();
                setIsBriefOpen(true);
              }}
              className="hud-glass hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-cyan-500/30 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>FLIGHT PLAN</span>
            </button>

            {/* Site Picker Pill */}
            <div className="hidden sm:flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => handleSelectSite('jezero')}
                className={`px-2 py-1 rounded transition-colors ${
                  siteId === 'jezero' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                JEZERO
              </button>
              <button
                onClick={() => handleSelectSite('gale')}
                className={`px-2 py-1 rounded transition-colors ${
                  siteId === 'gale' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                GALE (BOXWORK)
              </button>
            </div>
          </div>
        </div>
      </header>

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

      {/* Aerospace Footer */}
      <footer className="border-t border-slate-800 bg-[#04060a] px-4 py-3 text-[10px] text-slate-400 font-mono-tactical">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>NASA SPACE APPS CHALLENGE • "INTERPLANETARY SURVIVAL GUIDE: MARTIAN MAP"</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>DATA SOURCES: MRO HiRISE / CRISM • MSL RAD/REMS • MARS 2020 MEDA</span>
            <span>ARES-SURVIVOR v2.4</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

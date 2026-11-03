import React, { useState } from 'react';
import {
  Compass,
  Layers,
  MapPin,
  Maximize2,
  Mountain,
  Radiation,
  Sparkles,
  Thermometer,
  Eye,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import type { LayerType, MissionSite, RouteTraverse, Waypoint } from '../types/mars';
import type { TerrainCell } from '../utils/pathfinder';
import { Terrain3D } from './Terrain3D';
import { TerrainMap2D } from './TerrainMap2D';
import { marsAudio } from '../utils/audioSystem';

interface TabletModeProps {
  site: MissionSite;
  grid: TerrainCell[][];
  route: RouteTraverse | null;
  activeLayer: LayerType;
  onChangeLayer: (layer: LayerType) => void;
  selectedWaypoint: Waypoint | null;
  onSelectWaypoint: (wp: Waypoint) => void;
  onMapClickToRoute: (coord: { x: number; y: number }) => void;
  onResetRouteToBase: () => void;
}

export const TabletMode: React.FC<TabletModeProps> = ({
  site,
  grid,
  route,
  activeLayer,
  onChangeLayer,
  selectedWaypoint,
  onSelectWaypoint,
  onMapClickToRoute,
  onResetRouteToBase,
}) => {
  const [viewDimension, setViewDimension] = useState<'3d' | '2d'>('3d');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const layers: { id: LayerType; name: string; mission: string; icon: React.ReactNode; color: string }[] = [
    { id: 'optical', name: 'HiRISE Optical', mission: 'MRO (0.25m/px)', icon: <Eye className="w-3.5 h-3.5" />, color: 'text-orange-400' },
    { id: 'topography', name: 'Elevation & Slope', mission: 'MOLA / HRSC DTM', icon: <Mountain className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
    { id: 'radiation', name: 'Radiation Exposure', mission: 'Curiosity RAD', icon: <Radiation className="w-3.5 h-3.5" />, color: 'text-purple-400' },
    { id: 'spectral', name: 'CRISM Mineralogy', mission: 'MRO CRISM', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
    { id: 'thermal', name: 'Thermal Inertia', mission: 'Odyssey THEMIS', icon: <Thermometer className="w-3.5 h-3.5" />, color: 'text-amber-400' },
  ];

  return (
    <div className="w-full flex flex-col gap-4 font-mono-tactical">
      {/* Tablet Top Controls Bar */}
      <div className="hud-glass p-3 rounded-xl border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
        {/* Layer Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 pr-2 border-r border-slate-700">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold">LAYERS:</span>
          </div>
          {layers.map((l) => {
            const isActive = activeLayer === l.id;
            return (
              <button
                key={l.id}
                onClick={() => {
                  marsAudio.playClick();
                  onChangeLayer(l.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className={isActive ? 'text-black' : l.color}>{l.icon}</span>
                <span>{l.name}</span>
                <span className={`text-[9px] ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>({l.mission})</span>
              </button>
            );
          })}
        </div>

        {/* 3D vs 2D View Dimension Toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex gap-1">
            <button
              onClick={() => {
                marsAudio.playClick();
                setViewDimension('3d');
              }}
              className={`px-3 py-1 text-xs rounded transition-all ${
                viewDimension === '3d'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D PERSPECTIVE
            </button>
            <button
              onClick={() => {
                marsAudio.playClick();
                setViewDimension('2d');
              }}
              className={`px-3 py-1 text-xs rounded transition-all ${
                viewDimension === '2d'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2D TACTICAL GRID
            </button>
          </div>
          <button
            onClick={() => {
              marsAudio.playClick();
              onResetRouteToBase();
            }}
            title="Reset route to base"
            className="hud-glass p-2 rounded-lg text-slate-300 hover:text-cyan-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Map / 3D Visualizer on Left + Waypoint Science Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: The Interactive Map Viewport */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="h-[460px] w-full">
            {viewDimension === '3d' ? (
              <Terrain3D
                site={site}
                grid={grid}
                route={route}
                activeLayer={activeLayer}
                selectedWaypoint={selectedWaypoint}
                onSelectWaypoint={onSelectWaypoint}
              />
            ) : (
              <TerrainMap2D
                site={site}
                grid={grid}
                route={route}
                activeLayer={activeLayer}
                selectedWaypoint={selectedWaypoint}
                onSelectWaypoint={onSelectWaypoint}
                onMapClickToRoute={onMapClickToRoute}
              />
            )}
          </div>

          {/* Route Elevation Profile Strip */}
          {route && (
            <div className="hud-glass p-3 rounded-xl border border-cyan-500/20">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Mountain className="w-3.5 h-3.5" />
                  TRAVERSE ELEVATION CROSS-SECTION ({route.totalDistanceKm} KM)
                </span>
                <span>
                  GAIN: <span className="text-emerald-400 font-bold">+{route.elevationGainM}m</span> | LOSS: <span className="text-blue-400 font-bold">-{route.elevationLossM}m</span>
                </span>
              </div>

              {/* Simplified SVG Elevation Profile Line */}
              <div className="w-full h-14 bg-slate-950/60 rounded-lg p-1 relative overflow-hidden flex items-end">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 50">
                  <path
                    d={`M 0,50 ${route.path
                      .map((p, idx) => {
                        const px = (idx / (route.path.length - 1)) * 100;
                        const [minE, maxE] = site.elevationRange;
                        const py = 45 - ((p.elevation - minE) / (maxE - minE)) * 38;
                        return `L ${px.toFixed(1)},${py.toFixed(1)}`;
                      })
                      .join(' ')} L 100,50 Z`}
                    fill="rgba(0, 240, 255, 0.15)"
                  />
                  <path
                    d={`M 0,${45 - ((route.path[0].elevation - site.elevationRange[0]) / (site.elevationRange[1] - site.elevationRange[0])) * 38} ${route.path
                      .map((p, idx) => {
                        const px = (idx / (route.path.length - 1)) * 100;
                        const [minE, maxE] = site.elevationRange;
                        const py = 45 - ((p.elevation - minE) / (maxE - minE)) * 38;
                        return `L ${px.toFixed(1)},${py.toFixed(1)}`;
                      })
                      .join(' ')}`}
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>

              {/* Metabolic & Consumables Summary Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 pt-2 border-t border-cyan-500/10 text-xs">
                <div className="bg-slate-900/60 p-2 rounded">
                  <div className="text-[10px] text-slate-400">ESTIMATED DURATION</div>
                  <div className="text-white font-bold text-sm">{route.estimatedDurationMins} MINS</div>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <div className="text-[10px] text-slate-400">OXYGEN CONSUMED</div>
                  <div className="text-cyan-300 font-bold text-sm">{route.estimatedOxygenUsedL} LITERS</div>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <div className="text-[10px] text-slate-400">ENERGY REQUIRED</div>
                  <div className="text-amber-300 font-bold text-sm">{route.estimatedEnergyUsedKwh} KWH</div>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <div className="text-[10px] text-slate-400">MAX SLOPE ANGLE</div>
                  <div className={`font-bold text-sm ${route.maxSlopeDeg > 15 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {route.maxSlopeDeg}° {route.maxSlopeDeg > 15 ? '⚠' : '✓'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Selected Waypoint Science Dossier */}
        <div className="flex flex-col gap-3">
          {selectedWaypoint ? (
            <div className="hud-glass p-4 rounded-xl border border-cyan-500/30 flex flex-col gap-3">
              {/* Waypoint Header */}
              <div className="flex items-start justify-between border-b border-cyan-500/20 pb-2">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-widest">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedWaypoint.type.toUpperCase()} TARGET</span>
                  </div>
                  <div className="text-base font-bold text-white tracking-wide">{selectedWaypoint.name}</div>
                  <div className="text-xs text-cyan-300">{selectedWaypoint.title}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedWaypoint.slopeRisk > 15
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : selectedWaypoint.slopeRisk > 10
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    SLOPE {selectedWaypoint.slopeRisk}°
                  </span>
                </div>
              </div>

              {/* Ground-Truth Mastcam/Navcam Surface Photo */}
              <div className="relative rounded-lg overflow-hidden border border-slate-700 group cursor-pointer" onClick={() => setShowPhotoModal(true)}>
                <img
                  src={selectedWaypoint.groundPhotoUrl}
                  alt={selectedWaypoint.name}
                  className="w-full h-36 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                  <span className="text-[10px] text-cyan-300 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" /> GROUND POV RECON (MASTCAM-Z)
                  </span>
                </div>
              </div>

              {/* Geological Context */}
              <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                {selectedWaypoint.description}
              </div>

              {/* Science Goal */}
              <div className="text-xs">
                <span className="text-slate-400 text-[10px] block mb-0.5">PRIMARY SCIENCE GOAL:</span>
                <span className="text-emerald-300 font-bold">{selectedWaypoint.scienceGoal}</span>
              </div>

              {/* Target Mineral Signature */}
              <div className="text-xs bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-400 font-bold">CRISM SPECTROMETRY TARGET</div>
                  <div className="text-white text-xs">{selectedWaypoint.targetMineral}</div>
                </div>
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>

              {/* Sample Core Details if available */}
              {selectedWaypoint.sample && (
                <div className="hud-glass-science p-3 rounded-xl border border-emerald-500/40">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> DRILL SAMPLE MANIFEST
                    </span>
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold">
                      {selectedWaypoint.sample.biosignaturePotential} POTENTIAL
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">{selectedWaypoint.sample.name}</div>
                  <div className="text-[10px] text-slate-300 mt-1">{selectedWaypoint.sample.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedWaypoint.sample.minerals.map((m) => (
                      <span key={m} className="bg-slate-900 text-slate-300 text-[9px] px-1.5 py-0.5 rounded border border-slate-700">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hud-glass p-8 rounded-xl border border-dashed border-slate-700 text-center flex flex-col items-center justify-center text-slate-400">
              <MapPin className="w-8 h-8 text-cyan-400 mb-2 animate-bounce" />
              <div className="text-sm font-bold text-white">SELECT A WAYPOINT</div>
              <div className="text-xs mt-1">Tap any pin on the map or 3D terrain to inspect scientific targets and sample data.</div>
            </div>
          )}

          {/* Quick Waypoints List */}
          <div className="hud-glass p-3 rounded-xl border border-cyan-500/20">
            <div className="text-[11px] text-slate-400 font-bold mb-2 flex items-center justify-between">
              <span>EXPLORATION TARGETS ({site.waypoints.length})</span>
              <Compass className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {site.waypoints.map((wp) => (
                <button
                  key={wp.id}
                  onClick={() => {
                    marsAudio.playClick();
                    onSelectWaypoint(wp);
                  }}
                  className={`p-2 rounded text-left text-xs transition-all flex items-center justify-between ${
                    selectedWaypoint?.id === wp.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        wp.type === 'base' ? 'bg-emerald-400' : wp.type === 'hazard' ? 'bg-red-500' : 'bg-amber-400'
                      }`}
                    />
                    <span className="truncate">{wp.name}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ground Photo High-Res Zoom Modal */}
      {showPhotoModal && selectedWaypoint && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="hud-glass max-w-3xl w-full p-4 rounded-2xl border border-cyan-400/50 relative">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-cyan-400 text-xs font-bold">NASA MASTCAM-Z HIGH RESOLUTION GROUND RECON</div>
                <div className="text-white text-base font-bold">{selectedWaypoint.name} — {selectedWaypoint.title}</div>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                ESC / CLOSE
              </button>
            </div>
            <img
              src={selectedWaypoint.groundPhotoUrl}
              alt={selectedWaypoint.name}
              className="w-full max-h-[60vh] object-cover rounded-xl border border-slate-700"
            />
            <div className="mt-3 text-xs text-slate-300">{selectedWaypoint.description}</div>
          </div>
        </div>
      )}
    </div>
  );
};

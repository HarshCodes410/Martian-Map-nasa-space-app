import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Compass,
  Flame,
  Heart,
  Radio,
  ShieldAlert,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import type { MissionSite, RouteTraverse, SuitTelemetry, Waypoint } from '../types/mars';
import { marsAudio } from '../utils/audioSystem';

interface VisorHUDProps {
  site: MissionSite;
  route: RouteTraverse | null;
  targetWaypoint: Waypoint | null;
  onEmergencyReturn: () => void;
  onSwitchMode: (mode: 'tablet' | 'habitat') => void;
}

export const VisorHUD: React.FC<VisorHUDProps> = ({
  site,
  route,
  targetWaypoint,
  onEmergencyReturn,
  onSwitchMode,
}) => {
  // Dynamic Astronaut Telemetry Simulation
  const [telemetry, setTelemetry] = useState<SuitTelemetry>({
    oxygenPercent: 88,
    oxygenLitersRemaining: 528,
    oxygenBurnRate: 1.35,
    batteryPercent: 82,
    batteryHoursRemaining: 6.4,
    suitPressureKpa: 29.6,
    suitLeakRate: 0.02,
    coreTempC: 37.1,
    heartRateBpm: 94,
    metabolicRateWatts: 245,
    cumulativeDoseMsv: 0.18,
    instantRadiationDoseRate: 0.013,
  });

  const [heading, setHeading] = useState(64);
  const [pitch, setPitch] = useState(2);
  const [isAlertActive, setIsAlertActive] = useState(false);

  // Dynamic simulation ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setHeading((h) => (h + (Math.random() - 0.5) * 1.5 + 360) % 360);
      setPitch((p) => Math.max(-12, Math.min(12, p + (Math.random() - 0.5) * 0.8)));

      setTelemetry((prev) => {
        // Higher heart rate & oxygen burn when climbing steep slopes
        const currentSlope = route ? route.maxSlopeDeg : 6;
        const targetBpm = 85 + currentSlope * 3;
        const newBpm = Math.round(prev.heartRateBpm * 0.9 + targetBpm * 0.1);
        const newBurnRate = Number((1.1 + (newBpm / 100) * 0.6).toFixed(2));

        return {
          ...prev,
          oxygenLitersRemaining: Math.max(0, prev.oxygenLitersRemaining - newBurnRate * 0.01),
          oxygenPercent: Math.max(0, Math.round((prev.oxygenLitersRemaining / 600) * 100)),
          batteryPercent: Math.max(0, Number((prev.batteryPercent - 0.003).toFixed(1))),
          heartRateBpm: newBpm,
          oxygenBurnRate: newBurnRate,
          metabolicRateWatts: Math.round(180 + (newBpm - 80) * 2.8),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [route]);

  // Check slope hazard
  useEffect(() => {
    if (route && route.maxSlopeDeg > 15) {
      setIsAlertActive(true);
      marsAudio.playHazardAlert();
    } else {
      setIsAlertActive(false);
    }
  }, [route]);

  const targetName = targetWaypoint ? targetWaypoint.name : 'Octavia E. Butler Base';
  const targetDistance = route ? `${route.totalDistanceKm} km` : '1.24 km';
  const targetEta = route ? `${route.estimatedDurationMins} min` : '32 min';

  return (
    <div className="relative w-full h-[85vh] min-h-[600px] max-h-[850px] rounded-3xl overflow-hidden border border-slate-700/80 bg-gradient-to-b from-[#0b1329] via-[#1a1424] to-[#3a1d17] select-none text-slate-100 font-mono-tactical shadow-2xl">
      {/* Background Starry Sky & Martian Desert Horizon Silhouette */}
      <div className="absolute inset-0 star-pattern opacity-40 pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#200e0a] via-[#331812]/80 to-transparent pointer-events-none" />

      {/* Curved Visor Vignette and Subtle CRT Reflections */}
      <div className="absolute inset-0 visor-vignette pointer-events-none z-10" />

      {/* Top Compass Tape */}
      <div className="absolute top-4 inset-x-0 flex flex-col items-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-6 py-1.5 hud-glass rounded-full border border-cyan-400/40 text-xs">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '12s' }} />
          <span className="text-slate-400">HEADING:</span>
          <span className="text-cyan-300 font-bold text-sm tracking-wider">{Math.round(heading)}° ENE</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">TARGET BEARING:</span>
          <span className="text-amber-400 font-bold">072°</span>
        </div>

        {/* Compass Ticks Strip */}
        <div className="w-72 h-4 overflow-hidden relative mt-1 border-b border-cyan-500/30 flex justify-center items-end text-[9px] text-cyan-400/70">
          <div className="absolute flex gap-8 transform -translate-x-4">
            <span>N (000)</span>
            <span>030</span>
            <span className="text-cyan-300 font-bold">060</span>
            <span>E (090)</span>
            <span>120</span>
          </div>
          <div className="w-0.5 h-3 bg-cyan-400" />
        </div>
      </div>

      {/* Top Left: Mission Location & Satellite Comms Status */}
      <div className="absolute top-4 left-6 z-20 flex flex-col gap-2">
        <div className="hud-glass p-3 rounded-xl border border-cyan-500/30 max-w-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-cyan-500/20 pb-1 mb-1.5">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              EVA SUIT HUD 2.4
            </span>
            <span>SOL {site.weather.sol}</span>
          </div>
          <div className="text-xs font-bold text-white tracking-wide truncate">{site.name}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{site.coordinates}</div>
          <div className="mt-2 flex items-center justify-between text-[10px] bg-slate-900/60 px-2 py-1 rounded">
            <span className="flex items-center gap-1 text-emerald-400">
              <Radio className="w-3 h-3" /> MRO RELAY ACTIVE
            </span>
            <span className="text-slate-400">6.0 Mbps</span>
          </div>
        </div>

        {/* Slope / Obstacle Hazard Alert Banner */}
        {isAlertActive && (
          <div className="hud-glass-danger p-2.5 rounded-xl flex items-center gap-2 text-xs text-red-200 border border-red-500/60 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-red-400">TERRAIN SLOPE ALERT ({route?.maxSlopeDeg}°)</div>
              <div className="text-[10px] text-red-300">Exceeds 15° safe EVA suit articulation limit</div>
            </div>
          </div>
        )}
      </div>

      {/* Top Right: Environmental Atmosphere Sensors */}
      <div className="absolute top-4 right-6 z-20 flex flex-col gap-2 items-end">
        <div className="hud-glass p-3 rounded-xl border border-cyan-500/30 text-right min-w-[200px]">
          <div className="text-[10px] text-slate-400 border-b border-cyan-500/20 pb-1 mb-1.5 flex justify-between">
            <span>PERSEVERANCE MEDA</span>
            <span className="text-cyan-400">ATMOSPHERE</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs">
            <Thermometer className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">SURFACE TEMP:</span>
            <span className="text-white font-bold">{site.weather.groundTempC}°C</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs mt-1">
            <Wind className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">WIND:</span>
            <span className="text-white font-bold">{site.weather.windSpeedMs} m/s ({site.weather.windDirection})</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs mt-1">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">DUST TAU (τ):</span>
            <span className="text-amber-400 font-bold">{site.weather.opticalDepthTau}</span>
          </div>
        </div>
      </div>

      {/* Center: Holographic Artificial Horizon & Target Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div
          className="relative w-80 h-80 flex items-center justify-center transition-transform duration-200"
          style={{ transform: `rotate(${pitch * 1.5}deg)` }}
        >
          {/* Outer Crosshair Ring */}
          <div className="absolute inset-0 border border-cyan-400/20 rounded-full" />
          <div className="absolute inset-4 border border-dashed border-cyan-400/30 rounded-full animate-spin" style={{ animationDuration: '60s' }} />

          {/* Artificial Horizon Pitch Ladder */}
          <div className="w-48 h-0.5 bg-cyan-400/40 relative">
            <div className="absolute -left-3 -top-2 w-2 h-4 border-l border-t border-cyan-400" />
            <div className="absolute -right-3 -top-2 w-2 h-4 border-r border-t border-cyan-400" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 border-2 border-cyan-300 rounded-full" />
          </div>

          {/* Pitch Degree Notches */}
          <div className="absolute top-16 w-20 border-t border-cyan-400/40 text-[9px] text-cyan-400/60 text-center -translate-y-2">
            +10°
          </div>
          <div className="absolute bottom-16 w-20 border-t border-cyan-400/40 text-[9px] text-cyan-400/60 text-center translate-y-2">
            -10°
          </div>

          {/* Central Target Lock HUD Marker */}
          <div className="absolute flex flex-col items-center">
            <div className="w-8 h-8 border border-cyan-300 rounded flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
            </div>
            <div className="hud-glass px-2 py-0.5 rounded text-[10px] text-cyan-300 mt-2 font-bold tracking-wide pointer-events-auto">
              TARGET: {targetName.toUpperCase()}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              DIST: <span className="text-white font-bold">{targetDistance}</span> • ETA: <span className="text-cyan-400">{targetEta}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Left Bottom: Life Support System (PLSS) Consumables Telemetry */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 max-w-xs">
        <div className="hud-glass p-3 rounded-xl border border-cyan-500/30">
          <div className="text-[11px] text-slate-400 border-b border-cyan-500/20 pb-1 mb-2 flex justify-between items-center">
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> SUIT LIFE SUPPORT (PLSS)
            </span>
            <span className="text-emerald-400 text-[10px]">NOMINAL</span>
          </div>

          {/* Oxygen Level */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">OXYGEN TANK</span>
              <span className="text-cyan-300 font-bold">{telemetry.oxygenLitersRemaining.toFixed(0)} L ({telemetry.oxygenPercent}%)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500"
                style={{ width: `${telemetry.oxygenPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
              <span>CONSUMPTION: {telemetry.oxygenBurnRate} L/min</span>
              <span>PRESSURE: {telemetry.suitPressureKpa} kPa</span>
            </div>
          </div>

          {/* Suit Battery */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> BATTERY PACK
              </span>
              <span className="text-amber-300 font-bold">{telemetry.batteryPercent}% ({telemetry.batteryHoursRemaining} hrs)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-500"
                style={{ width: `${telemetry.batteryPercent}%` }}
              />
            </div>
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-cyan-500/20 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-red-400 animate-pulse" />
              <span className="text-slate-400">HR:</span>
              <span className="text-white font-bold">{telemetry.heartRateBpm} BPM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="text-slate-400">BURN:</span>
              <span className="text-white font-bold">{telemetry.metabolicRateWatts} W</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-purple-400" />
              <span className="text-slate-400">RAD RATE:</span>
              <span className="text-purple-300 font-bold">{telemetry.instantRadiationDoseRate} mSv/h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span className="text-slate-400">TOTAL DOSE:</span>
              <span className="text-cyan-300 font-bold">{telemetry.cumulativeDoseMsv} mSv</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Bottom: Tactical Abort & Mode Quick Switch */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 items-end">
        {/* Abort EVA Button */}
        <button
          onClick={() => {
            marsAudio.playHazardAlert();
            onEmergencyReturn();
          }}
          className="hud-glass-danger hover:bg-red-950/80 text-red-200 px-4 py-2.5 rounded-xl border border-red-500/50 flex items-center gap-2 text-xs font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
          <span>EMERGENCY ABORT EVA (RETURN TO BASE)</span>
        </button>

        {/* Quick Nav Mode Switchers */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              marsAudio.playClick();
              onSwitchMode('tablet');
            }}
            className="hud-glass hover:bg-cyan-950/60 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/30 text-xs flex items-center gap-1.5 transition-all"
          >
            <span>FIELD TABLET VIEW</span>
          </button>
          <button
            onClick={() => {
              marsAudio.playClick();
              onSwitchMode('habitat');
            }}
            className="hud-glass hover:bg-cyan-950/60 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/30 text-xs flex items-center gap-1.5 transition-all"
          >
            <span>HABITAT COMMAND</span>
          </button>
        </div>
      </div>
    </div>
  );
};

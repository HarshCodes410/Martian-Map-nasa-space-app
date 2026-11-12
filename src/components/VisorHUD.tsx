import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { SATELLITE_PASS_SCHEDULE } from '../data/marsDatasets';
import { marsAudio } from '../utils/audioSystem';

interface VisorHUDProps {
  site: MissionSite;
  route: RouteTraverse | null;
  targetWaypoint: Waypoint | null;
  onEmergencyReturn: () => void;
  onSwitchMode: (mode: 'tablet' | 'habitat') => void;
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function bearingLabel(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  return CARDINALS[Math.round(norm / 45) % 8];
}

function computeTargetBearingDeg(site: MissionSite, route: RouteTraverse | null, targetWaypoint: Waypoint | null): number {
  const base = site.waypoints.find((w) => w.type === 'base') ?? site.waypoints[0];
  const dest = targetWaypoint?.coord ?? route?.path?.[route.path.length - 1];
  if (!base || !dest) return 0;
  const dx = dest.x - base.coord.x;
  const dy = dest.y - base.coord.y; // y increases southward on the grid
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return 0;
  const rad = Math.atan2(dx, -dy); // 0° = North (-y), 90° = East (+x)
  return Math.round(((rad * 180) / Math.PI + 360) % 360);
}

export const VisorHUD: React.FC<VisorHUDProps> = ({
  site,
  route,
  targetWaypoint,
  onEmergencyReturn,
  onSwitchMode,
}) => {
  const targetBearing = useMemo(
    () => computeTargetBearingDeg(site, route, targetWaypoint),
    [site, route, targetWaypoint],
  );

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
    instantRadiationDoseRate: targetWaypoint?.radiationLevel ?? site.nominalRadiation / 18,
  });

  const [heading, setHeading] = useState(targetBearing);
  const [pitch, setPitch] = useState(2);

  // Derive slope alert state cleanly during render (no synchronous setState in effect)
  const isAlertActive = Boolean(route && route.maxSlopeDeg > 15);
  const prevAlertRef = useRef(false);

  useEffect(() => {
    if (isAlertActive && !prevAlertRef.current) {
      marsAudio.playHazardAlert();
    }
    prevAlertRef.current = isAlertActive;
  }, [isAlertActive]);

  // Dynamic simulation ticker
  useEffect(() => {
    const timer = setInterval(() => {
      // Gently steer heading toward target bearing with natural head motion
      setHeading((h) => {
        const diff = ((targetBearing - h + 540) % 360) - 180;
        const drift = (Math.random() - 0.5) * 1.6;
        return (h + diff * 0.08 + drift + 360) % 360;
      });
      setPitch((p) => Math.max(-12, Math.min(12, p + (Math.random() - 0.5) * 0.8)));

      const radRate = Number((targetWaypoint?.radiationLevel ?? 0.013).toFixed(4));

      setTelemetry((prev) => {
        const currentSlope = route ? route.maxSlopeDeg : 6;
        const targetBpm = 85 + currentSlope * 3;
        const newBpm = Math.round(prev.heartRateBpm * 0.9 + targetBpm * 0.1);
        const newBurnRate = Number((1.1 + (newBpm / 100) * 0.6).toFixed(2));
        const newO2 = Math.max(0, prev.oxygenLitersRemaining - newBurnRate / 60);
        const newO2Pct = Math.max(0, Math.round((newO2 / 600) * 100));
        const newBatPct = Math.max(0, Number((prev.batteryPercent - 0.004).toFixed(1)));
        const newBatHrs = Number(((newBatPct / 100) * 7.8).toFixed(1));
        const newDose = Number((prev.cumulativeDoseMsv + radRate / 3600).toFixed(4));

        return {
          ...prev,
          oxygenLitersRemaining: newO2,
          oxygenPercent: newO2Pct,
          batteryPercent: newBatPct,
          batteryHoursRemaining: newBatHrs,
          heartRateBpm: newBpm,
          oxygenBurnRate: newBurnRate,
          metabolicRateWatts: Math.round(180 + (newBpm - 80) * 2.8),
          instantRadiationDoseRate: radRate,
          cumulativeDoseMsv: newDose,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [route, targetBearing, targetWaypoint]);

  const activeRelay =
    SATELLITE_PASS_SCHEDULE.find((s) => s.status === 'In View') ??
    SATELLITE_PASS_SCHEDULE.find((s) => s.status === 'Approaching') ??
    SATELLITE_PASS_SCHEDULE[0];

  const targetName = targetWaypoint ? targetWaypoint.name : 'Custom Traverse Point';
  const targetDistance = route ? `${route.totalDistanceKm} km` : '0.00 km';
  const targetEta = route ? `${route.estimatedDurationMins} min` : '0 min';

  const plssStatus =
    telemetry.oxygenPercent < 20 || telemetry.batteryPercent < 15
      ? { label: 'LOW RESERVE', cls: 'text-red-400' }
      : isAlertActive
        ? { label: 'HIGH LOAD', cls: 'text-amber-400' }
        : { label: 'NOMINAL', cls: 'text-emerald-400' };

  // Dynamic compass ticks centered on current heading
  const roundedHeading = Math.round(heading);
  const centerTick = Math.round(roundedHeading / 15) * 15;
  const ticks = [-30, -15, 0, 15, 30].map((offset) => {
    const deg = ((centerTick + offset) % 360 + 360) % 360;
    const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg).padStart(3, '0');
    return { deg, label, isCurrent: offset === 0 };
  });

  return (
    <div className="relative w-full h-[85vh] min-h-[600px] max-h-[850px] rounded-3xl overflow-hidden border border-slate-700/80 bg-gradient-to-b from-[#0b1329] via-[#1a1424] to-[#3a1d17] select-none text-slate-100 font-mono-tactical shadow-2xl">
      {/* Background Starry Sky & Martian Desert Horizon Silhouette */}
      <div className="absolute inset-0 star-pattern opacity-40 pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#200e0a] via-[#331812]/80 to-transparent pointer-events-none" />

      {/* Curved Visor Vignette */}
      <div className="absolute inset-0 visor-vignette pointer-events-none z-10" />

      {/* Top Compass Tape */}
      <div className="absolute top-4 inset-x-0 flex flex-col items-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-6 py-1.5 hud-glass rounded-full border border-cyan-400/40 text-xs">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '12s' }} />
          <span className="text-slate-400">HEADING:</span>
          <span className="text-cyan-300 font-bold text-sm tracking-wider">
            {String(roundedHeading).padStart(3, '0')}° {bearingLabel(roundedHeading)}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">TARGET BEARING:</span>
          <span className="text-amber-400 font-bold">
            {String(targetBearing).padStart(3, '0')}° {bearingLabel(targetBearing)}
          </span>
        </div>

        {/* Dynamic Compass Ticks Strip */}
        <div className="w-72 h-5 overflow-hidden relative mt-1 border-b border-cyan-500/30 flex justify-between items-end px-3 text-[9px] text-cyan-400/70">
          {ticks.map((tk, idx) => (
            <span key={idx} className={tk.isCurrent ? 'text-cyan-300 font-bold' : ''}>
              {tk.label}
            </span>
          ))}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0.5 h-2.5 bg-cyan-400" />
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
              <Radio className="w-3 h-3" /> {activeRelay.satelliteName.split(' (')[0].toUpperCase()} ({activeRelay.status.toUpperCase()})
            </span>
            <span className="text-slate-400">{activeRelay.bandwidthMbps} Mbps</span>
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
          <div className="absolute inset-0 border border-cyan-400/20 rounded-full" />
          <div className="absolute inset-4 border border-dashed border-cyan-400/30 rounded-full animate-spin" style={{ animationDuration: '60s' }} />

          <div className="w-48 h-0.5 bg-cyan-400/40 relative">
            <div className="absolute -left-3 -top-2 w-2 h-4 border-l border-t border-cyan-400" />
            <div className="absolute -right-3 -top-2 w-2 h-4 border-r border-t border-cyan-400" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 border-2 border-cyan-300 rounded-full" />
          </div>

          <div className="absolute top-16 w-20 border-t border-cyan-400/40 text-[9px] text-cyan-400/60 text-center -translate-y-2">
            +10°
          </div>
          <div className="absolute bottom-16 w-20 border-t border-cyan-400/40 text-[9px] text-cyan-400/60 text-center translate-y-2">
            -10°
          </div>

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
            <span className={`${plssStatus.cls} text-[10px] font-bold`}>{plssStatus.label}</span>
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
              <span className="text-cyan-300 font-bold">{telemetry.cumulativeDoseMsv.toFixed(3)} mSv</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Bottom: Tactical Abort & Mode Quick Switch */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 items-end">
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

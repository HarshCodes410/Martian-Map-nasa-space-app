import React from 'react';
import { Download, FileText, Printer, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { MissionSite, RouteTraverse, Waypoint } from '../types/mars';

interface MissionBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: MissionSite;
  route: RouteTraverse | null;
  targetWaypoint: Waypoint | null;
}

export const MissionBriefModal: React.FC<MissionBriefModalProps> = ({
  isOpen,
  onClose,
  site,
  route,
  targetWaypoint,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const briefData = {
      missionTitle: 'ARES-SURVIVOR: Martian EVA Surface Traverse Plan',
      timestamp: new Date().toISOString(),
      site: {
        id: site.id,
        name: site.name,
        coordinates: site.coordinates,
        missionBasis: site.landingMission,
        weather: site.weather,
      },
      targetObjective: targetWaypoint
        ? {
            name: targetWaypoint.name,
            goal: targetWaypoint.scienceGoal,
            targetMineral: targetWaypoint.targetMineral,
            sample: targetWaypoint.sample,
          }
        : 'Exploration Traverse',
      traverseMetrics: route
        ? {
            distanceKm: route.totalDistanceKm,
            durationMins: route.estimatedDurationMins,
            oxygenConsumptionL: route.estimatedOxygenUsedL,
            energyExpenditureKwh: route.estimatedEnergyUsedKwh,
            maxSlopeDegrees: route.maxSlopeDeg,
            hazardScore: route.hazardScore,
            elevationGainM: route.elevationGainM,
            elevationLossM: route.elevationLossM,
          }
        : null,
      safetyProtocols: {
        abortSlopeThresholdDeg: 15,
        emergencyO2ReservePct: 20,
        radiationThresholdMsv: 0.05,
      },
    };

    const blob = new Blob([JSON.stringify(briefData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARES_EVA_TRAVERSE_SOL_${site.weather.sol}_${site.id.toUpperCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-mono-tactical">
      <div className="hud-glass max-w-2xl w-full p-6 rounded-2xl border border-cyan-400/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
                NASA EVA OPERATIONS DIRECTIVE
              </div>
              <div className="text-lg font-bold text-white">MARTIAN SURFACE TRAVERSE FLIGHT PLAN</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Content */}
        <div className="flex flex-col gap-4 text-xs text-slate-300">
          {/* Mission & Site Meta */}
          <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block text-[10px]">EXPLORATION LOCATION:</span>
              <span className="text-white font-bold">{site.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">COORDINATES / DATUM:</span>
              <span className="text-cyan-300 font-bold">{site.coordinates}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">HISTORICAL MISSION DATA:</span>
              <span className="text-white">{site.landingMission}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">CURRENT METEOROLOGY:</span>
              <span className="text-white">Sol {site.weather.sol} • {site.weather.groundTempC}°C • {site.weather.pressurePa} Pa</span>
            </div>
          </div>

          {/* Primary Science Directive */}
          <div className="hud-glass-science p-3.5 rounded-xl border border-emerald-500/30">
            <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">
              PRIMARY SURFACE SCIENCE DIRECTIVE
            </div>
            <div className="text-white font-bold mb-1">
              {targetWaypoint ? targetWaypoint.name : 'Regional Reconnaissance'} — {targetWaypoint ? targetWaypoint.title : ''}
            </div>
            <div className="text-slate-300 mb-2 leading-relaxed">
              {targetWaypoint ? targetWaypoint.scienceGoal : 'Conduct multi-spectral imaging and collect baseline regolith samples.'}
            </div>
            {targetWaypoint && (
              <div className="text-emerald-300 text-[11px]">
                Target Mineralogy: <span className="font-bold">{targetWaypoint.targetMineral}</span>
              </div>
            )}
          </div>

          {/* Consumables Budget & Traversal Parameters */}
          {route && (
            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-cyan-400 font-bold uppercase mb-2">
                CONSUMABLES BUDGET & TRAVERSE METRICS
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-[10px] text-slate-500">TOTAL DISTANCE</div>
                  <div className="text-white font-bold text-sm">{route.totalDistanceKm} km</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-[10px] text-slate-500">TRAVERSE TIME</div>
                  <div className="text-white font-bold text-sm">{route.estimatedDurationMins} mins</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-[10px] text-slate-500">O2 BUDGET</div>
                  <div className="text-cyan-300 font-bold text-sm">{route.estimatedOxygenUsedL} L</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-[10px] text-slate-500">BATTERY DRAW</div>
                  <div className="text-amber-300 font-bold text-sm">{route.estimatedEnergyUsedKwh} kWh</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-[10px] text-slate-500">ELEVATION DELTA</div>
                  <div className="text-white font-bold text-sm">+{route.elevationGainM}m / -{route.elevationLossM}m</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-[10px] text-slate-500">MAX SLOPE</div>
                  <div className={`font-bold text-sm ${route.maxSlopeDeg > 15 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {route.maxSlopeDeg}° {route.maxSlopeDeg > 15 ? '(HAZARD)' : '(SAFE)'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Abort Criteria & Contingencies */}
          <div className="hud-glass-warning p-3.5 rounded-xl border border-amber-500/30 text-[11px] leading-relaxed">
            <div className="text-amber-400 font-bold uppercase mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> MANDATORY ABORT CRITERIA
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Immediate abort if suit pressure drops below 27.5 kPa (4.0 psi) or leak exceeds 0.05 sccm.</li>
              <li>Traverse reroute mandatory if terrain slope exceeds 15.0° (spacesuit knee articulation limit).</li>
              <li>Return to airlock when primary O2 reserve drops to 20% (120 L safety margin).</li>
              <li>Solar storm alert: Retreat to basalt cliff shadow or habitat if radiation exceeds 0.04 mSv/h.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>NASA FLIGHT SURGEON & SAFETY OFFICER CERTIFIED</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="hud-glass hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> PRINT BRIEF
            </button>
            <button
              onClick={handleDownloadJSON}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(0,240,255,0.4)]"
            >
              <Download className="w-3.5 h-3.5" /> EXPORT FLIGHT PLAN (JSON)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

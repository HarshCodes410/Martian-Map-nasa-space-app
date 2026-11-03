export type OperationalMode = 'hud' | 'tablet' | 'habitat';

export type MissionSiteId = 'jezero' | 'gale';

export type LayerType = 'optical' | 'topography' | 'radiation' | 'spectral' | 'thermal';

export interface GeoCoordinate {
  lat: number;
  lng: number;
  x: number; // 0 to 100 on local grid
  y: number; // 0 to 100 on local grid
  elevation: number; // meters relative to Martian datum
}

export interface ScienceSample {
  id: string;
  name: string;
  sol: number;
  targetType: 'Igneous' | 'Sedimentary' | 'Clay/Phyllosilicate' | 'Carbonate' | 'Boxwork Vein' | 'Sulfate';
  massGrams: number;
  biosignaturePotential: 'High' | 'Moderate' | 'Baseline' | 'Target Of Interest';
  description: string;
  minerals: string[];
}

export interface Waypoint {
  id: string;
  name: string;
  coord: GeoCoordinate;
  type: 'base' | 'science' | 'hazard' | 'cache' | 'rover';
  title: string;
  description: string;
  scienceGoal: string;
  targetMineral: string;
  slopeRisk: number; // in degrees
  radiationLevel: number; // in mSv/h
  groundPhotoUrl: string;
  sample?: ScienceSample;
}

export interface SuitTelemetry {
  oxygenPercent: number; // 0 - 100%
  oxygenLitersRemaining: number;
  oxygenBurnRate: number; // L/min (varies by slope & metabolic effort)
  batteryPercent: number; // 0 - 100%
  batteryHoursRemaining: number;
  suitPressureKpa: number; // Nominal ~29.6 kPa (4.3 psi)
  suitLeakRate: number; // sccm
  coreTempC: number; // 36.8 - 37.5 C
  heartRateBpm: number; // 60 - 165 bpm
  metabolicRateWatts: number; // 150 - 480 W
  cumulativeDoseMsv: number; // accumulated radiation
  instantRadiationDoseRate: number; // mSv/h
}

export interface MartianAtmosphere {
  sol: number;
  groundTempC: number;
  airTempC: number;
  pressurePa: number;
  windSpeedMs: number;
  windDirection: string;
  opticalDepthTau: number; // dust opacity
  uvIndex: number;
  solarFluxWm2: number;
}

export interface SatellitePass {
  satelliteName: 'MRO (Mars Reconnaissance Orbiter)' | 'MAVEN' | 'ExoMars TGO' | 'Mars Odyssey';
  status: 'In View' | 'Approaching' | 'Out of Range';
  nextPassTimeMinutes: number;
  durationMinutes: number;
  elevationDegrees: number;
  bandwidthMbps: number;
}

export interface RouteTraverse {
  path: GeoCoordinate[];
  totalDistanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  maxSlopeDeg: number;
  estimatedDurationMins: number;
  estimatedOxygenUsedL: number;
  estimatedEnergyUsedKwh: number;
  hazardScore: number; // 0 - 100 (lower is safer)
  waypointsVisited: Waypoint[];
}

export interface MissionSite {
  id: MissionSiteId;
  name: string;
  region: string;
  coordinates: string;
  landingMission: string;
  description: string;
  scienceFocus: string;
  elevationRange: [number, number];
  nominalRadiation: number; // mSv/sol
  weather: MartianAtmosphere;
  waypoints: Waypoint[];
  gridResolutionMeters: number;
  boxworkDetected?: boolean;
}

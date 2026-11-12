import type { GeoCoordinate, RouteTraverse, Waypoint } from '../types/mars';

// Grid size for the tactical localized traversal map
export const GRID_COLS = 50;
export const GRID_ROWS = 50;

export interface TerrainCell {
  x: number; // 0 to 49
  y: number; // 0 to 49
  elevation: number; // in meters
  slopeDeg: number; // calculated from neighbors
  radiation: number; // mSv/h
  isSandDune: boolean;
  isBoxwork: boolean;
  traversable: boolean;
  mineralSignature: 'none' | 'carbonate' | 'clay' | 'sulfate' | 'hematite';
}

/**
 * Procedural generation of localized Mars digital elevation grid (DEM)
 * grounded in real Jezero and Gale topographic benchmarks.
 */
export function generateTerrainGrid(
  siteId: 'jezero' | 'gale',
  cellMeters: number = siteId === 'jezero' ? 45 : 110,
): TerrainCell[][] {
  const grid: TerrainCell[][] = [];

  for (let y = 0; y < GRID_ROWS; y++) {
    const row: TerrainCell[] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      // Normalized coordinates [0, 1]
      const nx = x / (GRID_COLS - 1);
      const ny = y / (GRID_ROWS - 1);

      let elev = 0;
      let isSand = false;
      let isBoxwork = false;
      let mineral: 'none' | 'carbonate' | 'clay' | 'sulfate' | 'hematite' = 'none';

      if (siteId === 'jezero') {
        // Jezero Crater baseline: -2550m on crater floor, rising to -2230m on delta and rim
        const deltaDist = Math.hypot(nx - 0.75, ny - 0.25);
        const kodiakDist = Math.hypot(nx - 0.38, ny - 0.58);
        const seetahDist = Math.hypot(nx - 0.32, ny - 0.82);

        // Smooth crater floor to delta rise
        elev = -2550 + Math.max(0, 1 - deltaDist) * 320;

        // Kodiak butte isolated mesa (steep-sided erosional remnant)
        if (kodiakDist < 0.08) {
          elev += Math.cos((kodiakDist / 0.08) * (Math.PI / 2)) * 50;
          mineral = 'clay';
        }

        // Séítah dune field with smooth radial falloff at perimeter
        if (seetahDist < 0.12) {
          isSand = true;
          const falloff = Math.cos((seetahDist / 0.12) * (Math.PI / 2));
          elev += Math.sin(nx * 40) * 6 * falloff;
        }

        // Delta scarp mineral rich zone
        if (nx > 0.45 && nx < 0.65 && ny > 0.35 && ny < 0.55) {
          mineral = 'carbonate';
        }
      } else {
        // Gale Crater: Crater floor at Bradbury (-4450m), climbing Mount Sharp to -3300m
        const mtSharpDist = Math.hypot(nx - 0.85, ny - 0.15);
        const boxworkDist = Math.hypot(nx - 0.50, ny - 0.48);
        const veraRubinDist = Math.hypot(nx - 0.35, ny - 0.62);
        const bagnoldDist = Math.hypot(nx - 0.28, ny - 0.70);

        elev = -4450 + Math.max(0, 1 - mtSharpDist) * 1150;

        // Boxwork fracture ridges network (smoothly tapered polygonal ridges)
        if (boxworkDist < 0.15) {
          isBoxwork = true;
          const falloff = Math.cos((boxworkDist / 0.15) * (Math.PI / 2));
          const boxPattern = Math.abs(Math.sin(nx * 42) * Math.cos(ny * 42));
          if (boxPattern > 0.35) {
            elev += ((boxPattern - 0.35) / 0.65) * 30 * falloff;
          }
          mineral = 'sulfate';
        }

        // Vera Rubin Ridge (hematite) with smooth flank taper
        if (veraRubinDist < 0.09) {
          const falloff = Math.cos((veraRubinDist / 0.09) * (Math.PI / 2));
          elev += 40 * falloff;
          mineral = 'hematite';
        }

        // Bagnold dunes
        if (bagnoldDist < 0.1) {
          isSand = true;
          const falloff = Math.cos((bagnoldDist / 0.1) * (Math.PI / 2));
          elev += Math.sin(nx * 45) * 12 * falloff;
        }
      }

      // Base radiation with slight cosmic ray shielding at lower elevations
      const elevThreshold = siteId === 'jezero' ? -2400 : -3900;
      const rad = 0.012 + (elev > elevThreshold ? 0.004 : 0.001);

      row.push({
        x,
        y,
        elevation: Math.round(elev),
        slopeDeg: 0, // computed below
        radiation: Number(rad.toFixed(4)),
        isSandDune: isSand,
        isBoxwork,
        traversable: true,
        mineralSignature: mineral,
      });
    }
    grid.push(row);
  }

  // Second pass: Calculate realistic slope angles from central differences
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const left = grid[y][Math.max(0, x - 1)].elevation;
      const right = grid[y][Math.min(GRID_COLS - 1, x + 1)].elevation;
      const up = grid[Math.max(0, y - 1)][x].elevation;
      const down = grid[Math.min(GRID_ROWS - 1, y + 1)][x].elevation;

      const dxSpan = (x === 0 || x === GRID_COLS - 1 ? 1 : 2) * cellMeters;
      const dySpan = (y === 0 || y === GRID_ROWS - 1 ? 1 : 2) * cellMeters;
      const dz_dx = (right - left) / dxSpan;
      const dz_dy = (down - up) / dySpan;
      const gradient = Math.hypot(dz_dx, dz_dy);
      const slopeDeg = (Math.atan(gradient) * 180) / Math.PI;

      grid[y][x].slopeDeg = Math.round(slopeDeg * 10) / 10;

      // Obstacle check: Slopes > 22° or deep sand dunes with > 14° slope are non-traversable for EVA suit
      if (slopeDeg > 22 || (grid[y][x].isSandDune && slopeDeg > 14)) {
        grid[y][x].traversable = false;
      }
    }
  }

  return grid;
}

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function runAStar(
  grid: TerrainCell[][],
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  cellMeters: number,
  allowImpassablePenalty: boolean,
): Node | null {
  const openList: Node[] = [];
  const openMap = new Map<string, Node>();
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: Math.hypot(targetX - startX, targetY - startY) * cellMeters,
    f: Math.hypot(targetX - startX, targetY - startY) * cellMeters,
    parent: null,
  };
  openList.push(startNode);
  openMap.set(`${startX},${startY}`, startNode);

  const directions = [
    { dx: 1, dy: 0, distMult: 1 },
    { dx: -1, dy: 0, distMult: 1 },
    { dx: 0, dy: 1, distMult: 1 },
    { dx: 0, dy: -1, distMult: 1 },
    { dx: 1, dy: 1, distMult: 1.4142 },
    { dx: -1, dy: 1, distMult: 1.4142 },
    { dx: 1, dy: -1, distMult: 1.4142 },
    { dx: -1, dy: -1, distMult: 1.4142 },
  ];

  const maxIterations = GRID_COLS * GRID_ROWS * 2;
  let iterations = 0;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    let lowestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) {
        lowestIdx = i;
      }
    }

    const current = openList.splice(lowestIdx, 1)[0];
    const key = `${current.x},${current.y}`;
    openMap.delete(key);
    closedSet.add(key);

    if (current.x === targetX && current.y === targetY) {
      return current;
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
      const nKey = `${nx},${ny}`;
      if (closedSet.has(nKey)) continue;

      const cell = grid[ny][nx];
      const isGoal = nx === targetX && ny === targetY;
      if (!cell.traversable && !isGoal && !allowImpassablePenalty) {
        continue;
      }

      const stepDist = cellMeters * dir.distMult;
      const elevDelta = cell.elevation - grid[current.y][current.x].elevation;
      const localInclineDeg = (Math.atan(Math.abs(elevDelta) / stepDist) * 180) / Math.PI;

      let slopeCostMultiplier = 1.0;
      if (!cell.traversable && !isGoal) {
        slopeCostMultiplier = 50.0;
      } else if (localInclineDeg > 15) {
        slopeCostMultiplier = 8.0;
      } else if (localInclineDeg > 10) {
        slopeCostMultiplier = 3.5;
      } else if (localInclineDeg > 5) {
        slopeCostMultiplier = 1.8;
      }

      const sandPenalty = cell.isSandDune ? 2.5 : 1.0;
      const radiationPenalty = 1.0 + Math.max(0, cell.radiation - 0.010) * 50;

      const stepCost = stepDist * slopeCostMultiplier * sandPenalty * radiationPenalty;
      const gScore = current.g + stepCost;

      const existingOpen = openMap.get(nKey);
      if (existingOpen) {
        if (gScore < existingOpen.g) {
          existingOpen.g = gScore;
          existingOpen.f = existingOpen.g + existingOpen.h;
          existingOpen.parent = current;
        }
      } else {
        const hScore = Math.hypot(targetX - nx, targetY - ny) * cellMeters;
        const nextNode: Node = {
          x: nx,
          y: ny,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current,
        };
        openList.push(nextNode);
        openMap.set(nKey, nextNode);
      }
    }
  }

  return null;
}

/**
 * Bio-Metabolic A* Pathfinding Engine
 * Computes least-energy, least-risk traverse path between Mars waypoints.
 */
export function calculateEVAPath(
  grid: TerrainCell[][],
  startCoord: { x: number; y: number },
  endCoord: { x: number; y: number },
  waypoints: Waypoint[],
  cellMeters: number = 45,
  allSiteWaypoints: Waypoint[] = [],
): RouteTraverse {
  // Convert percentage coordinates [0..100] to grid cell [0..GRID_COLS-1]
  const startX = Math.min(GRID_COLS - 1, Math.max(0, Math.round((startCoord.x / 100) * (GRID_COLS - 1))));
  const startY = Math.min(GRID_ROWS - 1, Math.max(0, Math.round((startCoord.y / 100) * (GRID_ROWS - 1))));
  const targetX = Math.min(GRID_COLS - 1, Math.max(0, Math.round((endCoord.x / 100) * (GRID_COLS - 1))));
  const targetY = Math.min(GRID_ROWS - 1, Math.max(0, Math.round((endCoord.y / 100) * (GRID_ROWS - 1))));

  // Primary A* respecting impassable obstacles; fallback A* allows emergency traversal with 50x penalty
  const endNode =
    runAStar(grid, startX, startY, targetX, targetY, cellMeters, false) ??
    runAStar(grid, startX, startY, targetX, targetY, cellMeters, true);

  // Reconstruct path
  const path: GeoCoordinate[] = [];
  let curr: Node | null = endNode;

  while (curr) {
    const cell = grid[curr.y][curr.x];
    path.unshift({
      lat: 0,
      lng: 0,
      x: (curr.x / (GRID_COLS - 1)) * 100,
      y: (curr.y / (GRID_ROWS - 1)) * 100,
      elevation: cell.elevation,
    });
    curr = curr.parent;
  }

  // Safety fallback if grid is empty or degenerate
  if (path.length === 0) {
    path.push({
      lat: 0,
      lng: 0,
      x: startCoord.x,
      y: startCoord.y,
      elevation: grid[startY]?.[startX]?.elevation ?? 0,
    });
    path.push({
      lat: 0,
      lng: 0,
      x: endCoord.x,
      y: endCoord.y,
      elevation: grid[targetY]?.[targetX]?.elevation ?? 0,
    });
  }

  // Calculate detailed traverse metrics using exact grid physical span
  const spanXMeters = (GRID_COLS - 1) * cellMeters;
  const spanYMeters = (GRID_ROWS - 1) * cellMeters;
  let totalDistanceMeters = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;
  let maxSlopeDeg = 0;

  for (let i = 1; i < path.length; i++) {
    const p0 = path[i - 1];
    const p1 = path[i];
    const dxMeters = ((p1.x - p0.x) / 100) * spanXMeters;
    const dyMeters = ((p1.y - p0.y) / 100) * spanYMeters;
    const dist2D = Math.hypot(dxMeters, dyMeters);
    const dz = p1.elevation - p0.elevation;

    totalDistanceMeters += Math.hypot(dist2D, dz);

    if (dz > 0) elevationGainM += dz;
    else elevationLossM += Math.abs(dz);

    const stepSlope = dist2D > 0 ? (Math.atan(Math.abs(dz) / dist2D) * 180) / Math.PI : 0;
    if (stepSlope > maxSlopeDeg) maxSlopeDeg = stepSlope;
  }

  // Walking velocity on Mars (approx 2.4 km/h baseline, slows down on inclines)
  const avgSpeedKmh = Math.max(1.2, 2.5 - (maxSlopeDeg / 20) * 1.0);
  const totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(2));
  const estimatedDurationMins = Math.round((totalDistanceKm / avgSpeedKmh) * 60);

  // Oxygen consumption: ~1.3 L/min nominal walking, up to ~2.5 L/min climbing steep grade
  const avgO2RateLpm = 1.3 + (elevationGainM / Math.max(1, totalDistanceMeters)) * 2.0;
  const estimatedOxygenUsedL = Math.round(estimatedDurationMins * avgO2RateLpm);

  // Energy consumption (EVA suit battery draw ~420W total suit + PLSS life support)
  const estimatedEnergyUsedKwh = Number(((estimatedDurationMins / 60) * 0.42).toFixed(2));

  // Hazard score (0 - 100)
  const hazardScore = Math.min(100, Math.round(maxSlopeDeg * 2.8 + (elevationGainM / 50) * 5));

  // Detect any intermediate waypoints along the path (in order of encounter)
  const visited: Waypoint[] = [];
  const seenIds = new Set<string>();
  const candidates = allSiteWaypoints.length > 0 ? allSiteWaypoints : waypoints;

  if (waypoints[0]) {
    visited.push(waypoints[0]);
    seenIds.add(waypoints[0].id);
  }

  const targetWp = waypoints[waypoints.length - 1];
  for (const pt of path) {
    for (const wp of candidates) {
      if (seenIds.has(wp.id) || (targetWp && wp.id === targetWp.id)) continue;
      if (Math.hypot(wp.coord.x - pt.x, wp.coord.y - pt.y) <= 7) {
        visited.push(wp);
        seenIds.add(wp.id);
      }
    }
  }

  if (targetWp && !seenIds.has(targetWp.id)) {
    visited.push(targetWp);
  }

  return {
    path,
    totalDistanceKm,
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM),
    maxSlopeDeg: Math.round(maxSlopeDeg * 10) / 10,
    estimatedDurationMins,
    estimatedOxygenUsedL,
    estimatedEnergyUsedKwh,
    hazardScore,
    waypointsVisited: visited,
  };
}

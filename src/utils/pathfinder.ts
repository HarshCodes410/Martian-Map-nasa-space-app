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
export function generateTerrainGrid(siteId: 'jezero' | 'gale'): TerrainCell[][] {
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
        // Jezero Crater baseline: -2550m on crater floor, rising to -2250m on delta and rim
        // Crater floor at bottom-left (low x, high y)
        // Delta fan extends from top-right towards center
        const deltaDist = Math.hypot(nx - 0.75, ny - 0.25);
        const kodiakDist = Math.hypot(nx - 0.38, ny - 0.58);
        const seetahDist = Math.hypot(nx - 0.32, ny - 0.82);

        // Base slope from delta gorge to crater floor
        elev = -2550 + (1 - deltaDist) * 320;

        // Kodiak butte isolated mesa
        if (kodiakDist < 0.08) {
          elev += Math.cos((kodiakDist / 0.08) * (Math.PI / 2)) * 90;
          mineral = 'clay';
        }

        // Séítah dune field
        if (seetahDist < 0.12) {
          isSand = true;
          elev += Math.sin(nx * 40) * 8; // ripples
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

        elev = -4450 + (1 - mtSharpDist) * 1150;

        // Boxwork fracture ridges network (2025 discovery)
        if (boxworkDist < 0.15) {
          isBoxwork = true;
          // Reticulated polygonal ridges
          const boxPattern = (Math.sin(nx * 50) * Math.cos(ny * 50));
          if (Math.abs(boxPattern) > 0.4) {
            elev += 25; // sharp ridge
          }
          mineral = 'sulfate';
        }

        // Vera Rubin Ridge (hematite)
        if (veraRubinDist < 0.09) {
          elev += 35;
          mineral = 'hematite';
        }

        // Bagnold dunes
        if (bagnoldDist < 0.1) {
          isSand = true;
        }
      }

      // Base radiation with slight cosmic ray shielding at lower elevations
      const rad = 0.012 + (elev > -2400 ? 0.004 : 0.001);

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
  const cellMeters = siteId === 'jezero' ? 25 : 30; // meters per grid cell
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const left = grid[y][Math.max(0, x - 1)].elevation;
      const right = grid[y][Math.min(GRID_COLS - 1, x + 1)].elevation;
      const up = grid[Math.max(0, y - 1)][x].elevation;
      const down = grid[Math.min(GRID_ROWS - 1, y + 1)][x].elevation;

      const dz_dx = (right - left) / (2 * cellMeters);
      const dz_dy = (down - up) / (2 * cellMeters);
      const gradient = Math.hypot(dz_dx, dz_dy);
      const slopeDeg = (Math.atan(gradient) * 180) / Math.PI;

      grid[y][x].slopeDeg = Math.round(slopeDeg * 10) / 10;

      // Obstacle check: Slopes > 22° or deep sand dunes with > 15° slope are non-traversable for EVA suit
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

/**
 * Bio-Metabolic A* Pathfinding Engine
 * Computes least-energy, least-risk traverse path between Mars waypoints.
 */
export function calculateEVAPath(
  grid: TerrainCell[][],
  startCoord: { x: number; y: number },
  endCoord: { x: number; y: number },
  waypoints: Waypoint[],
  cellMeters: number = 25
): RouteTraverse {
  // Convert percentage coordinates [0..100] to grid cell [0..GRID_COLS-1]
  const startX = Math.min(GRID_COLS - 1, Math.max(0, Math.round((startCoord.x / 100) * (GRID_COLS - 1))));
  const startY = Math.min(GRID_ROWS - 1, Math.max(0, Math.round((startCoord.y / 100) * (GRID_ROWS - 1))));
  const targetX = Math.min(GRID_COLS - 1, Math.max(0, Math.round((endCoord.x / 100) * (GRID_COLS - 1))));
  const targetY = Math.min(GRID_ROWS - 1, Math.max(0, Math.round((endCoord.y / 100) * (GRID_ROWS - 1))));

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: Math.hypot(targetX - startX, targetY - startY) * cellMeters,
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openList.push(startNode);

  const directions = [
    { dx: 1, dy: 0, distMult: 1 },
    { dx: -1, dy: 0, distMult: 1 },
    { dx: 0, dy: 1, distMult: 1 },
    { dx: 0, dy: -1, distMult: 1 },
    { dx: 1, dy: 1, distMult: 1.414 },
    { dx: -1, dy: 1, distMult: 1.414 },
    { dx: 1, dy: -1, distMult: 1.414 },
    { dx: -1, dy: -1, distMult: 1.414 },
  ];

  let endNode: Node | null = null;
  let iterations = 0;
  const maxIterations = 8000;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f score
    let lowestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) {
        lowestIdx = i;
      }
    }

    const current = openList.splice(lowestIdx, 1)[0];
    const key = `${current.x},${current.y}`;
    closedSet.add(key);

    if (current.x === targetX && current.y === targetY) {
      endNode = current;
      break;
    }

    // Expand neighbors
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
      if (closedSet.has(`${nx},${ny}`)) continue;

      const cell = grid[ny][nx];
      if (!cell.traversable && !(nx === targetX && ny === targetY)) {
        continue; // impassable cliff or dune trap
      }

      // Step physical distance
      const stepDist = cellMeters * dir.distMult;

      // Incline cost: Minetti bio-metabolic cost formula adapted for Mars
      const elevDelta = cell.elevation - grid[current.y][current.x].elevation;
      const localInclineDeg = (Math.atan(Math.abs(elevDelta) / stepDist) * 180) / Math.PI;

      // Heavy penalty for steep slopes:
      let slopeCostMultiplier = 1.0;
      if (localInclineDeg > 15) {
        slopeCostMultiplier = 8.0;
      } else if (localInclineDeg > 10) {
        slopeCostMultiplier = 3.5;
      } else if (localInclineDeg > 5) {
        slopeCostMultiplier = 1.8;
      }

      // Sand dune slip penalty
      const sandPenalty = cell.isSandDune ? 2.5 : 1.0;

      // Radiation risk penalty
      const radiationPenalty = 1.0 + (cell.radiation - 0.010) * 50;

      const stepCost = stepDist * slopeCostMultiplier * sandPenalty * radiationPenalty;
      const gScore = current.g + stepCost;

      const existingOpen = openList.find((n) => n.x === nx && n.y === ny);
      if (existingOpen) {
        if (gScore < existingOpen.g) {
          existingOpen.g = gScore;
          existingOpen.f = existingOpen.g + existingOpen.h;
          existingOpen.parent = current;
        }
      } else {
        const hScore = Math.hypot(targetX - nx, targetY - ny) * cellMeters;
        openList.push({
          x: nx,
          y: ny,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current,
        });
      }
    }
  }

  // Reconstruct path
  const path: GeoCoordinate[] = [];
  let curr: Node | null = endNode;

  while (curr) {
    const cell = grid[curr.y][curr.x];
    path.unshift({
      lat: 0, // will interpolate
      lng: 0,
      x: (curr.x / (GRID_COLS - 1)) * 100,
      y: (curr.y / (GRID_ROWS - 1)) * 100,
      elevation: cell.elevation,
    });
    curr = curr.parent;
  }

  // If A* failed to find path due to complete wall, fallback to direct line
  if (path.length === 0) {
    path.push({
      lat: 0,
      lng: 0,
      x: startCoord.x,
      y: startCoord.y,
      elevation: grid[startY][startX].elevation,
    });
    path.push({
      lat: 0,
      lng: 0,
      x: endCoord.x,
      y: endCoord.y,
      elevation: grid[targetY][targetX].elevation,
    });
  }

  // Calculate detailed traverse metrics
  let totalDistanceMeters = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;
  let maxSlopeDeg = 0;

  for (let i = 1; i < path.length; i++) {
    const p0 = path[i - 1];
    const p1 = path[i];
    const dxMeters = ((p1.x - p0.x) / 100) * (GRID_COLS * cellMeters);
    const dyMeters = ((p1.y - p0.y) / 100) * (GRID_ROWS * cellMeters);
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

  // Oxygen consumption: ~1.2 L/min nominal walking, up to 2.4 L/min climbing steep grade
  const avgO2RateLpm = 1.3 + (elevationGainM / Math.max(1, totalDistanceMeters)) * 2.0;
  const estimatedOxygenUsedL = Math.round(estimatedDurationMins * avgO2RateLpm);

  // Energy consumption (EVA suit battery draw ~280W base + metabolic life support)
  const estimatedEnergyUsedKwh = Number(((estimatedDurationMins / 60) * 0.42).toFixed(2));

  // Hazard score (0 - 100)
  const hazardScore = Math.min(100, Math.round(maxSlopeDeg * 2.8 + (elevationGainM / 50) * 5));

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
    waypointsVisited: waypoints,
  };
}

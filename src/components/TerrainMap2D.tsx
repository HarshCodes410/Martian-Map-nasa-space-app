import React, { useEffect, useRef, useState } from 'react';
import type { LayerType, MissionSite, RouteTraverse, Waypoint } from '../types/mars';
import { GRID_COLS, GRID_ROWS, type TerrainCell } from '../utils/pathfinder';

interface TerrainMap2DProps {
  site: MissionSite;
  grid: TerrainCell[][];
  route: RouteTraverse | null;
  activeLayer: LayerType;
  selectedWaypoint: Waypoint | null;
  onSelectWaypoint: (wp: Waypoint) => void;
  onMapClickToRoute?: (coord: { x: number; y: number }) => void;
}

export const TerrainMap2D: React.FC<TerrainMap2DProps> = ({
  site,
  grid,
  route,
  activeLayer,
  selectedWaypoint,
  onSelectWaypoint,
  onMapClickToRoute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredCell, setHoveredCell] = useState<TerrainCell | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Render the layered canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellW = width / GRID_COLS;
    const cellH = height / GRID_ROWS;

    const [minElev, maxElev] = site.elevationRange;
    const elevSpan = maxElev - minElev || 1;

    // 1. Draw Base Terrain according to Active Science Layer
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = grid[r][c];
        const normElev = Math.max(0, Math.min(1, (cell.elevation - minElev) / elevSpan));

        if (activeLayer === 'topography') {
          if (cell.slopeDeg > 15) {
            ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.95, 0.4 + (cell.slopeDeg - 15) * 0.05)})`; // Hazard red
          } else if (cell.slopeDeg > 10) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.55)'; // Amber caution
          } else {
            const val = Math.floor(normElev * 140) + 30;
            ctx.fillStyle = `rgb(${val - 10}, ${val + 10}, ${val + 30})`;
          }
        } else if (activeLayer === 'radiation') {
          const radFactor = Math.min(1, Math.max(0, (cell.radiation - 0.011) / 0.007));
          const red = Math.floor(radFactor * 220 + 20);
          const green = Math.floor((1 - radFactor) * 160 + 20);
          const blue = 190;
          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.85)`;
        } else if (activeLayer === 'spectral') {
          if (cell.mineralSignature === 'carbonate') {
            ctx.fillStyle = '#10b981'; // Green
          } else if (cell.mineralSignature === 'clay') {
            ctx.fillStyle = '#06b6d4'; // Cyan
          } else if (cell.mineralSignature === 'sulfate') {
            ctx.fillStyle = '#fbbf24'; // Gold
          } else if (cell.mineralSignature === 'hematite') {
            ctx.fillStyle = '#d946ef'; // Purple
          } else {
            ctx.fillStyle = '#1e293b';
          }
        } else if (activeLayer === 'thermal') {
          const red = Math.floor(normElev * 200 + 40);
          const blue = Math.floor((1 - normElev) * 200 + 40);
          ctx.fillStyle = `rgb(${red}, 60, ${blue})`;
        } else {
          // Optical: HiRISE / CTX satellite representation
          if (cell.isSandDune) {
            ctx.fillStyle = '#5c3a21'; // Dark dune
          } else if (cell.isBoxwork) {
            ctx.fillStyle = '#d4b996'; // Boxwork veins
          } else {
            const red = Math.floor(140 + normElev * 60);
            const green = Math.floor(75 + normElev * 40);
            const blue = Math.floor(45 + normElev * 25);
            ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
          }
        }

        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);

        // Draw subtle contour lines on Topography mode (handle negative elevations properly)
        const mod50 = ((cell.elevation % 50) + 50) % 50;
        if (activeLayer === 'topography' && mod50 < 4) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }

    // 2. Draw Coordinate Grid & Tactical Reticles
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += width / 5) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let j = 0; j < height; j += height / 5) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(width, j);
      ctx.stroke();
    }

    // 3. Draw Planned EVA Route Line
    if (route && route.path.length > 1) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      route.path.forEach((pt, idx) => {
        const px = (pt.x / 100) * width;
        const py = (pt.y / 100) * height;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Waypoints
    site.waypoints.forEach((wp) => {
      const px = (wp.coord.x / 100) * width;
      const py = (wp.coord.y / 100) * height;
      const isSelected = selectedWaypoint?.id === wp.id;

      if (isSelected) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = wp.type === 'base' ? '#10b981' : wp.type === 'hazard' ? '#ef4444' : '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '10px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(wp.name, px + 9, py + 3);
      ctx.shadowBlur = 0;
    });
  }, [site, grid, route, activeLayer, selectedWaypoint]);

  // Handle Mouse Move using rendered CSS bounding rect for accurate scaling
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor((x / rect.width) * GRID_COLS)));
    const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor((y / rect.height) * GRID_ROWS)));

    if (grid[row]?.[col]) {
      setHoveredCell(grid[row][col]);
      setHoverPos({ x, y, w: rect.width, h: rect.height });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
    setHoverPos(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Normalize into canvas pixel coordinates so hit detection is accurate at any aspect ratio
    const canvasX = (clickX / rect.width) * canvas.width;
    const canvasY = (clickY / rect.height) * canvas.height;

    const hitRadius = 18;
    for (const wp of site.waypoints) {
      const wpPx = (wp.coord.x / 100) * canvas.width;
      const wpPy = (wp.coord.y / 100) * canvas.height;
      if (Math.hypot(canvasX - wpPx, canvasY - wpPy) <= hitRadius) {
        onSelectWaypoint(wp);
        return;
      }
    }

    if (onMapClickToRoute) {
      const pctX = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
      const pctY = Math.max(0, Math.min(100, Math.round((clickY / rect.height) * 100)));
      onMapClickToRoute({ x: pctX, y: pctY });
    }
  };

  // Scale bar covers 20% of the map width (matching 1 of 5 grid divisions)
  const scaleKm = (((GRID_COLS - 1) * site.gridResolutionMeters) * 0.2) / 1000;
  const scaleLabel = scaleKm >= 1 ? `${scaleKm.toFixed(2)} km` : `${Math.round(scaleKm * 1000)} m`;

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-700/60 bg-gradient-to-b from-[#111827] to-[#0b0f19] shadow-2xl">
      <canvas
        ref={canvasRef}
        width={700}
        height={500}
        className="w-full h-full cursor-crosshair block"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* Top Banner with GPS & North Arrow */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="hud-glass px-2.5 py-1 rounded border border-cyan-500/30 font-mono-tactical text-[11px] text-cyan-300 flex items-center gap-2">
          <span className="font-bold text-white">N ↑</span>
          <span>GRID {GRID_COLS}x{GRID_ROWS}</span>
          <span className="text-slate-400">RES: {site.gridResolutionMeters}m/cell</span>
        </div>
      </div>

      {/* Live Hover Telemetry Inspector Tooltip */}
      {hoveredCell && hoverPos && (
        <div
          className="absolute pointer-events-none hud-glass px-2.5 py-1.5 rounded-lg border border-cyan-400/50 shadow-xl text-[10px] font-mono-tactical text-slate-200 z-30"
          style={{
            left: hoverPos.x + 210 > hoverPos.w ? Math.max(8, hoverPos.x - 205) : hoverPos.x + 12,
            top: hoverPos.y + 125 > hoverPos.h ? Math.max(8, hoverPos.y - 120) : hoverPos.y + 12,
          }}
        >
          <div className="text-cyan-400 font-bold border-b border-cyan-500/20 pb-0.5 mb-1">
            LOCAL CELL INSPECTOR [{hoveredCell.x}, {hoveredCell.y}]
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div>ELEVATION:</div>
            <div className="text-white font-bold">{hoveredCell.elevation} m</div>
            <div>SLOPE GRADIENT:</div>
            <div className={hoveredCell.slopeDeg > 15 ? 'text-red-400 font-bold' : hoveredCell.slopeDeg > 10 ? 'text-amber-400' : 'text-emerald-400'}>
              {hoveredCell.slopeDeg}° {hoveredCell.slopeDeg > 15 ? '⚠ DANGER' : ''}
            </div>
            <div>RAD FLUX:</div>
            <div className="text-purple-300">{hoveredCell.radiation} mSv/h</div>
            <div>MINERALOGY:</div>
            <div className="text-emerald-300 uppercase">{hoveredCell.mineralSignature}</div>
            <div>TERRAIN:</div>
            <div className={hoveredCell.isSandDune ? 'text-amber-300 font-bold' : 'text-slate-300'}>
              {hoveredCell.isSandDune ? 'DUNE REGOLITH' : hoveredCell.isBoxwork ? 'BOXWORK RIDGE' : 'BEDROCK'}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Scale Bar (20% of map width = 1 grid division) */}
      <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-2 font-mono-tactical text-[10px] text-slate-300 hud-glass px-2 py-0.5 rounded" style={{ width: 'calc(20% + 52px)' }}>
        <div className="flex-1 h-1.5 bg-cyan-400 border border-black relative">
          <div className="absolute -top-3 left-0 text-[9px]">0</div>
          <div className="absolute -top-3 right-0 text-[9px]">{scaleLabel}</div>
        </div>
        <span>SCALE</span>
      </div>

      {/* Interactive Helper Hint */}
      <div className="absolute bottom-3 right-3 pointer-events-none text-[10px] font-mono-tactical text-slate-400 hud-glass px-2 py-1 rounded">
        CLICK ANYWHERE TO RE-ROUTE A* TRAVERSE
      </div>
    </div>
  );
};

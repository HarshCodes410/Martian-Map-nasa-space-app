import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { LayerType, MissionSite, RouteTraverse, Waypoint } from '../types/mars';
import { GRID_COLS, GRID_ROWS, type TerrainCell } from '../utils/pathfinder';

interface Terrain3DProps {
  site: MissionSite;
  grid: TerrainCell[][];
  route: RouteTraverse | null;
  activeLayer: LayerType;
  selectedWaypoint: Waypoint | null;
  onSelectWaypoint: (wp: Waypoint) => void;
}

function disposeGroupChildren(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
}

export const Terrain3D: React.FC<Terrain3DProps> = ({
  site,
  grid,
  route,
  activeLayer,
  selectedWaypoint,
  onSelectWaypoint,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const routeLineRef = useRef<THREE.Line | null>(null);
  const waypointGroupRef = useRef<THREE.Group | null>(null);
  const onSelectWaypointRef = useRef(onSelectWaypoint);
  const waypointsRef = useRef(site.waypoints);

  useEffect(() => {
    onSelectWaypointRef.current = onSelectWaypoint;
    waypointsRef.current = site.waypoints;
  }, [onSelectWaypoint, site.waypoints]);

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const downPosRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ rotX: 0.65, rotY: 0.4, dist: 130 });

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const width = Math.max(1, mountEl.clientWidth);
    const height = Math.max(1, mountEl.clientHeight);

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x181e2b, 0.004);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountEl.appendChild(renderer.domElement);

    // 2. Lighting (Warm Martian golden-hour sun + sky backfill)
    const ambientLight = new THREE.AmbientLight(0x384860, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffecd0, 2.8);
    sunLight.position.set(60, 100, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const horizonBounce = new THREE.DirectionalLight(0xea580c, 0.55);
    horizonBounce.position.set(-60, 20, -50);
    scene.add(horizonBounce);

    // 3. Waypoint and Marker Container
    const wpGroup = new THREE.Group();
    waypointGroupRef.current = wpGroup;
    scene.add(wpGroup);

    // 4. Subtle Mars Dust Particles
    const dustCount = 350;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 160;
      dustPositions[i + 1] = Math.random() * 40 + 5;
      dustPositions[i + 2] = (Math.random() - 0.5) * 160;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xffa07a,
      size: 0.8,
      transparent: true,
      opacity: 0.5,
    });
    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustPoints);

    // Animation Loop
    let animationFrameId = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const { rotX, rotY, dist } = cameraAngleRef.current;
      camera.position.x = dist * Math.sin(rotY) * Math.cos(rotX);
      camera.position.y = dist * Math.sin(rotX);
      camera.position.z = dist * Math.cos(rotY) * Math.cos(rotX);
      camera.lookAt(0, 0, 0);

      dustPoints.rotation.y += 0.0008;

      renderer.render(scene, camera);
    };
    animate();

    // Raycaster for clicking 3D waypoint markers
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Mouse Controls
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      downPosRef.current = { x: e.clientX, y: e.clientY };
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.rotY -= dx * 0.008;
      cameraAngleRef.current.rotX = Math.max(0.15, Math.min(1.4, cameraAngleRef.current.rotX + dy * 0.008));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      // Treat as a click if pointer barely moved
      const moved = Math.hypot(e.clientX - downPosRef.current.x, e.clientY - downPosRef.current.y);
      if (moved < 5 && waypointGroupRef.current) {
        const rect = renderer.domElement.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(waypointGroupRef.current.children, false);
          if (hits.length > 0) {
            const wpId = hits[0].object.userData.waypointId as string | undefined;
            const wp = waypointsRef.current.find((item) => item.id === wpId);
            if (wp) onSelectWaypointRef.current(wp);
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.dist = Math.max(40, Math.min(220, cameraAngleRef.current.dist + e.deltaY * 0.1));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      if (!mountEl || !rendererRef.current) return;
      const w = Math.max(1, mountEl.clientWidth);
      const h = Math.max(1, mountEl.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountEl);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);

      if (terrainMeshRef.current) {
        terrainMeshRef.current.geometry.dispose();
        (terrainMeshRef.current.material as THREE.Material).dispose();
        terrainMeshRef.current = null;
      }
      if (routeLineRef.current) {
        routeLineRef.current.geometry.dispose();
        (routeLineRef.current.material as THREE.Material).dispose();
        routeLineRef.current = null;
      }
      if (waypointGroupRef.current) {
        disposeGroupChildren(waypointGroupRef.current);
      }
      dustGeometry.dispose();
      dustMaterial.dispose();

      if (mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Terrain Mesh when site or activeLayer changes
  useEffect(() => {
    if (!sceneRef.current || !grid.length) return;

    if (terrainMeshRef.current) {
      sceneRef.current.remove(terrainMeshRef.current);
      terrainMeshRef.current.geometry.dispose();
      (terrainMeshRef.current.material as THREE.Material).dispose();
    }

    const geometry = new THREE.PlaneGeometry(100, 100, GRID_COLS - 1, GRID_ROWS - 1);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const [minElev, maxElev] = site.elevationRange;
    const elevSpan = maxElev - minElev || 1;

    for (let i = 0; i < pos.count; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cell = grid[row]?.[col];

      if (cell) {
        const normElev = Math.max(0, Math.min(1, (cell.elevation - minElev) / elevSpan));
        pos.setY(i, normElev * 20);

        let r = 0.75, g = 0.35, b = 0.2;

        if (activeLayer === 'topography') {
          if (cell.slopeDeg > 15) {
            r = 0.95; g = 0.15; b = 0.15;
          } else if (cell.slopeDeg > 10) {
            r = 0.95; g = 0.65; b = 0.15;
          } else {
            r = 0.2 + normElev * 0.6;
            g = 0.3 + normElev * 0.5;
            b = 0.4 + normElev * 0.4;
          }
        } else if (activeLayer === 'radiation') {
          const radFactor = Math.min(1, Math.max(0, (cell.radiation - 0.011) / 0.007));
          r = 0.1 + radFactor * 0.85;
          g = 0.2 + (1 - radFactor) * 0.5;
          b = 0.8 + (1 - radFactor) * 0.2;
        } else if (activeLayer === 'spectral') {
          if (cell.mineralSignature === 'carbonate') {
            r = 0.1; g = 0.9; b = 0.4;
          } else if (cell.mineralSignature === 'clay') {
            r = 0.1; g = 0.6; b = 0.95;
          } else if (cell.mineralSignature === 'sulfate') {
            r = 0.95; g = 0.85; b = 0.15;
          } else if (cell.mineralSignature === 'hematite') {
            r = 0.85; g = 0.2; b = 0.8;
          } else {
            r = 0.3; g = 0.25; b = 0.22;
          }
        } else if (activeLayer === 'thermal') {
          const therm = normElev;
          r = 0.1 + therm * 0.8;
          g = 0.2 + therm * 0.5;
          b = 0.7 - therm * 0.4;
        } else {
          if (cell.isSandDune) {
            r = 0.45; g = 0.25; b = 0.18;
          } else if (cell.isBoxwork) {
            r = 0.85; g = 0.75; b = 0.6;
          } else {
            r = 0.72 + normElev * 0.15;
            g = 0.38 + normElev * 0.1;
            b = 0.22 + normElev * 0.05;
          }
        }

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    sceneRef.current.add(mesh);
    terrainMeshRef.current = mesh;
  }, [site, grid, activeLayer]);

  // Update Waypoint Markers in 3D (disposing old geometries/materials)
  useEffect(() => {
    const group = waypointGroupRef.current;
    if (!group || !grid.length) return;

    disposeGroupChildren(group);

    const [minElev, maxElev] = site.elevationRange;
    const elevSpan = maxElev - minElev || 1;

    site.waypoints.forEach((wp) => {
      const worldX = wp.coord.x - 50;
      const worldZ = wp.coord.y - 50;

      const gridX = Math.min(GRID_COLS - 1, Math.max(0, Math.round((wp.coord.x / 100) * (GRID_COLS - 1))));
      const gridY = Math.min(GRID_ROWS - 1, Math.max(0, Math.round((wp.coord.y / 100) * (GRID_ROWS - 1))));
      const elev = grid[gridY]?.[gridX]?.elevation ?? wp.coord.elevation;
      const normElev = Math.max(0, Math.min(1, (elev - minElev) / elevSpan));
      const worldY = normElev * 20;

      const isSelected = selectedWaypoint?.id === wp.id;
      const markerColor = isSelected ? 0x00f0ff : wp.type === 'base' ? 0x10b981 : wp.type === 'hazard' ? 0xef4444 : 0xf59e0b;

      const beaconGeo = new THREE.CylinderGeometry(0.3, 0.3, 14, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.6,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(worldX, worldY + 7, worldZ);
      beacon.userData.waypointId = wp.id;
      group.add(beacon);

      const sphereGeo = new THREE.SphereGeometry(isSelected ? 1.8 : 1.2, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: markerColor,
        emissive: isSelected ? 0x00f0ff : wp.type === 'base' ? 0x10b981 : wp.type === 'hazard' ? 0xef4444 : 0xf59e0b,
        emissiveIntensity: 0.8,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(worldX, worldY + 14, worldZ);
      sphere.userData.waypointId = wp.id;
      group.add(sphere);
    });
  }, [site, grid, selectedWaypoint]);

  // Update Route Path Line in 3D
  useEffect(() => {
    if (!sceneRef.current) return;

    if (routeLineRef.current) {
      sceneRef.current.remove(routeLineRef.current);
      routeLineRef.current.geometry.dispose();
      (routeLineRef.current.material as THREE.Material).dispose();
      routeLineRef.current = null;
    }

    if (!route || route.path.length < 2) return;

    const [minElev, maxElev] = site.elevationRange;
    const elevSpan = maxElev - minElev || 1;

    const points: THREE.Vector3[] = [];
    route.path.forEach((pt) => {
      const worldX = pt.x - 50;
      const worldZ = pt.y - 50;
      const normElev = Math.max(0, Math.min(1, (pt.elevation - minElev) / elevSpan));
      const worldY = normElev * 20 + 0.6;
      points.push(new THREE.Vector3(worldX, worldY, worldZ));
    });

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 3,
    });

    const line = new THREE.Line(lineGeo, lineMat);
    sceneRef.current.add(line);
    routeLineRef.current = line;
  }, [route, site]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-700/60 bg-gradient-to-b from-[#111827] to-[#0b0f19] shadow-2xl">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left 3D Camera Controls overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="hud-glass px-3 py-1.5 rounded-lg border border-cyan-500/30 text-xs font-mono-tactical text-cyan-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>3D TACTICAL SURFACE VIEWPORT</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono-tactical">
          DRAG TO ROTATE • WHEEL TO ZOOM • CLICK BEACON TO SELECT
        </div>
      </div>

      {/* Top Right Quick Compass & Layer Tag */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="hud-glass px-3 py-1 rounded text-xs font-mono-tactical text-slate-300 uppercase">
          LAYER: <span className="text-cyan-400 font-bold">{activeLayer}</span>
        </div>
      </div>

      {/* Interactive Waypoint Selectors at Bottom */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-1 pointer-events-auto">
        {site.waypoints.map((wp) => {
          const isSelected = selectedWaypoint?.id === wp.id;
          return (
            <button
              key={wp.id}
              onClick={() => onSelectWaypoint(wp)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono-tactical transition-all duration-200 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.6)]'
                  : 'hud-glass text-slate-300 hover:text-white hover:border-cyan-400/50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wp.type === 'base' ? 'bg-emerald-400' : wp.type === 'hazard' ? 'bg-red-500' : 'bg-amber-400'
                }`}
              />
              <span>{wp.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

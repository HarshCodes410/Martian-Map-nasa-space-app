import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface RoverDigitalTwinProps {
  pitchDeg?: number;
  rollDeg?: number;
  yawDeg?: number;
  linearSpeed?: number;
  angularSpeed?: number;
  scanRanges?: (number | null)[];
  driveMode?: string;
}

function lerpAngleShortest(current: number, target: number, alpha: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * alpha;
}

export const RoverDigitalTwin3D: React.FC<RoverDigitalTwinProps> = ({
  pitchDeg = 0,
  rollDeg = 0,
  yawDeg = 0,
  linearSpeed = 0,
  angularSpeed = 0,
  scanRanges,
  driveMode = 'auto',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ rotX: 0.45, rotY: 0.65, dist: 11 });

  // References for animation
  const roverMasterRef = useRef<THREE.Group | null>(null);
  const chassisRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);
  const lidarPuckRef = useRef<THREE.Mesh | null>(null);
  const laserBeamRef = useRef<THREE.Line | null>(null);
  const laserPointsRef = useRef<THREE.Points | null>(null);
  const targetRotRef = useRef({ pitch: 0, roll: 0, yaw: 0 });
  const motionRef = useRef({ linearSpeed, angularSpeed, driveMode });

  useEffect(() => {
    motionRef.current = { linearSpeed, angularSpeed, driveMode };
  }, [linearSpeed, angularSpeed, driveMode]);

  useEffect(() => {
    targetRotRef.current = {
      pitch: THREE.MathUtils.degToRad(pitchDeg),
      roll: THREE.MathUtils.degToRad(rollDeg),
      yaw: THREE.MathUtils.degToRad(yawDeg),
    };
  }, [pitchDeg, rollDeg, yawDeg]);

  // Update LiDAR point cloud
  useEffect(() => {
    if (!laserPointsRef.current || !scanRanges || scanRanges.length === 0) return;
    const geometry = laserPointsRef.current.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;

    const n = Math.min(360, scanRanges.length);
    for (let i = 0; i < 360; i++) {
      const idx = i * 3;
      if (i < n && scanRanges[i] != null && Number.isFinite(scanRanges[i])) {
        const r = Math.max(0.5, Math.min(12.0, scanRanges[i]!));
        const ang = -Math.PI + (i * 2 * Math.PI) / n;
        // Project onto XZ plane in rover frame (+Z forward, +X left)
        positions[idx] = r * Math.sin(ang);
        positions[idx + 1] = 0.12;
        positions[idx + 2] = r * Math.cos(ang);

        if (r < 1.2) {
          colors[idx] = 0.93; colors[idx + 1] = 0.29; colors[idx + 2] = 0.35;
        } else if (r < 2.5) {
          colors[idx] = 0.96; colors[idx + 1] = 0.65; colors[idx + 2] = 0.14;
        } else {
          colors[idx] = 0.06; colors[idx + 1] = 0.71; colors[idx + 2] = 0.65;
        }
      } else {
        positions[idx] = 0;
        positions[idx + 1] = -100;
        positions[idx + 2] = 0;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }, [scanRanges]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight || 420);

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0b1a);
    scene.fog = new THREE.FogExp2(0x161026, 0.035);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const sunLight = new THREE.DirectionalLight(0xffa266, 2.4);
    sunLight.position.set(12, 18, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x4a3a60, 1.2);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x6a5cff, 1.0);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    // 3. Martian Ground Terrain
    const terrainGeo = new THREE.PlaneGeometry(28, 28, 32, 32);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const dist = Math.sqrt(vx * vx + vy * vy);
      const bump = Math.sin(vx * 0.8) * Math.cos(vy * 0.8) * 0.12 - (dist > 8 ? (dist - 8) * 0.1 : 0);
      pos.setZ(i, bump);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x8a3a22,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    const gridHelper = new THREE.PolarGridHelper(12, 6, 8, 32, 0xff5a36, 0x4a3040);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a261a, roughness: 0.95 });
    const rockGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 18; i++) {
      const rockRadius = 0.12 + Math.random() * 0.35;
      const rockGeo = new THREE.DodecahedronGeometry(rockRadius, 1);
      rockGeos.push(rockGeo);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 2.5 + Math.random() * 8.0;
      rock.position.set(Math.cos(angle) * dist, rockRadius * 0.6, Math.sin(angle) * dist);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
    }

    // 4. Mars Rover Digital Twin Hierarchy
    const roverMaster = new THREE.Group();
    roverMasterRef.current = roverMaster;
    scene.add(roverMaster);

    const chassis = new THREE.Group();
    chassisRef.current = chassis;
    chassis.position.y = 0.85;
    roverMaster.add(chassis);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xdfd8c8,
      metalness: 0.4,
      roughness: 0.35,
    });
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.55, 2.4);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    chassis.add(body);

    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x162438,
      roughness: 0.2,
      metalness: 0.7,
    });
    const deckGeo = new THREE.BoxGeometry(1.5, 0.06, 2.2);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 0.31;
    deck.castShadow = true;
    chassis.add(deck);

    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      metalness: 0.85,
      roughness: 0.25,
    });
    const foilGeo = new THREE.BoxGeometry(1.62, 0.18, 0.8);
    const foil = new THREE.Mesh(foilGeo, foilMat);
    foil.position.set(0, -0.05, -0.7);
    foil.castShadow = true;
    chassis.add(foil);

    const mastMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.8, roughness: 0.2 });
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.2, 12);
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0.45, 0.9, 0.8);
    mast.castShadow = true;
    chassis.add(mast);

    const headGeo = new THREE.BoxGeometry(0.35, 0.2, 0.22);
    const head = new THREE.Mesh(headGeo, mastMat);
    head.position.set(0.45, 1.5, 0.8);
    head.castShadow = true;
    chassis.add(head);

    const lensMat = new THREE.MeshStandardMaterial({ color: 0x10b5a5, metalness: 0.9, roughness: 0.1 });
    const lensGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
    for (const lx of [0.38, 0.52]) {
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(lx, 1.5, 0.92);
      chassis.add(lens);
    }

    const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4 });
    const dishGeo = new THREE.CylinderGeometry(0.32, 0.05, 0.1, 16);
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.z = 0.4;
    dish.position.set(-0.45, 0.55, -0.6);
    dish.castShadow = true;
    chassis.add(dish);

    const lidarMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
    const lidarGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 16);
    const lidarPuck = new THREE.Mesh(lidarGeo, lidarMat);
    lidarPuck.position.set(0, 0.45, 0.5);
    chassis.add(lidarPuck);
    lidarPuckRef.current = lidarPuck;

    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b5a5 });
    const ringGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.04, 16);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    lidarPuck.add(ring);

    const wheels: THREE.Mesh[] = [];
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x22242a,
      roughness: 0.7,
      metalness: 0.4,
    });
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.26, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      [-1.05, -0.48, 0.9],
      [1.05, -0.48, 0.9],
      [-1.15, -0.48, 0.0],
      [1.15, -0.48, 0.0],
      [-1.05, -0.48, -0.9],
      [1.05, -0.48, -0.9],
    ];

    const bogieMat = new THREE.MeshStandardMaterial({ color: 0x444852, metalness: 0.7, roughness: 0.3 });
    const strutGeos: THREE.BufferGeometry[] = [];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      chassis.add(wheel);
      wheels.push(wheel);

      const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, Math.abs(x) * 0.4 + 0.3, 8);
      strutGeos.push(strutGeo);
      const strut = new THREE.Mesh(strutGeo, bogieMat);
      strut.position.set(x * 0.65, y * 0.5, z);
      strut.rotation.z = x > 0 ? -0.4 : 0.4;
      chassis.add(strut);
    });
    wheelsRef.current = wheels;

    // 5. Laser Ray / Beam attached to chassis LiDAR puck so it pitches/rolls with the rover
    const laserMat = new THREE.LineBasicMaterial({ color: 0x10b5a5, transparent: true, opacity: 0.65 });
    const laserPoints = [new THREE.Vector3(0, 0.45, 0.5), new THREE.Vector3(0, -0.7, 4.5)];
    const laserGeo = new THREE.BufferGeometry().setFromPoints(laserPoints);
    const laserBeam = new THREE.Line(laserGeo, laserMat);
    chassis.add(laserBeam);
    laserBeamRef.current = laserBeam;

    // 6. 3D LiDAR Laser Point Cloud (360 points)
    const pcCount = 360;
    const pcPositions = new Float32Array(pcCount * 3);
    const pcColors = new Float32Array(pcCount * 3);

    for (let i = 0; i < pcCount; i++) {
      const idx = i * 3;
      const angle = (i * Math.PI * 2) / pcCount;
      const r = 4.0;
      pcPositions[idx] = Math.sin(angle) * r;
      pcPositions[idx + 1] = 0.12;
      pcPositions[idx + 2] = Math.cos(angle) * r;

      pcColors[idx] = 0.06;
      pcColors[idx + 1] = 0.71;
      pcColors[idx + 2] = 0.65;
    }

    const pcGeo = new THREE.BufferGeometry();
    pcGeo.setAttribute('position', new THREE.BufferAttribute(pcPositions, 3));
    pcGeo.setAttribute('color', new THREE.BufferAttribute(pcColors, 3));

    const pcMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const laserPointCloud = new THREE.Points(pcGeo, pcMat);
    roverMaster.add(laserPointCloud);
    laserPointsRef.current = laserPointCloud;

    // 7. Mouse Orbit & Zoom Controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      cameraAngleRef.current.rotX += dx * 0.008;
      cameraAngleRef.current.rotY = Math.max(0.12, Math.min(1.4, cameraAngleRef.current.rotY + dy * 0.008));
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.dist = Math.max(4.5, Math.min(22, cameraAngleRef.current.dist + e.deltaY * 0.01));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMouseRef.current.x;
      const dy = e.touches[0].clientY - prevMouseRef.current.y;
      cameraAngleRef.current.rotX += dx * 0.008;
      cameraAngleRef.current.rotY = Math.max(0.12, Math.min(1.4, cameraAngleRef.current.rotY + dy * 0.008));
      prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd);

    // 8. Animation & Render Loop
    let animId = 0;
    let clockTime = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clockTime += 0.016;

      const { rotX, rotY, dist } = cameraAngleRef.current;
      camera.position.x = Math.sin(rotX) * Math.cos(rotY) * dist;
      camera.position.y = Math.sin(rotY) * dist + 0.5;
      camera.position.z = Math.cos(rotX) * Math.cos(rotY) * dist;
      camera.lookAt(0, 0.8, 0);

      if (roverMasterRef.current) {
        roverMasterRef.current.rotation.y = lerpAngleShortest(
          roverMasterRef.current.rotation.y,
          targetRotRef.current.yaw,
          0.12,
        );
      }

      if (chassisRef.current) {
        chassisRef.current.rotation.x = THREE.MathUtils.lerp(
          chassisRef.current.rotation.x,
          targetRotRef.current.pitch,
          0.1,
        );
        chassisRef.current.rotation.z = THREE.MathUtils.lerp(
          chassisRef.current.rotation.z,
          targetRotRef.current.roll,
          0.1,
        );
      }

      const { linearSpeed: lSpd, driveMode: dMode } = motionRef.current;
      const isStopped = dMode === 'stop';
      if (!isStopped && Math.abs(lSpd) > 0.01 && wheelsRef.current.length > 0) {
        const rollDelta = lSpd * 0.18;
        wheelsRef.current.forEach((w) => {
          w.rotation.x += rollDelta;
        });
      }

      if (lidarPuckRef.current) {
        lidarPuckRef.current.rotation.y += 0.12;
      }

      if (laserBeamRef.current) {
        const beamPos = laserBeamRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const sweepAngle = clockTime * 6;
        const r = 5.2;
        beamPos.setXYZ(1, Math.sin(sweepAngle) * r, -0.73, 0.5 + Math.cos(sweepAngle) * r);
        beamPos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Listener + ResizeObserver
    const onResize = () => {
      if (!container) return;
      const newW = Math.max(1, container.clientWidth);
      const newH = Math.max(1, container.clientHeight || 420);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);

      [terrainGeo, bodyGeo, deckGeo, foilGeo, mastGeo, headGeo, lensGeo, dishGeo, lidarGeo, ringGeo, wheelGeo, laserGeo, pcGeo, ...rockGeos, ...strutGeos].forEach((g) => g.dispose());
      [terrainMat, rockMat, bodyMat, deckMat, foilMat, mastMat, lensMat, dishMat, lidarMat, ringMat, wheelMat, bogieMat, laserMat, pcMat].forEach((m) => m.dispose());

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: 440, borderRadius: 16, overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 8,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <span className="badge brand" style={{ background: 'rgba(24, 18, 42, 0.75)', backdropFilter: 'blur(8px)' }}>
          ● 3D Digital Twin
        </span>
        <span className="badge" style={{ background: 'rgba(24, 18, 42, 0.75)', backdropFilter: 'blur(8px)' }}>
          Three.js WebGL &middot; 60 FPS
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 11, 26, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          padding: '5px 14px',
          fontSize: 12,
          color: 'var(--muted)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 5,
        }}
      >
        Click &amp; drag to rotate 3D view &middot; Scroll to zoom &middot; Wheels &amp; chassis tilt respond live to ROS IMU
      </div>
    </div>
  );
};

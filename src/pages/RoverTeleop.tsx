import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Bot,
  Camera,
  Compass,
  Cpu,
  ExternalLink,
  Gauge,
  HelpCircle,
  MapPin,
  Play,
  RefreshCw,
  Sliders,
  Square,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { Ctx } from './shared';
import { Kpi, Row } from './shared';

interface TelemetryData {
  drive_mode?: 'auto' | 'manual' | 'stop' | string;
  obstacle?: {
    state?: string;
    closest_dist?: number;
    front_dist?: number;
    left_dist?: number;
    right_dist?: number;
    rear_dist?: number;
    tilt_deg?: number;
    camera_rock_fraction?: number;
  };
  scan?: {
    ranges?: (number | null)[];
    min_dist?: number;
    max_dist?: number;
    closest_dist?: number;
    closest_angle_deg?: number;
  };
  imu?: {
    roll_deg?: number;
    pitch_deg?: number;
    yaw_deg?: number;
    gyro_x?: number;
    gyro_y?: number;
    gyro_z?: number;
    accel_x?: number;
    accel_y?: number;
    accel_z?: number;
  };
  fused_odom?: {
    x?: number;
    y?: number;
    yaw_deg?: number;
    linear_speed?: number;
    angular_speed?: number;
  };
  odom?: {
    x?: number;
    y?: number;
    yaw_deg?: number;
    linear_speed?: number;
    angular_speed?: number;
  };
  cmd_vel?: {
    linear_x?: number;
    angular_z?: number;
  };
  map?: {
    width?: number;
    height?: number;
    resolution?: number;
    explored_area_m2?: number;
  };
  rates?: Record<string, { hz?: number; age_s?: number }>;
}

export const RoverTeleop: React.FC<Ctx> = (c) => {
  const [serverUrl, setServerUrl] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('server');
      return (q || localStorage.getItem('roverServer') || 'http://localhost:8080').replace(/\/$/, '');
    } catch {
      return 'http://localhost:8080';
    }
  });

  const [connected, setConnected] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual' | 'stop'>('stop');
  const [speed, setSpeed] = useState(0.3);
  const [turn, setTurn] = useState(0.8);
  const [statusMsg, setStatusMsg] = useState('');
  const [data, setData] = useState<TelemetryData>({});
  const [camTimestamp, setCamTimestamp] = useState(Date.now());
  const [mapTimestamp, setMapTimestamp] = useState(Date.now());
  const [showCommands, setShowCommands] = useState(false);

  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const driveTimerRef = useRef<number | null>(null);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const serverInputRef = useRef<HTMLInputElement | null>(null);

  // Notify toast
  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const saveServer = () => {
    if (!serverInputRef.current) return;
    const clean = serverInputRef.current.value.trim().replace(/\/$/, '');
    setServerUrl(clean);
    try {
      localStorage.setItem('roverServer', clean);
    } catch {}
    flash(`Target server set to ${clean}`);
  };

  // Switch Mode API
  const handleSetMode = useCallback((newMode: 'auto' | 'manual' | 'stop') => {
    if (simulated) {
      setMode(newMode);
      flash(`[SIM] Rover switched to ${newMode.toUpperCase()}`);
      return;
    }
    fetch(`${serverUrl}/api/mode?set=${newMode}`, { mode: 'cors' })
      .then((res) => {
        if (res.status === 403) {
          flash('Server control disabled (read-only mode active on rover)');
          return;
        }
        setMode(newMode);
        flash(`Drive mode changed to ${newMode.toUpperCase()}`);
      })
      .catch(() => {
        flash('ROS server unreachable — check data_server status');
      });
  }, [serverUrl, simulated]);

  // Send Drive Twist
  const sendDriveCmd = useCallback((f: number, a: number) => {
    if (simulated) return;
    const lin = (f * speed).toFixed(3);
    const ang = (a * turn).toFixed(3);
    fetch(`${serverUrl}/api/drive?lin=${lin}&ang=${ang}`, { mode: 'cors' }).catch(() => {});
  }, [serverUrl, speed, turn, simulated]);

  const setContinuousDrive = useCallback((f: number, a: number) => {
    if (driveTimerRef.current !== null) {
      window.clearInterval(driveTimerRef.current);
      driveTimerRef.current = null;
    }
    if (f === 0 && a === 0) {
      sendDriveCmd(0, 0);
      return;
    }
    if (mode !== 'manual') {
      handleSetMode('manual');
    }
    sendDriveCmd(f, a);
    driveTimerRef.current = window.setInterval(() => sendDriveCmd(f, a), 140);
  }, [mode, handleSetMode, sendDriveCmd]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;
      const k = e.key.toLowerCase();
      if (k === ' ') {
        e.preventDefault();
        activeKeysRef.current.clear();
        setContinuousDrive(0, 0);
        handleSetMode('stop');
        return;
      }
      if (k === '1') {
        activeKeysRef.current.clear();
        setContinuousDrive(0, 0);
        handleSetMode('auto');
        return;
      }
      if (k === '2') {
        handleSetMode('manual');
        return;
      }
      const valid = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      if (valid.includes(k)) {
        e.preventDefault();
        if (!activeKeysRef.current.has(k)) {
          activeKeysRef.current.add(k);
          const f = (activeKeysRef.current.has('w') || activeKeysRef.current.has('arrowup') ? 1 : 0) -
                    (activeKeysRef.current.has('s') || activeKeysRef.current.has('arrowdown') ? 1 : 0);
          const a = (activeKeysRef.current.has('a') || activeKeysRef.current.has('arrowleft') ? 1 : 0) -
                    (activeKeysRef.current.has('d') || activeKeysRef.current.has('arrowright') ? 1 : 0);
          setContinuousDrive(f, a);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const valid = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      if (valid.includes(k)) {
        activeKeysRef.current.delete(k);
        const f = (activeKeysRef.current.has('w') || activeKeysRef.current.has('arrowup') ? 1 : 0) -
                  (activeKeysRef.current.has('s') || activeKeysRef.current.has('arrowdown') ? 1 : 0);
        const a = (activeKeysRef.current.has('a') || activeKeysRef.current.has('arrowleft') ? 1 : 0) -
                  (activeKeysRef.current.has('d') || activeKeysRef.current.has('arrowright') ? 1 : 0);
        setContinuousDrive(f, a);
      }
    };

    const handleBlur = () => {
      activeKeysRef.current.clear();
      setContinuousDrive(0, 0);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleSetMode, setContinuousDrive]);

  // Polling Real ROS Data
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (simulated) return;
      try {
        const res = await fetch(`${serverUrl}/api/all?full=1`, { mode: 'cors' });
        if (!res.ok) throw new Error('Bad response');
        const json: TelemetryData = await res.json();
        if (!active) return;
        setData(json);
        setConnected(true);
        if (json.drive_mode && ['auto', 'manual', 'stop'].includes(json.drive_mode)) {
          setMode(json.drive_mode as 'auto' | 'manual' | 'stop');
        }
      } catch {
        if (!active) return;
        setConnected(false);
      }
    };

    const dataTimer = setInterval(poll, 450);
    const imgTimer = setInterval(() => {
      if (!simulated && connected) {
        const now = Date.now();
        setCamTimestamp(now);
        setMapTimestamp(now);
      }
    }, 1200);

    poll();
    return () => {
      active = false;
      clearInterval(dataTimer);
      clearInterval(imgTimer);
    };
  }, [serverUrl, simulated, connected]);

  // Simulation fallback ticker
  useEffect(() => {
    if (!simulated) return;
    let t = 0;
    const simTimer = setInterval(() => {
      t += 0.5;
      const fakeRanges: number[] = [];
      for (let i = 0; i < 360; i++) {
        const angle = (i * Math.PI) / 180;
        const dist = 5.5 + 3.2 * Math.sin(angle * 3 + t * 0.8) + (Math.random() - 0.5) * 0.4;
        fakeRanges.push(Math.max(0.6, Math.min(12.0, dist)));
      }
      const minRange = Math.min(...fakeRanges);
      setData({
        drive_mode: mode,
        obstacle: {
          state: minRange < 1.2 ? 'AVOID' : minRange < 2.5 ? 'CAUTION' : 'CRUISE',
          closest_dist: minRange,
          front_dist: fakeRanges[0],
          left_dist: fakeRanges[90],
          right_dist: fakeRanges[270],
          rear_dist: fakeRanges[180],
          tilt_deg: 2.4 + Math.sin(t * 0.5) * 1.5,
          camera_rock_fraction: 0.12,
        },
        scan: {
          ranges: fakeRanges,
          min_dist: 0.6,
          max_dist: 12.0,
          closest_dist: minRange,
          closest_angle_deg: 18,
        },
        imu: {
          roll_deg: Math.sin(t * 0.4) * 2.1,
          pitch_deg: Math.cos(t * 0.3) * 3.4,
          yaw_deg: (t * 8) % 360,
          gyro_x: 0.01,
          gyro_y: 0.02,
          gyro_z: 0.05,
          accel_x: 0.12,
          accel_y: -0.08,
          accel_z: 3.71,
        },
        fused_odom: {
          x: 14.2 + Math.cos(t * 0.1) * 6,
          y: -8.7 + Math.sin(t * 0.1) * 6,
          yaw_deg: (t * 8) % 360,
          linear_speed: mode === 'stop' ? 0.0 : speed,
          angular_speed: mode === 'stop' ? 0.0 : 0.05,
        },
        odom: {
          x: 14.1 + Math.cos(t * 0.1) * 6,
          y: -8.8 + Math.sin(t * 0.1) * 6,
          yaw_deg: (t * 8) % 360,
          linear_speed: mode === 'stop' ? 0.0 : speed,
          angular_speed: mode === 'stop' ? 0.0 : 0.05,
        },
        cmd_vel: {
          linear_x: mode === 'stop' ? 0.0 : speed,
          angular_z: 0.0,
        },
        map: {
          width: 240,
          height: 240,
          resolution: 0.05,
          explored_area_m2: Math.round(145 + t * 1.5),
        },
        rates: {
          '/scan': { hz: 10.0, age_s: 0.08 },
          '/imu/data': { hz: 100.0, age_s: 0.01 },
          '/odom': { hz: 50.0, age_s: 0.02 },
          '/odometry/filtered': { hz: 50.0, age_s: 0.02 },
          '/camera/image_raw': { hz: 15.0, age_s: 0.06 },
          '/map': { hz: 1.0, age_s: 0.9 },
        },
      });
      setConnected(true);
    }, 500);

    return () => clearInterval(simTimer);
  }, [simulated, mode, speed]);

  // Canvas LiDAR Radar Renderer
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const S = canvas.width;
    const cx = S / 2;
    const cy = S / 2;
    const R = S / 2 - 14;
    const MAXR = 12;

    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#0f0c19';
    ctx.fillRect(0, 0, S, S);

    // Grid rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 1;

    for (const r of [2, 4, 6, 8, 10, 12]) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r / MAXR) * R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`${r}m`, cx + 4, cy - (r / MAXR) * R + 11);
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.stroke();

    // Scan points
    const ranges = data.scan?.ranges;
    if (ranges && ranges.length > 0) {
      const n = ranges.length;
      for (let i = 0; i < n; i++) {
        const r = ranges[i];
        if (r == null || !Number.isFinite(r) || r <= 0.05) continue;
        const ang = -Math.PI + (i * 2 * Math.PI) / n;
        const px = cx - (r * Math.sin(ang) / MAXR) * R;
        const py = cy - (r * Math.cos(ang) / MAXR) * R;

        if (r < 1.0) {
          ctx.fillStyle = '#ee4b5b'; // red danger
        } else if (r < 2.2) {
          ctx.fillStyle = '#f5a524'; // amber warning
        } else {
          ctx.fillStyle = '#10b5a5'; // teal safe
        }
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
    }

    // Rover body triangle
    ctx.fillStyle = '#ff5a36';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx - 7, cy + 9);
    ctx.lineTo(cx + 7, cy + 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [data.scan]);

  const avoiderState = data.obstacle?.state || (connected ? 'ACTIVE' : 'OFFLINE');
  const avoiderColor =
    avoiderState === 'CRUISE' ? 'ok' :
    avoiderState === 'CAUTION' ? 'warn' :
    avoiderState === 'AVOID' || avoiderState === 'TILT_STOP' ? 'bad' : 'brand';

  return (
    <>
      {/* Hero Banner matching Overview.tsx */}
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="eyebrow">
            ROS 2 Teleoperation &middot; {connected ? (simulated ? 'Simulation Active' : 'ROS 2 Humble Connected') : 'Awaiting Bridge'}
          </span>
          <h2>ARES Mars Rover &middot; Live Telemetry</h2>
          <p>
            Autonomous navigation stack and manual teleoperation control via ROS 2 Gazebo Fortress bridge.
            Fused LiDAR SLAM, EKF odometry, and real-time obstacle avoidance telemetry.
          </p>
          <div className="acts">
            <button
              className={`btn ${mode === 'auto' ? 'pri' : ''}`}
              onClick={() => handleSetMode('auto')}
            >
              <Play size={15} /> AUTO (1)
            </button>
            <button
              className={`btn ${mode === 'manual' ? 'pri' : ''}`}
              onClick={() => handleSetMode('manual')}
            >
              <Sliders size={15} /> MANUAL (2)
            </button>
            <button
              className="btn"
              style={{ background: '#ee4b5b', borderColor: '#ee4b5b', color: '#fff' }}
              onClick={() => handleSetMode('stop')}
            >
              <Square size={15} /> EMERGENCY STOP (Space)
            </button>
            <button
              className="btn"
              onClick={() => {
                setSimulated(!simulated);
                flash(simulated ? 'Switched to Live ROS 2 mode' : 'Switched to Simulated Telemetry mode');
              }}
            >
              <RefreshCw size={15} /> {simulated ? 'Use Real ROS Server' : 'Run Simulated Telemetry'}
            </button>
          </div>
        </div>

        <div className="rings">
          <div className="ring" style={{ ['--c' as string]: 'var(--brand)', ['--v' as string]: mode === 'auto' ? 90 : mode === 'manual' ? 50 : 0 }}>
            <div className="dial"><b>{mode.toUpperCase()}</b></div>
            <span>Drive mode</span>
          </div>
          <div className="ring" style={{ ['--c' as string]: 'var(--teal)', ['--v' as string]: connected ? 100 : 0 }}>
            <div className="dial"><b>{connected ? 'LIVE' : 'OFF'}</b></div>
            <span>ROS 2 Link</span>
          </div>
          <div className="ring" style={{ ['--c' as string]: 'var(--amber)', ['--v' as string]: Math.min(100, Math.round((data.map?.explored_area_m2 ?? 60) / 2)) }}>
            <div className="dial"><b>{data.map?.explored_area_m2 ?? 0}m²</b></div>
            <span>SLAM Area</span>
          </div>
        </div>
      </section>

      {/* Top Connection Bar */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5 }}>
              {connected ? <Wifi size={17} color="var(--ok)" /> : <WifiOff size={17} color="var(--bad)" />}
              ROS 2 Bridge:
            </span>
            <input
              ref={serverInputRef}
              defaultValue={serverUrl}
              placeholder="http://localhost:8080"
              style={{
                background: 'var(--hover)',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '6px 14px',
                fontSize: 13,
                fontFamily: 'inherit',
                minWidth: 220,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveServer();
              }}
            />
            <button className="btn" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={saveServer}>
              Connect
            </button>
            <span className={`badge ${connected ? (simulated ? 'warn' : 'ok') : 'bad'}`}>
              ● {connected ? (simulated ? 'Simulated Telemetry' : 'Connected (port 8080)') : 'Server Offline'}
            </span>
            <span className={`badge ${avoiderColor}`}>
              Avoider: {avoiderState}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusMsg && <span style={{ fontSize: 12.5, color: 'var(--brand)', fontWeight: 600 }}>{statusMsg}</span>}
            <button
              className="btn"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setShowCommands(!showCommands)}
            >
              <HelpCircle size={15} /> ROS Guide
            </button>
            <a
              href="/personal_dashboard.html"
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              <ExternalLink size={14} /> Standalone View
            </a>
          </div>
        </div>

        {showCommands && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 13 }}>
            <h4 style={{ margin: '0 0 6px', font: '700 14px var(--head)' }}>ROS 2 Launch Commands</h4>
            <div style={{ background: 'var(--hover)', padding: 12, borderRadius: 12, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
              <div><b># Full Simulation + SLAM + EKF + Web Server:</b></div>
              <div style={{ color: 'var(--brand)' }}>ros2 launch mars_rover mars_rover.launch.py</div>
              <div style={{ marginTop: 6 }}><b># Allow remote web dashboards on network:</b></div>
              <div style={{ color: 'var(--violet)' }}>ros2 launch mars_rover mars_rover.launch.py host:=0.0.0.0</div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Telemetry KPIs */}
      <div className="kpis">
        <Kpi
          icon={<Gauge size={18} />}
          label="Forward speed"
          value={(data.fused_odom?.linear_speed ?? 0).toFixed(2)}
          unit="m/s"
        />
        <Kpi
          icon={<Compass size={18} />}
          label="Heading (Yaw)"
          value={Math.round(data.fused_odom?.yaw_deg ?? data.imu?.yaw_deg ?? 0)}
          unit="°"
        />
        <Kpi
          icon={<AlertOctagon size={18} />}
          label="Closest Obstacle"
          value={(data.obstacle?.closest_dist ?? data.scan?.closest_dist ?? 0).toFixed(2)}
          unit="m"
        />
        <Kpi
          icon={<Activity size={18} />}
          label="Chassis Pitch"
          value={(data.imu?.pitch_deg ?? 0).toFixed(1)}
          unit="°"
        />
        <Kpi
          icon={<MapPin size={18} />}
          label="Position (Fused X/Y)"
          value={`${(data.fused_odom?.x ?? 0).toFixed(1)}, ${(data.fused_odom?.y ?? 0).toFixed(1)}`}
          unit="m"
        />
        <Kpi
          icon={<Cpu size={18} />}
          label="Laser Scan Rate"
          value={(data.rates?.['/scan']?.hz ?? 10).toFixed(0)}
          unit="Hz"
        />
      </div>

      {/* Main Grid: Live Radar, Controls, Camera, Map */}
      <div className="g2">
        {/* Left column: Radar & Video Feeds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 360 LiDAR Radar */}
          <div className="card">
            <h3>
              360° LiDAR Top-Down Radar
              <small>Forward is UP &middot; Range 12m</small>
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              <canvas
                ref={radarCanvasRef}
                width={360}
                height={360}
                style={{ borderRadius: 16, maxWidth: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ee4b5b' }} /> &lt; 1.0m (Danger)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f5a524' }} /> &lt; 2.2m (Caution)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b5a5' }} /> &ge; 2.2m (Clear)
              </span>
            </div>
          </div>

          {/* Live Camera & SLAM Map Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {/* Rover Navigation Camera */}
            <div className="card">
              <h3>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Camera size={16} /> NavCam Feed
                </span>
                <span className="badge">/camera/image_raw</span>
              </h3>
              <div style={{ minHeight: 180, background: '#0a0812', borderRadius: 12, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                {connected && !simulated ? (
                  <img
                    src={`${serverUrl}/camera.png?${camTimestamp}`}
                    alt="Rover NavCam"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = c.selected?.groundPhotoUrl || 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=640&q=80';
                    }}
                  />
                ) : (
                  <img
                    src={c.selected?.groundPhotoUrl || 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=640&q=80'}
                    alt="Mars Surface Reference"
                    style={{ width: '100%', height: 200, objectFit: 'cover', opacity: 0.85 }}
                  />
                )}
              </div>
              <div className="xs muted" style={{ marginTop: 8 }}>
                {connected && !simulated ? 'Live 15 Hz streaming from simulated Gazebo NavCam' : 'Mars NavCam test imagery (Connect ROS 2 for real-time feed)'}
              </div>
            </div>

            {/* SLAM Map */}
            <div className="card">
              <h3>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <MapPin size={16} /> SLAM Occupancy Grid
                </span>
                <span className="badge brand">/map</span>
              </h3>
              <div style={{ minHeight: 180, background: '#0a0812', borderRadius: 12, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                {connected && !simulated ? (
                  <img
                    src={`${serverUrl}/map.png?${mapTimestamp}`}
                    alt="SLAM Map"
                    style={{ width: '100%', height: 200, objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, fontSize: 13 }}>
                    <Bot size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    SLAM 2D map active &middot; {data.map?.explored_area_m2 ?? 145} m² mapped
                  </div>
                )}
              </div>
              <div className="xs muted" style={{ marginTop: 8 }}>
                Explored area: <b>{data.map?.explored_area_m2 ?? 0} m²</b> &middot; Resolution: 0.05 m/cell
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Controls & Telemetry Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Drive Control Panel */}
          <div className="card">
            <h3>Teleoperation Controls</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`btn ${mode === 'auto' ? 'pri' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => handleSetMode('auto')}
              >
                AUTO (1)
              </button>
              <button
                className={`btn ${mode === 'manual' ? 'pri' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => handleSetMode('manual')}
              >
                MANUAL (2)
              </button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: '#ee4b5b', color: '#fff', borderColor: '#ee4b5b' }}
                onClick={() => handleSetMode('stop')}
              >
                STOP
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="row" style={{ border: 0, padding: '0 0 4px' }}>
                <span>Speed limit</span>
                <b>{speed.toFixed(2)} m/s</b>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.6"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <div className="row" style={{ border: 0, padding: '0 0 4px' }}>
                <span>Turn rate</span>
                <b>{turn.toFixed(2)} rad/s</b>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.5"
                step="0.1"
                value={turn}
                onChange={(e) => setTurn(Number(e.target.value))}
              />
            </div>

            {/* D-Pad */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 62px)',
                gridAutoRows: '52px',
                gap: 8,
                justifyContent: 'center',
                margin: '14px 0',
              }}
            >
              {[
                { f: 1, a: 1, Icon: ArrowUpLeft, tip: 'NW Arc' },
                { f: 1, a: 0, Icon: ArrowUp, tip: 'Forward (W)' },
                { f: 1, a: -1, Icon: ArrowUpRight, tip: 'NE Arc' },
                { f: 0, a: 1, Icon: ArrowLeft, tip: 'Turn Left (A)' },
                { f: 0, a: 0, Icon: Square, tip: 'Stop (Space)', isStop: true },
                { f: 0, a: -1, Icon: ArrowRight, tip: 'Turn Right (D)' },
                { f: -1, a: 1, Icon: ArrowDownLeft, tip: 'Reverse Left' },
                { f: -1, a: 0, Icon: ArrowDown, tip: 'Reverse (S)' },
                { f: -1, a: -1, Icon: ArrowDownRight, tip: 'Reverse Right' },
              ].map(({ f, a, Icon, isStop }, idx) => (
                <button
                  key={idx}
                  className="btn"
                  style={{
                    padding: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: isStop ? '#ee4b5b' : 'var(--hover)',
                    color: isStop ? '#fff' : 'var(--ink)',
                    border: '1px solid var(--line)',
                    borderRadius: 14,
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (isStop) handleSetMode('stop');
                    else setContinuousDrive(f, a);
                  }}
                  onPointerUp={() => {
                    if (!isStop) setContinuousDrive(0, 0);
                  }}
                  onPointerLeave={() => {
                    if (!isStop) setContinuousDrive(0, 0);
                  }}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>

            <div className="xs muted" style={{ textAlign: 'center', lineHeight: 1.5 }}>
              Use keyboard keys: <b>W / A / S / D</b> or arrows to steer. <b>Space</b> stops instantly.
              Pressing a movement key automatically switches the rover into <b>MANUAL</b> mode.
            </div>
          </div>

          {/* Sensor Diagnostics */}
          <div className="card">
            <h3>Obstacle &amp; Perimeter Distances</h3>
            <Row k="Autonomous Brain State" v={<span className={`badge ${avoiderColor}`}>{avoiderState}</span>} />
            <Row k="Front distance" v={`${(data.obstacle?.front_dist ?? 0).toFixed(2)} m`} />
            <Row k="Left distance" v={`${(data.obstacle?.left_dist ?? 0).toFixed(2)} m`} />
            <Row k="Right distance" v={`${(data.obstacle?.right_dist ?? 0).toFixed(2)} m`} />
            <Row k="Rear distance" v={`${(data.obstacle?.rear_dist ?? 0).toFixed(2)} m`} />
            <Row k="Terrain tilt" v={`${(data.obstacle?.tilt_deg ?? 0).toFixed(1)}°`} />
            <Row k="Camera rock fraction" v={`${Math.round((data.obstacle?.camera_rock_fraction ?? 0) * 100)}%`} />
          </div>

          {/* IMU & Fusion Diagnostics */}
          <div className="card">
            <h3>EKF &amp; IMU Navigation State</h3>
            <Row k="Roll / Pitch / Yaw" v={`${(data.imu?.roll_deg ?? 0).toFixed(1)}° / ${(data.imu?.pitch_deg ?? 0).toFixed(1)}° / ${(data.imu?.yaw_deg ?? 0).toFixed(1)}°`} />
            <Row k="Angular velocity (Gyro Z)" v={`${(data.imu?.gyro_z ?? 0).toFixed(3)} rad/s`} />
            <Row k="Linear accel (Mars Z)" v={`${(data.imu?.accel_z ?? 3.71).toFixed(2)} m/s²`} />
            <Row k="Fused coordinates (X, Y)" v={`(${ (data.fused_odom?.x ?? 0).toFixed(2) }, ${ (data.fused_odom?.y ?? 0).toFixed(2) }) m`} />
            <Row k="Raw wheel odom (X, Y)" v={`(${ (data.odom?.x ?? 0).toFixed(2) }, ${ (data.odom?.y ?? 0).toFixed(2) }) m`} />
            <Row k="Velocity cmd (/cmd_vel)" v={`v=${(data.cmd_vel?.linear_x ?? 0).toFixed(2)} m/s, ω=${(data.cmd_vel?.angular_z ?? 0).toFixed(2)} rad/s`} />
          </div>
        </div>
      </div>
    </>
  );
};

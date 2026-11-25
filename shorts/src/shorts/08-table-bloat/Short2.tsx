// Week 7 Short "The replica that brings the bloat back" (v2, 2026-11-25): a slow report moved to a replica, and the main
// database still got about 300,000 dead rows in 10 minutes, the same as with the report on it, because the replica's
// hot_standby_feedback tells the main database which dead rows the report still needs. Feedback off: under 20,000, like
// no report; the cost is that the replica cancels long reports. Minutes: a replica with feedback off; hours: a warehouse.
// Every number comes from data2.json (08-table-bloat/video_data2.py). Drawn objects, not labelled boxes (shorts-video
// skill): database cylinders, the report as a document, a switch, a stopwatch, a warehouse. The opening is 3D (the
// orders table with dead rows landing on it, the report sliding to the replica); everything after is 2D.
// No camera motion anywhere: objects move. Everything read sits inside SAFE.
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Follow } from "../../components/Follow";
import { Title } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SAFE, SANS } from "../../theme";
import { Canvas } from "../03-uuid-keys/Short1";
import data from "./data2.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
const steps = (value: number, p: number, step: number) => (p >= 1 ? value : Math.min(value, Math.floor((value * p) / step) * step));
const fmt = (n: number) => n.toLocaleString("en-GB");
const CARD = "#22262c";
const EDGE = "#3a3f47";
const RED_BG = "rgba(229,72,77,0.16)";
const HATCH = `repeating-linear-gradient(135deg, rgba(229,72,77,0.30) 0 14px, rgba(229,72,77,0.08) 14px 28px)`;
const L = SAFE.left;
const shadow = "0 4px 18px #000";
const round1k = (n: number) => Math.round(n / 1000) * 1000;
const round10k = (n: number) => Math.round(n / 10_000) * 10_000;

// ---- drawn objects -----------------------------------------------------------------------------------------------------

const Lock: React.FC<{ color: string; size?: number }> = ({ color, size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
    <rect x={7} y={16} width={22} height={16} rx={3} fill="none" stroke={color} strokeWidth={4} />
    <path d="M12 16 V11 a6 6 0 0 1 12 0 V16" fill="none" stroke={color} strokeWidth={4} />
  </svg>
);
const Check: React.FC<{ color: string; size?: number }> = ({ color, size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
    <path d="M7 19 L15 27 L29 10" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Cross: React.FC<{ color: string; size?: number }> = ({ color, size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
    <path d="M9 9 L27 27 M27 9 L9 27" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
  </svg>
);

// A database: a cylinder with two seams.
const Database: React.FC<{ width: number; color?: string; glow?: string }> = ({ width, color = LIGHT, glow }) => {
  const h = width * 1.05;
  const ry = width * 0.16;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{ flexShrink: 0, overflow: "visible", filter: glow ? `drop-shadow(0 0 16px ${glow})` : undefined }}>
      <path d={`M4 ${ry} V${h - ry} A${width / 2 - 4} ${ry} 0 0 0 ${width - 4} ${h - ry} V${ry}`} fill="#2a2f37" stroke={color} strokeWidth={5} />
      <ellipse cx={width / 2} cy={ry} rx={width / 2 - 4} ry={ry - 2} fill="#343a44" stroke={color} strokeWidth={5} />
      {[0.4, 0.68].map((t) => (
        <path key={t} d={`M4 ${h * t} A${width / 2 - 4} ${ry} 0 0 0 ${width - 4} ${h * t}`} fill="none" stroke={color} strokeWidth={4} opacity={0.7} />
      ))}
    </svg>
  );
};

// The report: a document with a chart on it.
const ReportDoc: React.FC<{ size: number; color?: string; broken?: number }> = ({ size, color = FG, broken = 0 }) => (
  <svg width={size} height={size * 1.22} viewBox="0 0 80 98" style={{ flexShrink: 0, overflow: "visible" }}>
    <g transform={`rotate(${-broken * 8} 40 49)`}>
      <path d="M6 4 H54 L74 24 V94 H6 Z" fill="#23272e" stroke={color} strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M54 4 V24 H74" fill="none" stroke={color} strokeWidth={4.5} strokeLinejoin="round" />
      <rect x={18} y={62} width={9} height={20} fill={color} opacity={0.8} />
      <rect x={33} y={50} width={9} height={32} fill={color} opacity={0.8} />
      <rect x={48} y={40} width={9} height={42} fill={color} opacity={0.8} />
    </g>
  </svg>
);

const Stopwatch: React.FC<{ size: number; p: number; color: string; label: string }> = ({ size, p, color, label }) => {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <rect x={44} y={2} width={12} height={8} rx={2} fill={LIGHT} />
      <circle cx={50} cy={55} r={r} fill="#1f2328" stroke={EDGE} strokeWidth={7} />
      <circle cx={50} cy={55} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 50 55)" strokeLinecap="round" />
      <text x={50} y={64} textAnchor="middle" fontFamily={MONO} fontWeight={800} fontSize={label.length > 3 ? 20 : 26} fill={FG}>
        {label}
      </text>
    </svg>
  );
};

const Warehouse: React.FC<{ size: number; color?: string }> = ({ size, color = LIGHT }) => (
  <svg width={size} height={size * 0.8} viewBox="0 0 120 96" style={{ flexShrink: 0 }}>
    <path d="M8 40 L60 8 L112 40 V92 H8 Z" fill="#23272e" stroke={color} strokeWidth={5} strokeLinejoin="round" />
    <rect x={36} y={52} width={48} height={40} fill="none" stroke={color} strokeWidth={4.5} />
    {[62, 72, 82].map((y) => (
      <line key={y} x1={36} y1={y} x2={84} y2={y} stroke={color} strokeWidth={3.5} />
    ))}
  </svg>
);

const Hourglass: React.FC<{ size: number; color?: string }> = ({ size, color = LIGHT }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
    <path d="M24 8 H76 M24 92 H76 M30 8 C30 36 70 46 70 50 C70 54 30 64 30 92 M70 8 C70 36 30 46 30 50 C30 54 70 64 70 92" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
    <path d="M38 84 C42 72 58 72 62 84 Z" fill={color} />
  </svg>
);

// ---- 1. Hook (3D): the orders table on the main database, dead rows landing; the report slides off to the replica ---

const CAM: [number, number, number] = [0, 5, 22.5];
const LOOK: [number, number, number] = [0, 2.1, 0];
const useProject = () => {
  const { width, height } = useVideoConfig();
  return useMemo(() => {
    const cam = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    cam.position.set(...CAM);
    cam.lookAt(...LOOK);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    return (x: number, y: number, z: number) => {
      const v = new THREE.Vector3(x, y, z).project(cam);
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
    };
  }, [width, height]);
};

const BW = 2.6;
const BD = 1.8;
const LIVE_H = 2.4; // 1 million live rows
const SLABS = 6; // 6 x 50,000 dead rows = 300,000, drawn to the same scale as the live rows
const SLAB_H = (LIVE_H * (round10k(data.dead_feedback_on) / data.rows)) / SLABS;
const BX = -1.55;
const RX = 1.95; // the replica
const DBR = 0.62;

const Slab: React.FC<{ i: number; land: number }> = ({ i, land }) => {
  const frame = useCurrentFrame();
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, SLAB_H * 0.88, BD)), []);
  if (frame < land - 21) return null;
  const p = sine(interpolate(frame, [land - 21, land], [0, 1], clamp));
  const y = LIVE_H + SLAB_H * (i + 0.5) + (1 - p) * 0.6;
  return (
    <group position={[BX, y, 0]}>
      <mesh>
        <boxGeometry args={[BW, SLAB_H * 0.88, BD]} />
        <meshStandardMaterial color="#4a2427" emissive={RED} emissiveIntensity={0.25} transparent opacity={0.45 + 0.45 * p} roughness={0.5} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={RED} transparent opacity={p} />
      </lineSegments>
    </group>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const replica = useCue("replica", 30);
  const safe = useCue("safe", 70);
  const n = useCue("n", 130);
  const ten = useCue("ten", 150);
  const moved = useCue("moved", 180);
  const project = useProject();
  // dead rows land from frame 10 until "n", one every ~0.7 s or slower
  const gap = Math.max(20, (n - 10) / (SLABS - 1));
  const lands = Array.from({ length: SLABS }, (_, i) => Math.round(10 + i * gap));
  const liveEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, LIVE_H, BD)), []);
  const face = project(BX, LIVE_H / 2, BD / 2);
  const mainC = project(BX, 0, 0);
  const repTop = project(RX, 1.95, 0);
  const repC = project(RX, 0, 0);
  // the report document slides from the main database to the replica, from frame 0, done by "replica"
  const slide = sine(interpolate(frame, [0, Math.max(replica + 4, 40)], [0, 1], clamp));
  const docX = mainC.x + (repC.x - mainC.x) * slide;
  const docY = 700;
  const ok = frame >= safe && frame < n - 10;
  const pn = interpolate(frame, [n - 14, n], [0, 1], clamp);
  return (
    <>
      <Canvas pos={CAM} look={LOOK}>
        <pointLight position={[0, 6, 5]} intensity={16} distance={16} color="#ffffff" />
        <group position={[BX, LIVE_H / 2, 0]}>
          <mesh>
            <boxGeometry args={[BW, LIVE_H, BD]} />
            <meshStandardMaterial color="#4a515b" emissive={LIGHT} emissiveIntensity={0.08} roughness={0.5} metalness={0.25} />
          </mesh>
          <lineSegments geometry={liveEdges}>
            <lineBasicMaterial color={LIGHT} />
          </lineSegments>
        </group>
        {lands.map((land, i) => (
          <Slab key={i} i={i} land={land} />
        ))}
        {[0.3, 0.95, 1.6].map((y) => (
          <mesh key={y} position={[RX, y, 0]}>
            <cylinderGeometry args={[DBR, DBR, 0.5, 48]} />
            <meshStandardMaterial color="#2a2f37" emissive={LIGHT} emissiveIntensity={0.12} roughness={0.4} metalness={0.3} />
          </mesh>
        ))}
      </Canvas>
      <Title text="Move it to a replica" />
      {/* labels above the objects, flat */}
      <div style={{ position: "absolute", left: face.x - 200, top: face.y - 22, width: 400, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: FG, textShadow: shadow }}>main database</div>
      <div style={{ position: "absolute", left: repTop.x - 150, top: repTop.y - 66, width: 300, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT, textShadow: shadow, opacity: fade(frame, replica - 8) }}>replica</div>
      <div style={{ position: "absolute", left: docX - 40, top: docY, transform: `rotate(${(1 - slide) * -6}deg)` }}>
        <ReportDoc size={80} color={FG} />
      </div>
      <div style={{ position: "absolute", left: docX - 80, top: docY + 104, width: 160, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 30, color: FG, textShadow: shadow }}>report</div>
      {ok ? (
        <div style={{ position: "absolute", left: mainC.x - 30, top: 590, opacity: fade(frame, safe) * (1 - fade(frame, n - 18, 8)) }}>
          <Check color={GREEN} size={60} />
        </div>
      ) : null}
      <Sfx name="whoosh" at={2} volume={0.12} />
      {lands.map((f) => (
        <Sfx key={f} name="slap" at={f} volume={0.07} />
      ))}
      {/* the number */}
      <div style={{ position: "absolute", left: L, top: 360, display: "flex", alignItems: "baseline", gap: 22, opacity: fade(frame, n - 14, 6) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 150, lineHeight: 1, color: pn >= 1 ? RED : GRAY }}>{fmt(steps(round10k(data.dead_feedback_on), pn, 50_000))}</div>
      </div>
      <div style={{ position: "absolute", left: L + 4, top: 520, fontFamily: SANS, fontWeight: 800, fontSize: 46, color: FG, opacity: fade(frame, n - 4) }}>
        dead rows <span style={{ fontFamily: MONO, fontWeight: 700, color: LIGHT, opacity: fade(frame, ten - 4) }}>· in {data.minutes} min</span>
      </div>
      <div style={{ position: "absolute", left: L + 4, top: 590, fontFamily: MONO, fontSize: 34, color: LIGHT, opacity: fade(frame, moved - 2) }}>on the main database</div>
      <Sfx name="reveal" at={n} volume={0.35} />
      <Sfx name="buzz" at={moved} volume={0.2} />
    </>
  );
};

// ---- 2. Updates: each update leaves a dead row; cleanup deletes it, but not the ones a running report may read --------

const STATUSES = ["PLACED", "COOKING", "PICKED_UP", "DELIVERED"];
const ROW_TOP = 500;
const ROW_H = 96;

const VersionRow: React.FC<{ i: number; at: number; deadAt: number; goneAt: number; locked: boolean }> = ({ i, at, deadAt, goneAt, locked }) => {
  const frame = useCurrentFrame();
  const inP = ease(interpolate(frame, [at - 4, at + 12], [0, 1], clamp));
  const dead = frame >= deadAt;
  const gone = interpolate(frame, [goneAt, goneAt + 14], [1, 0], clamp);
  if (frame < at - 4) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: L,
        top: ROW_TOP + i * ROW_H,
        width: 920,
        height: 80,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "150px 1fr 170px 150px",
        alignItems: "center",
        padding: "0 24px",
        borderRadius: 14,
        border: `4px solid ${dead ? RED : GREEN}`,
        background: dead ? HATCH : GREEN_BG,
        opacity: inP * gone,
        transform: `translateY(${(1 - inP) * -20}px)`,
        fontFamily: MONO,
        fontSize: 36,
        color: dead ? LIGHT : FG,
      }}
    >
      <span style={{ fontWeight: 800 }}>#1041</span>
      <span style={{ fontWeight: 800, textDecoration: dead ? "line-through" : "none" }}>{STATUSES[i]}</span>
      <span>£11.99</span>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, fontFamily: SANS, fontWeight: 800, fontSize: 32, color: dead ? RED : GREEN }}>
        {dead ? locked ? <Lock color={RED} /> : "dead" : "live"}
      </span>
    </div>
  );
};

// A broom that sweeps across a row once.
const Broom: React.FC<{ at: number; top: number }> = ({ at, top }) => {
  const frame = useCurrentFrame();
  const p = sine(interpolate(frame, [at - 8, at + 22], [0, 1], clamp));
  if (frame < at - 8 || frame > at + 26) return null;
  return (
    <svg width={90} height={90} viewBox="0 0 90 90" style={{ position: "absolute", left: L + 20 + p * 740, top: top - 8 }}>
      <path d="M62 6 L40 50" stroke={LIGHT} strokeWidth={6} strokeLinecap="round" />
      <path d="M26 46 L54 54 L48 84 L12 76 Z" fill={GREEN} opacity={0.85} />
    </svg>
  );
};

const Updates: React.FC = () => {
  const frame = useCurrentFrame();
  const dead = useCue("dead", 40);
  const deletes = useCue("deletes", 70);
  const report = useCue("report", 130);
  const read = useCue("read", 160);
  const born = [0, Math.max(10, dead - 2), dead + 20, report + 6];
  const deadAt = [dead, dead + 20, report + 6, 1e6];
  const goneAt = [deletes + 8, 1e6, 1e6, 1e6];
  const locked = frame >= read;
  return (
    <>
      <Title text="Updates leave dead rows" sub={`the orders table · ${data.updates_per_s} updates/s`} />
      {STATUSES.map((_, i) => (
        <VersionRow key={i} i={i} at={born[i]} deadAt={deadAt[i]} goneAt={goneAt[i]} locked={locked && i > 0} />
      ))}
      <Broom at={deletes} top={ROW_TOP} />
      <Sfx name="buzz" at={dead} volume={0.2} />
      <Sfx name="whoosh" at={deletes} volume={0.15} />
      {/* the running report */}
      <div style={{ position: "absolute", left: L, top: 930, display: "flex", alignItems: "center", gap: 22, opacity: fade(frame, report - 6) }}>
        <ReportDoc size={70} />
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>a report is running</div>
          <div style={{ fontFamily: MONO, fontSize: 32, color: locked ? RED : LIGHT }}>{locked ? "its dead rows stay" : "reading since 18:00"}</div>
        </div>
      </div>
      <Sfx name="stamp" at={read} volume={0.25} />
    </>
  );
};

// ---- 3. Feedback: the replica tells the main database what the report still needs; the main database keeps it --------

const DB_W = 230;
const MAIN_X = L + 20;
const REP_X = 650;
const DB_TOP = 790;

const Feedback: React.FC = () => {
  const frame = useCurrentFrame();
  const setting = useCue("setting", 30);
  const back = useCue("back", 70);
  const keeps = useCue("keeps", 130);
  const fly = sine(interpolate(frame, [back - 6, back + 34], [0, 1], clamp));
  const x0 = REP_X - 20;
  const x1 = MAIN_X + DB_W + 30;
  const y = DB_TOP + 90;
  const grow = ease(interpolate(frame, [keeps - 30, keeps + 40], [0, 1], clamp));
  const STACK = 6;
  const shown = Math.ceil(grow * STACK);
  return (
    <>
      <Title text="One setting" />
      {/* the setting */}
      <div style={{ position: "absolute", left: L, top: 370, display: "flex", alignItems: "center", gap: 18, padding: "14px 22px", borderRadius: 16, border: `4px solid ${FG}`, background: CARD, opacity: fade(frame, setting - 6) }}>
        <div style={{ width: 88, height: 46, borderRadius: 23, background: GRAY, position: "relative" }}>
          <div style={{ position: "absolute", top: 5, left: 47, width: 36, height: 36, borderRadius: 18, background: FG }} />
        </div>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: FG }}>hot_standby_feedback = on</span>
      </div>
      {/* the two databases */}
      <div style={{ position: "absolute", left: MAIN_X, top: DB_TOP }}>
        <Database width={DB_W} color={frame >= keeps ? RED : LIGHT} />
      </div>
      <div style={{ position: "absolute", left: MAIN_X, top: DB_TOP + DB_W * 1.05 + 14, width: DB_W, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 32, color: FG }}>main</div>
      <div style={{ position: "absolute", left: REP_X, top: DB_TOP }}>
        <Database width={DB_W} />
      </div>
      <div style={{ position: "absolute", left: REP_X, top: DB_TOP + DB_W * 1.05 + 14, width: DB_W, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 32, color: FG }}>replica</div>
      <div style={{ position: "absolute", left: REP_X + DB_W / 2 - 34, top: DB_TOP - 120 }}>
        <ReportDoc size={68} />
      </div>
      {/* the message back */}
      {frame >= back - 6 ? (
        <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={x0} y1={y} x2={x0 + (x1 - x0) * fly} y2={y} stroke={LIGHT} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" />
          {fly < 1 ? <circle cx={x0 + (x1 - x0) * fly} cy={y} r={12} fill={FG} /> : <path d={`M${x1 + 20} ${y - 14} L${x1} ${y} L${x1 + 20} ${y + 14}`} fill="none" stroke={LIGHT} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: x1 + 30, top: y - 70, width: x0 - x1 - 40, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 30, color: FG, opacity: fade(frame, back) }}>still needed</div>
      <Sfx name="whoosh" at={back - 6} volume={0.15} />
      {/* the main database keeps the dead rows: a red stack grows on it */}
      {Array.from({ length: shown }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: MAIN_X + 15, top: DB_TOP - 34 - i * 30, width: DB_W - 30, height: 24, borderRadius: 6, background: HATCH, border: `3px solid ${RED}` }} />
      ))}
      <div style={{ position: "absolute", left: MAIN_X, top: DB_TOP + DB_W * 1.05 + 64, opacity: fade(frame, keeps - 4) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 64, color: RED }}>{fmt(steps(round10k(data.dead_feedback_on), grow, 50_000))}</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: FG }}>dead rows kept</div>
      </div>
      <Sfx name="stamp" at={keeps} volume={0.25} />
    </>
  );
};

// ---- 4. The fix: the switch off; dead rows on the main database, 10-minute test ---------------------------------------

const BAR_MAX = 560;
const DeadBar: React.FC<{ top: number; at: number; label: string; value: number; text: string; color: string }> = ({ top, at, label, value, text, color }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at, at + 18], [0, 1], clamp));
  return (
    <div style={{ position: "absolute", left: L, top, opacity: fade(frame, at - 4, 6) }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: LIGHT }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
        <div style={{ width: Math.max(16, (value / data.dead_feedback_on) * BAR_MAX * p), height: 56, borderRadius: 10, background: color }} />
        <div style={{ marginLeft: 20, fontFamily: MONO, fontWeight: 800, fontSize: 48, color: FG, opacity: fade(frame, at + 10) }}>{text}</div>
      </div>
    </div>
  );
};

const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  const fix = useCue("fix", 8);
  const off = useCue("off", 40);
  const n = useCue("n", 110);
  const none = useCue("none", 150);
  const k = ease(interpolate(frame, [off - 4, off + 8], [0, 1], clamp));
  return (
    <>
      <Title text="The fix" />
      <Sfx name="reveal" at={fix} volume={0.2} />
      <div style={{ position: "absolute", left: L, top: 370, display: "flex", alignItems: "center", gap: 22, padding: "18px 26px", borderRadius: 18, border: `4px solid ${k > 0.5 ? GREEN : FG}`, background: k > 0.5 ? GREEN_BG : CARD }}>
        <div style={{ width: 110, height: 58, borderRadius: 29, background: k > 0.5 ? EDGE : GRAY, position: "relative" }}>
          <div style={{ position: "absolute", top: 6, left: 58 - 52 * k, width: 46, height: 46, borderRadius: 23, background: FG }} />
        </div>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: FG }}>hot_standby_feedback = {k > 0.5 ? "off" : "on"}</span>
      </div>
      <Sfx name="slap" at={off} volume={0.2} />
      <div style={{ position: "absolute", left: L, top: 540, fontFamily: MONO, fontSize: 32, color: MUTED, opacity: fade(frame, n - 30) }}>dead rows on the main database · {data.minutes} min</div>
      <DeadBar top={600} at={n - 30} label="setting on" value={data.dead_feedback_on} text={fmt(round10k(data.dead_feedback_on))} color={RED} />
      <DeadBar top={760} at={n - 4} label="setting off" value={data.dead_feedback_off} text="under 20,000" color={GREEN} />
      <DeadBar top={920} at={none - 4} label="no report at all" value={data.dead_no_report} text={`about ${fmt(round1k(data.dead_no_report))}`} color={GRAY} />
      <Sfx name="stamp" at={n} volume={0.3} />
    </>
  );
};

// ---- 5. The cost: the replica cancels a long report ------------------------------------------------------------------

const Cost: React.FC = () => {
  const frame = useCurrentFrame();
  const cancels = useCue("cancels", 40);
  const p = interpolate(frame, [6, Math.max(cancels - 2, 30)], [0, 1], clamp);
  const broken = ease(interpolate(frame, [cancels, cancels + 12], [0, 1], clamp));
  const secs = Math.round(30 * p);
  return (
    <>
      <Title text="The cost" />
      <div style={{ position: "absolute", left: L + 20, top: 470 }}>
        <Database width={250} />
      </div>
      <div style={{ position: "absolute", left: L + 20, top: 740, width: 250, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 32, color: FG }}>replica</div>
      <div style={{ position: "absolute", left: L + 300, top: 400 }}>
        <Stopwatch size={170} p={p} color={broken > 0.5 ? RED : LIGHT} label={`${secs} s`} />
      </div>
      <div style={{ position: "absolute", left: L + 520, top: 400 }}>
        <ReportDoc size={120} color={broken > 0.5 ? RED : FG} broken={broken} />
        {broken > 0 ? (
          <div style={{ position: "absolute", left: 20, top: 40, opacity: broken }}>
            <Cross color={RED} size={90} />
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: L + 300, top: 620, opacity: fade(frame, cancels) }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 58, color: RED }}>report cancelled</div>
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 30, color: LIGHT }}>conflict with recovery</div>
      </div>
      <div style={{ position: "absolute", left: L, top: 880, width: SAFE.lowRight - L, opacity: fade(frame, cancels + 12) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: FG }}>after 30 s, by default</div>
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 30, color: LIGHT }}>max_standby_streaming_delay</div>
      </div>
      <Sfx name="buzz" at={cancels} volume={0.3} />
    </>
  );
};

// ---- 6. Choose: minutes go to a replica with the setting off, hours go to a warehouse --------------------------------

const Choose: React.FC = () => {
  const frame = useCurrentFrame();
  const minutes = useCue("minutes", 10);
  const hours = useCue("hours", 80);
  const warehouse = useCue("warehouse", 100);
  const lane = (top: number, at: number, icon: React.ReactNode, label: string, dest: React.ReactNode, destLabel: string, sub: string, destAt: number) => (
    <div style={{ position: "absolute", left: L, top, width: 810, height: 230, opacity: fade(frame, at - 6, 8) }}>
      <div style={{ position: "absolute", left: 0, top: 10, width: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {icon}
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>{label}</div>
      </div>
      <svg width={200} height={60} style={{ position: "absolute", left: 220, top: 70 }}>
        <path d="M6 30 H180 M160 12 L184 30 L160 48" fill="none" stroke={LIGHT} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 430, top: 0, width: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: fade(frame, destAt - 4, 8) }}>
        {dest}
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>{destLabel}</div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: GREEN }}>{sub}</div>
      </div>
    </div>
  );
  return (
    <>
      <Title text="Pick by how long" />
      {lane(380, minutes, <Stopwatch size={110} p={0.25} color={LIGHT} label="min" />, "minutes", <Database width={120} glow={GREEN} color={GREEN} />, "replica", "setting off", minutes + 20)}
      {lane(720, hours, <Hourglass size={110} />, "hours", <Warehouse size={150} color={GREEN} />, "warehouse", "a separate copy", warehouse)}
      <Sfx name="reveal" at={minutes + 20} volume={0.25} />
      <Sfx name="stamp" at={warehouse} volume={0.3} />
    </>
  );
};

export const SCENES2: Record<string, React.FC> = { hook: Hook, updates: Updates, feedback: Feedback, fix: Fix, cost: Cost, choose: Choose, follow: Follow };

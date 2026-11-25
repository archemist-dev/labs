// Week 7 Short "The replica that brings the bloat back" (v2, 2026-11-25): a slow report moved to a replica, and the main
// database still got about 300,000 dead rows in 10 minutes, the same as with the report on it, because the replica's
// hot_standby_feedback tells the main database which dead rows the report still needs. Feedback off: under 20,000, like
// no report; the cost is that the replica cancels long reports. Minutes: a replica with feedback off; hours: a warehouse.
// Every number comes from data2.json (08-table-bloat/video_data2.py).
// Visuals v2 (Javlon, 2026-11-25: "a bit messy, and not follow general one style"): ONE STAGE for the whole Short.
// The same two 3D databases stand in the same place in every scene (main left, replica right, dead rows as red discs
// on the main one, the report as a document over the database it runs on); only the band above the stage changes.
// One type scale (title 72, number 140, label 44, note 32), one card style, one icon stroke. No camera motion.
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Follow } from "../../components/Follow";
import { Title } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, RED, SAFE, SANS } from "../../theme";
import { Canvas } from "../03-uuid-keys/Short1";
import data from "./data2.json";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (t: number) => 1 - (1 - t) ** 3;
export const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
export const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
export const steps = (value: number, p: number, step: number) => (p >= 1 ? value : Math.min(value, Math.floor((value * p) / step) * step));
export const fmt = (n: number) => n.toLocaleString("en-GB");
const round1k = (n: number) => Math.round(n / 1000) * 1000;
const round10k = (n: number) => Math.round(n / 10_000) * 10_000;
const ON = round10k(data.dead_feedback_on); // 300,000

// ---- one style ---------------------------------------------------------------------------------------------------------
export const CARD = "#22262c";
export const EDGE = "#3a3f47";
export const RED_BG = "rgba(229,72,77,0.16)";
export const L = SAFE.left;
export const BAND = 370; // top of the band above the stage
export const shadow = "0 4px 18px #000";
export const T = {
  number: { fontFamily: MONO, fontWeight: 800, fontSize: 140, lineHeight: 1 } as React.CSSProperties,
  label: { fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG } as React.CSSProperties,
  note: { fontFamily: MONO, fontWeight: 400, fontSize: 32, color: LIGHT } as React.CSSProperties,
  name: { fontFamily: MONO, fontWeight: 800, fontSize: 36, color: FG, textShadow: shadow } as React.CSSProperties,
};
export const cardStyle = (color: string = EDGE, bg: string = CARD): React.CSSProperties => ({ boxSizing: "border-box", borderRadius: 20, border: `4px solid ${color}`, background: bg });

export const STROKE = 5;
export const Check: React.FC<{ color: string; size?: number }> = ({ color, size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
    <path d="M7 19 L15 27 L29 10" fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Cross: React.FC<{ color: string; size?: number }> = ({ color, size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
    <path d="M9 9 L27 27 M27 9 L9 27" fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);
export const Lock: React.FC<{ color: string; size?: number }> = ({ color, size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
    <rect x={7} y={16} width={22} height={16} rx={3} fill="none" stroke={color} strokeWidth={4} />
    <path d="M12 16 V11 a6 6 0 0 1 12 0 V16" fill="none" stroke={color} strokeWidth={4} />
  </svg>
);
// The report: a document with a chart on it.
const ReportDoc: React.FC<{ size: number; color?: string }> = ({ size, color = FG }) => (
  <svg width={size} height={size * 1.22} viewBox="0 0 80 98" style={{ flexShrink: 0, overflow: "visible", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))" }}>
    <path d="M6 4 H54 L74 24 V94 H6 Z" fill="#23272e" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
    <path d="M54 4 V24 H74" fill="none" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
    <rect x={18} y={62} width={9} height={20} fill={color} />
    <rect x={33} y={50} width={9} height={32} fill={color} />
    <rect x={48} y={40} width={9} height={42} fill={color} />
  </svg>
);
const Warehouse: React.FC<{ size: number; color?: string }> = ({ size, color = FG }) => (
  <svg width={size} height={size * 0.8} viewBox="0 0 120 96" style={{ flexShrink: 0 }}>
    <path d="M8 40 L60 8 L112 40 V92 H8 Z" fill="#23272e" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
    <rect x={36} y={52} width={48} height={40} fill="none" stroke={color} strokeWidth={STROKE - 1} />
    <path d="M36 62 H84 M36 72 H84 M36 82 H84" stroke={color} strokeWidth={3.5} />
  </svg>
);
// The setting, as a switch.
const Switch: React.FC<{ on: number; at?: number }> = ({ on, at = 0 }) => {
  const frame = useCurrentFrame();
  const off = on < 0.5;
  return (
    <div style={{ ...cardStyle(off ? GREEN : FG, off ? GREEN_BG : CARD), position: "absolute", left: L, top: BAND, height: 92, padding: "0 26px", display: "flex", alignItems: "center", gap: 22, opacity: fade(frame, at - 6) }}>
      <div style={{ width: 100, height: 52, borderRadius: 26, background: off ? EDGE : GRAY, position: "relative" }}>
        <div style={{ position: "absolute", top: 6, left: 6 + 48 * on, width: 40, height: 40, borderRadius: 20, background: FG }} />
      </div>
      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: FG }}>hot_standby_feedback = {off ? "off" : "on"}</span>
    </div>
  );
};

// ---- the stage: the same two databases in every scene ------------------------------------------------------------------

export const CAM: [number, number, number] = [0, 5, 22.5];
export const LOOK: [number, number, number] = [0, 1.25, 0];
export const MX = -2.0; // main database
export const MR = 1.15;
export const SEG = 0.62; // three segments per database
const RX = 1.85; // replica
const RR = 0.85;
const RSEG = 0.46;
export const DISCS = 6; // 6 red discs = 300,000 dead rows (50,000 each)
export const DISC_H = 0.2;
export const MAIN_TOP = 3 * SEG + 0.16;
const REP_TOP = 3 * RSEG + 0.16;

export const useProject = () => {
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

export const Db3: React.FC<{ x: number; r: number; seg: number; glow?: string; glowAmount?: number }> = ({ x, r, seg, glow = LIGHT, glowAmount = 0.1 }) => (
  <group position={[x, 0, 0]}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0, seg / 2 + i * (seg + 0.08), 0]}>
        <cylinderGeometry args={[r, r, seg, 56]} />
        <meshStandardMaterial color="#3d444e" emissive={glow} emissiveIntensity={glowAmount} roughness={0.45} metalness={0.3} />
      </mesh>
    ))}
  </group>
);

type StageProps = {
  stack: number; // red discs on the main database, 0..6 (fractions drop in)
  thin?: number; // 0..1: the normal, thin layer of dead rows (gray) once the setting is off
  doc: number; // where the report is: 0 over the main database, 1 over the replica
  docState?: "ok" | "cancelled";
  docRing?: number; // 0..1 timer ring around the report
  message?: number; // -1 hidden, 0..1 the "still needed" message travelling replica -> main
  messageOff?: boolean; // the message line crossed out
  replicaGlow?: number; // 0..1 green
  mainGlow?: number; // 0..1 red
};

const Stage: React.FC<StageProps> = ({ stack, thin = 0, doc, docState = "ok", docRing = -1, message = -1, messageOff, replicaGlow = 0, mainGlow = 0 }) => {
  const project = useProject();
  const full = Math.floor(stack);
  const part = stack - full;
  const mainFoot = project(MX, 0, MR);
  const repFoot = project(RX, 0, RR);
  const mainTop = project(MX, MAIN_TOP + DISCS * DISC_H, 0);
  const repTop = project(RX, REP_TOP, 0);
  const mid = project(0, 1.0, 0);
  const mainEdge = project(MX + MR, 1.0, 0);
  const repEdge = project(RX - RR, 1.0, 0);
  const docX = mainTop.x + (repTop.x - mainTop.x) * doc;
  const docY = repTop.y - 150; // one height for the whole Short, clear of the full stack
  const cancelled = docState === "cancelled";
  const mx0 = repEdge.x - 16;
  const mx1 = mainEdge.x + 16;
  const ring = 2 * Math.PI * 78;
  return (
    <>
      <Canvas pos={CAM} look={LOOK}>
        <pointLight position={[0, 6, 6]} intensity={18} distance={18} color="#ffffff" />
        <Db3 x={MX} r={MR} seg={SEG} />
        <Db3 x={RX} r={RR} seg={RSEG} glow={replicaGlow > 0 ? GREEN : LIGHT} glowAmount={0.1 + 0.35 * replicaGlow} />
        {Array.from({ length: full + (part > 0 ? 1 : 0) }).map((_, i) => {
          const p = i < full ? 1 : sine(part);
          return (
            <mesh key={i} position={[MX, MAIN_TOP + DISC_H * (i + 0.5) + (1 - p) * 0.7, 0]}>
              <cylinderGeometry args={[MR * 0.94, MR * 0.94, DISC_H * 0.8, 56]} />
              <meshStandardMaterial color="#7a2c30" emissive={RED} emissiveIntensity={0.35 + 0.3 * mainGlow} transparent opacity={0.35 + 0.65 * p} roughness={0.5} />
            </mesh>
          );
        })}
        {thin > 0 ? (
          <mesh position={[MX, MAIN_TOP + 0.03, 0]}>
            <cylinderGeometry args={[MR * 0.94, MR * 0.94, 0.05, 56]} />
            <meshStandardMaterial color="#6b727d" emissive={LIGHT} emissiveIntensity={0.3} transparent opacity={thin} />
          </mesh>
        ) : null}
      </Canvas>
      {/* names, always in the same place */}
      <div style={{ ...T.name, position: "absolute", left: mainFoot.x - 200, top: mainFoot.y + 22, width: 400, textAlign: "center" }}>main database</div>
      <div style={{ ...T.name, position: "absolute", left: repFoot.x - 150, top: repFoot.y + 22, width: 300, textAlign: "center", color: replicaGlow > 0.5 ? GREEN : FG }}>replica</div>
      {/* the message back */}
      {message >= 0 ? (
        <>
          <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0 }}>
            <line x1={mx0} y1={mid.y} x2={mx0 + (mx1 - mx0) * Math.min(1, message)} y2={mid.y} stroke={messageOff ? GRAY : FG} strokeWidth={STROKE} strokeDasharray="4 16" strokeLinecap="round" />
            {message < 1 ? <circle cx={mx0 + (mx1 - mx0) * message} cy={mid.y} r={13} fill={FG} /> : !messageOff ? <path d={`M${mx1 + 22} ${mid.y - 15} L${mx1} ${mid.y} L${mx1 + 22} ${mid.y + 15}`} fill="none" stroke={FG} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" /> : null}
          </svg>
          <div style={{ ...T.note, position: "absolute", left: mx1, top: mid.y - 58, width: mx0 - mx1, textAlign: "center", fontSize: 28, whiteSpace: "nowrap", color: messageOff ? GRAY : FG, textDecoration: messageOff ? "line-through" : "none", textShadow: shadow }}>still needed</div>
        </>
      ) : null}
      {/* the report */}
      <div style={{ position: "absolute", left: docX - 45, top: docY }}>
        <ReportDoc size={90} color={cancelled ? RED : FG} />
        {cancelled ? (
          <div style={{ position: "absolute", left: 5, top: 16 }}>
            <Cross color={RED} size={80} />
          </div>
        ) : null}
      </div>
      {docRing >= 0 ? (
        <svg width={180} height={180} viewBox="0 0 180 180" style={{ position: "absolute", left: docX - 90, top: docY - 35 }}>
          <circle cx={90} cy={90} r={78} fill="none" stroke={EDGE} strokeWidth={8} />
          <circle cx={90} cy={90} r={78} fill="none" stroke={cancelled ? RED : FG} strokeWidth={8} strokeDasharray={`${ring * docRing} ${ring}`} transform="rotate(-90 90 90)" strokeLinecap="round" />
        </svg>
      ) : null}
    </>
  );
};

// ---- 1. Hook: the report moves to the replica; dead rows still land on the main database ------------------------------

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const replica = useCue("replica", 30);
  const n = useCue("n", 130);
  const ten = useCue("ten", 150);
  const moved = useCue("moved", 180);
  // the report is already sliding at frame 0; one disc lands every ~0.7 s or slower, the sixth on the number
  const slide = sine(interpolate(frame, [-4, Math.max(replica + 4, 40)], [0, 1], clamp));
  const first = Math.max(replica + 10, 44);
  const stack = interpolate(frame, [first, Math.max(n, first + DISCS * 20)], [0, DISCS], clamp);
  const pn = interpolate(frame, [n - 14, n], [0, 1], clamp);
  return (
    <>
      <Stage stack={stack} doc={slide} mainGlow={pn} />
      <Title text="Move it to a replica" />
      <div style={{ ...T.number, position: "absolute", left: L, top: BAND - 10, color: pn >= 1 ? RED : GRAY, opacity: fade(frame, n - 14, 6) }}>{fmt(steps(ON, pn, 50_000))}</div>
      <div style={{ ...T.label, position: "absolute", left: L, top: BAND + 150, opacity: fade(frame, n - 4) }}>
        dead rows <span style={{ ...T.note, opacity: fade(frame, ten - 4) }}>· in {data.minutes} min</span>
      </div>
      <div style={{ ...T.note, position: "absolute", left: L, top: BAND + 216, opacity: fade(frame, moved - 2) }}>on the main database</div>
      <Sfx name="whoosh" at={2} volume={0.12} />
      <Sfx name="reveal" at={n} volume={0.35} />
    </>
  );
};

// ---- 2. Updates: each update leaves a dead row; cleanup deletes it, unless a running report may still read it --------

const STATUSES = ["PLACED", "COOKING", "PICKED_UP", "DELIVERED"];
const ROW_STEP = 86;

const VersionRow: React.FC<{ slot: number; status: string; at: number; deadAt: number; goneAt: number; locked: boolean }> = ({ slot, status, at, deadAt, goneAt, locked }) => {
  const frame = useCurrentFrame();
  const inP = ease(interpolate(frame, [at - 4, at + 12], [0, 1], clamp));
  const dead = frame >= deadAt;
  const gone = interpolate(frame, [goneAt, goneAt + 14], [1, 0], clamp);
  if (frame < at - 4) return null;
  return (
    <div
      style={{
        ...cardStyle(dead ? RED : GREEN, dead ? RED_BG : GREEN_BG),
        position: "absolute",
        left: L,
        top: BAND + slot * ROW_STEP,
        width: 920,
        height: 74,
        borderRadius: 16,
        display: "grid",
        gridTemplateColumns: "150px 1fr 170px 130px",
        alignItems: "center",
        padding: "0 24px",
        opacity: inP * gone,
        transform: `translateY(${(1 - inP) * -18}px)`,
        fontFamily: MONO,
        fontSize: 36,
        color: dead ? LIGHT : FG,
      }}
    >
      <span style={{ fontWeight: 800 }}>#1041</span>
      <span style={{ fontWeight: 800, textDecoration: dead ? "line-through" : "none" }}>{status}</span>
      <span>£11.99</span>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, fontFamily: SANS, fontWeight: 800, fontSize: 32, color: dead ? RED : GREEN }}>{dead ? locked ? <Lock color={RED} /> : "dead" : "live"}</span>
    </div>
  );
};

const Updates: React.FC = () => {
  const frame = useCurrentFrame();
  const dead = useCue("dead", 40);
  const deletes = useCue("deletes", 70);
  const report = useCue("report", 130);
  const read = useCue("read", 160);
  // PLACED dies when COOKING is written; cleanup removes it. Later dead rows stay: the report may still read them.
  const born = [0, Math.max(10, dead - 2), deletes + 30, report];
  const deadAt = [born[1], born[2], born[3], 1e6];
  const goneAt = [deletes + 4, 1e6, 1e6, 1e6];
  const locked = frame >= read;
  return (
    <>
      <Stage stack={DISCS} doc={1} docRing={frame >= report ? 1 : -1} mainGlow={locked ? 1 : 0.4} />
      <Title text="Updates leave dead rows" />
      {STATUSES.map((s, i) => (
        <VersionRow key={s} slot={i} status={s} at={born[i]} deadAt={deadAt[i]} goneAt={goneAt[i]} locked={locked && i > 0} />
      ))}
      <div style={{ ...T.note, position: "absolute", left: L, top: BAND + 6, height: 74, display: "flex", alignItems: "center", gap: 12, color: GREEN, opacity: fade(frame, deletes + 18) * (1 - fade(frame, report - 10)) }}>
        <Check color={GREEN} size={36} />
        deleted by cleanup
      </div>
      <Sfx name="buzz" at={dead} volume={0.2} />
      <Sfx name="whoosh" at={deletes + 4} volume={0.15} />
      <Sfx name="stamp" at={read} volume={0.25} />
    </>
  );
};

// ---- 3. Feedback: one setting reports back; the main database keeps the dead rows ------------------------------------

const Feedback: React.FC = () => {
  const frame = useCurrentFrame();
  const setting = useCue("setting", 30);
  const back = useCue("back", 70);
  const keeps = useCue("keeps", 130);
  const fly = frame < back - 6 ? -1 : sine(interpolate(frame, [back - 6, back + 36], [0, 1], clamp));
  const k = fade(frame, keeps - 4, 8);
  return (
    <>
      <Stage stack={DISCS} doc={1} docRing={1} message={fly} mainGlow={0.4 + 0.6 * k} />
      <Title text="One setting" />
      <Switch on={1} at={setting} />
      <div style={{ position: "absolute", left: L, top: BAND + 130, display: "flex", alignItems: "baseline", gap: 20, opacity: k }}>
        <span style={{ ...T.number, fontSize: 96, color: RED }}>{fmt(ON)}</span>
        <span style={T.label}>dead rows kept</span>
      </div>
      <Sfx name="reveal" at={setting} volume={0.25} />
      <Sfx name="whoosh" at={back - 6} volume={0.15} />
      <Sfx name="stamp" at={keeps} volume={0.25} />
    </>
  );
};

// ---- 4. The fix: the setting off; dead rows on the main database, 10-minute test --------------------------------------

const ResultRow: React.FC<{ slot: number; at: number; label: string; value: string; color: string }> = ({ slot, at, label, value, color }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: L, top: BAND + 124 + slot * 78, width: 920, height: 66, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: fade(frame, at - 4, 8) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 22, height: 44, borderRadius: 8, background: color }} />
        <span style={T.label}>{label}</span>
      </div>
      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 48, color: FG }}>{value}</span>
    </div>
  );
};

const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  const off = useCue("off", 40);
  const n = useCue("n", 110);
  const none = useCue("none", 150);
  const k = ease(interpolate(frame, [off - 4, off + 8], [0, 1], clamp));
  // the stack leaves once the setting is off; the normal thin layer stays
  const drop = ease(interpolate(frame, [off + 6, Math.max(off + 40, n - 6)], [0, 1], clamp));
  return (
    <>
      <Stage stack={DISCS * (1 - drop)} thin={drop} doc={1} message={1} messageOff={k > 0.5} mainGlow={1 - drop} />
      <Title text="The fix" />
      <Switch on={1 - k} />
      <ResultRow slot={0} at={4} label="setting on" value={fmt(ON)} color={RED} />
      <ResultRow slot={1} at={n} label="setting off" value="under 20,000" color={GREEN} />
      <ResultRow slot={2} at={none} label="no report" value={`about ${fmt(round1k(data.dead_no_report))}`} color={GRAY} />
      <Sfx name="slap" at={off} volume={0.2} />
      <Sfx name="stamp" at={n} volume={0.3} />
    </>
  );
};

// ---- 5. The cost: the replica cancels a long report -----------------------------------------------------------------

const Cost: React.FC = () => {
  const frame = useCurrentFrame();
  const cancels = useCue("cancels", 40);
  const p = interpolate(frame, [4, Math.max(cancels - 2, 30)], [0, 1], clamp);
  const cancelled = frame >= cancels;
  return (
    <>
      <Stage stack={0} thin={1} doc={1} docRing={p} docState={cancelled ? "cancelled" : "ok"} message={1} messageOff />
      <Title text="The cost" />
      <Switch on={0} />
      <div style={{ position: "absolute", left: L, top: BAND + 130, opacity: fade(frame, cancels - 2, 6) }}>
        <div style={{ ...T.label, fontSize: 64, color: RED }}>report cancelled</div>
        <div style={{ ...T.note, marginTop: 10, color: FG }}>after 30 s, by default</div>
        <div style={{ ...T.note, marginTop: 4 }}>max_standby_streaming_delay</div>
      </div>
      <Sfx name="buzz" at={cancels} volume={0.3} />
    </>
  );
};

// ---- 6. Choose: minutes go to a replica with the setting off, hours go to a warehouse --------------------------------

const Choice: React.FC<{ slot: number; at: number; destAt: number; left: string; right: string; note: string; icon?: React.ReactNode }> = ({ slot, at, destAt, left, right, note, icon }) => {
  const frame = useCurrentFrame();
  const p = fade(frame, destAt - 4, 8);
  return (
    <div style={{ ...cardStyle(p > 0.5 ? GREEN : EDGE, p > 0.5 ? GREEN_BG : CARD), position: "absolute", left: L, top: BAND + slot * 152, width: 920, height: 132, padding: "0 30px", display: "flex", alignItems: "center", gap: 26, opacity: fade(frame, at - 6, 8) }}>
      <span style={{ ...T.label, width: 210 }}>{left}</span>
      <svg width={80} height={40} viewBox="0 0 80 40" style={{ flexShrink: 0 }}>
        <path d="M4 20 H68 M54 6 L72 20 L54 34" fill="none" stroke={LIGHT} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ opacity: p, display: "flex", alignItems: "center", gap: 20 }}>
        {icon}
        <div>
          <div style={T.label}>{right}</div>
          <div style={{ ...T.note, color: GREEN }}>{note}</div>
        </div>
      </div>
    </div>
  );
};

const Choose: React.FC = () => {
  const frame = useCurrentFrame();
  const minutes = useCue("minutes", 10);
  const hours = useCue("hours", 80);
  const warehouse = useCue("warehouse", 100);
  return (
    <>
      <Stage stack={0} thin={1} doc={1} message={1} messageOff replicaGlow={fade(frame, minutes + 16)} />
      <Title text="Pick by how long" />
      <Choice slot={0} at={minutes} destAt={minutes + 20} left="minutes" right="replica" note="setting off" />
      <Choice slot={1} at={hours} destAt={warehouse} left="hours" right="warehouse" note="a separate copy" icon={<Warehouse size={96} />} />
      <Sfx name="reveal" at={minutes + 20} volume={0.25} />
      <Sfx name="stamp" at={warehouse} volume={0.3} />
    </>
  );
};

export const SCENES2: Record<string, React.FC> = { hook: Hook, updates: Updates, feedback: Feedback, fix: Fix, cost: Cost, choose: Choose, follow: Follow };

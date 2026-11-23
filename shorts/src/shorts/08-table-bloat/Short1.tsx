// Week 7 Short "The read that grows your table": one slow report left 1.8 million dead rows next to 1 million orders,
// because cleanup can't delete a row copy the report might still need; the table doesn't shrink afterwards; a 60 s
// limit on queries and idle transactions keeps dead rows at the normal level. Every number comes from data.json
// (08-table-bloat/video_data.py). The opening is 3D (one large object: the orders table, dead rows stacking on it from
// frame 0); rows, counters and bars are 2D. No camera motion anywhere: the objects move. Everything read sits in SAFE.
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Follow } from "../../components/Follow";
import { Title } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SAFE, SANS } from "../../theme";
import { Canvas } from "../03-uuid-keys/Short1";
import data from "./data.json";

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

// ---- 1. Hook (3D): the orders table, and dead rows piling on it ------------------------------------------------------

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

const BW = 3.0; // block width, depth; live part height = 1 million rows
const BD = 2.0;
const LIVE_H = 2.2;
const SLABS = 9; // 9 slabs of 200,000 dead rows = 1.8 million
const SLAB_H = (LIVE_H * (data.dead_at_release / data.rows)) / SLABS;
const BX = 1.6; // with CAM/LOOK: the full stack spans x 553-934, y 447-1241 (work-w7/cam.mjs)

const Slab: React.FC<{ i: number; land: number }> = ({ i, land }) => {
  const frame = useCurrentFrame();
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, SLAB_H * 0.92, BD)), []);
  if (frame < land - 21) return null;
  const p = sine(interpolate(frame, [land - 21, land], [0, 1], clamp)); // falls into place in 0.7 s
  const y = LIVE_H + SLAB_H * (i + 0.5) + (1 - p) * 0.6; // a short fall, so the top slab never crosses the title
  return (
    <group position={[BX, y, 0]}>
      <mesh>
        <boxGeometry args={[BW, SLAB_H * 0.92, BD]} />
        <meshStandardMaterial color="#4a2427" emissive={RED} emissiveIntensity={0.22} transparent opacity={0.45 + 0.45 * p} roughness={0.5} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={RED} transparent opacity={p} />
      </lineSegments>
    </group>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const report = useCue("report", 6);
  const hour = useCue("hour", 90);
  const dead = useCue("dead", 170);
  const live = useCue("live", 220);
  const project = useProject();
  // One slab lands every ~0.6 s from frame 12; the ninth lands on "dead".
  const gap = Math.max(14, (dead - 12) / (SLABS - 1));
  const lands = Array.from({ length: SLABS }, (_, i) => Math.round(12 + i * gap));
  const landed = lands.filter((f) => frame >= f).length;
  const liveEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, LIVE_H, BD)), []);
  const clock = Math.round(interpolate(frame, [hour - 30, dead], [0, 60], clamp));
  const deadLabel = project(BX - BW / 2, LIVE_H + (SLAB_H * SLABS) / 2, BD / 2);
  const liveLabel = project(BX - BW / 2, LIVE_H / 2, BD / 2);
  const pd = interpolate(frame, [dead - 12, dead], [0, 1], clamp);
  return (
    <>
      <Canvas pos={CAM} look={LOOK}>
        <pointLight position={[BX, 6, 5]} intensity={16} distance={16} color="#ffffff" />
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
      </Canvas>
      <Title text="A report only reads" />
      {/* the report and its clock */}
      <div style={{ position: "absolute", left: L, top: 380, display: "flex", alignItems: "center", gap: 18, padding: "14px 24px", borderRadius: 16, border: `4px solid ${GRAY}`, background: CARD, opacity: fade(frame, report - 6) }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: frame % 30 < 18 ? GREEN : GRAY }} />
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, color: FG }}>report</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: frame >= hour - 30 ? FG : MUTED }}>{clock} min</div>
      </div>
      {/* labels beside the block, flat */}
      <div style={{ position: "absolute", right: 1080 - deadLabel.x + 30, top: deadLabel.y - 90, textAlign: "right", opacity: fade(frame, dead - 12, 6), textShadow: shadow }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 120, lineHeight: 1, color: pd >= 1 ? RED : GRAY }}>{(steps(18, pd, 2) / 10).toFixed(1)}M</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, color: FG }}>dead rows</div>
      </div>
      <div style={{ position: "absolute", right: 1080 - liveLabel.x + 30, top: liveLabel.y - 70, textAlign: "right", opacity: fade(frame, live - 6), textShadow: shadow }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 88, lineHeight: 1, color: FG }}>1M</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT }}>real orders</div>
      </div>
      <Sfx name="impact" at={0} volume={0.3} />
      {lands.slice(0, landed).map((f) => (
        <Sfx key={f} name="slap" at={f} volume={0.08} />
      ))}
      <Sfx name="reveal" at={dead} volume={0.35} />
    </>
  );
};

// ---- 2. Updates: each update writes a new copy; the old one is dead; cleanup deletes it ------------------------------

const STATUSES = ["PLACED", "COOKING", "PICKED_UP", "DELIVERED"];
const ROW_TOP = 470;
const ROW_H = 96;

const VersionRow: React.FC<{ i: number; at: number; deadAt: number; goneAt: number; locked?: boolean; stamp?: string }> = ({ i, at, deadAt, goneAt, locked, stamp }) => {
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
        gridTemplateColumns: "150px 1fr 170px 190px",
        alignItems: "center",
        padding: "0 24px",
        borderRadius: 14,
        border: `4px solid ${dead ? RED : GREEN}`,
        background: dead ? HATCH : GREEN_BG,
        opacity: inP * gone,
        transform: `translateY(${(1 - inP) * -20}px) scaleX(${0.96 + 0.04 * gone})`,
        fontFamily: MONO,
        fontSize: 36,
        color: dead ? LIGHT : FG,
      }}
    >
      <span style={{ fontWeight: 800 }}>#1041</span>
      <span style={{ fontWeight: 800, color: dead ? LIGHT : FG, textDecoration: dead ? "line-through" : "none" }}>{STATUSES[i]}</span>
      <span>£11.99</span>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, fontFamily: SANS, fontWeight: 800, fontSize: 32, color: dead ? RED : GREEN }}>
        {stamp ? <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: LIGHT }}>{stamp}</span> : null}
        {dead ? locked ? <Lock color={RED} /> : "dead" : "live"}
      </span>
    </div>
  );
};

const Updates: React.FC = () => {
  const frame = useCurrentFrame();
  const changing = useCue("changing", 10);
  const rate = useCue("rate", 40);
  const copy = useCue("copy", 100);
  const old = useCue("old", 150);
  const cleanup = useCue("cleanup", 180);
  // PLACED on "changing"; COOKING (a new copy) on "copy", PLACED dead on "dead"; then two more updates, 0.7 s apart.
  const born = [changing, copy, old + 22, old + 44];
  const deadAt = [old, old + 22, old + 44, 1e6];
  const goneAt = [cleanup + 6, cleanup + 24, cleanup + 52, 1e6];
  return (
    <>
      <Title text="Updates leave copies" sub="the orders table" />
      <div style={{ position: "absolute", right: 1080 - SAFE.right, top: 345, padding: "10px 20px", borderRadius: 14, border: `4px solid ${GRAY}`, fontFamily: MONO, fontWeight: 800, fontSize: 36, color: FG, opacity: fade(frame, rate - 4) }}>
        500 updates/s
      </div>
      {STATUSES.map((_, i) => (
        <VersionRow key={i} i={i} at={born[i]} deadAt={deadAt[i]} goneAt={goneAt[i]} />
      ))}
      <Sfx name="reveal" at={copy} volume={0.25} />
      <Sfx name="buzz" at={old} volume={0.2} />
      <div style={{ position: "absolute", left: L, top: 900, opacity: fade(frame, cleanup - 4) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: SANS, fontWeight: 800, fontSize: 52, color: GREEN }}>
          <Check color={GREEN} size={48} />
          cleanup deletes dead rows
        </div>
        <div style={{ marginTop: 6, marginLeft: 62, fontFamily: MONO, fontSize: 34, color: LIGHT }}>autovacuum</div>
      </div>
      <Sfx name="whoosh" at={cleanup + 6} volume={0.15} />
    </>
  );
};

// ---- 3. Blocked: the report needs the table as it was at 18:00, so cleanup deletes nothing --------------------------

const Blocked: React.FC = () => {
  const frame = useCurrentFrame();
  const six = useCue("six", 20);
  const then = useCue("then", 60);
  const n = useCue("n", 120);
  const nothing = useCue("nothing", 150);
  const pn = interpolate(frame, [n - 24, n], [0, 1], clamp);
  const STAMPS = ["18:01", "18:02", "18:03", "18:04"];
  return (
    <>
      <Title text="Cleanup is blocked" />
      <div style={{ position: "absolute", left: L, top: 360, display: "flex", alignItems: "center", gap: 18, padding: "14px 24px", borderRadius: 16, border: `4px solid ${FG}`, background: CARD, opacity: fade(frame, six - 6) }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, color: FG }}>report started</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 52, color: FG }}>18:00</div>
      </div>
      <div style={{ position: "absolute", left: L + 4, top: 470, fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT, opacity: fade(frame, then - 4) }}>needs the table as it was at 18:00</div>
      {/* dead copies made after 18:00, each one locked */}
      {STAMPS.map((s, i) => {
        const at = then + 4 + i * 8;
        return (
          <div
            key={s}
            style={{
              position: "absolute",
              left: L,
              top: 550 + i * 86,
              width: 920,
              height: 72,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              borderRadius: 14,
              border: `4px solid ${RED}`,
              background: HATCH,
              opacity: fade(frame, at - 4, 8),
              fontFamily: MONO,
              fontSize: 34,
              color: LIGHT,
            }}
          >
            <span>dead row · {s}</span>
            <Lock color={RED} />
          </div>
        );
      })}
      <Sfx name="stamp" at={then + 4} volume={0.2} />
      {/* the two counters */}
      <div style={{ position: "absolute", left: L, top: 920, width: 400, opacity: fade(frame, n - 26, 8) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: LIGHT }}>cleanup runs</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 130, lineHeight: 1.05, color: FG }}>{steps(data.autovacuums, pn, 5)}</div>
      </div>
      <div style={{ position: "absolute", left: 500, top: 920, width: 380, opacity: fade(frame, nothing - 4, 6) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: LIGHT }}>deleted</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 130, lineHeight: 1.05, color: RED }}>0</div>
      </div>
      <Sfx name="reveal" at={n} volume={0.3} />
      <Sfx name="buzz" at={nothing} volume={0.3} />
    </>
  );
};

// ---- 4. After: the dead rows go, the table file keeps its size --------------------------------------------------------

const CELLS = 34; // the 337 MB file in pages of about 10 MB
const USED = Math.round((data.end_mb - data.free_mb) / 10); // 13 used, 21 empty
const COLS = 7;
const CELL = 100; // grid 784 px wide: the outline stays inside x 80-890
const GAP = 14;

const After: React.FC = () => {
  const frame = useCurrentFrame();
  const ended = useCue("ended", 20);
  const shrink = useCue("shrink", 60);
  const W = COLS * CELL + (COLS - 1) * GAP;
  const rowsN = Math.ceil(CELLS / COLS);
  const H = rowsN * CELL + (rowsN - 1) * GAP;
  const top = 400;
  return (
    <>
      <Title text="The table stays big" />
      <div style={{ position: "absolute", left: L + 14, top: top - 10, width: W, height: H }}>
        {Array.from({ length: CELLS }, (_, i) => {
          const live = i < USED;
          const clearAt = ended + (i - USED) * 1.2; // dead pages empty in about 0.8 s, one after another
          const cleared = !live && frame >= clearAt;
          const x = (i % COLS) * (CELL + GAP);
          const y = Math.floor(i / COLS) * (CELL + GAP);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: CELL,
                height: CELL,
                boxSizing: "border-box",
                borderRadius: 12,
                border: live ? `4px solid ${GRAY}` : cleared ? `4px dashed ${EDGE}` : `4px solid ${RED}`,
                background: live ? "#3a4049" : cleared ? "transparent" : HATCH,
                opacity: fade(frame, i * 0.4, 8),
              }}
            />
          );
        })}
      </div>
      <Sfx name="whoosh" at={ended} volume={0.15} />
      {/* the outline: the file's size doesn't move */}
      <div style={{ position: "absolute", left: L, top: top - 22, width: W + 28, height: H + 24, boxSizing: "border-box", borderRadius: 18, border: `5px solid ${FG}`, opacity: fade(frame, shrink - 6) }} />
      <div style={{ position: "absolute", left: L, top: top + H + 40, display: "flex", gap: 40, opacity: fade(frame, shrink - 2) }}>
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: LIGHT }}>table size</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 56, color: FG }}>unchanged</div>
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: LIGHT }}>empty inside</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 56, color: RED }}>{Math.round((100 * data.free_mb) / data.end_mb)}%</div>
        </div>
      </div>
      <Sfx name="stamp" at={shrink} volume={0.3} />
    </>
  );
};

// ---- 5. The fix: stop long queries and idle transactions after 60 s; dead rows back to normal --------------------------

const Rule: React.FC<{ top: number; at: number; text: string; setting: string }> = ({ top, at, text, setting }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: L, top, width: 920, boxSizing: "border-box", padding: "18px 24px", borderRadius: 16, border: `4px solid ${GREEN}`, background: GREEN_BG, opacity: fade(frame, at - 4, 8) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: SANS, fontWeight: 800, fontSize: 42, color: FG }}>
        <Check color={GREEN} size={40} />
        {text}
      </div>
      <div style={{ marginTop: 6, marginLeft: 52, fontFamily: MONO, fontSize: 28, color: LIGHT }}>{setting}</div>
    </div>
  );
};

const BAR_MAX = 520;
const DeadBar: React.FC<{ top: number; at: number; label: string; value: number; color: string }> = ({ top, at, label, value, color }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at, at + 18], [0, 1], clamp));
  return (
    <div style={{ position: "absolute", left: L, top, opacity: fade(frame, at - 4, 6) }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: LIGHT }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
        <div style={{ width: Math.max(14, (value / data.dead_ten_no_limit) * BAR_MAX * p), height: 56, borderRadius: 10, background: color }} />
        <div style={{ marginLeft: 20, fontFamily: MONO, fontWeight: 800, fontSize: 52, color: FG }}>{fmt(steps(value > 100_000 ? Math.round(value / 10_000) * 10_000 : Math.round(value / 1000) * 1000, p, 1000))}</div>
      </div>
    </div>
  );
};

const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  const fix = useCue("fix", 8);
  const query = useCue("query", 50);
  const idle = useCue("idle", 80);
  const n = useCue("n", 170);
  const was = useCue("was", 200);
  return (
    <>
      <Title text="The fix" />
      <Sfx name="reveal" at={fix} volume={0.2} />
      <Rule top={380} at={query} text="stop a query after 60 s" setting="statement_timeout = 60s" />
      <Rule top={545} at={idle} text="close an idle transaction after 60 s" setting="idle_in_transaction_session_timeout = 60s" />
      <div style={{ position: "absolute", left: L, top: 740, fontFamily: MONO, fontSize: 32, color: MUTED, opacity: fade(frame, n - 30) }}>10-minute test · dead rows when the report ends</div>
      <DeadBar top={800} at={n - 4} label="with the limits" value={data.dead_ten_limit} color={GREEN} />
      <DeadBar top={960} at={was - 4} label="no limit" value={data.dead_ten_no_limit} color={RED} />
      <Sfx name="stamp" at={n} volume={0.3} />
      <Sfx name="buzz" at={was} volume={0.2} />
    </>
  );
};

export const SCENES1: Record<string, React.FC> = { hook: Hook, updates: Updates, blocked: Blocked, after: After, fix: Fix, follow: Follow };

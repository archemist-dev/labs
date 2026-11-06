// Week 3 Short "The 14x cliff" in 3D (three.js via @remotion/three). Every number comes from data.json
// (03-uuid-keys/video_data.py, run 1 of the lab log). Text stays flat HTML over the 3D scene, so it reads like the
// rest of the channel; labels only, no sentences.
import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Pop, Stamp, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";
import { Cam, Floor, LANE_LOOK, laneCam, Lights, Race3 } from "./ProtoB";
import { fmt } from "./sim";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const shadow = "0 4px 18px #000";

export const Header: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => {
  const line = useSpring(4);
  return (
    <div style={{ position: "absolute", top: 200, left: 70, right: 70 }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 72, color: FG, lineHeight: 1.05, textShadow: shadow }}>{text}</div>
      <div style={{ marginTop: 18, width: 140 * line, height: 8, borderRadius: 4, background: GOLD }} />
      {sub ? <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 32, color: MUTED }}>{sub}</div> : null}
    </div>
  );
};

export const Canvas: React.FC<{ children: React.ReactNode; pos: [number, number, number]; look: [number, number, number] }> = ({ children, pos, look }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 38 }}>
      <Cam pos={pos} look={look} />
      <Lights />
      <Floor />
      {children}
    </ThreeCanvas>
  );
};

// A database: three stacked discs.
export const Db: React.FC<{ x: number; z: number; color: string; glow?: number; scale?: number }> = ({ x, z, color, glow = 0.3, scale = 1 }) => (
  <group position={[x, 0, z]} scale={[scale, scale, scale]}>
    {[0.35, 0.95, 1.55].map((y) => (
      <mesh key={y} position={[0, y, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.5, 48]} />
        <meshStandardMaterial color="#23272d" emissive={color} emissiveIntensity={glow} roughness={0.4} metalness={0.3} />
      </mesh>
    ))}
  </group>
);

// ---- 2. Same rows, only the ID changed --------------------------------------------------------------------------

// The v7 example is the one from the article (its first 12 hex digits are the milliseconds: 27 October 2026,
// 18:00 UTC); the v4 one is any random UUID. The order is the channel's example order (CLAUDE.md).
const V7_ID = "01a17e84-e100-71c4-9e2b-5f8a1d3c6e90";
const V4_ID = "c9f2a6d1-3b7e-4f08-a5d4-91e6b2c07f3a";
const FIELDS: [string, string][] = [
  ["status", "DELIVERED"],
  ["total", "1199"],
  ["placed_at", "2026-10-27 18:00"],
  ["address", "East Rd, CB1 1PT"],
];

const RowCard: React.FC<{ top: number; at: number; idAt: number; label: string; id: string; color: string; time: boolean; same: boolean }> = ({ top, at, idAt, label, id, color, time, same }) => {
  const frame = useCurrentFrame();
  const enter = useSpring(at, 120);
  const lit = interpolate(frame, [idAt, idAt + 8], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top, opacity: enter, transform: `translateY(${(1 - enter) * 40}px)` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 10 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: lit > 0 ? color : LIGHT }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 30, color: MUTED, opacity: lit }}>{time ? "time first" : "all random"}</span>
      </div>
      <div style={{ borderRadius: 16, border: `3px solid ${GRAY}`, background: "#22262b", padding: "14px 20px" }}>
        <div style={{ display: "flex", height: 52, alignItems: "center", borderRadius: 10, margin: "0 -10px", padding: "0 10px", background: `rgba(${color === GREEN ? "52,199,123" : "229,72,77"},${0.18 * lit})` }}>
          <span style={{ width: 170, fontFamily: MONO, fontSize: 28, color: MUTED }}>id</span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 31, color: lit > 0 ? FG : LIGHT, whiteSpace: "nowrap" }}>
            {time ? (
              <>
                <span style={{ color: lit > 0 ? GREEN : LIGHT }}>{id.slice(0, 13)}</span>
                {id.slice(13)}
              </>
            ) : (
              <span style={{ color: lit > 0 ? RED : LIGHT }}>{id}</span>
            )}
          </span>
        </div>
        {FIELDS.map(([k, v], i) => {
          const show = interpolate(frame, [at + 4 + i * 3, at + 10 + i * 3], [0, 1], clamp);
          return (
            <div key={k} style={{ display: "flex", height: 46, alignItems: "center", opacity: show * (1 - 0.45 * lit) }}>
              <span style={{ width: 170, fontFamily: MONO, fontSize: 28, color: MUTED }}>{k}</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 31, color: FG }}>{v}</span>
              {same ? <span style={{ marginLeft: "auto", fontFamily: MONO, fontWeight: 800, fontSize: 32, color: GREEN }}>=</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Ids: React.FC = () => {
  const pg = useCue("pg", 30);
  const id = useCue("id", 60);
  return (
    <>
      <Header text="Same rows" sub="PostgreSQL 18 · 10M rows" />
      <RowCard top={420} at={2} idAt={id} label="UUIDv7" id={V7_ID} color={GREEN} time same={false} />
      <RowCard top={820} at={pg} idAt={id + 5} label="UUIDv4" id={V4_ID} color={RED} time={false} same />
      <Sfx name="reveal" at={pg} volume={0.35} />
      <Sfx name="stamp" at={id} volume={0.35} />
    </>
  );
};

// ---- 3. The real curves, in 2D: you'd never notice at 1M ---------------------------------------------------------

const CURVES: { key: "bigint" | "v7" | "v4"; label: string; color: string }[] = [
  { key: "bigint", label: "bigint", color: LIGHT },
  { key: "v7", label: "UUIDv7", color: GREEN },
  { key: "v4", label: "UUIDv4", color: RED },
];
// Chart box (px): rows 0..10M across, inserts/s 0..280k up.
const GX0 = 150;
const GX1 = 990;
const GY0 = 1230;
const GY1 = 700;
const YMAX = 280_000;
const gx = (rows: number) => GX0 + ((GX1 - GX0) * rows) / 10_000_000;
const gy = (rate: number) => GY0 - ((GY0 - GY1) * rate) / YMAX;

// The measured points (first window at 0 rows), cut at `upto` rows; returns the path and the head point.
const partial = (key: "bigint" | "v7" | "v4", upto: number) => {
  const { rows, rate } = data[key];
  const pts: [number, number][] = [[0, rate[0]], ...rows.map((r, i) => [r, rate[i]] as [number, number])];
  const out: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] <= upto) out.push(pts[i]);
    else {
      const [r0, v0] = pts[i - 1];
      const t = (upto - r0) / (pts[i][0] - r0);
      out.push([upto, v0 + t * (pts[i][1] - v0)]);
      break;
    }
  }
  const d = out.map(([r, v], i) => `${i ? "L" : "M"}${gx(r).toFixed(1)},${gy(v).toFixed(1)}`).join(" ");
  return { d, head: out[out.length - 1] };
};

const Curve: React.FC = () => {
  const frame = useCurrentFrame();
  const m1 = useCue("m1", 6);
  const index = useCue("index", 60);
  const memory = useCue("memory", 80);
  const upto =
    frame < index
      ? interpolate(frame, [0, m1 + 14], [0, 1_000_000], { ...clamp, easing: ease })
      : interpolate(frame, [index, memory + 36], [1_000_000, 10_000_000], { ...clamp, easing: (t) => t * t * (3 - 2 * t) });
  const zone = interpolate(frame, [memory, memory + 14], [0, 1], clamp);
  const axes = useSpring(0, 120);
  return (
    <>
      <Header text="Inserts per second" sub={`rows: ${fmt(Math.round(upto / 100_000) * 100_000)}`} />
      <div style={{ position: "absolute", left: 70, top: 430 }}>
        {CURVES.map((c) => {
          const head = partial(c.key, upto).head[1];
          return (
            <div key={c.key} style={{ display: "flex", alignItems: "baseline", gap: 20, height: 70 }}>
              <span style={{ width: 230, fontFamily: SANS, fontWeight: 800, fontSize: 46, color: c.color }}>{c.label}</span>
              <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 50, color: c.color }}>{fmt(Math.round(head / 100) * 100)}</span>
              <span style={{ fontFamily: MONO, fontSize: 30, color: MUTED }}>/s</span>
            </div>
          );
        })}
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={8} />
          </filter>
        </defs>
        <g opacity={axes}>
          {[100_000, 200_000].map((v) => (
            <g key={v}>
              <line x1={GX0} x2={GX1} y1={gy(v)} y2={gy(v)} stroke={GRAY} strokeWidth={2} strokeDasharray="6 10" opacity={0.5} />
              <text x={GX0 - 16} y={gy(v) + 10} textAnchor="end" fontFamily={MONO} fontSize={28} fill={MUTED}>{`${v / 1000}k`}</text>
            </g>
          ))}
          <line x1={GX0} x2={GX1} y1={GY0} y2={GY0} stroke={GRAY} strokeWidth={4} />
          {[1_000_000, 5_000_000, 10_000_000].map((r) => (
            <text key={r} x={gx(r)} y={GY0 + 44} textAnchor="middle" fontFamily={MONO} fontSize={28} fill={MUTED}>{`${r / 1_000_000}M`}</text>
          ))}
        </g>
        {/* index > memory: the stretch where random inserts fall off */}
        <rect x={gx(1_000_000)} y={GY1} width={(gx(2_000_000) - gx(1_000_000)) * zone} height={GY0 - GY1} fill={RED} opacity={0.12} />
        <text x={gx(1_000_000) + 8} y={GY1 - 14} fontFamily={MONO} fontWeight={800} fontSize={32} fill={RED} opacity={zone}>
          index &gt; memory
        </text>
        {CURVES.map((c) => {
          const { d, head } = partial(c.key, upto);
          return (
            <g key={c.key}>
              <path d={d} fill="none" stroke={c.color} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" opacity={0.35} filter="url(#glow)" />
              <path d={d} fill="none" stroke={c.color} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={gx(head[0])} cy={gy(head[1])} r={13} fill={c.color} />
              <circle cx={gx(head[0])} cy={gy(head[1])} r={24} fill={c.color} opacity={0.25} />
            </g>
          );
        })}
      </svg>
      <Sfx name="whoosh" at={index} volume={0.4} />
    </>
  );
};

// ---- 4. Production, in 3D: the deadpan server rack ---------------------------------------------------------------

const Eye: React.FC<{ x: number; blink: number }> = ({ x, blink }) => (
  <group position={[x, 0.55, 0.62]}>
    <mesh>
      <sphereGeometry args={[0.26, 32, 32]} />
      <meshStandardMaterial color={FG} roughness={0.3} />
    </mesh>
    <mesh position={[0, -0.06, 0.2]}>
      <sphereGeometry args={[0.11, 24, 24]} />
      <meshStandardMaterial color="#1b1d21" roughness={0.2} />
    </mesh>
    {/* the half-closed lid: deadpan */}
    <mesh position={[0, 0.17 - 0.2 * blink, 0.05]}>
      <boxGeometry args={[0.62, 0.3 + 0.4 * blink, 0.5]} />
      <meshStandardMaterial color="#4a515b" roughness={0.6} />
    </mesh>
  </group>
);

export const Rack: React.FC<{ frame: number }> = ({ frame }) => {
  const blink = frame % 70 < 4 ? 1 : 0;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 2.8, 1.2)), []);
  return (
    <group position={[0, 1.4 + Math.sin(frame * 0.1) * 0.05, 0]} rotation={[0, Math.sin(frame * 0.05) * 0.18 + 0.25, 0]}>
      <mesh>
        <boxGeometry args={[2.2, 2.8, 1.2]} />
        <meshStandardMaterial color="#3a4049" roughness={0.5} metalness={0.25} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={LIGHT} />
      </lineSegments>
      <Eye x={-0.48} blink={blink} />
      <Eye x={0.48} blink={blink} />
      {/* flat mouth */}
      <mesh position={[0, -0.05, 0.62]}>
        <boxGeometry args={[0.7, 0.07, 0.04]} />
        <meshStandardMaterial color={LIGHT} />
      </mesh>
      {/* vents and status lights */}
      {[-0.55, -0.8, -1.05].map((y) => (
        <mesh key={y} position={[-0.1, y, 0.61]}>
          <boxGeometry args={[1.4, 0.06, 0.04]} />
          <meshStandardMaterial color={GRAY} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.78, -0.55 - i * 0.25, 0.62]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={(frame + i * 7) % 24 < 12 ? 1.5 : 0.2} />
        </mesh>
      ))}
    </group>
  );
};

const ProductionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, 60], [13, 12], clamp);
  return (
    <>
      <Canvas pos={[0.6, 2.4, z]} look={[0.85, 1.2, 0]}>
        <pointLight position={[0.5, 2.2, 4]} intensity={18} distance={12} color="#ffffff" />
        <group scale={interpolate(frame, [0, 8], [0.6, 1], { ...clamp, easing: ease })}>
          <Rack frame={frame} />
        </group>
      </Canvas>
      <div style={{ position: "absolute", left: 90, width: 460, top: 480, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>PRODUCTION</div>
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 330 }}>
        <div style={{ position: "relative", width: 430, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: FG }}>It was fine yesterday.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
    </>
  );
};

// ---- 5. The cheap fixes: seconds to load 10M rows -------------------------------------------------------------------

const BARS: { key: keyof typeof data.load_s; label: string; color: string; cue: string }[] = [
  { key: "v4", label: "UUIDv4", color: RED, cue: "cheap" },
  { key: "v4_ff70", label: "+ room on page", color: RED, cue: "room" },
  { key: "bigint_public_v4", label: "+ public ID", color: RED, cue: "public" },
  { key: "v7", label: "UUIDv7", color: GREEN, cue: "" },
];
const BAR_H = 2.5 / 514; // world units per second of load time

const Fixes: React.FC = () => {
  const frame = useCurrentFrame();
  const cues: Record<string, number> = { cheap: useCue("cheap", 6), room: useCue("room", 30), public: useCue("public", 80), "": 0 };
  const nohelp = useCue("nohelp", 50);
  const cliff = useCue("cliff", 110);
  const a = interpolate(frame, [0, 180], [0.18, -0.06], clamp);
  const pos: [number, number, number] = [Math.sin(a) * 14 + 0.2, 3.6, Math.cos(a) * 14];
  return (
    <>
      <Canvas pos={pos} look={[0.2, 1.2, 0]}>
        {BARS.map((b, i) => {
          const at = cues[b.cue];
          const p = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: ease });
          const h = Math.max(0.01, data.load_s[b.key] * BAR_H * p);
          return (
            <mesh key={b.key} position={[-1.8 + i * 1.2, h / 2, 0]}>
              <boxGeometry args={[0.8, h, 0.8]} />
              <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.3} roughness={0.35} />
            </mesh>
          );
        })}
      </Canvas>
      <Header text="Load 10M rows" sub="seconds, lower is better" />
      <div style={{ position: "absolute", left: 70, top: 420 }}>
        {BARS.map((b) => {
          const at = cues[b.cue];
          const on = frame >= at;
          const v = Math.round(data.load_s[b.key] * interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: ease }));
          return (
            <div key={b.key} style={{ display: "flex", alignItems: "baseline", gap: 18, height: 72, opacity: on ? 1 : 0.25 }}>
              <span style={{ width: 380, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: b.color, textShadow: shadow }}>{b.label}</span>
              <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 52, color: b.color, textShadow: shadow }}>{v}</span>
              <span style={{ fontFamily: MONO, fontSize: 30, color: MUTED }}>s</span>
            </div>
          );
        })}
      </div>
      <Stamp at={nohelp} label="NO HELP" color={RED} style={{ left: 760, top: 490 }} />
      <Stamp at={cliff} label="SAME CLIFF" color={RED} style={{ left: 760, top: 562 }} />
    </>
  );
};

// ---- 6. The take ----------------------------------------------------------------------------------------------------

const Take: React.FC = () => {
  const frame = useCurrentFrame();
  const outside = useCue("outside", 20);
  const v7 = useCue("v7", 50);
  const only = useCue("only", 90);
  const bigint = useCue("bigint", 120);
  // Upper lane: three services each make an ID and send it to the database. Lower lane: the database counts.
  const svc = interpolate(frame, [outside - 6, outside + 8], [0.001, 1], clamp);
  const flying = Array.from({ length: 9 }, (_, i) => {
    const t = ((frame - outside - i * 9) % 54) / 54;
    return frame - outside - i * 9 >= 0 ? t : -1;
  });
  const counter = frame >= only ? Math.min(99, Math.floor((frame - only) / 4) + 1) : 0;
  return (
    <>
      <Canvas pos={laneCam(300 + frame * 0.3)} look={LANE_LOOK}>
        {[-3.0, -2.0, -1.0].map((x, i) => (
          <mesh key={x} position={[x, 0.4, -1.9]} scale={[svc, svc, svc]}>
            <boxGeometry args={[0.7, 0.8, 0.7]} />
            <meshStandardMaterial color={GRAY} emissive={LIGHT} emissiveIntensity={0.1 + 0.2 * (i % 2)} roughness={0.5} />
          </mesh>
        ))}
        {flying.map((t, i) =>
          t < 0 ? null : (
            <mesh key={i} position={[-3.0 + (i % 3) + (1.55 - (-3.0 + (i % 3))) * ease(t), 0.9 + Math.sin(t * Math.PI) * 0.9, -1.9]}>
              <boxGeometry args={[0.22, 0.22, 0.22]} />
              <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.7} />
            </mesh>
          ),
        )}
        <Db x={1.55} z={-1.9} color={GREEN} glow={frame >= v7 ? 0.5 : 0.15} />
        <group scale={interpolate(frame, [only - 6, only + 8], [0.001, 1], clamp)}>
          <Db x={1.55} z={1.9} color={LIGHT} glow={frame >= bigint ? 0.45 : 0.1} />
        </group>
      </Canvas>
      <Header text="My take" />
      <Pop at={outside} style={{ left: 70, top: 440 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT, textShadow: shadow }}>IDs made outside the DB</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 64, color: frame >= v7 ? GREEN : "transparent", textShadow: shadow }}>→ UUIDv7</div>
      </Pop>
      <Pop at={only} style={{ left: 70, top: 880 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT, textShadow: shadow }}>Only the DB makes IDs</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 64, color: frame >= bigint ? FG : "transparent", textShadow: shadow }}>→ bigint</div>
        <div style={{ fontFamily: MONO, fontSize: 34, color: MUTED }}>{counter ? `1, 2, 3 … ${counter}` : ""}</div>
      </Pop>
      <Sfx name="stamp" at={v7} volume={0.4} />
      <Sfx name="stamp" at={bigint} volume={0.4} />
    </>
  );
};

// ---- 7. End: same size, so why so slow? --------------------------------------------------------------------------------

const End: React.FC = () => {
  const frame = useCurrentFrame();
  const size = useCue("size", 4);
  const slow2 = useCue("slow2", 50);
  const next = useCue("next", 90);
  const cells = (z: number, color: string, k: number) =>
    Array.from({ length: 16 }, (_, i) => {
      const p = interpolate(frame, [size + i * 1.2, size + i * 1.2 + 8], [0.001, 1], clamp);
      const pulse = k === 1 && frame >= slow2 ? 0.25 + 0.35 * Math.abs(Math.sin((frame - slow2) * 0.15)) : 0.3;
      return (
        <mesh key={`${z}-${i}`} position={[-3.1 + i * 0.29, 0.2, z]} scale={[p, p, p]}>
          <boxGeometry args={[0.24, 0.3, 0.7]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={pulse} roughness={0.35} />
        </mesh>
      );
    });
  return (
    <>
      <Canvas pos={laneCam(360 - frame * 0.4)} look={LANE_LOOK}>
        {cells(-1.9, GREEN, 0)}
        {cells(1.9, RED, 1)}
      </Canvas>
      <Header text="Same 16 bytes" />
      {[
        { top: 440, label: "UUIDv7", color: GREEN },
        { top: 880, label: "UUIDv4", color: RED },
      ].map((l) => (
        <div key={l.label} style={{ position: "absolute", left: 70, top: l.top, display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: l.color, textShadow: shadow }}>{l.label}</span>
          <span style={{ fontFamily: MONO, fontSize: 36, color: MUTED }}>16 bytes</span>
        </div>
      ))}
      <Pop at={slow2} sfx="reveal" style={{ left: 760, top: 900 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 120, color: RED, textShadow: shadow }}>?</div>
      </Pop>
      <Pop at={next} style={{ left: 70, top: 1225 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT }}>
          Next: <span style={{ color: FG }}>where the next row lands</span>
        </div>
      </Pop>
    </>
  );
};

export const SCENES1: Record<string, React.FC> = { race: Race3, ids: Ids, curve: Curve, production: ProductionScene, fixes: Fixes, take: Take, end: End };

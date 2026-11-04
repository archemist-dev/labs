// Week 3 Short "The 14x cliff" in 3D (three.js via @remotion/three). Every number comes from data.json
// (03-uuid-keys/video_data.py, run 1 of the lab log). Text stays flat HTML over the 3D scene, so it reads like the
// rest of the channel; labels only, no sentences.
import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { ProductionFace } from "../../components/Production";
import { Pop, Stamp, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";
import { Cam, Floor, LANE_LOOK, laneCam, Lights, Race3 } from "./ProtoB";
import { fmt } from "./sim";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const shadow = "0 4px 18px #000";

const Header: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => {
  const line = useSpring(4);
  return (
    <div style={{ position: "absolute", top: 200, left: 70, right: 70 }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 72, color: FG, lineHeight: 1.05, textShadow: shadow }}>{text}</div>
      <div style={{ marginTop: 18, width: 140 * line, height: 8, borderRadius: 4, background: GOLD }} />
      {sub ? <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 32, color: MUTED }}>{sub}</div> : null}
    </div>
  );
};

const Canvas: React.FC<{ children: React.ReactNode; pos: [number, number, number]; look: [number, number, number] }> = ({ children, pos, look }) => {
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
const Db: React.FC<{ x: number; z: number; color: string; glow?: number; scale?: number }> = ({ x, z, color, glow = 0.3, scale = 1 }) => (
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
// 18:00 UTC); the v4 one is any random UUID.
const V7_ID = "01a17e84-e100-71c4-9e2b-5f8a1d3c6e90";
const V4_ID = "c9f2a6d1-3b7e-4f08-a5d4-91e6b2c07f3a";

const Ids: React.FC = () => {
  const frame = useCurrentFrame();
  const pg = useCue("pg", 30);
  const id = useCue("id", 60);
  // Identical rows keep dropping into one Postgres table; only the ID on each row differs.
  const drops = Array.from({ length: 6 }, (_, i) => {
    const t = ((frame - i * 8) % 48) / 48;
    return frame - i * 8 >= 0 ? t : -1;
  });
  const a = interpolate(frame, [0, 150], [-0.2, 0.15], clamp);
  return (
    <>
      <Canvas pos={[Math.sin(a) * 12, 3.0, Math.cos(a) * 13]} look={[0, 1.7, 0]}>
        <group scale={interpolate(frame, [pg - 8, pg + 6], [0.6, 1], clamp)}>
          <Db x={0} z={0} color={LIGHT} glow={0.12 + 0.2 * interpolate(frame, [pg, pg + 8], [0, 1], clamp)} scale={0.7} />
        </group>
        {drops.map((t, i) =>
          t < 0 ? null : (
            <mesh key={i} position={[0, 1.4 + 0.9 * (1 - ease(t)), 0]} scale={[1, 1, 1].map(() => interpolate(t, [0, 0.1, 0.85, 1], [0.001, 1, 1, 0.001])) as [number, number, number]}>
              <boxGeometry args={[0.95, 0.16, 0.5]} />
              <meshStandardMaterial color={i % 2 ? GREEN : RED} emissive={i % 2 ? GREEN : RED} emissiveIntensity={0.35} roughness={0.4} />
            </mesh>
          ),
        )}
      </Canvas>
      <Header text="Same rows" sub="PostgreSQL 18 · 10M rows" />
      {[
        { top: 460, label: "UUIDv7", id: V7_ID, color: GREEN, time: true },
        { top: 700, label: "UUIDv4", id: V4_ID, color: RED, time: false },
      ].map((c, k) => (
        <Pop key={c.label} at={id + k * 6} sfx={k === 0 ? "reveal" : undefined} style={{ left: 70, top: c.top }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, color: c.color, textShadow: shadow }}>{c.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 30, color: MUTED }}>{c.time ? "time first" : "all random"}</span>
          </div>
          <div style={{ marginTop: 8, padding: "10px 16px", borderRadius: 12, background: "#262a30ee", border: `3px solid ${c.color}`, fontFamily: MONO, fontWeight: 700, fontSize: 34, color: FG, whiteSpace: "nowrap" }}>
            {c.time ? (
              <>
                <span style={{ color: GREEN }}>{c.id.slice(0, 13)}</span>
                {c.id.slice(13)}
              </>
            ) : (
              c.id
            )}
          </div>
        </Pop>
      ))}
    </>
  );
};

// ---- 3. The real curves: you'd never notice at 1M ---------------------------------------------------------------

const CURVES: { key: "bigint" | "v7" | "v4"; label: string; color: string; z: number }[] = [
  { key: "bigint", label: "bigint", color: LIGHT, z: -0.7 },
  { key: "v7", label: "UUIDv7", color: GREEN, z: 0 },
  { key: "v4", label: "UUIDv4", color: RED, z: 0.7 },
];
const CX0 = -1.9;
const CX1 = 1.9;
const CY = 2.4 / 260_000; // world units per insert/s

const curvePoints = (key: "bigint" | "v7" | "v4", z: number) => {
  const { rows, rate } = data[key];
  return [new THREE.Vector3(CX0, rate[0] * CY, z), ...rows.map((r, i) => new THREE.Vector3(CX0 + ((CX1 - CX0) * r) / 10_000_000, rate[i] * CY, z))];
};

const Tube: React.FC<{ pts: THREE.Vector3[]; upto: number; color: string }> = ({ pts, upto, color }) => {
  // upto: rows drawn so far (0..10M); the tube follows the measured points up to there.
  const geo = useMemo(() => {
    const x = CX0 + ((CX1 - CX0) * upto) / 10_000_000;
    const part: THREE.Vector3[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].x <= x) part.push(pts[i]);
      else {
        const a = pts[i - 1];
        const t = (x - a.x) / (pts[i].x - a.x);
        part.push(a.clone().lerp(pts[i], t));
        break;
      }
    }
    if (part.length < 2) part.push(part[0].clone().add(new THREE.Vector3(0.01, 0, 0)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(part, false, "centripetal"), 120, 0.07, 10, false);
  }, [pts, upto]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.3} />
    </mesh>
  );
};

const Curve: React.FC = () => {
  const frame = useCurrentFrame();
  const m1 = useCue("m1", 6);
  const index = useCue("index", 60);
  const memory = useCue("memory", 80);
  const upto = frame < index ? interpolate(frame, [0, m1 + 10], [0, 1_000_000], clamp) : interpolate(frame, [index, memory + 30], [1_000_000, 10_000_000], { ...clamp, easing: ease });
  const pts = useMemo(() => CURVES.map((c) => curvePoints(c.key, c.z)), []);
  const a = interpolate(frame, [0, 150], [-0.32, -0.12], clamp);
  const pos: [number, number, number] = [Math.sin(a) * 13.5, 3.4, Math.cos(a) * 13.5];
  const wall = interpolate(frame, [memory, memory + 12], [0, 1], clamp);
  const wallX = CX0 + ((CX1 - CX0) * 1_500_000) / 10_000_000;
  const shown = (key: "bigint" | "v7" | "v4") => {
    const { rows, rate } = data[key];
    const i = rows.findIndex((r) => r >= upto);
    return rate[Math.max(0, i)];
  };
  return (
    <>
      <Canvas pos={pos} look={[0, 1.6, 0]}>
        {/* axis floor strip */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[CX1 - CX0 + 0.4, 0.04, 2.2]} />
          <meshStandardMaterial color="#262a30" />
        </mesh>
        {CURVES.map((c, i) => (
          <Tube key={c.key} pts={pts[i]} upto={upto} color={c.color} />
        ))}
        {/* index > memory: a red glass wall where random inserts start to fall */}
        <mesh position={[wallX, 1.2, 0]} scale={[1, wall + 0.001, 1]}>
          <boxGeometry args={[0.06, 2.4, 2.4]} />
          <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.5} transparent opacity={0.35 * wall} />
        </mesh>
      </Canvas>
      <Header text="Inserts per second" sub={`rows: ${fmt(Math.round(upto / 100_000) * 100_000)}`} />
      <div style={{ position: "absolute", left: 70, top: 430 }}>
        {CURVES.map((c) => (
          <div key={c.key} style={{ display: "flex", alignItems: "baseline", gap: 20, height: 74 }}>
            <span style={{ width: 230, fontFamily: SANS, fontWeight: 800, fontSize: 48, color: c.color, textShadow: shadow }}>{c.label}</span>
            <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 52, color: c.color, textShadow: shadow }}>{fmt(Math.round(shown(c.key) / 100) * 100)}</span>
            <span style={{ fontFamily: MONO, fontSize: 30, color: MUTED }}>/s</span>
          </div>
        ))}
      </div>
      {wall > 0 ? (
        <div style={{ position: "absolute", left: 70, top: 660, opacity: wall, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: RED, textShadow: shadow }}>
          index &gt; memory
        </div>
      ) : null}
      <Sfx name="whoosh" at={index} volume={0.4} />
    </>
  );
};

// ---- 4. Production ------------------------------------------------------------------------------------------------

const ProductionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame * 0.12) * 6;
  return (
    <>
      <Pop at={0} style={{ left: 140, top: 520 }}>
        <div style={{ transform: `translateY(${bob}px)` }}>
          <ProductionFace mood="deadpan" size={360} />
        </div>
      </Pop>
      <div style={{ position: "absolute", left: 140, width: 360, top: 950, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>PRODUCTION</div>
      <Pop at={4} sfx="reveal" style={{ left: 540, top: 380 }}>
        <div style={{ position: "relative", width: 440, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: FG }}>It was fine yesterday.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
      <Sfx name="cricket" at={18} volume={0.5} />
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

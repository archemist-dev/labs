// Prototype B: the same story with real 3D objects (three.js via @remotion/three): row slabs riding two belts into
// two database cylinders under a slowly orbiting camera, then index pages as glass boxes that keys drop into.
// Numbers and labels stay flat HTML on top, so they read like the rest of the channel.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Mark, Pop, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { BG, FG, GOLD, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { FALL, fmt, fmtRows, phase, settle, rateAt, round100, rowsAt, simulate, speed, type Key } from "./sim";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const lerpColor = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

// Moves the camera every frame (the canvas re-renders on each Remotion frame).
export const Cam: React.FC<{ pos: [number, number, number]; look: [number, number, number] }> = ({ pos, look }) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
  }, [camera, pos, look]);
  return null;
};

export const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.55} />
    <directionalLight position={[4, 9, 7]} intensity={2.2} />
    <directionalLight position={[-6, 4, -4]} intensity={0.6} color="#8fb4ff" />
  </>
);

export const Floor: React.FC = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color={BG} roughness={0.95} />
    </mesh>
    <gridHelper args={[40, 40, "#2c3036", "#24272c"]} />
  </>
);

// The lane camera: a slow orbit from the left-front to the right-front, pushing in a little. Lane labels sit at
// top 440 (far lane, z -1.9) and 880 (near lane, z 1.9) on screen; every lane scene reuses this framing.
export const LANE_LOOK: [number, number, number] = [-0.9, 0.3, 0.2];
export const laneCam = (frame: number): [number, number, number] => {
  const a = interpolate(frame, [0, 360], [-0.22, 0.1], clamp);
  const r = interpolate(frame, [0, 360], [15.5, 14.2], clamp);
  return [Math.sin(a) * r - 0.9, 11.5, Math.cos(a) * r + 0.2];
};

// ---- Scene 1: the race in 3D -------------------------------------------------------------------------------------

const LANES3: { key: Key; label: string; sub: string; z: number; top: number }[] = [
  { key: "v7", label: "UUIDv7", sub: "time-ordered", z: -1.9, top: 440 },
  { key: "v4", label: "UUIDv4", sub: "random", z: 1.9, top: 880 },
];
const BX0 = -3.3;
const BX1 = 0.5;
const CX = 1.55; // database cylinders
const SLAB_GAP = 0.62;
const UNIT3 = 0.05; // world units per frame at v7's first-window rate

const laneColor = (key: Key, rate: number) =>
  key === "v7" ? GREEN : lerpColor(LIGHT, RED, interpolate(rate, [20_000, 120_000], [1, 0], clamp));

const Belt3: React.FC<{ k: Key; z: number; ten: number; slow: number }> = ({ k, z, ten, slow }) => {
  const frame = useCurrentFrame();
  const rate = rateAt(k, rowsAt(frame, ten, slow));
  const color = laneColor(k, rate);
  const p = phase(k, frame, ten, slow, UNIT3);
  const v = speed(k, frame, ten, slow, UNIT3);
  const len = BX1 - BX0;
  const n = Math.round(len / SLAB_GAP);
  const gap = len / n;
  const shake = k === "v4" && frame > slow - 10 ? Math.sin(frame * 1.7) * 0.03 : 0;
  return (
    <group>
      {/* belt */}
      <mesh position={[(BX0 + BX1) / 2 + 0.4, 0.05, z]}>
        <boxGeometry args={[len + 0.8, 0.1, 1.0]} />
        <meshStandardMaterial color="#2a2e34" roughness={0.7} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const x = BX0 + ((((p + i * gap) % len) + len) % len);
        const s = interpolate(x, [BX0, BX0 + 0.3, BX1 - 0.25, BX1], [0, 1, 1, 0], clamp);
        return (
          <mesh key={i} position={[x, 0.24, z]} scale={[s, s, s]}>
            <boxGeometry args={[0.42, 0.26, 0.85]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.35} metalness={0.1} />
          </mesh>
        );
      })}
      {/* database cylinder: three stacked discs, glowing while rows arrive */}
      {[0.35, 0.95, 1.55].map((y, i) => (
        <mesh key={i} position={[CX + shake, y, z]}>
          <cylinderGeometry args={[0.72, 0.72, 0.5, 48]} />
          <meshStandardMaterial color="#23272d" emissive={color} emissiveIntensity={0.15 + 0.5 * Math.min(1, v / 0.07)} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      <pointLight position={[CX, 2.4, z + 0.6]} color={color} intensity={6 * Math.min(1, v / 0.07) + 1} distance={4} />
    </group>
  );
};

export const Race3: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const today = useCue("today", 30);
  const ten = useCue("ten", 120);
  const slow = useCue("slow", 190);
  const fast = useCue("fast", 240);
  const x14 = useCue("x14", 280);
  const rows = rowsAt(frame, ten, slow);
  const tick = frame >= ten && frame < slow;
  // Camera: a slow orbit from the left-front to the right-front, pushing in a little.
  const pos = laneCam(frame);
  const pop = useSpring(x14 - 4, 200);
  return (
    <>
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 38 }}>
        <Cam pos={pos} look={LANE_LOOK} />
        <Lights />
        <Floor />
        {LANES3.map((l) => (
          <Belt3 key={l.key} k={l.key} z={l.z} ten={ten} slow={slow} />
        ))}
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 200, left: 70 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: MUTED }}>rows in the table</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 120, color: FG, letterSpacing: -2 }}>{fmtRows(rows)}</div>
        <div style={{ marginTop: 8, width: 140, height: 8, borderRadius: 4, background: GOLD }} />
      </div>
      {tick && frame % 4 === 0 ? <Sfx name="type" at={frame} volume={0.15} /> : null}
      <Sfx name="whoosh" at={ten} volume={0.5} />
      {LANES3.map((l) => {
        const rate = rateAt(l.key, rows);
        const color = laneColor(l.key, rate);
        const shown = l.key === "v4" && frame >= slow ? 6600 : l.key === "v7" && rows >= 10_000_000 ? 93000 : round100(rate);
        return (
          <div key={l.key} style={{ position: "absolute", left: 70, top: l.top }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color, textShadow: "0 4px 18px #000" }}>{l.label}</span>
              <span style={{ fontFamily: SANS, fontSize: 36, color: MUTED }}>{l.sub}</span>
            </div>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color, textShadow: "0 4px 18px #000" }}>
              {fmt(shown)}
              <span style={{ fontSize: 32, color: MUTED, fontWeight: 400 }}> rows/s</span>
            </div>
            <Pop at={today} style={{ left: 470, top: -10 }}>
              <Mark ok size={64} />
            </Pop>
            {l.key === "v4" && frame >= slow ? (
              <Pop at={slow} sfx="buzz" style={{ left: 470, top: -10, background: BG, borderRadius: 12 }}>
                <Mark ok={false} color={RED} size={64} />
              </Pop>
            ) : null}
            {l.key === "v7" ? (
              <div style={{ position: "absolute", left: -16, top: 64, width: 500, height: 84, borderRadius: 16, border: `4px solid ${GREEN}`, opacity: interpolate(frame, [fast, fast + 4, fast + 30], [0, 0.9, 0], clamp) }} />
            ) : null}
          </div>
        );
      })}
      {frame >= x14 - 4 ? (
        <div style={{ position: "absolute", left: 600, top: 1115, transform: `scale(${0.4 + 0.6 * pop}) rotate(-4deg)`, opacity: Math.min(1, pop * 2), fontFamily: MONO, fontWeight: 800, fontSize: 130, color: GREEN, textShadow: `0 0 40px ${GREEN}88` }}>
          14x
          <Sfx name="stamp" at={x14 - 4} />
        </div>
      ) : null}
    </>
  );
};

// ---- Scene 2: index pages as glass boxes -------------------------------------------------------------------------

const ROWS3: { key: Key; label: string; rule: string; z: number; top: number }[] = [
  { key: "v7", label: "UUIDv7", rule: "→ last page", z: -1.8, top: 430 },
  { key: "v4", label: "UUIDv4", rule: "→ any page", z: 1.8, top: 905 },
];
const PX0 = -2.9;
const PSPAN = 5.8;
const PH = 1.05;

const PageRow3: React.FC<{ k: Key; z: number; start: number }> = ({ k, z, start }) => {
  const frame = useCurrentFrame();
  const { pages, inFlight } = simulate(k, frame, start);
  const color = k === "v7" ? GREEN : RED;
  const visible = k === "v7" ? 6 : Math.max(6, pages.length);
  const first = k === "v7" ? pages.length - 6 : 0;
  const born = pages[pages.length - 1].born;
  const slide = k === "v7" && born > 0 ? interpolate(frame, [born, born + 10], [1, 0], clamp) : 0;
  const pitch = PSPAN / visible;
  const w = pitch * 0.78;
  const xOf = (i: number) => PX0 + (i - first + slide + 0.5) * pitch;
  return (
    <group>
      {pages.map((pg, i) => {
        if (i < first - 1) return null;
        const x = xOf(i);
        const hit = interpolate(frame - pg.hit, [0, 3, 14], [0, 1, 0], clamp);
        const split = interpolate(frame - pg.split, [0, 4, 22], [0, 1, 0], clamp);
        const grow = pg.born > 0 ? interpolate(frame, [pg.born, pg.born + 8], [0.01, 1], clamp) : 1;
        const fill = Math.min(1, pg.fill);
        const fade = interpolate(x, [PX0 - 0.6, PX0 + 0.2], [0, 1], clamp);
        return (
          <group key={pg.id} position={[x, 0, z]} scale={[grow * fade + 0.001, grow + 0.001, grow + 0.001]}>
            {/* glass page */}
            <mesh position={[0, PH / 2, 0]}>
              <boxGeometry args={[w, PH, 0.7]} />
              <meshStandardMaterial
                color={split > 0 ? RED : "#9aa1ab"}
                emissive={split > 0 ? RED : color}
                emissiveIntensity={0.6 * Math.max(hit, split)}
                transparent
                opacity={0.16 + 0.3 * split}
                roughness={0.1}
                metalness={0.2}
              />
            </mesh>
            {/* how full the page is */}
            <mesh position={[0, (PH * fill) / 2, 0]}>
              <boxGeometry args={[w * 0.86, Math.max(0.01, PH * fill), 0.56]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2 + 0.6 * hit} roughness={0.4} transparent opacity={0.8} />
            </mesh>
          </group>
        );
      })}
      {inFlight.map((d) => {
        const i = pages.findIndex((p) => p.id === d.page);
        if (i < 0) return null;
        const t = interpolate(frame, [d.spawn, d.land], [0, 1], clamp);
        return (
          <mesh key={d.k} position={[xOf(i), PH + 1.6 - settle(t) * 1.5, z]} rotation={[0, settle(t) * 0.8, 0]}>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
            <meshStandardMaterial color={FG} emissive={color} emissiveIntensity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
};

const Index3: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = useCue("id", 40);
  const a = interpolate(frame, [0, 200], [0.2, -0.04], clamp);
  const pos: [number, number, number] = [Math.sin(a) * 15, 10.5, Math.cos(a) * 15];
  return (
    <>
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 38 }}>
        <Cam pos={pos} look={[0, 0.6, 0.4]} />
        <Lights />
        <Floor />
        {ROWS3.map((r) => (
          <PageRow3 key={r.key} k={r.key} z={r.z} start={Math.max(4, id - FALL)} />
        ))}
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 200, left: 70 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 72, color: FG }}>Index pages</div>
        <div style={{ marginTop: 18, width: 140, height: 8, borderRadius: 4, background: GOLD }} />
      </div>
      {ROWS3.map((r) => (
        <div key={r.key} style={{ position: "absolute", left: 70, top: r.top, display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: r.key === "v7" ? GREEN : RED, textShadow: "0 4px 18px #000" }}>{r.label}</span>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT, textShadow: "0 4px 18px #000" }}>{r.rule}</span>
        </div>
      ))}
    </>
  );
};

export const SCENES_B: Record<string, React.FC> = { race: Race3, index: Index3 };

// Long video scene 8, the hero scene: where the next insert lands. A B-tree of leaf pages in 3D. A time-ordered key always
// lands on the last page (green, inside a glass MEMORY cover). A random key lands anywhere (red); once the index outgrows
// memory the pages outside the glass sink to DISK and an insert waits for its page; full pages split into half-empty pages.
// The numbers in the last part (389 MB / 70% and 301 MB / 90%) come from the lab log via g2-run1.json.
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import run from "./g2-run1.json";
import { Cam, FOV, Grid, LH, LW, Lights, Sfx, clamp01, ease, mulberry32, sec, settle, toScreen, type V3 } from "./g2-3d";
import { BG, FG, GOLD, GREEN, GRAY, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const V = run.variants as unknown as Record<string, { pkey_mb: number; leaf_density: number }>;

const PITCH = 1.2;
const PW = 0.98;
const PH = 1.1;
const PD = 0.7;
const CAP = 8; // pages the glass MEMORY cover holds
const HALF = (CAP * PITCH) / 2;
const SINK = -1.9;
const FALL = 22;
const EVERY = 15;

// Scene timeline (seconds, from the take's word starts).
const T = {
  tree: 0.4,
  oldest: 4.1,
  newest: 5.62,
  insert: 7.18,
  v7: 10.82,
  memory: 17.0,
  v4: 18.4,
  memSmall: 23.3,
  outgrows: 27.28,
  disk: 30.12,
  split: 31.82,
  halfEmpty: 33.58,
  index: 35.76,
  v4pages: 38.32,
  v7pages: 41.12,
  bigger: 45.92,
  end: 49.52,
};

// ---- the forward simulation of the pages ------------------------------------------------------------------------

type Pg = { id: number; fill: number; hit: number; split: number; born: number; x: number; y: number; wait: number };
type Drop = { id: number; page: number; spawn: number; arrive: number; land: number; wait: boolean };
type Snap = { pages: Pg[]; drops: Drop[] };

const targetX = (i: number, n: number) => (i - (n - 1) / 2) * PITCH;

// Replays the inserts from `start` to `end` (scene frames) and keeps a snapshot per frame. v7: every key goes to the last
// page, a page closes at 90% and a new one opens on the right. v4: a random page; a page that overflows splits in two
// half-full pages. With `memory`, pages outside the glass sink to DISK and a key aimed at one waits for it.
function simulate(mode: "v7" | "v4", start: number, end: number, memoryFrom: number): Snap[] {
  const rand = mulberry32(mode === "v4" ? 7 : 3);
  let nextId = 6;
  let pages: Pg[] =
    mode === "v7"
      ? Array.from({ length: 6 }, (_, i) => ({ id: i, fill: i < 5 ? 0.9 : 0.3, hit: -99, split: -99, born: -99, x: targetX(i, 6), y: 0, wait: 0 }))
      : Array.from({ length: 6 }, (_, i) => ({ id: i, fill: 0.5 + 0.35 * rand(), hit: -99, split: -99, born: -99, x: targetX(i, 6), y: 0, wait: 0 }));
  const drops: Drop[] = [];
  const snaps: Snap[] = [];
  let k = 0;
  for (let f = start; f <= end; f++) {
    // landings
    for (const d of drops) {
      if (d.land !== f) continue;
      const i = mode === "v7" ? pages.length - 1 : pages.findIndex((p) => p.id === d.page);
      if (i < 0) continue;
      const p = pages[i];
      p.fill += mode === "v7" ? 0.3 : 0.2;
      p.hit = f;
      if (mode === "v7" && p.fill >= 0.9 - 1e-9) {
        p.fill = 0.9;
        pages.push({ id: nextId++, fill: 0, hit: -99, split: -99, born: f, x: targetX(pages.length, pages.length + 1) + PITCH * 0.5, y: 0, wait: 0 });
      }
      if (mode === "v4" && p.fill > 1) {
        const half = p.fill / 2;
        p.fill = half;
        p.split = f;
        pages.splice(i + 1, 0, { id: nextId++, fill: half, hit: f, split: f, born: f, x: p.x, y: 0, wait: 0 });
      }
    }
    // spawn
    if ((f - start) % EVERY === 0 && f < end - FALL) {
      const n = pages.length;
      const idx = mode === "v7" ? n - 1 : Math.floor(rand() * n);
      const tx = targetX(idx, n);
      const onDisk = memoryFrom >= 0 && f >= memoryFrom && Math.abs(tx) > HALF;
      const arrive = f + FALL;
      drops.push({ id: k++, page: pages[idx].id, spawn: f, arrive, land: arrive + (onDisk ? 38 : 0), wait: onDisk });
    }
    // layout: smooth each page toward its slot, sunk or lifted
    const n = pages.length;
    pages.forEach((p, i) => {
      const tx = targetX(i, n);
      const pending = drops.some((d) => d.wait && d.page === p.id && f >= d.arrive - 6 && f <= d.land + 14);
      const sunk = memoryFrom >= 0 && f >= memoryFrom && Math.abs(tx) > HALF && !pending;
      p.x += (tx - p.x) * 0.2;
      p.y += ((sunk ? SINK : 0) - p.y) * 0.14;
    });
    snaps.push({ pages: pages.map((p) => ({ ...p })), drops: drops.filter((d) => d.land >= f - 4 && d.spawn <= f).map((d) => ({ ...d })) });
  }
  return snaps;
}

const SNAP7 = simulate("v7", sec(T.v7), sec(T.v4) + 8, -1);
const SNAP4 = simulate("v4", sec(T.v4), sec(T.index) + 20, sec(T.outgrows));
const snapAt = (arr: Snap[], start: number, f: number) => arr[Math.min(arr.length - 1, Math.max(0, f - start))];

// ---- 3D pieces ---------------------------------------------------------------------------------------------------

const PageBox: React.FC<{ x: number; y?: number; z?: number; fill: number; color: string; glow?: number; op?: number; red?: number; sunk?: boolean }> = ({ x, y = 0, z = 0, fill, color, glow = 0, op = 1, red = 0, sunk = false }) => (
  <group position={[x, y, z]} scale={[op > 0.001 ? 1 : 0.001, op > 0.001 ? 1 : 0.001, op > 0.001 ? 1 : 0.001]}>
    <mesh position={[0, PH / 2, 0]}>
      <boxGeometry args={[PW, PH, PD]} />
      <meshStandardMaterial color={red > 0 ? RED : sunk ? "#555b64" : "#9aa1ab"} emissive={red > 0 ? RED : color} emissiveIntensity={Math.max(0.6 * glow, 0.5 * red)} transparent opacity={(0.16 + 0.3 * red + (sunk ? 0.1 : 0)) * op} roughness={0.1} metalness={0.2} />
    </mesh>
    <mesh position={[0, (PH * Math.min(1, fill)) / 2, 0]}>
      <boxGeometry args={[PW * 0.84, Math.max(0.01, PH * Math.min(1, fill)), PD * 0.74]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={(sunk ? 0.05 : 0.2) + 0.6 * glow} roughness={0.4} transparent opacity={0.85 * op} />
    </mesh>
  </group>
);

const Link: React.FC<{ a: V3; b: V3; op: number }> = ({ a, b, op }) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx)]}>
      <boxGeometry args={[len, 0.05, 0.05]} />
      <meshStandardMaterial color={LIGHT} transparent opacity={0.7 * op} />
    </mesh>
  );
};

const Key3: React.FC<{ pos: V3; color: string; ring?: number }> = ({ pos, color, ring = 0 }) => (
  <group position={pos}>
    <mesh rotation={[0.3, 0.7, 0]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color={FG} emissive={color} emissiveIntensity={0.8} />
    </mesh>
    {ring > 0 ? (
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1 + 0.25 * Math.sin(ring * 0.5), 1 + 0.25 * Math.sin(ring * 0.5), 1]}>
        <torusGeometry args={[0.38, 0.035, 8, 40]} />
        <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={1.2} />
      </mesh>
    ) : null}
  </group>
);

// ---- the scene ---------------------------------------------------------------------------------------------------

type Frame = { pos: V3; look: V3 };

export const Btree: React.FC = () => {
  const frame = useCurrentFrame();
  const f = (s: number) => sec(s);
  const inA = frame < f(T.v7);
  const inB = frame >= f(T.v7) && frame < f(T.v4);
  const inC = frame >= f(T.v4) && frame < f(T.index);
  const inD = frame >= f(T.index);

  // phase opacities (cross-fades of 0.5 s)
  const opTree = interpolate(frame, [f(T.v7) - 12, f(T.v7) + 6], [1, 0], clamp);
  const opV7 = interpolate(frame, [f(T.v7) - 12, f(T.v7) + 6, f(T.v4) - 6, f(T.v4) + 8], [0, 1, 1, 0], clamp);
  const opV4 = interpolate(frame, [f(T.v4) - 6, f(T.v4) + 8, f(T.index) - 6, f(T.index) + 8], [0, 1, 1, 0], clamp);
  const opD = interpolate(frame, [f(T.index) - 4, f(T.index) + 12], [0, 1], clamp);

  const s7 = snapAt(SNAP7, f(T.v7), frame);
  const s4 = snapAt(SNAP4, f(T.v4), frame);

  // ---- camera per phase
  let cam: Frame;
  const lastX7 = s7.pages[s7.pages.length - 1].x;
  if (inA) {
    const t = clamp01(frame / f(T.v7));
    cam = { pos: [-0.6 + 1.2 * t, 5.6, 12.6 - 0.8 * t], look: [0, 2.2, 0] };
  } else if (inB) {
    const t = ease(clamp01((frame - f(T.v7)) / 40));
    cam = { pos: [1.2 + (lastX7 - 2.0 - 1.2) * t, 4.8, 12.0], look: [(lastX7 - 2.0) * t, 1.0, 0] };
  } else if (inC) {
    const n = s4.pages.length;
    const w = Math.max(9, n * PITCH + 2.5);
    cam = { pos: [0, 6.2, Math.max(13, w * 1.05)], look: [0, 0.6, 0] };
  } else {
    cam = { pos: [0, 9.2, 20], look: [3.6, 0.3, 0] };
  }
  const { pos, look } = cam;
  const label = (w: V3) => toScreen(pos, look, w);

  // memory glass opacity
  const memV7 = clamp01((frame - f(T.memory)) / 14) * opV7;
  const memV4 = clamp01((frame - f(T.memSmall)) / 14) * opV4;
  const diskOp = clamp01((frame - f(T.outgrows)) / 20) * opV4;

  // tree geometry (phase A): 6 leaves, 2 branches, 1 root
  const leafX = (i: number) => targetX(i, 6);
  const branchX = [(leafX(0) + leafX(2)) / 2, (leafX(3) + leafX(5)) / 2];
  const root: V3 = [0, 3.7, 0];
  const branchP: V3[] = [[branchX[0], 2.3, 0], [branchX[1], 2.3, 0]];

  // the key that walks root -> branch -> leaf (7.4 to 9.9 s)
  const kt = clamp01((frame - f(T.insert + 0.3)) / f(2.6));
  const keyPath: V3[] = [[0, 4.6, 0], root, branchP[1], [leafX(3), PH + 0.15, 0]];
  const seg = Math.min(2, Math.floor(kt * 3));
  const sp = kt * 3 - seg;
  const keyPos: V3 = kt >= 1 ? keyPath[3] : (keyPath[seg].map((v, i) => v + (keyPath[seg + 1][i] - v) * ease(clamp01(sp))) as V3);
  const keyLanded = kt >= 1;

  // v4 drops: a key aimed at a page on disk hovers with a ring, the page rises, then it lands
  const dropPos = (s: Snap, d: Drop): { pos: V3; ring: number } | null => {
    const pg = s.pages.find((p) => p.id === d.page);
    if (!pg) return null;
    const t = clamp01((frame - d.spawn) / FALL);
    if (!d.wait) return { pos: [pg.x, PH + 1.9 - settle(t) * 1.75, 0], ring: 0 };
    if (frame < d.arrive) return { pos: [pg.x, PH + 1.9 - settle(t) * 1.0, 0], ring: 0 };
    if (frame < d.land - 8) return { pos: [pg.x, PH + 0.9, 0], ring: frame - d.arrive };
    const t2 = clamp01((frame - (d.land - 8)) / 8);
    return { pos: [pg.x, PH + 0.9 - t2 * 0.75, 0], ring: 0 };
  };

  const waiting = s4.drops.find((d) => d.wait && frame >= d.arrive && frame < d.land);

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("audio/long-03-s08-en.wav")} />
      <ThreeCanvas width={LW} height={LH} style={{ position: "absolute", inset: 0 }} camera={{ fov: FOV }}>
        <Cam pos={pos} look={look} />
        <Lights />
        <Grid />

        {/* A: the tree */}
        {frame < f(T.v7) + 10 ? (
          <group>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <PageBox key={i} x={leafX(i)} fill={i < 5 ? 0.9 : 0.3} color={LIGHT} glow={i === 3 && keyLanded ? interpolate(frame - f(T.insert + 2.9), [0, 4, 16], [0, 1, 0], clamp) : 0} op={opTree} />
            ))}
            {[[0, 0], [0, 1], [0, 2], [1, 3], [1, 4], [1, 5]].map(([b, l]) => (
              <Link key={l} a={[branchX[b], 2.3, 0]} b={[leafX(l), PH, 0]} op={clamp01((frame - f(T.tree)) / 14) * opTree} />
            ))}
            <Link a={root} b={branchP[0]} op={clamp01((frame - f(T.tree)) / 14) * opTree} />
            <Link a={root} b={branchP[1]} op={clamp01((frame - f(T.tree)) / 14) * opTree} />
            {[root, ...branchP].map((p, i) => (
              <mesh key={i} position={p}>
                <boxGeometry args={[1.5, 0.5, 0.6]} />
                <meshStandardMaterial color="#2a2e34" emissive={LIGHT} emissiveIntensity={0.15} transparent opacity={clamp01((frame - f(T.tree)) / 14) * opTree} />
              </mesh>
            ))}
            {frame >= f(T.insert + 0.3) && !keyLanded ? <Key3 pos={keyPos} color={LIGHT} /> : null}
          </group>
        ) : null}

        {/* B: v7, keys land on the last page */}
        {opV7 > 0.01 ? (
          <group>
            {s7.pages.map((p) => {
              const grow = p.born > 0 ? clamp01((frame - p.born) / 8) : 1;
              const hit = clamp01(1 - (frame - p.hit) / 14);
              return <PageBox key={p.id} x={p.x} fill={p.fill} color={GREEN} glow={hit} op={opV7 * (grow > 0 ? 1 : 0)} />;
            })}
            {s7.drops.map((d) => {
              const p = s7.pages[s7.pages.length - 1];
              const t = clamp01((frame - d.spawn) / FALL);
              if (frame >= d.land) return null;
              return <Key3 key={d.id} pos={[p.x, PH + 1.9 - settle(t) * 1.75, 0]} color={GREEN} />;
            })}
            {memV7 > 0.01 ? (
              <mesh position={[(s7.pages[s7.pages.length - 1].x + s7.pages[Math.max(0, s7.pages.length - 4)].x) / 2, PH / 2 + 0.2, 0]}>
                <boxGeometry args={[PITCH * 4 + 0.2, PH + 1.5, 1.4]} />
                <meshStandardMaterial color="#8fb4ff" emissive="#8fb4ff" emissiveIntensity={0.25} transparent opacity={0.1 * memV7} />
              </mesh>
            ) : null}
          </group>
        ) : null}

        {/* C: v4, random pages, splits, sinking to DISK */}
        {opV4 > 0.01 ? (
          <group>
            {s4.pages.map((p) => {
              const hit = clamp01(1 - (frame - p.hit) / 14);
              const spl = clamp01(1 - (frame - p.split) / 26);
              const grow = p.born > 0 ? clamp01((frame - p.born) / 8) : 1;
              const sunk = p.y < -0.5;
              return <PageBox key={p.id} x={p.x} y={p.y} fill={p.fill} color={RED} glow={hit} red={spl} sunk={sunk} op={opV4 * (grow > 0 ? 1 : 0)} />;
            })}
            {s4.drops.map((d) => {
              if (frame >= d.land) return null;
              const dp = dropPos(s4, d);
              return dp ? <Key3 key={d.id} pos={dp.pos} color={RED} ring={dp.ring} /> : null;
            })}
            {memV4 > 0.01 ? (
              <mesh position={[0, PH / 2 + 0.2, 0]}>
                <boxGeometry args={[HALF * 2 + 0.2, PH + 1.5, 1.4]} />
                <meshStandardMaterial color="#8fb4ff" emissive="#8fb4ff" emissiveIntensity={0.25} transparent opacity={0.1 * memV4} />
              </mesh>
            ) : null}
            {diskOp > 0.01 ? (
              <mesh position={[0, SINK - 0.2, 0]}>
                <boxGeometry args={[Math.max(HALF * 2 + 4.5, s4.pages.length * PITCH + 1.5), 0.3, 1.5]} />
                <meshStandardMaterial color="#30343b" emissive={RED} emissiveIntensity={0.1} transparent opacity={diskOp} roughness={0.8} />
              </mesh>
            ) : null}
          </group>
        ) : null}

        {/* D: the two indexes side by side */}
        {opD > 0.01 ? <IndexRows frame={frame} f={f} op={opD} /> : null}
      </ThreeCanvas>

      {/* title */}
      <div style={{ position: "absolute", top: 80, left: 110 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: FG }}>{inD ? "Index size" : "Where the next key lands"}</div>
        <div style={{ marginTop: 14, width: 180, height: 10, borderRadius: 5, background: GOLD }} />
      </div>

      {/* labels that follow the 3D objects */}
      {inA && frame >= f(T.oldest) ? <Tag at={label([leafX(0), PH + 0.7, 0])} text="oldest" color={MUTED} frame={frame} t0={f(T.oldest)} /> : null}
      {inA && frame >= f(T.newest) ? <Tag at={label([leafX(5), PH + 0.7, 0])} text="newest" color={LIGHT} frame={frame} t0={f(T.newest)} /> : null}
      {inB && memV7 > 0.05 ? <Tag at={label([s7.pages[s7.pages.length - 1].x - PITCH * 1.5, PH + 1.9, 0])} text="MEMORY" color="#8fb4ff" frame={frame} t0={f(T.memory)} /> : null}
      {inC && memV4 > 0.05 ? <Tag at={label([-HALF + 0.9, PH + 1.9, 0])} text="MEMORY" color="#8fb4ff" frame={frame} t0={f(T.memSmall)} /> : null}
      {inC && diskOp > 0.05 ? <Tag at={label([-HALF - 1.7, SINK - 0.45, 0])} text="DISK" color={RED} frame={frame} t0={f(T.outgrows)} /> : null}
      {inC && waiting ? (() => {
        const dp = dropPos(s4, waiting);
        return dp ? <Tag at={label([dp.pos[0], dp.pos[1] + 1.1, 0])} text="waiting for disk" color={RED} frame={frame} t0={waiting.arrive} /> : null;
      })() : null}

      {/* the numbers, in the right column */}
      {inD ? <IndexNumbers frame={frame} f={f} /> : null}

      <Sfx name="whoosh" from={f(T.v7)} volume={0.25} />
      <Sfx name="buzz" from={f(T.disk)} volume={0.12} />
      <Sfx name="stamp" from={f(T.bigger)} volume={0.4} />
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ at: { x: number; y: number }; text: string; color: string; frame: number; t0: number }> = ({ at, text, color, frame, t0 }) => (
  <div style={{ position: "absolute", left: at.x, top: at.y, transform: "translate(-50%, -50%)", opacity: clamp01((frame - t0) / 10), fontFamily: SANS, fontWeight: 800, fontSize: 52, letterSpacing: 3, color, textShadow: "0 4px 18px #000", whiteSpace: "nowrap" }}>{text}</div>
);

// ---- part D: two rows of pages, 13 against 10, filled 70% and 90% -------------------------------------------------

const N4 = Math.round((V.v4.pkey_mb / V.v7.pkey_mb) * 10); // 389/301 = 1.29 -> 13 pages against 10
const N7 = 10;
const ROWW = (n: number) => (n - 1) * PITCH;

const IndexRows: React.FC<{ frame: number; f: (s: number) => number; op: number }> = ({ frame, f, op }) => {
  const x0 = -ROWW(N4) / 2;
  const fill4 = V.v4.leaf_density / 100;
  const fill7 = V.v7.leaf_density / 100;
  const pulse = interpolate(frame - f(T.bigger), [0, 6, 40], [0, 1, 0.3], clamp);
  return (
    <group>
      {Array.from({ length: N4 }, (_, i) => {
        const t = clamp01((frame - f(T.v4pages) - i * 2) / 10);
        const extra = i >= N7;
        return <PageBox key={`a${i}`} x={x0 + i * PITCH} z={-2.2} fill={fill4} color={RED} red={extra ? pulse * 0.6 : 0} glow={extra ? pulse : 0} op={op * t} />;
      })}
      {Array.from({ length: N7 }, (_, i) => {
        const t = clamp01((frame - f(T.v7pages) - i * 2) / 10);
        return <PageBox key={`b${i}`} x={x0 + i * PITCH} z={2.2} fill={fill7} color={GREEN} op={op * t} />;
      })}
    </group>
  );
};

const IndexNumbers: React.FC<{ frame: number; f: (s: number) => number }> = ({ frame, f }) => {
  const c = (s: number) => clamp01((frame - f(s)) / 14);
  const big = clamp01((frame - f(T.bigger)) / 12);
  return (
    <div style={{ position: "absolute", left: 1900, top: 380, width: 560 }}>
      <div style={{ opacity: c(T.v4pages) }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 70, color: RED }}>UUIDv4</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 92, color: RED, lineHeight: 1.1 }}>{V.v4.pkey_mb} MB</div>
        <div style={{ fontFamily: MONO, fontSize: 52, color: LIGHT }}>pages {Math.round(V.v4.leaf_density)}% full</div>
      </div>
      <div style={{ marginTop: 110, opacity: c(T.v7pages) }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 70, color: GREEN }}>UUIDv7</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 92, color: GREEN, lineHeight: 1.1 }}>{V.v7.pkey_mb} MB</div>
        <div style={{ fontFamily: MONO, fontSize: 52, color: LIGHT }}>pages {Math.round(V.v7.leaf_density)}% full</div>
      </div>
      <div style={{ marginTop: 90, opacity: big, transform: `scale(${0.6 + 0.4 * big})`, transformOrigin: "left center", fontFamily: MONO, fontWeight: 800, fontSize: 130, color: RED }}>
        +{Math.round((V.v4.pkey_mb / V.v7.pkey_mb - 1) * 100)}%
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED }}>same 16 bytes per key</div>
      </div>
    </div>
  );
};

void GRAY;

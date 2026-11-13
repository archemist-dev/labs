// Long video scene 9: the write-ahead log as a tape in 3D. After a checkpoint the first change to a page writes the whole
// 8 KB page onto the tape (a block); later changes write thin records. Ordered keys touch the same few pages (v7: 49 full
// pages); random keys touch thousands of old ones (v4: 45,128). The counts come from the lab log via g2-run1.json.
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import run from "./g2-run1.json";
import { Cam, FOV, Grid, LH, LW, Lights, Sfx, clamp01, ease, sec, settle, toScreen, type V3 } from "./g2-3d";
import { BG, FG, GOLD, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FPI = (run.variants as unknown as Record<string, { fpi: number }>);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

const T = { checkpoint: 2.4, whole: 4.54, first: 7.56, edit: 7.1, lanes: 9.04, v7: 14.62, v4: 17.36, random: 11.8, end: 19.7 };
const SPEED = 2.6; // tape speed, world units per second
const TAPE_X0 = 4.2; // where items appear on the tape
const TAPE_X1 = -9;

const Tape: React.FC<{ z: number; color: string; op: number }> = ({ z, color, op }) => (
  <mesh position={[(TAPE_X0 + TAPE_X1) / 2, -0.05, z]}>
    <boxGeometry args={[TAPE_X0 - TAPE_X1 + 1, 0.1, 1.3]} />
    <meshStandardMaterial color="#2a2e34" emissive={color} emissiveIntensity={0.05} transparent opacity={op} roughness={0.7} />
  </mesh>
);

// An item riding the tape from its spawn time: x falls with time. big = a whole 8 KB page, small = a thin record.
const Item: React.FC<{ spawn: number; frame: number; z: number; big: boolean; color: string; op: number; fromY?: number; x0?: number }> = ({ spawn, frame, z, big, color, op, fromY = 0, x0 = TAPE_X0 }) => {
  const t = (frame - sec(spawn)) / 30;
  if (t < 0) return null;
  const x = x0 - SPEED * t;
  if (x < TAPE_X1) return null;
  const drop = fromY > 0 ? settle(t / 0.5) : 1;
  const y = (big ? 0.5 : 0.2) + fromY * (1 - drop);
  const grow = clamp01(t / 0.25);
  return (
    <mesh position={[x, y, z]} scale={[grow, grow, grow]}>
      <boxGeometry args={big ? [0.95, 0.9, 0.9] : [0.14, 0.3, 0.7]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={big ? 0.35 : 0.2} transparent opacity={op} roughness={0.4} />
    </mesh>
  );
};

const Page: React.FC<{ x: number; y: number; z: number; color: string; glow: number; op: number; s?: number }> = ({ x, y, z, color, glow, op, s = 1 }) => (
  <group position={[x, y, z]} scale={[s, s, s]}>
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[0.95, 1.0, 0.7]} />
      <meshStandardMaterial color="#9aa1ab" emissive={color} emissiveIntensity={0.7 * glow} transparent opacity={(0.2 + 0.25 * glow) * op} roughness={0.1} metalness={0.2} />
    </mesh>
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[0.8, 0.8, 0.52]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2 + 0.6 * glow} transparent opacity={0.8 * op} />
    </mesh>
  </group>
);

export const Wal: React.FC = () => {
  const frame = useCurrentFrame();
  const f = (s: number) => sec(s);
  const sec1 = interpolate(frame, [f(T.lanes) - 8, f(T.lanes) + 8], [1, 0], clamp);
  const sec2 = interpolate(frame, [f(T.lanes) - 8, f(T.lanes) + 8], [0, 1], clamp);
  const fadeIn = interpolate(frame, [0, 10], [0, 1], clamp);

  const camT = ease(clamp01((frame - f(T.lanes) + 10) / 40));
  const pos: V3 = [0 + 1.4 * camT, 5.4 + 3 * camT, 12.5 + 2.8 * camT];
  const look: V3 = [2.0 + 1.6 * camT, 0.9 - 0.3 * camT, 0];
  const label = (w: V3) => toScreen(pos, look, w);

  // section 1: one tape, a page above it
  const gate = interpolate(frame, [f(T.checkpoint), f(T.checkpoint) + 8, f(T.checkpoint + 2), f(T.checkpoint + 2.6)], [0, 1, 1, 0.15], clamp);
  const editGlow = interpolate(frame - f(T.edit), [0, 4, 20], [0, 1, 0], clamp);
  const writeGlow = Math.max(interpolate(frame - f(T.whole), [0, 4, 20], [0, 1, 0], clamp), interpolate(frame - f(T.first), [0, 4, 20], [0, 1, 0], clamp));
  const slipsA = Array.from({ length: 14 }, (_, i) => 1.0 + i * 0.55).filter((s) => s < T.lanes + 0.2);

  // section 2: v7 lane (front) and v4 lane (back)
  const zV7 = 3.0;
  const zV4 = -3.0;
  const v7Pages = [-1.5, 0, 1.5].map((x, i) => ({ x: x + 0.5, i }));
  const gridCols = 12;
  const gridRows = 4;
  const v4Cells = Array.from({ length: gridCols * gridRows }, (_, k) => ({ x: (k % gridCols) * 1.0 - 4.8, z: -6.4 - Math.floor(k / gridCols) * 1.2, k }));
  const v4Blocks = Array.from({ length: 30 }, (_, i) => T.random + i * 0.46);
  const v7Blocks = [10.2, 12.9, 15.8, 18.4];
  const v7Slips = Array.from({ length: 24 }, (_, i) => T.lanes + 0.4 + i * 0.42);
  const v4Slips = Array.from({ length: 22 }, (_, i) => T.lanes + 0.4 + i * 0.42).filter((s) => s < T.random);

  const c7 = clamp01((frame - f(T.v7)) / f(1.6));
  const c4 = clamp01((frame - f(T.v4)) / f(2.0));
  const n7 = Math.round(FPI.v7.fpi * ease(c7));
  const n4 = Math.round(FPI.v4.fpi * ease(c4));

  return (
    <AbsoluteFill style={{ background: BG, opacity: fadeIn }}>
      <Audio src={staticFile("audio/long-03-s09-en.wav")} />
      <ThreeCanvas width={LW} height={LH} style={{ position: "absolute", inset: 0 }} camera={{ fov: FOV }}>
        <Cam pos={pos} look={look} />
        <Lights />
        <Grid />

        {/* section 1: a page above a tape; the checkpoint gate; whole-page blocks and thin records */}
        {sec1 > 0.01 ? (
          <group>
            <Tape z={0} color={LIGHT} op={sec1} />
            <Page x={0.6} y={2.6} z={0} color={LIGHT} glow={Math.max(editGlow, writeGlow)} op={sec1} />
            {editGlow > 0.01 ? (
              <mesh position={[0.6 + 0.25, 3.35, 0.4]}>
                <boxGeometry args={[0.18, 0.18, 0.18]} />
                <meshStandardMaterial color={FG} emissive={FG} emissiveIntensity={1.2} transparent opacity={editGlow} />
              </mesh>
            ) : null}
            <mesh position={[1.9, 1.1, 0]}>
              <boxGeometry args={[0.07, 2.4, 2.0]} />
              <meshStandardMaterial color="#8fb4ff" emissive="#8fb4ff" emissiveIntensity={0.6} transparent opacity={0.35 * gate * sec1} />
            </mesh>
            {slipsA.map((s, i) => (
              <Item key={i} spawn={s} frame={frame} z={0} big={false} color={LIGHT} op={sec1} />
            ))}
            <Item spawn={T.whole} frame={frame} z={0} big color={LIGHT} op={sec1} fromY={2.4} x0={0.6} />
            <Item spawn={T.first} frame={frame} z={0} big color={LIGHT} op={sec1} fromY={2.4} x0={0.6} />
          </group>
        ) : null}

        {/* section 2: ordered keys (green, a few pages) against random keys (red, a field of old pages) */}
        {sec2 > 0.01 ? (
          <group>
            <Tape z={zV7} color={GREEN} op={sec2} />
            <Tape z={zV4} color={RED} op={sec2} />
            {v7Pages.map((p) => (
              <Page key={p.i} x={p.x} y={1.7} z={zV7} color={GREEN} glow={clamp01(1 - ((frame - f(T.lanes) - 12 * p.i) % 30) / 24)} op={sec2 * clamp01((frame - f(T.lanes)) / 12)} s={0.85} />
            ))}
            {v4Cells.map((c) => {
              const t0 = f(T.random) + c.k * 4;
              const lit = frame >= t0 ? clamp01(1 - (frame - t0) / 30) : 0;
              const shown = clamp01((frame - f(T.random) + 6) / 14);
              return (
                <group key={c.k} position={[c.x, 0, c.z]} scale={[shown + 0.001, shown + 0.001, shown + 0.001]}>
                  <mesh position={[0, 0.3, 0]}>
                    <boxGeometry args={[0.7, 0.6, 0.6]} />
                    <meshStandardMaterial color="#9aa1ab" emissive={RED} emissiveIntensity={0.9 * lit + (frame >= t0 ? 0.15 : 0)} transparent opacity={(0.25 + 0.55 * lit + (frame >= t0 ? 0.15 : 0)) * sec2} roughness={0.2} />
                  </mesh>
                </group>
              );
            })}
            {v7Slips.map((s, i) => (
              <Item key={`a${i}`} spawn={s} frame={frame} z={zV7} big={false} color={GREEN} op={sec2} />
            ))}
            {v4Slips.map((s, i) => (
              <Item key={`b${i}`} spawn={s} frame={frame} z={zV4} big={false} color={LIGHT} op={sec2} />
            ))}
            {v7Blocks.map((s, i) => (
              <Item key={`c${i}`} spawn={s} frame={frame} z={zV7} big color={GREEN} op={sec2} />
            ))}
            {v4Blocks.map((s, i) => (
              <Item key={`d${i}`} spawn={s} frame={frame} z={zV4} big color={RED} op={sec2} />
            ))}
          </group>
        ) : null}
      </ThreeCanvas>

      {/* title */}
      <div style={{ position: "absolute", top: 80, left: 110 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: FG }}>The write-ahead log</div>
        <div style={{ marginTop: 14, width: 180, height: 10, borderRadius: 5, background: GOLD }} />
      </div>

      {/* labels */}
      {sec1 > 0.2 && frame >= f(T.whole) - 20 ? (() => {
        const p = label([0.6, 4.0, 0]);
        return <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", opacity: sec1 * clamp01((frame - f(T.whole) + 20) / 10), fontFamily: MONO, fontWeight: 800, fontSize: 50, color: FG, textShadow: "0 4px 18px #000" }}>8 KB page</div>;
      })() : null}
      {sec1 > 0.2 && gate > 0.2 ? (() => {
        const p = label([1.9, 2.8, 0]);
        return <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", opacity: gate * sec1, fontFamily: SANS, fontWeight: 800, fontSize: 48, letterSpacing: 4, color: "#8fb4ff", textShadow: "0 4px 18px #000" }}>CHECKPOINT</div>;
      })() : null}
      {sec1 > 0.2 && frame >= f(T.first) - 10 ? (() => {
        const p = label([-3.4, 1.7, 0]);
        return <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", opacity: sec1 * clamp01((frame - f(T.first) + 10) / 12), fontFamily: SANS, fontWeight: 700, fontSize: 46, color: LIGHT, textShadow: "0 4px 18px #000" }}>whole page on the log</div>;
      })() : null}
      {sec2 > 0.2 ? (
        <>
          <div style={{ position: "absolute", left: 330, top: 1190, opacity: sec2 * clamp01((frame - f(T.lanes)) / 12), fontFamily: SANS, fontWeight: 800, fontSize: 56, color: GREEN, textShadow: "0 4px 18px #000", whiteSpace: "nowrap" }}>UUIDv7: the same few pages</div>
          <div style={{ position: "absolute", left: 340, top: 250, opacity: sec2 * clamp01((frame - f(T.random)) / 12), fontFamily: SANS, fontWeight: 800, fontSize: 56, color: RED, textShadow: "0 4px 18px #000", whiteSpace: "nowrap" }}>UUIDv4: old pages, everywhere</div>
        </>
      ) : null}

      {/* counters, right column */}
      <div style={{ position: "absolute", left: 1960, top: 400, width: 500 }}>
        <div style={{ opacity: clamp01((frame - f(T.v7) + 6) / 12) }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: MUTED }}>full-page writes</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: GREEN, marginTop: 24 }}>UUIDv7</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 120, color: GREEN, lineHeight: 1.05 }}>{fmt(n7)}</div>
        </div>
        <div style={{ marginTop: 80, opacity: clamp01((frame - f(T.v4) + 6) / 12) }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: RED }}>UUIDv4</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 120, color: RED, lineHeight: 1.05 }}>{fmt(n4)}</div>
        </div>
      </div>

      <Sfx name="stamp" from={f(T.whole)} volume={0.3} />
      <Sfx name="stamp" from={f(T.first)} volume={0.3} />
      <Sfx name="whoosh" from={f(T.lanes)} volume={0.25} />
      <Sfx name="stamp" from={f(T.v4) + 50} volume={0.4} />
    </AbsoluteFill>
  );
};

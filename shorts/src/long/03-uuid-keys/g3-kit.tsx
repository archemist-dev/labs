// Shared helpers for the long-form UUIDv7 scenes 10-14 (group G3). Same look as Hook.tsx: calm 3D, charcoal,
// green = win, gray = neutral, red = bad, gold only as the thin line under a title. All times are seconds from the
// start of the scene's voice take (work-long-uuid/timings.json word starts).
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BG, FG, GOLD, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { LH, LW } from "./Hook";

export { BG, FG, GOLD, GREEN, LIGHT, MONO, MUTED, RED, SANS, LH, LW };
export const GRAYC = "#5c6370";
export const S = 30;
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (x: number) => 1 - (1 - x) ** 3;
export const easeIO = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
export const ramp = (t: number, t0: number, d = 0.5) => ease(Math.min(1, Math.max(0, (t - t0) / d)));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const useSec = () => useCurrentFrame() / S;

// One scene: charcoal, its voice take, a short fade-in so the first frame is never white.
export const Scene: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile(`audio/long-03-s${id}-en.wav`)} />
      <AbsoluteFill style={{ opacity: interpolate(frame, [0, 8], [0, 1], clamp) }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Fades and lifts its children in at `at`, optionally out at `until`.
export const Show: React.FC<{ t: number; at: number; until?: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ t, at, until, dy = 24, style, children }) => {
  const a = ramp(t, at, 0.5) * (until !== undefined ? 1 - ramp(t, until, 0.4) : 1);
  if (a <= 0.002) return null;
  return <div style={{ position: "absolute", opacity: a, transform: `translateY(${(1 - a) * dy}px)`, ...style }}>{children}</div>;
};

export const Title: React.FC<{ t: number; text: string; at?: number; until?: number; sub?: string }> = ({ t, text, at = 0, until, sub }) => (
  <Show t={t} at={at} until={until} style={{ left: 120, top: 90 }}>
    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 96, color: FG, lineHeight: 1.05 }}>{text}</div>
    <div style={{ marginTop: 18, width: 180, height: 10, borderRadius: 5, background: GOLD }} />
    {sub ? <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: MUTED }}>{sub}</div> : null}
  </Show>
);

export const Chip: React.FC<{ text: string; color?: string; size?: number; mono?: boolean; border?: boolean }> = ({ text, color = FG, size = 52, mono, border = true }) => (
  <div style={{ display: "inline-block", fontFamily: mono ? MONO : SANS, fontWeight: 700, fontSize: size, color, padding: "10px 28px", borderRadius: 18, border: border ? `4px solid ${color}` : undefined, background: "#23272d", whiteSpace: "nowrap" }}>{text}</div>
);

export const Cam: React.FC<{ pos: [number, number, number]; look: [number, number, number] }> = ({ pos, look }) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
  }, [camera, pos, look]);
  return null;
};

export const Stage: React.FC<{ pos: [number, number, number]; look: [number, number, number]; fov?: number; opacity?: number; children: React.ReactNode }> = ({ pos, look, fov = 36, opacity = 1, children }) => (
  <AbsoluteFill style={{ opacity }}>
    <ThreeCanvas width={LW} height={LH} style={{ position: "absolute", inset: 0 }} camera={{ fov }}>
      <Cam pos={pos} look={look} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 9, 7]} intensity={2.2} />
      <directionalLight position={[-6, 4, -4]} intensity={0.6} color="#8fb4ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={BG} roughness={0.95} />
      </mesh>
      <gridHelper args={[60, 60, "#2c3036", "#24272c"]} />
      {children}
    </ThreeCanvas>
  </AbsoluteFill>
);

export const Sfx: React.FC<{ name: string; at: number; volume?: number }> = ({ name, at, volume = 0.4 }) => (
  <Sequence from={Math.round(at * S)} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

// A big mono number with a small unit, in a color.
export const Num: React.FC<{ v: string; unit?: string; color: string; size?: number }> = ({ v, unit, color, size = 120 }) => (
  <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: size, color, textShadow: "0 6px 24px #000", whiteSpace: "nowrap" }}>
    {v}
    {unit ? <span style={{ fontSize: size * 0.42, color: MUTED, fontWeight: 400 }}> {unit}</span> : null}
  </div>
);

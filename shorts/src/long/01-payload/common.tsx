// Shared helpers for the payload long video (16:9, 2560x1440): word cues from the Whisper transcripts
// (timings.json, built by tools/long_timings.py), the scene frame (audio, fade), a 3D stage, and small UI pieces.
// Same look as the UUIDv7 long video (src/long/03-uuid-keys/g1-common.tsx).
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BG, FG, GOLD, LIGHT, MONO, MUTED, SANS } from "../../theme";
import { Cam } from "../../shorts/03-uuid-keys/ProtoB";
import timings from "./timings.json";

export const LW = 2560;
export const LH = 1440;
export const AMBER = "#e0a64a"; // field names (not brand gold: gold stays under titles only)
export const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Word = { w: string; start: number; end: number };
const T = timings as unknown as Record<string, { audio: string | null; seconds: number; frames: number; words: Word[] }>;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Frame where the nth (1-based) spoken word `w` starts in scene `id`; throws if the take has no such word. */
export const cue = (id: string, w: string, nth = 1, offsetSec = 0) => {
  const hits = T[id].words.filter((x) => norm(x.w) === norm(w));
  if (hits.length < nth) throw new Error(`scene ${id}: word "${w}" #${nth} not in the take`);
  return Math.round((hits[nth - 1].start + offsetSec) * 30);
};
/** Frame where the nth word `w` ends. */
export const cueEnd = (id: string, w: string, nth = 1) => {
  const hits = T[id].words.filter((x) => norm(x.w) === norm(w));
  if (hits.length < nth) throw new Error(`scene ${id}: word "${w}" #${nth} not in the take`);
  return Math.round(hits[nth - 1].end * 30);
};
export const sceneFrames = (id: string) => T[id].frames;

export const Sfx: React.FC<{ name: string; from: number; volume?: number }> = ({ name, from, volume = 0.5 }) => (
  <Sequence from={Math.max(0, from)} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * 0.35} />
  </Sequence>
);

/** The scene frame: charcoal, the take, a short fade in and out so the cut between scenes is a breath. */
export const Scene: React.FC<{ id: string; children: React.ReactNode; noFadeIn?: boolean }> = ({ id, children, noFadeIn }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = interpolate(frame, [0, 6, durationInFrames - 6, durationInFrames], [noFadeIn ? 1 : 0, 1, 1, 0], cl);
  const a = T[id]?.audio;
  return (
    <AbsoluteFill style={{ background: BG }}>
      {a ? <Audio src={staticFile(a)} /> : null}
      <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A 3D stage: still camera (objects move, the camera holds), floor grid, the house lights. */
export const Stage: React.FC<{
  pos: [number, number, number];
  look: [number, number, number];
  fov?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  floor?: boolean;
  children: React.ReactNode;
}> = ({ pos, look, fov = 38, width = LW, height = LH, style, floor = true, children }) => (
  <ThreeCanvas width={width} height={height} style={{ position: "absolute", left: 0, top: 0, ...style }} camera={{ fov }}>
    <Cam pos={pos} look={look} />
    <ambientLight intensity={0.55} />
    <directionalLight position={[4, 9, 7]} intensity={2.2} />
    <directionalLight position={[-6, 4, -4]} intensity={0.6} color="#8fb4ff" />
    {floor ? (
      <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color={BG} roughness={0.95} />
        </mesh>
        <gridHelper args={[80, 80, "#2c3036", "#24272c"]} />
      </>
    ) : null}
    {children}
  </ThreeCanvas>
);

/** A plain box mesh. */
export const Block: React.FC<{
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  glow?: number;
  opacity?: number;
}> = ({ p, s, color, glow = 0.12, opacity = 1 }) => (
  <mesh position={p}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.45} metalness={0.1} transparent={opacity < 1} opacity={opacity} />
  </mesh>
);

/** Fades and rises in at `at` (10 frames), out at `until` (8 frames). Absolutely positioned. */
export const Appear: React.FC<{ at: number; until?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, until, style, children }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [at, at + 10], [0, 1], cl);
  const b = until === undefined ? 1 : interpolate(frame, [until, until + 8], [1, 0], cl);
  return (
    <div style={{ position: "absolute", opacity: a * b, transform: `translateY(${(1 - a) * 24}px)`, ...style }}>{children}</div>
  );
};

/** 0 to 1 between two frames. */
export const useT = (from: number, to: number) => interpolate(useCurrentFrame(), [from, to], [0, 1], cl);
export const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
export const usePop = (at: number, stiffness = 140) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 16, stiffness } });
};

export const Title: React.FC<{ text: string; at?: number; until?: number; style?: React.CSSProperties }> = ({ text, at = 0, until, style }) => {
  const line = useT(at + 4, at + 20);
  return (
    <Appear at={at} until={until} style={{ left: 120, top: 90, ...style }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 96, color: FG, lineHeight: 1.05 }}>{text}</div>
      <div style={{ marginTop: 18, width: 180 * line, height: 10, borderRadius: 5, background: GOLD }} />
    </Appear>
  );
};

export const Tag: React.FC<{ children: React.ReactNode; color?: string; size?: number; mono?: boolean; style?: React.CSSProperties }> = ({ children, color = FG, size = 64, mono, style }) => (
  <div style={{ fontFamily: mono ? MONO : SANS, fontWeight: mono ? 800 : 700, fontSize: size, color, textShadow: "0 4px 18px #000", whiteSpace: "nowrap", ...style }}>{children}</div>
);

export const Card: React.FC<{ color?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ color = LIGHT, style, children }) => (
  <div style={{ background: "#262a30", border: `5px solid ${color}`, borderRadius: 28, padding: "28px 36px", ...style }}>{children}</div>
);

export const Muted: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 44, style }) => (
  <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: size, color: MUTED, ...style }}>{children}</div>
);

/** A stamp that lands calmly (no shake): scale from 1.25 to 1, fade in. */
export const Stamp: React.FC<{ at: number; label: string; color: string; solid?: boolean; size?: number; style?: React.CSSProperties }> = ({ at, label, color, solid, size = 52, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 9], [0, 1], cl);
  if (frame < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        transform: `scale(${1.25 - 0.25 * p}) rotate(-4deg)`,
        opacity: p,
        border: `6px solid ${color}`,
        background: solid ? color : "transparent",
        color: solid ? "#1b1d21" : color,
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: 4,
        padding: "8px 26px",
        borderRadius: 14,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </div>
  );
};

/** A horizontal bar that grows from 0 to `value / max` of `width` px, label left, value right. */
export const HBar: React.FC<{ at: number; label: string; value: number; max: number; width: number; color: string; unit?: string; fmt?: (n: number) => string; height?: number; labelW?: number }> = ({
  at,
  label,
  value,
  max,
  width,
  color,
  unit = "",
  fmt = (n) => n.toLocaleString("en-US"),
  height = 64,
  labelW = 360,
}) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at, at + 18], [0, 1], cl));
  if (frame < at) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", height: height + 26, opacity: Math.min(1, p * 3) }}>
      <div style={{ width: labelW, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: FG }}>{label}</div>
      <div style={{ width: Math.max(6, (value / max) * width * p), height, borderRadius: 10, background: color }} />
      <div style={{ marginLeft: 24, fontFamily: MONO, fontWeight: 800, fontSize: 56, color }}>
        {fmt(value)}
        {unit}
      </div>
    </div>
  );
};

/** Screen position (px) of a world point for a Stage with the same camera: labels stay flat HTML next to 3D objects. */
import { PerspectiveCamera, Vector3 } from "three";
export const proj = (
  pos: [number, number, number],
  look: [number, number, number],
  fov: number,
  pt: [number, number, number],
  width = LW,
  height = LH,
) => {
  const c = new PerspectiveCamera(fov, width / height, 0.1, 1000);
  c.position.set(...pos);
  c.lookAt(...look);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new Vector3(...pt).project(c);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
};

// Shared helpers for the long-form UUIDv7 video, group G1 (scenes 2 to 6): word cues from the Whisper transcripts,
// the scene frame (audio, fade), a 3D stage in the Hook's look, and small appear/fade helpers.
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BG, FG, GOLD, LIGHT, MONO, MUTED, SANS } from "../../theme";
import { Cam } from "../../shorts/03-uuid-keys/ProtoB";
import timings from "./timings.json";

export const LW = 2560;
export const LH = 1440;
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
export const sceneFrames = (id: string) => T[id].frames;

export const Sfx: React.FC<{ name: string; from: number; volume?: number }> = ({ name, from, volume = 0.5 }) => (
  <Sequence from={from} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * 0.35} />
  </Sequence>
);

/** The scene frame: charcoal, the take (if any), a short fade in and out so the cut between scenes is a breath. */
export const Scene: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = interpolate(frame, [0, 6, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], cl);
  return (
    <AbsoluteFill style={{ background: BG }}>
      {T[id].audio ? <Audio src={staticFile(`audio/long-03-s${id}-en.wav`)} /> : null}
      <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A 3D stage in the Hook's look: calm perspective, floor grid, the same lights. */
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
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color={BG} roughness={0.95} />
        </mesh>
        <gridHelper args={[60, 60, "#2c3036", "#24272c"]} />
      </>
    ) : null}
    {children}
  </ThreeCanvas>
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

export const Title: React.FC<{ text: string; at?: number; style?: React.CSSProperties }> = ({ text, at = 0, style }) => {
  const line = useT(at + 4, at + 20);
  return (
    <Appear at={at} style={{ left: 120, top: 90, ...style }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 96, color: FG, lineHeight: 1.05 }}>{text}</div>
      <div style={{ marginTop: 18, width: 180 * line, height: 10, borderRadius: 5, background: GOLD }} />
    </Appear>
  );
};

export const Tag: React.FC<{ children: React.ReactNode; color?: string; size?: number; mono?: boolean; style?: React.CSSProperties }> = ({ children, color = FG, size = 64, mono, style }) => (
  <div style={{ fontFamily: mono ? MONO : SANS, fontWeight: mono ? 800 : 700, fontSize: size, color, textShadow: "0 4px 18px #000", ...style }}>{children}</div>
);

export const Card: React.FC<{ color?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ color = LIGHT, style, children }) => (
  <div style={{ background: "#262a30", border: `5px solid ${color}`, borderRadius: 28, padding: "28px 36px", ...style }}>{children}</div>
);

export const Muted: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 44, style }) => (
  <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: size, color: MUTED, ...style }}>{children}</div>
);

import React, { createContext, useContext } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Track } from "../lib/track";
import { BG, FG } from "../theme";
import { Captions } from "./Captions";

export type ShortProps = {
  id: string;
  lang: string;
  track: Track | null;
  audio: string | null; // path under public/, found by calculateMetadata
  sfx: Record<string, string>; // effect name -> path under public/
};

type Ctx = { cues: Record<string, number>; sfx: Record<string, string> };
const SceneCtx = createContext<Ctx>({ cues: {}, sfx: {} });

// Fallback for an element that only some languages show.
export const NEVER = 1e6;

// Frame (inside the scene) where the {name} marker's word is spoken.
export const useCue = (name: string, fallback = 12) => useContext(SceneCtx).cues[name] ?? fallback;

export const Sfx: React.FC<{ name: string; at: number; volume?: number }> = ({ name, at, volume = 0.6 }) => {
  const src = useContext(SceneCtx).sfx[name];
  if (!src) return null;
  return (
    <Sequence from={at} layout="none">
      <Audio src={staticFile(src)} volume={volume} />
    </Sequence>
  );
};

// Slow push-in for the whole scene, quick fade and rise on entry, fade on exit.
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, 6, durationInFrames - 5, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = interpolate(frame, [0, 8], [40, 0], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.05]);
  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${rise}px) scale(${scale})`, transformOrigin: "50% 45%" }}>
      {children}
    </AbsoluteFill>
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: (frame / durationInFrames) * width, background: FG, opacity: 0.35 }} />
  );
};

export const Shell: React.FC<ShortProps & { scenes: Record<string, React.FC> }> = ({ track, audio, sfx, scenes }) => {
  const { fps } = useVideoConfig();
  if (!track) return null;
  // Consecutive beats with the same scene play as one scene, so its elements stay on screen.
  const groups: { scene: string; start: number; end: number; cues: Record<string, number> }[] = [];
  for (const b of track.beats) {
    const last = groups[groups.length - 1];
    if (last && last.scene === b.scene) {
      last.end = b.end;
      Object.assign(last.cues, b.cues);
    } else groups.push({ scene: b.scene, start: b.start, end: b.end, cues: { ...b.cues } });
  }
  const f = (s: number) => Math.round(s * fps);
  return (
    <AbsoluteFill style={{ background: BG }}>
      {groups.map((g, i) => {
        const Scene = scenes[g.scene];
        const cues = Object.fromEntries(Object.entries(g.cues).map(([k, t]) => [k, f(t) - f(g.start)]));
        return (
          <Sequence key={i} from={f(g.start)} durationInFrames={Math.max(1, f(g.end) - f(g.start))} name={g.scene}>
            <SceneCtx.Provider value={{ cues, sfx }}>
              <Camera>{Scene ? <Scene /> : null}</Camera>
            </SceneCtx.Provider>
          </Sequence>
        );
      })}
      <Captions words={track.beats.flatMap((b) => b.words)} />
      <Progress />
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};

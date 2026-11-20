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

// Effects sit well under the voice: every effect's volume is scaled by SFX_GAIN (Javlon: "sounds louder than voice").
const SFX_GAIN = 0.35;

export const Sfx: React.FC<{ name: string; at: number; volume?: number }> = ({ name, at, volume = 0.6 }) => {
  const src = useContext(SceneCtx).sfx[name];
  if (!src) return null;
  return (
    <Sequence from={at} layout="none">
      <Audio src={staticFile(src)} volume={volume * SFX_GAIN} />
    </Sequence>
  );
};

// A scene that moves its own camera (three.js, CSS 3D with its own push or drift) sets `ownCamera = true`, so the Shell
// adds no zoom on top: two zooms at once read as a swing, and scaling a 3D layer resamples it and breaks its edges.
export type SceneFC = React.FC & { ownCamera?: boolean };

// Push-in speed is the same in every scene (per second, not per scene: a short scene used to zoom three times faster
// than a long one) and stops at PUSH_MAX.
const PUSH_PER_S = 0.004;
const PUSH_MAX = 1.03;

// Slow push-in for a flat scene, quick fade and rise on entry, fade on exit. The opening scene starts with a zoom
// punch and an impact hit, and no flash: the first frame is what a paused, unstarted video shows, so it must be the
// content, never a white page (Javlon, 2026-11-04). Every later scene gets a short, faint flash on the cut.
// `willChange` keeps the scene on one layer that is scaled as a picture; without it Chrome snaps every glyph and thin
// line to whole pixels on each frame, so text swims and edges shimmer during the zoom (Javlon, 2026-11-20).
const Camera: React.FC<{ first: boolean; own: boolean; children: React.ReactNode }> = ({ first, own, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const opacity = interpolate(frame, [0, first ? 1 : 6, durationInFrames - 5, durationInFrames], [first ? 1 : 0, 1, 1, 0], clamp);
  const rise = first ? 0 : interpolate(frame, [0, 8], [40, 0], clamp);
  const punch = first ? interpolate(frame, [0, 10], [1.06, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 }) : 1;
  const push = own ? 1 : Math.min(PUSH_MAX, 1 + (PUSH_PER_S * frame) / fps);
  const scale = punch * push;
  const flash = first ? 0 : interpolate(frame, [0, 5], [0.12, 0], clamp);
  return (
    <>
      <AbsoluteFill style={{ opacity, transform: `translateY(${rise}px) scale(${scale})`, transformOrigin: "50% 45%", willChange: own ? undefined : "transform" }}>
        {children}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: FG, opacity: flash, pointerEvents: "none" }} />
      {first ? <Sfx name="impact" at={0} volume={0.7} /> : null}
    </>
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: (frame / durationInFrames) * width, background: FG, opacity: 0.35 }} />
  );
};

export const Shell: React.FC<ShortProps & { scenes: Record<string, SceneFC> }> = ({ track, audio, sfx, scenes }) => {
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
              <Camera first={i === 0} own={Scene?.ownCamera === true}>{Scene ? <Scene /> : null}</Camera>
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

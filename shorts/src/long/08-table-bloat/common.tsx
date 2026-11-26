// Shared helpers for the table-bloat long video (16:9, 2560x1440). The look and the small pieces are the payload
// video's (../01-payload/common); only the word cues, scene lengths and the scene frame read this video's own
// timings.json (tools/long_timings.py from the takes; tools/long_script.py writes an estimate before they exist).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BG } from "../../theme";
import { cl } from "../01-payload/common";
import timings from "./timings.json";

export { AMBER, Appear, Block, Card, cl, ease, HBar, LH, LW, Muted, proj, Sfx, Stage, Stamp, Tag, Title, usePop, useT } from "../01-payload/common";

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

/** Opacity 0..1: in at `from`, out at `to` (10 frames each); no `to` = stays. */
export const useWin = (from: number, to?: number) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [from, from + 10], [0, 1], cl);
  return to === undefined ? a : a * interpolate(frame, [to - 10, to], [1, 0], cl);
};
export const fmt = (n: number) => n.toLocaleString("en-US");
export const CARD_BG = "#262a30";

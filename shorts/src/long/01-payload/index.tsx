// The payload long video (JSON vs Protobuf vs Avro), 16:9 at 2560x1440: one composition per scene for checking,
// and long-01-full, every scene in a Series, for the final render. Frames come from timings.json (take + tail).
import React from "react";
import { Series } from "remotion";
import { Sting } from "../03-uuid-keys/g1-s02-s03";
import { sceneFrames } from "./common";
import { Hook, TheTest } from "./s01-s03";
import { FinePrint, LabSize } from "./s04-s05";
import { Levels, Worth } from "./s06-s07";
import { Turn } from "./s08";
import { LabSchema } from "./s09";
import { Decision, Guards } from "./s10-s11";

const STING_FRAMES = 84;

export const L01_SCENES: { id: string; component: React.FC; frames: number }[] = [
  { id: "long-01-s01", component: Hook, frames: sceneFrames("01") },
  { id: "long-01-s02", component: Sting, frames: STING_FRAMES },
  { id: "long-01-s03", component: TheTest, frames: sceneFrames("03") },
  { id: "long-01-s04", component: LabSize, frames: sceneFrames("04") },
  { id: "long-01-s05", component: FinePrint, frames: sceneFrames("05") },
  { id: "long-01-s06", component: Worth, frames: sceneFrames("06") },
  { id: "long-01-s07", component: Levels, frames: sceneFrames("07") },
  { id: "long-01-s08", component: Turn, frames: sceneFrames("08") },
  { id: "long-01-s09", component: LabSchema, frames: sceneFrames("09") },
  { id: "long-01-s10", component: Guards, frames: sceneFrames("10") },
  { id: "long-01-s11", component: Decision, frames: sceneFrames("11") },
];

export const L01_TOTAL = L01_SCENES.reduce((a, s) => a + s.frames, 0);

export const LongFull: React.FC = () => (
  <Series>
    {L01_SCENES.map((s) => (
      <Series.Sequence key={s.id} durationInFrames={s.frames}>
        <s.component />
      </Series.Sequence>
    ))}
  </Series>
);

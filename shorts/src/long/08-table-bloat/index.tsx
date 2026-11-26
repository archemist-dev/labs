// The table-bloat long video ("Why Your Postgres Table Keeps Growing"), 16:9 at 2560x1440: one composition per scene
// for checking, and long-08-full, every scene in a Series, for the final render. Frames come from timings.json.
import React from "react";
import { Series } from "remotion";
import { Sting } from "../03-uuid-keys/g1-s02-s03";
import { sceneFrames } from "./common";
import { Hook, TheTest } from "./s01-s03";
import { LabHour } from "./s04";
import { Why } from "./s05";
import { Space } from "./s06";
import { Others, Story } from "./s07-s08";
import { LabFixes } from "./s09";
import { Decision } from "./s10";

const STING_FRAMES = 84;

export const L08_SCENES: { id: string; component: React.FC; frames: number }[] = [
  { id: "long-08-s01", component: Hook, frames: sceneFrames("01") },
  { id: "long-08-s02", component: Sting, frames: STING_FRAMES },
  { id: "long-08-s03", component: TheTest, frames: sceneFrames("03") },
  { id: "long-08-s04", component: LabHour, frames: sceneFrames("04") },
  { id: "long-08-s05", component: Why, frames: sceneFrames("05") },
  { id: "long-08-s06", component: Space, frames: sceneFrames("06") },
  { id: "long-08-s07", component: Story, frames: sceneFrames("07") },
  { id: "long-08-s08", component: Others, frames: sceneFrames("08") },
  { id: "long-08-s09", component: LabFixes, frames: sceneFrames("09") },
  { id: "long-08-s10", component: Decision, frames: sceneFrames("10") },
];

export const L08_TOTAL = L08_SCENES.reduce((a, s) => a + s.frames, 0);

export const LongFull: React.FC = () => (
  <Series>
    {L08_SCENES.map((s) => (
      <Series.Sequence key={s.id} durationInFrames={s.frames}>
        <s.component />
      </Series.Sequence>
    ))}
  </Series>
);

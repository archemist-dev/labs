// Group G2 of the UUIDv7 long video (Remotion, 16:9, 2560x1440): scenes 7 (the real run), 8 (where the next key lands),
// 9 (the write-ahead log). Frame counts are the take's length plus a 0.8 s tail (work-long-uuid/timings.json).
import React from "react";
import { Btree } from "./g2-btree";
import { Lab } from "./g2-lab";
import { Wal } from "./g2-wal";

export const G2_COMPS: { id: string; component: React.FC; frames: number }[] = [
  { id: "long-03-s07", component: Lab, frames: 2150 },
  { id: "long-03-s08", component: Btree, frames: 1486 },
  { id: "long-03-s09", component: Wal, frames: 614 },
];

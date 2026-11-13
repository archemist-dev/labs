import React from "react";
import { sceneFrames } from "./g1-common";
import { Sting, Turn } from "./g1-s02-s03";
import { WhyNotCounter } from "./g1-s04";
import { Slowdown } from "./g1-s05";
import { TheTest } from "./g1-s06";

export const G1_COMPS: { id: string; component: React.FC; frames: number }[] = [
  { id: "long-03-s02", component: Sting, frames: sceneFrames("02") },
  { id: "long-03-s03", component: Turn, frames: sceneFrames("03") },
  { id: "long-03-s04", component: WhyNotCounter, frames: sceneFrames("04") },
  { id: "long-03-s05", component: Slowdown, frames: sceneFrames("05") },
  { id: "long-03-s06", component: TheTest, frames: sceneFrames("06") },
];

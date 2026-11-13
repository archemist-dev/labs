import React from "react";
import { Scene10 } from "./g3-s10";
import { Scene11 } from "./g3-s11";
import { Scene12 } from "./g3-s12";
import { Scene13 } from "./g3-s13";
import { Scene14 } from "./g3-s14";

export const G3_COMPS: { id: string; component: React.FC; frames: number }[] = [
  { id: "long-03-s10", component: Scene10, frames: 802 },
  { id: "long-03-s11", component: Scene11, frames: 1726 },
  { id: "long-03-s12", component: Scene12, frames: 461 },
  { id: "long-03-s13", component: Scene13, frames: 1531 },
  { id: "long-03-s14", component: Scene14, frames: 2206 },
];

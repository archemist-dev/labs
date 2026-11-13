// Thumbnail for the UUIDv7 long video: three words, the two real insert-rate lines (lab run 1) and their end values.
import React from "react";
import { AbsoluteFill } from "remotion";
import data from "../../shorts/03-uuid-keys/data.json";
import { BG, FG, GOLD, GREEN, MONO, MUTED, RED, SANS } from "../../theme";

export const TW = 1920;
export const TH = 1080;
const X0 = 120;
const X1 = 1260;
const Y0 = 980; // rate 0
const Y1 = 520; // rate max
const MAX = Math.max(...data.v7.rate, ...data.v4.rate);
const pts = (k: "v4" | "v7") =>
  data[k].rate.map((r: number, i: number) => `${X0 + ((X1 - X0) * i) / (data[k].rate.length - 1)},${Y0 - ((Y0 - Y1) * r) / MAX}`).join(" ");

export const LongThumb: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", left: 120, top: 90, fontFamily: SANS, fontWeight: 800, fontSize: 210, color: FG, lineHeight: 0.95, letterSpacing: -4 }}>
      TABLE
      <br />
      GROWS
    </div>
    <div style={{ position: "absolute", left: 124, top: 500, width: 220, height: 12, borderRadius: 6, background: GOLD }} />
    <svg width={TW} height={TH} style={{ position: "absolute", inset: 0 }}>
      <polyline points={pts("v7")} fill="none" stroke={GREEN} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts("v4")} fill="none" stroke={RED} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
    <div style={{ position: "absolute", left: 1330, top: 520, fontFamily: MONO, fontWeight: 800, fontSize: 150, color: GREEN }}>93,000</div>
    <div style={{ position: "absolute", left: 1330, top: 800, fontFamily: MONO, fontWeight: 800, fontSize: 150, color: RED }}>6,600</div>
    <div style={{ position: "absolute", left: 1336, top: 690, fontFamily: SANS, fontWeight: 700, fontSize: 56, color: MUTED }}>rows per second</div>
  </AbsoluteFill>
);

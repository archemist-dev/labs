import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data2.json";

// Cover for week 6 "Write the order first". Key content inside the centre 4:5 area (y 285-1635). The title carries
// the story ("The customer paid. The order was never created."); the cover shows the test: 378 charges a year with
// nothing behind them, and the flow that takes it to 0. No shared words with the title.
const Chip: React.FC<{ text: string; color: string; fill?: string }> = ({ text, color, fill }) => (
  <div style={{ padding: "16px 26px", borderRadius: 18, border: `5px solid ${color}`, background: fill ?? "transparent", fontFamily: MONO, fontWeight: 800, fontSize: 46, color: FG }}>{text}</div>
);
const Arrow: React.FC = () => (
  <svg width={56} height={40} viewBox="0 0 56 40">
    <path d="M4 20 H46 M34 6 L50 20 L34 34" fill="none" stroke={LIGHT} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Thumbnail2: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 320, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>SYSTEM DESIGN · SAGA</div>
    <div style={{ position: "absolute", left: 80, top: 390, fontFamily: MONO, fontWeight: 800, fontSize: 330, lineHeight: 1, color: RED, letterSpacing: -8 }}>{data.orphaned_refund_step}</div>
    <div style={{ position: "absolute", left: 80, top: 740, width: 900, fontFamily: SANS, fontWeight: 800, fontSize: 76, lineHeight: 1.1, color: FG }}>
      charges a year,
      <br />
      nothing behind them
    </div>
    <div style={{ position: "absolute", left: 80, top: 990, fontFamily: MONO, fontSize: 40, color: LIGHT }}>the fix: flip two steps</div>
    <div style={{ position: "absolute", left: 80, top: 1070, display: "flex", alignItems: "center", gap: 16 }}>
      <Chip text="PENDING" color={GRAY} />
      <Arrow />
      <Chip text="charge" color={GRAY} />
    </div>
    <div style={{ position: "absolute", left: 80, top: 1200, display: "flex", alignItems: "center", gap: 16 }}>
      <Arrow />
      <Chip text="CONFIRMED" color={GREEN} fill={GREEN_BG} />
      <div style={{ marginLeft: 20, fontFamily: MONO, fontWeight: 800, fontSize: 110, lineHeight: 1, color: GREEN }}>{data.orphaned_order_first}</div>
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1420, display: "flex", alignItems: "center", gap: 18 }}>
      <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
    </div>
  </AbsoluteFill>
);

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { BankCard, Coin } from "./Short3";
import data from "./data3.json";

// Cover for week 6 "Who refunds the refund?". Key content inside the centre 4:5 area (y 285-1635). The title carries
// the question; the cover shares no words with it: 32 payback tries failed (all retried and paid in the end, so
// never "the money didn't go back"), out of 1,806 paybacks, and the chain
// where the money gets stuck.
const Chip: React.FC<{ text: string; color: string; fill?: string }> = ({ text, color, fill }) => (
  <div style={{ padding: "14px 22px", borderRadius: 18, border: `5px solid ${color}`, background: fill ?? "transparent", fontFamily: MONO, fontWeight: 800, fontSize: 40, color: FG }}>{text}</div>
);
const Arrow: React.FC = () => (
  <svg width={46} height={40} viewBox="0 0 56 40">
    <path d="M4 20 H46 M34 6 L50 20 L34 34" fill="none" stroke={LIGHT} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Thumbnail3: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 320, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>SYSTEM DESIGN · SAGA</div>
    <div style={{ position: "absolute", left: 80, top: 390, fontFamily: MONO, fontWeight: 800, fontSize: 330, lineHeight: 1, color: RED, letterSpacing: -8 }}>{data.failed_refund_tries}</div>
    <div style={{ position: "absolute", left: 600, top: 400 }}>
      <Coin size={330} crack={1} />
    </div>
    <div style={{ position: "absolute", left: 80, top: 740, width: 900, fontFamily: SANS, fontWeight: 800, fontSize: 76, lineHeight: 1.1, color: FG }}>
      payback tries
      <br />
      failed
    </div>
    <div style={{ position: "absolute", left: 80, top: 990, fontFamily: MONO, fontSize: 40, color: LIGHT }}>
      out of {data.refunds.toLocaleString("en-GB")} paybacks
    </div>
    <div style={{ position: "absolute", left: 80, top: 1080, display: "flex", alignItems: "center", gap: 14 }}>
      <BankCard width={190} glow={GREEN} />
      <Arrow />
      <Chip text="order ✕" color={GRAY} />
      <Arrow />
      <Chip text="payback ✕" color={RED} fill={RED} />
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1420, display: "flex", alignItems: "center", gap: 18 }}>
      <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
    </div>
  </AbsoluteFill>
);

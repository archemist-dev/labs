import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Cover for week 5 "One deleted comment": the promo rule as a comment, then the same file with it crossed out, and the
// result under each. Key content inside the centre 4:5 area (y 285-1635). Shares no words with the title, which names
// the pain (the missed promo bug); the cover shows the cause (one comment) and the 3/3 against 0/3.
const Panel: React.FC<{ top: number; struck: boolean; score: string; color: string; tag: string }> = ({ top, struck, score, color, tag }) => (
  <div style={{ position: "absolute", left: 80, right: 80, top }}>
    <div style={{ padding: "22px 30px", borderRadius: 24, background: "#15171a", border: `4px solid ${color}`, fontFamily: MONO, fontSize: 40, lineHeight: 1.4 }}>
      <div style={{ position: "relative", color: struck ? MUTED : FG }}>
        # promo: items only,
        <br /># never delivery
        {struck ? <div style={{ position: "absolute", left: -6, right: 160, top: "47%", height: 8, borderRadius: 4, background: RED }} /> : null}
      </div>
    </div>
    <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 26 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 170, lineHeight: 1, color, letterSpacing: -6 }}>{score}</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color }}>{tag}</div>
    </div>
  </div>
);

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 320, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>AI CODE REVIEW</div>
    <Panel top={390} struck={false} score={`${data.written.caught}/${data.written.runs}`} color={GREEN} tag="blocked" />
    <Panel top={890} struck score={`${data.unwritten.caught}/${data.unwritten.runs}`} color={RED} tag="caught" />
    <div style={{ position: "absolute", left: 80, right: 80, top: 1420, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: LIGHT }}>same diff · same model</div>
    </div>
  </AbsoluteFill>
);

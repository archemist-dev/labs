import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data2.json";

// Cover for week 5 "The checklist fix": the noise (106-113 comments) against the fix (10-11), with one real bug comment
// from run 1 between them. Key content inside the centre 4:5 area (y 285-1635). Shares no words with the title
// ("My AI reviewer hid 10 real bugs in 110 comments"): the title names the pain, the cover shows the two prompts.
const span = (xs: number[]) => `${Math.min(...xs)}–${Math.max(...xs)}`;
const NOISE = span(data.default.runs.map((r) => r.comments));
const FIX = span(data.checklist.runs.map((r) => r.blocking));
const BUG = data.cards.find((c) => c.pr.startsWith("b02"))!;

const Big: React.FC<{ top: number; label: string; value: string; color: string; struck?: boolean }> = ({ top, label, value, color, struck }) => (
  <div style={{ position: "absolute", left: 80, right: 80, top }}>
    <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, letterSpacing: 4, color: MUTED }}>{label}</div>
    <div style={{ position: "relative", display: "inline-block", fontFamily: MONO, fontWeight: 800, fontSize: 200, lineHeight: 1.05, letterSpacing: -8, color }}>
      {value}
      {struck ? <div style={{ position: "absolute", left: -10, right: -10, top: "52%", height: 12, borderRadius: 6, background: RED }} /> : null}
    </div>
  </div>
);

export const Thumbnail2: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <Big top={330} label="DEFAULT PROMPT" value={NOISE} color={GRAY} struck />
    <div style={{ position: "absolute", left: 80, right: 80, top: 650, borderRadius: 20, overflow: "hidden", border: `5px solid ${RED}`, background: "rgba(90,24,27,0.95)" }}>
      <div style={{ padding: "12px 24px", background: "#22262c", fontFamily: MONO, fontSize: 30, color: LIGHT }}>{BUG.path}</div>
      <div style={{ padding: "8px 24px", background: "rgba(52,199,123,0.13)", fontFamily: MONO, fontSize: 28, color: FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <span style={{ color: GREEN, fontWeight: 800 }}>+ </span>
        {BUG.code}
      </div>
      <div style={{ padding: "18px 24px 24px", fontFamily: SANS, fontWeight: 800, fontSize: 46, lineHeight: 1.2, color: FG }}>
        {BUG.text.split("`").map((p, i) => (i % 2 ? <span key={i} style={{ fontFamily: MONO, fontSize: 40, background: "#2f343b", borderRadius: 8, padding: "0 8px" }}>{p}</span> : <span key={i}>{p}</span>))}
      </div>
    </div>
    <Big top={1020} label="CHECKLIST PROMPT" value={FIX} color={GREEN} />
    <div style={{ position: "absolute", left: 80, right: 80, top: 1440, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: LIGHT }}>20 PRs · 3 runs</div>
    </div>
  </AbsoluteFill>
);

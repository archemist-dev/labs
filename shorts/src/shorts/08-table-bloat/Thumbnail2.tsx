import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data2.json";

// Cover for week 7 "The replica that brings the bloat back". Key content inside the centre 4:5 area (y 285-1635).
// The title carries the story ("Moved the report to a replica. Still 300,000 dead rows"); the cover shares no words
// with it: the number, "old copies kept for a query on another server", and the two servers with the message back.
// The Postgres logo is the eye-catcher (CLAUDE.md covers), kept away from the red and the number.
const HATCH = `repeating-linear-gradient(135deg, rgba(229,72,77,0.34) 0 16px, rgba(229,72,77,0.10) 16px 32px)`;

const Cyl: React.FC<{ w: number; color: string }> = ({ w, color }) => {
  const h = w * 1.05;
  const ry = w * 0.16;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <path d={`M4 ${ry} V${h - ry} A${w / 2 - 4} ${ry} 0 0 0 ${w - 4} ${h - ry} V${ry}`} fill="#2a2f37" stroke={color} strokeWidth={6} />
      <ellipse cx={w / 2} cy={ry} rx={w / 2 - 4} ry={ry - 2} fill="#343a44" stroke={color} strokeWidth={6} />
      {[0.4, 0.68].map((t) => (
        <path key={t} d={`M4 ${h * t} A${w / 2 - 4} ${ry} 0 0 0 ${w - 4} ${h * t}`} fill="none" stroke={color} strokeWidth={5} opacity={0.7} />
      ))}
    </svg>
  );
};

export const Thumbnail2: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 310, display: "flex", alignItems: "center", gap: 22 }}>
      <Img src={staticFile("tech/postgresql.svg")} style={{ width: 96, height: 96 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>UNDER THE HOOD</div>
    </div>
    <div style={{ position: "absolute", left: 80, top: 430, fontFamily: MONO, fontWeight: 800, fontSize: 210, lineHeight: 1, color: RED, letterSpacing: -6 }}>
      {(Math.round(data.dead_feedback_on / 10_000) * 10_000).toLocaleString("en-GB")}
    </div>
    <div style={{ position: "absolute", left: 80, top: 660, width: 920, fontFamily: SANS, fontWeight: 800, fontSize: 76, lineHeight: 1.1, color: FG }}>
      old copies kept
      <br />
      for a query on
      <br />
      another server
    </div>
    {/* the two servers: the second one asks the first to keep the old copies */}
    <div style={{ position: "absolute", left: 120, top: 1110 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ position: "absolute", left: 18, top: -40 - i * 34, width: 184, height: 26, borderRadius: 6, background: HATCH, border: `4px solid ${RED}` }} />
      ))}
      <Cyl w={220} color={LIGHT} />
    </div>
    <svg width={300} height={60} style={{ position: "absolute", left: 355, top: 1200 }}>
      <path d="M290 30 H20 M40 10 L16 30 L40 50" fill="none" stroke={LIGHT} strokeWidth={7} strokeDasharray="6 16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <div style={{ position: "absolute", left: 660, top: 1110 }}>
      <Cyl w={220} color={LIGHT} />
    </div>
    <div style={{ position: "absolute", left: 80, top: 1426, display: "flex", alignItems: "center", gap: 16 }}>
      <Img src={staticFile("logo.svg")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 8, color: GOLD }}>ARCHEMIST</div>
    </div>
  </AbsoluteFill>
);

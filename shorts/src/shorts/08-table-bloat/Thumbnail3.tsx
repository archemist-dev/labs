import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";

// Cover for week 7 "The search that made the database read-only". Key content inside the centre 4:5 area (y 285-1635).
// The title carries the story ("An admin search made the Postgres database read-only"); the cover shares no words
// with it: what the team saw (writes stopped) and why (the disk was full of rows nobody needed), with the disk drawn
// as a level, no number (the story has no published metrics). The Postgres logo is the eye-catcher, away from the red.
export const Thumbnail3: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 310, display: "flex", alignItems: "center", gap: 22 }}>
      <Img src={staticFile("tech/postgresql.svg")} style={{ width: 96, height: 96 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>UNDER THE HOOD</div>
    </div>
    <div style={{ position: "absolute", left: 80, top: 440, width: 920, fontFamily: SANS, fontWeight: 800, fontSize: 150, lineHeight: 1.02, color: RED, letterSpacing: -4 }}>
      Writes
      <br />
      stopped.
    </div>
    <div style={{ position: "absolute", left: 80, top: 790, width: 560, fontFamily: SANS, fontWeight: 800, fontSize: 68, lineHeight: 1.12, color: FG }}>
      Disk full of rows nobody needed
    </div>
    {/* the disk: the data that belongs there, and the rest */}
    <div style={{ position: "absolute", left: 660, top: 800, width: 220, height: 520, boxSizing: "border-box", borderRadius: 20, border: `6px solid ${RED}`, overflow: "hidden", display: "flex", flexDirection: "column-reverse" }}>
      <div style={{ height: "30%", background: "#4a515b" }} />
      <div style={{ height: "70%", background: RED }} />
    </div>
    <div style={{ position: "absolute", left: 80, top: 1130, fontFamily: MONO, fontSize: 40, color: LIGHT, lineHeight: 1.35 }}>
      slow reads kept
      <br />
      cleanup waiting
    </div>
    <div style={{ position: "absolute", left: 80, top: 1426, display: "flex", alignItems: "center", gap: 16 }}>
      <Img src={staticFile("logo.svg")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 8, color: GOLD }}>ARCHEMIST</div>
    </div>
  </AbsoluteFill>
);

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Cover for week 7 "The read that grows your table". Key content inside the centre 4:5 area (y 285-1635). The title
// carries the 1.8M dead rows ("A slow Postgres report left 1.8M dead rows"); the cover shows the other half, cleanup
// running 235 times and deleting nothing, over the table drawn to scale (1M orders, 1.8M old copies on top). No shared
// words with the title. The Postgres logo is the eye-catcher (CLAUDE.md covers), kept away from the red and the numbers.
const HATCH = `repeating-linear-gradient(135deg, rgba(229,72,77,0.34) 0 16px, rgba(229,72,77,0.10) 16px 32px)`;
const LIVE_H = 170;
const DEAD_H = Math.round((LIVE_H * data.dead_at_release) / data.rows);

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 310, display: "flex", alignItems: "center", gap: 22 }}>
      <Img src={staticFile("tech/postgresql.svg")} style={{ width: 96, height: 96 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>UNDER THE HOOD</div>
    </div>
    <div style={{ position: "absolute", left: 80, top: 420, display: "flex", alignItems: "baseline", gap: 26 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 250, lineHeight: 1, color: FG, letterSpacing: -6 }}>{data.autovacuums}</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: FG }}>cleanups</div>
    </div>
    <div style={{ position: "absolute", left: 80, top: 670, display: "flex", alignItems: "baseline", gap: 26 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 250, lineHeight: 1, color: RED }}>0</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: RED }}>deleted</div>
    </div>
    {/* the table to scale: old copies stacked on the live orders */}
    <div style={{ position: "absolute", left: 500, top: 1400 - LIVE_H - DEAD_H, width: 380 }}>
      <div style={{ height: DEAD_H, boxSizing: "border-box", borderRadius: "16px 16px 0 0", border: `5px solid ${RED}`, background: HATCH }} />
      <div style={{ height: LIVE_H, boxSizing: "border-box", borderRadius: "0 0 16px 16px", border: `5px solid ${GRAY}`, background: "#3a4049" }} />
    </div>
    <div style={{ position: "absolute", right: 1080 - 470, top: 1400 - LIVE_H - DEAD_H / 2 - 40, textAlign: "right", fontFamily: SANS, fontWeight: 800, fontSize: 52, color: FG }}>old copies</div>
    <div style={{ position: "absolute", right: 1080 - 470, top: 1400 - LIVE_H / 2 - 60, textAlign: "right" }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: FG }}>1M</div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT }}>orders</div>
    </div>
    <div style={{ position: "absolute", left: 80, top: 1426, display: "flex", alignItems: "center", gap: 16 }}>
      <Img src={staticFile("logo.svg")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 8, color: GOLD }}>ARCHEMIST</div>
    </div>
  </AbsoluteFill>
);

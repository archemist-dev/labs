import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data2.json";

// Cover for week 4 "The tail". Key content inside the centre 4:5 area (y 285-1635). The title carries the p99 swing
// (56 ms, then 270 ms); the cover shows the other half, the fan-out: 39 of 100 pages slow. No shared words.
const RED_PAGES = new Set(Array.from({ length: data.fanout_slow_pct }, (_, i) => Math.floor((i * 100) / data.fanout_slow_pct + ((i * 7) % 3) * 0.5) % 100));

export const Thumbnail2: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 320, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>UNDER THE HOOD · LATENCY</div>
    <div style={{ position: "absolute", left: 80, top: 390, fontFamily: MONO, fontWeight: 800, fontSize: 250, lineHeight: 1, color: RED, letterSpacing: -8 }}>
      {data.fanout_slow_pct}%
    </div>
    <div style={{ position: "absolute", left: 80, top: 650, fontFamily: SANS, fontWeight: 800, fontSize: 80, color: FG }}>of pages, slow</div>
    <div style={{ position: "absolute", left: 80, top: 790, width: 920, display: "grid", gridTemplateColumns: "repeat(20, 1fr)", gap: 8 }}>
      {Array.from({ length: 100 }, (_, i) => (
        <div key={i} style={{ height: 70, borderRadius: 6, background: RED_PAGES.has(i) ? RED : "#2c3036" }} />
      ))}
    </div>
    <div style={{ position: "absolute", left: 80, top: 1240, fontFamily: MONO, fontSize: 40, color: LIGHT }}>50 calls each · 1 in 100 slow</div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1420, display: "flex", alignItems: "center", gap: 18 }}>
      <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
    </div>
  </AbsoluteFill>
);

// Thumbnail for the table-bloat long video, 1920x1080. Different words from the title ("Why Your Postgres Table Keeps
// Growing"): cleanup ran 235 times and removed none of the copies (logs.json), the PostgreSQL logo and name (the topic
// is one technology), and the table file as boxes, mostly empty. Gold only as the line; the logo is not next to a bar.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, LIGHT, MONO, RED, SANS } from "../../theme";
import logs from "./logs.json";

export const TW = 1920;
export const TH = 1080;
const H = logs.hour;
const LIVE = (H.table[1] - H.free_mb) / H.table[1];
const BOX = 104;

export const Thumb: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", left: 100, top: 90, display: "flex", alignItems: "center", gap: 28 }}>
      <Img src={staticFile("tech/postgresql.svg")} style={{ width: 130, height: 130 }} />
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: FG }}>PostgreSQL</div>
    </div>
    <div style={{ position: "absolute", left: 100, top: 290, fontFamily: SANS, fontWeight: 800, fontSize: 120, color: FG }}>
      <span style={{ fontFamily: MONO }}>{H.rows[H.rows.length - 1].av}</span> cleanups
    </div>
    <div style={{ position: "absolute", left: 92, top: 480, fontFamily: MONO, fontWeight: 800, fontSize: 190, color: RED, lineHeight: 1 }}>removed 0</div>
    <div style={{ position: "absolute", left: 104, top: 740, width: 300, height: 14, borderRadius: 7, background: GOLD }} />
    <div style={{ position: "absolute", left: 100, top: 800, fontFamily: MONO, fontWeight: 800, fontSize: 96, color: LIGHT }}>
      {H.table[0]} → <span style={{ color: RED }}>{H.table[1]} MB</span>
    </div>
    <div style={{ position: "absolute", right: 250, top: 90, display: "grid", gridTemplateColumns: `repeat(3, ${BOX}px)`, gap: 14 }}>
      {Array.from({ length: 21 }, (_, i) => (
        <div key={i} style={{ width: BOX, height: BOX, borderRadius: 12, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BOX * (1 - LIVE) - 6, border: `5px dashed ${RED}`, borderBottom: "none", borderRadius: "12px 12px 0 0", boxSizing: "border-box" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BOX * LIVE, background: LIGHT }} />
        </div>
      ))}
    </div>
    <Img src={staticFile("long/archemist-logo-transparent-512.png")} style={{ position: "absolute", right: 70, bottom: 60, width: 150, height: 150, opacity: 0.9 }} />
  </AbsoluteFill>
);

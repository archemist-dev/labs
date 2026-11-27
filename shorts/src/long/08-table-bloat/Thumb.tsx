// Thumbnail for the table-bloat long video, 1920x1080. Different words from the title ("Why Your Postgres Table Keeps
// Growing"): cleanup ran 235 times and removed none of the copies (logs.json), the PostgreSQL logo and name (the topic
// is one technology), and the table file as boxes, mostly empty. Gold only as the line; the logo is not next to a bar.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, GREEN, LIGHT, MONO, RED, SANS } from "../../theme";
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

// Two more covers for YouTube's "Test & compare". Neither shares a word with any of the three test titles.
const Head: React.FC = () => (
  <div style={{ position: "absolute", left: 100, top: 90, display: "flex", alignItems: "center", gap: 28 }}>
    <Img src={staticFile("tech/postgresql.svg")} style={{ width: 130, height: 130 }} />
    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: FG }}>PostgreSQL</div>
  </div>
);
const Flask: React.FC = () => (
  <Img src={staticFile("long/archemist-logo-transparent-512.png")} style={{ position: "absolute", right: 70, bottom: 60, width: 150, height: 150, opacity: 0.9 }} />
);

/** Stakes: the story's result. The disk on the right is the hour run's file: 120 MB of rows under 217 MB added. */
export const ThumbStakes: React.FC = () => {
  const DH = 730;
  const rows = (DH * H.table[0]) / H.table[1];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Head />
      <div style={{ position: "absolute", left: 96, top: 330, transform: "rotate(-4deg)", background: RED, color: BG, fontFamily: SANS, fontWeight: 800, fontSize: 158, lineHeight: 1, padding: "24px 40px 30px", borderRadius: 22 }}>READ-ONLY</div>
      <div style={{ position: "absolute", left: 100, top: 640, fontFamily: SANS, fontWeight: 800, fontSize: 124, color: FG }}>writes stopped</div>
      <div style={{ position: "absolute", left: 104, top: 820, width: 300, height: 14, borderRadius: 7, background: GOLD }} />
      <div style={{ position: "absolute", left: 100, top: 870, fontFamily: SANS, fontWeight: 700, fontSize: 84, color: LIGHT }}>it started with a search</div>
      <div style={{ position: "absolute", right: 290, top: 110, width: 330, height: DH, border: `8px solid ${LIGHT}`, borderRadius: 28, overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: rows, background: LIGHT }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: rows, background: RED }} />
      </div>
      <div style={{ position: "absolute", right: 240, top: 870, width: 430, whiteSpace: "nowrap", textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 72, color: RED }}>disk full</div>
      <Flask />
    </AbsoluteFill>
  );
};

/** Mechanism: a time line; left of the report's start the old copies are gone, right of it they pile up. */
export const ThumbWall: React.FC = () => {
  const X0 = 100, WALL = 640, B = 118, G = 18, BASE = 900;
  const dead = H.rows[H.rows.length - 1].dead.toLocaleString("en-US");
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Head />
      <div style={{ position: "absolute", left: 100, top: 270, fontFamily: SANS, fontWeight: 800, fontSize: 124, color: FG }}>1 report, still open</div>
      <div style={{ position: "absolute", left: 104, top: 440, width: 300, height: 14, borderRadius: 7, background: GOLD }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: X0 + 40 + i * (B + G + 30), top: BASE - B, width: B, height: B, borderRadius: 14, border: `5px dashed ${GRAY}`, boxSizing: "border-box" }} />
      ))}
      <div style={{ position: "absolute", left: WALL, top: 500, width: 22, height: BASE - 500 + 20, borderRadius: 11, background: GREEN }} />
      <div style={{ position: "absolute", left: 100, top: 560, width: WALL - 130, textAlign: "right", fontFamily: SANS, fontWeight: 800, fontSize: 72, color: GREEN, lineHeight: 1.1 }}>cleanup<br />stops here</div>
      {Array.from({ length: 7 }, (_, c) =>
        Array.from({ length: 3 }, (_, r) => (
          <div key={`${c}-${r}`} style={{ position: "absolute", left: WALL + 50 + c * (B + G), top: BASE - (r + 1) * B - r * G, width: B, height: B, borderRadius: 14, background: RED }} />
        )),
      )}
      <div style={{ position: "absolute", left: X0, top: BASE + 22, width: 1500, height: 6, background: GRAY }} />
      <div style={{ position: "absolute", left: WALL + 50, top: 940, fontFamily: MONO, fontWeight: 800, fontSize: 96, color: RED }}>kept: {dead}</div>
      <Flask />
    </AbsoluteFill>
  );
};

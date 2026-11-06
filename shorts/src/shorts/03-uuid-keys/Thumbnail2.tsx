import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, GREEN, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Cover for week 3 "Where the next row lands". Everything that matters sits inside the centre 4:5 area (y 285-1635).
// Leaf density from data.json (run 1). Shares no words with the title ("Same 16-byte ID, 29% bigger index").
// Same rows in both: 7 pages at 90% hold what 9 pages at 70% hold.
const ROWS = [
  { name: "UUIDv7", fill: Math.round(data.leaf_density.v7), pages: 7, color: GREEN },
  { name: "UUIDv4", fill: Math.round(data.leaf_density.v4), pages: 9, color: RED },
];

export const Thumbnail2: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 320, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>
      UNDER THE HOOD · POSTGRES
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 400 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 250, lineHeight: 1, color: RED, letterSpacing: -8 }}>{ROWS[1].fill}%</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 92, lineHeight: 1.05, color: FG, marginTop: 14 }}>Random keys waste pages.</div>
      <div style={{ marginTop: 30, width: 140, height: 10, borderRadius: 5, background: GOLD }} />
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1000 }}>
      {ROWS.map((r) => (
        <div key={r.name} style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 190 }}>
          <div style={{ width: 200, flexShrink: 0, alignSelf: "center", fontFamily: SANS, fontWeight: 800, fontSize: 42, color: r.color }}>{r.name}</div>
          {Array.from({ length: r.pages }, (_, i) => (
            <div key={i} style={{ width: 58, height: 150, borderRadius: 8, border: `3px solid ${GRAY}`, position: "relative", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${r.fill}%`, background: r.color }} />
            </div>
          ))}
          <div style={{ marginLeft: 10, alignSelf: "center", fontFamily: MONO, fontWeight: 800, fontSize: 42, color: r.color }}>{r.fill}%</div>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1440, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: MUTED }}>tested · PostgreSQL 18</div>
    </div>
  </AbsoluteFill>
);

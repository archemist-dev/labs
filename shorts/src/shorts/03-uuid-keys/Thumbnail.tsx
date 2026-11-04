import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Cover for week 3 "The 14x cliff". Everything that matters sits inside the centre 4:5 area (y 285-1635).
// Rates from data.json (run 1, last window, 9-10M rows). Shares no words with the title ("Random UUID keys: 14x
// slower inserts at 10M rows"), per the yt-package rule used since week 2.
const last = (k: "bigint" | "v7" | "v4") => data[k].rate[data[k].rate.length - 1];
const BARS: { name: string; rate: number; color: string }[] = [
  { name: "bigint", rate: last("bigint"), color: LIGHT },
  { name: "UUIDv7", rate: last("v7"), color: GREEN },
  { name: "UUIDv4", rate: last("v4"), color: RED },
];
const k = (n: number) => `${(Math.round(n / 100) / 10).toLocaleString("en-US")}k/s`;

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 320, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>
      UNDER THE HOOD · POSTGRES
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 400 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 250, lineHeight: 1, color: RED, letterSpacing: -8 }}>6,600</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 92, lineHeight: 1.05, color: FG, marginTop: 14 }}>Same 16 bytes.</div>
      <div style={{ marginTop: 30, width: 140, height: 10, borderRadius: 5, background: GOLD }} />
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1000 }}>
      {BARS.map((b) => (
        <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 24, height: 100 }}>
          <div style={{ width: 230, flexShrink: 0, fontFamily: SANS, fontWeight: 800, fontSize: 46, color: b.color }}>{b.name}</div>
          <div style={{ height: 60, width: Math.max(16, (b.rate / last("bigint")) * 460), flexShrink: 0, borderRadius: 10, background: b.color }} />
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 46, color: b.color }}>{k(b.rate)}</div>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1420, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: MUTED }}>tested · PostgreSQL 18</div>
    </div>
  </AbsoluteFill>
);

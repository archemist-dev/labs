import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";

// Cover for Short 1 (week 2). Same layout rules as the week 1 covers: everything that matters inside the centre 4:5 area.
// Numbers from 02-extract-first/README.md: dependencies to cut per module, one typical order.
const BARS: [string, number][] = [
  ["orders", 10],
  ["payments", 3],
  ["couriers", 3],
  ["menu", 2],
  ["notifications", 2],
];

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 170, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>
      ARCHITECTURE · MONOLITH
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 290 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 330, lineHeight: 1, color: RED, letterSpacing: -10 }}>10</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 92, lineHeight: 1.05, color: FG, marginTop: 10 }}>
        Wrong first pick.
      </div>
      <div style={{ marginTop: 30, width: 140, height: 10, borderRadius: 5, background: GOLD }} />
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1000 }}>
      {BARS.map(([name, n]) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 24, height: 86 }}>
          <div style={{ width: 300, flexShrink: 0, fontFamily: SANS, fontWeight: 700, fontSize: 40, color: name === "orders" ? FG : LIGHT }}>{name}</div>
          <div style={{ height: 52, width: n * 56, flexShrink: 0, borderRadius: 10, background: name === "orders" ? RED : GRAY }} />
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: name === "orders" ? FG : MUTED }}>{n}</div>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1500, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: MUTED }}>tested · 1 order</div>
    </div>
  </AbsoluteFill>
);

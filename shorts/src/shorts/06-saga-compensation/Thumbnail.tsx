import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Cover for week 6 "The retry that doubled orders". Key content inside the centre 4:5 area (y 285-1635). The title
// carries the 1,869 double orders; the cover shows the other half, the money: one checkout printed twice, £36,389 of
// food sent twice in a year. No shared words with the title.
const HATCH = `repeating-linear-gradient(135deg, rgba(229,72,77,0.28) 0 14px, rgba(229,72,77,0.08) 14px 28px)`;
const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const Receipt: React.FC<{ n: number; dup?: boolean; left: number }> = ({ n, dup, left }) => (
  <div style={{ position: "absolute", left, top: 820, width: 440, padding: "26px 30px", borderRadius: 18, background: dup ? HATCH : "#22262c", border: `5px solid ${dup ? RED : GRAY}` }}>
    <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 48, color: dup ? RED : FG }}>ORDER #{1040 + n}</div>
    <div style={{ fontFamily: MONO, fontSize: 32, color: MUTED, marginBottom: 14 }}>checkout c42</div>
    {[
      ["2 items", pounds(data.basket_pence - 299)],
      ["delivery", "£2.99"],
      ["total", pounds(data.basket_pence)],
    ].map(([a, b]) => (
      <div key={a} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 36, color: FG, fontWeight: a === "total" ? 800 : 400 }}>
        <span>{a}</span>
        <span>{b}</span>
      </div>
    ))}
    <div style={{ marginTop: 14, fontFamily: MONO, fontWeight: 700, fontSize: 32, color: LIGHT }}>DELIVERED</div>
  </div>
);

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 320, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>SYSTEM DESIGN · SAGA</div>
    <div style={{ position: "absolute", left: 80, top: 390, fontFamily: MONO, fontWeight: 800, fontSize: 210, lineHeight: 1, color: RED, letterSpacing: -6 }}>
      £{data.duplicate_pounds.toLocaleString("en-GB")}
    </div>
    <div style={{ position: "absolute", left: 80, top: 630, fontFamily: SANS, fontWeight: 800, fontSize: 80, color: FG }}>of food, sent twice</div>
    <Receipt n={1} left={80} />
    <Receipt n={2} dup left={560} />
    <div style={{ position: "absolute", left: 80, top: 1270, fontFamily: MONO, fontSize: 40, color: LIGHT }}>one checkout · charged once</div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1420, display: "flex", alignItems: "center", gap: 18 }}>
      <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
    </div>
  </AbsoluteFill>
);

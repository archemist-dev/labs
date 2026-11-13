// Thumbnail options C and D for the UUIDv7 long video: informative ones that answer "why watch" (the cliff and the fix).
// Numbers come from data.json (lab run 1); the words avoid the title's words.
import React from "react";
import { AbsoluteFill } from "remotion";
import data from "../../shorts/03-uuid-keys/data.json";
import { BG, FG, GOLD, GREEN, GREEN_BG, MONO, MUTED, RED, SANS } from "../../theme";

export const TW2 = 1920;
export const TH2 = 1080;

const Words: React.FC<{ lines: string[]; size?: number }> = ({ lines, size = 200 }) => (
  <div style={{ position: "absolute", left: 100, top: 60, fontFamily: SANS, fontWeight: 800, fontSize: size, lineHeight: 0.92, letterSpacing: -5, color: FG }}>
    {lines.map((l, i) => (
      <div key={i}>{l}</div>
    ))}
    <div style={{ marginTop: 24, width: 240, height: 14, borderRadius: 7, background: GOLD }} />
  </div>
);

// C: the cliff (real per-million windows), with the fix as a chip.
const X0 = 150;
const X1 = 1200;
const Y0 = 960;
const Y1 = 470;
const MAX = Math.max(...data.v7.rate, ...data.v4.rate);
const line = (k: "v4" | "v7") => data[k].rate.map((r: number, i: number) => [X0 + ((X1 - X0) * i) / (data[k].rate.length - 1), Y0 - ((Y0 - Y1) * r) / MAX] as const);
const pts = (k: "v4" | "v7") => line(k).map((p) => p.join(",")).join(" ");

export const ThumbC: React.FC = () => {
  const v4 = line("v4");
  const area = `${X0},${Y0} ${v4.map((p) => p.join(",")).join(" ")} ${X1},${Y0}`;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Words lines={["THE CLIFF"]} size={210} />
      <svg width={TW2} height={TH2} style={{ position: "absolute", inset: 0 }}>
        <polygon points={area} fill={RED} opacity={0.16} />
        <polyline points={pts("v7")} fill="none" stroke={GREEN} strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts("v4")} fill="none" stroke={RED} strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" />
        <line x1={X1} y1={Y1 - 40} x2={X1} y2={Y0 + 10} stroke={MUTED} strokeWidth={4} strokeDasharray="12 12" />
      </svg>
      <div style={{ position: "absolute", left: X1 - 330, top: Y0 + 14, fontFamily: MONO, fontWeight: 800, fontSize: 52, color: MUTED }}>10,000,000 rows</div>
      <div style={{ position: "absolute", left: X1 + 40, top: 560, fontFamily: MONO, fontWeight: 800, fontSize: 120, color: GREEN, lineHeight: 1 }}>93,000</div>
      <div style={{ position: "absolute", left: X1 + 40, top: 790, fontFamily: MONO, fontWeight: 800, fontSize: 120, color: RED, lineHeight: 1 }}>6,600</div>
      <div style={{ position: "absolute", left: X1 + 44, top: 700, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED }}>rows per second</div>
      <div style={{ position: "absolute", right: 90, top: 110, fontFamily: MONO, fontWeight: 800, fontSize: 64, lineHeight: 1.35, textAlign: "right" }}>
        <div style={{ color: RED, textDecoration: "line-through", textDecorationThickness: 6 }}>gen_random_uuid()</div>
        <div style={{ color: GREEN }}>uuidv7() ✓</div>
      </div>
    </AbsoluteFill>
  );
};

// D: the diff card, the exact change, with the proof under it.
export const ThumbD: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <Words lines={["ONE LINE", "FIX"]} size={210} />
    <div style={{ position: "absolute", left: 120, top: 560, width: 1680, borderRadius: 28, background: "#23272d", border: "4px solid #2c3036", overflow: "hidden", fontFamily: MONO, fontWeight: 700, fontSize: 74 }}>
      <div style={{ padding: "34px 50px", background: "#3a1e21", color: RED }}>
        <span style={{ opacity: 0.8 }}>-  </span>id uuid DEFAULT <b>gen_random_uuid()</b>
      </div>
      <div style={{ padding: "34px 50px", background: GREEN_BG, color: GREEN }}>
        <span style={{ opacity: 0.8 }}>+  </span>id uuid DEFAULT <b>uuidv7()</b>
      </div>
    </div>
    <div style={{ position: "absolute", left: 120, top: 905, fontFamily: MONO, fontWeight: 800, fontSize: 92, color: FG, display: "flex", gap: 36, alignItems: "baseline" }}>
      <span style={{ color: RED }}>6,600</span>
      <span style={{ color: MUTED }}>→</span>
      <span style={{ color: GREEN }}>93,000</span>
      <span style={{ fontFamily: SANS, fontSize: 56, color: MUTED, fontWeight: 700 }}>rows/s at 10M rows</span>
    </div>
  </AbsoluteFill>
);

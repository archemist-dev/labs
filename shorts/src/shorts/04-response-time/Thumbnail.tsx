import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Cover for week 4 "The server log lies". Everything that matters sits inside the centre 4:5 area (y 285-1635).
// Shares no words with the title ("Same request. 0.3 seconds, then 0.9."): the cover shows the other side, what the
// user waited against what the log saw, and the stages in between. Numbers from data.json (Sydney run 1).
const W = 920;
const px = (ms: number) => (ms / data.new.total) * W;
const STAGES = [
  { label: "open", ms: data.new.tcp, color: RED },
  { label: "secure", ms: data.new.tls, color: RED },
  { label: "wait", ms: data.new.wait, color: LIGHT },
];

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 320, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>
      UNDER THE HOOD · HTTP
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 400 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 250, lineHeight: 1, color: RED, letterSpacing: -8 }}>
        {Math.round(data.new.total)}
        <span style={{ fontSize: 110, letterSpacing: 0 }}> ms</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 88, lineHeight: 1.05, color: FG, marginTop: 18 }}>
        Your log: <span style={{ fontFamily: MONO, color: GREEN }}>{data.new.app} ms</span>
      </div>
      <div style={{ marginTop: 30, width: 140, height: 10, borderRadius: 5, background: GOLD }} />
    </div>
    <div style={{ position: "absolute", left: 80, top: 1010, display: "flex" }}>
      {STAGES.map((s) => (
        <div key={s.label} style={{ width: px(s.ms) }}>
          <div style={{ height: 84, marginRight: 8, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: s.color, opacity: s.color === LIGHT ? 0.55 : 1 }} />
            {s.label === "wait" ? <div style={{ position: "absolute", left: "48%", top: -8, width: 10, height: 100, borderRadius: 4, background: GREEN }} /> : null}
          </div>
          <div style={{ marginTop: 14, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: s.color }}>{s.label}</div>
          <div style={{ fontFamily: MONO, fontSize: 36, color: MUTED }}>{Math.round(s.ms)} ms</div>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1420, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: MUTED }}>Sydney → Frankfurt</div>
    </div>
  </AbsoluteFill>
);

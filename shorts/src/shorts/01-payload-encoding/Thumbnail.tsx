import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, GREEN, GRID, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Cover for Short 1 (YouTube Shorts, Reels, TikTok). Everything that matters sits in the centre 4:5 area
// (y 285-1635), because the Instagram grid and the Shorts shelf crop the top and bottom.
// Numbers: 461 of 1,076 JSON bytes are field names (43%); Protobuf 470 bytes. From 01-payload-encoding/README.md.

const SNIPPET = data.json_pretty.split("\n").slice(0, 10);
const share = Math.round((461 / 1076) * 100);

const Line: React.FC<{ text: string }> = ({ text }) => {
  const m = text.match(/^(\s*)("[^"]+": )(.*)$/);
  if (!m) return <div style={{ color: MUTED }}>{text}</div>;
  return (
    <div>
      {m[1]}
      <span style={{ color: FG, background: "rgba(229,72,77,.6)", borderRadius: 6, padding: "0 4px" }}>{m[2]}</span>
      <span style={{ color: MUTED }}>{m[3]}</span>
    </div>
  );
};

const SizeRow: React.FC<{ label: string; n: number; color: string }> = ({ label, n, color }) => (
  <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
    <div style={{ width: 230, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>{label}</div>
    <div style={{ width: (n / 1076) * 500, height: 56, background: color, borderRadius: 12 }} />
    <div style={{ marginLeft: 22, fontFamily: MONO, fontWeight: 800, fontSize: 46, color: FG }}>{n.toLocaleString("en-US")} B</div>
  </div>
);

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    {/* Outside the 4:5 crop: only seen full-screen, fine to lose. */}
    <div style={{ position: "absolute", left: 80, top: 170, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>
      UNDER THE HOOD · JSON vs PROTOBUF
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 300 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 250, lineHeight: 0.9, color: RED, letterSpacing: -8 }}>{share}%</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 96, lineHeight: 1.04, color: FG, marginTop: 18 }}>
        of this JSON is
        <br />
        <span style={{ color: RED }}>field names</span>
      </div>
      <div style={{ marginTop: 30, width: 140, height: 10, borderRadius: 5, background: GOLD }} />
    </div>
    <div style={{ position: "absolute", left: 60, right: 60, top: 860, height: 420, overflow: "hidden", borderRadius: 22, background: "#202328", border: `3px solid ${GRID}` }}>
      <div style={{ padding: "26px 36px", fontFamily: MONO, fontSize: 38, lineHeight: "50px", whiteSpace: "pre", color: LIGHT }}>
        {SNIPPET.map((l, i) => (
          <Line key={i} text={l} />
        ))}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#20232800 55%, #202328)" }} />
    </div>
    <div style={{ position: "absolute", left: 80, top: 1330 }}>
      <SizeRow label="JSON" n={1076} color={GRAY} />
      <SizeRow label="Protobuf" n={470} color={GREEN} />
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1500, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: MUTED }}>tested · t3.micro</div>
    </div>
  </AbsoluteFill>
);

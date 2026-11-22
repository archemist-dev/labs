// Thumbnail for the payload long video, 1920x1080. Different words from the title ("JSON vs Protobuf vs Avro: I Tested
// All Three"): the silent result, tip = 46, the real log line that printed OK, and NO ERROR. Gold only under the number.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GREEN, MONO, MUTED, RED, SANS } from "../../theme";

export const TW = 1920;
export const TH = 1080;

export const Thumb: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", left: 110, top: 120, fontFamily: SANS, fontWeight: 800, fontSize: 70, color: MUTED, letterSpacing: 2 }}>this order had no tip</div>
    <div style={{ position: "absolute", left: 100, top: 210, fontFamily: MONO, fontWeight: 800, fontSize: 330, color: RED, lineHeight: 1 }}>tip = 46</div>
    <div style={{ position: "absolute", left: 112, top: 600, width: 300, height: 14, borderRadius: 7, background: GOLD }} />
    <div style={{ position: "absolute", left: 110, top: 660, padding: "22px 34px", borderRadius: 22, background: "#262a30", border: "5px solid #3a3f47", fontFamily: MONO, fontSize: 64, color: GREEN, fontWeight: 800 }}>
      OK <span style={{ color: FG, fontWeight: 400 }}>wrong schema: 46</span>
    </div>
    <div style={{ position: "absolute", left: 110, top: 860, padding: "14px 36px", borderRadius: 18, background: RED, fontFamily: SANS, fontWeight: 800, fontSize: 84, color: BG, letterSpacing: 6, transform: "rotate(-3deg)" }}>NO ERROR</div>
    <Img src={staticFile("long/archemist-logo-transparent-512.png")} style={{ position: "absolute", right: 70, bottom: 60, width: 150, height: 150, opacity: 0.9 }} />
  </AbsoluteFill>
);

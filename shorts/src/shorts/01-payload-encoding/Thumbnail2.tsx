import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BG, FG, GOLD, GRAY, GRID, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Cover for Short 2. Same layout rules as Thumbnail.tsx: everything that matters inside the centre 4:5 area.
// tip = 46: the notes length prefix (0x5c) read as the tip by a reader with the wrong Avro schema (video_data.py).

const TAIL = data.avro_tail_hex.match(/../g)!;
const PREFIX = TAIL.length - data.avro_notes.length - 1;

export const Thumbnail2: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: GOLD }} />
    <div style={{ position: "absolute", left: 80, top: 170, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: MUTED }}>
      UNDER THE HOOD · SCHEMA CHANGES
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 310 }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 190, lineHeight: 1, color: FG, whiteSpace: "nowrap", letterSpacing: -6 }}>
        tip = <span style={{ color: RED }}>{data.avro_tip_wrong}</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 92, lineHeight: 1.05, color: FG, marginTop: 34 }}>
        No error.
        <br />
        No log.
      </div>
      <div style={{ marginTop: 30, width: 140, height: 10, borderRadius: 5, background: GOLD }} />
    </div>
    <div style={{ position: "absolute", left: 60, right: 60, top: 940, padding: "26px 36px", borderRadius: 22, background: "#202328", border: `3px solid ${GRID}` }}>
      <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, lineHeight: "60px" }}>
        {TAIL.slice(0, 24).map((h, i) => (
          <span key={i} style={{ display: "inline-block", marginRight: 16, padding: "0 6px", borderRadius: 8, color: i === PREFIX ? BG : i > PREFIX ? LIGHT : GRAY, background: i === PREFIX ? RED : "transparent" }}>
            {h}
          </span>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 32, color: MUTED, marginTop: 12 }}>v1 data · read with the wrong schema</div>
    </div>
    <div style={{ position: "absolute", left: 640, top: 1330, transform: "rotate(-4deg)", padding: "14px 30px", background: RED, borderRadius: 12, fontFamily: MONO, fontWeight: 800, fontSize: 52, color: FG }}>SILENT</div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1500, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 92, height: 92 }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: GOLD }}>ARCHEMIST</div>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: MUTED }}>tested · Avro</div>
    </div>
  </AbsoluteFill>
);

import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FG, GOLD, GRAY, LIGHT, MONO, SANS } from "../theme";

// The closing scene of a Short: who to follow and why, on screen while the follow line is spoken (the studio vault's
// script-for-speech skill, "Ending"). Use it as the scene of the last beat: add `follow: Follow` to the Short's SCENES
// and give the beat `scene: "follow"`. Calm on purpose: one fade, one line drawing in.
export const Follow: React.FC = () => {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const line = interpolate(frame, [4, 18], [0, 150], clamp);
  const handle = interpolate(frame, [12, 22], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 440, textAlign: "center" }}>
      <Img src={staticFile("logo.svg")} style={{ width: 240, height: 240 }} />
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 88, color: FG, marginTop: 24 }}>Archemist</div>
      <div style={{ height: 6, width: line, margin: "20px auto 34px", background: GOLD, borderRadius: 3 }} />
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, lineHeight: 1.25, color: LIGHT }}>
        One tested architecture
        <br />
        decision a week
      </div>
      <div style={{ display: "inline-block", marginTop: 48, padding: "14px 34px", border: `4px solid ${GRAY}`, borderRadius: 18, fontFamily: MONO, fontWeight: 700, fontSize: 46, color: FG, opacity: handle }}>
        @archemist_dev
      </div>
    </div>
  );
};

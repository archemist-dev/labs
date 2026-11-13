// Scene 2: the 2 s Archemist sting. Scene 3: the turn (three keys as rows of byte cells, then the chapter list).
import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Appear, cl, cue, Scene, Sfx, Stage, Tag, useT } from "./g1-common";

export const Sting: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 120 } });
  const line = interpolate(frame, [14, 36], [0, 1], cl);
  return (
    <Scene id="02">
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Img src={staticFile("long/archemist-logo-transparent-512.png")} style={{ width: 400, height: 400, transform: `scale(${0.8 + 0.2 * pop})`, opacity: Math.min(1, pop * 2) }} />
        <div style={{ marginTop: 36, fontFamily: SANS, fontWeight: 800, fontSize: 150, color: FG, letterSpacing: 6, opacity: Math.min(1, pop * 2) }}>Archemist</div>
        <div style={{ marginTop: 26, width: 340 * line, height: 10, borderRadius: 5, background: GOLD }} />
      </div>
      <Sfx name="reveal" from={4} volume={0.6} />
    </Scene>
  );
};

// ---- Scene 3 ---------------------------------------------------------------------------------------------------

const KEYS = [
  { name: "bigint", cells: 8, z: -2.7, sub: "counter" },
  { name: "UUIDv4", cells: 16, z: 0, sub: "random" },
  { name: "UUIDv7", cells: 16, z: 2.7, sub: "time-ordered" },
] as const;
const CELL = 0.5;
const X0 = -5.0;

const Cell: React.FC<{ x: number; z: number; color: string; born: number; lit: number }> = ({ x, z, color, born, lit }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [born, born + 8], [0, 1], cl);
  return (
    <mesh position={[x, 0.26 * s, z]} scale={[s, s, s]}>
      <boxGeometry args={[CELL * 0.88, 0.5, 1.15]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15 + 0.3 * lit} roughness={0.4} metalness={0.15} />
    </mesh>
  );
};

const CHAPTERS = [
  { label: "The story", at: () => cue("03", "starts") },
  { label: "The test", at: () => cue("03", "test") },
  { label: "Why", at: () => cue("03", "why") },
  { label: "The cheap fixes", at: () => cue("03", "cheap") },
  { label: "The decision", at: () => cue("03", "pick") },
];

export const Turn: React.FC = () => {
  const frame = useCurrentFrame();
  const bytes16 = cue("03", "16");
  const slower = cue("03", "14");
  const judged = interpolate(frame, [slower, slower + 12], [0, 1], cl);
  const colorFor = (k: (typeof KEYS)[number]) => {
    if (k.name === "bigint") return LIGHT;
    return judged > 0.5 ? (k.name === "UUIDv7" ? GREEN : RED) : LIGHT;
  };
  const pulse = interpolate(frame, [bytes16, bytes16 + 6, bytes16 + 24], [0, 1, 0], cl);
  const times = CHAPTERS.map((c) => c.at());
  // the chapter currently spoken: the last whose cue has passed (the story's cue is last)
  const order = [1, 2, 3, 4, 0]; // spoken order: test, why, fixes, decision, then the story
  const spokenIdx = order.filter((i) => frame >= times[i]);
  const now = spokenIdx.length ? spokenIdx[spokenIdx.length - 1] : -1;
  return (
    <Scene id="03">
      <Stage pos={[1.4, 8.4, 13.4]} look={[2.2, 0.1, 0.2]}>
        {KEYS.map((k, ki) =>
          Array.from({ length: k.cells }, (_, i) => (
            <Cell key={`${k.name}${i}`} x={X0 + i * CELL} z={k.z} color={colorFor(k)} born={8 + ki * 10 + i * 2} lit={pulse * (k.cells === 16 ? 1 : 0)} />
          )),
        )}
      </Stage>
      {/* key rows, right column, top to bottom = far to near */}
      <div style={{ position: "absolute", left: 1820, top: 120 }}>
        {KEYS.map((k, i) => (
          <Appear key={k.name} at={10 + i * 10} style={{ position: "relative", marginBottom: 22 }}>
            <Tag color={colorFor(k)} size={60} style={{ fontWeight: 800 }}>
              {k.name} <span style={{ fontWeight: 400, fontSize: 44, color: MUTED }}>{k.sub}</span>
            </Tag>
            <Tag color={FG} mono size={72} style={{ transform: `scale(${1 + 0.1 * (k.cells === 16 ? pulse : 0)})`, transformOrigin: "left center" }}>
              {k.cells}
              <span style={{ fontSize: 44, color: MUTED, fontWeight: 400 }}> bytes</span>
            </Tag>
          </Appear>
        ))}
      </div>
      {/* chapter list */}
      <Appear at={cue("03", "test") - 14} style={{ left: 1820, top: 780 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: MUTED, letterSpacing: 3, marginBottom: 14 }}>IN THIS VIDEO</div>
        <div style={{ marginTop: 6, width: 160, height: 8, borderRadius: 4, background: GOLD, marginBottom: 24 }} />
        {CHAPTERS.map((c, i) => {
          const on = now === i;
          const done = spokenIdx.includes(i) && !on;
          return (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 16, opacity: on ? 1 : done ? 0.55 : 0.3 }}>
              <div style={{ width: 14, height: 56, borderRadius: 7, background: on ? FG : GRAY }} />
              <div style={{ fontFamily: SANS, fontWeight: on ? 800 : 700, fontSize: 58, color: on ? FG : LIGHT }}>{c.label}</div>
            </div>
          );
        })}
      </Appear>
    </Scene>
  );
};

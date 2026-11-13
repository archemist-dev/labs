// Thumbnail options for the UUIDv7 long video, in 3D. A: "WHERE IT LANDS" (index pages), B: "NOT THE ID" (two databases).
// 1920x1080 stills rendered at a fixed frame so the page simulation has run.
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill } from "remotion";
import { Cam, Floor, Lights, PageRow3 } from "../../shorts/03-uuid-keys/ProtoB";
import { BG, FG, GOLD, GREEN, RED, SANS } from "../../theme";

export const TW3 = 1920;
export const TH3 = 1080;
const words = (a: string, b: string, size = 230): React.CSSProperties => ({});
void words;

const Words: React.FC<{ lines: string[]; size?: number; top?: number }> = ({ lines, size = 230, top = 60 }) => (
  <div style={{ position: "absolute", left: 100, top, fontFamily: SANS, fontWeight: 800, fontSize: size, lineHeight: 0.92, letterSpacing: -5, color: FG, textShadow: "0 8px 40px #000" }}>
    {lines.map((l, i) => (
      <div key={i}>{l}</div>
    ))}
    <div style={{ marginTop: 26, width: 240, height: 14, borderRadius: 7, background: GOLD }} />
  </div>
);

// A: index pages. Far row green (every key on the last page), near row red (keys anywhere, pages split and half empty).
export const ThumbA: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <ThreeCanvas width={TW3} height={TH3} style={{ position: "absolute", inset: 0 }} camera={{ fov: 40 }}>
      <Cam pos={[-1.2, 6.2, 10.2]} look={[1.0, 1.9, 0.2]} />
      <Lights />
      <Floor />
      <group position={[2.2, 0, 0]} scale={[1.25, 1.25, 1.25]}>
        <PageRow3 k="v7" z={-1.8} start={4} />
        <PageRow3 k="v4" z={1.8} start={4} />
      </group>
    </ThreeCanvas>
    <Words lines={["WHERE IT", "LANDS"]} />
  </AbsoluteFill>
);

const rnd = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const Stack: React.FC<{ x: number; color: string; ok: boolean }> = ({ x, color, ok }) => {
  const r = rnd(ok ? 11 : 5);
  return (
    <group position={[x, 0, 0]}>
      {[0.5, 1.45, 2.4].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={ok ? [0, 0, 0] : [0, 0, (i - 1) * 0.12]}>
          <cylinderGeometry args={[1.35, 1.35, 0.8, 64]} />
          <meshStandardMaterial color="#23272d" emissive={color} emissiveIntensity={ok ? 0.55 : 0.18} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 14 }, (_, i) => {
        // neat: a tidy ladder at the right edge; random: strewn around
        const px = ok ? 1.9 + 0 * i : (r() - 0.5) * 6;
        const pz = ok ? 0 : (r() - 0.3) * 3.2;
        const py = ok ? 0.25 + i * 0.28 : 0.2 + r() * 0.2 + (i % 3 === 0 ? 0.9 : 0);
        return (
          <mesh key={i} position={[px, py, pz]} rotation={ok ? [0, 0, 0] : [r() * 2, r() * 2, r() * 2]}>
            <boxGeometry args={[0.55, 0.22, 0.9]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.35} />
          </mesh>
        );
      })}
      <pointLight position={[0, 3.4, 2]} color={color} intensity={ok ? 14 : 6} distance={8} />
    </group>
  );
};

// B: two databases, same size: one tidy and glowing, one scattered and cracked.
export const ThumbB: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <ThreeCanvas width={TW3} height={TH3} style={{ position: "absolute", inset: 0 }} camera={{ fov: 40 }}>
      <Cam pos={[0.3, 4.6, 10.8]} look={[0.3, 1.7, 0]} />
      <Lights />
      <Floor />
      <Stack x={-3.4} color={RED} ok={false} />
      <Stack x={3.6} color={GREEN} ok />
    </ThreeCanvas>
    <Words lines={["NOT THE ID"]} size={220} top={50} />
  </AbsoluteFill>
);

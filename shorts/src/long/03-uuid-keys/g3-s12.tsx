// Scene 12: the key's bytes multiply. 3D: tables stacked like floors, each carrying the order ID; towers for the
// child index size (47 / 56 / 72 MB, lab run 1, 3M-row child table).
import React from "react";
import { FG, GREEN, LIGHT, MUTED, RED, SANS, MONO, Num, Scene, Show, Stage, Title, ramp, useSec } from "./g3-kit";

const FLOORS = ["orders", "order_items", "order_status_history", "events"];
const FLOOR_AT = [2.3, 2.9, 3.4, 3.9]; // "Every table that holds the order ID" (2.3 on): a chip lands on each floor
const TOWERS = [
  { label: "bigint", mb: 47, color: LIGHT, at: 8.7, x: 2.8 },
  { label: "UUIDv7", mb: 56, color: GREEN, at: 10.9, x: 4.65 },
  { label: "UUIDv4", mb: 72, color: RED, at: 11.84, x: 6.5 },
];

const Floors: React.FC<{ t: number }> = ({ t }) => {
  const hi = ramp(t, 6.1, 0.5);
  return (
    <group position={[-0.76, 0, 0]}>
      {FLOORS.map((name, i) => {
        const y = 0.25 + i * 0.95;
        const grow = ramp(t, 0.3 + i * 0.25, 0.6);
        const glow = i === 2 ? hi : 0;
        const chip = ramp(t, FLOOR_AT[i], 0.5);
        return (
          <group key={name} position={[0, y, 0]} scale={[grow + 0.001, 1, grow + 0.001]}>
            <mesh>
              <boxGeometry args={[3.4, 0.34, 2.2]} />
              <meshStandardMaterial color="#454c56" emissive={FG} emissiveIntensity={0.22 * glow} roughness={0.6} metalness={0.15} />
            </mesh>
            {/* the order_id chip that lands on the front edge */}
            <mesh position={[-1.1, 0.34 + (1 - chip) * 1.2, 0.7]} scale={[chip + 0.001, chip + 0.001, chip + 0.001]}>
              <boxGeometry args={[0.46, 0.3, 0.46]} />
              <meshStandardMaterial color={FG} emissive={FG} emissiveIntensity={0.35} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const Towers: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {TOWERS.map((w) => {
      const h = w.mb / 30;
      const r = ramp(t, w.at, 0.9);
      return (
        <group key={w.label}>
          <mesh position={[w.x, (h * r) / 2, 0]} scale={[1, Math.max(0.001, r), 1]}>
            <boxGeometry args={[1.2, h, 1.2]} />
            <meshStandardMaterial color={w.color} emissive={w.color} emissiveIntensity={0.25} roughness={0.35} metalness={0.1} />
          </mesh>
        </group>
      );
    })}
  </group>
);

export const Scene12: React.FC = () => {
  const t = useSec();
  return (
    <Scene id="12">
      <Title t={t} text="One more cost" />
      <Stage pos={[1.0, 5.2, 14.5]} look={[0.2, 1.7, 0]} fov={34}>
        <Floors t={t} />
        <Towers t={t} />
      </Stage>

      {/* floor names, right-aligned against the stack */}
      {FLOORS.map((name, i) => (
        <Show key={name} t={t} at={FLOOR_AT[i]} style={{ left: 120, width: 660, top: [919, 772, 612, 472][i], textAlign: "right" }}>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 46, color: i === 2 && t > 6.1 ? FG : MUTED }}>{name}</span>
        </Show>
      ))}
      <Show t={t} at={2.3} style={{ left: 880, top: 330 }}>
        <span style={{ display: "inline-block", width: 34, height: 34, background: FG, borderRadius: 6, marginRight: 18, verticalAlign: "-4px" }} />
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 52, color: FG }}>order_id</span>
      </Show>
      <Show t={t} at={6.1} style={{ left: 120, top: 1230 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 60, color: FG }}>order_status_history: 3 million rows</span>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED }}>index on order_id</div>
      </Show>

      {/* tower values, below each tower */}
      {TOWERS.map((w, i) => (
        <Show key={w.label} t={t} at={w.at + 0.5} style={{ left: 1546 + i * 301, top: 1060, width: 300, textAlign: "center" }}>
          <Num v={`${w.mb}`} unit="MB" color={w.color === LIGHT ? FG : w.color} size={96} />
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: w.color === LIGHT ? FG : w.color }}>{w.label}</div>
        </Show>
      ))}
    </Scene>
  );
};
export const S12_FRAMES = 461;

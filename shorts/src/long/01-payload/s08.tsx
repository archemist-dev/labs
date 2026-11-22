// Scene 8: the turn. The rename story: the response field price becomes totalPrice, the old app version still asks for
// price and stops. Then deploys in 3D: pods v1 v1 v2 v2 behind a queue, v2 messages flowing to v1; the rollback sinks
// the v2 pods while their messages stay; a Kafka shelf keeps data for months. Then the question.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BG, FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { AMBER, Appear, Block, cl, cue, ease, Muted, proj, Scene, Sfx, Stage, Tag, Title } from "./common";

const Phone: React.FC<{ x: number; label: string; field: string; crash: number; ok?: boolean }> = ({ x, label, field, crash, ok }) => (
  <div style={{ position: "absolute", left: x, top: 330, width: 420, height: 800, borderRadius: 60, background: "#15171a", border: `8px solid ${GRAY}` }}>
    <div style={{ position: "absolute", left: 150, top: 22, width: 120, height: 14, borderRadius: 7, background: "#2c3036" }} />
    <div style={{ position: "absolute", left: 30, top: 80, right: 30, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: MUTED }}>{label}</div>
    <div style={{ position: "absolute", left: 30, top: 170, right: 30, padding: 26, borderRadius: 24, background: "#22262b" }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>Your order</div>
      <div style={{ fontFamily: MONO, fontSize: 34, color: MUTED, marginTop: 12 }}>reads "{field}"</div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: ok ? GREEN : crash > 0.5 ? GRAY : FG, marginTop: 16 }}>£79.94</div>
    </div>
    {crash > 0 ? (
      <div style={{ position: "absolute", left: 30, top: 470, right: 30, padding: 26, borderRadius: 24, background: RED, opacity: crash, transform: `scale(${0.9 + 0.1 * crash})` }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: BG }}>App stopped</div>
        <div style={{ fontFamily: MONO, fontSize: 30, color: BG, marginTop: 8 }}>KeyError: 'price'</div>
      </div>
    ) : null}
  </div>
);

const CAM = { pos: [0, 5.6, 10.5] as [number, number, number], look: [0, 0.4, -2.6] as [number, number, number], fov: 42 };
const p3 = (x: number, y: number, z: number) => proj(CAM.pos, CAM.look, CAM.fov, [x, y, z]);
const PODS = [
  { x: -5.4, v: 1 },
  { x: -3.0, v: 1 },
  { x: 3.0, v: 2 },
  { x: 5.4, v: 2 },
];

export const Turn: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("08", w, n);
  const storyAt = c("field");
  const renameAt = c("became");
  const oldAt = c("Old");
  const crashAt = c("Crash");
  const deployAt = c("only") - 4; // "And it's not only renames": the pods
  const rollAt = c("rollback");
  const kafkaAt = c("Kafka");
  const qAt = c("real") - 6;
  const A = interpolate(frame, [deployAt - 10, deployAt], [1, 0], cl);
  const B = interpolate(frame, [deployAt - 10, deployAt, qAt, qAt + 10], [0, 1, 1, 0], cl);
  const crash = interpolate(frame, [crashAt, crashAt + 8], [0, 1], cl);
  const sink = ease(interpolate(frame, [rollAt, rollAt + 30], [0, 1], cl));
  const shelf = ease(interpolate(frame, [kafkaAt, kafkaAt + 24], [0, 1], cl));
  // messages flow from the v2 side to the v1 side along the queue, one every 0.8 s, 2.4 s each
  const msgs = Array.from({ length: 14 }).map((_, i) => {
    const t0 = deployAt + 20 + i * 24;
    const t = (frame - t0) / 72;
    return { i, t, t0 };
  });
  return (
    <Scene id="08">
      <div style={{ position: "absolute", inset: 0, opacity: A }}>
        <Title text="A field was renamed" at={storyAt - 8} />
        <Appear at={storyAt} style={{ left: 120, top: 360 }}>
          <div style={{ width: 1100, padding: "34px 40px", borderRadius: 28, background: "#262a30", border: `5px solid ${LIGHT}` }}>
            <Muted size={40}>API response · release 2</Muted>
            <div style={{ fontFamily: MONO, fontSize: 60, marginTop: 18, color: FG }}>
              {"{ "}
              <span style={{ color: AMBER, textDecoration: frame >= renameAt ? "line-through" : "none", opacity: frame >= renameAt ? 0.45 : 1 }}>"price"</span>
              {frame >= renameAt ? <span style={{ color: AMBER }}> "totalPrice"</span> : null}
              {": 7994 }"}
            </div>
          </div>
        </Appear>
        <Appear at={oldAt} style={{ left: 0, top: 0 }}>
          <Phone x={1300} label="app v1" field="price" crash={crash} />
        </Appear>
        <Appear at={oldAt + 8} style={{ left: 0, top: 0 }}>
          <Phone x={1820} label="app v2" field="totalPrice" crash={0} ok />
        </Appear>
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: B }}>
        <Stage pos={CAM.pos} look={CAM.look} fov={CAM.fov}>
          {PODS.map((p, i) => {
            const down = p.v === 2 ? sink : 0;
            return <Block key={i} p={[p.x, 0.8 - 2.2 * down, -2.2]} s={[1.7, 1.6, 1.4]} color={p.v === 2 ? GREEN : LIGHT} glow={0.14} opacity={1 - down * 0.85} />;
          })}
          <Block p={[0, -0.04, 0.4]} s={[11.5, 0.08, 1.1]} color="#202328" glow={0} />
          {msgs.map((m) => {
            if (m.t < 0) return null;
            // after the rollback, messages still in the queue stop moving and stay
            const tt = frame >= rollAt ? Math.min(m.t, (rollAt - m.t0) / 72) : m.t;
            if (tt > 1 || tt < 0) return null;
            const x = 4.2 - 8.4 * ease(tt);
            return <Block key={m.i} p={[x, 0.25, 0.4]} s={[0.7, 0.42, 0.7]} color={AMBER} glow={0.18} />;
          })}
          {/* Kafka shelf, kept for months */}
          {shelf > 0
            ? Array.from({ length: 12 }).map((_, i) => (
                <Block key={i} p={[4.2 + (i % 4) * 0.8 - 1.2, 0.3 + Math.floor(i / 4) * 0.55, -2.2]} s={[0.66, 0.42, 0.66]} color={AMBER} glow={0.14} opacity={shelf} />
              ))
            : null}
        </Stage>
        <Title text="Old and new code, side by side" at={deployAt} />
        {PODS.map((p, i) => {
          const s = p3(p.x, 1.8, -2.2);
          return (
            <Appear key={i} at={deployAt + i * 4} style={{ left: s.x, top: s.y - 70, transform: "translateX(-50%)", opacity: p.v === 2 ? 1 - sink : 1 }}>
              <Tag mono size={52} color={p.v === 2 ? GREEN : LIGHT}>v{p.v}</Tag>
            </Appear>
          );
        })}
        {(() => {
          const s = p3(0, 0, 1.2);
          return (
            <Appear at={deployAt + 20} style={{ left: s.x, top: s.y + 20, transform: "translateX(-50%)" }}>
              <Muted size={44}>queue · v2 messages → v1 readers</Muted>
            </Appear>
          );
        })()}
        {(() => {
          const s = p3(3.4, 0, 1.6);
          return (
            <Appear at={rollAt} style={{ left: s.x - 300, top: s.y + 70 }}>
              <Tag size={54} color={RED}>rollback: v2 gone, its data stays</Tag>
            </Appear>
          );
        })()}
        {(() => {
          const s = p3(4.2, 1.9, -2.2);
          return (
            <Appear at={kafkaAt} style={{ left: s.x - 300, top: s.y - 110 }}>
              <Tag size={52} color={AMBER}>Kafka · data lake: kept for months</Tag>
            </Appear>
          );
        })()}
      </div>

      <Appear at={qAt} style={{ left: 0, right: 0, top: 560, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 130, color: FG }}>
          schema change <span style={{ color: MUTED }}>→</span> <span style={{ color: AMBER }}>?</span>
        </div>
      </Appear>
      <Sfx name="buzz" from={crashAt} volume={0.45} />
      <Sfx name="whoosh" from={rollAt} volume={0.3} />
    </Scene>
  );
};

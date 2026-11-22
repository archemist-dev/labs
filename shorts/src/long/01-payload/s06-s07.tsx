// Scene 6: what it's worth. Two availability zones as platforms with a bridge; parcels cross one at a time (1.4 s each,
// sine), a toll on the bridge; the calculation builds in the top band on the spoken words (scale.py: 606 bytes saved,
// $0.01/GB each side, $377 a year at 1,000 RPS, $3,770 at 10,000). Inside one zone, no toll. Then Kafka shrink-wraps
// many parcels into one batch: not measured.
// Scene 7: cheap levels first. A staircase of real sizes (encoding_test.py levels): 2,672 untrimmed, trim 1,076,
// compact 989, gzip 510, Protobuf 470, Protobuf + gzip 416.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GRAY, GREEN, LIGHT, MONO, MUTED, SANS } from "../../theme";
import { AMBER, Appear, Block, Card, cl, cue, ease, Muted, proj, Scene, Sfx, Stage, Tag, Title } from "./common";

const CAM6 = { pos: [0, 8.6, 14.5] as [number, number, number], look: [0, 0, -4.2] as [number, number, number], fov: 40 };
const p6 = (x: number, y: number, z: number) => proj(CAM6.pos, CAM6.look, CAM6.fov, [x, y, z]);

/** A small parcel (green values) at a world position. */
const Mini: React.FC<{ x: number; y?: number; z: number; color?: string; s?: number }> = ({ x, y = 0, z, color = GREEN, s = 1 }) => (
  <group position={[x, y, z]} scale={[s, s, s]}>
    <Block p={[0, 0.07, 0]} s={[1.1, 0.12, 0.8]} color="#2a2e35" glow={0.02} />
    {[-0.36, 0, 0.36].map((dx) => (
      <Block key={dx} p={[dx, 0.35, 0]} s={[0.3, 0.44, 0.66]} color={color} glow={0.16} />
    ))}
  </group>
);

export const Worth: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("06", w, n);
  const savedAt = c("600");
  const rpsAt = c("thousand");
  const azAt = c("crosses");
  const bothAt = c("both");
  const freeAt = c("free");
  const yearAt = c("380");
  const tenAt = c("10");
  const tenYearAt = c("3");
  const kafkaAt = c("Kafka");
  const batchAt = c("batches");
  const notAt = c("didn't");
  const endAt = c("Bytes", 2);
  // parcels cross the bridge one at a time from savedAt until kafkaAt: 1.4 s across, 0.5 s apart
  const CYCLE = 57;
  const crossing = frame >= savedAt && frame < kafkaAt;
  const k = Math.floor((frame - savedAt) / CYCLE);
  const t = ((frame - savedAt) % CYCLE) / 42;
  const bx = -4.2 + 8.4 * ease(t);
  const tollFlash = crossing && t > 0.45 && t < 0.62 ? 1 : 0;
  // inside one zone: a parcel moves along the left platform with no toll
  const inZone = interpolate(frame, [freeAt, freeAt + 40], [0, 1], cl);
  // Kafka: parcels on the right platform gather into one wrapped block
  const wrap = ease(interpolate(frame, [batchAt, batchAt + 30], [0, 1], cl));
  const azA = p6(-5, 0, 2.2);
  const azB = p6(5, 0, 2.2);
  const pile = [
    [3.6, -0.6],
    [4.8, -0.6],
    [6.0, -0.6],
    [3.6, 0.6],
    [4.8, 0.6],
    [6.0, 0.6],
  ];
  return (
    <Scene id="06">
      <Stage pos={CAM6.pos} look={CAM6.look} fov={CAM6.fov}>
        <Block p={[-5, 0.15, 0]} s={[4.6, 0.3, 4]} color="#2b3038" glow={0.03} />
        <Block p={[5, 0.15, 0]} s={[4.6, 0.3, 4]} color="#2b3038" glow={0.03} />
        <Block p={[0, 0.12, 0]} s={[5.4, 0.12, 1.2]} color="#252930" glow={0.02} />
        {/* toll gate */}
        <Block p={[0, 0.9, -0.75]} s={[0.18, 1.6, 0.18]} color={tollFlash ? AMBER : GRAY} glow={tollFlash ? 0.6 : 0.1} />
        <Block p={[0, 0.9, 0.75]} s={[0.18, 1.6, 0.18]} color={tollFlash ? AMBER : GRAY} glow={tollFlash ? 0.6 : 0.1} />
        <Block p={[0, 1.75, 0]} s={[0.18, 0.14, 1.68]} color={tollFlash ? AMBER : GRAY} glow={tollFlash ? 0.6 : 0.1} />
        {crossing ? <Mini x={bx} y={0.3} z={0} /> : null}
        {frame >= freeAt && frame < kafkaAt ? <Mini x={-6.2 + 2.2 * ease(inZone)} y={0.3} z={1.2} color={LIGHT} s={0.8} /> : null}
        {/* parcels that arrived, then wrapped into one batch */}
        {frame >= savedAt
          ? pile.slice(0, Math.min(pile.length, Math.max(0, k))).map(([x, z], i) => (
              <Mini key={i} x={x + (4.8 - x) * wrap * 0.55} y={0.3} z={z * (1 - wrap * 0.45)} s={1 - wrap * 0.3} />
            ))
          : null}
        {wrap > 0 ? <Block p={[4.8, 0.62, 0]} s={[3.2 * (0.6 + 0.4 * wrap), 0.8, 1.9]} color="#8fb4ff" glow={0.1} opacity={0.22 * wrap} /> : null}
      </Stage>
      <Title text="What it's worth" at={0} />
      <Appear at={8} style={{ left: azA.x - 150, top: azA.y + 20 }}>
        <Muted size={48}>zone A</Muted>
      </Appear>
      <Appear at={8} style={{ left: azB.x - 150, top: azB.y + 20 }}>
        <Muted size={48}>zone B</Muted>
      </Appear>
      {/* the calculation, top band right */}
      <div style={{ position: "absolute", left: 1180, top: 110, width: 1300 }}>
        <Appear at={savedAt} style={{ position: "relative" }}>
          <Tag mono size={60}>
            1,076 − 470 = <span style={{ color: GREEN }}>606 B</span>
            <span style={{ fontFamily: SANS, fontSize: 44, color: MUTED }}> saved / order</span>
          </Tag>
        </Appear>
        <Appear at={rpsAt} style={{ position: "relative", marginTop: 14 }}>
          <Tag mono size={60}>
            × 1,000 <span style={{ fontFamily: SANS, fontSize: 44, color: MUTED }}>calls / s</span>
          </Tag>
        </Appear>
        <Appear at={azAt} style={{ position: "relative", marginTop: 14 }}>
          <Muted size={44}>
            every call crosses a zone
            <span style={{ opacity: interpolate(frame, [bothAt, bothAt + 10], [0, 1], cl) }}> · $0.01 / GB each side</span>
          </Muted>
        </Appear>
      </div>
      <Appear at={freeAt} until={kafkaAt} style={{ left: azA.x - 260, top: azA.y + 90 }}>
        <Tag size={52} color={GREEN}>
          inside one zone: <span style={{ fontFamily: MONO, fontWeight: 800 }}>$0</span>
        </Tag>
      </Appear>
      <Appear at={yearAt} style={{ left: 1180, top: 330 }}>
        <Tag mono size={110} color={FG}>
          $377<span style={{ fontFamily: SANS, fontSize: 52, color: MUTED }}> / year</span>
        </Tag>
      </Appear>
      <Appear at={tenAt} style={{ left: 1180, top: 480 }}>
        <Muted size={48}>
          at 10,000 / s: <span style={{ fontFamily: MONO, fontWeight: 800, color: FG, opacity: interpolate(frame, [tenYearAt, tenYearAt + 10], [0, 1], cl) }}>$3,770 / year</span>
        </Muted>
      </Appear>
      <Appear at={kafkaAt} style={{ left: azB.x - 520, top: azB.y + 90 }}>
        <Tag size={52} color="#8fb4ff">Kafka: whole batches compressed</Tag>
      </Appear>
      <Appear at={notAt} style={{ left: azB.x - 520, top: azB.y + 170 }}>
        <Muted size={46}>gap should shrink · not measured</Muted>
      </Appear>
      <Appear at={endAt} style={{ left: 120, top: 1250 }}>
        <Tag size={58}>
          Bytes: real money, <span style={{ color: MUTED }}>not much of it</span>
        </Tag>
      </Appear>
      <Sfx name="reveal" from={yearAt} volume={0.45} />
    </Scene>
  );
};

// ---- Scene 7 ---------------------------------------------------------------------------------------------------

const CAM7 = { pos: [3.2, 5.0, 16.5] as [number, number, number], look: [3.2, 2.0, 0] as [number, number, number], fov: 40 };
const p7 = (x: number, y: number, z: number) => proj(CAM7.pos, CAM7.look, CAM7.fov, [x, y, z]);
const H = 5.2 / 2672; // world height per byte

export const Levels: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("07", w, n);
  const STEPS = [
    { label: "untrimmed", bytes: 2672, at: c("2"), color: LIGHT },
    { label: "trim", bytes: 1076, at: c("1"), color: GREEN },
    { label: "compact", bytes: 989, at: c("989"), color: GREEN },
    { label: "gzip", bytes: 510, at: c("510"), color: GREEN },
    { label: "Protobuf", bytes: 470, at: c("470"), color: GRAY, tag: "migration" },
    { label: "Proto + gzip", bytes: 416, at: c("94"), color: GRAY },
  ];
  const parts = [
    { label: "customer", at: c("customer") },
    { label: "store", at: c("store") },
    { label: "every product", at: c("product") },
    { label: "courier", at: c("courier") },
  ];
  const cutAt = c("60%");
  const fortyAt = c("40");
  const cpuAt = c("CPU");
  const apiAt = c("public");
  const X = (i: number) => -4.6 + i * 2.2;
  return (
    <Scene id="07">
      <Title text="Cheap levels first" at={0} />
      {parts.map((p, i) => (
        <Appear key={p.label} at={p.at} until={c("Trim")} style={{ left: 1180 + [0, 330, 590, 1000][i], top: 110 }}>
          <div style={{ padding: "12px 26px", borderRadius: 40, border: `4px solid ${LIGHT}`, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: FG }}>{p.label}</div>
        </Appear>
      ))}
      <Appear at={c("three")} until={c("Trim")} style={{ left: 1180, top: 210 }}>
        <Muted size={44}>the client shows three of them</Muted>
      </Appear>
      <Stage pos={CAM7.pos} look={CAM7.look} fov={CAM7.fov}>
        {STEPS.map((s, i) => {
          const g = ease(interpolate(frame, [s.at, s.at + 21], [0, 1], cl));
          if (g <= 0) return null;
          const h = s.bytes * H * g;
          return <Block key={s.label} p={[X(i), h / 2, 0]} s={[1.6, Math.max(0.01, h), 1.6]} color={s.color} glow={0.14} />;
        })}
      </Stage>
      {STEPS.map((s, i) => {
        const top = p7(X(i), s.bytes * H, 0);
        const base = p7(X(i), 0, 0.8);
        return (
          <React.Fragment key={s.label}>
            <Appear at={s.at + 12} style={{ left: top.x, top: top.y - 110, transform: "translateX(-50%)" }}>
              <Tag mono size={64} color={s.color === GREEN ? GREEN : FG}>{s.bytes.toLocaleString("en-US")}</Tag>
            </Appear>
            <Appear at={s.at} style={{ left: base.x, top: base.y + 20, transform: "translateX(-50%)", textAlign: "center" }}>
              <Tag size={46} color={s.color === GREEN ? GREEN : LIGHT}>{s.label}</Tag>
              {s.tag ? <Muted size={38}>{s.tag}</Muted> : null}
            </Appear>
          </React.Fragment>
        );
      })}
      {(() => {
        const a = p7(X(1), 1076 * H, 0);
        return (
          <Appear at={cutAt} style={{ left: a.x + 110, top: a.y - 210 }}>
            <Tag mono size={72} color={GREEN}>−60%</Tag>
          </Appear>
        );
      })()}
      {(() => {
        const a = p7((X(3) + X(4)) / 2, 510 * H, 0);
        return (
          <Appear at={fortyAt} style={{ left: a.x, top: a.y - 270, transform: "translateX(-50%)", textAlign: "center" }}>
            <Tag size={54}>
              <span style={{ fontFamily: MONO, fontWeight: 800 }}>40 B</span> more
            </Tag>
            <Muted size={40} style={{ opacity: interpolate(frame, [STEPS[5].at, STEPS[5].at + 10], [0, 1], cl) }}>94 B with gzip on both</Muted>
          </Appear>
        );
      })()}
      <Appear at={cpuAt} style={{ left: 1730, top: 420 }}>
        <Card color={AMBER} style={{ width: 640 }}>
          <Tag size={52}>gzip costs CPU</Tag>
          <Muted size={44} style={{ marginTop: 8 }}>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: FG }}>19.4 µs</span> per order · one setting
          </Muted>
        </Card>
      </Appear>
      <Appear at={apiAt} style={{ left: 1730, top: 700 }}>
        <Card color={GREEN} style={{ width: 640 }}>
          <Tag size={52}>public API, egress</Tag>
          <Muted size={44} style={{ marginTop: 8 }}>gzip saves the bytes</Muted>
        </Card>
      </Appear>
      {STEPS.map((s) => (
        <Sfx key={s.label} name="reveal" from={s.at} volume={0.3} />
      ))}
    </Scene>
  );
};

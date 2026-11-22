// Scene 1: cold hook. One parcel (the JSON order) slides in on a belt from frame 0; Protobuf and Avro parcels join on
// their own rows; the real sizes land on the spoken numbers; "14x" on "14"; on "wrong" the rows dim.
// Scene 3: the test. The order card (real fields, items collapsed so no product names show), three formats, the server.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { AMBER, Appear, Card, cl, cue, ease, Muted, proj, Scene, Sfx, Stage, Stamp, Tag, Title } from "./common";
import { Belt, layout, Parcel, parcelLen } from "./parcel";

const ROWS = [
  { kind: "json" as const, name: "JSON", bytes: 1076, z: -2.2, color: LIGHT },
  { kind: "proto" as const, name: "Protobuf", bytes: 470, z: 0, color: GREEN },
  { kind: "avro" as const, name: "Avro", bytes: 417, z: 2.2, color: LIGHT },
];
const X0 = -1.6; // left edge of every parcel once parked
const CAM = { pos: [0.9, 6.4, 7.8] as [number, number, number], look: [0.9, 0, -0.7] as [number, number, number], fov: 42 };
const at3 = (x: number, z: number) => proj(CAM.pos, CAM.look, CAM.fov, [x, 0.4, z]);

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const joinAt = cue("01", "In"); // the other two parcels slide in
  const sizesAt = cue("01", "half");
  const fastAt = cue("01", "14");
  const wrongAt = cue("01", "wrong");
  const dim = interpolate(frame, [wrongAt, wrongAt + 14], [0, 1], cl);
  // parcel 1 slides from off-screen left to its spot over 2.6 s from frame 0 (sine), belts slide with it
  const slide = (start: number) => ease((frame - start) / 78);
  return (
    <Scene id="01" noFadeIn>
      <Stage pos={CAM.pos} look={CAM.look} fov={CAM.fov}>
        {ROWS.map((r, i) => {
          const start = i === 0 ? 0 : joinAt + (i - 1) * 8;
          const s = slide(start);
          const x = X0 - (i === 0 ? 3.5 : 9) * (1 - s);
          return (
            <group key={r.name}>
              <Belt z={r.z} x0={-12} x1={12} shift={-(i === 0 ? 3.5 : 9) * (1 - s)} />
              {frame >= start - 1 ? <Parcel x={x} z={r.z} segs={layout(r.kind, r.bytes)} dim={i === 1 ? dim * 0.4 : dim} /> : null}
            </group>
          );
        })}
      </Stage>
      {ROWS.map((r, i) => {
        const L = at3(X0 - 0.35, r.z);
        const R = at3(X0 + parcelLen(layout(r.kind, r.bytes)) + 0.35, r.z);
        const col = r.kind === "proto" ? GREEN : FG;
        return (
          <React.Fragment key={r.name}>
            <Appear at={i === 0 ? cue("01", "JSON") : joinAt + (i - 1) * 8 + 40} style={{ left: L.x - 40, top: L.y - 40, transform: "translateX(-100%)" }}>
              <Tag size={68} color={col}>{r.name}</Tag>
            </Appear>
            <Appear at={sizesAt + i * 9} style={{ left: R.x, top: R.y - 50 }}>
              <Tag mono size={84} color={col}>
                {r.bytes.toLocaleString("en-US")}
                <span style={{ fontSize: 46, color: MUTED }}> bytes</span>
                {r.kind === "proto" ? <span style={{ fontFamily: SANS, fontSize: 58, color: GREEN, marginLeft: 40, opacity: interpolate(frame, [fastAt, fastAt + 10], [0, 1], cl) }}><span style={{ fontFamily: MONO, fontWeight: 800 }}>14x</span> faster encode</span> : null}
              </Tag>
            </Appear>
          </React.Fragment>
        );
      })}
      <Stamp at={wrongAt} label="NOT THE REASON" color={RED} size={72} style={{ left: 980, top: 1260 }} />
      <Sfx name="whoosh" from={2} volume={0.35} />
      <Sfx name="reveal" from={sizesAt} volume={0.4} />
      <Sfx name="stamp" from={wrongAt} volume={0.5} />
    </Scene>
  );
};

// ---- Scene 3 ---------------------------------------------------------------------------------------------------

const ORDER_LINES: { k: string; v: string; at: string; nth?: number }[] = [
  { k: "order_id", v: "48213377", at: "order" },
  { k: "currency", v: '"GBP"', at: "order" },
  { k: "total", v: "7994", at: "order" },
  { k: "items", v: "[ 3 items, modifiers ]", at: "items" },
  { k: "address", v: '{ "East Rd", "Cambridge", … }', at: "address" },
  { k: "status_history", v: "[ CREATED … DELIVERED ]", at: "status" },
];

export const TheTest: React.FC = () => {
  const frame = useCurrentFrame();
  const fmts = [
    { name: "JSON", at: cue("03", "JSON") },
    { name: "Protobuf", at: cue("03", "protobuf") },
    { name: "Avro", at: cue("03", "avro") },
  ];
  const serverAt = cue("03", "AWS");
  const timesAt = cue("03", "35");
  const measAt = cue("03", "bytes");
  const encAt = cue("03", "write");
  const decAt = cue("03", "read");
  return (
    <Scene id="03">
      <Title text="The test" at={0} />
      <Appear at={cue("03", "order")} style={{ left: 120, top: 300 }}>
        <Card style={{ width: 1180, padding: "36px 44px" }}>
          <Muted size={40}>order_typical.json</Muted>
          <div style={{ marginTop: 18 }}>
            {ORDER_LINES.map((l, i) => {
              const at = cue("03", l.at);
              const o = interpolate(frame, [at + i * 3, at + i * 3 + 10], [0, 1], cl);
              return (
                <div key={l.k} style={{ fontFamily: MONO, fontSize: 46, lineHeight: 1.75, opacity: o, whiteSpace: "nowrap" }}>
                  <span style={{ color: AMBER }}>"{l.k}"</span>
                  <span style={{ color: MUTED }}>: </span>
                  <span style={{ color: FG }}>{l.v}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </Appear>
      {fmts.map((f, i) => (
        <Appear key={f.name} at={f.at} style={{ left: 1420 + i * 360, top: 330 }}>
          <div style={{ width: 320, padding: "26px 0", textAlign: "center", borderRadius: 22, border: `5px solid ${LIGHT}`, fontFamily: SANS, fontWeight: 800, fontSize: 54, color: FG }}>{f.name}</div>
        </Appear>
      ))}
      <Appear at={serverAt} style={{ left: 1420, top: 560 }}>
        <Card style={{ width: 1000 }}>
          <Tag size={56}>AWS EC2 t3.micro</Tag>
          <Muted size={40} style={{ marginTop: 10 }}>Frankfurt · Intel Xeon 8259CL · 2 vCPU</Muted>
          <Muted size={40}>Python 3.14 · protobuf 7.36 · fastavro 1.13</Muted>
        </Card>
      </Appear>
      <Appear at={timesAt} style={{ left: 1420, top: 900 }}>
        <Tag mono size={84} color={FG}>
          × 35,000 <span style={{ fontFamily: SANS, fontSize: 48, color: MUTED, fontWeight: 700 }}>each · median of 7 runs</span>
        </Tag>
      </Appear>
      {[
        { label: "bytes", at: measAt },
        { label: "encode µs", at: encAt },
        { label: "decode µs", at: decAt },
      ].map((m, i) => (
        <Appear key={m.label} at={m.at} style={{ left: 1420 + [0, 250, 600][i], top: 1080 }}>
          <div style={{ padding: "14px 30px", borderRadius: 40, background: "#262a30", border: `4px solid ${GRAY}`, fontFamily: MONO, fontWeight: 700, fontSize: 44, color: FG }}>{m.label}</div>
        </Appear>
      ))}
    </Scene>
  );
};

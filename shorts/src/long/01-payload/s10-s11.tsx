// Scene 10: the guards. One card per format with the real rule as code: JSON readers with a default and a written
// contract; Protobuf `reserved 8` and a CI breaking-change check that blocks a reused number; Avro a schema registry with
// a compatibility check. MessagePack and CBOR as a side note (no measured number: placed, not sized). Wire only.
// Scene 11: decision by reader, the trade-off as a balance (3D), the principle, the labs link, the comment question.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { AMBER, Appear, Block, Card, cl, cue, ease, Muted, Scene, Sfx, Stage, Tag, Title } from "./common";

const Code: React.FC<{ lines: string[]; size?: number }> = ({ lines, size = 40 }) => (
  <div style={{ marginTop: 18, padding: "18px 22px", borderRadius: 16, background: "#1b1d21", fontFamily: MONO, fontSize: size, lineHeight: 1.5, color: FG, whiteSpace: "pre" }}>
    {lines.map((l, i) => (
      <div key={i} style={{ color: /reserved|default/.test(l) ? GREEN : FG }}>{l}</div>
    ))}
  </div>
);

export const Guards: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("10", w, n);
  const jsonAt = c("JSON");
  const contractAt = c("OpenAPI");
  const protoAt = c("Protobuf");
  const ciAt = c("breaking");
  const avroAt = c("Avro");
  const compatAt = c("compatibility");
  const mpAt = c("MessagePack");
  const wireAt = c("These");
  const stateAt = c("state");
  const W = 760;
  const ci = interpolate(frame, [ciAt, ciAt + 10], [0, 1], cl);
  return (
    <Scene id="10">
      <Title text="The guards" at={0} />
      <Appear at={jsonAt} style={{ left: 100, top: 290 }}>
        <Card color={LIGHT} style={{ width: W, height: 640 }}>
          <Tag size={60}>JSON</Tag>
          <Code lines={['tip = d.get("tip", 0)']} />
          <div style={{ opacity: interpolate(frame, [contractAt, contractAt + 10], [0, 1], cl), marginTop: 26 }}>
            <Muted size={44}>written contract</Muted>
            <Tag size={50} style={{ marginTop: 6 }}>OpenAPI · JSON Schema</Tag>
          </div>
        </Card>
      </Appear>
      <Appear at={protoAt} style={{ left: 900, top: 290 }}>
        <Card color={GREEN} style={{ width: W, height: 640 }}>
          <Tag size={60} color={GREEN}>Protobuf</Tag>
          <Code lines={["message Order {", "  reserved 8;", "  int64 tip = 12;", "}"]} />
          <div style={{ marginTop: 22, opacity: ci, display: "flex", alignItems: "center", gap: 18, padding: "14px 20px", borderRadius: 16, border: `4px solid ${RED}` }}>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: RED }}>✕</span>
            <span style={{ fontFamily: MONO, fontSize: 34, color: FG }}>CI: field 8 reused · merge blocked</span>
          </div>
        </Card>
      </Appear>
      <Appear at={avroAt} style={{ left: 1700, top: 290 }}>
        <Card color={AMBER} style={{ width: W, height: 640 }}>
          <Tag size={60} color={AMBER}>Avro</Tag>
          <Muted size={44} style={{ marginTop: 14 }}>schema registry</Muted>
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            {["Order v1", "v2", "v3"].map((v, i) => (
              <div key={v} style={{ padding: "12px 22px", borderRadius: 14, background: "#1b1d21", border: `3px solid ${i === 2 ? AMBER : GRAY}`, fontFamily: MONO, fontSize: 38, color: FG, opacity: interpolate(frame, [avroAt + 10 + i * 8, avroAt + 20 + i * 8], [0, 1], cl) }}>
                {v}
              </div>
            ))}
          </div>
          <Code size={34} lines={['{"name": "tip",', ' "type": "long",', ' "default": 0}']} />
          <div style={{ marginTop: 18, opacity: interpolate(frame, [compatAt, compatAt + 10], [0, 1], cl) }}>
            <Tag size={46} color={GREEN}>✓ compatibility check</Tag>
          </div>
        </Card>
      </Appear>
      <Appear at={mpAt} style={{ left: 100, top: 980 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <Tag size={52}>MessagePack · CBOR</Tag>
          <Muted size={44}>binary, names still sent</Muted>
          <div style={{ position: "relative", width: 900, height: 80, marginLeft: 20 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 38, height: 6, borderRadius: 3, background: GRAY }} />
            <div style={{ position: "absolute", left: 0, top: -6, fontFamily: SANS, fontWeight: 700, fontSize: 38, color: LIGHT }}>JSON</div>
            <div style={{ position: "absolute", right: 0, top: -6, fontFamily: SANS, fontWeight: 700, fontSize: 38, color: GREEN }}>Protobuf</div>
            <div style={{ position: "absolute", left: 400, top: 26, width: 30, height: 30, borderRadius: 15, background: FG }} />
            <div style={{ position: "absolute", left: 300, top: 70, fontFamily: SANS, fontSize: 32, color: MUTED }}>usually between · not tested</div>
          </div>
        </div>
      </Appear>
      <Appear at={wireAt} style={{ left: 100, top: 1180 }}>
        <Tag size={54}>
          <span style={{ color: GREEN }}>✓ the wire</span>
          <span style={{ color: MUTED, opacity: interpolate(frame, [stateAt, stateAt + 10], [0, 1], cl) }}> · stream state and tables: their own rules</span>
        </Tag>
      </Appear>
      <Sfx name="buzz" from={ciAt + 4} volume={0.3} />
    </Scene>
  );
};

// ---- Scene 11 --------------------------------------------------------------------------------------------------

const BCAM = { pos: [0, 4.6, 11.5] as [number, number, number], look: [0, 3.3, 0] as [number, number, number], fov: 38 };

export const Decision: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("11", w, n);
  const rows = [
    { who: "public API", sub: "clients you don't control", what: "JSON + gzip + contract", at: c("public"), ans: c("JSON") },
    { who: "your own services", sub: "you deploy both sides", what: "Protobuf + reserved + CI check", at: c("own"), ans: c("Protobuf") },
    { who: "data that lives for months", sub: "Kafka · data lake", what: "Avro + schema registry", at: c("Data", 2), ans: c("Avro") },
  ];
  const tradeAt = c("trade");
  const prinAt = c("Pick");
  const linkAt = c("test");
  const qAt = c("worst");
  const A = interpolate(frame, [tradeAt - 10, tradeAt], [1, 0], cl);
  const B = interpolate(frame, [tradeAt - 10, tradeAt, prinAt - 8, prinAt + 2], [0, 1, 1, 0], cl);
  const C = interpolate(frame, [prinAt - 8, prinAt + 2], [0, 1], cl);
  const costs = [
    { label: "no readable payloads in logs or curl", at: c("log") },
    { label: "schema tooling", at: c("tooling") },
    { label: "rules the team must learn", at: c("rules") },
  ];
  const nCost = costs.filter((k) => frame >= k.at).length;
  const tilt = ease(interpolate(frame, [tradeAt, tradeAt + 30], [0, 1], cl)) * 0.12 - nCost * 0.04;
  return (
    <Scene id="11">
      <div style={{ position: "absolute", inset: 0, opacity: A }}>
        <Title text="Who reads your data?" at={0} />
        {rows.map((r, i) => (
          <div key={r.who} style={{ position: "absolute", left: 120, top: 360 + i * 270, display: "flex", alignItems: "center" }}>
            <Appear at={r.at} style={{ position: "relative", width: 1000 }}>
              <Tag size={66}>{r.who}</Tag>
              <Muted size={44}>{r.sub}</Muted>
            </Appear>
            <Appear at={r.ans - 6} style={{ position: "relative", width: 120 }}>
              <Tag size={70} color={MUTED}>→</Tag>
            </Appear>
            <Appear at={r.ans} style={{ position: "relative" }}>
              <div style={{ padding: "22px 36px", borderRadius: 24, border: `5px solid ${GREEN}`, background: "#20352a", fontFamily: SANS, fontWeight: 800, fontSize: 60, color: GREEN }}>{r.what}</div>
            </Appear>
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: B }}>
        <Stage pos={BCAM.pos} look={BCAM.look} fov={BCAM.fov}>
          <Block p={[0, 0.9, 0]} s={[0.5, 1.8, 0.5]} color={GRAY} glow={0.05} />
          <group position={[0, 1.9, 0]} rotation={[0, 0, tilt]}>
            <Block p={[0, 0, 0]} s={[7.6, 0.16, 0.4]} color={LIGHT} glow={0.06} />
            <group position={[-3.4, 0.1, 0]}>
              <Block p={[0, 0, 0]} s={[2.2, 0.1, 1.4]} color="#2a2e35" glow={0.02} />
              {[0, 1, 2].map((k) => (
                <Block key={k} p={[-0.6 + k * 0.6, 0.3, 0]} s={[0.5, 0.5, 0.5]} color={GREEN} glow={0.16} />
              ))}
            </group>
            <group position={[3.4, 0.1, 0]}>
              <Block p={[0, 0, 0]} s={[2.2, 0.1, 1.4]} color="#2a2e35" glow={0.02} />
              {costs.slice(0, nCost).map((_, k) => (
                <Block key={k} p={[-0.6 + k * 0.6, 0.3, 0]} s={[0.5, 0.5, 0.5]} color={GRAY} glow={0.1} />
              ))}
            </group>
          </group>
        </Stage>
        <Title text="The trade-off" at={tradeAt} />
        <Appear at={tradeAt + 6} style={{ left: 140, top: 330 }}>
          <div style={{ width: 760 }}>
            <Tag size={56} color={GREEN}>gains</Tag>
            {["safe schema changes", "smaller", "faster"].map((g) => (
              <Muted key={g} size={46} style={{ color: FG, marginTop: 6 }}>{g}</Muted>
            ))}
          </div>
        </Appear>
        <div style={{ position: "absolute", left: 1560, top: 330, width: 900 }}>
          <Appear at={costs[0].at - 6} style={{ position: "relative" }}>
            <Tag size={56} color={LIGHT}>costs</Tag>
          </Appear>
          {costs.map((k) => (
            <Appear key={k.label} at={k.at} style={{ position: "relative", marginTop: 6 }}>
              <Muted size={46} style={{ color: FG }}>{k.label}</Muted>
            </Appear>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: C }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center" }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 104, color: FG, lineHeight: 1.15 }}>
            Pick the encoding by who reads the data
            <br />
            and how long it lives.
          </div>
          <div style={{ margin: "34px auto 0", width: 260 * interpolate(frame, [prinAt + 10, prinAt + 30], [0, 1], cl), height: 10, borderRadius: 5, background: GOLD }} />
        </div>
        <Appear at={linkAt} style={{ left: 0, right: 0, top: 790, textAlign: "center" }}>
          <Muted size={48}>
            Code and results: <span style={{ fontFamily: MONO, color: FG }}>github.com/archemist-dev/labs</span> · 01-payload-encoding
          </Muted>
        </Appear>
        <Appear at={qAt} style={{ left: 0, right: 0, top: 960, display: "flex", justifyContent: "center" }}>
          <Card color={AMBER} style={{ padding: "28px 48px" }}>
            <Tag size={60}>What's the worst schema change you've seen ship?</Tag>
          </Card>
        </Appear>
      </div>
      <Sfx name="reveal" from={prinAt} volume={0.4} />
    </Scene>
  );
};

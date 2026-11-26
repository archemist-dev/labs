// Scene 10: the decision as a path (who holds old copies, and the limit for each), the trade-off as a balance (3D),
// the principle, the labs link and the one ask: the comment question.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, SANS } from "../../theme";
import { AMBER, Appear, Block, Card, cl, cue, ease, Muted, Scene, Sfx, Stage, Tag, Title } from "./common";

const BCAM = { pos: [0, 4.6, 11.5] as [number, number, number], look: [0, 3.3, 0] as [number, number, number], fov: 38 };

export const Decision: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("10", w, n);
  const rows = [
    { who: "every app role", what: "an idle timeout", at: c("idle") },
    { who: "every role", what: "its own statement timeout", at: c("statement") },
    { who: "slow filters", what: "an index", at: c("index") },
    { who: "reports that need minutes", what: "a replica · feedback off", at: c("minutes") },
    { who: "reports that need hours", what: "a warehouse", at: c("hours") },
    { who: "an alert", what: "oldest open transaction · disk growth", at: c("alert") },
  ];
  const tradeAt = c("trade-off");
  const prinAt = c("Postgres");
  const linkAt = c("script");
  const qAt = c("longest");
  const A = interpolate(frame, [tradeAt - 10, tradeAt], [1, 0], cl);
  const B = interpolate(frame, [tradeAt - 10, tradeAt, prinAt - 8, prinAt + 2], [0, 1, 1, 0], cl);
  const C = interpolate(frame, [prinAt - 8, prinAt + 2], [0, 1], cl);
  const costs = [
    { label: "long jobs need their own role and limit", at: c("migration") },
    { label: "cancelled reports, or a late replica", at: c("cancels") },
    { label: "indexes cost write time", at: c("indexes") },
  ];
  const nCost = costs.filter((k) => frame >= k.at).length;
  const tilt = ease(interpolate(frame, [tradeAt, tradeAt + 30], [0, 1], cl)) * 0.12 - nCost * 0.04;
  return (
    <Scene id="10">
      <div style={{ position: "absolute", inset: 0, opacity: A }}>
        <Title text="Limit who can hold old copies" at={0} />
        {rows.map((r, i) => (
          <Appear key={r.who} at={r.at} style={{ left: 120, top: 300 + i * 172, display: "flex", alignItems: "center" }}>
            <div style={{ width: 880, fontFamily: SANS, fontWeight: 700, fontSize: 58, color: FG }}>{r.who}</div>
            <div style={{ width: 110, fontFamily: SANS, fontWeight: 700, fontSize: 60, color: MUTED }}>→</div>
            <div style={{ padding: "18px 34px", borderRadius: 22, border: `5px solid ${GREEN}`, background: "#20352a", fontFamily: SANS, fontWeight: 800, fontSize: 54, color: GREEN, whiteSpace: "nowrap" }}>{r.what}</div>
          </Appear>
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
            {["tables stay small", "scans stay fast", "no surprise on the disk"].map((g) => (
              <Muted key={g} size={46} style={{ color: FG, marginTop: 6 }}>{g}</Muted>
            ))}
          </div>
        </Appear>
        <div style={{ position: "absolute", left: 1500, top: 330, width: 960 }}>
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
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 116, color: FG, lineHeight: 1.15 }}>
            In Postgres, a long read
            <br />
            is a write problem.
          </div>
          <div style={{ margin: "34px auto 0", width: 260 * interpolate(frame, [prinAt + 10, prinAt + 30], [0, 1], cl), height: 10, borderRadius: 5, background: GOLD }} />
        </div>
        <Appear at={linkAt} style={{ left: 0, right: 0, top: 810, textAlign: "center" }}>
          <Muted size={48}>
            Code and results: <span style={{ fontFamily: MONO, color: FG }}>github.com/archemist-dev/labs</span> · 08-table-bloat
          </Muted>
        </Appear>
        <Appear at={qAt} style={{ left: 0, right: 0, top: 980, display: "flex", justifyContent: "center" }}>
          <Card color={AMBER} style={{ padding: "28px 48px" }}>
            <Tag size={56}>What's the longest transaction running on your primary right now?</Tag>
          </Card>
        </Appear>
      </div>
      <Sfx name="reveal" from={prinAt} volume={0.4} />
    </Scene>
  );
};

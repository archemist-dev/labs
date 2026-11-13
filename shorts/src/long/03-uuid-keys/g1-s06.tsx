// Scene 6: the test. The orders table times 10,000,000 with three ID variants, the server card, then why the memory
// cap is on purpose (a cliff that a big server only moves further out). Server facts: labs 03-uuid-keys README.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Appear, Card, cl, cue, Muted, Scene, Sfx, Tag, useT } from "./g1-common";

const id = "06";
const C = {
  rows: cue(id, "rows"),
  million: cue(id, "million"),
  three: cue(id, "three"),
  only: cue(id, "only"),
  counter: cue(id, "counter"),
  random: cue(id, "random"),
  v7: cue(id, "uuid", 2),
  server: cue(id, "server"),
  postgres: cue(id, "postgres", 2),
  capped: cue(id, "capped"),
  purpose: cue(id, "purpose"),
  big: cue(id, "big"),
  later: cue(id, "later"),
  down: cue(id, "down"),
  ten: cue(id, "10", 2),
  happen: cue(id, "happen"),
};
const P1_END = C.server - 10; // table scene ends where the server card starts
const P2_END = C.purpose - 20;

// ---- phase 1: the table ----------------------------------------------------------------------------------------------

const COLS = [
  { k: "id", w: 250 },
  { k: "status", w: 330 },
  { k: "total_pence", w: 330 },
  { k: "placed_at", w: 480 },
  { k: "address", w: 700 },
];
const ROW = ["?", "DELIVERED", "1199", "2026-10-27 18:04", "East Rd, Cambridge CB1 1PT"];

const OrdersTable: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const frame = useCurrentFrame();
  const idPulse = interpolate(frame, [C.only, C.only + 8, C.only + 40], [0, 1, 0.35], cl);
  return (
    <Card color={LIGHT} style={{ width: 2120, ...style }}>
      <Tag size={46} color={MUTED} style={{ letterSpacing: 3, marginBottom: 14 }}>
        orders
      </Tag>
      <div style={{ display: "flex" }}>
        {COLS.map((c, i) => (
          <div key={c.k} style={{ width: c.w, fontFamily: MONO, fontWeight: 700, fontSize: 38, color: i === 0 && idPulse > 0.05 ? FG : MUTED, borderBottom: `4px solid ${i === 0 ? mixFG(idPulse) : GRAY}`, paddingBottom: 10 }}>
            {c.k}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 16 }}>
        {ROW.map((v, i) => (
          <div key={i} style={{ width: COLS[i].w, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: FG, background: i === 0 ? `rgba(242,239,233,${0.14 * idPulse})` : "transparent", borderRadius: 8 }}>
            {v}
          </div>
        ))}
      </div>
    </Card>
  );
};
const mixFG = (t: number) => `rgba(242,239,233,${0.3 + 0.7 * t})`;

const Phase1: React.FC = () => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, 10, P1_END - 6, P1_END + 6], [0, 1, 1, 0], cl);
  const times = useT(C.million, C.million + 14);
  const stack = useT(C.three, C.three + 14);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      {/* three runs: two ghost copies behind the table */}
      {[2, 1].map((n) => (
        <div key={n} style={{ position: "absolute", left: 220 - 22 * n * stack, top: 220 - 22 * n * stack, opacity: 0.55 * stack }}>
          <OrdersTable />
        </div>
      ))}
      <OrdersTable style={{ position: "absolute", left: 220, top: 220 }} />
      <Appear at={C.million - 4} style={{ left: 230, top: 560 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 190, color: FG, transform: `scale(${0.85 + 0.15 * times})`, transformOrigin: "left center" }}>
          × 10,000,000
        </div>
      </Appear>
      <Appear at={C.three} style={{ left: 1780, top: 600 }}>
        <Tag size={90} color={LIGHT} style={{ fontWeight: 800 }}>3 runs</Tag>
      </Appear>
      {/* the three ID variants */}
      {[
        { at: C.counter, name: "bigint", sub: "counter", sample: "1042", color: LIGHT },
        { at: C.random, name: "UUIDv4", sub: "random", sample: "7c1e9b2a-4f3d-…", color: RED },
        { at: C.v7, name: "UUIDv7", sub: "time-ordered", sample: "019a3c10-8e5b-7…", color: GREEN },
      ].map((v, i) => (
        <Appear key={v.name} at={v.at - 4} style={{ left: 220 + i * 720, top: 900 }}>
          <Card color={v.color} style={{ width: 660 }}>
            <Tag size={64} color={v.color} style={{ fontWeight: 800 }}>
              {v.name} <span style={{ fontSize: 40, color: MUTED, fontWeight: 400 }}>{v.sub}</span>
            </Tag>
            <Tag mono size={44} color={FG} style={{ marginTop: 10 }}>{v.sample}</Tag>
          </Card>
        </Appear>
      ))}
      <Sfx name="stamp" from={C.million} volume={0.35} />
      <Sfx name="reveal" from={C.v7 - 4} volume={0.3} />
    </div>
  );
};

// ---- phase 2: the server ---------------------------------------------------------------------------------------------

const Phase2: React.FC = () => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [C.server - 8, C.server + 4, P2_END, P2_END + 10], [0, 1, 1, 0], cl);
  const cap = useT(C.capped, C.capped + 24);
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Appear at={C.server - 4} style={{ left: 200, top: 260 }}>
        <Card color={LIGHT} style={{ width: 1000, padding: "40px 50px" }}>
          <Muted size={40} style={{ letterSpacing: 3 }}>SERVER</Muted>
          <Tag size={96} color={FG} style={{ fontWeight: 800, marginTop: 8 }}>AWS EC2 t3.small</Tag>
          <Tag size={56} color={LIGHT} style={{ marginTop: 20 }}>Frankfurt · eu-central-1</Tag>
          <Tag mono size={50} color={LIGHT} style={{ marginTop: 18 }}>Intel Xeon 8259CL</Tag>
          <Tag mono size={50} color={LIGHT} style={{ marginTop: 6 }}>2 vCPU · 2 GB</Tag>
        </Card>
      </Appear>
      <Appear at={C.postgres - 4} style={{ left: 1340, top: 260 }}>
        <Card color={GREEN} style={{ width: 1000, padding: "40px 50px" }}>
          <Muted size={40} style={{ letterSpacing: 3 }}>DATABASE</Muted>
          <Tag size={96} color={FG} style={{ fontWeight: 800, marginTop: 8 }}>PostgreSQL 18.6</Tag>
          {/* memory: the cap against the server's 2 GB */}
          <div style={{ marginTop: 40, fontFamily: SANS, fontWeight: 700, fontSize: 46, color: MUTED }}>memory</div>
          <div style={{ marginTop: 14, position: "relative", height: 56, borderRadius: 14, background: "#3a4049", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${25 * cap}%`, background: GREEN }} />
          </div>
          <div style={{ marginTop: 18, fontFamily: MONO, fontWeight: 800, fontSize: 88, color: GREEN, opacity: cap }}>cap 512 MB</div>
        </Card>
      </Appear>
    </div>
  );
};

// ---- phase 3: the cap is on purpose ------------------------------------------------------------------------------------

const X0 = 360;
const W = 1500;
const BASE = 1040;
const H = 560;
const cliff = (t: number, at: number) => 0.9 - 0.82 / (1 + Math.exp(-(t - at) * 26));
const curve = (at: number) =>
  Array.from({ length: 141 }, (_, i) => {
    const t = i / 140;
    return `${i === 0 ? "M" : "L"}${(X0 + t * W).toFixed(1)} ${(BASE - cliff(t, at) * H).toFixed(1)}`;
  }).join(" ");

const Phase3: React.FC = () => {
  const frame = useCurrentFrame();
  const a = useT(P2_END + 4, P2_END + 18);
  const dA = useT(C.purpose, C.purpose + 26);
  const dB = useT(C.big, C.big + 40);
  const mark = useT(C.ten, C.ten + 14);
  const pulse = interpolate(frame, [C.happen, C.happen + 8, C.happen + 24], [0, 1, 0.4], cl);
  const xa = X0 + 0.38 * W;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <svg width={2560} height={1440} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={X0} y1={BASE + 6} x2={X0 + W} y2={BASE + 6} stroke={GRAY} strokeWidth={4} />
        <line x1={X0 - 6} y1={BASE + 6} x2={X0 - 6} y2={BASE - H - 60} stroke={GRAY} strokeWidth={4} />
        <text x={X0 - 40} y={BASE - H / 2} fill={MUTED} fontFamily={SANS} fontWeight={700} fontSize={44} textAnchor="middle" transform={`rotate(-90 ${X0 - 40} ${BASE - H / 2})`}>
          inserts per second
        </text>
        <text x={X0 + W / 2} y={BASE + 80} fill={MUTED} fontFamily={SANS} fontWeight={700} fontSize={44} textAnchor="middle">rows in the table</text>
        <path d={curve(0.38)} fill="none" stroke={RED} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - dA} />
        <path d={curve(0.84)} fill="none" stroke={LIGHT} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - dB} />
        <line x1={xa} y1={BASE + 6} x2={xa} y2={BASE - H - 20} stroke={FG} strokeWidth={5} strokeDasharray="16 14" opacity={mark} />
        <circle cx={xa} cy={BASE - cliff(0.38, 0.38) * H} r={20 + 8 * pulse} fill={RED} opacity={mark} />
      </svg>
      <Appear at={C.purpose} style={{ left: 440, top: 250 }}>
        <Tag size={64} color={RED} style={{ fontWeight: 800 }}>512 MB cap</Tag>
      </Appear>
      <Appear at={C.big} style={{ left: 1280, top: 250 }}>
        <Tag size={64} color={LIGHT} style={{ fontWeight: 800 }}>big server</Tag>
      </Appear>
      <Appear at={C.later} style={{ left: 1220, top: 380 }}>
        <Tag size={56} color={LIGHT}>much later →</Tag>
      </Appear>
      <Appear at={C.ten} style={{ left: xa + 40, top: 760 }}>
        <Tag mono size={76} color={FG}>10,000,000</Tag>
        <Muted size={44}>rows</Muted>
      </Appear>
      <Appear at={C.ten} style={{ left: 1980, top: 300 }}>
        <Card color={FG} style={{ width: 460 }}>
          <Tag size={56} color={FG} style={{ fontWeight: 800 }}>the cap brings the cliff to you</Tag>
        </Card>
      </Appear>
    </div>
  );
};

export const TheTest: React.FC = () => (
  <Scene id="06">
    <Phase1 />
    <Phase2 />
    <Phase3 />
  </Scene>
);

// Scene 5: the slowdown. A latency chart (no axis numbers) whose peaks rise week by week, Production with a query list
// where nothing is slow, a bigger server that helps for a while, then the unproven suspect: random keys.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Rack } from "../../shorts/03-uuid-keys/Short1";
import { FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Appear, Card, cl, cue, Muted, Scene, Sfx, Stage, Tag, useT } from "./g1-common";

const id = "05";
const C = {
  grew: cue(id, "grew"),
  latency: cue(id, "latency"),
  peak: cue(id, "peak"),
  hours: cue(id, "hours"),
  spikes: cue(id, "spikes"),
  should: cue(id, "should"),
  prod: cue(id, "and") - 4, // Production's line starts at "And"
  query: cue(id, "query"),
  first: cue(id, "first"),
  bigger: cue(id, "bigger"),
  helped: cue(id, "helped"),
  but: cue(id, "but"),
  budget: cue(id, "budget"),
  explain: cue(id, "explain"),
  cause: cue(id, "cause", 2),
  random: cue(id, "random"),
  suspect: cue(id, "suspect"),
  tested: cue(id, "tested"),
};
const PROD_END = C.first - 6;

// ---- the chart -------------------------------------------------------------------------------------------------------

const X0 = 800;
const W = 1520;
const BASE = 1090;
const H = 700;
const g = (t: number, m: number, s: number) => Math.exp(-((t - m) ** 2) / (2 * s * s));
const lat = (t: number, p: number, spike = 0) => 0.1 + p * (g(t, 0.38, 0.075) + 0.85 * g(t, 0.74, 0.085)) + spike * g(t, 0.56, 0.018);
const path = (p: number, spike = 0) =>
  Array.from({ length: 161 }, (_, i) => {
    const t = i / 160;
    return `${i === 0 ? "M" : "L"}${(X0 + t * W).toFixed(1)} ${(BASE - lat(t, p, spike) * H).toFixed(1)}`;
  }).join(" ");

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

const Curve: React.FC<{ p: number; color: string; draw: number; spike?: number; width?: number; opacity?: number }> = ({ p, color, draw, spike = 0, width = 9, opacity = 1 }) => (
  <path d={path(p, spike)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} opacity={opacity} />
);

const Chart: React.FC = () => {
  const frame = useCurrentFrame();
  const inA = useT(4, 16);
  // dim while Production speaks, back for the server story, out for the suspect
  const dim = interpolate(frame, [C.prod, C.prod + 10, PROD_END, PROD_END + 10, C.cause - 6, C.cause + 8], [1, 0.12, 0.12, 1, 1, 0], cl);
  const d1 = useT(C.latency, C.latency + 24);
  const d2 = useT(C.peak, C.peak + 24);
  const d3 = useT(C.hours, C.hours + 24);
  const sp = useT(C.spikes, C.spikes + 10);
  // after the first fix: peaks drop on "helped", creep back from "but"
  const second = frame >= C.first;
  const creep = Math.max(C.but, C.helped + 30);
  const p = interpolate(frame, [C.helped, C.helped + 26, creep, C.explain], [0.78, 0.32, 0.32, 0.76], cl);
  const pc = interpolate(frame, [creep, C.explain], [0, 1], cl);
  const hp = interpolate(frame, [C.helped, C.helped + 26], [0, 1], cl);
  const color = mix(mix(RED, GREEN, hp), RED, pc);
  return (
    <svg width={2560} height={1440} style={{ position: "absolute", left: 0, top: 0, opacity: dim * inA }}>
      <line x1={X0} y1={BASE + 6} x2={X0 + W} y2={BASE + 6} stroke={GRAY} strokeWidth={4} />
      <line x1={X0 - 6} y1={BASE + 6} x2={X0 - 6} y2={BASE - H - 20} stroke={GRAY} strokeWidth={4} />
      <text x={X0 - 40} y={BASE - H / 2} fill={MUTED} fontFamily={SANS} fontWeight={700} fontSize={44} textAnchor="middle" transform={`rotate(-90 ${X0 - 40} ${BASE - H / 2})`}>
        latency
      </text>
      <text x={X0 + W * 0.38} y={BASE + 62} fill={MUTED} fontFamily={SANS} fontWeight={700} fontSize={42} textAnchor="middle">lunch</text>
      <text x={X0 + W * 0.74} y={BASE + 62} fill={MUTED} fontFamily={SANS} fontWeight={700} fontSize={42} textAnchor="middle">dinner</text>
      {!second ? (
        <>
          <Curve p={0.3} color={LIGHT} draw={d1} opacity={0.55} />
          <Curve p={0.5} color={mix(LIGHT, RED, 0.5)} draw={d2} opacity={0.75} />
          <Curve p={0.78} color={RED} draw={d3} spike={0} />
          {sp > 0 ? (
            <path d={`M${X0 + W * 0.56 - 40} ${BASE - lat(0.56, 0.78) * H + 6} L${X0 + W * 0.56} ${BASE - (lat(0.56, 0.78) + 0.5 * sp) * H} L${X0 + W * 0.56 + 40} ${BASE - lat(0.56, 0.78) * H + 6}`} fill="none" stroke={RED} strokeWidth={11} strokeLinejoin="round" strokeLinecap="round" />
          ) : null}
          {sp > 0.6 ? (
            <text x={X0 + W * 0.56 + 70} y={BASE - (lat(0.56, 0.78) + 0.4) * H} fill={FG} fontFamily={SANS} fontWeight={800} fontSize={52}>load spike</text>
          ) : null}
        </>
      ) : (
        <>
          <Curve p={0.78} color={RED} draw={1} opacity={0.3} width={6} />
          <Curve p={p} color={color} draw={1} />
        </>
      )}
    </svg>
  );
};

// ---- Production and the query list -----------------------------------------------------------------------------------

const QUERIES = [
  { q: "SELECT orders  WHERE id", len: 520 },
  { q: "INSERT orders", len: 380 },
  { q: "INSERT order_items", len: 440 },
  { q: "UPDATE orders  SET status", len: 300 },
  { q: "SELECT menu", len: 600 },
];

const ProductionPart: React.FC = () => {
  const frame = useCurrentFrame();
  const show = frame >= C.prod - 4 && frame < PROD_END + 12;
  if (!show) return null;
  const a = interpolate(frame, [C.prod - 4, C.prod + 6, PROD_END, PROD_END + 12], [0, 1, 1, 0], cl);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Muted size={44} style={{ position: "absolute", left: 160, top: 250, letterSpacing: 3 }}>QUERIES</Muted>
      <div style={{ position: "absolute", left: 800 + 640, top: 330, bottom: 250, width: 0, borderLeft: `5px dashed ${RED}` }} />
      <Tag size={40} color={RED} style={{ position: "absolute", left: 800 + 640 - 150, top: 280 }}>slow query</Tag>
      {QUERIES.map((r, i) => (
        <Appear key={r.q} at={C.prod + i * 4} style={{ left: 160, top: 380 + i * 150 }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, color: LIGHT, whiteSpace: "pre" }}>{r.q}</div>
          <div style={{ marginTop: 14, width: r.len, height: 26, borderRadius: 13, background: GRAY }} />
        </Appear>
      ))}
      <Stage pos={[0.5, 1.9, 8]} look={[0.5, 1.4, 0]} width={880} height={940} style={{ left: 1560, top: 380 }} floor={false}>
        <pointLight position={[0.5, 2.2, 4]} intensity={18} distance={12} color="#ffffff" />
        <Rack frame={frame} />
      </Stage>
      <Appear at={C.prod + 4} style={{ left: 1580, top: 250 }}>
        <Card color={LIGHT} style={{ padding: "20px 30px" }}>
          <Tag size={46} color={FG}>No slow query to point at.</Tag>
        </Card>
      </Appear>
      <Tag size={36} color={MUTED} mono style={{ position: "absolute", left: 1560 + 340, top: 1260, letterSpacing: 4 }}>PRODUCTION</Tag>
    </div>
  );
};

// ---- the bigger server -----------------------------------------------------------------------------------------------

const ServerBox: React.FC = () => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [C.bigger - 4, C.bigger + 26], [1, 1.9], cl);
  return (
    <group scale={[s, s, s]} position={[0, 0.5 * s, 0]} rotation={[0, 0.35, 0]}>
      <mesh>
        <boxGeometry args={[1.6, 1, 1.1]} />
        <meshStandardMaterial color="#3a4049" roughness={0.5} metalness={0.25} />
      </mesh>
      {[-0.3, 0, 0.3].map((y) => (
        <mesh key={y} position={[-0.15, y, 0.56]}>
          <boxGeometry args={[1.1, 0.06, 0.04]} />
          <meshStandardMaterial color={GRAY} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} position={[0.62, 0.3 - i * 0.22, 0.56]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={(frame + i * 9) % 24 < 12 ? 1.5 : 0.2} />
        </mesh>
      ))}
    </group>
  );
};

const ServerPart: React.FC = () => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [C.first - 4, C.first + 6, C.cause - 6, C.cause + 6], [0, 1, 1, 0], cl);
  const bill = useT(C.budget, C.budget + 18);
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Stage pos={[0.3, 2.6, 9.5]} look={[0, 1.0, 0]} width={640} height={800} style={{ left: 90, top: 330 }} floor={false}>
        <pointLight position={[0.5, 2.5, 4]} intensity={16} distance={12} color="#ffffff" />
        <ServerBox />
      </Stage>
      <Appear at={C.first} style={{ left: 130, top: 270 }}>
        <Tag size={46} color={MUTED} style={{ letterSpacing: 3 }}>{frame < C.bigger ? "INSTANCE" : "BIGGER INSTANCE"}</Tag>
      </Appear>
      <Appear at={C.helped} until={C.but} style={{ left: 800, top: 190 }}>
        <Tag size={64} color={GREEN} style={{ fontWeight: 800 }}>peaks down</Tag>
      </Appear>
      <Appear at={C.budget} style={{ left: 120, top: 1180 }}>
        <Tag size={50} color={RED}>bigger bill</Tag>
        <div style={{ marginTop: 14, height: 26, borderRadius: 13, width: 560 * bill, background: RED }} />
      </Appear>
      <Appear at={C.explain} style={{ left: 1560, top: 300 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 420, color: FG, opacity: 0.9, lineHeight: 1 }}>?</div>
      </Appear>
    </div>
  );
};

// ---- the suspect -----------------------------------------------------------------------------------------------------

const SuspectPart: React.FC = () => {
  const frame = useCurrentFrame();
  const a = useT(C.cause, C.cause + 12);
  const chip = useT(C.random, C.random + 12);
  const ring = useT(C.suspect, C.suspect + 14);
  const focus = useT(C.tested, C.tested + 22);
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Tag size={110} color={FG} style={{ position: "absolute", left: 280, top: 330, fontWeight: 800 }}>The cause</Tag>
      <Tag size={110} color={MUTED} style={{ position: "absolute", left: 280, top: 470, fontWeight: 700 }}>not pinned down</Tag>
      <div style={{ position: "absolute", left: 280, top: 620, width: 180, height: 10, borderRadius: 5, background: "#d4a017" }} />
      <div style={{ position: "absolute", left: 1500 - 220 * focus, top: 520 - 40 * focus, opacity: chip, transform: `scale(${0.85 + 0.2 * chip + 0.35 * focus})`, transformOrigin: "left center" }}>
        <Card color={RED} style={{ padding: "30px 50px" }}>
          <Tag size={84} color={FG} style={{ fontWeight: 800 }}>UUIDv4</Tag>
          <Muted size={50}>random keys</Muted>
        </Card>
        {/* the ring: a magnifying glass around the suspect */}
        <svg width={340} height={340} viewBox="0 0 340 340" style={{ position: "absolute", left: 360, top: -90, opacity: ring }}>
          <circle cx={150} cy={150} r={110 * (0.7 + 0.3 * ring)} fill="none" stroke={FG} strokeWidth={14} />
          <line x1={228} y1={228} x2={300} y2={300} stroke={FG} strokeWidth={18} strokeLinecap="round" />
        </svg>
      </div>
      <Sfx name="reveal" from={C.random} volume={0.4} />
    </div>
  );
};

export const Slowdown: React.FC = () => (
  <Scene id="05">
    <Chart />
    <ProductionPart />
    <ServerPart />
    <SuspectPart />
    <Sfx name="whoosh" from={C.first} volume={0.3} />
    <Sfx name="stamp" from={C.helped} volume={0.35} />
    <Sfx name="buzz" from={C.explain} volume={0.3} />
  </Scene>
);

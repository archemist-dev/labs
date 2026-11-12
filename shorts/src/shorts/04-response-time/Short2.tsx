// Week 4 Short "The tail": p99 from one load test isn't one number, the work stays 4.8 ms while the wait in line grows
// past 70% busy, and a page of 50 calls waits for the slowest (39% of pages slow). Every number comes from data2.json
// (04-response-time/video_data2.py, London client, both runs). 2D charts and grids; labels only, no sentences.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Pop } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Canvas, Rack } from "../03-uuid-keys/Short1";
import data from "./data2.json";
import { Header } from "./Short1";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
const CARD = "#22262c";
const EDGE = "#3a3f47";
// Counts up in round steps (never flickers through every digit); lands exactly on the value.
const steps = (value: number, p: number, step: number) => (p >= 1 ? value : Math.min(value, Math.floor((value * p) / step) * step));

// ---- 1. Hook: p99 from one load test; 56 ms in one run, 270 in the next ---------------------------------------------

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const p99 = useCue("p99", 30);
  const a = useCue("a", 80);
  const b = useCue("b", 130);
  const cards = [
    { label: "RUN 1", ms: data.p99_70[0], at: a, color: FG, x: 70 },
    { label: "RUN 2", ms: data.p99_70[1], at: b, color: RED, x: 560 },
  ];
  return (
    <>
      <Header text="One load test, twice" />
      <div style={{ position: "absolute", left: 70, top: 380, fontFamily: MONO, fontSize: 36, color: LIGHT, opacity: fade(frame, p99 - 4) }}>
        p99 = the slowest 1% of requests
      </div>
      {cards.map((k) => {
        const p = interpolate(frame, [k.at - 14, k.at], [0, 1], clamp);
        const done = p >= 1;
        return (
          <div key={k.label} style={{ position: "absolute", top: 480, left: k.x, width: 450, padding: "24px 30px", borderRadius: 24, background: CARD, border: `3px solid ${done ? k.color : EDGE}`, opacity: fade(frame, k.at - 16, 6) }}>
            <div style={{ fontFamily: MONO, fontSize: 30, color: MUTED }}>{k.label} · p99</div>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 120, lineHeight: 1.1, color: done ? k.color : GRAY }}>
              {steps(k.ms, p, 10)}
              <span style={{ fontSize: 52 }}> ms</span>
            </div>
            <Sfx name="reveal" at={k.at} volume={0.35} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 70, top: 790, fontFamily: MONO, fontSize: 32, color: MUTED, opacity: fade(frame, b + 6) }}>
        70% load · {data.instance} · nothing changed
      </div>
    </>
  );
};

// ---- 2. Load chart: the work stays 4.8 ms, the wait in line grows past 70% -----------------------------------------

const CX = 150;
const CY = 420;
const CW = 800;
const CH = 440;
const XMIN = 20;
const XMAX = 90;
const YMAX = 45;
const xAt = (load: number) => CX + ((load - XMIN) / (XMAX - XMIN)) * CW;
const yAt = (ms: number) => CY + CH - (ms / YMAX) * CH;

// Draws a polyline up to fraction `p` of its length, with a glowing head.
const LinePath: React.FC<{ pts: [number, number][]; p: number; color: string; width?: number }> = ({ pts, p, color, width = 8 }) => {
  if (p <= 0) return null;
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = seg.reduce((s, v) => s + v, 0);
  let left = total * p;
  const out: [number, number][] = [pts[0]];
  for (let i = 0; i < seg.length && left > 0; i++) {
    const f = Math.min(1, left / seg[i]);
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]);
    left -= seg[i];
  }
  const head = out[out.length - 1];
  return (
    <>
      <polyline points={out.map((q) => q.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" />
      {p < 1 ? <circle cx={head[0]} cy={head[1]} r={14} fill={color} opacity={0.35} /> : null}
      <circle cx={head[0]} cy={head[1]} r={7} fill={color} />
    </>
  );
};

const Queue: React.FC<{ stall: number; waits: number }> = ({ stall, waits }) => {
  const frame = useCurrentFrame();
  const n = 7;
  return (
    <div style={{ position: "absolute", left: 70, top: 1010, width: 860, opacity: fade(frame, stall - 6) }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {Array.from({ length: n }, (_, i) => {
          const first = i === 0;
          const wait = fade(frame, waits + i * 5, 8);
          return (
            <div key={i} style={{ width: 104, height: 104, borderRadius: 16, border: `4px solid ${first ? RED : wait > 0.5 ? RED : GRAY}`, background: first ? RED : "transparent", opacity: first ? 1 : 0.6 + 0.4 * wait, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 26, color: first ? FG : RED }}>
              {first ? "stall" : wait > 0.5 ? "wait" : ""}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 30, color: MUTED }}>stall or lost packet: 0.2–1 s</div>
      <Sfx name="buzz" at={stall} volume={0.25} />
    </div>
  );
};

const Load: React.FC = () => {
  const frame = useCurrentFrame();
  const work = useCue("work", 20);
  const line = useCue("line", 70);
  const knee = useCue("knee", 130);
  const stall = useCue("stall", 180);
  const waits = useCue("waits", 220);
  const pw = interpolate(frame, [work - 6, work + 30], [0, 1], { ...clamp, easing: ease });
  const pl = interpolate(frame, [line - 4, line + 40], [0, 1], { ...clamp, easing: ease });
  const zone = fade(frame, knee - 4, 14);
  const workPts = data.steps.map((s) => [xAt(s.load), yAt(s.app)] as [number, number]);
  const waitPts = data.steps.map((s) => [xAt(s.load), yAt(s.p50[0])] as [number, number]);
  const last = data.steps[data.steps.length - 1];
  return (
    <>
      <Header text="Same work, longer line" />
      <svg width={1080} height={1000} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* busy zone past 70% */}
        <rect x={xAt(70)} y={CY} width={xAt(XMAX) - xAt(70)} height={CH} fill={RED} opacity={0.12 * zone} />
        {[0, 15, 30, 45].map((v) => (
          <g key={v}>
            <line x1={CX} x2={CX + CW} y1={yAt(v)} y2={yAt(v)} stroke="#2c3036" strokeWidth={2} />
            <text x={CX - 18} y={yAt(v) + 10} textAnchor="end" fontFamily={MONO} fontSize={28} fill={MUTED}>
              {v}
            </text>
          </g>
        ))}
        {data.steps.map((s) => (
          <text key={s.load} x={xAt(s.load)} y={CY + CH + 44} textAnchor="middle" fontFamily={MONO} fontSize={28} fill={s.load >= 70 && zone > 0.5 ? RED : MUTED}>
            {s.load}%
          </text>
        ))}
        <LinePath pts={workPts} p={pw} color={GREEN} />
        <LinePath pts={waitPts} p={pl} color={FG} />
      </svg>
      <div style={{ position: "absolute", left: CX, top: CY - 50, fontFamily: MONO, fontSize: 28, color: MUTED }}>ms</div>
      <div style={{ position: "absolute", left: xAt(40), top: yAt(4.8) - 64, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: GREEN, opacity: fade(frame, work) }}>
        server work <span style={{ fontFamily: MONO }}>{data.steps[0].app} ms</span>
      </div>
      <div style={{ position: "absolute", left: xAt(20), top: yAt(last.p50[0]) - 14, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: FG, opacity: fade(frame, line + 30) }}>
        wait (p50) <span style={{ fontFamily: MONO }}>{data.steps[0].p50[0]} → {last.p50[0]} ms</span>
      </div>
      <div style={{ position: "absolute", left: xAt(70) + 12, top: CY + 10, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: RED, opacity: zone }}>busy</div>
      <Sfx name="whoosh" at={knee} volume={0.25} />
      <Queue stall={stall} waits={waits} />
    </>
  );
};

// ---- 3. Fan-out: one page, 50 calls, waits for the slowest -----------------------------------------------------------

// Bar heights are illustrative shapes, not measurements (no numbers on them); the one slow call is the point.
const SHAPE = Array.from({ length: 50 }, (_, i) => 0.25 + (((i * 37) % 23) / 23) * 0.35);
const SLOW = 33;

const Fanout: React.FC = () => {
  const frame = useCurrentFrame();
  const calls = useCue("calls", 20);
  const slowest = useCue("slowest", 60);
  const hit = fade(frame, slowest, 10);
  return (
    <>
      <Header text="One page, 50 calls" />
      <div style={{ position: "absolute", left: 70, top: 400, width: 940, display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 12 }}>
        {SHAPE.map((h, i) => {
          const on = fade(frame, calls - 6 + Math.floor(i / 10) * 4, 8);
          const slow = i === SLOW;
          return (
            <div key={i} style={{ height: 96, borderRadius: 10, background: "#15171a", border: `3px solid ${slow && hit > 0.5 ? RED : EDGE}`, opacity: on, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 8, bottom: 8, right: 8, height: `${(slow ? 0.25 + 0.65 * hit : h) * 70}%`, borderRadius: 4, background: slow && hit > 0.5 ? RED : GREEN, opacity: 0.85 }} />
            </div>
          );
        })}
      </div>
      <Sfx name="reveal" at={calls} volume={0.3} />
      <Pop at={slowest + 6} sfx="buzz" style={{ left: 70, top: 1000, width: 860 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>Page waits for the slowest</div>
        <div style={{ marginTop: 12, width: 860, height: 50, borderRadius: 10, background: RED }} />
      </Pop>
    </>
  );
};

// ---- 4. Production ---------------------------------------------------------------------------------------------------

const ProductionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, 60], [13, 12], clamp);
  return (
    <>
      <Canvas pos={[0.6, 2.4, z]} look={[0.85, 1.2, 0]}>
        <pointLight position={[0.5, 2.2, 4]} intensity={18} distance={12} color="#ffffff" />
        <group scale={interpolate(frame, [0, 8], [0.6, 1], { ...clamp, easing: ease })}>
          <Rack frame={frame} />
        </group>
      </Canvas>
      <div style={{ position: "absolute", left: 90, width: 460, top: 480, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>PRODUCTION</div>
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 300 }}>
        <div style={{ position: "relative", width: 430, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>Every service is fast, and the page isn't.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
    </>
  );
};

// ---- 5. Pages: 1% slow calls -> 39% slow pages ------------------------------------------------------------------------

// Which of 100 pages turn red: a fixed, spread-out pick of exactly `fanout_slow_pct`.
const RED_PAGES = new Set(Array.from({ length: data.fanout_slow_pct }, (_, i) => Math.floor((i * 100) / data.fanout_slow_pct + ((i * 7) % 3) * 0.5) % 100));

const Pages: React.FC = () => {
  const frame = useCurrentFrame();
  const one = useCue("one", 20);
  const pct = useCue("pct", 60);
  const p = interpolate(frame, [pct - 16, pct + 4], [0, 1], clamp);
  const order = [...RED_PAGES];
  const shown = new Set(order.slice(0, Math.round(order.length * p)));
  return (
    <>
      <Header text="100 pages, 50 calls each" />
      <div style={{ position: "absolute", left: 70, top: 380, fontFamily: MONO, fontSize: 36, color: LIGHT, opacity: fade(frame, one - 4) }}>1% of calls slow</div>
      <div style={{ position: "absolute", left: 70, top: 450, width: 600, display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 10 }}>
        {Array.from({ length: 100 }, (_, i) => (
          <div key={i} style={{ height: 48, borderRadius: 6, border: `3px solid ${shown.has(i) ? RED : EDGE}`, background: shown.has(i) ? RED : "#15171a" }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 700, top: 560, width: 300 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 130, color: RED, opacity: fade(frame, pct - 16, 6) }}>{steps(data.fanout_slow_pct, p, 5)}%</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: FG, opacity: fade(frame, pct) }}>pages slow</div>
      </div>
      <Sfx name="reveal" at={pct} volume={0.35} />
      <div style={{ position: "absolute", left: 70, top: 1080, fontFamily: MONO, fontSize: 32, color: MUTED, opacity: fade(frame, pct + 20) }}>
        1 − 0.99⁵⁰ · measured {data.fanout_measured[0]}–{data.fanout_measured[1]}%
      </div>
    </>
  );
};

// ---- 6. The take: stay below the knee, fewer calls, measure p99 more than once ---------------------------------------

const Rule: React.FC<{ at: number; top: number; title: string; sub: string }> = ({ at, top, title, sub }) => (
  <Pop at={at} sfx="reveal" style={{ left: 70, top, width: 860 }}>
    <div style={{ padding: "20px 28px", borderRadius: 22, border: `4px solid ${GREEN}`, background: GREEN_BG }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: GREEN }}>{title}</div>
      <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 32, color: FG }}>{sub}</div>
    </div>
  </Pop>
);

const Take: React.FC = () => {
  const queue = useCue("queue", 30);
  const fewer = useCue("fewer", 90);
  const once = useCue("once", 140);
  return (
    <>
      <Header text="Your service" />
      <Rule at={queue} top={390} title="Stay below the knee" sub="here: under 70% busy" />
      <Rule at={fewer} top={620} title="Fewer calls per page" sub="10 calls: 10% slow · 50: 39%" />
      <Rule at={once} top={850} title="Measure p99 more than once" sub={`${data.p99_70[0]} ms, then ${data.p99_70[1]} ms`} />
    </>
  );
};

// ---- 7. End: measure where the user waits ----------------------------------------------------------------------------

const End: React.FC = () => {
  const waits = useCue("waits", 20);
  const works = useCue("works", 50);
  const article = useCue("article", 90);
  return (
    <>
      <Header text="Measure the wait" />
      <Pop at={waits} sfx="reveal" style={{ left: 70, top: 400, width: 420 }}>
        <div style={{ padding: "20px 26px", borderRadius: 22, border: `4px solid ${GREEN}`, background: GREEN_BG }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: GREEN }}>Measure here</div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: FG }}>where the user waits</div>
        </div>
      </Pop>
      <Pop at={works} style={{ left: 510, top: 400, width: 420 }}>
        <div style={{ padding: "20px 26px", borderRadius: 22, border: `4px solid ${GRAY}`, opacity: 0.75 }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: LIGHT }}>Not here</div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: LIGHT }}>where the server works</div>
        </div>
      </Pop>
      <Pop at={article} style={{ left: 70, top: 680 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT }}>
          Full article: <span style={{ color: FG }}>link in profile</span>
        </div>
      </Pop>
    </>
  );
};

export const SCENES2: Record<string, React.FC> = { hook: Hook, load: Load, fanout: Fanout, production: ProductionScene, pages: Pages, take: Take, end: End };

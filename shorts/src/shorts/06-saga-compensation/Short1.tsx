// Week 6 Short "The retry that doubled orders": a timeout is "unknown", the order was often already created, so a plain
// retry creates a second one (1,869 a year at 1,000 checkouts a day); an idempotency key takes it to zero.
// Every number comes from data.json (07-saga-compensation/video_data.py).
// v2 (Javlon, 2026-11-16: the 3D checkout "looks strange, not intuitive", remake it): the event scenes live in Seq.tsx
// (the checkout's status and the real orders table on top, the calls as a sequence diagram below).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Pop } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Canvas, Rack } from "../03-uuid-keys/Short1";
import { Header } from "../04-response-time/Short1";
import data from "./data.json";
import { IDS, KEY, Key, Timeline } from "./Seq";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
const steps = (value: number, p: number, step: number) => (p >= 1 ? value : Math.min(value, Math.floor((value * p) / step) * step));
const fmt = (n: number) => n.toLocaleString("en-GB");
const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const CARD = "#22262c";
const EDGE = "#3a3f47";
const HATCH = `repeating-linear-gradient(135deg, rgba(229,72,77,0.28) 0 14px, rgba(229,72,77,0.08) 14px 28px)`;
const BASKET = pounds(data.basket_pence);
const ITEMS = pounds(data.basket_pence - 299);

// ---- 1. Hook: a retry fixes a failed call; after a payment, 1,869 double orders a year ------------------------------

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const retry = useCue("retry", 10);
  const n = useCue("n", 70);
  const double = useCue("double", 90);
  const p = interpolate(frame, [n - 14, n], [0, 1], clamp);
  return (
    <>
      <Header text="A retry after payment" />
      <div style={{ position: "absolute", left: 70, top: 390, fontFamily: SANS, fontWeight: 700, fontSize: 42, color: LIGHT, opacity: fade(frame, retry - 4) }}>
        retry = fixes a failed call?
      </div>
      <div style={{ position: "absolute", left: 70, top: 470, fontFamily: MONO, fontWeight: 800, fontSize: 230, lineHeight: 1, color: p >= 1 ? RED : GRAY, opacity: fade(frame, n - 16, 6) }}>
        {fmt(steps(data.duplicates, p, 100))}
      </div>
      <div style={{ position: "absolute", left: 76, top: 710, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: FG, opacity: fade(frame, double - 4) }}>double orders a year</div>
      <Sfx name="reveal" at={n} volume={0.35} />
      <div style={{ position: "absolute", left: 70, top: 840, width: 860 }}>
        <div style={{ fontFamily: MONO, fontSize: 30, color: MUTED, opacity: fade(frame, n) }}>1 payment · checkout {KEY} · {BASKET}</div>
        {[0, 1].map((i) => {
          const at = i === 0 ? n + 4 : double + 2;
          const bad = i === 1;
          return (
            <div key={i} style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "16px 22px", borderRadius: 14, border: `4px solid ${bad ? RED : GRAY}`, background: bad ? HATCH : CARD, fontFamily: MONO, fontSize: 34, color: FG, opacity: fade(frame, at, 10) }}>
              <span style={{ fontWeight: 800, color: bad ? RED : FG }}>order {IDS[i]}</span>
              <span style={{ textAlign: "center", color: bad ? RED : FG, fontWeight: bad ? 800 : 400 }}>{KEY}</span>
              <span style={{ textAlign: "right" }}>{BASKET}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ---- 3. Production -------------------------------------------------------------------------------------------------

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
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 280 }}>
        <div style={{ position: "relative", width: 430, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, color: FG }}>A timeout isn't a no. It's a maybe with a deadline.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
    </>
  );
};

// ---- 4. A year of checkouts: the doubles printed twice, about £36,000 ----------------------------------------------

const Receipt: React.FC<{ n: number; dup?: boolean; at: number; left: number }> = ({ n, dup, at, left }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at - 4, at + 26], [0, 1], clamp)); // prints top to bottom, about 1 s
  const rows: [string, string][] = [
    ["2 items", ITEMS],
    ["delivery", "£2.99"],
    ["total", BASKET],
  ];
  return (
    <div style={{ position: "absolute", left, top: 610, width: 410, height: 360 * p, overflow: "hidden", opacity: frame < at - 4 ? 0 : 1 }}>
      <div style={{ padding: "22px 28px", borderRadius: 16, background: dup ? HATCH : CARD, border: `4px solid ${dup ? RED : GRAY}`, height: 316 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: dup ? RED : FG }}>ORDER {IDS[n - 1]}</div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: MUTED, marginBottom: 10 }}>checkout {KEY}</div>
        {rows.map(([a, b]) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 30, color: FG, fontWeight: a === "total" ? 800 : 400 }}>
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, fontFamily: MONO, fontWeight: 700, fontSize: 28, color: LIGHT }}>DELIVERED</div>
      </div>
      <Sfx name="type" at={at} volume={0.25} />
    </div>
  );
};

const Year: React.FC = () => {
  const frame = useCurrentFrame();
  const year = useCue("year", 20);
  const thousand = useCue("thousand", 50);
  const timing = useCue("timing", 80);
  const money = useCue("money", 130);
  const twice = useCue("twice", 170);
  const p = interpolate(frame, [money - 14, money], [0, 1], clamp);
  const lines: [number, string][] = [
    [year, `${fmt(data.checkouts)} checkouts`],
    [thousand, `${fmt(data.per_day)} a day`],
    [timing, `${data.timeout_pct}% of order calls time out`],
  ];
  return (
    <>
      <Header text="One year, replayed" />
      {lines.map(([at, text], i) => (
        <div key={text} style={{ position: "absolute", left: 70, top: 380 + i * 62, fontFamily: MONO, fontSize: 38, color: FG, opacity: fade(frame, at - 4) }}>
          {text}
        </div>
      ))}
      <Receipt n={1} at={money - 8} left={70} />
      <Receipt n={2} dup at={twice - 4} left={500} />
      <div style={{ position: "absolute", left: 70, top: 1010, fontFamily: MONO, fontSize: 34, color: MUTED, opacity: fade(frame, money - 14) }}>
        {fmt(data.duplicates)} × {BASKET} = £{fmt(data.duplicate_pounds)}
      </div>
      <div style={{ position: "absolute", left: 70, top: 1060, fontFamily: MONO, fontWeight: 800, fontSize: 120, color: p >= 1 ? RED : GRAY, opacity: fade(frame, money - 14, 6) }}>
        ≈ £{fmt(steps(36000, p, 2000))}
      </div>
      <div style={{ position: "absolute", left: 76, top: 1210, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: FG, opacity: fade(frame, twice) }}>of food, sent twice</div>
      <Sfx name="reveal" at={money} volume={0.35} />
    </>
  );
};

// ---- 6. End: a timeout means "I don't know"; ask again with the same key ------------------------------------------

const End: React.FC = () => {
  const unknown = useCue("unknown", 20);
  const key = useCue("key", 60);
  const profile = useCue("profile", 100);
  return (
    <>
      <Header text="A timeout is a question" />
      <Pop at={unknown} sfx="reveal" style={{ left: 70, top: 400, width: 420 }}>
        <div style={{ padding: "20px 26px", borderRadius: 22, border: `4px solid ${GRAY}` }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: LIGHT }}>timeout</div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: FG }}>= "I don't know"</div>
        </div>
      </Pop>
      <Pop at={key} sfx="reveal" style={{ left: 510, top: 400, width: 420 }}>
        <div style={{ padding: "20px 26px", borderRadius: 22, border: `4px solid ${GREEN}`, background: GREEN_BG }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: GREEN }}>ask again</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: FG }}>same key {KEY}</div>
        </div>
      </Pop>
      <Pop at={profile} style={{ left: 70, top: 680 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT }}>
          Full article: <span style={{ color: FG }}>link in profile</span>
        </div>
      </Pop>
    </>
  );
};

export const SCENES1: Record<string, React.FC> = { hook: Hook, timeline: Timeline, production: ProductionScene, year: Year, key: Key, end: End };

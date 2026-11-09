// Week 4 Short "The server log lies": the same request flies Sydney -> Frankfurt on a dotted globe, once on a reused
// connection (one round trip) and once on a new one (three). Every number comes from data.json
// (04-response-time/video_data.py, Sydney run 1). Labels only, no sentences.
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Pop, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";

const GRID_LINE = "#3a3f47";
import { Canvas, Rack } from "../03-uuid-keys/Short1";
import data from "./data.json";
import land from "../../lib/land.json";
import { CityLabel, clamp, clientAt, ease, fade, Globe, ll, serverAt, shadow, SlowMo, type Swarm, type Trip, type View } from "./Globe";


const sec = (ms: number) => (ms / 1000).toFixed(1);
const msTxt = (ms: number) => `${Math.round(ms)} ms`;

export const Header: React.FC<{ text: string; sub?: string; top?: number }> = ({ text, sub, top = 200 }) => {
  const line = useSpring(4);
  return (
    <div style={{ position: "absolute", top, left: 70, right: 70 }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 72, color: FG, lineHeight: 1.05, textShadow: shadow }}>{text}</div>
      <div style={{ marginTop: 18, width: 140 * line, height: 8, borderRadius: 4, background: GOLD }} />
      {sub ? <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 32, color: MUTED }}>{sub}</div> : null}
    </div>
  );
};

// Counts a value up in round steps while `p` goes 0 -> 1 (never flickers through every digit).
// Lands exactly on the measured value at p = 1, so the end value matches the spoken one.
const steps = (value: number, p: number, step: number) => (p >= 1 ? value : Math.min(value, Math.floor((value * p) / step) * step));

// ---- 1. Hook: same request, 0.3 s then 0.9 s --------------------------------------------------------------------------

// Globe sizes per layout band: radius px ~ 960 / (tan 19deg * sqrt(dist^2 - 1)), centre y ~ 960 + 960 * drop / (tan 19deg * dist).
const HOOK_VIEW: View = { dist: 7.7, drop: -0.1 };

// Calm by design (Javlon, 2026-11-09: "my eyes hurt, especially at the start"): no flying packets here, one thing
// changes at a time. The route draws once, then each card counts up so it lands on its own spoken number.
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const fast = useCue("fast", 70);
  const slow = useCue("slow", 110);
  const broken = useCue("broken", 140);
  const cards = [
    { label: "REQUEST 1", ms: data.reused.total, at: fast, color: GREEN, x: 80 },
    { label: "REQUEST 2", ms: data.new.total, at: slow, color: RED, x: 540 },
  ];
  const ok = fade(frame, broken, 12);
  const c = clientAt(HOOK_VIEW);
  const s = serverAt(HOOK_VIEW);
  return (
    <>
      <Globe v={{ ...HOOK_VIEW, spin: interpolate(frame, [0, 300], [-1.5, 1.5]) }} route={{ draw: fade(frame, 2, 36), opacity: 0.6 }} />
      {cards.map((k) => {
        // Counts up over the half second before its word, in 0.1 s steps.
        const p = interpolate(frame, [k.at - 14, k.at], [0, 1], clamp);
        const done = p >= 1;
        return (
          <div key={k.label} style={{ position: "absolute", top: 210, left: k.x, width: 420, padding: "22px 28px", borderRadius: 24, background: "#22262c", border: `3px solid ${done ? k.color : GRID_LINE}` }}>
            <div style={{ fontFamily: MONO, fontSize: 30, color: MUTED }}>{k.label}</div>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 100, color: done ? k.color : p > 0 ? FG : GRAY, lineHeight: 1.1 }}>
              {done ? sec(k.ms) : p > 0 ? (steps(k.ms, p, 100) / 1000).toFixed(1) : "0.0"} s
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 30 }}>
              <span style={{ color: LIGHT, opacity: done ? 1 : 0 }}>{msTxt(k.ms)}</span>
              <span style={{ color: LIGHT, opacity: ok }}>200 OK</span>
            </div>
            <Sfx name="reveal" at={k.at} volume={0.35} />
          </div>
        );
      })}
      <CityLabel at={c} name="Sydney" role="client" side="left" dy={30} />
      <CityLabel at={s} name="Frankfurt" role="server" side="right" dy={-70} />
    </>
  );
};

// ---- 2. The server log: 4.8 ms, both times -----------------------------------------------------------------------------

const LogCard: React.FC<{ at: number; mark: number; top: number; label: string }> = ({ at, mark, top, label }) => {
  const frame = useCurrentFrame();
  const lit = fade(frame, mark, 10);
  const [name, value] = data.header.split(": ");
  return (
    <Pop at={at} style={{ left: 70, top, width: 940 }}>
      <div style={{ padding: "26px 34px", borderRadius: 22, background: "#15171a", border: `3px solid ${GRAY}`, fontFamily: MONO, fontSize: 36, lineHeight: 1.5 }}>
        <div style={{ color: MUTED, fontSize: 28 }}>{label}</div>
        <div style={{ color: LIGHT }}>HTTP/1.1 200 OK</div>
        <div style={{ color: LIGHT }}>Content-Length: {data.body_bytes}</div>
        <div style={{ color: FG }}>
          {name}:{" "}
          <span style={{ padding: "2px 10px", borderRadius: 10, background: `rgba(52,199,123,${0.25 * lit})`, color: lit > 0.5 ? GREEN : FG }}>{value}</span>
        </div>
      </div>
      <div style={{ position: "absolute", right: 30, top: 24, fontFamily: MONO, fontWeight: 800, fontSize: 64, color: GREEN, opacity: lit }}>{data.new.app} ms</div>
    </Pop>
  );
};

const Log: React.FC = () => {
  const frame = useCurrentFrame();
  const log = useCue("log", 10);
  const both = useCue("both", 60);
  const bars = both;
  const p = interpolate(frame, [bars, bars + 24], [0, 1], { ...clamp, easing: ease });
  const full = 800;
  return (
    <>
      <Header text="What the server saw" />
      <LogCard at={2} mark={log} top={380} label="request 1 · response" />
      <LogCard at={both - 4} mark={both} top={680} label="request 2 · response" />
      <div style={{ position: "absolute", left: 70, top: 1000, opacity: fade(frame, bars, 8) }}>
        <Sfx name="reveal" at={bars} volume={0.3} />
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>
          User waited <span style={{ fontFamily: MONO, color: RED }}>{msTxt(steps(data.new.total, p, 50) || 0)}</span>
        </div>
        <div style={{ marginTop: 10, width: full * p, height: 46, borderRadius: 10, background: RED }} />
        <div style={{ marginTop: 26, fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>
          Server worked <span style={{ fontFamily: MONO, color: GREEN }}>{data.new.app} ms</span>
        </div>
        <div style={{ marginTop: 10, width: Math.max(6, (full * data.new.app) / data.new.total), height: 46, borderRadius: 4, background: GREEN }} />
      </div>
    </>
  );
};

// ---- 3. Production -----------------------------------------------------------------------------------------------------

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
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 330 }}>
        <div style={{ position: "relative", width: 430, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: FG }}>The log says I'm fast.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
    </>
  );
};

// ---- Timeline: one request's 887 ms, stage by stage --------------------------------------------------------------------

const TL_X = 70;
const TL_W = 940;
const SEGS = [
  { key: "tcp", label: "open", ms: data.new.tcp, color: RED },
  { key: "tls", label: "secure", ms: data.new.tls, color: RED },
  { key: "wait", label: "request", ms: data.new.wait, color: LIGHT },
] as const;
const px = (ms: number) => (ms / data.new.total) * TL_W;

// fills[i]: 0 -> 1 how much of stage i is drawn; collapse: 0 -> 1 shrinks the setup stages away (reuse).
const Timeline: React.FC<{ top: number; fills: number[]; collapse?: number; title: string; total: string; totalColor: string; showTotal: number; code?: number; dim?: boolean }> = ({
  top,
  fills,
  collapse = 0,
  title,
  total,
  totalColor,
  showTotal,
  code = 0,
  dim,
}) => {
  let x = TL_X;
  return (
    <div style={{ position: "absolute", left: 0, top, width: 1080, opacity: dim ? 0.5 : 1 }}>
      <div style={{ position: "absolute", left: TL_X, top: 0, fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>{title}</div>
      <div style={{ position: "absolute", right: 70, top: -6, fontFamily: MONO, fontWeight: 800, fontSize: 48, color: totalColor, opacity: showTotal }}>{total}</div>
      {SEGS.map((s, i) => {
        const shrink = s.key === "wait" ? 1 : 1 - collapse;
        const w = px(s.ms) * shrink;
        const left = x;
        x += w;
        return (
          <div key={s.key} style={{ position: "absolute", left, top: 64, width: w, opacity: shrink }}>
            <div style={{ width: (w - 6) * fills[i], height: 64, borderRadius: 10, background: s.color, opacity: s.color === LIGHT ? 0.55 : 1 }} />
            {s.key === "wait" ? (
              <div style={{ position: "absolute", left: (w - 6) / 2 - 4, top: -4, width: 8, height: 72, borderRadius: 3, background: GREEN, opacity: code }} />
            ) : null}
            <div style={{ marginTop: 10, fontFamily: SANS, fontWeight: 700, fontSize: 32, color: s.color === LIGHT ? LIGHT : s.color, opacity: fills[i] > 0 ? 1 : 0, whiteSpace: "nowrap" }}>{s.label}</div>
            <div style={{ fontFamily: MONO, fontSize: 30, color: MUTED, opacity: fills[i] >= 1 ? 1 : 0 }}>{msTxt(s.ms)}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---- 4. The connection: open, secure, then the request -------------------------------------------------------------------

const CONN_VIEW: View = { dist: 8.8, drop: 0.02 };

const Conn: React.FC = () => {
  const frame = useCurrentFrame();
  const sydney = useCue("sydney", 40);
  const frankfurt = useCue("frankfurt", 60);
  const open = useCue("open", 100);
  const secure = useCue("secure", 150);
  const setup = useCue("setup", 190);
  const byte = useCue("byte", 240);
  // Calm pace: 2.4 s a round trip (about 1.2 s each way), one after another, never two at once. Each starts near
  // its word: TCP while "trip" is said, TLS by "secure", the request so it reaches Frankfurt on "byte".
  const D = 72;
  const tcp = Math.max(4, open - 36);
  const tls = Math.max(tcp + D + 4, secure - 30);
  const req = Math.max(tls + D + 4, byte - D / 2);
  const tripStarts = [tcp, tls, req];
  const trips: Trip[] = tripStarts.map((st, i) => ({ start: st, dur: D, color: i < 2 ? RED : LIGHT }));
  const fills = tripStarts.map((st) => interpolate(frame, [st, st + D], [0, 1], clamp));
  const arrive = tripStarts[2] + D / 2;
  const code = interpolate(frame, [arrive - 2, arrive + 4, arrive + 30], [0, 1, 1], clamp);
  const brace = fade(frame, setup, 10);
  const c = clientAt(CONN_VIEW);
  const s = serverAt(CONN_VIEW);
  return (
    <>
      <Globe v={{ ...CONN_VIEW, spin: interpolate(frame, [0, 300], [2, -2]) }} trips={trips} serverGlow={{ color: GREEN, amount: code }} route={{ draw: fade(frame, 4, 24) }} />
      <Header text="One new connection" />
      <Timeline top={400} fills={fills} title="" total={msTxt(data.new.total)} totalColor={FG} showTotal={fills[2] >= 1 ? 1 : 0} code={code} />
      {/* bracket over the two setup round trips */}
      <div style={{ position: "absolute", left: TL_X, top: 372, width: px(data.setup) - 6, opacity: brace }}>
        <div style={{ height: 14, borderTop: `5px solid ${RED}`, borderLeft: `5px solid ${RED}`, borderRight: `5px solid ${RED}`, borderRadius: "8px 8px 0 0" }} />
      </div>
      <div style={{ position: "absolute", left: TL_X, top: 316, fontFamily: MONO, fontWeight: 800, fontSize: 44, color: RED, opacity: brace }}>{msTxt(data.setup)} before your code</div>
      <Sfx name="reveal" at={setup} volume={0.35} />
      {tripStarts.map((st, i) => (
        <Sfx key={i} name="whoosh" at={Math.max(0, Math.round(st))} volume={0.25} />
      ))}
      <CityLabel at={c} name="Sydney" role="client" side="left" dy={30} opacity={fade(frame, sydney - 4)} />
      <CityLabel at={s} name="Frankfurt" role="server" side="right" dy={-70} opacity={fade(frame, frankfurt - 4)} />
      <div style={{ position: "absolute", left: s.x - 150, top: s.y + 50, fontFamily: MONO, fontWeight: 800, fontSize: 36, color: GREEN, opacity: code, textShadow: shadow }}>
        code {data.new.app} ms
      </div>
      <SlowMo />
    </>
  );
};

// ---- 5. Reuse the connection: 0.9 becomes 0.3 --------------------------------------------------------------------------

const REUSE_VIEW: View = { dist: 11.9, drop: 0.4 };

const Reuse: React.FC = () => {
  const frame = useCurrentFrame();
  const gone = useCue("gone", 50);
  const from = useCue("from", 80);
  const to = useCue("to", 100);
  const collapse = interpolate(frame, [gone - 4, gone + 18], [0, 1], { ...clamp, easing: ease });
  const D = 72;
  const trips: Trip[] = Array.from({ length: 4 }, (_, i) => ({ start: 6 + i * (D + 10), dur: D, color: GREEN }));
  const count = interpolate(frame, [from, to], [data.new.total, data.reused.total], { ...clamp, easing: ease });
  return (
    <>
      <Globe v={{ ...REUSE_VIEW, spin: interpolate(frame, [0, 200], [-2, 1]) }} trips={trips} route={{ color: GREEN, opacity: 0.35 + 0.4 * collapse }} clientColor={GREEN} />
      <Header text="Reuse the connection" />
      <Timeline top={380} fills={[1, 1, 1]} title="New" total={`${sec(data.new.total)} s`} totalColor={RED} showTotal={1} dim={frame > to} />
      <Timeline top={620} fills={[1, 1, 1]} collapse={collapse} title="Reused" total={`${sec(count)} s`} totalColor={collapse > 0.5 ? GREEN : FG} showTotal={1} />
      <Sfx name="whoosh" at={gone} volume={0.35} />
      
    </>
  );
};

// ---- 6. The take: one pool; measure where the user waits ---------------------------------------------------------------

const Code: React.FC<{ lines: string[]; tag: string; ok: boolean; at: number; top: number; strike: number }> = ({ lines, tag, ok, at, top, strike }) => {
  const color = ok ? GREEN : RED;
  return (
    <Pop at={at} sfx="reveal" style={{ left: 70, top, width: 940 }}>
      <div style={{ padding: "22px 30px", borderRadius: 22, background: "#15171a", border: `3px solid ${strike > 0 ? color : GRAY}`, fontFamily: MONO, fontSize: 40, lineHeight: 1.45, color: FG }}>
        {lines.map((l, i) => (
          <div key={i} style={{ whiteSpace: "pre" }}>
            {l}
          </div>
        ))}
        <div style={{ marginTop: 8, fontFamily: SANS, fontWeight: 700, fontSize: 34, color, opacity: strike }}>{tag}</div>
      </div>
    </Pop>
  );
};

const Take: React.FC = () => {
  const frame = useCurrentFrame();
  const pool = useCue("pool", 40);
  const request = useCue("request", 80);
  const waits = useCue("waits", 120);
  const works = useCue("works", 150);
  return (
    <>
      <Header text="Your app" />
      <Code at={2} top={380} ok={false} strike={fade(frame, request)} lines={["for order in orders:", "    requests.get(url)"]} tag={`new connection every call · ${sec(data.new.total)} s`} />
      <Code at={pool - 6} top={660} ok strike={fade(frame, pool + 10)} lines={["session = requests.Session()", "for order in orders:", "    session.get(url)"]} tag={`one pool, reused · ${sec(data.reused.total)} s`} />
      <Pop at={waits} sfx="reveal" style={{ left: 70, top: 1000, width: 420 }}>
        <div style={{ padding: "20px 26px", borderRadius: 22, border: `4px solid ${GREEN}`, background: "#20352a" }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: GREEN }}>Measure here</div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: FG }}>where the user waits</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 48, color: FG }}>{msTxt(data.new.total)}</div>
        </div>
      </Pop>
      <Pop at={works} style={{ left: 510, top: 1000, width: 420 }}>
        <div style={{ padding: "20px 26px", borderRadius: 22, border: `4px solid ${GRAY}`, opacity: 0.75 }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: LIGHT }}>Not here</div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: LIGHT }}>where the server works</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 48, color: LIGHT }}>{data.new.app} ms</div>
        </div>
      </Pop>
    </>
  );
};

// ---- 7. End: under load, the same request gets slow differently -------------------------------------------------------

const END_VIEW: View = { dist: 7.8, drop: -0.09, face: [32, 30] };

const End: React.FC = () => {
  const frame = useCurrentFrame();
  const load = useCue("load", 40);
  const next = useCue("next", 110);
  // Packets from land all over the world converge on the server once "load" is said (a fixed, seeded pick).
  const swarm = useMemo<Swarm[]>(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const dots = land as number[][];
    return Array.from({ length: 50 }, () => {
      const [lat, lon] = dots[Math.floor(rnd() * dots.length)];
      return { from: ll(lat, lon), start: Math.round(rnd() * 150), dur: 75 + Math.round(rnd() * 30), color: LIGHT };
    });
  }, []);
  const live = swarm.map((s) => ({ ...s, start: s.start + load }));
  const heat = interpolate(frame, [load + 20, load + 120], [0, 1], clamp);
  const s = serverAt(END_VIEW);
  return (
    <>
      <Globe v={{ ...END_VIEW, spin: interpolate(frame, [0, 240], [-3, 3]) }} swarm={live} serverGlow={{ color: RED, amount: heat }} route={{ opacity: 0 }} />
      <Header text="Under load" />
      <CityLabel at={s} name="Frankfurt" role="server" side="right" dy={-70} />
      <Pop at={next} style={{ left: 70, top: 1225 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT }}>
          Next: <span style={{ color: FG }}>the same request under load</span>
        </div>
      </Pop>
    </>
  );
};

export const SCENES1: Record<string, React.FC> = { globe: Hook, log: Log, production: ProductionScene, conn: Conn, reuse: Reuse, take: Take, end: End };

// Prototype A: the current 2D style, upgraded: real objects moving (rows streaming into tables at the lab's
// insert rates, keys dropping into index pages), less text on screen, labels only.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Mark, Pop, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { BG, FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { FALL, fmt, phase, rateAt, round100, rowsAt, simulate, speed, type Key } from "./sim";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

// ---- Scene 1: the race ------------------------------------------------------------------------------------------

const LANES: { key: Key; label: string; sub: string; y: number }[] = [
  { key: "v7", label: "UUIDv7", sub: "time-ordered", y: 640 },
  { key: "v4", label: "UUIDv4", sub: "random", y: 1010 },
];
const X0 = 70;
const X1 = 740;
const GAP = 112;
const UNIT = 30; // px per frame at v7's first-window rate

const laneColor = (key: Key, rate: number) =>
  key === "v7" ? GREEN : mix(LIGHT, RED, interpolate(rate, [20_000, 120_000], [1, 0], clamp));

// A database: the classic cylinder, glowing while rows arrive.
const Cylinder: React.FC<{ x: number; y: number; color: string; glow: number; shake: number }> = ({ x, y, color, glow, shake }) => (
  <svg width={260} height={250} style={{ position: "absolute", left: x + shake, top: y - 125, overflow: "visible" }}>
    <defs>
      <filter id={`g${y}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation={14} />
      </filter>
    </defs>
    <ellipse cx={130} cy={125} rx={120} ry={110} fill={color} opacity={0.18 * glow} filter={`url(#g${y})`} />
    <path d="M30 50 L30 200 A100 30 0 0 0 230 200 L230 50" fill={BG} stroke={color} strokeWidth={6} />
    {[100, 150].map((cy) => (
      <path key={cy} d={`M30 ${cy} A100 30 0 0 0 230 ${cy}`} fill="none" stroke={color} strokeWidth={4} opacity={0.5} />
    ))}
    <ellipse cx={130} cy={50} rx={100} ry={30} fill={BG} stroke={color} strokeWidth={6} />
  </svg>
);

const Lane: React.FC<{ lane: (typeof LANES)[number]; ten: number; slow: number; mark: number; bad: number }> = ({ lane, ten, slow, mark, bad }) => {
  const frame = useCurrentFrame();
  const rows = rowsAt(frame, ten, slow);
  const rate = rateAt(lane.key, rows);
  const color = laneColor(lane.key, rate);
  const p = phase(lane.key, frame, ten, slow, UNIT);
  const v = speed(lane.key, frame, ten, slow, UNIT);
  const n = Math.round((X1 - X0) / GAP);
  const gap = (X1 - X0) / n;
  const strain = lane.key === "v4" && frame > slow - 10 ? Math.sin(frame * 1.7) * 3 : 0;
  const shown = lane.key === "v4" && frame >= slow ? 6600 : lane.key === "v7" && frame >= ten + 1 && rows >= 10_000_000 ? 93000 : round100(rate);
  const enter = useSpring(0, 120);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter, transform: `translateX(${(1 - enter) * -60}px)` }}>
      <div style={{ position: "absolute", left: X0, top: lane.y - 150, display: "flex", alignItems: "baseline", gap: 22 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color }}>{lane.label}</span>
        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 36, color: MUTED }}>{lane.sub}</span>
      </div>
      {/* the belt */}
      <div style={{ position: "absolute", left: X0, top: lane.y + 34, width: X1 - X0 + 40, height: 6, borderRadius: 3, background: GRAY, opacity: 0.6 }} />
      {Array.from({ length: n }, (_, i) => {
        const x = X0 + ((((p + i * gap) % (X1 - X0)) + (X1 - X0)) % (X1 - X0));
        const fade = interpolate(x, [X0, X0 + 60, X1 - 50, X1], [0, 1, 1, 0], clamp);
        const blur = Math.min(10, v * 0.35);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: lane.y - 22, opacity: fade, display: "flex", gap: 4, filter: `blur(${blur * 0.15}px)` }}>
            {[34, 22, 22].map((w, j) => (
              <div key={j} style={{ width: w, height: 44, borderRadius: 5, background: color, opacity: j === 0 ? 1 : 0.55 }} />
            ))}
            {blur > 3 ? <div style={{ position: "absolute", right: "100%", top: 18, width: blur * 6, height: 8, borderRadius: 4, background: color, opacity: 0.25 }} /> : null}
          </div>
        );
      })}
      <Cylinder x={X1 + 20} y={lane.y + 10} color={color} glow={Math.min(1, v / 12)} shake={strain} />
      <div style={{ position: "absolute", left: X0, top: lane.y + 70, fontFamily: MONO, fontWeight: 800, fontSize: 64, color }}>
        {fmt(shown)}
        <span style={{ fontSize: 34, color: MUTED, fontWeight: 400 }}> rows/s</span>
      </div>
      <Pop at={mark} style={{ left: 855, top: lane.y - 205 }}>
        <Mark ok size={70} />
      </Pop>
      {lane.key === "v4" && frame >= bad ? (
        <Pop at={bad} sfx="buzz" style={{ left: 855, top: lane.y - 205, background: BG }}>
          <Mark ok={false} color={RED} size={70} />
        </Pop>
      ) : null}
    </div>
  );
};

const Race: React.FC = () => {
  const frame = useCurrentFrame();
  const today = useCue("today", 30);
  const ten = useCue("ten", 120);
  const slow = useCue("slow", 190);
  const fast = useCue("fast", 240);
  const x14 = useCue("x14", 280);
  const rows = rowsAt(frame, ten, slow);
  const tick = frame >= ten && frame < slow;
  const pop = useSpring(x14 - 4, 200);
  return (
    <>
      <div style={{ position: "absolute", top: 210, left: X0, right: 70 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: MUTED }}>rows in the table</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 120, color: FG, letterSpacing: -2, transform: `scale(${tick ? 1.04 : 1})`, transformOrigin: "left" }}>
          {fmt(rows)}
        </div>
        <div style={{ marginTop: 8, width: 140, height: 8, borderRadius: 4, background: GOLD }} />
      </div>
      {tick && frame % 4 === 0 ? <Sfx name="type" at={frame} volume={0.15} /> : null}
      <Sfx name="whoosh" at={ten} volume={0.5} />
      {LANES.map((l) => (
        <Lane key={l.key} lane={l} ten={ten} slow={slow} mark={today} bad={slow} />
      ))}
      {frame >= x14 - 4 ? (
        <div
          style={{
            position: "absolute",
            left: 560,
            top: 1115,
            transform: `scale(${0.4 + 0.6 * pop}) rotate(-4deg)`,
            opacity: Math.min(1, pop * 2),
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: 130,
            color: GREEN,
            textShadow: `0 0 40px ${GREEN}55`,
          }}
        >
          14x
          <Sfx name="stamp" at={x14 - 4} />
        </div>
      ) : null}
      {/* fast cue: the v7 number pulses once */}
      <div style={{ position: "absolute", left: X0 - 20, top: 690, width: 520, height: 110, borderRadius: 18, border: `4px solid ${GREEN}`, opacity: interpolate(frame, [fast, fast + 4, fast + 30], [0, 0.9, 0], clamp) }} />
    </>
  );
};

// ---- Scene 2: where each new key lands -------------------------------------------------------------------------

const ROWS: { key: Key; label: string; rule: string; y: number }[] = [
  { key: "v7", label: "UUIDv7", rule: "→ last page", y: 560 },
  { key: "v4", label: "UUIDv4", rule: "→ any page", y: 1000 },
];
const PAGE_H = 190;
const LEFT = 70;
const SPAN = 940;

const Pages: React.FC<{ row: (typeof ROWS)[number]; start: number }> = ({ row, start }) => {
  const frame = useCurrentFrame();
  const { pages, inFlight } = simulate(row.key, frame, start);
  const color = row.key === "v7" ? GREEN : RED;
  const visible = row.key === "v7" ? 6 : Math.max(6, pages.length);
  const first = row.key === "v7" ? pages.length - 6 : 0;
  // v7 slides left when a page opens; animate the offset from the moment the newest page was born.
  const born = pages[pages.length - 1].born;
  const slide = row.key === "v7" && born > 0 ? interpolate(frame, [born, born + 10], [1, 0], clamp) : 0;
  const pitch = SPAN / visible;
  const w = pitch - 18;
  const xOf = (i: number) => LEFT + (i - first + slide) * pitch;
  const enter = useSpring(2, 120);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter }}>
      <div style={{ position: "absolute", left: LEFT, top: row.y - 200, display: "flex", alignItems: "baseline", gap: 22 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color }}>{row.label}</span>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT }}>{row.rule}</span>
      </div>
      {pages.map((pg, i) => {
        if (i < first - 1) return null;
        const x = xOf(i);
        const hit = interpolate(frame - pg.hit, [0, 3, 14], [0, 1, 0], clamp);
        const split = interpolate(frame - pg.split, [0, 4, 22], [0, 1, 0], clamp);
        const grow = pg.born > 0 ? interpolate(frame, [pg.born, pg.born + 8], [0, 1], clamp) : 1;
        const border = split > 0 ? mix(GRAY, RED, split) : hit > 0 ? mix(GRAY, color, hit) : GRAY;
        return (
          <div
            key={pg.id}
            style={{
              position: "absolute",
              left: x,
              top: row.y,
              width: w,
              height: PAGE_H,
              border: `5px solid ${border}`,
              borderRadius: 12,
              background: BG,
              overflow: "hidden",
              transform: `scale(${(0.6 + 0.4 * grow) * (1 + 0.06 * hit)})`,
              opacity: grow,
              boxShadow: split > 0 ? `0 0 ${30 * split}px ${RED}` : undefined,
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.min(1, pg.fill) * 100}%`, background: color, opacity: row.key === "v7" ? 0.55 : 0.4 }} />
          </div>
        );
      })}
      {inFlight.map((d) => {
        const i = pages.findIndex((p) => p.id === d.page);
        if (i < 0) return null;
        const t = interpolate(frame, [d.spawn, d.land], [0, 1], clamp);
        const y = row.y - 150 + t * t * 170;
        const x = xOf(i) + w / 2 - 70;
        return (
          <div key={d.k} style={{ position: "absolute", left: x, top: y, width: 140, textAlign: "center", opacity: interpolate(t, [0, 0.15, 0.9, 1], [0, 1, 1, 0]) }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: FG }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const Index: React.FC = () => {
  const id = useCue("id", 40);
  return (
    <>
      <div style={{ position: "absolute", top: 210, left: LEFT }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 72, color: FG }}>Index pages</div>
        <div style={{ marginTop: 18, width: 140, height: 8, borderRadius: 4, background: GOLD }} />
      </div>
      {ROWS.map((r) => (
        <Pages key={r.key} row={r} start={Math.max(4, id - FALL)} />
      ))}
    </>
  );
};

export const SCENES_A: Record<string, React.FC> = { race: Race, index: Index };

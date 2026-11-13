// Long video scene 7: the lab scene. The real run 1 log (g2-run1.json, parsed from results-ec2-t3small-2026-10-27.txt by
// tools/long_run1.py) replays as three terminal columns with a bar beside each line, then the insert-rate lines, the
// 14x bracket, the load times and the one-client caveat. Times are the Whisper word starts of the take.
import React from "react";
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import run from "./g2-run1.json";
import { Sfx, clamp01, mix, sec } from "./g2-3d";
import { BG, FG, GOLD, GREEN, GRAY, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";

type Line = { rows: number; rate: number; raw: string };
const V = run.variants as unknown as Record<string, { lines: Line[]; load_s: number; first: number; last: number; last_first: number }>;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fmt = (n: number) => n.toLocaleString("en-US");
const MAXRATE = 270_000;

// When each of the 10 lines types in (seconds), tied to the words: "first million" 4.0, "10 million" 9.1; "126,000" 14.3,
// "two million" 17.1, "five million" 19.4, "last million" 22.1; v7 "183,000" 27.7 and "93,000" 30.0.
const T = {
  bigint: [4.0, 4.7, 5.4, 6.1, 6.8, 7.5, 8.0, 8.5, 8.8, 9.1],
  v4: [14.4, 17.1, 17.6, 18.4, 19.4, 20.0, 20.5, 21.0, 21.5, 22.3],
  v7: [27.7, 28.0, 28.3, 28.6, 28.9, 29.2, 29.5, 29.7, 29.85, 30.1],
};
const COLS: { key: "bigint" | "v4" | "v7"; name: string; sub: string; head: number }[] = [
  { key: "bigint", name: "bigint", sub: "counter", head: 2.6 },
  { key: "v4", name: "UUIDv4", sub: "random", head: 11.94 },
  { key: "v7", name: "UUIDv7", sub: "time-ordered", head: 25.18 },
];
const COLW = 740;
const GAP = 60;
const X0 = 110;
const ROW0 = 470;
const LH_ = 64;
const T_CHART = 32.0;
const T_CAVEAT = 56.4;

const lineColor = (key: string, rate: number, last: boolean) => {
  if (key === "v7") return GREEN;
  if (key === "v4") return mix(LIGHT, RED, 1 - clamp01((rate - 6_000) / 100_000));
  return last ? FG : LIGHT;
};

export const Lab: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = (s: number) => sec(s);
  const fadeIn = interpolate(frame, [0, 10], [0, 1], clamp);
  const termOp = interpolate(frame, [f(T_CHART - 0.4), f(T_CHART + 0.4)], [1, 0], clamp);
  const chartOp = interpolate(frame, [f(T_CHART), f(T_CHART + 0.6), f(T_CAVEAT - 0.4), f(T_CAVEAT + 0.2)], [0, 1, 1, 0], clamp);
  const caveatOp = interpolate(frame, [f(T_CAVEAT), f(T_CAVEAT + 0.6)], [0, 1], clamp);
  const pop = (s: number, st = 170) => spring({ frame: frame - f(s), fps, config: { damping: 14, stiffness: st } });

  return (
    <AbsoluteFill style={{ background: BG, opacity: fadeIn }}>
      <Audio src={staticFile("audio/long-03-s07-en.wav")} />
      {/* title and the run's machine, like a terminal title bar */}
      <div style={{ position: "absolute", top: 80, left: 110, opacity: 1 - caveatOp }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: FG }}>The real run</div>
        <div style={{ marginTop: 14, width: 180, height: 10, borderRadius: 5, background: GOLD }} />
      </div>
      <div style={{ position: "absolute", top: 98, right: 110, textAlign: "right", fontFamily: MONO, fontSize: 36, color: MUTED, lineHeight: 1.45 }}>
        <div>results-ec2-t3small-2026-10-27.txt</div>
        <div>run 1 · t3.small · eu-central-1 · PostgreSQL 18.6 · 512 MB</div>
      </div>

      {/* three terminal columns */}
      <AbsoluteFill style={{ opacity: termOp }}>
        {COLS.map((c, ci) => {
          const x0 = X0 + ci * (COLW + GAP);
          const v = V[c.key];
          const hp = pop(c.head);
          const hl = (rate: number, i: number) => (c.key === "v4" ? (i === 9 ? RED : lineColor("v4", rate, false)) : lineColor(c.key, rate, i === 9));
          return (
            <div key={c.key} style={{ position: "absolute", left: x0, top: 300, width: COLW }}>
              <div style={{ opacity: Math.min(1, hp * 1.5), transform: `translateY(${(1 - hp) * 14}px)` }}>
                <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 68, color: c.key === "v7" ? GREEN : c.key === "v4" ? RED : LIGHT }}>{c.name}</span>
                <span style={{ fontFamily: SANS, fontSize: 44, color: MUTED, marginLeft: 20 }}>{c.sub}</span>
                <div style={{ fontFamily: MONO, fontSize: 34, color: MUTED, marginTop: 6 }}>rows,inserts_per_s</div>
              </div>
              {v.lines.map((ln, i) => {
                const t0 = f(T[c.key][i]);
                if (frame < t0) return null;
                const p = clamp01((frame - t0) / 12);
                const col = hl(ln.rate, i);
                const last = i === 9;
                const big = c.key !== "bigint" && last;
                return (
                  <div key={i} style={{ position: "absolute", left: 0, top: 150 + i * LH_ - 0, height: LH_, display: "flex", alignItems: "center", opacity: p }}>
                    <span style={{ fontFamily: MONO, fontWeight: last ? 800 : 400, fontSize: 42, color: col, width: 400 }}>{ln.raw}</span>
                    <div style={{ width: Math.max(4, (ln.rate / MAXRATE) * 330 * p), height: 30, borderRadius: 6, background: col }} />
                    {big ? <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: col, marginLeft: 14 }}>←</span> : null}
                  </div>
                );
              })}
            </div>
          );
        })}
        {/* summary line under each column when its last line has landed */}
        {COLS.map((c, ci) => {
          const v = V[c.key];
          const at = f(T[c.key][9] + 0.5);
          if (frame < at) return null;
          const p = clamp01((frame - at) / 14);
          return (
            <div key={c.key} style={{ position: "absolute", left: X0 + ci * (COLW + GAP), top: 150 + 300 + 10 * LH_ + 20, opacity: p, fontFamily: MONO, fontSize: 38, color: MUTED }}>
              {fmt(v.first)} → {fmt(v.last)} /s
            </div>
          );
        })}
      </AbsoluteFill>

      {/* insert-rate chart over the log: UUID - 3 Insert rate */}
      <AbsoluteFill style={{ opacity: chartOp }}>
        <Chart frame={frame} f={f} />
      </AbsoluteFill>

      {/* one-client caveat */}
      <AbsoluteFill style={{ opacity: caveatOp }}>
        <Caveat frame={frame} f={f} pop={pop} />
      </AbsoluteFill>

      <Sfx name="whoosh" from={f(T_CHART)} volume={0.3} />
      <Sfx name="stamp" from={f(34.44) - 3} volume={0.5} />
      <Sfx name="buzz" from={f(22.3)} volume={0.15} />
    </AbsoluteFill>
  );
};

// ---- chart -------------------------------------------------------------------------------------------------------

const CX0 = 330;
const CX1 = 1480;
const CY0 = 440; // top (rate 270k)
const CY1 = 1160; // bottom (rate 0)
const px = (rows: number) => CX0 + ((rows - 1_000_000) / 9_000_000) * (CX1 - CX0);
const py = (rate: number) => CY1 - (rate / MAXRATE) * (CY1 - CY0);

const Chart: React.FC<{ frame: number; f: (s: number) => number }> = ({ frame, f }) => {
  const draw = (start: number, dur: number) => clamp01((frame - f(start)) / f(dur));
  const series: { key: "bigint" | "v4" | "v7"; color: string; p: number }[] = [
    { key: "bigint", color: LIGHT, p: draw(T_CHART + 0.2, 1.8) },
    { key: "v7", color: GREEN, p: draw(T_CHART + 0.5, 1.8) },
    { key: "v4", color: RED, p: draw(T_CHART + 0.8, 1.8) },
  ];
  const pt = (key: string) => V[key].lines.map((l) => `${px(l.rows)},${py(l.rate)}`).join(" ");
  const x14 = clamp01((frame - (f(34.44) - 3)) / 10);
  const yV7 = py(V.v7.last);
  const yV4 = py(V.v4.last);
  const cell = (s: number) => clamp01((frame - f(s)) / 14);
  return (
    <>
      <svg width={2560} height={1440} style={{ position: "absolute", inset: 0 }}>
        {[0, 100_000, 200_000].map((r) => (
          <g key={r}>
            <line x1={CX0} x2={CX1} y1={py(r)} y2={py(r)} stroke="#2c3036" strokeWidth={2} />
            <text x={CX0 - 24} y={py(r) + 14} textAnchor="end" fontFamily={MONO} fontSize={36} fill={MUTED}>{r === 0 ? "0" : `${r / 1000}k`}</text>
          </g>
        ))}
        {[1, 5, 10].map((m) => (
          <text key={m} x={px(m * 1_000_000)} y={CY1 + 64} textAnchor="middle" fontFamily={MONO} fontSize={36} fill={MUTED}>{m}M</text>
        ))}
        <text x={CX0} y={CY0 - 60} fontFamily={SANS} fontWeight={700} fontSize={44} fill={MUTED}>inserts per second</text>
        <text x={CX1} y={CY1 + 120} textAnchor="end" fontFamily={SANS} fontWeight={700} fontSize={44} fill={MUTED}>rows in the table</text>
        {series.map((s) => (
          <polyline key={s.key} points={pt(s.key)} pathLength={1} fill="none" stroke={s.color} strokeWidth={s.key === "bigint" ? 8 : 12} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - s.p} />
        ))}
        {/* 14x bracket at 10M */}
        <g opacity={x14}>
          <path d={`M ${CX1 + 30} ${yV7} L ${CX1 + 60} ${yV7} L ${CX1 + 60} ${yV4} L ${CX1 + 30} ${yV4}`} fill="none" stroke={FG} strokeWidth={6} />
        </g>
        {/* end labels */}
        <g opacity={cell(T_CHART + 2.2)}>
          <text x={CX1 + 20} y={py(V.bigint.last) - 20} textAnchor="end" fontFamily={MONO} fontWeight={800} fontSize={44} fill={LIGHT}>{fmt(V.bigint.last)}</text>
        </g>
      </svg>
      <div style={{ position: "absolute", left: CX1 + 90, top: (yV7 + yV4) / 2 - 80, transform: `scale(${0.5 + 0.5 * x14})`, transformOrigin: "left center", opacity: x14, fontFamily: MONO, fontWeight: 800, fontSize: 150, color: FG, textShadow: "0 0 40px #000" }}>14x</div>
      <div style={{ position: "absolute", left: CX1 + 90, top: yV7 - 70, opacity: cell(T_CHART + 2.2), fontFamily: MONO, fontWeight: 800, fontSize: 44, color: GREEN }}>{fmt(V.v7.last)}</div>
      <div style={{ position: "absolute", left: CX1 + 90, top: yV4 - 22, opacity: cell(T_CHART + 2.2), fontFamily: MONO, fontWeight: 800, fontSize: 44, color: RED }}>{fmt(V.v4.last)}</div>
      {/* legend */}
      <div style={{ position: "absolute", left: 330, top: 260, display: "flex", gap: 56, fontFamily: SANS, fontWeight: 800, fontSize: 52 }}>
        <span style={{ color: LIGHT }}>bigint</span>
        <span style={{ color: RED }}>UUIDv4</span>
        <span style={{ color: GREEN }}>UUIDv7</span>
      </div>
      {/* right column: load times, runs, slowdown */}
      <div style={{ position: "absolute", left: 2010, top: 440, width: 460 }}>
        <div style={{ opacity: cell(36.3) }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: MUTED }}>load 10M rows</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: RED, lineHeight: 1.1 }}>{V.v4.load_s} s</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: GREEN, lineHeight: 1.1 }}>{V.v7.load_s} s</div>
        </div>
        <div style={{ marginTop: 56, opacity: cell(41.3) }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: MUTED }}>4 runs, gap at the end</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 76, color: FG }}>13x to 28x</div>
        </div>
        <div style={{ marginTop: 56, opacity: cell(48.8) }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: MUTED }}>last ÷ first window</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 76, color: GREEN, lineHeight: 1.1 }}>{V.v7.last_first.toFixed(2)}</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 76, color: RED, lineHeight: 1.1 }}>{V.v4.last_first.toFixed(2)}</div>
        </div>
      </div>
    </>
  );
};

// ---- caveat card -------------------------------------------------------------------------------------------------

const Caveat: React.FC<{ frame: number; f: (s: number) => number; pop: (s: number, st?: number) => number }> = ({ frame, f, pop }) => {
  const a = pop(57.76);
  const b = pop(60.48);
  const c = pop(64.42);
  const d = pop(68.76, 140);
  void frame;
  void f;
  return (
    <>
      <div style={{ position: "absolute", left: 110, top: 300, fontFamily: SANS, fontWeight: 800, fontSize: 84, color: FG }}>
        Honest note
        <div style={{ marginTop: 14, width: 180, height: 10, borderRadius: 5, background: GOLD }} />
      </div>
      <div style={{ position: "absolute", left: 110, top: 520, width: 1060, opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * 20}px)`, border: `5px solid ${GRAY}`, borderRadius: 24, padding: "40px 48px", background: "#20232a" }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: MUTED }}>this test</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: FG, marginTop: 14, lineHeight: 1.3 }}>1 client<br />250,000 rows per INSERT</div>
      </div>
      <div style={{ position: "absolute", left: 1390, top: 520, width: 1060, opacity: Math.min(1, b * 1.5), transform: `translateY(${(1 - b) * 20}px)`, border: `5px solid ${GRAY}`, borderRadius: 24, padding: "40px 48px", background: "#20232a" }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: MUTED }}>a real service</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: FG, marginTop: 14, lineHeight: 1.3 }}>1 row per INSERT<br />many connections</div>
      </div>
      <div style={{ position: "absolute", left: 110, top: 900, opacity: Math.min(1, c * 1.5), fontFamily: SANS, fontWeight: 700, fontSize: 60, color: LIGHT }}>
        the disk reads behind each random insert: <span style={{ color: FG }}>the same</span> · the size of the gap: <span style={{ color: FG }}>different</span>
      </div>
      <div style={{ position: "absolute", left: 110, top: 1080, opacity: Math.min(1, d * 1.5), transform: `scale(${0.8 + 0.2 * d})`, transformOrigin: "left center", fontFamily: SANS, fontWeight: 800, fontSize: 130, color: FG }}>
        Compare the <span style={{ color: GREEN }}>ratio</span>, not the seconds.
      </div>
    </>
  );
};

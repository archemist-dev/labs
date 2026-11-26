// Scene 5: why cleanup can't remove them. (A) An update writes a new copy and leaves the old one: one order, four
// copies, three dead (3D slabs). (B) A time line in 3D: old copies appear minute by minute and cleanup removes them,
// until the report starts at 18:00; cleanup can't pass that line, and every copy made after it stays (1 cube = 10,000
// copies, 30,000 a minute at 500 updates a second). (C) Every table in the database; growth = update rate x time.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import logs from "./logs.json";
import { Appear, Block, Card, cl, cue, ease, Muted, proj, Scene, Sfx, Stage, Tag, Title, useWin } from "./common";

const ST = ["PLACED", "COOKING", "PICKED_UP", "DELIVERED"];
const ACAM = { pos: [0, 3.2, 13] as [number, number, number], look: [0, 2.4, 0] as [number, number, number], fov: 38 };
const BCAM = { pos: [0, 6.5, 15.5] as [number, number, number], look: [0, 2.6, 0] as [number, number, number], fov: 38 };
const ap = (x: number, y: number, z: number) => proj(ACAM.pos, ACAM.look, ACAM.fov, [x, y, z]);
const bp = (x: number, y: number, z: number) => proj(BCAM.pos, BCAM.look, BCAM.fov, [x, y, z]);
const MINS = Array.from({ length: 12 }, (_, i) => i - 5); // 17:55 .. 18:06
const DX = 1.45;
const X = (k: number) => (k - 0.5) * DX; // the report's line (k = -0.5) sits at the centre
const growthMb = logs.hour.table[1] - logs.hour.baseline_mb; // 215

export const Why: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("05", w, n);
  const at = {
    update: c("update"), place: c("place."), fresh: c("new"), old: c("old"),
    st: [c("Placed"), c("cooking"), c("picked"), c("delivered")], four: c("four"), three: c("three"),
    reader: c("reader"), writer: c("writer"),
    cleanup: c("Cleanup", 2), only: c("only"), query: c("query", 2), snap: c("snapshot"), six: c("six"), after: c("after"), stay: c("stay"), ends: c("ends"),
    every: c("every", 2), rate: c("rate"), n215: c("215"), n50: c("50"), small: c("small"), x28: c("2.8"),
  };
  const A = useWin(0, at.cleanup);
  const B = useWin(at.cleanup, at.every - 14);
  const C = useWin(at.every - 14);
  const shown = at.st.filter((f) => frame >= f).length; // copies on disk
  // B: the clock runs from 17:55 to 18:00 by "six", then on to 18:07
  const m = frame < at.six ? interpolate(frame, [at.cleanup, at.six], [-5, 0], cl) : interpolate(frame, [at.six, at.ends + 20], [0, 6.6], cl);
  const cleaner = Math.min(m - 1.3, -0.5); // cleanup follows 1.3 minutes behind and stops at the report's line
  const wall = interpolate(frame, [at.six - 10, at.six + 6], [0, 1], cl);
  return (
    <Scene id="05">
      {/* A: one order, four copies */}
      <div style={{ position: "absolute", inset: 0, opacity: A }}>
        <Title text="Every update leaves a copy" at={0} />
        <Stage pos={ACAM.pos} look={ACAM.look} fov={ACAM.fov}>
          {ST.map((s, i) => {
            if (frame < at.st[i]) return null;
            const p = ease(interpolate(frame, [at.st[i], at.st[i] + 14], [0, 1], cl));
            const deadNow = shown > i + 1;
            return <Block key={s} p={[1.2, 0.5 + i * 1.15 + (1 - p) * 0.8, 0]} s={[6.4, 0.9, 1.6]} color={deadNow ? GRAY : LIGHT} glow={deadNow ? 0.04 : 0.16} opacity={deadNow ? 0.75 : 1} />;
          })}
        </Stage>
        {ST.map((s, i) => {
          const pt = ap(1.2, 0.5 + i * 1.15, 0.8);
          const deadNow = shown > i + 1;
          return frame >= at.st[i] + 6 ? (
            <div key={s} style={{ position: "absolute", left: pt.x - 500, width: 1000, whiteSpace: "nowrap", top: pt.y - 40, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 54, color: deadNow ? "#c9cdd3" : "#1b1d21" }}>
              status = {s}
              {deadNow ? <span style={{ color: MUTED, fontWeight: 700 }}> · dead</span> : null}
            </div>
          ) : null;
        })}
        <Appear at={at.update} until={at.st[0] - 6} style={{ left: 120, top: 330 }}>
          <Card style={{ width: 1500 }}>
            <div style={{ fontFamily: MONO, fontSize: 52, color: FG, lineHeight: 1.5 }}>
              UPDATE orders SET status = <span style={{ color: GREEN }}>'COOKING'</span>
              <br />
              WHERE id = 48213377;
            </div>
          </Card>
        </Appear>
        <Appear at={at.place} until={at.st[0] - 6} style={{ left: 120, top: 660 }}>
          <Tag size={64} color={MUTED}>not changed in place</Tag>
        </Appear>
        <Appear at={at.fresh} until={at.st[0] - 6} style={{ left: 120, top: 780 }}>
          <Tag size={64}>
            a new copy is written
            <span style={{ color: MUTED, opacity: interpolate(frame, [at.old, at.old + 8], [0, 1], cl) }}> · the old one stays</span>
          </Tag>
        </Appear>
        <Appear at={at.st[0]} until={at.reader - 6} style={{ left: 120, top: 330 }}>
          <Muted size={52}>order 48213377</Muted>
        </Appear>
        <Appear at={at.four} until={at.reader - 6} style={{ left: 120, top: 1180 }}>
          <Tag size={76}>
            <span style={{ fontFamily: MONO }}>4</span> copies on disk
            <span style={{ color: MUTED, opacity: interpolate(frame, [at.three, at.three + 8], [0, 1], cl) }}>
              {" "}· <span style={{ fontFamily: MONO }}>3</span> dead
            </span>
          </Tag>
        </Appear>
        <Appear at={at.reader} style={{ left: 120, top: 560 }}>
          <Tag size={60} color={LIGHT}>a reader</Tag>
          <Muted size={46}>keeps seeing the old copy</Muted>
        </Appear>
        <Appear at={at.writer} style={{ left: 120, top: 330 }}>
          <Tag size={60} color={GREEN}>a writer</Tag>
          <Muted size={46}>makes the new one</Muted>
        </Appear>
        <Appear at={at.reader} style={{ left: 120, top: 1180 }}>
          <Tag size={60}>readers and writers never wait</Tag>
          <Muted size={40} style={{ fontFamily: MONO }}>MVCC</Muted>
        </Appear>
      </div>

      {/* B: the time line */}
      <div style={{ position: "absolute", inset: 0, opacity: B }}>
        <Title text="Where cleanup stops" at={at.cleanup} />
        <Stage pos={BCAM.pos} look={BCAM.look} fov={BCAM.fov}>
          {MINS.map((k) => {
            if (m < k) return null;
            const born = ease(Math.min(1, (m - k) / 0.5));
            const kept = k >= 0;
            const gone = kept ? 0 : ease(Math.min(1, Math.max(0, (cleaner - k) / 0.45)));
            if (gone >= 1) return <Block key={k} p={[X(k), 0.03, 0]} s={[1.0, 0.04, 1.0]} color={GRAY} glow={0.02} opacity={0.5} />;
            return [0, 1, 2].map((j) => (
              <Block key={`${k}-${j}`} p={[X(k), 0.5 + j * 1.05 * born, 0]} s={[1.0 * (1 - gone), 0.95 * born * (1 - gone), 1.0 * (1 - gone)]} color={kept ? RED : GRAY} glow={kept ? 0.2 : 0.06} />
            ));
          })}
          {/* cleanup: a bright bar that follows the clock and stops at the line */}
          <Block p={[X(cleaner) - 0.2, 1.7, 0]} s={[0.12, 3.4, 1.5]} color={GREEN} glow={0.5} opacity={0.85} />
          {/* the report's line */}
          <Block p={[X(-0.5), 2.2 * wall, 0]} s={[0.08, 4.4 * wall, 2.6]} color={FG} glow={0.5} opacity={0.9 * wall} />
        </Stage>
        {[-4, -2, 0, 2, 4, 6].map((k) => {
          const pt = bp(X(k), 0, 1.4);
          const mm = (60 + k) % 60;
          return (
            <div key={k} style={{ position: "absolute", left: pt.x - 100, width: 200, top: pt.y + 16, textAlign: "center", fontFamily: MONO, fontSize: 44, fontWeight: 700, color: k === 0 && wall > 0 ? FG : MUTED }}>
              {k < 0 ? 17 : 18}:{String(mm).padStart(2, "0")}
            </div>
          );
        })}
        {(() => {
          const pt = bp(X(cleaner) - 0.2, 0, 1.4);
          return (
            <div style={{ position: "absolute", left: pt.x - 200, width: 400, top: pt.y + 96, textAlign: "center" }}>
              <Tag size={54} color={GREEN}>cleanup</Tag>
              <Muted size={36} style={{ fontFamily: MONO }}>vacuum</Muted>
            </div>
          );
        })()}
        {(() => {
          const pt = bp(X(-0.5), 4.4, 0);
          return (
            <div style={{ position: "absolute", left: pt.x - 700, width: 1400, top: pt.y - 170, textAlign: "center", opacity: wall }}>
              <Tag size={60}>the report starts · 18:00</Tag>
              <Muted size={46} style={{ opacity: interpolate(frame, [at.six, at.six + 10], [0, 1], cl) }}>it sees the database as of this moment: its snapshot</Muted>
            </div>
          );
        })()}
        <Appear at={at.only} until={at.six - 12} style={{ left: 120, top: 270 }}>
          <Tag size={56} color={MUTED}>removes only what no running query could still need</Tag>
        </Appear>
        <Appear at={at.stay} style={{ left: 1640, top: 1230 }}>
          <Tag size={64} color={RED}>kept</Tag>
          <Muted size={48} style={{ opacity: interpolate(frame, [at.ends - 20, at.ends - 10], [0, 1], cl) }}>until the report ends</Muted>
        </Appear>
        <Muted size={38} style={{ position: "absolute", right: 120, top: 120 }}>1 block = 10,000 old copies · 500 updates / s</Muted>
      </div>

      {/* C: every table, and what the growth follows */}
      <div style={{ position: "absolute", inset: 0, opacity: C }}>
        <Title text="Every table in the database" at={at.every - 14} until={at.rate - 6} />
        <Title text="Growth = update rate × time" at={at.rate} />
        <div style={{ position: "absolute", inset: 0, opacity: interpolate(frame, [at.rate - 12, at.rate - 2], [1, 0], cl) }}>
          {["orders", "payments", "users", "events"].map((t, i) => {
            const g = interpolate(frame, [at.every + i * 5, at.rate], [0, 1], cl);
            return (
              <div key={t} style={{ position: "absolute", left: 200 + i * 560, top: 380, width: 440 }}>
                <div style={{ height: 620, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{ height: 40 + 330 * g, background: RED, borderRadius: "14px 14px 0 0", opacity: 0.9 }} />
                  <div style={{ height: 200, background: GRAY, borderRadius: "0 0 14px 14px" }} />
                </div>
                <div style={{ marginTop: 18, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 56, color: FG }}>{t}</div>
              </div>
            );
          })}
          <Muted size={50} style={{ position: "absolute", left: 200, top: 1180 }}>one open snapshot holds cleanup back on all of them</Muted>
        </div>
        <Appear at={at.rate} style={{ left: 120, top: 320 }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 84, color: FG }}>
            500 updates / s × 60 min
            <span style={{ opacity: interpolate(frame, [at.n215, at.n215 + 8], [0, 1], cl) }}>
              {" "}≈ <span style={{ color: RED }}>{growthMb} MB</span>
            </span>
          </div>
        </Appear>
        {[
          { at: at.n50, top: 560, name: "a 50 GB table", base: 1900, add: 8, note: "under 1%" },
          { at: at.small, top: 900, name: "a 120 MB table", base: 260, add: 468, note: `${logs.hour.table_x.toFixed(1)}x` },
        ].map((r) => (
          <Appear key={r.name} at={r.at} style={{ left: 120, top: r.top }}>
            <Tag size={60}>{r.name}</Tag>
            <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
              <div style={{ width: r.base, height: 110, background: GRAY, borderRadius: "14px 0 0 14px" }} />
              <div style={{ width: r.add * ease(interpolate(frame, [r.at + 6, r.at + 26], [0, 1], cl)), height: 110, background: RED, borderRadius: "0 14px 14px 0" }} />
              <div style={{ marginLeft: 26, whiteSpace: "nowrap", fontFamily: MONO, fontWeight: 800, fontSize: 84, color: RED, opacity: interpolate(frame, [r.name.startsWith("a 120") ? at.x28 : r.at + 20, (r.name.startsWith("a 120") ? at.x28 : r.at + 20) + 8], [0, 1], cl) }}>{r.note}</div>
            </div>
          </Appear>
        ))}
      </div>
      <Sfx name="whoosh" from={at.cleanup - 8} volume={0.3} />
      <Sfx name="impact" from={at.six} volume={0.3} />
    </Scene>
  );
};

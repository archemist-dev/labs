// Scene 4: lab scene 1, the hour. The real per-minute rows of the 60-minute hold (logs.json, run 1 of
// results-ec2-t3small-hour-2026-11-18.txt) scroll in a terminal: the first rows at reading pace, then a fast-forward
// to the last row of the hold. Dead rows and cleanup runs are lit in turn; then the log's own summary line.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BG, FG, GRAY, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import logs from "./logs.json";
import { Appear, Card, cl, cue, ease, fmt, Muted, Scene, Sfx, Stamp, Tag, Title, useWin } from "./common";

const R = logs.hour.rows;
const H = logs.hour;
const COLS = ["minute", "table MB", "dead rows", "cleanup runs"];
const CW = [250, 320, 440, 420];
const WINDOW = 8;

export const LabHour: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("04", w, n);
  const at = {
    log: c("log"), dead: c("dead"), starts: c("starts"), later: c("later"), end: c("end"), m18: c("1.8"), oneM: c("one", 2),
    other: c("other"), autov: c("autovacuum"), n235: c("235"), none: c("remove"), table: c("table", 2), x28: c("2.8"), idx: c("indexes"),
  };
  // which row is the newest on screen: row 0 when the report starts, rows 1..10 by "later", then a fast-forward to 59
  const a = interpolate(frame, [at.starts + 18, at.later], [0, 10], cl);
  const b = 10 + 49 * ease(interpolate(frame, [at.end, at.m18], [0, 1], cl));
  const idx = frame < at.starts ? -1 : Math.floor(frame < at.end ? a : b);
  const first = Math.max(0, idx - WINDOW + 1);
  const cur = idx >= 0 ? R[idx] : null;
  const litDead = frame >= at.dead;
  const litAv = frame >= at.other;
  const p1 = useWin(at.dead, at.table);
  const p2 = useWin(at.table);
  const colColor = (ci: number, last: boolean) => (ci === 2 && litDead ? RED : ci === 3 && litAv ? FG : last ? LIGHT : GRAY);
  return (
    <Scene id="04">
      <Title text="One report, one hour" at={0} />
      <div style={{ position: "absolute", top: 110, right: 120, textAlign: "right", fontFamily: MONO, fontSize: 34, color: MUTED }}>{logs.files.hour}</div>
      <Card style={{ position: "absolute", left: 100, top: 280, width: 1500, height: 1040, padding: "30px 40px" }}>
        <div style={{ display: "flex", fontFamily: MONO, fontSize: 40, marginBottom: 12 }}>
          {COLS.map((h, i) => (
            <div key={h} style={{ width: CW[i], textAlign: "right", fontWeight: 700, color: (i === 2 && litDead) || (i === 3 && litAv) ? FG : MUTED }}>{h}</div>
          ))}
        </div>
        {idx >= 0
          ? R.slice(first, idx + 1).map((r, k, arr) => {
              const last = k === arr.length - 1;
              return (
                <div key={r.min} style={{ display: "flex", fontFamily: MONO, fontSize: 58, lineHeight: 1.62 }}>
                  {[r.min, r.table, r.dead, r.av].map((v, ci) => (
                    <div key={ci} style={{ width: CW[ci], textAlign: "right", fontWeight: last || (ci === 2 && litDead) ? 800 : 400, color: colColor(ci, last) }}>{fmt(v)}</div>
                  ))}
                </div>
              );
            })
          : null}
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 28, opacity: p2, fontFamily: MONO, fontSize: 40, color: FG, whiteSpace: "pre", background: BG, borderRadius: 14, padding: "16px 22px" }}>{H.summary}</div>
      </Card>

      {/* readouts */}
      <div style={{ position: "absolute", inset: 0, opacity: p1 }}>
        <div style={{ position: "absolute", left: 1700, top: 300 }}>
          <Muted size={50}>dead rows</Muted>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 128, color: RED, lineHeight: 1.1 }}>{cur ? fmt(cur.dead) : "0"}</div>
          <Muted size={40}>old copies left by updates</Muted>
        </div>
        <Appear at={at.oneM} style={{ left: 1700, top: 620 }}>
          <Muted size={50}>orders in the table</Muted>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 110, color: FG, lineHeight: 1.1 }}>{fmt(1000000)}</div>
        </Appear>
        <Appear at={at.other} style={{ left: 1700, top: 880 }}>
          <Muted size={50}>
            cleanup runs <span style={{ fontFamily: MONO, fontSize: 40, opacity: interpolate(frame, [at.autov, at.autov + 8], [0, 1], cl) }}>· autovacuum</span>
          </Muted>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 128, color: FG, lineHeight: 1.1 }}>{cur ? cur.av : 0}</div>
        </Appear>
        <Stamp at={at.none} label="REMOVED: 0" color={RED} solid size={72} style={{ left: 1700, top: 1160 }} />
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: p2 }}>
        <div style={{ position: "absolute", left: 1700, top: 300 }}>
          <Muted size={50}>the table</Muted>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 104, color: FG, lineHeight: 1.15 }}>
            {H.table[0]} → <span style={{ color: RED }}>{H.table[1]} MB</span>
          </div>
        </div>
        <Appear at={at.x28} style={{ left: 1700, top: 520 }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 190, color: RED, lineHeight: 1.1 }}>{H.table_x.toFixed(1)}x</div>
        </Appear>
        <Appear at={at.idx} style={{ left: 1700, top: 800 }}>
          <Muted size={50}>its indexes</Muted>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 84, color: FG }}>
            {H.index[0]} → {H.index[1]} MB
          </div>
        </Appear>
        <Appear at={at.idx + 20} style={{ left: 1700, top: 1060 }}>
          <div style={{ padding: "18px 28px", borderRadius: 18, border: `4px dashed ${GRAY}` }}>
            <Tag size={52} color={LIGHT}>
              no long report: <span style={{ fontFamily: MONO }}>{H.baseline_mb} MB</span>
            </Tag>
          </div>
        </Appear>
      </div>
      <Sfx name="type" from={at.starts} volume={0.3} />
      <Sfx name="stamp" from={at.none} volume={0.5} />
    </Scene>
  );
};

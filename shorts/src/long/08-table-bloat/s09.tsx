// Scene 9: lab scene 2, the fixes. Left: the real summary lines of each 10-minute variant (logs.json, run 1 of
// results-ec2-t3small-2026-11-18.txt): the outcome is Postgres's own message. Under it, what the fix does in plain
// words with the setting as a small second line; for the replica, the report moving and the feedback signal.
// Right: where the table ended, grouped by meaning: what grows it, what stops it (cheapest first).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BG, FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import logs from "./logs.json";
import { Appear, Card, CARD_BG, cl, cue, ease, Muted, Scene, Sfx, Tag, Title, useWin } from "./common";

const T = logs.ten;
type V = keyof typeof T;
const START = T.long_report.table[0];
const MAXG = 37;

const BarRow: React.FC<{ at: number; v: V; label: string; sub?: string; good?: boolean }> = ({ at, v, label, sub, good }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at, at + 18], [0, 1], cl)); // the row keeps its place before it appears
  const end = T[v].table[1];
  const color = good ? GREEN : RED;
  return (
    <div style={{ marginTop: 22, opacity: Math.min(1, p * 3) }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 46, color: FG }}>{label}</div>
      {sub ? <div style={{ fontFamily: MONO, fontSize: 30, color: MUTED }}>{sub}</div> : null}
      <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
        <div style={{ width: Math.max(10, ((end - START) / MAXG) * 620 * p), height: 54, borderRadius: 8, background: color }} />
        <div style={{ marginLeft: 20, fontFamily: MONO, fontWeight: 800, fontSize: 56, color }}>{end} MB</div>
      </div>
    </div>
  );
};

const Rack: React.FC<{ name: string; left: number; stack: number; clean?: boolean }> = ({ name, left, stack, clean }) => (
  <div style={{ position: "absolute", left, top: 90, width: 330 }}>
    <div style={{ height: 300, borderRadius: 20, border: `5px solid ${clean ? GREEN : LIGHT}`, background: CARD_BG, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 18, boxSizing: "border-box" }}>
      <div style={{ height: 150 * stack, background: RED, borderRadius: "8px 8px 0 0", opacity: 0.9 }} />
      <div style={{ height: 80, background: GRAY, borderRadius: stack > 0.02 ? "0 0 8px 8px" : 8 }} />
    </div>
    <div style={{ marginTop: 10, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 46, color: FG }}>{name}</div>
  </div>
);

export const LabFixes: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("09", w, n);
  const at = {
    noLimit: c("limit"), n156: c("156"), fix1: c("idle"), closed: c("closed"), n124: c("124"), fix2: c("two"), cancelled: c("cancelled"), again: c("again"),
    role: c("role"), timeout: c("timeout"), index: c("index"), replica: c("replica"), did: c("did"), n157: c("157"), setting: c("setting"), tells: c("tells"), keeps: c("keeps"),
    offDef: c("default"), turn: c("turn"), off: c("off", 2), n122: c("122"), but: c("But", 2), thirty: c("after", 3), raise: c("raise"), behind: c("behind"), measure: c("measure"),
  };
  // the terminal: one variant at a time
  const blocks: { v: V; from: number; outAt: number; sizeAt: number }[] = [
    { v: "long_report", from: at.noLimit - 8, outAt: at.noLimit, sizeAt: at.n156 },
    { v: "idle_timeout", from: at.fix1 - 20, outAt: at.closed, sizeAt: at.n124 },
    { v: "report_timeout", from: at.fix2 - 10, outAt: at.cancelled, sizeAt: at.again },
    { v: "replica_feedback", from: at.did, outAt: at.did + 10, sizeAt: at.n157 },
    { v: "replica_no_feedback", from: at.off - 10, outAt: at.but + 20, sizeAt: at.n122 },
  ];
  const bi = blocks.reduce((acc, b, i) => (frame >= b.from ? i : acc), -1);
  const blk = bi >= 0 ? blocks[bi] : null;
  const o = (t: number) => interpolate(frame, [t, t + 8], [0, 1], cl);
  const f1 = useWin(at.fix1 - 20, at.fix2 - 10);
  const f2 = useWin(at.fix2 - 10, at.replica - 30);
  const rep = useWin(at.replica - 30);
  // the replica picture
  const moved = ease(interpolate(frame, [at.replica - 10, at.replica + 20], [0, 1], cl));
  const fbOn = frame >= at.setting && frame < at.off - 10;
  const fbOff = frame >= at.off - 10;
  const sig = fbOn ? (frame - at.setting) % 50 / 50 : 0;
  const stack = fbOff ? 0 : interpolate(frame, [at.did, at.keeps + 30], [0.15, 1], cl);
  const cancelledRep = frame >= at.but + 20;
  return (
    <Scene id="09">
      <Title text="The fixes, cheapest first" at={0} />
      <div style={{ position: "absolute", top: 110, right: 120, textAlign: "right", fontFamily: MONO, fontSize: 34, color: MUTED }}>{logs.files.ten}</div>

      <Card style={{ position: "absolute", left: 100, top: 280, width: 1280, height: 430, padding: "24px 32px" }}>
        {blk ? (
          <div style={{ fontFamily: MONO, fontSize: 40, lineHeight: 1.45 }}>
            <div style={{ color: MUTED }}>== {blk.v} · snapshot held 600 s</div>
            <div style={{ color: T[blk.v].outcome.startsWith("ran") ? FG : RED, opacity: o(blk.outAt), fontWeight: 700, marginTop: 8 }}>outcome: {T[blk.v].outcome}</div>
            <div style={{ color: T[blk.v].table[1] > 130 ? RED : GREEN, opacity: o(blk.sizeAt), fontWeight: 800, fontSize: 52, marginTop: 12, whiteSpace: "pre" }}>{T[blk.v].summary}</div>
          </div>
        ) : (
          <div style={{ fontFamily: MONO, fontSize: 40, color: MUTED }}>same load · snapshot held for 10 minutes</div>
        )}
      </Card>

      {/* what the fix does */}
      <div style={{ position: "absolute", left: 100, top: 760, width: 1280, opacity: f1 }}>
        <Muted size={44}>fix 1</Muted>
        <Tag size={64}>end idle transactions after 60 s</Tag>
        <div style={{ fontFamily: MONO, fontSize: 38, color: MUTED, marginTop: 8 }}>idle_in_transaction_session_timeout = 60s</div>
        <Tag size={50} color={GREEN} style={{ marginTop: 30, opacity: o(at.closed) }}>Postgres closes the forgotten transaction</Tag>
      </div>
      <div style={{ position: "absolute", left: 100, top: 760, width: 1280, opacity: f2 }}>
        <Muted size={44}>fix 2</Muted>
        <Tag size={64}>end slow queries after 60 s</Tag>
        <div style={{ fontFamily: MONO, fontSize: 38, color: MUTED, marginTop: 8 }}>statement_timeout = 60s</div>
        <div style={{ display: "flex", gap: 16, marginTop: 26, opacity: o(at.role) }}>
          {[["app", "short"], ["admin panel", "short"], ["migrations", "longer"], ["batch jobs", "longer"]].map(([r, l]) => (
            <div key={r} style={{ padding: "12px 22px", borderRadius: 16, border: `4px solid ${l === "short" ? GREEN : GRAY}`, textAlign: "center" }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>{r}</div>
              <div style={{ fontFamily: MONO, fontSize: 34, color: l === "short" ? GREEN : LIGHT }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 26, opacity: o(at.timeout) }}>
          <Tag size={48}>
            a timeout stops the damage
            <span style={{ opacity: o(at.index) }}>
              {" "}· <span style={{ color: GREEN }}>an index removes the reason</span>
            </span>
          </Tag>
          <Muted size={36} style={{ opacity: o(at.index + 30) }}>the index: not tested here</Muted>
        </div>
      </div>
      <div style={{ position: "absolute", left: 100, top: 740, width: 1280, height: 600, opacity: rep }}>
        <Tag size={56}>move the report to a replica</Tag>
        <Rack name="primary" left={40} stack={stack} clean={fbOff} />
        <Rack name="replica" left={860} stack={0} />
        {/* the report */}
        <div style={{ position: "absolute", left: 60 + 820 * moved, top: 110, width: 290, padding: "8px 0", borderRadius: 30, background: cancelledRep ? RED : FG, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 40, color: BG }}>{cancelledRep ? "report ✕" : "report"}</div>
        {/* the feedback signal, replica to primary */}
        <div style={{ position: "absolute", left: 400, top: 200, width: 430, opacity: fbOn ? 1 : 0 }}>
          <div style={{ height: 8, borderRadius: 4, background: RED, opacity: 0.5 }} />
          <div style={{ position: "absolute", left: 430 * (1 - sig) - 14, top: -10, width: 28, height: 28, borderRadius: 14, background: RED }} />
          <div style={{ marginTop: 14, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 38, color: RED, opacity: o(at.tells) }}>"keep the old copies"</div>
        </div>
        <div style={{ position: "absolute", left: 400, top: 150, width: 430, textAlign: "center", opacity: fbOff ? 1 : 0 }}>
          <Tag size={40} color={GREEN} style={{ whiteSpace: "normal" }}>feedback off</Tag>
        </div>
        <div style={{ position: "absolute", left: 0, top: 480, width: 1280 }}>
          <div style={{ fontFamily: MONO, fontSize: 38, color: fbOff ? GREEN : RED, opacity: o(at.setting) }}>hot_standby_feedback = {fbOff ? "off" : "on"}</div>
          <Muted size={38} style={{ opacity: o(at.offDef) * (fbOff ? 0 : 1), position: "absolute", top: 54 }}>
            off by default<span style={{ opacity: o(at.turn) }}> · turned on so the replica stops cancelling reports</span>
          </Muted>
          <div style={{ position: "absolute", top: 54, opacity: fbOff ? o(at.thirty) : 0 }}>
            <Tag size={42} color={RED}>
              the replica cancels the report after 30 s <span style={{ fontFamily: MONO, fontSize: 32, color: MUTED }}>max_standby_streaming_delay</span>
            </Tag>
          </div>
          <div style={{ position: "absolute", top: 118, opacity: o(at.raise) }}>
            <Tag size={42} color={LIGHT}>
              raise it: the report finishes<span style={{ opacity: o(at.behind) }}>, the replica falls behind</span>
              <span style={{ color: MUTED, opacity: o(at.measure) }}> · not measured</span>
            </Tag>
          </div>
        </div>
      </div>

      {/* where the table ended */}
      <div style={{ position: "absolute", left: 1500, top: 270, width: 980 }}>
        <Appear at={at.noLimit - 8} style={{ position: "relative" }}>
          <Tag size={50} color={RED}>grows the table</Tag>
          <Muted size={34}>10 minutes, from {START} MB</Muted>
        </Appear>
        <BarRow at={at.n156} v="long_report" label="slow report, no limit" />
        <BarRow at={at.n157} v="replica_feedback" label="report on a replica · feedback on" />
        <Appear at={at.fix1 - 20} style={{ position: "relative", marginTop: 40 }}>
          <Tag size={50} color={GREEN}>stops it</Tag>
        </Appear>
        <BarRow at={at.n124} v="idle_timeout" label="end idle transactions after 60 s" good />
        <BarRow at={at.again} v="report_timeout" label="end slow queries after 60 s" good />
        <BarRow at={at.n122} v="replica_no_feedback" label="replica · feedback off" sub="the replica cancels the report" good />
      </div>
      <Sfx name="type" from={at.noLimit} volume={0.3} />
      <Sfx name="type" from={at.closed} volume={0.3} />
      <Sfx name="type" from={at.cancelled} volume={0.3} />
      <Sfx name="buzz" from={at.n157} volume={0.3} />
    </Scene>
  );
};

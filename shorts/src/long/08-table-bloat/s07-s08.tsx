// Scene 7: the story (de-identified: "a marketplace app"; no numbers from it on screen). An admin panel with free
// filters, some on columns with no index; disk use climbs while traffic stays flat; a schema change needs a second
// copy of a table; the disk is full and the managed database goes read-only. Production's one line.
// Scene 8: other things that hold an old snapshot (the forgotten transaction grew the table as much as the report:
// 156 MB both, logs.json; REPEATABLE READ in the test).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { ProductionFace } from "../../components/Production";
import { BG, FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import logs from "./logs.json";
import { Appear, Card, CARD_BG, cl, cue, ease, Muted, Scene, Sfx, Stamp, Tag, Title, useWin } from "./common";

const Chip: React.FC<{ label: string; bad?: number; good?: number }> = ({ label, bad = 0, good = 0 }) => (
  <div style={{ padding: "14px 26px", borderRadius: 40, border: `4px solid ${good > 0.5 ? GREEN : bad > 0.5 ? RED : GRAY}`, fontFamily: SANS, fontWeight: 700, fontSize: 46, color: FG, display: "flex", alignItems: "center", gap: 16 }}>
    {label}
    {bad > 0.5 ? <span style={{ fontSize: 36, width: 150, color: good > 0.5 ? GREEN : RED }}>{good > 0.5 ? "index" : "no index"}</span> : null}
  </div>
);

export const Story: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("07", w, n);
  const at = {
    panel: c("admin", 2), filters: c("filters"), index: c("index,"), minutes: c("minutes"), primary: c("primary"), prod: c("just") - 10, showed: c("showed"),
    traffic: c("traffic"), schema: c("schema"), second: c("second"), storage: c("storage"), ro: c("read-only"), writes: c("Writes"),
    short: c("Short"), long: c("Long"), idx: c("indexes"),
  };
  const bad = interpolate(frame, [at.index - 6, at.index], [0, 1], cl);
  const good = interpolate(frame, [at.idx - 4, at.idx + 6], [0, 1], cl);
  const prod = useWin(at.prod, at.showed - 4);
  const chart = useWin(at.showed - 4);
  const lineP = interpolate(frame, [at.showed, at.schema], [0, 0.62], cl) + 0.38 * ease(interpolate(frame, [at.second, at.storage + 10], [0, 1], cl));
  const full = lineP >= 0.999;
  const X0 = 1420, X1 = 2380, Y0 = 880, Y1 = 380; // chart box
  // the disk line: a slow climb (0..0.62 of the animation), then the second copy takes it to the top
  const px = (p: number) => X0 + (X1 - X0) * (p <= 0.62 ? (p / 0.62) * 0.8 : 0.8 + ((p - 0.62) / 0.38) * 0.2);
  const used = (p: number) => (p <= 0.62 ? 0.18 + 0.42 * (p / 0.62) : 0.6 + 0.4 * ((p - 0.62) / 0.38));
  const py = (p: number) => Y0 - (Y0 - (Y1 - 30)) * used(p);
  const pts = Array.from({ length: 51 }, (_, i) => i / 50).filter((p) => p < lineP).concat([lineP]);
  return (
    <Scene id="07">
      <Title text="Back to the admin search" at={0} />
      <Appear at={at.panel} style={{ left: 120, top: 300 }}>
        <Card style={{ width: 1160 }}>
          <Tag size={56} mono color={LIGHT}>admin panel · orders</Tag>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 24, opacity: interpolate(frame, [at.filters - 6, at.filters + 4], [0, 1], cl) }}>
            <Chip label="status" />
            <Chip label="date range" />
            <div style={{ width: "100%" }} />
            <Chip label="name contains" bad={bad} good={good} />
            <div style={{ width: "100%" }} />
            <Chip label="address contains" bad={bad} good={good} />
          </div>
          <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 24, opacity: interpolate(frame, [at.minutes - 20, at.minutes - 10], [0, 1], cl) }}>
            <div style={{ padding: "14px 30px", borderRadius: 16, background: GRAY, fontFamily: SANS, fontWeight: 800, fontSize: 46, color: FG }}>Search</div>
            <div style={{ fontFamily: MONO, fontSize: 46, color: frame >= at.minutes ? RED : MUTED }}>running for minutes{".".repeat(1 + (Math.floor(frame / 12) % 3))}</div>
          </div>
          <Muted size={44} style={{ marginTop: 20, opacity: interpolate(frame, [at.primary, at.primary + 8], [0, 1], cl) }}>on the primary database</Muted>
        </Card>
      </Appear>

      {/* Production */}
      <div style={{ position: "absolute", inset: 0, opacity: prod }}>
        <div style={{ position: "absolute", left: 1480, top: 340 }}>
          <ProductionFace mood="deadpan" size={400} />
        </div>
        <div style={{ position: "absolute", left: 1920, top: 420, padding: "26px 34px", borderRadius: 28, background: CARD_BG, border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 60, color: FG, whiteSpace: "nowrap" }}>It's just a search.</div>
        </div>
      </div>

      {/* disk against traffic */}
      <div style={{ position: "absolute", inset: 0, opacity: chart }}>
        <svg width={2560} height={1440} style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={GRAY} strokeWidth={4} />
          <line x1={X0} y1={Y1 - 30} x2={X1} y2={Y1 - 30} stroke={RED} strokeWidth={4} strokeDasharray="14 12" />
          <line x1={X0} y1={Y0 - 70} x2={px(lineP)} y2={Y0 - 70} stroke={LIGHT} strokeWidth={8} strokeLinecap="round" opacity={frame >= at.traffic - 20 ? 1 : 0} />
          <polyline fill="none" stroke={full ? RED : FG} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" points={pts.map((p) => `${px(p)},${py(p)}`).join(" ")} />
        </svg>
        <Muted size={40} style={{ position: "absolute", left: X0, top: Y1 - 96, color: RED }}>disk full</Muted>
        <Tag size={48} style={{ position: "absolute", left: X0 + 20, top: 600 }}>disk used</Tag>
        <Tag size={48} color={LIGHT} style={{ position: "absolute", left: X1 - 200, top: Y0 - 150, opacity: frame >= at.traffic - 20 ? 1 : 0 }}>traffic</Tag>
        <Appear at={at.schema} style={{ left: X0, top: 940 }}>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div style={{ padding: "18px 30px", borderRadius: 16, background: GRAY, fontFamily: MONO, fontWeight: 800, fontSize: 48, color: FG }}>table</div>
            <Tag size={56} color={MUTED}>+</Tag>
            <div style={{ padding: "18px 30px", borderRadius: 16, border: `4px dashed ${FG}`, fontFamily: MONO, fontWeight: 800, fontSize: 48, color: FG, opacity: interpolate(frame, [at.second - 6, at.second + 4], [0.25, 1], cl) }}>second copy</div>
          </div>
          <Muted size={40} style={{ marginTop: 12 }}>a schema change that rewrites the table</Muted>
        </Appear>
        <Stamp at={at.ro} label="READ-ONLY" color={RED} solid size={80} style={{ left: X0, top: 1150 }} />
        <Appear at={at.writes} style={{ left: X0 + 600, top: 1170 }}>
          <Tag size={56}>writes stopped</Tag>
        </Appear>
      </div>

      <Appear at={at.short} style={{ left: 120, top: 1050 }}>
        <Muted size={44}>short term</Muted>
        <Tag size={56}>vacuum, then a table rewrite · off-hours</Tag>
      </Appear>
      <Appear at={at.long} style={{ left: 120, top: 1220 }}>
        <Muted size={44}>long term</Muted>
        <Tag size={56} color={GREEN}>indexes for the filters</Tag>
      </Appear>
      <Sfx name="buzz" from={at.prod + 10} volume={0.3} />
      <Sfx name="stamp" from={at.ro} volume={0.5} />
    </Scene>
  );
};

// ---- Scene 8 ---------------------------------------------------------------------------------------------------

export const Others: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("08", w, n);
  const at = { tx: c("transaction"), same: c("exactly"), detail: c("detail"), def: c("default"), written: c("written"), dump: c("backup"), slot: c("slot") };
  const T = logs.ten;
  const o = (t: number) => interpolate(frame, [t, t + 8], [0, 1], cl);
  return (
    <Scene id="08">
      <Title text="Not only a slow query" at={0} />
      <Appear at={at.tx} style={{ left: 120, top: 300 }}>
        <Card style={{ width: 1180, height: 800 }}>
          <Tag size={60}>a forgotten open transaction</Tag>
          <div style={{ marginTop: 16, padding: "14px 20px", borderRadius: 14, background: BG, fontFamily: MONO, fontSize: 42, color: FG }}>
            BEGIN; SELECT …; <span style={{ color: MUTED }}>-- then nothing</span>
          </div>
          <div style={{ marginTop: 26, opacity: o(at.same) }}>
            {[
              ["slow report", T.long_report.table[1]],
              ["forgotten transaction", T.idle_tx.table[1]],
            ].map(([n, v]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 10 }}>
                <div style={{ width: 520, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: FG }}>{n}</div>
                <div style={{ width: 300, height: 50, borderRadius: 8, background: RED }} />
                <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 50, color: RED }}>{v} MB</div>
              </div>
            ))}
            <Muted size={36} style={{ marginTop: 8 }}>10-minute test, from {T.long_report.table[0]} MB</Muted>
          </div>
          <div style={{ marginTop: 26, opacity: o(at.detail), fontFamily: MONO, fontSize: 40, color: LIGHT }}>in the test: REPEATABLE READ</div>
          <div style={{ marginTop: 14, opacity: o(at.def) }}>
            <div style={{ fontFamily: MONO, fontSize: 40, color: LIGHT }}>READ COMMITTED (the default):</div>
            <Tag size={46} color={MUTED} style={{ marginTop: 6 }}>only read → holds nothing back</Tag>
            <Tag size={46} color={RED} style={{ marginTop: 6, opacity: o(at.written) }}>has written → holds</Tag>
          </div>
        </Card>
      </Appear>
      <Appear at={at.dump} style={{ left: 1380, top: 300 }}>
        <Card style={{ width: 1060, height: 370 }}>
          <Tag size={60}>a backup</Tag>
          <div style={{ marginTop: 12, fontFamily: MONO, fontWeight: 800, fontSize: 72, color: FG }}>pg_dump</div>
          <Muted size={48} style={{ marginTop: 16 }}>one snapshot for the whole dump</Muted>
        </Card>
      </Appear>
      <Appear at={at.slot - 30} style={{ left: 1380, top: 730 }}>
        <Card style={{ width: 1060, height: 370 }}>
          <Tag size={60}>a forgotten replication slot</Tag>
          <Muted size={48} style={{ marginTop: 22 }}>holds old copies until someone removes it</Muted>
        </Card>
      </Appear>
    </Scene>
  );
};

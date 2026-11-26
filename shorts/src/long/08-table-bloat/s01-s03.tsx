// Scene 1: the cold hook. 3D, moving from frame 0: the orders table as one block with slabs of dead rows landing on
// it; beside it the story's result (an admin search, READ-ONLY), then the test's result (120 MB to 337 MB, logs.json).
// Scene 3: the test. One order row (the labs example data), the load, the baseline, the report that stays open.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import logs from "./logs.json";
import { Appear, Block, Card, CARD_BG, cl, cue, ease, fmt, Muted, proj, Scene, Sfx, Stage, Stamp, Tag, Title, useWin } from "./common";

const H = logs.hour;
const CAM = { pos: [0, 4.6, 14.5] as [number, number, number], look: [0, 3.5, 0] as [number, number, number], fov: 38 };
const BX = 3.9;
const BW = 3.4;
const BD = 2.2;
const LIVE_H = 2.2; // 1M live rows
const SLABS = 9; // 9 slabs of 200,000 dead rows = 1.8M
const SLAB_H = (LIVE_H * 1.8) / SLABS;

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("01", w, n);
  const at = { ro: c("read-only"), writes: c("Writes"), tested: c("tested"), slow: c("slow"), hour: c("hour"), from: c("120"), to: c("337"), nobody: c("Nobody") };
  const gap = (at.to - 8) / (SLABS - 1);
  const lands = Array.from({ length: SLABS }, (_, i) => Math.round(8 + i * gap));
  const story = useWin(0, at.tested + 6);
  const test = useWin(at.tested + 2);
  const grow = ease(interpolate(frame, [at.from + 6, at.to + 4], [0, 1], cl));
  const mb = Math.round(H.table[0] + (H.table[1] - H.table[0]) * grow);
  const lab = proj(CAM.pos, CAM.look, CAM.fov, [BX, 0, BD / 2]);
  const dead = proj(CAM.pos, CAM.look, CAM.fov, [BX - BW / 2, LIVE_H + (SLAB_H * SLABS) / 2, BD / 2]);
  const live = proj(CAM.pos, CAM.look, CAM.fov, [BX - BW / 2, LIVE_H / 2, BD / 2]);
  return (
    <Scene id="01" noFadeIn>
      <Stage pos={CAM.pos} look={CAM.look} fov={CAM.fov}>
        <pointLight position={[BX, 7, 5]} intensity={18} distance={18} />
        <Block p={[BX, LIVE_H / 2, 0]} s={[BW, LIVE_H, BD]} color="#59616d" glow={0.1} />
        {lands.map((land, i) => {
          const p = ease(interpolate(frame, [land - 20, land], [0, 1], cl));
          if (frame < land - 20) return null;
          return <Block key={i} p={[BX, LIVE_H + SLAB_H * (i + 0.5) + (1 - p) * 0.7, 0]} s={[BW, SLAB_H * 0.9, BD]} color={RED} glow={0.2} opacity={0.35 + 0.55 * p} />;
        })}
      </Stage>
      <div style={{ position: "absolute", left: lab.x - 300, width: 600, top: lab.y + 30, textAlign: "center" }}>
        <Tag size={56} mono>orders</Tag>
      </div>
      <Appear at={at.slow} style={{ left: live.x - 420, top: live.y - 50, width: 380, textAlign: "right" }}>
        <Muted size={48} style={{ color: LIGHT }}>the rows</Muted>
      </Appear>
      <Appear at={at.slow + 8} style={{ left: dead.x - 520, top: dead.y - 50, width: 480, textAlign: "right" }}>
        <Tag size={52} color={RED}>dead copies</Tag>
      </Appear>

      {/* the story's result */}
      <div style={{ position: "absolute", inset: 0, opacity: story }}>
        <Card style={{ position: "absolute", left: 160, top: 300, width: 980, display: "flex", alignItems: "center", gap: 30 }}>
          <svg width={90} height={90} viewBox="0 0 90 90">
            <circle cx={38} cy={38} r={26} fill="none" stroke={FG} strokeWidth={9} />
            <line x1={58} y1={58} x2={82} y2={82} stroke={FG} strokeWidth={10} strokeLinecap="round" />
          </svg>
          <div>
            <Tag size={72}>admin search</Tag>
            <Muted size={44}>it only reads</Muted>
          </div>
        </Card>
        <Stamp at={at.ro} label="READ-ONLY" color={RED} solid size={110} style={{ left: 200, top: 640 }} />
        <Appear at={at.writes} style={{ left: 170, top: 900 }}>
          <Tag size={84}>writes stopped</Tag>
        </Appear>
      </div>

      {/* the test's result */}
      <div style={{ position: "absolute", inset: 0, opacity: test }}>
        <Appear at={at.slow} style={{ left: 160, top: 300 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 22, padding: "18px 34px", borderRadius: 22, border: `5px solid ${GRAY}`, background: CARD_BG }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: GREEN }} />
            <Tag size={64}>one slow read</Tag>
            <Tag size={64} mono color={frame >= at.hour ? FG : MUTED}>60 min</Tag>
          </div>
        </Appear>
        <Appear at={at.from} style={{ left: 160, top: 520 }}>
          <Muted size={52}>Postgres table</Muted>
          <div style={{ display: "flex", alignItems: "baseline", gap: 30, fontFamily: MONO, fontWeight: 800 }}>
            <span style={{ fontSize: 150, color: LIGHT }}>{H.table[0]}</span>
            <span style={{ fontSize: 110, color: MUTED }}>→</span>
            <span style={{ fontSize: 230, color: grow >= 1 ? RED : FG }}>{mb}</span>
            <span style={{ fontSize: 110, color: grow >= 1 ? RED : FG }}>MB</span>
          </div>
        </Appear>
        <Appear at={at.nobody} style={{ left: 160, top: 980 }}>
          <Tag size={84}>
            rows inserted: <span style={{ fontFamily: MONO, fontWeight: 800 }}>0</span>
          </Tag>
        </Appear>
      </div>
      <Sfx name="impact" from={0} volume={0.3} />
      <Sfx name="stamp" from={at.ro} volume={0.5} />
      <Sfx name="reveal" from={at.to} volume={0.4} />
    </Scene>
  );
};

// ---- Scene 3 ---------------------------------------------------------------------------------------------------

const STATUSES = ["PLACED", "COOKING", "PICKED_UP", "DELIVERED"];
const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div style={{ display: "flex", fontFamily: MONO, fontSize: 52, lineHeight: 1.7 }}>
    <div style={{ width: 430, color: MUTED }}>{k}</div>
    <div style={{ color: FG, fontWeight: 700 }}>{v}</div>
  </div>
);
const Stat: React.FC<{ at: number; top: number; big: string; small: string; color?: string }> = ({ at, top, big, small, color = FG }) => (
  <Appear at={at} style={{ left: 1420, top }}>
    <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 104, color, lineHeight: 1.05 }}>{big}</div>
    <Muted size={48}>{small}</Muted>
  </Appear>
);

export const TheTest: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("03", w, n);
  const at = { table: c("orders"), rows: c("million"), load: c("500"), clean: c("cleans"), base: c("122"), report: c("report"), open: c("open") };
  const si = frame < at.load ? 0 : Math.floor((frame - at.load) / 22) % STATUSES.length;
  const clock = Math.round(interpolate(frame, [at.open, at.open + 40], [0, 60], cl));
  return (
    <Scene id="03">
      <Title text="The test" at={0} />
      <Appear at={at.table} style={{ left: 120, top: 300 }}>
        <Card style={{ width: 1160 }}>
          <Tag size={56} mono color={LIGHT}>orders · one row</Tag>
          <div style={{ marginTop: 14 }}>
            <Row k="id" v="48213377" />
            <Row k="status" v={<span style={{ color: frame >= at.load ? GREEN : FG }}>{STATUSES[si]}</span>} />
            <Row k="total_pence" v="1199" />
            <Row k="address" v="East Rd, Cambridge" />
            <Row k="" v="CB1 1PT" />
          </div>
        </Card>
      </Appear>
      <Stat at={at.rows} top={300} big={`${fmt(1000000)} rows`} small={`${H.table[0]} MB · an index on status`} />
      <Stat at={at.load} top={540} big="500 / s" small="orders change their status" color={GREEN} />
      <Stat at={at.clean} top={780} big={frame >= at.base ? `${H.baseline_mb} MB` : "cleanup"} small={frame >= at.base ? "after 1 hour, with nothing else running" : "runs in the background · tuned to keep up"} />
      <Appear at={at.report} style={{ left: 120, top: 1010 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 24, padding: "20px 36px", borderRadius: 22, border: `5px solid ${frame >= at.open ? RED : GRAY}`, background: CARD_BG }}>
          <div style={{ width: 24, height: 24, borderRadius: 12, background: GREEN }} />
          <Tag size={64}>one report · reads once · stays open</Tag>
          <Tag size={64} mono color={frame >= at.open ? FG : MUTED}>{clock} min</Tag>
        </div>
      </Appear>
      <Muted size={40} style={{ position: "absolute", left: 120, top: 1290, fontFamily: MONO }}>AWS EC2 {logs.machine}</Muted>
    </Scene>
  );
};

import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Bar, Box, Mark, Pop, Stamp, Title, useDraw, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";

// Numbers from 02-extract-first/README.md: dependencies to cut per module, one typical order.
const DEPS = { menu: 2, orders: 10, payments: 3, couriers: 3, notifications: 2 };
const MODULES = ["menu", "orders", "payments", "couriers", "notifications"] as const;

const Hook: React.FC = () => {
  const count = useCue("count", 45);
  const pull = useSpring(6, 90);
  return (
    <>
      <Title text="Which goes first?" sub="the monolith · 5 modules" />
      <div style={{ position: "absolute", left: 80, top: 520, width: 560, height: 640, border: `4px solid ${GRAY}`, borderRadius: 18 }} />
      {MODULES.map((m, i) => {
        const isOrders = m === "orders";
        return (
          <Box
            key={m}
            label={m}
            color={isOrders ? RED : LIGHT}
            style={{
              left: 110,
              top: 555 + i * 117,
              width: 500,
              height: 95,
              transform: isOrders ? `translateX(${400 * pull}px) rotate(${4 * pull}deg)` : undefined,
            }}
          />
        );
      })}
      <Sfx name="whoosh" at={6} volume={0.4} />
      <Pop at={count} sfx="reveal" style={{ left: 520, top: 800 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: RED }}>dependencies?</div>
      </Pop>
    </>
  );
};

// Module boxes around one shared database.
const POS: Record<(typeof MODULES)[number], [number, number]> = {
  menu: [120, 520],
  orders: [580, 520],
  payments: [120, 700],
  couriers: [580, 700],
  notifications: [350, 880],
};
const center = (m: (typeof MODULES)[number]): [number, number] => [POS[m][0] + 190, POS[m][1] + 60];

const Link: React.FC<{ d: string; at: number; color: string; width?: number }> = ({ d, at, color, width = 6 }) => {
  const p = useDraw(at, 10);
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} />;
};

const Monolith: React.FC = () => {
  const frame = useCurrentFrame();
  const five = useCue("five");
  const db = useCue("db", five + 15);
  const order = useCue("order", db + 30);
  const deps = useCue("deps", order + 45);
  const dbIn = useDraw(db, 6);
  // The order dot walks menu -> orders -> payments -> couriers -> notifications.
  const route = MODULES.map(center);
  const pos = interpolate(frame, [order, order + 45], [0, route.length - 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const k = Math.min(Math.floor(pos), route.length - 2);
  const dot = [route[k][0] + (route[k + 1][0] - route[k][0]) * (pos - k), route[k][1] + (route[k + 1][1] - route[k][1]) * (pos - k)];
  return (
    <>
      <Title text="One order, 5 modules" sub="one shared database" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {MODULES.map((m, i) => (
          <Link key={m} d={`M${center(m)[0]},${POS[m][1] + 120} L540,1080`} at={db + i * 2} color={GRAY} width={4} />
        ))}
        <ellipse cx={540} cy={1200} rx={180} ry={34} fill="#23262b" stroke={LIGHT} strokeWidth={4} opacity={dbIn} />
        <rect x={360} y={1080} width={360} height={120} fill="#23262b" opacity={dbIn} />
        <line x1={360} y1={1080} x2={360} y2={1200} stroke={LIGHT} strokeWidth={4} opacity={dbIn} />
        <line x1={720} y1={1080} x2={720} y2={1200} stroke={LIGHT} strokeWidth={4} opacity={dbIn} />
        <ellipse cx={540} cy={1080} rx={180} ry={34} fill="#23262b" stroke={LIGHT} strokeWidth={4} opacity={dbIn} />
        <Link d="M770,520 Q540,430 310,520" at={deps} color={RED} />
        <Link d="M500,760 Q620,700 700,640" at={deps + 6} color={RED} />
        <Link d="M690,880 Q760,780 770,640" at={deps + 12} color={RED} />
        {frame >= order && frame <= order + 50 ? <circle cx={dot[0]} cy={dot[1]} r={20} fill={FG} /> : null}
      </svg>
      {MODULES.map((m, i) => (
        <Pop key={m} at={five + i * 3} style={{ left: POS[m][0], top: POS[m][1] }}>
          <Box label={m} color={FG} fill="#1b1d21" style={{ position: "relative", width: 380, height: 120 }} />
        </Pop>
      ))}
      <Pop at={db} style={{ left: 360, top: 1112, width: 360, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: LIGHT }}>shared DB</div>
      </Pop>
      <Sfx name="reveal" at={deps} volume={0.35} />
    </>
  );
};

const Orders: React.FC = () => {
  const ten = useCue("ten");
  const money = useCue("money", ten + 30);
  return (
    <>
      <Title text="Dependencies to cut" sub="one typical order" />
      <Bar at={ten} y={540} label="orders" value={DEPS.orders} max={10} color={RED} width={800} early />
      <Stamp at={money} label="ON THE MONEY PATH" color={RED} style={{ left: 80, top: 800 }} />
    </>
  );
};

const Production: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const move = interpolate(frame, [0, durationInFrames], [0, 1]);
  const stamp = Math.round(durationInFrames * 0.55);
  return (
    <>
      <Title text="At dinner time" />
      <Box label="monolith" color={LIGHT} style={{ left: 80, top: 560, width: 380, height: 140 }} />
      <Box label="new service" color={MUTED} style={{ left: 620, top: 560, width: 380, height: 140, borderStyle: "dashed" }} />
      <Box label="orders" color={RED} style={{ left: 170 + 450 * move, top: 760, width: 240, height: 90, fontSize: 38 }} />
      {[0, 1, 2, 3].map((i) => (
        <Pop key={i} at={4 + i * 7} sfx="reveal" style={{ left: 80 + i * 240, top: 920 }}>
          <div style={{ padding: "16px 22px", border: `4px solid ${GRAY}`, borderRadius: 12, fontFamily: MONO, fontWeight: 800, fontSize: 38, color: FG }}>£11.99</div>
        </Pop>
      ))}
      <Stamp at={stamp} label="PRODUCTION" color={RED} sfx="buzz" style={{ left: 320, top: 1090 }} />
    </>
  );
};

const Edges: React.FC = () => {
  const menu = useCue("menu");
  const inside = useCue("inside", menu + 20);
  const notif = useCue("notif", inside + 40);
  const safe = useCue("safe", notif + 40);
  const couriers = useCue("couriers", safe + 20);
  return (
    <>
      <Title text="Start at the edge?" sub="dependencies to cut" />
      <Bar at={0} y={470} label="orders" value={DEPS.orders} max={10} color={RED} dim />
      <Bar at={menu} y={660} label="menu" value={DEPS.menu} max={10} color={GRAY} />
      <Stamp at={inside} label="BLOCKS" color={RED} style={{ left: 700, top: 720 }} />
      <Bar at={notif} y={850} label="notifications" value={DEPS.notifications} max={10} color={GRAY} />
      <Stamp at={safe} label="SAFE" color={GREEN} style={{ left: 700, top: 910 }} />
      <Bar at={couriers} y={1040} label="couriers" value={DEPS.couriers} max={10} color={GRAY} />
      <Stamp at={couriers + 8} label="SAFE" color={GREEN} style={{ left: 700, top: 1100 }} />
    </>
  );
};

const QUESTIONS = ["loosely coupled", "can't block orders", "own reason to move"];

const Questions: React.FC = () => {
  const at = [useCue("q1"), useCue("q2", 60), useCue("q3", 110)];
  return (
    <>
      <Title text="Three questions" sub="ask every module" />
      {QUESTIONS.map((q, i) => (
        <Pop key={q} at={at[i]} sfx="reveal" style={{ left: 80, top: 540 + i * 190, width: 920 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 36, height: 150, padding: "0 40px", border: `4px solid ${GRAY}`, borderRadius: 16 }}>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: MUTED }}>{i + 1}</div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: FG }}>{q}</div>
          </div>
        </Pop>
      ))}
    </>
  );
};

const Row: React.FC<{ label: string; y: number; at: number; marks: boolean[]; win?: boolean }> = ({ label, y, at, marks, win }) => {
  const glow = useSpring(at + 10);
  return (
    <>
      {win ? <div style={{ position: "absolute", left: 60, top: y - 20, width: 960, height: 130, borderRadius: 16, background: GREEN_BG, opacity: glow }} /> : null}
      <div style={{ position: "absolute", left: 90, top: y + 20, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: FG }}>{label}</div>
      {marks.map((ok, i) => (
        <Pop key={i} at={at + i * 4} style={{ left: 600 + i * 140, top: y + 12 }}>
          <Mark ok={ok} />
        </Pop>
      ))}
      <Sfx name={win ? "stamp" : "reveal"} at={at} volume={0.4} />
    </>
  );
};

const Verdict: React.FC = () => {
  const pass2 = useCue("pass2");
  const pass3 = useCue("pass3", pass2 + 40);
  const speed = useCue("speed", pass3 + 40);
  const next = useCue("next", speed + 30);
  const strike = useDraw(speed + 6, 8);
  return (
    <>
      <Title text="Who passes?" sub="three questions" />
      {[1, 2, 3].map((n, i) => (
        <div key={n} style={{ position: "absolute", left: 620 + i * 140, top: 520, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: MUTED }}>{n}</div>
      ))}
      <Row label="notifications" y={620} at={pass2} marks={[true, true, false]} />
      <Row label="couriers" y={780} at={pass3} marks={[true, true, true]} win />
      <Pop at={speed} style={{ left: 80, top: 1010 }}>
        <div style={{ position: "relative", fontFamily: MONO, fontWeight: 800, fontSize: 56, color: MUTED }}>
          speed
          <div style={{ position: "absolute", left: -8, top: 34, height: 8, width: 200 * strike, background: RED, borderRadius: 4 }} />
        </div>
      </Pop>
      <Pop at={next} sfx="whoosh" style={{ left: 560, top: 1000 }}>
        <div style={{ padding: "14px 30px", border: `4px solid ${FG}`, borderRadius: 40, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>next video →</div>
      </Pop>
    </>
  );
};

export const SCENES = { hook: Hook, monolith: Monolith, orders: Orders, production: Production, edges: Edges, questions: Questions, verdict: Verdict };

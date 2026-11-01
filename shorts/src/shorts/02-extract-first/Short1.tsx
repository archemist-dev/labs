import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Bar, Box, Mark, Pop, Stamp, Title, useDraw, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { BG, FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";

// Numbers from 02-extract-first/README.md: dependencies to cut per module, one typical order.
const DEPS = { menu: 2, orders: 10, payments: 3, couriers: 3, notifications: 2 };
const MODULES = ["menu", "orders", "payments", "couriers", "notifications"] as const;

// Hook: orders is dragged out of the monolith and its 10 real dependencies stretch behind it
// (menu 2, payments 3, couriers 3, notifications 2).
const THREADS = [
  { to: 0, n: 2 },
  { to: 2, n: 3 },
  { to: 3, n: 3 },
  { to: 4, n: 2 },
];

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const count = useCue("count", 45);
  const pull = useSpring(6, 90);
  const ord = { left: 110 + 400 * pull, top: 555 + 117 };
  let k = 0;
  const lines = THREADS.flatMap(({ to, n }) =>
    Array.from({ length: n }, (_, j) => ({
      sx: ord.left,
      sy: ord.top + 47 + (k++ - 4.5) * 7,
      tx: 610,
      ty: 555 + to * 117 + 47 + (j - (n - 1) / 2) * 18,
    })),
  );
  const num = Math.round(10 * Math.min(1, Math.max(0, (frame - count) / 20)));
  return (
    <>
      <Title text="Which goes first?" sub="the monolith · 5 modules" />
      <div style={{ position: "absolute", left: 80, top: 520, width: 560, height: 640, border: `4px solid ${GRAY}`, borderRadius: 18 }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {lines.map((l, i) => (
          <line key={i} x1={l.sx} y1={l.sy} x2={l.tx} y2={l.ty} stroke={RED} strokeWidth={4} strokeLinecap="round" opacity={0.85 * Math.min(1, pull * 3)} />
        ))}
      </svg>
      {MODULES.map((m, i) => {
        const isOrders = m === "orders";
        return (
          <Box
            key={m}
            label={m}
            color={isOrders ? RED : LIGHT}
            fill={BG}
            style={{
              left: 110,
              top: 555 + i * 117,
              width: 500,
              height: 95,
              transform: isOrders ? `translateX(${400 * pull}px) rotate(${4 * pull}deg)` : undefined,
              zIndex: isOrders ? 2 : 1,
            }}
          />
        );
      })}
      <Sfx name="whoosh" at={6} volume={0.4} />
      <Pop at={count} sfx="reveal" style={{ left: 660, top: 840 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 130, lineHeight: 1, color: RED }}>{num}</div>
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
  // The order ticket walks menu -> orders -> payments -> couriers -> notifications.
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
        {frame >= order && frame <= order + 50 ? (
          <g transform={`translate(${dot[0] - 62},${dot[1] - 26})`}>
            <rect width={124} height={52} rx={10} fill={FG} />
            <text x={62} y={37} textAnchor="middle" fontFamily={MONO} fontWeight={800} fontSize={30} fill={BG}>
              £11.99
            </text>
          </g>
        ) : null}
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

// The real seams of orders (results of the lab): 5 table links and 5 cross-module calls.
const TABLES = ["menu_items", "modifiers", "payments → orders", "payments → history", "notifications → orders"];
const CALLS = ["charge()", "event: order_status", "assign_courier()", "delivery_point()", "set_status()"];

const Orders: React.FC = () => {
  const frame = useCurrentFrame();
  const ten = useCue("ten");
  const money = useCue("money", ten + 30);
  const shown = frame < ten ? 0 : Math.min(10, Math.floor((frame - ten) / 3) + 1);
  const hot = frame >= money;
  const chip = (label: string, i: number, x: number, order: number) => (
    <Pop key={label} at={ten + order * 3} style={{ left: x, top: 770 + i * 98, width: 450 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, height: 76, padding: "0 24px", border: `4px solid ${GRAY}`, borderRadius: 14 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: RED, flexShrink: 0 }} />
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: FG, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </Pop>
  );
  const head: React.CSSProperties = { position: "absolute", top: 706, width: 450, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 28, letterSpacing: 4, color: MUTED };
  return (
    <>
      <Title text="Dependencies to cut" sub="one typical order" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={440} y1={640} x2={285} y2={700} stroke={hot ? RED : GRAY} strokeWidth={5} />
        <line x1={640} y1={640} x2={795} y2={700} stroke={hot ? RED : GRAY} strokeWidth={5} />
      </svg>
      <Box label="orders" color={RED} fill={hot ? "#2a1d1f" : BG} style={{ left: 340, top: 530, width: 400, height: 110 }} />
      <div style={{ position: "absolute", left: 790, top: 500, fontFamily: MONO, fontWeight: 800, fontSize: 130, lineHeight: 1, color: RED }}>{shown}</div>
      <div style={{ ...head, left: 60 }}>5 TABLE LINKS</div>
      <div style={{ ...head, left: 570 }}>5 CALLS</div>
      {TABLES.map((t, i) => chip(t, i, 60, i * 2))}
      {CALLS.map((c, i) => chip(c, i, 570, i * 2 + 1))}
      <Sfx name="reveal" at={ten} volume={0.35} />
      <Stamp at={money} label="ON THE MONEY PATH" color={RED} style={{ left: 60, top: 440 }} />
    </>
  );
};

// Orders is mid-move and the tickets pile up with nobody to take them.
const Production: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const move = interpolate(frame, [0, durationInFrames], [0, 1]);
  const stamp = Math.round(durationInFrames * 0.55);
  const tickets = Math.max(0, Math.min(12, Math.floor((frame - 6) / 5) + 1));
  return (
    <>
      <Title text="At dinner time" />
      <Box label="monolith" color={LIGHT} style={{ left: 80, top: 540, width: 380, height: 140 }} />
      <Box label="new service" color={MUTED} style={{ left: 620, top: 540, width: 380, height: 140, borderStyle: "dashed" }} />
      <Box label="orders" color={RED} fill={BG} style={{ left: 170 + 450 * move, top: 720, width: 240, height: 90, fontSize: 38, transform: `rotate(${-6 * Math.sin(move * Math.PI)}deg)` }} />
      <div style={{ position: "absolute", left: 80, top: 850, fontFamily: MONO, fontWeight: 800, fontSize: 34, letterSpacing: 4, color: MUTED }}>WAITING</div>
      <div style={{ position: "absolute", left: 800, top: 820, width: 200, textAlign: "right", fontFamily: MONO, fontWeight: 800, fontSize: 84, lineHeight: 1, color: RED }}>{tickets}</div>
      {Array.from({ length: 12 }, (_, i) => (
        <Pop key={i} at={6 + i * 5} sfx={i % 3 === 0 ? "reveal" : undefined} style={{ left: 80 + (i % 4) * 240, top: 920 + Math.floor(i / 4) * 100 }}>
          <div style={{ width: 210, padding: "14px 0", textAlign: "center", border: `4px solid ${GRAY}`, borderRadius: 12, background: "#23262b", fontFamily: MONO, fontWeight: 800, fontSize: 38, color: FG, transform: `rotate(${((i * 7) % 5) - 2}deg)` }}>
            £11.99
          </div>
        </Pop>
      ))}
      <Stamp at={stamp} label="PRODUCTION" color={RED} sfx="buzz" style={{ left: 320, top: 1250 }} />
    </>
  );
};

// The order-creation path: menu and payments run inside it; notifications and couriers hang off it.
const PATH_Y = 600;
const runX = (frame: number, at: number) => interpolate(frame, [at, at + 40], [110, 970], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Edges: React.FC = () => {
  const frame = useCurrentFrame();
  const menu = useCue("menu");
  const inside = useCue("inside", menu + 20);
  const notif = useCue("notif", inside + 40);
  const safe = useCue("safe", notif + 40);
  const couriers = useCue("couriers", safe + 20);
  const xIn = useSpring(safe);
  const node = (label: string, x: number, color: string, w = 260, y = PATH_Y - 50) => (
    <Box label={label} color={color} fill={BG} style={{ left: x, top: y, width: w, height: 100 }} />
  );
  const badge = (n: number, x: number, y: number, color = FG, w = 260) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 48, color }}>{n}</div>
  );
  const dotAt = (t: number, color: string) => (frame >= t && frame <= t + 44 ? <circle cx={runX(frame, t)} cy={PATH_Y} r={22} fill={color} /> : null);
  return (
    <>
      <Title text="Start at the edge?" sub="order creation path" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={80} y1={PATH_Y} x2={1000} y2={PATH_Y} stroke={GRAY} strokeWidth={8} strokeLinecap="round" />
        <polygon points="1000,578 1040,600 1000,622" fill={GRAY} />
        <path d="M540,745 Q540,810 245,900" fill="none" stroke={GRAY} strokeWidth={5} strokeDasharray="14 12" opacity={frame >= notif ? 1 : 0} />
        <path d="M540,745 Q540,810 835,900" fill="none" stroke={GRAY} strokeWidth={5} strokeDasharray="14 12" opacity={frame >= couriers ? 1 : 0} />
        {dotAt(inside, FG)}
        {dotAt(safe + 4, GREEN)}
      </svg>
      <Pop at={menu} style={{ left: 0, top: 0 }}>
        {node("menu", 80, FG)}
        {badge(DEPS.menu, 80, PATH_Y + 70)}
      </Pop>
      <div>
        {node("orders", 410, "#7a2f33")}
        {badge(DEPS.orders, 410, PATH_Y + 70, "#7a2f33")}
      </div>
      <Pop at={menu + 6} style={{ left: 0, top: 0 }}>
        {node("payments", 740, GRAY)}
        {badge(DEPS.payments, 740, PATH_Y + 70, GRAY)}
      </Pop>
      <Stamp at={inside} label="BLOCKS" color={RED} style={{ left: 90, top: PATH_Y + 150 }} />
      <Pop at={notif} style={{ left: 0, top: 0 }}>
        {node("notifications", 80, frame >= safe ? RED : FG, 330, 900)}
        {badge(DEPS.notifications, 80, 1020, FG, 330)}
        <div style={{ position: "absolute", left: 392, top: 872, transform: `scale(${xIn})`, opacity: frame >= safe ? 1 : 0 }}>
          <Mark ok={false} color={RED} size={72} />
        </div>
      </Pop>
      <Stamp at={safe + 14} label="SAFE" color={GREEN} style={{ left: 120, top: 1110 }} />
      <Pop at={couriers} style={{ left: 0, top: 0 }}>
        {node("couriers", 680, FG, 330, 900)}
        {badge(DEPS.couriers, 680, 1020, FG, 330)}
      </Pop>
      <Stamp at={couriers + 8} label="SAFE" color={GREEN} style={{ left: 720, top: 1110 }} />
    </>
  );
};

const QUESTIONS = ["loosely coupled", "can't block a critical flow\nwithout a fallback", "own reason to move"];

// One icon per question: a single thin link, a detour around a blocked road, a rising curve.
const Icon: React.FC<{ n: number }> = ({ n }) => (
  <svg width={110} height={110} viewBox="0 0 110 110" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {n === 0 ? (
      <>
        <circle cx={20} cy={55} r={14} stroke={GREEN} strokeWidth={6} />
        <circle cx={90} cy={55} r={14} stroke={GREEN} strokeWidth={6} />
        <line x1={34} y1={55} x2={76} y2={55} stroke={GREEN} strokeWidth={6} />
      </>
    ) : n === 1 ? (
      <>
        <line x1={6} y1={70} x2={104} y2={70} stroke={GRAY} strokeWidth={6} />
        <rect x={42} y={50} width={26} height={40} rx={4} fill={RED} stroke="none" />
        <path d="M14,64 Q55,6 96,64" stroke={GREEN} strokeWidth={6} />
        <path d="M82,52 L96,64 L80,68" stroke={GREEN} strokeWidth={6} />
      </>
    ) : (
      <>
        <polyline points="8,92 36,86 58,66 78,36 100,12" stroke={GREEN} strokeWidth={7} />
        <path d="M80,12 L100,12 L100,32" stroke={GREEN} strokeWidth={7} />
      </>
    )}
  </svg>
);

const Questions: React.FC = () => {
  const at = [useCue("q1"), useCue("q2", 60), useCue("q3", 110)];
  return (
    <>
      <Title text="Three questions" sub="ask every module" />
      {QUESTIONS.map((q, i) => (
        <Pop key={q} at={at[i]} sfx="reveal" style={{ left: 80, top: 540 + i * 190, width: 920 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 30, height: 150, padding: "0 36px", border: `4px solid ${GRAY}`, borderRadius: 16 }}>
            <div style={{ width: 50, fontFamily: MONO, fontWeight: 800, fontSize: 60, color: MUTED }}>{i + 1}</div>
            <Icon n={i} />
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, lineHeight: 1.2, color: FG, whiteSpace: "pre-line" }}>{q}</div>
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
        <div key={n} style={{ position: "absolute", left: 620 + i * 140, top: 520, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: MUTED }}>
          {n}
        </div>
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

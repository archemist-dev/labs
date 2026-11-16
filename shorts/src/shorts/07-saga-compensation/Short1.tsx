// Week 6 Short "The retry that doubled orders": a timeout is "unknown", the order was often already created, so a plain
// retry creates a second one (1,869 a year at 1,000 checkouts a day); an idempotency key takes it to zero.
// Every number comes from data.json (07-saga-compensation/video_data.py). 3D for the event itself (a phone, the order
// database, packets flying between them, order rows landing); 2D for the hook, the year's receipts and the end.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Mark, Pop } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Canvas, Db, Rack } from "../03-uuid-keys/Short1";
import { Header } from "../04-response-time/Short1";
import data from "./data.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
const steps = (value: number, p: number, step: number) => (p >= 1 ? value : Math.min(value, Math.floor((value * p) / step) * step));
const fmt = (n: number) => n.toLocaleString("en-GB");
const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const CARD = "#22262c";
const EDGE = "#3a3f47";
const HATCH = `repeating-linear-gradient(135deg, rgba(229,72,77,0.28) 0 14px, rgba(229,72,77,0.08) 14px 28px)`;
const BASKET = pounds(data.basket_pence);
const KEY = "c42"; // the checkout id, as in the article's diagram

// ---- The 3D stage: a phone (checkout) on the left, the order database on the right -------------------------------

const PHONE: [number, number, number] = [-1.25, 0, 0.4];
const DB: [number, number, number] = [1.2, 0, -0.4];
const OUT: [number, number, number] = [PHONE[0] + 0.15, 1.75, PHONE[2]];
const IN: [number, number, number] = [DB[0], 2.25, DB[2]];
const FLIGHT = 40; // frames per trip: 1.3 s, sine eased (calm motion)
const camAt = (frame: number): { pos: [number, number, number]; look: [number, number, number] } => {
  const z = interpolate(frame, [0, 360], [15, 14.2], clamp);
  return { pos: [0, 4.2, z], look: [0, 1.15, 0] };
};

// Projects a world point to the 1080x1920 frame with the same camera, so flat HTML labels sit on 3D objects.
const project = (p: [number, number, number], frame: number) => {
  const { pos, look } = camAt(frame);
  const cam = new THREE.PerspectiveCamera(38, 1080 / 1920, 0.1, 100);
  cam.position.set(...pos);
  cam.lookAt(...look);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(cam);
  return { x: (v.x * 0.5 + 0.5) * 1080, y: (-v.y * 0.5 + 0.5) * 1920 };
};

const arc = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * 0.9,
  a[2] + (b[2] - a[2]) * t,
];

type Packet = { launch: number; back?: boolean; color: string; lostAt?: number };
type Slab = { at: number; color: string; pulse?: number };

const packetT = (frame: number, k: Packet) => sine(interpolate(frame, [k.launch, k.launch + FLIGHT], [0, 1], clamp));
const packetPos = (frame: number, k: Packet, dt = 0) => {
  const t = Math.max(0, packetT(frame - dt, k));
  return k.back ? arc(IN, OUT, t) : arc(OUT, IN, t);
};
const packetVisible = (frame: number, k: Packet) => {
  if (frame < k.launch || frame > k.launch + FLIGHT + 2) return 0;
  if (k.lostAt === undefined) return 1;
  const t = packetT(frame, k);
  return t < k.lostAt ? 1 : interpolate(frame, [k.launch + FLIGHT * k.lostAt, k.launch + FLIGHT * k.lostAt + 10], [1, 0], clamp);
};
// Frame at which a lost packet stops (its flight fraction `lostAt`, through the sine easing).
const lostFrame = (k: Packet) => k.launch + (FLIGHT * Math.acos(1 - 2 * (k.lostAt ?? 1))) / Math.PI;

const PacketMesh: React.FC<{ k: Packet }> = ({ k }) => {
  const frame = useCurrentFrame();
  const vis = packetVisible(frame, k);
  if (vis <= 0) return null;
  const stopped = k.lostAt !== undefined && frame >= lostFrame(k);
  const at = stopped ? packetPos(lostFrame(k), k) : packetPos(frame, k);
  const color = stopped ? RED : k.color;
  return (
    <group>
      {[3, 6, 9].map((dt, i) =>
        stopped ? null : (
          <mesh key={dt} position={packetPos(frame, k, dt)} scale={0.8 - i * 0.2}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.35 - i * 0.1} />
          </mesh>
        ),
      )}
      <mesh position={at} scale={stopped ? 1 + (frame - lostFrame(k)) * 0.04 : 1}>
        <boxGeometry args={[0.24, 0.24, 0.24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={vis} />
      </mesh>
      <pointLight position={at} color={color} intensity={2.5 * vis} distance={2.2} />
    </group>
  );
};

const SLAB_Y = 1.92;
const SlabMesh: React.FC<{ s: Slab; i: number }> = ({ s, i }) => {
  const frame = useCurrentFrame();
  if (frame < s.at - 21) return null;
  const p = ease(interpolate(frame, [s.at - 21, s.at], [0, 1], clamp));
  const y = SLAB_Y + i * 0.24 + (1 - p) * 0.9;
  const glow = s.pulse !== undefined ? 0.25 + 0.7 * Math.max(0, 1 - Math.abs(frame - s.pulse - 8) / 14) : 0.25;
  return (
    <mesh position={[DB[0], y, DB[2]]} scale={[1, 1, 1]}>
      <boxGeometry args={[1.25, 0.18, 0.95]} />
      <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={glow} roughness={0.4} transparent opacity={p} />
    </mesh>
  );
};

const Phone: React.FC = () => (
  <group position={[PHONE[0], 0.85, PHONE[2]]} rotation={[0, 0.25, 0]}>
    <mesh>
      <boxGeometry args={[0.82, 1.6, 0.1]} />
      <meshStandardMaterial color="#3a4049" roughness={0.45} metalness={0.3} />
    </mesh>
    <mesh position={[0, 0.02, 0.055]}>
      <planeGeometry args={[0.7, 1.4]} />
      <meshStandardMaterial color="#15171a" emissive="#20352a" emissiveIntensity={0.6} />
    </mesh>
  </group>
);

const Stage: React.FC<{ packets: Packet[]; slabs: Slab[] }> = ({ packets, slabs }) => {
  const frame = useCurrentFrame();
  const { pos, look } = camAt(frame);
  return (
    <Canvas pos={pos} look={look}>
      <Phone />
      <Db x={DB[0]} z={DB[2]} color={LIGHT} glow={0.12} />
      {packets.map((k, i) => (
        <PacketMesh key={i} k={k} />
      ))}
      {slabs.map((s, i) => (
        <SlabMesh key={i} s={s} i={i} />
      ))}
    </Canvas>
  );
};

// A flat label pinned to a world point; `dx`/`dy` shift it in pixels, `align` picks its anchor.
const Pin: React.FC<{ at: [number, number, number]; show: number; dx?: number; dy?: number; align?: "left" | "right" | "center"; children: React.ReactNode }> = ({
  at,
  show,
  dx = 0,
  dy = 0,
  align = "center",
  children,
}) => {
  const frame = useCurrentFrame();
  const q = project(at, frame);
  const shift = align === "center" ? "-50%" : align === "right" ? "-100%" : "0%";
  return (
    <div style={{ position: "absolute", left: q.x + dx, top: q.y + dy, transform: `translate(${shift}, -50%)`, opacity: show, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};

const Tag: React.FC<{ color: string; fill?: string; children: React.ReactNode; size?: number }> = ({ color, fill, children, size = 34 }) => (
  <div style={{ padding: "10px 20px", borderRadius: 14, border: `4px solid ${color}`, background: fill ?? CARD, fontFamily: MONO, fontWeight: 700, fontSize: size, color: FG }}>{children}</div>
);

const Names: React.FC = () => (
  <>
    <Pin at={[PHONE[0], 0, PHONE[2]]} show={1} dy={44}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: LIGHT }}>checkout</div>
    </Pin>
    <Pin at={[DB[0], 0, DB[2]]} show={1} dy={44}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: LIGHT }}>orders</div>
    </Pin>
  </>
);

// ---- 1. Hook: a retry fixes a failed call; after a payment, 1,869 double orders a year ------------------------------

const OrderCard: React.FC<{ n: number; dup?: boolean; at: number; left: number; top: number }> = ({ n, dup, at, left, top }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left, top, width: 410, padding: "20px 26px", borderRadius: 20, border: `4px solid ${dup ? RED : GRAY}`, background: dup ? HATCH : CARD, opacity: fade(frame, at, 10) }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: dup ? RED : FG }}>order #{n}</div>
      <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 32, color: FG }}>
        {KEY} · {BASKET}
      </div>
      <Sfx name={dup ? "buzz" : "reveal"} at={at} volume={0.25} />
    </div>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const retry = useCue("retry", 10);
  const n = useCue("n", 70);
  const double = useCue("double", 90);
  const p = interpolate(frame, [n - 14, n], [0, 1], clamp);
  return (
    <>
      <Header text="A retry after payment" />
      <div style={{ position: "absolute", left: 70, top: 390, display: "flex", alignItems: "center", gap: 16, opacity: fade(frame, retry - 4) }}>
        <Mark ok color={GRAY} size={52} />
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: LIGHT }}>retry = fixes a failed call</div>
      </div>
      <div style={{ position: "absolute", left: 70, top: 480, fontFamily: MONO, fontWeight: 800, fontSize: 230, lineHeight: 1, color: p >= 1 ? RED : GRAY, opacity: fade(frame, n - 16, 6) }}>
        {fmt(steps(data.duplicates, p, 100))}
      </div>
      <div style={{ position: "absolute", left: 76, top: 720, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: FG, opacity: fade(frame, double) }}>double orders a year</div>
      <Sfx name="reveal" at={n} volume={0.35} />
      <div style={{ position: "absolute", left: 70, top: 860, fontFamily: MONO, fontSize: 32, color: MUTED, opacity: fade(frame, n) }}>
        1 payment · {BASKET}
      </div>
      <OrderCard n={1} at={n + 4} left={70} top={920} />
      <OrderCard n={2} dup at={double + 4} left={500} top={920} />
    </>
  );
};

// ---- 2. Timeline in 3D: call sent, timeout, order created, reply lost, retry creates order #2 -----------------------

const Timeline: React.FC = () => {
  const frame = useCurrentFrame();
  const timeout = useCue("timeout", 50);
  const created = useCue("created", 100);
  const lost = useCue("lost", 150);
  const again = useCue("again", 220);
  // The real order of events: the call leaves at once and the row lands as it arrives ("already created"); the reply
  // dies halfway on "lost"; the retry leaves after it and lands order #2 on "again".
  const call: Packet = { launch: 4, color: LIGHT };
  const reply: Packet = { launch: lost - 24, back: true, color: LIGHT, lostAt: 0.5 };
  const retryLaunch = Math.max(lost + 22, again - FLIGHT);
  const retry: Packet = { launch: retryLaunch, color: LIGHT };
  const slabs: Slab[] = [
    { at: 4 + FLIGHT, color: GRAY, pulse: created },
    { at: retryLaunch + FLIGHT, color: RED },
  ];
  const mid = arc(IN, OUT, 0.5);
  return (
    <>
      <Stage packets={[call, reply, retry]} slabs={slabs} />
      <Header text="What the timeout hid" />
      <Names />
      <Pin at={[PHONE[0], 1.75, PHONE[2]]} show={fade(frame, timeout - 4) * (1 - fade(frame, retryLaunch - 8, 6))} align="left" dx={-220} dy={-80}>
        <Tag color={GRAY}>timeout</Tag>
        <Sfx name="buzz" at={timeout} volume={0.2} />
      </Pin>
      <Pin at={[DB[0] - 0.62, SLAB_Y, DB[2]]} show={fade(frame, created - 6)} dx={-16} align="right">
        <Tag color={GRAY}>order #1</Tag>
        <Sfx name="reveal" at={created} volume={0.3} />
      </Pin>
      <Pin at={mid} show={fade(frame, lostFrame(reply))} dy={-60}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: RED }}>✕ reply lost</div>
      </Pin>
      <Pin at={[PHONE[0], 1.75, PHONE[2]]} show={fade(frame, retryLaunch - 6) * (1 - fade(frame, retryLaunch + FLIGHT, 8))} align="left" dx={-220} dy={-80}>
        <Tag color={LIGHT}>retry</Tag>
        <Sfx name="whoosh" at={retryLaunch} volume={0.2} />
      </Pin>
      <Pin at={[DB[0] - 0.62, SLAB_Y + 0.24, DB[2]]} show={fade(frame, retryLaunch + FLIGHT - 4)} dx={-16} dy={-50} align="right">
        <Tag color={RED} fill={HATCH}>order #2</Tag>
        <Sfx name="buzz" at={retryLaunch + FLIGHT} volume={0.3} />
      </Pin>
    </>
  );
};

// ---- 3. Production -------------------------------------------------------------------------------------------------

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
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 280 }}>
        <div style={{ position: "relative", width: 430, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, color: FG }}>A timeout isn't a no. It's a maybe with a deadline.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
    </>
  );
};

// ---- 4. A year of checkouts: the doubles printed twice, about £36,000 ----------------------------------------------

const Receipt: React.FC<{ n: number; dup?: boolean; at: number; left: number }> = ({ n, dup, at, left }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at - 4, at + 26], [0, 1], clamp)); // prints top to bottom, about 1 s
  const items = data.basket_pence - 299;
  const rows: [string, string][] = [
    ["2 items", pounds(items)],
    ["delivery", "£2.99"],
    ["total", BASKET],
  ];
  return (
    <div style={{ position: "absolute", left, top: 610, width: 410, height: 360 * p, overflow: "hidden", opacity: frame < at - 4 ? 0 : 1 }}>
      <div style={{ padding: "22px 28px", borderRadius: 16, background: dup ? HATCH : CARD, border: `4px solid ${dup ? RED : GRAY}`, height: 316 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: dup ? RED : FG }}>ORDER #{n}</div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: MUTED, marginBottom: 10 }}>checkout {KEY}</div>
        {rows.map(([a, b]) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 30, color: FG, fontWeight: a === "total" ? 800 : 400 }}>
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, fontFamily: MONO, fontWeight: 700, fontSize: 28, color: LIGHT }}>DELIVERED</div>
      </div>
      <Sfx name="type" at={at} volume={0.25} />
    </div>
  );
};

const Year: React.FC = () => {
  const frame = useCurrentFrame();
  const year = useCue("year", 20);
  const thousand = useCue("thousand", 50);
  const timing = useCue("timing", 80);
  const money = useCue("money", 130);
  const twice = useCue("twice", 170);
  const p = interpolate(frame, [money - 14, money], [0, 1], clamp);
  const lines: [number, string][] = [
    [year, `${fmt(data.checkouts)} checkouts`],
    [thousand, `${fmt(data.per_day)} a day`],
    [timing, `${data.timeout_pct}% of order calls time out`],
  ];
  return (
    <>
      <Header text="One year, replayed" />
      {lines.map(([at, text], i) => (
        <div key={text} style={{ position: "absolute", left: 70, top: 380 + i * 62, fontFamily: MONO, fontSize: 38, color: FG, opacity: fade(frame, at - 4) }}>
          {text}
        </div>
      ))}
      <Receipt n={1} at={money - 8} left={70} />
      <Receipt n={2} dup at={twice - 4} left={500} />
      <div style={{ position: "absolute", left: 70, top: 1010, fontFamily: MONO, fontSize: 34, color: MUTED, opacity: fade(frame, money - 14) }}>
        {fmt(data.duplicates)} × {BASKET} = £{fmt(data.duplicate_pounds)}
      </div>
      <div style={{ position: "absolute", left: 70, top: 1060, fontFamily: MONO, fontWeight: 800, fontSize: 120, color: p >= 1 ? RED : GRAY, opacity: fade(frame, money - 14, 6) }}>
        ≈ £{fmt(steps(36000, p, 2000))}
      </div>
      <div style={{ position: "absolute", left: 76, top: 1210, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: FG, opacity: fade(frame, twice) }}>of food, sent twice</div>
      <Sfx name="reveal" at={money} volume={0.35} />
    </>
  );
};

// ---- 5. The key in 3D: the same checkout id on every attempt, the repeat returns order #1 --------------------------

const Key: React.FC = () => {
  const frame = useCurrentFrame();
  const key = useCue("key", 20);
  const id = useCue("id", 60);
  const same = useCue("same", 150);
  const zero = useCue("zero", 200);
  const call: Packet = { launch: id, color: GREEN };
  const retryLaunch = Math.max(id + FLIGHT + 10, same - FLIGHT);
  const retry: Packet = { launch: retryLaunch, color: GREEN };
  const reply: Packet = { launch: retryLaunch + FLIGHT + 2, back: true, color: GREEN };
  const slabs: Slab[] = [{ at: id + FLIGHT, color: GREEN, pulse: retryLaunch + FLIGHT }];
  const tagAt = (k: Packet) => packetPos(frame, k);
  const flying = (k: Packet) => (frame >= k.launch && frame <= k.launch + FLIGHT ? 1 : 0);
  return (
    <>
      <Stage packets={[call, retry, reply]} slabs={slabs} />
      <Header text="Same key, same order" />
      <div style={{ position: "absolute", left: 70, top: 380, display: "flex", gap: 14, alignItems: "center", opacity: fade(frame, key - 4) }}>
        <Tag color={GREEN} fill={GREEN_BG}>Idempotency-Key</Tag>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: FG, opacity: fade(frame, id - 4) }}>= checkout id</div>
        <Sfx name="reveal" at={key} volume={0.3} />
      </div>
      <div style={{ position: "absolute", left: 70, top: 490, display: "flex", alignItems: "baseline", gap: 24, opacity: fade(frame, zero - 4) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: FG }}>double orders</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 130, lineHeight: 1, color: GREEN }}>{data.duplicates_with_key}</div>
        <Sfx name="stamp" at={zero} volume={0.35} />
      </div>
      <Names />
      {[call, retry].map((k, i) => (
        <Pin key={i} at={tagAt(k)} show={flying(k)} dy={-46}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: GREEN }}>key {KEY}</div>
        </Pin>
      ))}
      <Pin at={[DB[0] - 0.62, SLAB_Y, DB[2]]} show={fade(frame, id + FLIGHT - 6)} dx={-16} align="right">
        <Tag color={GREEN} fill={GREEN_BG}>order #1</Tag>
        <Sfx name="reveal" at={id + FLIGHT} volume={0.3} />
      </Pin>
      <Pin at={[PHONE[0], 1.75, PHONE[2]]} show={fade(frame, retryLaunch - 6) * (1 - fade(frame, retryLaunch + FLIGHT, 8))} align="left" dx={-220} dy={-80}>
        <Tag color={LIGHT}>retry</Tag>
        <Sfx name="whoosh" at={retryLaunch} volume={0.2} />
      </Pin>
      <Pin at={[PHONE[0], 1.75, PHONE[2]]} show={fade(frame, reply.launch + FLIGHT - 4)} align="left" dx={-220} dy={-80}>
        <Tag color={GREEN} fill={GREEN_BG}>same order #1</Tag>
        <Sfx name="reveal" at={reply.launch + FLIGHT} volume={0.3} />
      </Pin>
    </>
  );
};

// ---- 6. End: a timeout means "I don't know"; ask again with the same key ------------------------------------------

const End: React.FC = () => {
  const unknown = useCue("unknown", 20);
  const key = useCue("key", 60);
  const profile = useCue("profile", 100);
  return (
    <>
      <Header text="A timeout is a question" />
      <Pop at={unknown} sfx="reveal" style={{ left: 70, top: 400, width: 420 }}>
        <div style={{ padding: "20px 26px", borderRadius: 22, border: `4px solid ${GRAY}` }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: LIGHT }}>timeout</div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: FG }}>= "I don't know"</div>
        </div>
      </Pop>
      <Pop at={key} sfx="reveal" style={{ left: 510, top: 400, width: 420 }}>
        <div style={{ padding: "20px 26px", borderRadius: 22, border: `4px solid ${GREEN}`, background: GREEN_BG }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: GREEN }}>ask again</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: FG }}>same key {KEY}</div>
        </div>
      </Pop>
      <Pop at={profile} style={{ left: 70, top: 680 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT }}>
          Full article: <span style={{ color: FG }}>link in profile</span>
        </div>
      </Pop>
    </>
  );
};

export const SCENES1: Record<string, React.FC> = { hook: Hook, timeline: Timeline, production: ProductionScene, year: Year, key: Key, end: End };

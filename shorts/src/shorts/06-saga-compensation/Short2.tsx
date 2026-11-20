// Week 6 Short "Write the order first": a paid checkout with no order (11 a day with no handling), the refund step
// that still misses a process dying right after the charge (378 a year), and the flip: write the order as PENDING,
// then charge with the same key; a sweeper finishes what a crash leaves. Every number comes from data2.json
// (07-saga-compensation/video_data2.py). The opening is 3D (one paid card, one order slot that stays empty); the
// tables, flows and bars are 2D. No camera motion anywhere: the objects move. Everything read sits inside SAFE.
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Follow } from "../../components/Follow";
import { Pop, Title } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SAFE, SANS } from "../../theme";
import { Canvas, Rack } from "../03-uuid-keys/Short1";
import data from "./data2.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
const steps = (value: number, p: number, step: number) => (p >= 1 ? value : Math.min(value, Math.floor((value * p) / step) * step));
const fmt = (n: number) => n.toLocaleString("en-GB");
const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const CARD = "#22262c";
const EDGE = "#3a3f47";
const RED_BG = "rgba(229,72,77,0.16)";
const BASKET = pounds(data.basket_pence);
const KEY = "c42";
const ORDER = "#1041";
const L = SAFE.left;
const FLIGHT = 40; // frames for a dot to cross (1.3 s, sine eased)

const Check: React.FC<{ color: string; size?: number }> = ({ color, size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
    <path d="M7 19 L15 27 L29 10" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Cross: React.FC<{ color: string; size?: number }> = ({ color, size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
    <path d="M9 9 L27 27 M27 9 L9 27" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
  </svg>
);

// ---- 1. Hook (3D): the card is paid, the order slot stays empty; 11 a day -------------------------------------------

const CAM: [number, number, number] = [0, 3.2, 12];
const LOOK: [number, number, number] = [0, 1.25, 0];

// Screen position of a 3D point under the scene's fixed camera, so flat HTML labels sit on the objects.
const useProject = () => {
  const { width, height } = useVideoConfig();
  return useMemo(() => {
    const cam = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    cam.position.set(...CAM);
    cam.lookAt(...LOOK);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    return (x: number, y: number, z: number) => {
      const v = new THREE.Vector3(x, y, z).project(cam);
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
    };
  }, [width, height]);
};

const CW = 1.75; // card and slot, world units
const CH = 1.15;
const SLOT_X = 1.08;
const OBJ_Y = 1.0;

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const never = useCue("never", 40);
  const n = useCue("n", 110);
  const day = useCue("day", 125);
  const project = useProject();
  // The card is already on its way at frame 0 and settles in about 1.2 s; then it only breathes.
  const slide = sine(interpolate(frame, [-6, 40], [0, 1], clamp));
  const cardX = -1.3 + slide * (1.3 - SLOT_X);
  const bob = Math.sin(frame * 0.07) * 0.03;
  // The order call: one dot leaves the card and dies before the slot.
  const launch = Math.max(30, never - 26);
  const dotP = sine(interpolate(frame, [launch, launch + 22], [0, 1], clamp)) * 0.55;
  const dotX = cardX + CW / 2 + (SLOT_X - CW / 2 - (cardX + CW / 2)) * dotP + 0.15;
  const dotOn = frame >= launch && frame < launch + 30;
  const bad = interpolate(frame, [never, never + 10], [0, 1], clamp);
  const pulse = 0.55 + 0.45 * Math.sin(frame * 0.12);
  const slotEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, CH, 0.1)), []);
  const cardEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, CH, 0.1)), []);
  const card = project(cardX, OBJ_Y + bob, 0.1);
  const slot = project(SLOT_X, OBJ_Y, 0.1);
  const p = interpolate(frame, [n - 12, n], [0, 1], clamp);
  return (
    <>
      <Canvas pos={CAM} look={LOOK}>
        <pointLight position={[-1, 2.4, 4]} intensity={14} distance={12} color="#ffffff" />
        <group position={[cardX, OBJ_Y + bob, 0]} rotation={[-0.12, 0.1, 0]}>
          <mesh>
            <boxGeometry args={[CW, CH, 0.1]} />
            <meshStandardMaterial color="#1f3a2c" emissive={GREEN} emissiveIntensity={0.28} roughness={0.45} metalness={0.2} />
          </mesh>
          <lineSegments geometry={cardEdges}>
            <lineBasicMaterial color={GREEN} />
          </lineSegments>
        </group>
        <group position={[SLOT_X, OBJ_Y, 0]} rotation={[-0.12, -0.1, 0]}>
          <mesh>
            <boxGeometry args={[CW, CH, 0.1]} />
            <meshStandardMaterial color={bad > 0.5 ? "#3a1c1e" : "#22262c"} transparent opacity={0.35 + 0.25 * bad * pulse} emissive={RED} emissiveIntensity={0.5 * bad * pulse} />
          </mesh>
          <lineSegments geometry={slotEdges}>
            <lineBasicMaterial color={bad > 0.5 ? RED : LIGHT} />
          </lineSegments>
        </group>
        {dotOn ? (
          <mesh position={[dotX, OBJ_Y, 0.3]}>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color={LIGHT} emissive={LIGHT} emissiveIntensity={1.2} transparent opacity={interpolate(frame, [launch + 20, launch + 30], [1, 0], clamp)} />
          </mesh>
        ) : null}
      </Canvas>
      <Title text="Paid. No order." />
      {/* labels ride on the objects, flat */}
      <div style={{ position: "absolute", left: card.x - 190, top: card.y - 74, width: 380, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, fontFamily: SANS, fontWeight: 800, fontSize: 60, color: GREEN, textShadow: "0 4px 18px #000" }}>
          <Check color={GREEN} size={54} />
          PAID
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: FG, textShadow: "0 4px 18px #000" }}>{BASKET}</div>
      </div>
      <div style={{ position: "absolute", left: slot.x - 190, top: slot.y - 74, width: 380, textAlign: "center", textShadow: "0 4px 18px #000" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: bad > 0.5 ? RED : LIGHT }}>ORDER</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 52, color: bad > 0.5 ? RED : MUTED }}>{bad > 0.5 ? "none" : "…"}</div>
      </div>
      <Sfx name="buzz" at={never} volume={0.3} />
      {/* the number */}
      <div style={{ position: "absolute", left: L, top: 370, display: "flex", alignItems: "baseline", gap: 26, opacity: fade(frame, n - 14, 6) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 250, lineHeight: 1, color: p >= 1 ? RED : GRAY }}>{steps(data.orphaned_once_per_day, p, 1)}</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: FG, opacity: fade(frame, day - 4) }}>a day</div>
      </div>
      <div style={{ position: "absolute", left: L + 6, top: 640, fontFamily: MONO, fontSize: 36, color: LIGHT, opacity: fade(frame, day + 6) }}>
        {fmt(data.orphaned_once)} a year · {fmt(data.per_day)} checkouts a day
      </div>
      <Sfx name="reveal" at={n} volume={0.35} />
    </>
  );
};

// ---- 2. Story: payments checked against orders by hand; one fixed, one missed ---------------------------------------

const PAYMENTS: { key: string; pence: number; order?: string }[] = [
  { key: "c38", pence: 1947, order: "#1037" },
  { key: "c39", pence: 1199, order: "#1038" },
  { key: "c40", pence: 2450 },
  { key: "c41", pence: 875, order: "#1039" },
  { key: "c42", pence: 1947 },
];
const ROW_H = 86;

const Story: React.FC = () => {
  const frame = useCurrentFrame();
  const cases = useCue("cases", 50);
  const hand = useCue("hand", 90);
  const missed = useCue("missed", 130);
  const cell: React.CSSProperties = { boxSizing: "border-box", height: 70, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", fontFamily: MONO, fontSize: 34, color: FG };
  let gap = 0;
  return (
    <>
      <Title text="Paid, no order" />
      <div style={{ position: "absolute", left: L, top: 390, width: 420, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: LIGHT }}>payments</div>
      <div style={{ position: "absolute", left: 560, top: 390, width: 440, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: LIGHT }}>orders</div>
      {PAYMENTS.map((r, i) => {
        const at = 4 + i * 5;
        const top = 460 + i * ROW_H;
        const missing = !r.order;
        const which = missing ? gap++ : -1;
        const flagged = missing && frame >= cases;
        const fixed = which === 0 && frame >= hand;
        const lost = which === 1 && frame >= missed;
        return (
          <React.Fragment key={r.key}>
            <div style={{ ...cell, position: "absolute", left: L, top, width: 420, background: CARD, border: `4px solid ${EDGE}`, opacity: fade(frame, at) }}>
              <span style={{ fontWeight: 800 }}>{r.key}</span>
              <span>{pounds(r.pence)}</span>
              <Check color={GREEN} />
            </div>
            {missing ? (
              <div
                style={{
                  ...cell,
                  position: "absolute",
                  left: 560,
                  top,
                  width: 440,
                  justifyContent: "flex-start",
                  gap: 14,
                  background: lost ? RED : fixed ? CARD : flagged ? RED_BG : "transparent",
                  border: lost ? `4px solid ${RED}` : fixed ? `4px solid ${GRAY}` : `4px dashed ${flagged ? RED : EDGE}`,
                  color: lost ? FG : fixed ? LIGHT : flagged ? RED : MUTED,
                  fontFamily: SANS,
                  fontWeight: 800,
                  opacity: fade(frame, at),
                }}
              >
                {lost ? "missed" : fixed ? "refunded by hand" : flagged ? "no order" : "—"}
              </div>
            ) : (
              <div style={{ ...cell, position: "absolute", left: 560, top, width: 440, background: CARD, border: `4px solid ${EDGE}`, opacity: fade(frame, at + 3) }}>
                <span style={{ fontWeight: 800 }}>{r.order}</span>
                <span>{r.key}</span>
                <span style={{ color: LIGHT }}>DELIVERED</span>
              </div>
            )}
          </React.Fragment>
        );
      })}
      <Sfx name="buzz" at={cases} volume={0.25} />
      <Sfx name="type" at={hand} volume={0.25} />
      <Sfx name="stamp" at={missed} volume={0.3} />
      <div style={{ position: "absolute", left: L, top: 930, fontFamily: MONO, fontSize: 36, color: LIGHT, opacity: fade(frame, missed + 6) }}>
        paid · no order · no refund
      </div>
    </>
  );
};

// ---- 3. The refund step, and the crash it can't see -------------------------------------------------------------------

type Tone = "ok" | "bad" | "off";
const Node: React.FC<{ x: number; y: number; title: string; note: string; tone: Tone; at: number }> = ({ x, y, title, note, tone, at }) => {
  const frame = useCurrentFrame();
  const color = tone === "ok" ? GREEN : tone === "bad" ? RED : GRAY;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 280,
        height: 150,
        boxSizing: "border-box",
        padding: "18px 16px",
        borderRadius: 18,
        border: `4px ${tone === "off" ? "dashed" : "solid"} ${color}`,
        background: tone === "ok" ? GREEN_BG : tone === "bad" ? RED_BG : "transparent",
        opacity: fade(frame, at - 3, 8) * (tone === "off" ? 0.7 : 1),
      }}
    >
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 32, whiteSpace: "nowrap", color: tone === "off" ? MUTED : FG }}>{title}</div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontWeight: 700, fontSize: 31, whiteSpace: "nowrap", color: tone === "off" ? MUTED : color }}>
        {tone === "ok" ? <Check color={GREEN} size={30} /> : tone === "bad" ? <Cross color={RED} size={30} /> : null}
        {note}
      </div>
    </div>
  );
};

const NX = [L, 400, 720]; // three steps, x 80..1000 (both rows sit above y 900)

// A dot that carries the flow from one step to the next.
const Hop: React.FC<{ from: number; y: number; at: number; dies?: boolean }> = ({ from, y, at, dies }) => {
  const frame = useCurrentFrame();
  const a = NX[from] + 280;
  const b = NX[from + 1];
  const p = sine(interpolate(frame, [at - 16, at], [0, 1], clamp)) * (dies ? 0.5 : 1);
  if (frame < at - 16) return null;
  const done = frame >= at;
  return (
    <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0 }}>
      <line x1={a} y1={y} x2={a + (b - a) * p} y2={y} stroke={dies && done ? RED : LIGHT} strokeWidth={5} strokeLinecap="round" />
      {!done ? <circle cx={a + (b - a) * p} cy={y} r={10} fill={LIGHT} /> : null}
    </svg>
  );
};

const Refund: React.FC = () => {
  const frame = useCurrentFrame();
  const noorder = useCue("noorder", 50);
  const back = useCue("back", 80);
  const dies = useCue("dies", 150);
  const charge = useCue("charge", 190);
  const Y1 = 450;
  const Y2 = 720;
  return (
    <>
      <Title text="The refund step" />
      <div style={{ position: "absolute", left: L, top: Y1 - 60, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: LIGHT, opacity: fade(frame, 4) }}>order rejected</div>
      <Node x={NX[0]} y={Y1} title="charge" note={BASKET} tone="ok" at={6} />
      <Hop from={0} y={Y1 + 75} at={noorder} />
      <Node x={NX[1]} y={Y1} title="create order" note="rejected" tone="bad" at={noorder} />
      <Hop from={1} y={Y1 + 75} at={back} />
      <Node x={NX[2]} y={Y1} title="refund" note="money back" tone="ok" at={back} />
      <Sfx name="buzz" at={noorder} volume={0.25} />
      <Sfx name="reveal" at={back} volume={0.3} />

      <div style={{ position: "absolute", left: L, top: Y2 - 60, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: LIGHT, opacity: fade(frame, dies - 22) }}>process dies</div>
      <Node x={NX[0]} y={Y2} title="charge" note={BASKET} tone="ok" at={dies - 20} />
      <Hop from={0} y={Y2 + 75} at={dies} dies />
      <div style={{ position: "absolute", left: (NX[0] + 280 + NX[1]) / 2 - 22, top: Y2 + 53, opacity: fade(frame, dies, 5) }}>
        <Cross color={RED} size={44} />
      </div>
      <Node x={NX[1]} y={Y2} title="create order" note="never runs" tone="off" at={charge - 6} />
      <Node x={NX[2]} y={Y2} title="refund" note="never runs" tone="off" at={charge} />
      <Sfx name="impact" at={dies} volume={0.35} />
      <div style={{ position: "absolute", left: L, top: 940, width: SAFE.lowRight - L, opacity: fade(frame, charge + 8) }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: RED }}>refund owed</div>
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 36, color: LIGHT }}>kept in memory · gone</div>
      </div>
    </>
  );
};

// ---- 4. Production ---------------------------------------------------------------------------------------------------

const ProductionScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Canvas pos={[0.6, 2.4, 12]} look={[0.85, 1.2, 0]}>
        <pointLight position={[0.5, 2.2, 4]} intensity={18} distance={12} color="#ffffff" />
        <group scale={interpolate(frame, [0, 8], [0.6, 1], { ...clamp, easing: ease })}>
          <Rack frame={frame} />
        </group>
      </Canvas>
      <div style={{ position: "absolute", left: 90, width: 460, top: 480, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>PRODUCTION</div>
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 290 }}>
        <div style={{ position: "relative", width: 430, boxSizing: "border-box", padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>The process died. The debt didn't.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
    </>
  );
};

// ---- 5. The year: paid with no order, by strategy; the refund step still leaves 378 ---------------------------------

const BAR_MAX = 730;
const HBar: React.FC<{ y: number; label: string; value: number; at: number; color: string; strong?: boolean; grow?: number }> = ({ y, label, value, at, color, strong, grow = 20 }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at, at + grow], [0, 1], clamp));
  const w = Math.max(10, (value / data.orphaned_once) * BAR_MAX) * p;
  return (
    <div style={{ position: "absolute", left: L, top: y, opacity: fade(frame, at - 4, 8) }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: strong ? FG : LIGHT }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
        <div style={{ width: w, height: 60, borderRadius: 12, background: color }} />
        <div style={{ marginLeft: 20, fontFamily: MONO, fontWeight: 800, fontSize: strong ? 64 : 46, color: strong ? RED : FG }}>{fmt(steps(value, p, value > 1000 ? 500 : 100))}</div>
      </div>
    </div>
  );
};

const Bars: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useCue("n", 40);
  const nothing = useCue("nothing", 90);
  return (
    <>
      <Title text="Paid, no order" sub={`a simulated year · ${fmt(data.per_day)} checkouts a day`} />
      <HBar y={440} label="charge, call once" value={data.orphaned_once} at={4} color={GRAY} />
      <HBar y={600} label="retry + key" value={data.orphaned_key} at={14} color={GRAY} />
      <HBar y={760} label="+ refund step" value={data.orphaned_refund_step} at={n - 6} color={RED} strong grow={12} />
      <Sfx name="reveal" at={n} volume={0.35} />
      <div style={{ position: "absolute", left: L, top: 950, width: SAFE.lowRight - L, opacity: fade(frame, nothing - 4) }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: RED }}>charged, nothing behind</div>
        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 36, color: LIGHT }}>process died after the charge</div>
      </div>
    </>
  );
};

// ---- 6. The flip: PENDING order first, charge with the same key, a sweeper finishes a crash ------------------------

const LX = 240; // checkout lifeline
const RX = 760; // payment provider lifeline (labels stay left of x 890 below y 900)

const Call: React.FC<{ at: number; y: number; label: string; back?: boolean; color: string }> = ({ at, y, label, back, color }) => {
  const frame = useCurrentFrame();
  if (frame < at - 4) return null;
  const [a, b] = back ? [RX, LX] : [LX, RX];
  const dir = back ? -1 : 1;
  const p = sine(interpolate(frame, [at, at + FLIGHT], [0, 1], clamp));
  const x = a + (b - a) * p;
  const done = p >= 1;
  return (
    <>
      <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={a} y1={y} x2={x} y2={y} stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={back ? "14 12" : undefined} />
        {done ? <path d={`M${b - dir * 22} ${y - 14} L${b} ${y} L${b - dir * 22} ${y + 14}`} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : <circle cx={x} cy={y} r={11} fill={color} />}
      </svg>
      <div style={{ position: "absolute", left: LX + 30, top: y - 52, fontFamily: MONO, fontWeight: 700, fontSize: 32, color, opacity: fade(frame, at - 4, 6), whiteSpace: "nowrap" }}>{label}</div>
    </>
  );
};

const Flip: React.FC = () => {
  const frame = useCurrentFrame();
  const first = useCue("first", 40);
  const pending = useCue("pending", 60);
  const charge = useCue("charge", 100);
  const key = useCue("key", 140);
  const crash = Math.max(useCue("crash", 180), charge + 2 * FLIGHT + 6);
  const sweeper = Math.max(useCue("sweeper", 250), crash + 20);
  const finishes = Math.max(useCue("finishes", 280), sweeper + FLIGHT + 8);
  const confirmed = frame >= finishes;
  const stuck = frame >= crash && !confirmed;
  const glow = stuck ? 0.5 + 0.5 * Math.sin((frame - crash) * 0.2) : 0;
  const rowIn = ease(interpolate(frame, [first - 6, first + 12], [0, 1], clamp));
  const chip = confirmed ? GREEN : stuck ? FG : LIGHT;
  return (
    <>
      <Title text="Write the order first" />
      <div style={{ position: "absolute", left: L, top: 370, fontFamily: MONO, fontWeight: 800, fontSize: 38, color: LIGHT, opacity: rowIn }}>orders</div>
      <div
        style={{
          position: "absolute",
          left: L,
          top: 430,
          width: 920,
          height: 110,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 26px",
          borderRadius: 18,
          border: `4px solid ${confirmed ? GREEN : EDGE}`,
          background: confirmed ? GREEN_BG : CARD,
          boxShadow: glow > 0 ? `0 0 ${26 * glow}px ${LIGHT}` : "none",
          opacity: rowIn,
          transform: `translateY(${(1 - rowIn) * -24}px)`,
          fontFamily: MONO,
          fontSize: 42,
          color: FG,
        }}
      >
        <span style={{ fontWeight: 800 }}>{ORDER}</span>
        <span style={{ color: frame >= key ? GREEN : FG, fontWeight: frame >= key ? 800 : 400 }}>{KEY}</span>
        <span>{BASKET}</span>
        <span style={{ padding: "6px 18px", borderRadius: 12, border: `4px solid ${chip}`, color: chip, fontWeight: 800, opacity: fade(frame, pending - 4, 6) }}>{confirmed ? "CONFIRMED" : "PENDING"}</span>
      </div>
      <Sfx name="reveal" at={first} volume={0.3} />
      <Sfx name="stamp" at={finishes} volume={0.35} />

      {/* the two sides */}
      <div style={{ position: "absolute", left: LX - 160, width: 320, top: 610, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 38, color: frame >= crash ? (frame >= sweeper ? GREEN : RED) : FG, opacity: fade(frame, charge - 14) }}>
        {frame >= sweeper ? "sweeper job" : frame >= crash ? "crashed" : "checkout"}
      </div>
      <div style={{ position: "absolute", left: RX - 130, width: 260, top: 610, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 38, color: FG, opacity: fade(frame, charge - 14) }}>provider</div>
      <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0, opacity: fade(frame, charge - 14) }}>
        {[LX, RX].map((x) => (
          <line key={x} x1={x} y1={680} x2={x} y2={1150} stroke={GRAY} strokeWidth={4} strokeDasharray="4 14" strokeLinecap="round" />
        ))}
      </svg>
      <Call at={charge} y={770} label={frame >= key ? `charge · key ${KEY}` : "charge"} color={LIGHT} />
      <Call at={charge + FLIGHT + 2} y={870} label={`paid ${BASKET}`} back color={GREEN} />
      {frame >= crash ? (
        <div style={{ position: "absolute", left: LX - 26, top: 904, opacity: fade(frame, crash, 5) }}>
          <Cross color={RED} size={52} />
        </div>
      ) : null}
      <Sfx name="impact" at={crash} volume={0.3} />
      <Call at={sweeper} y={1050} label={`${KEY} paid?`} color={LIGHT} />
      <div style={{ position: "absolute", left: LX + 30, top: 1090, display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontWeight: 700, fontSize: 32, color: GREEN, opacity: fade(frame, sweeper + FLIGHT + 2, 6) }}>
        <Check color={GREEN} size={30} />
        paid {BASKET}
      </div>
      <Sfx name="whoosh" at={sweeper} volume={0.15} />
    </>
  );
};

// ---- 7. Result: zero paid-no-order, zero refunds ---------------------------

const Zero: React.FC<{ x: number; at: number; label: string; was: string }> = ({ x, at, label, was }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: 380, width: 430, opacity: fade(frame, at - 4, 6) }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>{label}</div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 260, lineHeight: 1.05, color: GREEN }}>0</div>
      <div style={{ fontFamily: MONO, fontSize: 34, color: LIGHT }}>{was}</div>
      <Sfx name="stamp" at={at} volume={0.3} />
    </div>
  );
};

const Result: React.FC = () => {
  const frame = useCurrentFrame();
  const zero = useCue("zero", 40);
  const zero2 = useCue("zero2", 80);
  return (
    <>
      <Title text="Order first" />
      <Zero x={L} at={zero} label="paid, no order" was={`call once: ${fmt(data.orphaned_once)}`} />
      <Zero x={560} at={zero2} label="refunds" was={`durable saga: ${fmt(data.refunds_durable)}`} />
      <div style={{ position: "absolute", left: L, top: 940, width: SAFE.lowRight - L, fontFamily: MONO, fontSize: 36, color: LIGHT, opacity: fade(frame, zero2 + 10) }}>
        a simulated year · {fmt(data.per_day * data.days)} checkouts
      </div>
    </>
  );
};

export const SCENES2: Record<string, React.FC> = { hook: Hook, story: Story, refund: Refund, production: ProductionScene, bars: Bars, flip: Flip, result: Result, follow: Follow };

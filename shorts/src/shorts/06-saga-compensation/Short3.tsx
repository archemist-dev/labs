// Week 6 Short "Who refunds the refund?" (script v2, 2026-11-25): a rejected order after the charge means a refund,
// and the refund call can fail too (32 failed tries in a simulated year, 1,806 refunds, 2% of tries assumed to fail).
// A failed refund is silent; the fix is a stored refund task retried with the same key, then a person; and a daily
// job that matches every charge to an order (the story found these by hand in finance reports). Every number comes
// from data3.json (07-saga-compensation/video_data3.py).
// Visuals v2 (Javlon, 2026-11-25: "I don't like the paid order box", "improve overall visuals"): real objects, not
// boxes: a bank card with chip and digits, a pound coin that cracks, the customer's phone, illustrated steps.
// The opening is 3D (the card, the refund coin rolling back and cracking); everything after is 2D.
// No camera motion anywhere: objects move. Everything read sits inside SAFE.
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Follow } from "../../components/Follow";
import { Title } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SAFE, SANS } from "../../theme";
import { Canvas } from "../03-uuid-keys/Short1";
import data from "./data3.json";

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
const COIN = "#c9ced6";
const BASKET = pounds(data.basket_pence);
const L = SAFE.left;

// ---- drawn objects -----------------------------------------------------------------------------------------------------

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
const Bell: React.FC<{ color: string; size?: number; muted?: boolean; swing?: number }> = ({ color, size = 60, muted, swing = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" style={{ flexShrink: 0, transform: `rotate(${swing}deg)`, transformOrigin: "50% 10%" }}>
    <path d="M30 8 C19 8 15 17 15 26 V36 L9 44 H51 L45 36 V26 C45 17 41 8 30 8 Z" fill="none" stroke={color} strokeWidth={4.5} strokeLinejoin="round" />
    <path d="M24 49 A6 6 0 0 0 36 49" fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" />
    {muted ? <path d="M8 8 L52 52" stroke={color} strokeWidth={5} strokeLinecap="round" /> : null}
  </svg>
);
const Person: React.FC<{ color: string; size?: number }> = ({ color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
    <circle cx={32} cy={21} r={11} fill="none" stroke={color} strokeWidth={4.5} />
    <path d="M10 56 C10 42 20 37 32 37 C44 37 54 42 54 56" fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" />
  </svg>
);

// A pound coin. `crack` 0..1 splits it into two red halves.
export const Coin: React.FC<{ size: number; crack?: number; dim?: boolean }> = ({ size, crack = 0, dim }) => {
  const bad = crack > 0.05;
  const fill = bad ? RED : COIN;
  const id = `c${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const half = (side: 1 | -1) => (
    <g transform={`translate(${side * crack * 7} ${crack * 2}) rotate(${side * crack * 9} 50 96)`} clipPath={`url(#${id}${side === 1 ? "r" : "l"})`}>
      <circle cx={50} cy={50} r={46} fill={fill} />
      <circle cx={50} cy={50} r={36} fill="none" stroke={bad ? "#b3363a" : "#8d939c"} strokeWidth={3.5} />
      <text x={50} y={68} textAnchor="middle" fontFamily={MONO} fontWeight={800} fontSize={52} fill={bad ? "#7d2125" : "#5c6370"}>
        £
      </text>
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="-10 -4 120 112" style={{ flexShrink: 0, opacity: dim ? 0.55 : 1, overflow: "visible" }}>
      <defs>
        <clipPath id={`${id}l`}>
          <path d="M-20 -20 H52 L44 30 L56 52 L46 78 L52 120 H-20 Z" />
        </clipPath>
        <clipPath id={`${id}r`}>
          <path d="M120 -20 H52 L44 30 L56 52 L46 78 L52 120 H120 Z" />
        </clipPath>
      </defs>
      {half(-1)}
      {half(1)}
    </svg>
  );
};

// A bank card: chip, digits, the brand corner left empty on purpose.
export const BankCard: React.FC<{ width: number; glow?: string }> = ({ width, glow }) => {
  const h = width * 0.63;
  return (
    <div
      style={{
        width,
        height: h,
        boxSizing: "border-box",
        borderRadius: width * 0.07,
        border: `4px solid ${glow ?? EDGE}`,
        background: "linear-gradient(135deg, #343a44 0%, #23272e 55%, #1b1e23 100%)",
        boxShadow: glow ? `0 0 ${width * 0.08}px ${glow}55` : "0 10px 30px rgba(0,0,0,0.5)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "absolute", left: width * 0.1, top: h * 0.2, width: width * 0.17, height: h * 0.2, borderRadius: width * 0.025, background: "linear-gradient(135deg, #d9dde3, #8d939c)" }} />
      <div style={{ position: "absolute", left: width * 0.1, bottom: h * 0.16, fontFamily: MONO, fontWeight: 700, fontSize: width * 0.085, letterSpacing: width * 0.008, color: FG, whiteSpace: "nowrap" }}>•••• 4242</div>
    </div>
  );
};

// The customer's phone, with whatever is on its screen.
const Phone: React.FC<{ left: number; top: number; width: number; height: number; children: React.ReactNode }> = ({ left, top, width, height, children }) => (
  <div style={{ position: "absolute", left, top, width, height, boxSizing: "border-box", borderRadius: 46, border: `5px solid ${LIGHT}`, background: "#101215", padding: "64px 22px 26px", boxShadow: "0 14px 40px rgba(0,0,0,0.55)" }}>
    <div style={{ position: "absolute", left: width / 2 - 50, top: 22, width: 100, height: 14, borderRadius: 7, background: EDGE }} />
    {children}
  </div>
);

// ---- 1. Hook (3D): the card was charged; the refund coin rolls back and cracks before it arrives; 32 a year ---------

const CAM: [number, number, number] = [0, 3.2, 12];
const LOOK: [number, number, number] = [0, 1.25, 0];

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

const CW = 1.85;
const CH = CW * 0.63;
const CARD_X = -0.98;
const OBJ_Y = 1.85;
const COIN_R = 0.46;
const STOP_X = 0.95;

const Half: React.FC<{ side: 1 | -1; color: string; glow: number }> = ({ side, color, glow }) => (
  <mesh rotation={[Math.PI / 2, 0, 0]}>
    <cylinderGeometry args={[COIN_R, COIN_R, 0.11, 56, 1, false, side === 1 ? 0 : Math.PI, Math.PI]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.3} metalness={0.65} side={THREE.DoubleSide} />
  </mesh>
);

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const refund = useCue("refund", 50);
  const failed = useCue("failed", 120);
  const n = useCue("n", 135);
  const project = useProject();
  // The coin is already rolling at frame 0 and stops short of the card just before "failed"; then it cracks.
  const travel = sine(interpolate(frame, [-10, Math.max(failed - 4, 60)], [0, 1], clamp));
  const coinX = 2.35 + (STOP_X - 2.35) * travel;
  const crack = ease(interpolate(frame, [failed, failed + 18], [0, 1], clamp));
  const bad = crack > 0.05;
  const bob = Math.sin(frame * 0.07) * 0.02;
  const cardEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, CH, 0.06)), []);
  const coinColor = bad ? RED : COIN;
  const card = project(CARD_X, OBJ_Y + bob, 0.05);
  const cardL = project(CARD_X - CW / 2, OBJ_Y, 0.05);
  const cardR = project(CARD_X + CW / 2, OBJ_Y, 0.05);
  const cw = cardR.x - cardL.x;
  const stop = project(STOP_X, OBJ_Y, 0.2);
  const now = project(coinX, OBJ_Y, 0.2);
  const coinEdge = project(coinX - COIN_R, OBJ_Y, 0.2);
  const inside = interpolate(now.x + 130, [SAFE.right - 60, SAFE.right], [1, 0], clamp);
  const p = interpolate(frame, [n - 12, n], [0, 1], clamp);
  return (
    <>
      <Canvas pos={CAM} look={LOOK}>
        <pointLight position={[-1, 3.2, 4]} intensity={16} distance={12} color="#ffffff" />
        <group position={[CARD_X, OBJ_Y + bob, 0]}>
          <mesh>
            <boxGeometry args={[CW, CH, 0.06]} />
            <meshStandardMaterial color="#4a5260" emissive="#39414d" emissiveIntensity={0.9} roughness={0.4} metalness={0.3} />
          </mesh>
          <lineSegments geometry={cardEdges}>
            <lineBasicMaterial color={GREEN} />
          </lineSegments>
          <mesh position={[-CW * 0.3, CH * 0.14, 0.04]}>
            <boxGeometry args={[CW * 0.17, CH * 0.22, 0.02]} />
            <meshStandardMaterial color="#b9bec6" roughness={0.25} metalness={0.9} />
          </mesh>
        </group>
        <group position={[coinX, OBJ_Y, 0.2]}>
          <group position={[crack * 0.17, crack * 0.03, 0]} rotation={[0, 0, -crack * 0.32]}>
            <Half side={1} color={coinColor} glow={bad ? 0.45 : 0.1} />
          </group>
          <group position={[-crack * 0.17, crack * 0.01, 0]} rotation={[0, 0, crack * 0.28]}>
            <Half side={-1} color={coinColor} glow={bad ? 0.45 : 0.1} />
          </group>
        </group>
      </Canvas>
      <Title text="Money back?" />
      {/* flat details on the card */}
      <div style={{ position: "absolute", left: cardL.x + cw * 0.1, top: card.y + cw * 0.12, fontFamily: MONO, fontWeight: 700, fontSize: cw * 0.085, letterSpacing: 3, color: FG }}>•••• 4242</div>
      <div style={{ position: "absolute", left: cardL.x, top: card.y + cw * 0.36, width: cw, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, textShadow: "0 4px 18px #000" }}>
        <Check color={GREEN} size={44} />
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: GREEN }}>charged</span>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 46, color: FG }}>{BASKET}</span>
      </div>
      {/* the coin's way back to the card: the part it never covers turns red */}
      <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={cardR.x + 14} y1={stop.y} x2={Math.max(cardR.x + 14, coinEdge.x - 14)} y2={stop.y} stroke={bad ? RED : LIGHT} strokeWidth={5} strokeDasharray="4 16" strokeLinecap="round" opacity={inside} />
      </svg>
      {!bad ? (
        <div style={{ position: "absolute", left: now.x - 40, top: now.y - 44, width: 80, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 64, lineHeight: "88px", color: "#5c6370", opacity: inside }}>£</div>
      ) : null}
      <div style={{ position: "absolute", left: (crack > 0 ? stop.x : now.x) - 150, top: stop.y + 128, width: 300, textAlign: "center", textShadow: "0 4px 18px #000", opacity: inside }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: bad ? RED : LIGHT, opacity: fade(frame, refund - 4) }}>refund</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, fontFamily: MONO, fontWeight: 800, fontSize: 46, color: bad ? RED : FG }}>
          {bad ? <Cross color={RED} size={40} /> : null}
          {bad ? "failed" : BASKET}
        </div>
      </div>
      <Sfx name="whoosh" at={4} volume={0.12} />
      <Sfx name="buzz" at={failed} volume={0.3} />
      <div style={{ position: "absolute", left: L, top: 350, display: "flex", alignItems: "baseline", gap: 26, opacity: fade(frame, n - 14, 6) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 240, lineHeight: 1, color: p >= 1 ? RED : GRAY }}>{steps(data.failed_refund_tries, p, 4)}</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 76, color: FG }}>a year</div>
      </div>
      <div style={{ position: "absolute", left: L + 6, top: 606, fontFamily: MONO, fontSize: 36, color: LIGHT, opacity: fade(frame, n + 8) }}>failed refund tries · simulated year</div>
      <Sfx name="reveal" at={n} volume={0.35} />
    </>
  );
};

// ---- 2. The chain: the card is charged first, the order is rejected, the money goes back ----------------------------

const OrderTicket: React.FC<{ bad: boolean }> = ({ bad }) => (
  <svg width={120} height={104} viewBox="0 0 120 104" style={{ flexShrink: 0 }}>
    <path d="M14 6 H106 V98 L94 90 L82 98 L70 90 L58 98 L46 90 L34 98 L22 90 L14 98 Z" fill="#23272e" stroke={bad ? RED : LIGHT} strokeWidth={4} strokeLinejoin="round" />
    <path d="M30 30 H90 M30 50 H78 M30 70 H66" stroke={bad ? RED : GRAY} strokeWidth={5} strokeLinecap="round" />
  </svg>
);

const STEP_H = 168;
const STEP_W = 760;
const Step: React.FC<{ top: number; at: number; icon: React.ReactNode; title: string; note: string; tone: "ok" | "bad" | "plain" }> = ({ top, at, icon, title, note, tone }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at - 4, at + 12], [0, 1], clamp));
  const color = tone === "ok" ? GREEN : tone === "bad" ? RED : LIGHT;
  return (
    <div
      style={{
        position: "absolute",
        left: L,
        top,
        width: STEP_W,
        height: STEP_H,
        boxSizing: "border-box",
        padding: "0 30px",
        display: "flex",
        alignItems: "center",
        gap: 30,
        borderRadius: 26,
        border: `4px solid ${tone === "plain" ? GRAY : color}`,
        background: tone === "ok" ? GREEN_BG : tone === "bad" ? RED_BG : CARD,
        opacity: p,
        transform: `translateY(${(1 - p) * 26}px)`,
      }}
    >
      <div style={{ width: 150, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: FG }}>{title}</div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontWeight: 700, fontSize: 40, color }}>
          {tone === "ok" ? <Check color={GREEN} size={36} /> : tone === "bad" ? <Cross color={RED} size={36} /> : null}
          {note}
        </div>
      </div>
    </div>
  );
};

const Down: React.FC<{ y: number; at: number }> = ({ y, at }) => {
  const frame = useCurrentFrame();
  const p = sine(interpolate(frame, [at - 14, at], [0, 1], clamp));
  if (frame < at - 14) return null;
  const x = L + 105;
  return (
    <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0 }}>
      <line x1={x} y1={y} x2={x} y2={y + 44 * p} stroke={LIGHT} strokeWidth={5} strokeLinecap="round" />
      {p >= 1 ? <path d={`M${x - 12} ${y + 32} L${x} ${y + 46} L${x + 12} ${y + 32}`} fill="none" stroke={LIGHT} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
};

const Chain: React.FC = () => {
  const frame = useCurrentFrame();
  const charged = useCue("charged", 20);
  const rejected = useCue("rejected", 60);
  const back = useCue("back", 95);
  const Y = [390, 610, 830];
  // the money's way back: a coin rides up the right side, from the refund step to the card
  const RX = 930;
  const ret = sine(interpolate(frame, [back + 8, back + 52], [0, 1], clamp));
  const y0 = Y[2] + STEP_H / 2;
  const y1 = Y[0] + STEP_H / 2;
  const cy = y0 + (y1 - y0) * ret;
  return (
    <>
      <Title text="Why refunds exist" />
      <Step top={Y[0]} at={charged} icon={<BankCard width={150} glow={GREEN} />} title="charge the card" note={BASKET} tone="ok" />
      <Down y={Y[0] + STEP_H + 2} at={rejected} />
      <Step top={Y[1]} at={rejected} icon={<OrderTicket bad />} title="create the order" note="rejected" tone="bad" />
      <Down y={Y[1] + STEP_H + 2} at={back} />
      <Step top={Y[2]} at={back} icon={<Coin size={104} />} title="refund" note="money back" tone="plain" />
      <Sfx name="reveal" at={charged} volume={0.25} />
      <Sfx name="buzz" at={rejected} volume={0.25} />
      <Sfx name="whoosh" at={back + 8} volume={0.15} />
      {frame >= back + 8 ? (
        <>
          <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0 }}>
            <path d={`M${L + STEP_W + 8} ${y0} H${RX} V${cy}`} fill="none" stroke={LIGHT} strokeWidth={5} strokeDasharray="4 16" strokeLinecap="round" />
            {ret >= 1 ? (
              <>
                <path d={`M${RX} ${y1} H${L + STEP_W + 14}`} fill="none" stroke={LIGHT} strokeWidth={5} strokeDasharray="4 16" strokeLinecap="round" />
                <path d={`M${L + STEP_W + 30} ${y1 - 14} L${L + STEP_W + 12} ${y1} L${L + STEP_W + 30} ${y1 + 14}`} fill="none" stroke={LIGHT} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}
          </svg>
          {ret < 1 ? (
            <div style={{ position: "absolute", left: RX - 30, top: cy - 30 }}>
              <Coin size={60} />
            </div>
          ) : null}
        </>
      ) : null}
      <div style={{ position: "absolute", left: L, top: 1040, width: SAFE.lowRight - L, fontFamily: MONO, fontSize: 36, color: LIGHT, opacity: fade(frame, back + 52) }}>
        a second call to the payment provider
      </div>
    </>
  );
};

// ---- 3. The year: 1,806 refunds; 2% of tries fail (1 coin in 50); 32 failed tries -----------------------------------

const Year: React.FC = () => {
  const frame = useCurrentFrame();
  const refunds = useCue("refunds", 40);
  const pct = useCue("pct", 110);
  const p = ease(interpolate(frame, [refunds - 14, refunds + 4], [0, 1], clamp));
  const BAD = 27;
  const S = 62;
  const G = 20;
  return (
    <>
      <Title text="A simulated year" sub={`${fmt(data.per_day)} checkouts a day`} />
      <div style={{ position: "absolute", left: L, top: 400, opacity: fade(frame, refunds - 14, 6) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: LIGHT }}>refunds needed</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 180, lineHeight: 1.05, color: FG }}>{fmt(steps(data.refunds, p, 100))}</div>
      </div>
      <Sfx name="reveal" at={refunds} volume={0.3} />
      <div style={{ position: "absolute", left: L, top: 680, display: "flex", alignItems: "baseline", gap: 20, opacity: fade(frame, pct - 6, 8) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 64, color: FG }}>{data.refund_fail_pct}%</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT }}>of refund tries fail · assumed</div>
      </div>
      {/* 2% is 1 try in 50: fifty coins, one cracks */}
      {Array.from({ length: 50 }).map((_, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        const at = pct + row * 3 + col;
        const crack = i === BAD ? ease(interpolate(frame, [pct + 26, pct + 40], [0, 1], clamp)) : 0;
        const pop = ease(interpolate(frame, [at - 4, at + 6], [0, 1], clamp));
        return (
          <div key={i} style={{ position: "absolute", left: L + col * (S + G), top: 780 + row * (S + G - 4), opacity: pop, transform: `scale(${0.6 + 0.4 * pop})` }}>
            <Coin size={S} crack={crack} dim={i !== BAD} />
          </div>
        );
      })}
      <Sfx name="buzz" at={pct + 26} volume={0.25} />
      <div style={{ position: "absolute", left: L, top: 1190, display: "flex", alignItems: "baseline", gap: 18, opacity: fade(frame, pct + 34) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 72, color: RED }}>{data.failed_refund_tries}</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: FG }}>failed tries a year</div>
      </div>
    </>
  );
};

// ---- 4. Silent: the customer still waits; on the server the refund failed and nothing rang --------------------------

const Dots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-flex", gap: 7, marginLeft: 8 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 9, height: 9, borderRadius: 5, background: LIGHT, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(frame * 0.14 - i * 0.9)) }} />
      ))}
    </span>
  );
};

const Silent: React.FC = () => {
  const frame = useCurrentFrame();
  const silent = useCue("silent", 30);
  const paid = useCue("paid", 60);
  const nothing = useCue("nothing", 95);
  const row: React.CSSProperties = { boxSizing: "border-box", height: 84, borderRadius: 16, padding: "0 18px", display: "flex", alignItems: "center", gap: 10, fontFamily: SANS, fontWeight: 700, fontSize: 32, whiteSpace: "nowrap" };
  const lit = frame >= paid;
  return (
    <>
      <Title text="Nobody hears it" />
      {/* the customer's phone */}
      <Phone left={L} top={380} width={400} height={640}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, color: FG, marginBottom: 20 }}>Your order</div>
        <div style={{ ...row, border: `4px solid ${GREEN}`, background: GREEN_BG, color: GREEN, boxShadow: lit ? `0 0 ${22 * (1 - fade(frame, paid + 4, 24))}px ${GREEN}` : "none" }}>
          <Check color={GREEN} size={32} />
          Paid {BASKET}
        </div>
        <div style={{ ...row, marginTop: 14, border: `4px dashed ${GRAY}`, color: LIGHT }}>Order not placed</div>
        <div style={{ ...row, marginTop: 14, border: `4px solid ${EDGE}`, background: CARD, color: LIGHT }}>
          Refund pending
          <Dots />
        </div>
        <div style={{ marginTop: 34, display: "flex", justifyContent: "center", opacity: 0.9 }}>
          <Coin size={120} dim />
        </div>
      </Phone>
      {/* the server's side */}
      <div style={{ position: "absolute", left: 520, top: 400, width: 480, opacity: fade(frame, 4) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>payment service</div>
        <div style={{ ...row, marginTop: 16, height: 96, fontSize: 38, background: RED, border: `4px solid ${RED}`, color: FG, justifyContent: "space-between" }}>
          refund call
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontWeight: 800 }}>
            <Cross color={FG} size={36} />
            failed
          </span>
        </div>
        <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 16, opacity: fade(frame, silent - 2) }}>
          <Bell color={LIGHT} size={72} muted />
          <div>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>no alert</div>
            <div style={{ fontFamily: MONO, fontSize: 32, color: LIGHT }}>no retry</div>
          </div>
        </div>
      </div>
      <Sfx name="reveal" at={paid} volume={0.25} />
      <div style={{ position: "absolute", left: L, top: 1080, width: SAFE.lowRight - L, fontFamily: SANS, fontWeight: 800, fontSize: 68, color: RED, opacity: fade(frame, nothing - 2, 8) }}>no food, no money</div>
      <Sfx name="stamp" at={nothing} volume={0.3} />
    </>
  );
};

// ---- 5. The fix: a stored refund task, retried with the same key; then a person -------------------------------------

const Try: React.FC<{ at: number; n: number; ok: boolean }> = ({ at, n, ok }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at - 4, at + 8], [0, 1], clamp));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 16, border: `4px solid ${ok ? GREEN : RED}`, background: ok ? GREEN_BG : RED_BG, opacity: p, transform: `scale(${0.8 + 0.2 * p})` }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: FG }}>try {n}</span>
      {ok ? <Check color={GREEN} size={34} /> : <Cross color={RED} size={34} />}
      <Sfx name={ok ? "reveal" : "buzz"} at={at} volume={0.2} />
    </div>
  );
};

const Task: React.FC<{ top: number; at: number; id: string; status: string; tone: "plain" | "ok" | "bad" }> = ({ top, at, id, status, tone }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at - 4, at + 14], [0, 1], clamp));
  const c = tone === "ok" ? GREEN : tone === "bad" ? RED : GRAY;
  return (
    <div
      style={{
        position: "absolute",
        left: L,
        top,
        width: 920,
        height: 112,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "0 22px",
        borderRadius: 20,
        border: `4px solid ${c}`,
        background: tone === "ok" ? GREEN_BG : tone === "bad" ? RED_BG : CARD,
        opacity: p,
        transform: `translateY(${(1 - p) * -20}px)`,
        fontFamily: MONO,
        fontSize: 40,
        color: FG,
      }}
    >
      <Coin size={70} crack={tone === "bad" ? 1 : 0} />
      <span style={{ fontWeight: 800, flex: 1 }}>{id}</span>
      <span>{BASKET}</span>
      <span style={{ padding: "6px 16px", borderRadius: 12, border: `4px solid ${tone === "plain" ? LIGHT : c}`, color: tone === "plain" ? LIGHT : c, fontWeight: 800, fontSize: 34 }}>{status}</span>
    </div>
  );
};

const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  const task = useCue("task", 50);
  const key = useCue("key", 90);
  const twice = useCue("twice", 140);
  const person = useCue("person", 200);
  const t1 = key + 8;
  const t2 = Math.max(t1 + 16, twice - 6);
  const done = frame >= t2;
  const b1 = Math.max(twice + 22, person - 40);
  const ring = frame >= person ? Math.sin((frame - person) * 0.55) * 14 * Math.max(0, 1 - (frame - person) / 45) : 0;
  return (
    <>
      <Title text="The fix" />
      <div style={{ position: "absolute", left: L, top: 365, fontFamily: MONO, fontWeight: 800, fontSize: 38, color: LIGHT, opacity: fade(frame, 6) }}>refund tasks · saved in the database</div>
      <Task top={425} at={task} id="refund #1041" status={done ? "DONE" : "PENDING"} tone={done ? "ok" : "plain"} />
      <Sfx name="reveal" at={task} volume={0.25} />
      <div style={{ position: "absolute", left: L, top: 560, display: "flex", alignItems: "center", gap: 14, opacity: fade(frame, key - 4) }}>
        <div style={{ padding: "12px 18px", borderRadius: 16, border: `4px solid ${GREEN}`, background: GREEN_BG, fontFamily: MONO, fontWeight: 800, fontSize: 34, color: FG }}>key r-1041</div>
        <Try at={t1} n={1} ok={false} />
        <Try at={t2} n={2} ok />
      </div>
      <div style={{ position: "absolute", left: L, top: 660, display: "flex", alignItems: "center", gap: 14, opacity: fade(frame, twice + 2) }}>
        <Check color={GREEN} size={44} />
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: GREEN }}>money back once, never twice</span>
      </div>
      <Sfx name="stamp" at={twice} volume={0.25} />

      <Task top={800} at={b1} id="refund #1077" status="FAILED" tone="bad" />
      <div style={{ position: "absolute", left: L, top: 935, display: "flex", alignItems: "center", gap: 14 }}>
        <Try at={b1 + 6} n={1} ok={false} />
        <Try at={b1 + 14} n={2} ok={false} />
        <Try at={b1 + 22} n={3} ok={false} />
      </div>
      <div style={{ position: "absolute", left: L, top: 1050, display: "flex", alignItems: "center", gap: 18, padding: "16px 26px", borderRadius: 22, border: `4px solid ${FG}`, background: CARD, opacity: fade(frame, person - 4, 8) }}>
        <Bell color={FG} size={68} swing={ring} />
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: FG }}>alert a person</span>
        <Person color={FG} size={68} />
      </div>
      <Sfx name="alarm" at={person} volume={0.15} />
    </>
  );
};

// ---- 6. Daily: found by hand in finance reports; then a daily job matches every charge to an order -----------------

const ROWS: { key: string; pence: number; order?: string }[] = [
  { key: "c38", pence: 1947, order: "#1037" },
  { key: "c39", pence: 1199, order: "#1038" },
  { key: "c40", pence: 2450, order: "#1039" },
  { key: "c41", pence: 875 },
  { key: "c42", pence: 1947, order: "#1041" },
];

const Daily: React.FC = () => {
  const frame = useCurrentFrame();
  const hand = useCue("hand", 40);
  const reports = useCue("reports", 70);
  const job = useCue("job", 150);
  const charge = useCue("charge", 180);
  const order = useCue("order", 215);
  const isJob = frame >= job;
  const cell: React.CSSProperties = { boxSizing: "border-box", height: 78, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", fontFamily: MONO, fontSize: 34, color: FG };
  const ROW = 88;
  const TOP = 500;
  // the job's scan line walks down the rows, one at a time
  const scanEnd = Math.max(order, charge + 7 * ROWS.length);
  const scan = isJob ? interpolate(frame, [charge - 4, scanEnd], [0, ROWS.length], clamp) : -1;
  return (
    <>
      <Title text={isJob ? "A daily job" : "Found by hand"} />
      <div style={{ position: "absolute", left: L, top: 365, display: "flex", alignItems: "center", gap: 14, opacity: fade(frame, isJob ? job - 2 : reports - 4) }}>
        {isJob ? (
          <span style={{ padding: "6px 16px", borderRadius: 12, border: `4px solid ${GREEN}`, background: GREEN_BG, fontFamily: MONO, fontWeight: 800, fontSize: 34, color: FG }}>02:00</span>
        ) : null}
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: isJob ? GREEN : LIGHT }}>{isJob ? "every night · charges vs orders" : "finance report · checked by hand"}</span>
      </div>
      <div style={{ position: "absolute", left: L, top: 445, width: 420, fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>charges</div>
      <div style={{ position: "absolute", left: 560, top: 445, width: 440, fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>orders</div>
      {scan >= 0 && scan < ROWS.length ? (
        <div style={{ position: "absolute", left: L - 12, top: TOP - 5 + Math.floor(scan) * ROW, width: 944, height: 88, borderRadius: 18, background: "rgba(52,199,123,0.10)", border: `3px solid ${GREEN}` }} />
      ) : null}
      {ROWS.map((r, i) => {
        const top = TOP + i * ROW;
        const missing = !r.order;
        const matched = isJob && scan >= i + 0.6;
        const flagged = missing && frame >= hand;
        const alert = missing && matched;
        return (
          <React.Fragment key={r.key}>
            <div style={{ ...cell, position: "absolute", left: L, top, width: 420, background: CARD, border: `4px solid ${matched && !missing ? GREEN : missing && flagged ? RED : EDGE}`, opacity: fade(frame, 2 + i * 3) }}>
              <span style={{ fontWeight: 800 }}>{r.key}</span>
              <span>{pounds(r.pence)}</span>
              {matched && !missing ? <Check color={GREEN} /> : <span style={{ width: 36 }} />}
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
                  gap: 12,
                  background: alert ? RED : flagged ? RED_BG : "transparent",
                  border: alert ? `4px solid ${RED}` : `4px dashed ${flagged ? RED : EDGE}`,
                  color: alert ? FG : flagged ? RED : MUTED,
                  fontFamily: SANS,
                  fontWeight: 800,
                  opacity: fade(frame, 4 + i * 3),
                }}
              >
                {alert ? <Bell color={FG} size={42} /> : null}
                {alert ? "no order · alert" : flagged ? "no order" : "—"}
              </div>
            ) : (
              <div style={{ ...cell, position: "absolute", left: 560, top, width: 440, background: matched ? GREEN_BG : CARD, border: `4px solid ${matched ? GREEN : EDGE}`, opacity: fade(frame, 4 + i * 3) }}>
                <span style={{ fontWeight: 800 }}>{r.order}</span>
                <span>{r.key}</span>
                <span style={{ color: LIGHT }}>DELIVERED</span>
              </div>
            )}
          </React.Fragment>
        );
      })}
      <Sfx name="type" at={hand} volume={0.25} />
      <Sfx name="whoosh" at={job} volume={0.15} />
      <Sfx name="stamp" at={scanEnd} volume={0.3} />
      <div style={{ position: "absolute", left: L, top: 980, width: SAFE.lowRight - L, display: "flex", alignItems: "center", gap: 14, opacity: isJob ? fade(frame, scanEnd + 4) : fade(frame, hand + 4) }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 50, color: isJob ? GREEN : RED }}>{isJob ? "found the same night" : "paid, nothing behind it"}</span>
      </div>
    </>
  );
};

export const SCENES3: Record<string, React.FC> = { hook: Hook, chain: Chain, year: Year, silent: Silent, fix: Fix, daily: Daily, follow: Follow };

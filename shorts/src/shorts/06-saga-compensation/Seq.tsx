// The event scenes of week 6 "The retry that doubled orders" (v2, after Javlon's "not intuitive" on the 3D stage).
// Top band = state: the checkout on the left (payment taken, then what the customer sees), the real `orders` table on
// the right. Lower band = the calls, as a sequence diagram: two lifelines and long arrows, one dot riding one arrow at
// a time. The double order is the second row with the same checkout id.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Header } from "../04-response-time/Short1";
import data from "./data.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const CARD = "#22262c";
const EDGE = "#3a3f47";
const HATCH = `repeating-linear-gradient(135deg, rgba(229,72,77,0.28) 0 14px, rgba(229,72,77,0.08) 14px 28px)`;
const BASKET = pounds(data.basket_pence);
export const KEY = "c42";
export const IDS = ["#1041", "#1042"];
const FLIGHT = 42; // frames for a full trip (1.4 s, sine eased); a lost reply dies halfway in half the time

const LX = 250; // checkout lifeline
const RX = 810; // orders lifeline
const LANE_TOP = 700;
const LANE_BOTTOM = 1060;
const Y = { call: 770, reply: 880, retry: 990 };

// ---- icons -----------------------------------------------------------------------------------------------------------

const Spinner: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" style={{ transform: `rotate(${frame * 8}deg)` }}>
      <circle cx={18} cy={18} r={13} fill="none" stroke={EDGE} strokeWidth={5} />
      <path d="M18 5 A13 13 0 0 1 31 18" fill="none" stroke={LIGHT} strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
};
const Check: React.FC<{ color: string }> = ({ color }) => (
  <svg width={36} height={36} viewBox="0 0 36 36">
    <path d="M7 19 L15 27 L29 10" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Clock: React.FC = () => (
  <svg width={36} height={36} viewBox="0 0 36 36">
    <circle cx={18} cy={18} r={14} fill="none" stroke={LIGHT} strokeWidth={4} />
    <path d="M18 9 L18 18 L25 22" fill="none" stroke={LIGHT} strokeWidth={4} strokeLinecap="round" />
  </svg>
);
const PhoneIcon: React.FC = () => (
  <svg width={46} height={74} viewBox="0 0 46 74">
    <rect x={3} y={3} width={40} height={68} rx={9} fill="#101215" stroke={LIGHT} strokeWidth={4} />
    <rect x={16} y={9} width={14} height={4} rx={2} fill={LIGHT} />
  </svg>
);
const DbIcon: React.FC = () => (
  <svg width={54} height={62} viewBox="0 0 54 62">
    <ellipse cx={27} cy={11} rx={22} ry={8} fill="none" stroke={LIGHT} strokeWidth={4} />
    <path d="M5 11 V51 A22 8 0 0 0 49 51 V11" fill="none" stroke={LIGHT} strokeWidth={4} />
    <path d="M5 31 A22 8 0 0 0 49 31" fill="none" stroke={LIGHT} strokeWidth={4} />
  </svg>
);

// ---- top band: the checkout and the orders table ---------------------------------------------------------------------

export type Status = "placing" | "timeout" | "retrying" | "placed";
const STATUS: Record<Status, string> = { placing: "Placing order…", timeout: "Timed out", retrying: "Retrying…", placed: "Order placed" };

const Checkout: React.FC<{ status: Status; since: number }> = ({ status, since }) => {
  const frame = useCurrentFrame();
  const ok = status === "placed";
  return (
    <div style={{ position: "absolute", left: 70, top: 370, width: 420 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <PhoneIcon />
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>checkout</div>
      </div>
      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderRadius: 16, background: GREEN_BG, border: `4px solid ${GREEN}` }}>
        <Check color={GREEN} />
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: GREEN }}>Paid {BASKET}</div>
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderRadius: 16, background: CARD, border: `4px solid ${ok ? GREEN : EDGE}`, opacity: since > 0 ? fade(frame, since - 2, 8) : 1 }}>
        {ok ? <Check color={GREEN} /> : status === "timeout" ? <Clock /> : <Spinner />}
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: ok ? GREEN : LIGHT }}>{STATUS[status]}</div>
      </div>
    </div>
  );
};

export type Row = { at: number; tone: "plain" | "bad" | "good"; id: string; pulse?: number };

const Orders: React.FC<{ rows: Row[] }> = ({ rows }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 580, top: 370, width: 430 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <DbIcon />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: FG }}>orders</div>
      </div>
      {rows.map((r, i) => {
        const p = ease(interpolate(frame, [r.at - 4, r.at + 17], [0, 1], clamp));
        const glow = r.pulse !== undefined ? Math.max(0, 1 - Math.abs(frame - r.pulse - 6) / 16) : 0;
        const bad = r.tone === "bad";
        const border = bad ? RED : r.tone === "good" ? GREEN : glow > 0.05 ? FG : GRAY;
        return (
          <div
            key={r.id}
            style={{
              position: "absolute",
              top: 92 + i * 86,
              width: 430,
              boxSizing: "border-box",
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderRadius: 14,
              border: `4px solid ${border}`,
              background: bad ? HATCH : r.tone === "good" ? GREEN_BG : CARD,
              boxShadow: glow > 0 ? `0 0 ${28 * glow}px ${r.tone === "good" ? GREEN : FG}` : "none",
              opacity: p,
              transform: `translateY(${(1 - p) * -24}px)`,
              fontFamily: MONO,
              fontSize: 34,
              color: FG,
            }}
          >
            <span style={{ fontWeight: 800, color: bad ? RED : FG }}>{r.id}</span>
            <span style={{ color: bad ? RED : FG, fontWeight: bad ? 800 : 400 }}>{KEY}</span>
            <span>{BASKET}</span>
            <Sfx name={bad ? "buzz" : "reveal"} at={r.at} volume={0.3} />
          </div>
        );
      })}
    </div>
  );
};

// ---- lower band: the calls ---------------------------------------------------------------------------------------------

export type Trip = { launch: number; y: number; back?: boolean; lost?: boolean; color: string; label: string };
export const tripEnd = (t: Trip) => t.launch + (t.lost ? FLIGHT / 2 : FLIGHT);

const Lifelines: React.FC = () => (
  <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0 }}>
    {[LX, RX].map((x) => (
      <line key={x} x1={x} y1={LANE_TOP} x2={x} y2={LANE_BOTTOM} stroke={GRAY} strokeWidth={4} strokeDasharray="4 14" strokeLinecap="round" />
    ))}
  </svg>
);

const Arrow: React.FC<{ t: Trip }> = ({ t }) => {
  const frame = useCurrentFrame();
  const show = fade(frame, t.launch - 6, 6);
  if (show <= 0) return null;
  const [a, b] = t.back ? [RX, LX] : [LX, RX];
  const dir = t.back ? -1 : 1;
  const span = t.lost ? 0.5 : 1;
  const p = sine(interpolate(frame, [t.launch, tripEnd(t)], [0, 1], clamp)) * span;
  const x = a + (b - a) * p;
  const arrived = frame >= tripEnd(t);
  const dead = t.lost && arrived;
  const lineEnd = t.lost ? x : a + (b - a) * p;
  const head = !t.lost && arrived;
  return (
    <>
      <svg width={1080} height={1300} style={{ position: "absolute", left: 0, top: 0, opacity: show }}>
        <line x1={a} y1={t.y} x2={lineEnd} y2={t.y} stroke={dead ? RED : t.color} strokeWidth={5} strokeLinecap="round" strokeDasharray={t.back ? "14 12" : undefined} />
        {head ? <path d={`M${b - dir * 22} ${t.y - 14} L${b} ${t.y} L${b - dir * 22} ${t.y + 14}`} fill="none" stroke={t.color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {!arrived ? (
          <>
            <circle cx={x} cy={t.y} r={20} fill={t.color} opacity={0.22} />
            <circle cx={x} cy={t.y} r={11} fill={t.color} />
          </>
        ) : null}
        {dead ? (
          <path d={`M${x - 16} ${t.y - 16} L${x + 16} ${t.y + 16} M${x + 16} ${t.y - 16} L${x - 16} ${t.y + 16}`} stroke={RED} strokeWidth={7} strokeLinecap="round" opacity={fade(frame, tripEnd(t), 5)} />
        ) : null}
      </svg>
      <div style={{ position: "absolute", left: t.back ? (t.lost ? (LX + RX) / 2 + 30 : LX + 30) : LX + 30, top: t.y - 52, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: dead ? RED : t.color, opacity: show, whiteSpace: "nowrap" }}>
        {dead ? "reply lost" : t.label}
      </div>
      {dead ? <Sfx name="buzz" at={tripEnd(t)} volume={0.25} /> : null}
      {!t.back ? <Sfx name="whoosh" at={t.launch} volume={0.15} /> : null}
    </>
  );
};

const TimeoutMark: React.FC<{ at: number; y: number }> = ({ at, y }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 70, top: y - 22, display: "flex", alignItems: "center", gap: 8, opacity: fade(frame, at - 4) }}>
      <Clock />
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: LIGHT }}>timeout</div>
    </div>
  );
};

// ---- 2. Timeline: call sent, timed out, order already created, reply lost, retry creates order #1042 ----------------

export const Timeline: React.FC = () => {
  const frame = useCurrentFrame();
  const timeout = Math.max(useCue("timeout", 50), FLIGHT + 10); // the status turns only after the row has landed
  const created = useCue("created", 100);
  const lost = useCue("lost", 150);
  const again = useCue("again", 220);
  const call: Trip = { launch: 4, y: Y.call, color: LIGHT, label: `create order · ${KEY}` };
  const reply: Trip = { launch: lost - FLIGHT / 2, y: Y.reply, back: true, lost: true, color: LIGHT, label: `${IDS[0]} created` };
  const retryLaunch = Math.max(lost + 14, again - FLIGHT);
  const retry: Trip = { launch: retryLaunch, y: Y.retry, color: LIGHT, label: `retry · ${KEY}` };
  const status: Status = frame < timeout ? "placing" : frame < retryLaunch ? "timeout" : frame < tripEnd(retry) + 12 ? "retrying" : "placed";
  const since = status === "placing" ? 0 : status === "timeout" ? timeout : status === "retrying" ? retryLaunch : tripEnd(retry) + 12;
  return (
    <>
      <Header text="What the timeout hid" />
      <Checkout status={status} since={since} />
      <Orders
        rows={[
          { at: tripEnd(call), tone: "plain", id: IDS[0], pulse: created },
          { at: tripEnd(retry), tone: "bad", id: IDS[1] },
        ]}
      />
      <Lifelines />
      <Arrow t={call} />
      <TimeoutMark at={timeout} y={Y.reply + 50} />
      <Arrow t={reply} />
      <Arrow t={retry} />
      <div style={{ position: "absolute", left: 70, top: 1110, fontFamily: SANS, fontWeight: 800, fontSize: 52, color: RED, opacity: fade(frame, tripEnd(retry) + 8) }}>
        1 payment, 2 orders
      </div>
    </>
  );
};

// ---- 5. The key: the same checkout id on every attempt; the repeat finds order #1041 ------------------------------

export const Key: React.FC = () => {
  const frame = useCurrentFrame();
  const key = useCue("key", 20);
  const id = useCue("id", 60);
  const same = useCue("same", 150);
  const zero = useCue("zero", 200);
  const call: Trip = { launch: id - 6, y: Y.call, color: GREEN, label: `create order · key ${KEY}` };
  const lost: Trip = { launch: tripEnd(call) + 2, y: Y.reply, back: true, lost: true, color: LIGHT, label: "" };
  const retryLaunch = Math.max(tripEnd(lost) + 8, same - FLIGHT);
  const retry: Trip = { launch: retryLaunch, y: Y.retry, color: GREEN, label: `retry · key ${KEY}` };
  const found = tripEnd(retry);
  const status: Status = frame < tripEnd(lost) ? "placing" : frame < retryLaunch ? "timeout" : frame < found + 10 ? "retrying" : "placed";
  const since = status === "placing" ? 0 : status === "timeout" ? tripEnd(lost) : status === "retrying" ? retryLaunch : found + 10;
  return (
    <>
      <Header text="Same key, same order" />
      <Checkout status={status} since={since} />
      <Orders rows={[{ at: tripEnd(call), tone: "good", id: IDS[0], pulse: found }]} />
      <div style={{ position: "absolute", left: 580, top: 560, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: GREEN, opacity: fade(frame, found) }}>
        found {IDS[0]} · no new row
      </div>
      <Lifelines />
      <Arrow t={call} />
      <Arrow t={lost} />
      <Arrow t={retry} />
      <div style={{ position: "absolute", left: 70, top: 1100, opacity: fade(frame, key - 4) }}>
        <div style={{ display: "inline-block", padding: "8px 18px", borderRadius: 12, border: `4px solid ${GREEN}`, background: GREEN_BG, fontFamily: MONO, fontWeight: 700, fontSize: 34, color: FG }}>Idempotency-Key</div>
        <div style={{ marginTop: 10, fontFamily: MONO, fontWeight: 700, fontSize: 32, color: FG, opacity: fade(frame, id - 4) }}>= checkout id</div>
        <Sfx name="reveal" at={key} volume={0.3} />
      </div>
      <div style={{ position: "absolute", left: 600, top: 1080, display: "flex", alignItems: "baseline", gap: 18, opacity: fade(frame, zero - 4) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: FG, width: 150, lineHeight: 1.1 }}>double orders</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 150, lineHeight: 1, color: GREEN }}>{data.duplicates_with_key}</div>
        <Sfx name="stamp" at={zero} volume={0.35} />
      </div>
    </>
  );
};

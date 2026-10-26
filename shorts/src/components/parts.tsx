import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FG, GOLD, GRAY, GREEN, MONO, MUTED, SANS } from "../theme";
import { Sfx } from "./Shell";

// 0 -> 1 spring that starts at frame `at` of the scene.
export const useSpring = (at: number, stiffness = 170) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 14, stiffness } });
};

// Draws a line from 0 to 100% between `at` and `at + frames`.
export const useDraw = (at: number, frames = 12) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

export const Title: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => {
  const line = useSpring(4);
  return (
    <div style={{ position: "absolute", top: 220, left: 80, right: 80 }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 72, color: FG, lineHeight: 1.05 }}>{text}</div>
      <div style={{ marginTop: 22, width: 120 * line, height: 8, borderRadius: 4, background: GOLD }} />
      {sub ? <div style={{ marginTop: 22, fontFamily: MONO, fontSize: 32, color: MUTED }}>{sub}</div> : null}
    </div>
  );
};

// Scales and fades children in at `at`, with an optional effect.
export const Pop: React.FC<{ at: number; sfx?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, sfx, style, children }) => {
  const p = useSpring(at);
  return (
    <div style={{ position: "absolute", opacity: Math.min(1, p * 1.5), transform: `scale(${0.7 + 0.3 * p})`, ...style }}>
      {sfx ? <Sfx name={sfx} at={at} volume={0.35} /> : null}
      {children}
    </div>
  );
};

export const Box: React.FC<{ label: string; color?: string; fill?: string; style?: React.CSSProperties }> = ({ label, color = FG, fill, style }) => (
  <div
    style={{
      position: "absolute",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: `4px solid ${color}`,
      borderRadius: 14,
      background: fill ?? "transparent",
      color,
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: 44,
      ...style,
    }}
  >
    {label}
  </div>
);

// A labelled bar that grows from `at` while its number counts up; `early` shows the label from the scene start.
export const Bar: React.FC<{ at: number; y: number; label: string; value: number; max: number; color: string; width?: number; dim?: boolean; early?: boolean }> = ({
  at,
  y,
  label,
  value,
  max,
  color,
  width = 560,
  dim,
  early,
}) => {
  const p = useSpring(at, 120);
  return (
    <div style={{ position: "absolute", left: 80, top: y, opacity: (early ? 1 : Math.min(1, p * 2)) * (dim ? 0.45 : 1) }}>
      <Sfx name="reveal" at={at} volume={0.35} />
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: FG }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
        <div style={{ width: (value / max) * width * p, height: 76, background: color, borderRadius: 14 }} />
        <div style={{ marginLeft: 24, fontFamily: MONO, fontWeight: 800, fontSize: 52, color: FG }}>{Math.round(value * Math.min(1, p))}</div>
      </div>
    </div>
  );
};

// A verdict stamp that slams down with a thud. Solid only for silent failures.
export const Stamp: React.FC<{ at: number; label: string; color: string; solid?: boolean; style?: React.CSSProperties; sfx?: string }> = ({
  at,
  label,
  color,
  solid,
  style,
  sfx = "stamp",
}) => {
  const frame = useCurrentFrame();
  const p = useSpring(at, 260);
  const shake = frame >= at && frame < at + 6 ? Math.sin((frame - at) * 3) * 6 * (1 - (frame - at) / 6) : 0;
  return (
    <div style={{ position: "absolute", opacity: frame < at ? 0 : 1, transform: `translateX(${shake}px) scale(${1.8 - 0.8 * p}) rotate(-4deg)`, ...style }}>
      <Sfx name={sfx} at={at} />
      <div
        style={{
          padding: "12px 26px",
          border: solid ? "none" : `5px solid ${color}`,
          background: solid ? color : "transparent",
          color: solid ? FG : color,
          borderRadius: 10,
          fontFamily: MONO,
          fontWeight: 800,
          fontSize: 36,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Mark: React.FC<{ ok: boolean; color?: string; size?: number }> = ({ ok, color, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    {ok ? (
      <path d="M12 34 L26 48 L52 18" fill="none" stroke={color ?? GREEN} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M16 16 L48 48 M48 16 L16 48" fill="none" stroke={color ?? GRAY} strokeWidth={9} strokeLinecap="round" />
    )}
  </svg>
);

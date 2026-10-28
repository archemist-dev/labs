import React from "react";
import { useCurrentFrame } from "remotion";
import { BG, FG, GRAY, LIGHT } from "../theme";

// Production: the deadpan server rack that delivers verdicts. Only on screen when his line is recorded.
// mood "deadpan": half-closed eyes, flat mouth. "pleased": the same eyes, a small smug smile.
export const ProductionFace: React.FC<{ mood?: "deadpan" | "pleased"; size?: number }> = ({ mood = "deadpan", size = 420 }) => {
  const frame = useCurrentFrame();
  const blink = frame % 70 < 4 ? 1 : 0;
  const lid = 26 + blink * 14;
  return (
    <svg width={size} height={(size * 480) / 420} viewBox="0 0 420 480">
      <rect x={20} y={20} width={380} height={440} rx={36} fill="#262a30" stroke={LIGHT} strokeWidth={6} />
      {[330, 370, 410].map((y) => (
        <line key={y} x1={70} y1={y} x2={350} y2={y} stroke={GRAY} strokeWidth={6} strokeLinecap="round" />
      ))}
      {[140, 280].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={160} r={34} fill={FG} />
          <circle cx={cx} cy={170} r={14} fill={BG} />
          <rect x={cx - 40} y={120} width={80} height={lid} fill="#262a30" />
          <line x1={cx - 38} y1={120 + lid} x2={cx + 38} y2={120 + lid} stroke={LIGHT} strokeWidth={6} strokeLinecap="round" />
        </g>
      ))}
      {mood === "pleased" ? (
        <path d="M160 250 Q215 280 270 244" fill="none" stroke={LIGHT} strokeWidth={8} strokeLinecap="round" />
      ) : (
        <line x1={160} y1={255} x2={260} y2={255} stroke={LIGHT} strokeWidth={8} strokeLinecap="round" />
      )}
    </svg>
  );
};

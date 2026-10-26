import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "../lib/track";
import { FG, MUTED, SANS } from "../theme";

const MAX_WORDS = 3;

// Word-by-word captions: up to three words at a time, a new chunk after each sentence break.
export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chunks = useMemo(() => {
    const out: Word[][] = [];
    let cur: Word[] = [];
    for (const w of words) {
      cur.push(w);
      if (cur.length === MAX_WORDS || /[.?!,:]$/.test(w.text)) {
        out.push(cur);
        cur = [];
      }
    }
    if (cur.length) out.push(cur);
    return out;
  }, [words]);
  const chunk = chunks.find((c, i) => t >= c[0].start && t < Math.min(c[c.length - 1].end + 0.5, chunks[i + 1]?.[0].start ?? Infinity));
  if (!chunk) return null;
  return (
    <div style={{ position: "absolute", top: 1330, left: 60, right: 60, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 70, lineHeight: 1.15 }}>
      {chunk.map((w, i) => {
        const said = t >= w.start;
        const active = said && (i === chunk.length - 1 || t < chunk[i + 1].start);
        const pop = spring({ frame: frame - Math.round(w.start * fps), fps, config: { damping: 12, stiffness: 220 }, durationInFrames: 8 });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 18px",
              color: said ? FG : MUTED,
              opacity: said ? 1 : 0.5,
              transform: `scale(${active ? 1 + 0.06 * pop : 1})`,
              textShadow: "0 4px 18px rgba(0,0,0,.7)",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

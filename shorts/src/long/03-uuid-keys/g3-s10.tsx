// Scene 10: inside a UUIDv7. 2D: the 128-bit layout (v7 against v4), then one real-looking ID decoded.
import React from "react";
import { FG, GRAYC, GREEN, LIGHT, MONO, MUTED, Chip, SANS, Scene, Show, Title, clamp, lerp, mix, ramp, useSec } from "./g3-kit";

const ID1 = "01a17e84-e100-71c4-9e2b-5f8a1d3c6e90"; // 01a17e84e100 ms = 2026-10-27 18:00:00 UTC
const ID2 = "01a17e84-e4e8-7a02-8d41-3c7b9e50a2f6"; // one second later (+1000 ms = 0x3e8)
const IDV4 = "9b2f6c1e-4a7d-4e83-b5c0-1d9f7a3e8c42";
const FS = 88;
const CW = FS * 0.6;
const X0 = 330;

// A string of mono characters; index 0-12 are the time, 14 is the version.
const Id: React.FC<{ id: string; top: number; t: number; at: number; timeAt?: number; verAt?: number; restAt?: number; v4?: boolean }> = ({ id, top, t, at, timeAt, verAt, restAt, v4 }) => {
  const a = ramp(t, at, 0.6);
  if (a <= 0.002) return null;
  const time = timeAt === undefined ? 0 : ramp(t, timeAt, 0.5);
  const ver = verAt === undefined ? 0 : ramp(t, verAt, 0.4);
  const rest = restAt === undefined ? 0 : ramp(t, restAt, 0.6);
  return (
    <div style={{ position: "absolute", left: X0, top, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
      {ver > 0 ? (
        <div style={{ position: "absolute", left: 14 * CW - 6, top: -6, width: CW + 12, height: FS * 1.3, borderRadius: 12, border: `5px solid ${FG}`, opacity: ver }} />
      ) : null}
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: FS, lineHeight: 1.2, whiteSpace: "pre", letterSpacing: 0 }}>
        {id.split("").map((c, i) => {
          let color = FG;
          if (v4) color = i === 14 ? FG : MUTED;
          else if (i <= 12) color = mix(FG, GREEN, time);
          else if (i === 14) color = FG;
          else color = mix(FG, MUTED, rest);
          return (
            <span key={i} style={{ color }}>
              {c}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const BW = 2200;
const BX = 180;
type Seg = { bits: number; color: string; label?: string; dark?: boolean };
const Bar: React.FC<{ top: number; t: number; at: number; segs: Seg[]; pulse?: number }> = ({ top, t, at, segs, pulse = 0 }) => {
  let x = BX;
  return (
    <>
      {segs.map((s, i) => {
        const w = (s.bits / 128) * BW;
        const a = ramp(t, at + i * 0.18, 0.5);
        const left = x;
        x += w;
        return (
          <div key={i} style={{ position: "absolute", left, top, width: w - 5, height: 120, background: s.color, borderRadius: 14, opacity: a, transform: `scaleY(${0.6 + 0.4 * a})`, transformOrigin: "bottom", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 800, fontSize: 52, color: s.dark ? "#1b1d21" : FG, boxShadow: s.color === GREEN && pulse > 0 ? `0 0 ${70 * pulse}px ${GREEN}` : undefined }}>
            {s.label}
          </div>
        );
      })}
    </>
  );
};

export const Scene10: React.FC = () => {
  const t = useSec();
  const bars = 1 - ramp(t, 8.2, 0.6); // bars give way to the example ID
  const pulse = Math.max(0, Math.sin(Math.min(1, Math.max(0, (t - 7.1) / 1.0)) * Math.PI));
  const dec = ramp(t, 11.1, 0.5);
  return (
    <Scene id="10">
      <Title t={t} text="Inside a UUIDv7" />

      {/* the 128-bit layout, v7 against v4 */}
      <div style={{ position: "absolute", inset: 0, opacity: bars }}>
        <Show t={t} at={0.9} style={{ left: BX, top: 300 }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: GREEN }}>UUIDv7</span>
        </Show>
        <Bar top={400} t={t} at={0.9} pulse={pulse} segs={[{ bits: 48, color: GREEN, label: "48 bits · time", dark: true }, { bits: 4, color: FG, label: "4", dark: true }, { bits: 2, color: LIGHT }, { bits: 74, color: GRAYC, label: "74 bits · random" }]} />
        <Show t={t} at={2.2} style={{ left: BX, top: 545 }}>
          <div style={{ width: BW - 5, height: 8, borderRadius: 4, background: MUTED }} />
          <div style={{ marginTop: 12, fontFamily: MONO, fontWeight: 800, fontSize: 64, color: FG }}>
            128 bits <span style={{ fontFamily: SANS, fontWeight: 700, color: MUTED, fontSize: 56, opacity: ramp(t, 4.1, 0.5) }}> · still unique without coordination</span>
          </div>
        </Show>
        <Show t={t} at={6.4} style={{ left: BX, top: 780 }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: LIGHT }}>UUIDv4</span>
        </Show>
        <Bar top={880} t={t} at={6.4} segs={[{ bits: 48, color: GRAYC, label: "random" }, { bits: 4, color: FG, label: "4", dark: true }, { bits: 2, color: LIGHT }, { bits: 74, color: GRAYC, label: "random" }]} />
        <Show t={t} at={7.2} style={{ left: BX, top: 1030 }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 56, color: MUTED }}>no time: every bit is random, except the version</span>
        </Show>
      </div>

      {/* one ID, decoded */}
      <Show t={t} at={8.5} style={{ left: X0, top: 250 }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED }}>UUIDv7, one example</span>
      </Show>
      <Id id={ID1} top={320} t={t} at={8.6} timeAt={8.8} verAt={12.9} restAt={14.4} />
      {/* time bracket: the first 12 hex digits */}
      <Show t={t} at={8.9} style={{ left: X0, top: 440 }}>
        <div style={{ width: CW * 13 - 8, height: 8, borderRadius: 4, background: GREEN }} />
        <div style={{ marginTop: 6, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: GREEN, opacity: ramp(t, 10.2, 0.4) }}>milliseconds since 1970</div>
      </Show>
      <Show t={t} at={12.9} style={{ left: X0 + 14 * CW - 20, top: 440 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: FG }}>version</div>
      </Show>
      <Show t={t} at={14.4} style={{ left: X0 + 16 * CW, top: 440 }}>
        <div style={{ width: CW * 20 - 8, height: 8, borderRadius: 4, background: MUTED }} />
        <div style={{ marginTop: 6, width: CW * 20, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED }}>random</div>
      </Show>
      {dec > 0 ? (
        <div style={{ position: "absolute", left: X0, top: 560, opacity: dec, transform: `translateY(${lerp(16, 0, dec)}px)`, fontFamily: MONO, fontWeight: 800, fontSize: 72, color: GREEN }}>
          → 2026-10-27 18:00 UTC
        </div>
      ) : null}

      {/* a second later sorts after */}
      <Show t={t} at={16.0} style={{ left: X0, top: 730 }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED }}>a second later </span>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, color: GREEN, opacity: ramp(t, 17.6, 0.4) }}> sorts after ↓</span>
      </Show>
      <Id id={ID2} top={790} t={t} at={16.0} timeAt={16.0} verAt={99} restAt={16.2} />

      {/* v4 beneath: only the 4 is fixed */}
      <Show t={t} at={14.9} style={{ left: X0, top: 960 }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED }}>UUIDv4: only the 4 is fixed</span>
      </Show>
      <Id id={IDV4} top={1020} t={t} at={14.9} v4 />

      {/* how to make one */}
      <Show t={t} at={19.3} style={{ left: X0, top: 1240 }}>
        <Chip text="Postgres 18:  uuidv7()" mono color={GREEN} size={56} />
      </Show>
      <Show t={t} at={23.9} style={{ left: X0 + 1050, top: 1240 }}>
        <Chip text="older versions: make it in the app" color={LIGHT} size={56} />
      </Show>
    </Scene>
  );
};
export const S10_FRAMES = 802;
void clamp;

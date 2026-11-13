// Scene 11: the cheap fixes first (56.7 s). Intro, fix 1 (fillfactor 70, 3D pages), fix 2 (bigint + random public ID,
// 3D index pages reused from the week 3 prototype), fix 3 (more memory, a 2D sketch). Numbers: lab run 1/run 2.
import React from "react";
import { Chip, FG, GREEN, GRAYC, LIGHT, MONO, MUTED, Num, RED, SANS, Scene, Show, Sfx, Stage, Title, clamp, easeIO, lerp, ramp, useSec } from "./g3-kit";
import { PageRow3 } from "../../shorts/03-uuid-keys/ProtoB";
import data from "../../shorts/03-uuid-keys/data.json";

// ---- Part A: pages left 30% empty (fillfactor 70), random keys split them anyway ----------------------------------

const PH = 1.05;
const PITCH = 1.05;
const FILL0 = 0.7;
const KEY1 = 15.7; // "Random inserts split full pages in half anyway" (15.1 on)
const KEY2 = 16.7;
const TARGET = 4;

const FfPages: React.FC<{ t: number }> = ({ t }) => {
  const appear = ramp(t, 5.9, 0.7);
  const split = ramp(t, KEY2 + 0.5, 0.6);
  const slot = (i: number) => (i <= TARGET ? i : i + split) - 3.5;
  const pages = Array.from({ length: 7 }, (_, i) => i);
  const fillOf = (i: number) => {
    if (i !== TARGET) return FILL0;
    if (t < KEY1 + 0.5) return FILL0;
    if (t < KEY2 + 0.5) return lerp(FILL0, 0.9, ramp(t, KEY1 + 0.5, 0.3));
    return lerp(1.1, 0.55, split) > 1 ? 1 : lerp(1.1, 0.55, split);
  };
  const keyDrop = (t0: number) => {
    const k = Math.min(1, Math.max(0, (t - t0) / 0.7));
    return k;
  };
  return (
    <group scale={[appear + 0.001, appear + 0.001, appear + 0.001]}>
      {pages.map((i) => {
        const x = slot(i) * PITCH;
        const fill = fillOf(i);
        const hot = i === TARGET;
        const w = PITCH * 0.78;
        const splitting = hot && t > KEY2 + 0.5 ? 1 - split * 0.5 : 1;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, PH / 2, 0]}>
              <boxGeometry args={[w, PH, 0.7]} />
              <meshStandardMaterial color="#9aa1ab" transparent opacity={0.17} roughness={0.1} metalness={0.2} emissive={hot && t > KEY2 + 0.4 ? RED : "#000000"} emissiveIntensity={hot && t > KEY2 + 0.4 ? 0.5 * (1 - split) : 0} />
            </mesh>
            <mesh position={[0, (PH * Math.min(fill, 0.97) * splitting) / 2, 0]}>
              <boxGeometry args={[w * 0.86, Math.max(0.01, PH * Math.min(fill, 0.97) * splitting), 0.56]} />
              <meshStandardMaterial color={LIGHT} emissive={LIGHT} emissiveIntensity={0.15} transparent opacity={0.85} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
      {/* the page that splits: its new half */}
      <group position={[slot(TARGET) * PITCH + PITCH * split, 0, 0]} scale={[split + 0.001, split + 0.001, split + 0.001]}>
        <mesh position={[0, PH / 2, 0]}>
          <boxGeometry args={[PITCH * 0.78, PH, 0.7]} />
          <meshStandardMaterial color="#9aa1ab" transparent opacity={0.17} roughness={0.1} />
        </mesh>
        <mesh position={[0, (PH * 0.55) / 2, 0]}>
          <boxGeometry args={[PITCH * 0.78 * 0.86, PH * 0.55, 0.56]} />
          <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.3} transparent opacity={0.85} />
        </mesh>
      </group>
      {/* random keys falling on the same page */}
      {[KEY1, KEY2].map((k0, n) => {
        const d = keyDrop(k0);
        if (d <= 0 || d >= 1) return null;
        const y = PH + 1.6 - easeIO(d) * 1.4;
        return (
          <mesh key={n} position={[slot(TARGET) * PITCH, y, 0]} rotation={[0, d * 0.8, 0]}>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
            <meshStandardMaterial color={FG} emissive={RED} emissiveIntensity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---- Part C: the cliff sketch and the memory column -------------------------------------------------------------

const CW = 1320;
const CH = 640;
const RATE = (data.v4.rate as number[]).map((r) => r / data.v4.rate[0]);
const curve = (sx: number) => RATE.map((y, i) => `${(i / 9) * CW * 0.62 * sx},${CH - 30 - y * (CH - 80)}`).join(" ");

const BLOCKS = [
  { name: "orders", h: 190 },
  { name: "order items", h: 170 },
  { name: "status history", h: 200 },
  { name: "events", h: 130 },
  { name: "logs", h: 110 },
];
const BLOCK_AT = [47.4, 50.0, 51.0, 52.1, 52.9];

const Sketch: React.FC<{ t: number }> = ({ t }) => {
  const a = ramp(t, 36.9, 0.6);
  const bigger = ramp(t, 38.7, 1.6);
  const out = ramp(t, 40.5, 0.8); // dashed stretched curve
  const sooner = ramp(t, 53.6, 1.2);
  const sx = lerp(1, 0.68, sooner);
  const memBase = 480;
  const memH = lerp(memBase, 770, bigger);
  // single index block (43.3 on), then the shared blocks (47.4 on)
  const idx = ramp(t, 43.6, 2.2);
  const idxFade = 1 - ramp(t, 47.2, 0.4);
  let used = 0;
  return (
    <>
      <div style={{ position: "absolute", left: 180, top: 340, opacity: a }}>
        <svg width={CW + 40} height={CH + 40} style={{ overflow: "visible" }}>
          <line x1={0} y1={CH - 30} x2={CW} y2={CH - 30} stroke={MUTED} strokeWidth={5} />
          <line x1={0} y1={20} x2={0} y2={CH - 30} stroke={MUTED} strokeWidth={5} />
          <text x={CW} y={CH + 22} fill={MUTED} fontSize={44} fontFamily={SANS} fontWeight={700} textAnchor="end">
            rows in the table →
          </text>
          <text x={14} y={12} fill={MUTED} fontSize={44} fontFamily={SANS} fontWeight={700}>
            inserts per second
          </text>
          {/* stretched curve: the cliff slides right */}
          {out > 0 ? <polyline points={curve(1.6)} fill="none" stroke={LIGHT} strokeWidth={8} strokeDasharray="22 16" opacity={out} strokeLinecap="round" /> : null}
          {/* the measured shape (UUIDv4 run) */}
          <polyline points={curve(sx)} fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={CW * 0.62 * sx} cy={CH - 30 - RATE[9] * (CH - 80)} r={16} fill={RED} />
          {out > 0.9 && t < 53.6 ? <circle cx={CW * 0.62 * 1.6} cy={CH - 30 - RATE[9] * (CH - 80)} r={16} fill={LIGHT} opacity={ramp(t, 42.1, 0.4)} /> : null}
        </svg>
        <div style={{ position: "absolute", left: 0, top: CH + 36, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: MUTED, opacity: 0.9 }}>
          shape from the UUIDv4 run · the shift is a sketch, not measured
        </div>
        <Show t={t} at={40.5} until={43.0} style={{ left: 420, top: 100, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: LIGHT }}>more memory: cliff moves out</span>
        </Show>
        <Show t={t} at={42.1} until={43.0} style={{ left: 420, top: 180, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, color: RED }}>…and it's still there</span>
        </Show>
        <Show t={t} at={53.8} style={{ left: 420, top: 100, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 60, color: RED }}>shared memory: it comes sooner ←</span>
        </Show>
      </div>

      {/* the memory column */}
      <div style={{ position: "absolute", left: 1760, top: 1180 - memH, width: 420, height: memH, border: `6px solid ${MUTED}`, borderRadius: 16, opacity: a }}>
        <div style={{ position: "absolute", bottom: -72, left: 0, fontFamily: SANS, fontWeight: 800, fontSize: 52, color: MUTED }}>MEMORY</div>
        <div style={{ position: "absolute", bottom: -132, left: 0, whiteSpace: "nowrap", fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT, opacity: bigger }}>bigger instance</div>
        {idx > 0 && idxFade > 0 ? (
          <div style={{ position: "absolute", left: 18, right: 18, bottom: 0, height: 840 * idx, background: idx * 840 > memH ? RED : GRAYC, borderRadius: 10, opacity: idxFade, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 12, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>
            index
          </div>
        ) : null}
        {BLOCKS.map((b, i) => {
          const r = ramp(t, BLOCK_AT[i], 0.6);
          const base = used;
          used += b.h * r;
          if (r <= 0) return null;
          const over = base + b.h * r > memH;
          return (
            <div key={b.name} style={{ position: "absolute", left: 18, right: 18, bottom: base + 4 * i, height: b.h * r, background: over ? RED : mix2(i), borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG, overflow: "hidden" }}>
              {r > 0.7 ? b.name : ""}
            </div>
          );
        })}
      </div>
    </>
  );
};
const mix2 = (i: number) => ["#5c6370", "#6b7280", "#7b8494", "#8a93a3", "#9aa1ab"][i % 5];

// ---- the scene -------------------------------------------------------------------------------------------------

export const Scene11: React.FC = () => {
  const t = useSec();
  const aOn = t >= 5.4 && t < 18.5;
  const bOn = t >= 18.0 && t < 37.0;
  const aOp = ramp(t, 5.6, 0.6) * (1 - ramp(t, 17.9, 0.5));
  const bOp = ramp(t, 18.6, 0.6) * (1 - ramp(t, 36.4, 0.5));
  const colWin = ramp(t, 30.0, 0.5);
  return (
    <Scene id="11">
      {aOn ? (
        <Stage pos={[1.4, 6.2, 12.5]} look={[2.5, 0.5, 0]} fov={36} opacity={aOp}>
          <FfPages t={t} />
        </Stage>
      ) : null}
      {bOn ? (
        <Stage pos={[1.3, 7.4, 12.5]} look={[1.4, 0.4, 0.2]} fov={36} opacity={bOp}>
          <group scale={[ramp(t, 19.0, 0.6) + 0.001, ramp(t, 19.0, 0.6) + 0.001, ramp(t, 19.0, 0.6) + 0.001]}>
            <PageRow3 k="v7" z={-1.9} start={Math.round(19.6 * 30)} />
          </group>
          <group scale={[ramp(t, 20.7, 0.6) + 0.001, ramp(t, 20.7, 0.6) + 0.001, ramp(t, 20.7, 0.6) + 0.001]}>
            <PageRow3 k="v4" z={1.9} start={Math.round(21.4 * 30)} />
          </group>
        </Stage>
      ) : null}
      <Title t={t} text="Cheap fixes first" until={5.0} />
      <Show t={t} at={3.6} until={5.0} style={{ left: 120, top: 420 }}>
        <Chip text="1 · fillfactor 70" mono color={LIGHT} size={64} />
      </Show>
      <Show t={t} at={4.0} until={5.0} style={{ left: 120, top: 600 }}>
        <Chip text="2 · bigint key + random public ID" color={LIGHT} size={64} />
      </Show>

      {/* fix 1 */}
      <Title t={t} text="Fix 1 · leave room on each page" at={5.1} until={17.9} />
      <Show t={t} at={7.4} until={17.8} style={{ left: 330, top: 930 }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, color: LIGHT }}>fillfactor 70: pages start 30% empty</span>
      </Show>
      <Show t={t} at={11.0} until={14.4} style={{ left: 330, top: 1030 }}>
        <Chip text="applies on: index build" color={LIGHT} size={48} />
      </Show>
      <Show t={t} at={13.1} until={14.4} style={{ left: 930, top: 1030 }}>
        <Chip text="growing at the right edge" color={LIGHT} size={48} />
      </Show>
      <Show t={t} at={15.4} until={17.8} style={{ left: 330, top: 1130 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: RED }}>random key: the page splits anyway</span>
      </Show>
      <Show t={t} at={9.2} until={17.8} style={{ left: 1750, top: 360 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: LIGHT }}>UUIDv4</div>
        <Num v="391" unit="s" color={LIGHT} size={110} />
        <div style={{ marginTop: 40, fontFamily: SANS, fontWeight: 800, fontSize: 56, color: RED }}>UUIDv4, fillfactor 70</div>
        <Num v="514" unit="s" color={RED} size={110} />
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 46, color: MUTED }}>run 2: 395 s</div>
      </Show>
      <Show t={t} at={9.4} until={17.8} style={{ left: 1750, top: 1000 }}>
        <div style={{ display: "inline-block", fontFamily: SANS, fontWeight: 800, fontSize: 84, color: RED, border: `8px solid ${RED}`, borderRadius: 20, padding: "6px 36px", transform: "rotate(-4deg)" }}>NO HELP</div>
      </Show>
      <Sfx name="stamp" at={9.4} volume={0.4} />

      {/* fix 2 */}
      <Title t={t} text="Fix 2 · bigint key + random public ID" at={18.3} until={36.5} />
      <Show t={t} at={19.0} until={36.4} style={{ left: 520, top: 285 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: GREEN }}>bigint primary key</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: GREEN }}>→ last page</div>
      </Show>
      <Show t={t} at={22.5} until={36.4} style={{ left: 1180, top: 290 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: GREEN }}>✓ tidy</span>
      </Show>
      <Show t={t} at={20.7} until={36.4} style={{ left: 520, top: 985 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: RED }}>public_id (random)</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: RED, opacity: ramp(t, 24.4, 0.4) }}>needs a unique index → any page</div>
      </Show>
      <Show t={t} at={30.0} until={36.4} style={{ left: 1750, top: 360 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: RED }}>bigint + public ID</div>
        <Num v="410" unit="s" color={RED} size={110} />
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 46, color: LIGHT, opacity: ramp(t, 31.5, 0.4) }}>plain UUIDv4: 391 s</div>
      </Show>
      <Show t={t} at={30.9} until={36.4} style={{ left: 1750, top: 760 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, color: MUTED }}>write-ahead log per row</div>
        {[
          { l: "bigint", v: 214, c: LIGHT },
          { l: "UUIDv4", v: 269, c: LIGHT },
          { l: "bigint + public ID", v: 340, c: RED },
        ].map((r, i) => (
          <div key={r.l} style={{ marginTop: 18, opacity: ramp(t, 31.0 + i * 0.35, 0.4) }}>
            <div style={{ width: (r.v / 340) * 640 * ramp(t, 31.0 + i * 0.35, 0.8), height: 38, borderRadius: 8, background: r.c }} />
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: r.c === RED ? RED : FG }}>
              {r.v} B <span style={{ fontFamily: SANS, color: MUTED }}>{r.l}</span>
            </div>
          </div>
        ))}
      </Show>
      <Show t={t} at={33.0} until={36.4} style={{ left: 520, top: 1175 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 60, color: RED }}>the problem follows the random column</span>
      </Show>
      <Show t={t} at={35.3} until={36.4} style={{ left: 520, top: 1265 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 60, color: GREEN }}>not the primary key</span>
      </Show>

      {/* fix 3 */}
      <Title t={t} text="And more memory?" at={36.9} />
      <Sketch t={t} />
      <div style={{ display: "none" }}>{colWin}</div>
    </Scene>
  );
};
export const S11_FRAMES = 1726;
void clamp;

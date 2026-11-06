// Week 3 Short "Where the next row lands" in 3D (three.js via @remotion/three), the same look as "The 14x cliff".
// Every number comes from data.json (03-uuid-keys/video_data.py, run 1 of the lab log): 14x, leaf density 70% vs 90%,
// primary key index 389 vs 301 MB (29% bigger). Text stays flat HTML over the 3D scene; labels only, no sentences.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Pop, Stamp, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { BG, FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";
import { LANE_LOOK, laneCam, PageRow3, PSPAN, PX0 } from "./ProtoB";
import { Canvas, Db, Header, Rack } from "./Short1";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const shadow = "0 4px 18px #000";
const last = (k: "v7" | "v4") => data[k].rate[data[k].rate.length - 1];
const X14 = Math.round(last("v7") / last("v4")); // 14
const FILL = { v7: Math.round(data.leaf_density.v7), v4: Math.round(data.leaf_density.v4) }; // 90, 70
const BIGGER = Math.round((data.pkey_mb.v4 / data.pkey_mb.v7 - 1) * 100); // 29

const LaneLabel: React.FC<{ top: number; label: string; color: string; children?: React.ReactNode }> = ({ top, label, color, children }) => (
  <div style={{ position: "absolute", left: 70, top, display: "flex", alignItems: "baseline", gap: 20 }}>
    <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color, textShadow: shadow }}>{label}</span>
    {children}
  </div>
);

// ---- 1. Same size, same uniqueness: why 14x slower? --------------------------------------------------------------

const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const unique = useCue("unique", 30);
  const x14 = useCue("x14", 80);
  const pop = useSpring(x14 - 3, 200);
  const cells = (z: number, color: string, red: boolean) =>
    Array.from({ length: 16 }, (_, i) => {
      const p = interpolate(frame, [2 + i * 1.2, 10 + i * 1.2], [0.001, 1], clamp);
      const pulse = red && frame >= x14 ? 0.25 + 0.3 * Math.abs(Math.sin((frame - x14) * 0.12)) : 0.3;
      return (
        <mesh key={`${z}-${i}`} position={[-3.1 + i * 0.29, 0.2, z]} scale={[p, p, p]}>
          <boxGeometry args={[0.24, 0.3, 0.7]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={pulse} roughness={0.35} />
        </mesh>
      );
    });
  return (
    <>
      <Canvas pos={laneCam(360 - frame * 0.4)} look={LANE_LOOK}>
        {cells(-1.9, GREEN, false)}
        {cells(1.9, RED, true)}
      </Canvas>
      <Header text="Same 16 bytes" />
      {[
        { top: 440, label: "UUIDv7", color: GREEN },
        { top: 880, label: "UUIDv4", color: RED },
      ].map((l) => (
        <LaneLabel key={l.label} top={l.top} label={l.label} color={l.color}>
          <span style={{ fontFamily: MONO, fontSize: 36, color: MUTED }}>16 bytes</span>
          <span style={{ fontFamily: MONO, fontSize: 36, color: LIGHT, opacity: interpolate(frame, [unique, unique + 8], [0, 1], clamp) }}>· unique</span>
        </LaneLabel>
      ))}
      {frame >= x14 - 3 ? (
        <div style={{ position: "absolute", left: 600, top: 520, transform: `scale(${0.4 + 0.6 * pop}) rotate(-4deg)`, opacity: Math.min(1, pop * 2), textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 130, lineHeight: 1, color: RED, textShadow: `0 0 40px ${RED}88` }}>{X14}x</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: RED, textShadow: shadow }}>slower inserts</div>
          <Sfx name="stamp" at={x14 - 3} />
        </div>
      ) : null}
    </>
  );
};

// ---- 2. It's where it lands: keys dropping into index pages ------------------------------------------------------

const Lands: React.FC = () => {
  const frame = useCurrentFrame();
  const id = useCue("id", 20);
  const lands = useCue("lands", 50);
  const a = interpolate(frame, [0, 200], [0.2, -0.04], clamp);
  const pos: [number, number, number] = [Math.sin(a) * 15, 10.5, Math.cos(a) * 15];
  const rule = interpolate(frame, [lands, lands + 8], [0, 1], clamp);
  return (
    <>
      <Canvas pos={pos} look={[0, 0.6, 0.4]}>
        <PageRow3 k="v7" z={-1.8} start={Math.max(2, id - 30)} />
        <PageRow3 k="v4" z={1.8} start={Math.max(2, id - 30)} />
      </Canvas>
      <Header text="Where it lands" sub="primary key index · pages" />
      {[
        { top: 430, label: "UUIDv7", color: GREEN, rule: "→ last page" },
        { top: 905, label: "UUIDv4", color: RED, rule: "→ any page" },
      ].map((r) => (
        <LaneLabel key={r.label} top={r.top} label={r.label} color={r.color}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT, opacity: rule, textShadow: shadow }}>{r.rule}</span>
        </LaneLabel>
      ))}
      <Sfx name="reveal" at={lands} volume={0.35} />
    </>
  );
};

// ---- 3. The story: random UUIDs were the right call, then the index outgrew memory -----------------------------

const MEM_X1 = 0.0; // the memory line on the index lane: pages right of it no longer fit
const N_PAGES = 11;

const Story: React.FC = () => {
  const frame = useCurrentFrame();
  const uuids = useCue("uuids", 30);
  const right = useCue("right", 80);
  const index = useCue("index", 140);
  const memory = useCue("memory", 165);
  // Upper lane: three services each make their own ID and send it to the database, no ID server needed.
  const svc = interpolate(frame, [4, 16], [0.001, 1], clamp);
  const flying = Array.from({ length: 9 }, (_, i) => {
    const t = ((frame - uuids - i * 9) % 54) / 54;
    return frame - uuids - i * 9 >= 0 ? t : -1;
  });
  // Lower lane: the index grows page by page past the memory line; pages beyond it sink to disk.
  const shown = interpolate(frame, [index - 4, memory + 20], [3, N_PAGES], clamp);
  const memOn = interpolate(frame, [index, index + 10], [0, 1], clamp);
  const over = interpolate(frame, [memory, memory + 14], [0, 1], clamp);
  return (
    <>
      <Canvas pos={laneCam(120 + frame * 0.3)} look={LANE_LOOK}>
        {[-3.0, -2.0, -1.0].map((x, i) => (
          <mesh key={x} position={[x, 0.4, -1.9]} scale={[svc, svc, svc]}>
            <boxGeometry args={[0.7, 0.8, 0.7]} />
            <meshStandardMaterial color={GRAY} emissive={LIGHT} emissiveIntensity={0.1 + 0.2 * (i % 2)} roughness={0.5} />
          </mesh>
        ))}
        {flying.map((t, i) =>
          t < 0 ? null : (
            <mesh key={i} position={[-3.0 + (i % 3) + (1.55 - (-3.0 + (i % 3))) * ease(t), 0.9 + Math.sin(t * Math.PI) * 0.9, -1.9]}>
              <boxGeometry args={[0.22, 0.22, 0.22]} />
              <meshStandardMaterial color={LIGHT} emissive={LIGHT} emissiveIntensity={0.6} />
            </mesh>
          ),
        )}
        <Db x={1.55} z={-1.9} color={frame >= right ? GREEN : LIGHT} glow={frame >= right ? 0.45 : 0.15} />
        {/* memory: a translucent green floor zone on the index lane */}
        <mesh position={[(-3.6 + MEM_X1) / 2, 0.02, 1.9]} scale={[1, memOn + 0.001, 1]}>
          <boxGeometry args={[MEM_X1 + 3.6, 0.04, 1.3]} />
          <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.4} transparent opacity={0.35 * memOn} />
        </mesh>
        {Array.from({ length: N_PAGES }, (_, i) => {
          const x = -3.3 + i * 0.5;
          const p = interpolate(shown, [i, i + 1], [0.001, 1], clamp);
          const out = x > MEM_X1;
          const color = out ? (over > 0 ? RED : LIGHT) : GREEN;
          const sink = out ? -0.35 * over : 0;
          return (
            <mesh key={i} position={[x, 0.45 + sink, 1.9]} scale={[p, p, p]}>
              <boxGeometry args={[0.36, 0.8, 0.9]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25 + 0.2 * (out ? over : 0)} transparent opacity={out ? 1 - 0.45 * over : 0.9} roughness={0.35} />
            </mesh>
          );
        })}
      </Canvas>
      <Header text="Random UUIDs" sub="food-delivery orders" />
      <LaneLabel top={440} label="Services" color={LIGHT}>
        <span style={{ fontFamily: MONO, fontSize: 36, color: MUTED }}>make their own IDs</span>
      </LaneLabel>
      <Pop at={right} sfx="reveal" style={{ left: 70, top: 520 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: GREEN, textShadow: shadow }}>✓ no ID server</div>
      </Pop>
      <div style={{ opacity: memOn }}>
        <LaneLabel top={880} label="Index" color={FG}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: GREEN }}>memory</span>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: RED, opacity: over }}>→ disk</span>
        </LaneLabel>
      </div>
      <Sfx name="whoosh" at={index} volume={0.4} />
      <Sfx name="buzz" at={memory + 6} volume={0.35} />
    </>
  );
};

// ---- 4. Production: every query was green -----------------------------------------------------------------------

// The insert-rate line on the dashboard is the lab's real UUIDv4 curve (data.json), not a made-up one.
const spark = (() => {
  const { rows, rate } = data.v4;
  const pts = [[0, rate[0]], ...rows.map((r, i) => [r, rate[i]])];
  return pts.map(([r, v], i) => `${i ? "L" : "M"}${((r / 10_000_000) * 300).toFixed(1)},${(90 - (v / rate[0]) * 80).toFixed(1)}`).join(" ");
})();

const ProductionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const green = useCue("green", 10);
  const z = interpolate(frame, [0, 60], [13, 12], clamp);
  const ins = green + 34;
  const draw = interpolate(frame, [ins, ins + 30], [0, 1], { ...clamp, easing: ease });
  const scale = interpolate(frame, [0, 8], [0.6, 1], { ...clamp, easing: ease });
  return (
    <>
      <Canvas pos={[0.6, 2.4, z]} look={[0.85, 1.2, 0]}>
        <pointLight position={[0.5, 2.2, 4]} intensity={18} distance={12} color="#ffffff" />
        <group scale={scale}>
          <Rack frame={frame} />
        </group>
      </Canvas>
      <div style={{ position: "absolute", left: 90, width: 460, top: 480, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>PRODUCTION</div>
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 330 }}>
        <div style={{ position: "relative", width: 430, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: FG }}>Every query was green.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
      {/* the dashboard: queries all green, the insert rate sinking */}
      <Pop at={green} style={{ left: 640, top: 600 }}>
        <div style={{ width: 380, padding: "22px 26px", borderRadius: 22, background: "#22262b", border: `3px solid ${GRAY}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["SELECT", "UPDATE", "DELETE"].map((q) => (
              <div key={q} style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontWeight: 700, fontSize: 32, color: LIGHT }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, background: GREEN, boxShadow: `0 0 14px ${GREEN}` }} />
                {q}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, opacity: frame >= ins ? 1 : 0.25 }}>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 32, color: frame >= ins ? RED : LIGHT }}>INSERT/s ↓</div>
            <svg width={320} height={100} style={{ overflow: "visible" }}>
              <path d={spark} fill="none" stroke={RED} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            </svg>
          </div>
        </div>
      </Pop>
      <Sfx name="buzz" at={ins} volume={0.3} />
    </>
  );
};

// ---- 5. The test: page fill 70% vs 90%, index 29% bigger --------------------------------------------------------

const PAGE_PITCH = 0.62;
const PAGE_ROWS: { key: "v7" | "v4"; label: string; color: string; z: number; top: number; pages: number; cue: string }[] = [
  // Same rows in both: 7 pages at 90% hold what 9 pages at 70% hold (6.3 page-loads each), and 9 / 7 = 1.29.
  { key: "v7", label: "UUIDv7", color: GREEN, z: -1.9, top: 440, pages: 7, cue: "v7fill" },
  { key: "v4", label: "UUIDv4", color: RED, z: 1.9, top: 880, pages: 9, cue: "v4fill" },
];

const Fill: React.FC = () => {
  const frame = useCurrentFrame();
  const cues: Record<string, number> = { v4fill: useCue("v4fill", 10), v7fill: useCue("v7fill", 60) };
  const bytes = useCue("bytes", 100);
  const big = useCue("big", 130);
  const bigOn = interpolate(frame, [big, big + 10], [0, 1], clamp);
  const pop = useSpring(big, 200);
  return (
    <>
      <Canvas pos={laneCam(200 + frame * 0.3)} look={LANE_LOOK}>
        {PAGE_ROWS.map((r) => {
          const at = cues[r.cue];
          const target = FILL[r.key] / 100;
          return Array.from({ length: r.pages }, (_, i) => {
            const x = -3.3 + i * PAGE_PITCH;
            const grow = interpolate(frame, [at - 10 + i * 1.5, at + i * 1.5], [0.001, 1], { ...clamp, easing: ease });
            const fill = target * interpolate(frame, [at, at + 18], [0, 1], { ...clamp, easing: ease });
            const extra = r.key === "v4" && i >= 7 ? bigOn : 0;
            return (
              <group key={`${r.key}-${i}`} position={[x, 0, r.z]} scale={[grow, grow, grow]}>
                <mesh position={[0, 0.55, 0]}>
                  <boxGeometry args={[0.48, 1.1, 0.8]} />
                  <meshStandardMaterial color={extra ? RED : "#9aa1ab"} emissive={extra ? RED : r.color} emissiveIntensity={0.1 + 0.6 * extra} transparent opacity={0.16 + 0.25 * extra} roughness={0.1} />
                </mesh>
                <mesh position={[0, (1.1 * fill) / 2, 0]}>
                  <boxGeometry args={[0.4, Math.max(0.01, 1.1 * fill), 0.66]} />
                  <meshStandardMaterial color={r.color} emissive={r.color} emissiveIntensity={0.3} roughness={0.4} transparent opacity={0.85} />
                </mesh>
              </group>
            );
          });
        })}
      </Canvas>
      <Header text="Index pages" sub="10M rows · PostgreSQL 18" />
      {PAGE_ROWS.map((r) => {
        const at = cues[r.cue];
        const v = Math.round(FILL[r.key] * interpolate(frame, [at, at + 18], [0, 1], { ...clamp, easing: ease }));
        return (
          <React.Fragment key={r.key}>
            <LaneLabel top={r.top} label={r.label} color={r.color}>
              <span style={{ fontFamily: MONO, fontSize: 36, color: MUTED, opacity: interpolate(frame, [bytes, bytes + 8], [0, 1], clamp) }}>16 bytes</span>
            </LaneLabel>
            <div style={{ position: "absolute", left: 70, top: r.top + 66, whiteSpace: "nowrap", fontFamily: MONO, fontWeight: 800, fontSize: 60, color: r.color, opacity: frame >= at - 6 ? 1 : 0, textShadow: shadow }}>
              {v}%<span style={{ fontSize: 32, color: MUTED, fontWeight: 400 }}> full</span>
              <span style={{ marginLeft: 30, fontSize: 48, color: LIGHT, opacity: bigOn }}>{data.pkey_mb[r.key]} MB</span>
            </div>
          </React.Fragment>
        );
      })}
      {frame >= big ? (
        <div style={{ position: "absolute", left: 640, top: 360, transform: `scale(${0.4 + 0.6 * pop}) rotate(-4deg)`, opacity: Math.min(1, pop * 2), textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 120, lineHeight: 1, color: RED, textShadow: `0 0 40px ${RED}88` }}>+{BIGGER}%</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: RED, textShadow: shadow }}>bigger index</div>
          <Sfx name="stamp" at={big} />
        </div>
      ) : null}
      <Sfx name="reveal" at={cues.v4fill} volume={0.3} />
      <Sfx name="reveal" at={cues.v7fill} volume={0.3} />
    </>
  );
};

// ---- 6. Why: sorted pages, random key, page splits, disk ---------------------------------------------------------

// A memory zone over part of the page row; pages outside it are on disk. x in world units along the row.
const MemZone: React.FC<{ x0: number; x1: number; on: number; color: string }> = ({ x0, x1, on, color }) => (
  <mesh position={[(x0 + x1) / 2, 0.6, 0]} scale={[1, on + 0.001, 1]}>
    <boxGeometry args={[x1 - x0, 1.6, 1.3]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} transparent opacity={0.22 * on} />
  </mesh>
);

const rowCam = (frame: number): [number, number, number] => {
  const a = interpolate(frame, [0, 300], [0.16, -0.06], clamp);
  return [Math.sin(a) * 10.5, 6.2, Math.cos(a) * 10.5];
};
const ROW_LOOK: [number, number, number] = [0, 0.2, 0];

const Split: React.FC = () => {
  const frame = useCurrentFrame();
  const sorted = useCue("sorted", 10);
  const anywhere = useCue("anywhere", 50);
  const split = useCue("split", 80);
  const mem = useCue("mem", 120);
  const disk = useCue("disk", 160);
  const memOn = interpolate(frame, [mem, mem + 12], [0, 1], clamp);
  return (
    <>
      <Canvas pos={rowCam(frame)} look={ROW_LOOK}>
        <PageRow3 k="v4" z={0} start={Math.max(2, anywhere - 26)} />
        <MemZone x0={PX0 - 0.1} x1={PX0 + PSPAN * 0.45} on={memOn} color={GREEN} />
      </Canvas>
      <Header text="UUIDv4" sub="random key → any page" />
      <Pop at={sorted} style={{ left: 70, top: 1150 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: LIGHT, textShadow: shadow, opacity: 1 - memOn }}>pages sorted: 0… → f…</div>
      </Pop>
      <Stamp at={split} label="PAGE SPLIT" color={RED} style={{ left: 600, top: 560 }} />
      <div style={{ position: "absolute", left: 70, top: 1150, display: "flex", gap: 60, opacity: memOn }}>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: GREEN, textShadow: shadow }}>memory</span>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: frame >= disk ? RED : LIGHT, textShadow: shadow }}>disk →</span>
      </div>
      <Stamp at={disk} label="WAIT ON DISK" color={RED} style={{ left: 560, top: 1210 }} />
    </>
  );
};

// ---- 7. UUIDv7: time first, every new ID on the last page -----------------------------------------------------------

// The article's v7 example: the first 12 hex digits are the milliseconds (27 October 2026, 18:00 UTC).
const V7_ID = "01a17e84-e100-71c4-9e2b-5f8a1d3c6e90";

const V7: React.FC = () => {
  const frame = useCurrentFrame();
  const time = useCue("time", 12);
  const lastCue = useCue("last", 60);
  const inmem = useCue("inmem", 100);
  const lit = interpolate(frame, [time, time + 8], [0, 1], clamp);
  const memOn = interpolate(frame, [inmem, inmem + 12], [0, 1], clamp);
  const pitch = PSPAN / 6;
  return (
    <>
      <Canvas pos={rowCam(frame)} look={ROW_LOOK}>
        <PageRow3 k="v7" z={0} start={Math.max(2, lastCue - 30)} />
        <MemZone x0={PX0 + pitch * 4} x1={PX0 + PSPAN + 0.1} on={memOn} color={GREEN} />
      </Canvas>
      <Header text="UUIDv7" sub="time first" />
      <div style={{ position: "absolute", left: 70, top: 450, fontFamily: MONO, fontWeight: 700, fontSize: 40, color: LIGHT, whiteSpace: "nowrap" }}>
        <span style={{ color: lit > 0 ? GREEN : LIGHT, background: `rgba(52,199,123,${0.18 * lit})`, borderRadius: 8 }}>{V7_ID.slice(0, 13)}</span>
        {V7_ID.slice(13)}
        <div style={{ display: "flex", gap: 230, marginTop: 8, fontSize: 30, opacity: lit }}>
          <span style={{ color: GREEN }}>time (ms)</span>
          <span style={{ color: MUTED }}>random</span>
        </div>
      </div>
      <Pop at={lastCue} style={{ left: 70, top: 620 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, color: GREEN, textShadow: shadow }}>new ID → last page</div>
      </Pop>
      <div style={{ position: "absolute", left: 560, top: 1150, opacity: memOn, fontFamily: MONO, fontWeight: 800, fontSize: 44, color: GREEN, textShadow: shadow }}>✓ in memory</div>
      <Sfx name="reveal" at={time} volume={0.35} />
      <Sfx name="stamp" at={inmem} volume={0.35} />
    </>
  );
};

// ---- 8. End: the principle ------------------------------------------------------------------------------------------

const End: React.FC = () => {
  const frame = useCurrentFrame();
  const pattern = useCue("pattern", 30);
  const a = useSpring(2, 120);
  const b = useSpring(pattern - 2, 160);
  return (
    <>
      <Canvas pos={rowCam(300 - frame * 0.4)} look={ROW_LOOK}>
        <group position={[0, 0, -0.6]}>
          <PageRow3 k="v7" z={0} start={2} />
        </group>
      </Canvas>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${BG}ee 0%, ${BG}cc 45%, ${BG}55 75%)` }} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 380, opacity: a }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, lineHeight: 1.1, color: FG }}>A primary key</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, lineHeight: 1.1, color: GREEN, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>is a write pattern</div>
        <div style={{ marginTop: 26, width: 140, height: 8, borderRadius: 4, background: GOLD }} />
      </div>
      <Pop at={pattern + 30} style={{ left: 80, top: 1225 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT }}>
          Full test: <span style={{ color: FG }}>archemist.dev</span>
        </div>
      </Pop>
      <Sfx name="stamp" at={pattern} volume={0.4} />
    </>
  );
};

export const SCENES2: Record<string, React.FC> = { question: Question, lands: Lands, story: Story, production: ProductionScene, fill: Fill, split: Split, v7: V7, end: End };

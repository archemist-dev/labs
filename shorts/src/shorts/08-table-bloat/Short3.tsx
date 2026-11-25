// Week 7 Short "The search that made the database read-only" (v2, 2026-11-25): an admin search on unindexed columns
// ran for minutes; while it ran, cleanup couldn't delete the dead rows that updates leave; the tables grew and the
// disk filled; a schema change needed room to copy a table, there was none, and the managed database went read-only.
// The one number is the lab's: 1.8 million dead rows in an hour (data.json, 08-table-bloat/video_data.py). The story
// has no numbers on screen (no real metrics): the disk is drawn as a level, never as a percentage.
// One stage for the whole Short, in the style of Short2 (same tokens, same database): the database on the left with
// dead rows as red discs, the disk on the right as a tank that fills, the search as a magnifier over the database.
// Only the band above the stage changes. No camera motion. Everything read sits inside SAFE.
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Follow } from "../../components/Follow";
import { Title } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GRAY, GREEN, GREEN_BG, LIGHT, MONO, RED, SAFE, SANS } from "../../theme";
import { Canvas } from "../03-uuid-keys/Short1";
import { BAND, CAM, CARD, Check, Cross, DISCS, DISC_H, Db3, EDGE, L, LOOK, Lock, MAIN_TOP, MR, MX, RED_BG, SEG, STROKE, T, cardStyle, clamp, ease, fade, shadow, sine, useProject } from "./Short2";
import data from "./data.json";

// ---- the stage: the database and its disk, in the same place in every scene ------------------------------------------

const TX = 1.85; // the disk tank
const TW = 1.5;
const TD = 1.2;
const TH = 2.7;
const BASE = 0.3; // the data that belongs there, as a share of the disk
const DEAD_MAX = 0.52; // dead rows at their worst
const COPY = 0.3; // a second copy of a table needs this much: it doesn't fit

const Magnifier: React.FC<{ size: number; color?: string }> = ({ size, color = FG }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" style={{ flexShrink: 0, filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))" }}>
    <circle cx={33} cy={33} r={22} fill="#23272e" stroke={color} strokeWidth={STROKE + 1} />
    <path d="M50 50 L72 72" stroke={color} strokeWidth={STROKE + 3} strokeLinecap="round" />
  </svg>
);

type StageProps = {
  stack: number; // red discs on the database, 0..6
  thin?: number; // the normal thin layer of dead rows
  dead: number; // 0..1: how much of DEAD_MAX the dead rows take on the disk
  copy?: number; // -1 none; 0..1 the second table copy coming down onto the disk
  full?: boolean; // the disk has no room: its frame turns red
  locked?: number; // 0..1 the database is read-only
  search?: "none" | "running" | "done";
  searchIn?: number; // 0..1 the magnifier settling over the database
};

const Stage: React.FC<StageProps> = ({ stack, thin = 0, dead, copy = -1, full, locked = 0, search = "running", searchIn = 1 }) => {
  const frame = useCurrentFrame();
  const project = useProject();
  const fullDiscs = Math.floor(stack);
  const part = stack - fullDiscs;
  const tankEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(TW, TH, TD)), []);
  const copyEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(TW * 0.92, TH * COPY, TD * 0.92)), []);
  const dbFoot = project(MX, 0, MR);
  const dbMid = project(MX, MAIN_TOP / 2, MR);
  const tankFoot = project(TX, 0, TD / 2);
  const tankTop = project(TX, TH, 0);
  const baseH = TH * BASE;
  const deadH = TH * DEAD_MAX * dead;
  // the copy comes down from above the tank and stops on what is already there: it sticks out over the top
  const restY = baseH + deadH + (TH * COPY) / 2;
  const copyY = copy >= 0 ? restY + (1 - sine(Math.min(1, copy))) * 1.6 : 0;
  const magY = dbMid.y - 80 + (1 - searchIn) * -90; // on the front of the database; the lock takes its place
  const ring = 2 * Math.PI * 70;
  const spin = (frame * 5) % 360;
  return (
    <>
      <Canvas pos={CAM} look={LOOK}>
        <pointLight position={[0, 6, 6]} intensity={18} distance={18} color="#ffffff" />
        <Db3 x={MX} r={MR} seg={SEG} glow={locked > 0 ? RED : LIGHT} glowAmount={0.1 + 0.3 * locked} />
        {Array.from({ length: fullDiscs + (part > 0 ? 1 : 0) }).map((_, i) => {
          const p = i < fullDiscs ? 1 : sine(part);
          return (
            <mesh key={i} position={[MX, MAIN_TOP + DISC_H * (i + 0.5) + (1 - p) * 0.7, 0]}>
              <cylinderGeometry args={[MR * 0.94, MR * 0.94, DISC_H * 0.8, 56]} />
              <meshStandardMaterial color="#7a2c30" emissive={RED} emissiveIntensity={0.5} transparent opacity={0.35 + 0.65 * p} roughness={0.5} />
            </mesh>
          );
        })}
        {thin > 0 ? (
          <mesh position={[MX, MAIN_TOP + 0.03, 0]}>
            <cylinderGeometry args={[MR * 0.94, MR * 0.94, 0.05, 56]} />
            <meshStandardMaterial color="#6b727d" emissive={LIGHT} emissiveIntensity={0.3} transparent opacity={thin} />
          </mesh>
        ) : null}
        {/* the disk */}
        <group position={[TX, 0, 0]}>
          <lineSegments geometry={tankEdges} position={[0, TH / 2, 0]}>
            <lineBasicMaterial color={full ? RED : LIGHT} />
          </lineSegments>
          <mesh position={[0, baseH / 2, 0]}>
            <boxGeometry args={[TW * 0.96, baseH, TD * 0.96]} />
            <meshStandardMaterial color="#4a515b" emissive={LIGHT} emissiveIntensity={0.08} roughness={0.5} />
          </mesh>
          {deadH > 0.02 ? (
            <mesh position={[0, baseH + deadH / 2, 0]}>
              <boxGeometry args={[TW * 0.96, deadH, TD * 0.96]} />
              <meshStandardMaterial color="#7a2c30" emissive={RED} emissiveIntensity={0.45} roughness={0.5} />
            </mesh>
          ) : null}
          {copy >= 0 ? (
            <group position={[0, copyY, 0]}>
              <mesh>
                <boxGeometry args={[TW * 0.92, TH * COPY, TD * 0.92]} />
                <meshStandardMaterial color="#4a515b" emissive={FG} emissiveIntensity={0.12} transparent opacity={0.75} roughness={0.5} />
              </mesh>
              <lineSegments geometry={copyEdges}>
                <lineBasicMaterial color={full ? RED : FG} />
              </lineSegments>
            </group>
          ) : null}
        </group>
      </Canvas>
      {/* names, always in the same place */}
      <div style={{ ...T.name, position: "absolute", left: dbFoot.x - 200, top: dbFoot.y + 22, width: 400, textAlign: "center", color: locked > 0.5 ? RED : FG }}>database</div>
      <div style={{ ...T.name, position: "absolute", left: tankFoot.x - 150, top: tankFoot.y + 22, width: 300, textAlign: "center", color: full ? RED : FG }}>{full ? "disk · full" : "disk"}</div>
      {copy >= 0 ? <div style={{ ...T.note, position: "absolute", left: tankTop.x - 150, top: tankTop.y - 120, width: 300, textAlign: "center", color: full ? RED : FG, textShadow: shadow, opacity: fade(frame, 0, 1) }}>table copy</div> : null}
      {/* the search over the database */}
      {search !== "none" && locked < 0.5 ? (
        <div style={{ position: "absolute", left: dbMid.x - 80, top: magY, width: 160, height: 160, opacity: searchIn * (1 - locked * 2) }}>
          <svg width={160} height={160} viewBox="0 0 160 160" style={{ position: "absolute", left: 0, top: 0 }}>
            <circle cx={80} cy={80} r={70} fill="rgba(27,29,33,0.82)" stroke={EDGE} strokeWidth={8} />
            {search === "running" ? (
              <circle cx={80} cy={80} r={70} fill="none" stroke={FG} strokeWidth={8} strokeDasharray={`${ring * 0.28} ${ring}`} transform={`rotate(${spin} 80 80)`} strokeLinecap="round" />
            ) : (
              <circle cx={80} cy={80} r={70} fill="none" stroke={GREEN} strokeWidth={8} />
            )}
          </svg>
          <div style={{ position: "absolute", left: 36, top: 36 }}>
            <Magnifier size={88} color={search === "done" ? GREEN : FG} />
          </div>
        </div>
      ) : null}
      {/* read-only: a lock on the database */}
      {locked > 0 ? (
        <div style={{ position: "absolute", left: dbMid.x - 70, top: dbMid.y - 80, opacity: locked, transform: `scale(${0.7 + 0.3 * locked})`, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.7))" }}>
          <Lock color={RED} size={140} />
        </div>
      ) : null}
    </>
  );
};

const ReadOnly: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  return <div style={{ ...T.number, fontSize: 110, position: "absolute", left: L, top: BAND, color: RED, opacity: fade(frame, at - 2, 6) }}>READ-ONLY</div>;
};

// ---- 1. Hook: the search settles on the database, the disk fills, the lock closes; a write fails ----------------------

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const readonly = useCue("readonly", 70);
  const write = useCue("write", 150);
  const settle = sine(interpolate(frame, [-6, 30], [0, 1], clamp));
  const grow = ease(interpolate(frame, [0, readonly - 6], [0, 1], clamp));
  const lock = ease(interpolate(frame, [readonly - 2, readonly + 10], [0, 1], clamp));
  return (
    <>
      <Stage stack={grow * DISCS} dead={grow} full={lock > 0.5} locked={lock} searchIn={settle} />
      <Title text="Just a search" />
      <ReadOnly at={readonly} />
      <div style={{ ...cardStyle(RED, RED_BG), position: "absolute", left: L, top: BAND + 150, width: 920, height: 92, padding: "0 26px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: fade(frame, write - 4, 8) }}>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: FG }}>new order #1042 · £11.99</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10, ...T.label, color: RED }}>
          <Cross color={RED} />
          write failed
        </span>
      </div>
      <Sfx name="whoosh" at={2} volume={0.12} />
      <Sfx name="impact" at={readonly} volume={0.3} />
      <Sfx name="buzz" at={write} volume={0.25} />
    </>
  );
};

// ---- 2. The search: two filters with no index; it runs for minutes ----------------------------------------------------

const Filter: React.FC<{ text: string; noIndexAt: number }> = ({ text, noIndexAt }) => {
  const frame = useCurrentFrame();
  const bad = frame >= noIndexAt;
  return (
    <div style={{ ...cardStyle(bad ? RED : EDGE, bad ? RED_BG : "#1b1e23"), borderRadius: 16, height: 76, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: FG }}>{text}</span>
      <span style={{ ...T.note, color: RED, fontWeight: 700, opacity: fade(frame, noIndexAt - 2, 6) }}>no index</span>
    </div>
  );
};

const Search: React.FC = () => {
  const frame = useCurrentFrame();
  const index = useCue("index", 60);
  const minutes = useCue("minutes", 110);
  return (
    <>
      <Stage stack={0} thin={1} dead={0} />
      <Title text="Filters with no index" />
      <div style={{ ...cardStyle(), position: "absolute", left: L, top: BAND, width: 920, padding: "22px 26px", opacity: fade(frame, 2) }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={T.label}>admin search</span>
          <span style={{ ...T.note, color: FG, opacity: fade(frame, minutes - 4) }}>still running · minutes</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Filter text={'postcode = "CB1 1PT"'} noIndexAt={index} />
          <Filter text="total > £11.99" noIndexAt={index + 6} />
        </div>
      </div>
      <Sfx name="type" at={6} volume={0.2} />
      <Sfx name="buzz" at={index} volume={0.25} />
    </>
  );
};

// ---- 3. Updates: each update leaves a dead row; cleanup can't delete it while the search runs -----------------------

const STATUSES = ["PLACED", "COOKING", "PICKED_UP"];
const VersionRow: React.FC<{ slot: number; status: string; at: number; deadAt: number; locked: boolean }> = ({ slot, status, at, deadAt, locked }) => {
  const frame = useCurrentFrame();
  const inP = ease(interpolate(frame, [at - 4, at + 12], [0, 1], clamp));
  const dead = frame >= deadAt;
  if (frame < at - 4) return null;
  return (
    <div
      style={{
        ...cardStyle(dead ? RED : GREEN, dead ? RED_BG : GREEN_BG),
        position: "absolute",
        left: L,
        top: BAND + slot * 86,
        width: 920,
        height: 74,
        borderRadius: 16,
        display: "grid",
        gridTemplateColumns: "150px 1fr 170px 130px",
        alignItems: "center",
        padding: "0 24px",
        opacity: inP,
        transform: `translateY(${(1 - inP) * -18}px)`,
        fontFamily: MONO,
        fontSize: 36,
        color: dead ? LIGHT : FG,
      }}
    >
      <span style={{ fontWeight: 800 }}>#1041</span>
      <span style={{ fontWeight: 800, textDecoration: dead ? "line-through" : "none" }}>{status}</span>
      <span>£11.99</span>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, fontFamily: SANS, fontWeight: 800, fontSize: 32, color: dead ? RED : GREEN }}>{dead ? locked ? <Lock color={RED} /> : "dead" : "live"}</span>
    </div>
  );
};

const Updates: React.FC = () => {
  const frame = useCurrentFrame();
  const changing = useCue("changing", 30);
  const row = useCue("row", 90);
  const running = useCue("running", 170);
  const born = [0, changing, row];
  const deadAt = [changing, row, 1e6];
  const locked = frame >= running;
  const p = interpolate(frame, [changing, running + 20], [0, 0.5], clamp);
  return (
    <>
      <Stage stack={p * DISCS} dead={p} />
      <Title text="Updates leave dead rows" />
      {STATUSES.map((s, i) => (
        <VersionRow key={s} slot={i} status={s} at={born[i]} deadAt={deadAt[i]} locked={locked} />
      ))}
      <div style={{ ...T.note, position: "absolute", left: L, top: BAND + 3 * 86 + 4, color: RED, opacity: fade(frame, running) }}>kept while the search runs</div>
      <Sfx name="buzz" at={changing} volume={0.2} />
      <Sfx name="buzz" at={row} volume={0.2} />
      <Sfx name="stamp" at={running} volume={0.25} />
    </>
  );
};

// ---- 4. Grow: the tables grew and the disk filled, with flat traffic --------------------------------------------------

const Trend: React.FC<{ slot: number; at: number; label: string; rising: boolean }> = ({ slot, at, label, rising }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at, at + 40], [0, 1], clamp));
  const w = 520;
  const d = rising ? `M0 70 C${w * 0.4} 66 ${w * 0.7} 40 ${w} 6` : `M0 40 C${w * 0.3} 36 ${w * 0.6} 44 ${w} 40`;
  return (
    <div style={{ ...cardStyle(rising ? RED : EDGE), position: "absolute", left: L, top: BAND + slot * 132, width: 920, height: 116, padding: "0 26px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: fade(frame, at - 6, 8) }}>
      <span style={{ ...T.label, color: rising ? RED : FG }}>{label}</span>
      <svg width={w} height={80} viewBox={`0 0 ${w} 80`}>
        <path d={d} fill="none" stroke={rising ? RED : LIGHT} strokeWidth={STROKE + 1} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
      </svg>
    </div>
  );
};

const Grow: React.FC = () => {
  const grew = useCue("grew", 30);
  const filled = useCue("filled", 70);
  const frame = useCurrentFrame();
  const p = 0.5 + 0.5 * ease(interpolate(frame, [grew - 10, filled + 20], [0, 1], clamp));
  return (
    <>
      <Stage stack={p * DISCS} dead={p} />
      <Title text="Nobody inserted more" />
      <Trend slot={0} at={4} label="traffic" rising={false} />
      <Trend slot={1} at={grew} label="disk used" rising />
      <Sfx name="reveal" at={filled} volume={0.25} />
    </>
  );
};

// ---- 5. Alter: a schema change needs room to copy a table; there is none; read-only ---------------------------------

const Alter: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCue("copy", 60);
  const none = useCue("none", 110);
  const readonly = useCue("readonly", 170);
  const drop = frame < copy - 10 ? -1 : interpolate(frame, [copy - 10, copy + 30], [0, 1], clamp);
  const full = frame >= none;
  const lock = ease(interpolate(frame, [readonly - 2, readonly + 10], [0, 1], clamp));
  return (
    <>
      <Stage stack={DISCS} dead={1} copy={drop} full={full} locked={lock} />
      <Title text="A schema change" />
      <div style={{ ...cardStyle(), position: "absolute", left: L, top: BAND, width: 920, padding: "20px 26px", opacity: 1 - fade(frame, readonly - 8, 6) }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: FG }}>ALTER TABLE orders …</div>
        <div style={{ ...T.note, marginTop: 8 }}>rewrites the table · needs a second copy</div>
      </div>
      <div style={{ ...T.label, position: "absolute", left: L, top: BAND + 160, display: "flex", alignItems: "center", gap: 12, color: RED, opacity: fade(frame, none - 2, 6) * (1 - fade(frame, readonly - 8, 6)) }}>
        <Cross color={RED} />
        no room on the disk
      </div>
      <ReadOnly at={readonly} />
      <div style={{ ...T.note, position: "absolute", left: L, top: BAND + 130, color: FG, opacity: fade(frame, readonly + 4) }}>writes stop until space is freed</div>
      <Sfx name="whoosh" at={copy - 10} volume={0.15} />
      <Sfx name="buzz" at={none} volume={0.25} />
      <Sfx name="impact" at={readonly} volume={0.3} />
    </>
  );
};

// ---- 6. The test: one slow read, 1.8 million dead rows in an hour ----------------------------------------------------

const Test: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useCue("n", 70);
  const hour = useCue("hour", 120);
  const pn = interpolate(frame, [n - 14, n], [0, 1], clamp);
  const m = Math.round(data.dead_at_release / 100_000) / 10; // 1.8
  return (
    <>
      <Stage stack={DISCS} dead={1} />
      <Title text="My test" />
      <div style={{ ...T.number, position: "absolute", left: L, top: BAND - 10, color: pn >= 1 ? RED : GRAY, opacity: fade(frame, n - 14, 6) }}>{(Math.floor(m * pn * 5) / 5).toFixed(1)}M</div>
      <div style={{ ...T.label, position: "absolute", left: L, top: BAND + 150, opacity: fade(frame, n - 4) }}>
        dead rows <span style={{ ...T.note, opacity: fade(frame, hour - 4) }}>· in {data.hold_minutes} min</span>
      </div>
      <div style={{ ...T.note, position: "absolute", left: L, top: BAND + 216, opacity: fade(frame, hour + 6) }}>
        one slow read · {data.updates_per_s} updates/s · 1M orders
      </div>
      <Sfx name="reveal" at={n} volume={0.35} />
    </>
  );
};

// ---- 7. The fix: index what the filters use; limit how long a search may run ----------------------------------------

const Rule: React.FC<{ slot: number; at: number; text: string; setting: string }> = ({ slot, at, text, setting }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...cardStyle(GREEN, GREEN_BG), position: "absolute", left: L, top: BAND + slot * 152, width: 920, height: 132, padding: "0 26px", display: "flex", alignItems: "center", gap: 18, opacity: fade(frame, at - 4, 8) }}>
      <Check color={GREEN} size={48} />
      <div>
        <div style={T.label}>{text}</div>
        <div style={{ ...T.note, marginTop: 2 }}>{setting}</div>
      </div>
    </div>
  );
};

const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  const index = useCue("index", 30);
  const run = useCue("run", 130);
  // the state with the fix in place: no stack, no extra disk use. Never shown as the full disk emptying: cleanup
  // doesn't return space to the disk (the story needed a table rewrite for that; it is in the caption).
  return (
    <>
      <Stage stack={0} thin={1} dead={0} search={frame >= index + 30 ? "done" : "running"} />
      <Title text="The fix" />
      <Rule slot={0} at={index} text="index what the filters use" setting="CREATE INDEX … ON orders (postcode)" />
      <Rule slot={1} at={run - 20} text="stop a search after 60 s" setting="statement_timeout = 60s" />
      <Sfx name="reveal" at={index} volume={0.25} />
      <Sfx name="stamp" at={run} volume={0.3} />
    </>
  );
};

export const SCENES3: Record<string, React.FC> = { hook: Hook, search: Search, updates: Updates, grow: Grow, alter: Alter, test: Test, fix: Fix, follow: Follow };

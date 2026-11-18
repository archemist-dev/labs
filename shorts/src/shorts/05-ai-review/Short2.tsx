// Week 5 Short "The checklist fix": an AI reviewer caught all 10 seeded bugs but hid them in about 110 comments; a
// checklist prompt with blocking-only comments keeps the 10 bugs and drops the rest.
// Every count comes from data2.json (05-ai-review/video_data.py, checked against summary.json). The cards are run 1.
// Lessons rule 14: the opening is a moving 3D scene that already shows the event. Two prototype looks for the
// opening (Javlon picks): A = the 20 PRs as stacks of their real comment cards, B = the review as a scrolling feed.
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Pop } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { BG, FG, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Cam, Lights } from "../03-uuid-keys/ProtoB";
import { Header } from "../04-response-time/Short1";
import data from "./data2.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
const steps = (value: number, p: number, step: number) => (p >= 1 ? value : Math.min(value, Math.floor((value * p) / step) * step));
const CARD = "#1e2126";
const LINE = "#6b727d";
// Hex in, hex out (ProtoB's lerpColor returns rgb(), which can't be fed back in).
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, "0")).join("");
};

// ---- The cards: one per real review comment of run 1 ---------------------------------------------------------------

type Kind = "bug" | "block" | "nit";
type Pr = { pr: string; bug: boolean; comments: number; blocking: number; caught: boolean };
// A fixed shuffle, so bug PRs and clean twins sit mixed like a real queue.
const ORDER = ["b03", "c07", "b01", "c02", "c10", "b06", "b08", "c04", "c01", "b10", "c05", "b02", "c09", "b07", "c03", "c06", "b04", "b09", "c08", "b05"];
const byId = (rows: Pr[]) => ORDER.map((id) => rows.find((r) => r.pr.startsWith(id))!);
const DEFAULT = byId(data.default.prs as Pr[]);

// The catching comment sits mid-pile (buried); the other blocking comments are spread from the top.
const kinds = (p: Pr): Kind[] => {
  const k: Kind[] = Array(p.comments).fill("nit");
  const mid = Math.floor(p.comments / 2);
  if (p.bug && p.caught) k[mid] = "bug";
  let left = p.blocking - (p.bug && p.caught ? 1 : 0);
  for (let i = 0; i < p.comments && left > 0; i += 2) if (k[i] === "nit") (k[i] = "block"), left--;
  for (let i = 0; i < p.comments && left > 0; i++) if (k[i] === "nit") (k[i] = "block"), left--;
  return k;
};
const STACKS = DEFAULT.map(kinds);
const TOTAL = DEFAULT.reduce((s, p) => s + p.comments, 0); // 106
const BLOCKING = DEFAULT.reduce((s, p) => s + p.blocking, 0); // 25
const RUNS = (() => { const c = data.default.runs.map((r) => r.comments); return `${Math.min(...c)}–${Math.max(...c)}`; })(); // 106–113
const BUGS = DEFAULT.filter((p) => p.bug && p.caught).length; // 10
const jit = (i: number, j: number) => (((i * 73 + j * 37) % 11) - 5) / 5; // -1..1, deterministic

const CARD_BOX = new THREE.BoxGeometry(1.1, 0.06, 0.7);
const CARD_EDGES = new THREE.EdgesGeometry(CARD_BOX);

// A review comment: avatar dot and three text lines on a flat card. `red` turns it into the bug, `hi` outlines it.
const Card: React.FC<{ pos: [number, number, number]; ry?: number; red?: number; hi?: number; dim?: number }> = ({ pos, ry = 0, red = 0, hi = 0, dim = 0 }) => {
  const base = mix(mix(CARD, "#141619", dim), "#7a1f23", red);
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      <mesh geometry={CARD_BOX}>
        <meshStandardMaterial color={base} emissive={RED} emissiveIntensity={red * 0.9} roughness={0.7} />
      </mesh>
      <lineSegments geometry={CARD_EDGES}>
        <lineBasicMaterial color={red > 0.5 ? RED : FG} transparent opacity={Math.max(hi, red) * (1 - dim * 0.8)} />
      </lineSegments>
      <mesh position={[-0.4, 0.04, -0.19]}>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 20]} />
        <meshStandardMaterial color={red > 0.5 ? RED : LIGHT} emissive={RED} emissiveIntensity={red * 0.8} />
      </mesh>
      {[
        [0.08, -0.19, 0.6],
        [0, 0.0, 0.8],
        [-0.1, 0.17, 0.6],
      ].map(([x, z, w], i) => (
        <mesh key={i} position={[x - 0.02 + (i ? -0.12 : 0), 0.04, z]}>
          <boxGeometry args={[w, 0.012, 0.07]} />
          <meshStandardMaterial color={red > 0.5 ? "#ffd0d1" : mix(LINE, "#2a2e34", dim)} emissive={red > 0.5 ? RED : "#000000"} emissiveIntensity={red * 0.6} />
        </mesh>
      ))}
    </group>
  );
};

const Scene3D: React.FC<{ pos: [number, number, number]; look: [number, number, number]; fog?: [number, number]; children: React.ReactNode }> = ({ pos, look, fog, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 38 }}>
      <color attach="background" args={[BG]} />
      {fog ? <fog attach="fog" args={[BG, fog[0], fog[1]]} /> : null}
      <Cam pos={pos} look={look} />
      <Lights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={BG} roughness={0.95} />
      </mesh>
      <gridHelper args={[80, 80, "#2c3036", "#24272c"]} />
      {children}
    </ThreeCanvas>
  );
};

// Shared top-band text for the opening: the counts and the silent-bug definition, all flat HTML.
const Chip: React.FC<{ at: number; text: string; color: string; solid?: boolean; style: React.CSSProperties }> = ({ at, text, color, solid, style }) => (
  <Pop at={at} style={style}>
    <div style={{ padding: "12px 22px", borderRadius: 14, border: `4px solid ${color}`, background: solid ? color : "#1b1d21cc", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: solid ? BG : color }}>
      {text}
    </div>
  </Pop>
);

export const HookText: React.FC<{ cues: { ten: number; comments: number } }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [cues.comments - 14, cues.comments], [0, 1], clamp);
  return (
    <>
      <Header text="One AI review" sub={`${data.default.prs.length} pull requests`} />
      <div style={{ position: "absolute", left: 70, top: 360, fontFamily: MONO, fontWeight: 800, fontSize: 64, color: RED, opacity: fade(frame, cues.ten - 3) }}>
        {BUGS} real bugs
      </div>
      <div style={{ position: "absolute", left: 70, top: 435, fontFamily: MONO, fontWeight: 800, fontSize: 64, color: FG, opacity: fade(frame, cues.comments - 14, 6) }}>
        ≈{steps(110, p, 10)} <span style={{ fontSize: 40, color: MUTED, fontWeight: 400 }}>comments</span>
        <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 400, color: MUTED }}>{RUNS} over 3 runs</div>
      </div>
      <Sfx name="reveal" at={cues.ten} volume={0.3} />
    </>
  );
};

export const NoiseText: React.FC = () => {
  const frame = useCurrentFrame();
  const silent = useCue("silent", 30);
  const success = useCue("success", 60);
  const wrong = useCue("wrong", 90);
  const names = useCue("names", 130);
  const style = useCue("style", 145);
  const blocking = useCue("blocking", 170);
  const bugs = useCue("bugs", 200);
  const p = interpolate(frame, [blocking - 12, blocking], [0, 1], clamp);
  return (
    <>
      <Header text="The default prompt" sub="20 PRs · 10 with a silent bug" />
      <div style={{ position: "absolute", left: 70, top: 400, opacity: fade(frame, silent - 4) * (1 - fade(frame, names - 8)) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT }}>silent bug =</div>
      </div>
      <div style={{ opacity: 1 - fade(frame, names - 8) }}>
        <Chip at={success} text="✓ 200 OK" color={GREEN} style={{ left: 70, top: 460 }} />
        <Chip at={wrong} text="wrong result, no error" color={RED} solid style={{ left: 330, top: 460 }} />
      </div>
      <div style={{ opacity: fade(frame, names - 6) }}>
        <Chip at={names} text="naming" color={LIGHT} style={{ left: 70, top: 410 }} />
        <Chip at={style} text="style" color={LIGHT} style={{ left: 290, top: 410 }} />
        <div style={{ position: "absolute", left: 70, top: 510, fontFamily: MONO, fontWeight: 800, fontSize: 64, color: FG, opacity: fade(frame, blocking - 12, 6) }}>
          {steps(BLOCKING, p, 5)} <span style={{ fontSize: 40, color: MUTED, fontWeight: 400 }}>blocking</span>
        </div>
        <div style={{ position: "absolute", left: 470, top: 510, fontFamily: MONO, fontWeight: 800, fontSize: 64, color: RED, opacity: fade(frame, bugs - 3) }}>
          {BUGS} <span style={{ fontSize: 40, fontWeight: 400 }}>bugs</span>
        </div>
      </div>
      <Sfx name="reveal" at={blocking} volume={0.3} />
    </>
  );
};

// ---- A: the 20 PRs as stacks of their real comment cards -----------------------------------------------------------

const COLS = 4;
const stackPos = (i: number): [number, number] => [((i % COLS) - (COLS - 1) / 2) * 1.55, (Math.floor(i / COLS) - 2) * 1.2];

const Stacks: React.FC<{ red: (i: number) => number; lift: (i: number) => number; hi: (k: Kind) => number; dimNit?: number }> = ({ red, lift, hi, dimNit = 0 }) => {
  let bugN = 0;
  return (
    <>
      {STACKS.map((ks, i) => {
        const [x, z] = stackPos(i);
        return ks.map((k, j) => {
          const b = k === "bug" ? bugN++ : -1;
          const r = b >= 0 ? red(b) : 0;
          const l = b >= 0 ? lift(b) : 0;
          return (
            <Card
              key={`${i}-${j}`}
              pos={[x + jit(i, j) * 0.05, 0.05 + j * 0.085 + l * 0.12, z + jit(j, i) * 0.05 + l * 0.75]}
              ry={jit(i + 3, j) * 0.07}
              red={r}
              hi={hi(k)}
              dim={k === "nit" ? dimNit : 0}
            />
          );
        });
      })}
    </>
  );
};

const orbitA = (frame: number, a0: number, a1: number, r0: number, r1: number, h0: number, h1: number, len = 300): [number, number, number] => {
  const t = sine(interpolate(frame, [0, len], [0, 1], clamp));
  const a = a0 + (a1 - a0) * t;
  const r = r0 + (r1 - r0) * t;
  return [Math.sin(a) * r, h0 + (h1 - h0) * t, Math.cos(a) * r];
};

const HookA: React.FC = () => {
  const frame = useCurrentFrame();
  const ten = useCue("ten", 45);
  const comments = useCue("comments", 75);
  const red = (b: number) => ease(interpolate(frame, [ten - 2 + b * 2, ten + 14 + b * 2], [0, 1], clamp));
  const lift = (b: number) => ease(interpolate(frame, [ten + 4 + b * 2, ten + 25 + b * 2], [0, 1], clamp));
  return (
    <>
      <Scene3D pos={orbitA(frame, -0.5, -0.2, 13, 12, 8.8, 8.4)} look={[0, 2.2, 0.4]}>
        <Stacks red={red} lift={lift} hi={() => 0} />
      </Scene3D>
      <HookText cues={{ ten, comments }} />
    </>
  );
};

const NoiseA: React.FC = () => {
  const frame = useCurrentFrame();
  const blocking = useCue("blocking", 170);
  const bugs = useCue("bugs", 200);
  const hiOn = fade(frame, blocking - 2, 12);
  const pulse = 0.85 + 0.15 * Math.sin(Math.max(0, frame - bugs) * 0.25);
  return (
    <>
      <Scene3D pos={orbitA(frame, -0.2, 0.25, 13.5, 11.5, 9, 7.6, 360)} look={[0, 2.2, 0.4]}>
        <Stacks red={() => pulse} lift={() => 1} hi={(k) => (k === "block" ? hiOn : 0)} dimNit={hiOn * 0.7} />
      </Scene3D>
      <NoiseText />
    </>
  );
};

// ---- B: the review as one long feed, scrolling toward the camera ----------------------------------------------------

const FEED: { kind: Kind; z: number }[] = (() => {
  const out: { kind: Kind; z: number }[] = [];
  let z = 0;
  STACKS.forEach((ks) => {
    ks.forEach((k) => {
      out.push({ kind: k, z });
      z -= 0.9;
    });
    z -= 0.5; // a gap between pull requests
  });
  return out;
})();
const FLOW = 0.028; // world units a frame: a calm scroll, about one card every 1.1 s

const Feed: React.FC<{ shift: number; red: (b: number) => number; hi: (k: Kind) => number; dimNit?: number }> = ({ shift, red, hi, dimNit = 0 }) => {
  let bugN = 0;
  return (
    <>
      {FEED.map((c, i) => {
        const b = c.kind === "bug" ? bugN++ : -1;
        const z = c.z + shift;
        if (z > 6 || z < -40) return null;
        return <Card key={i} pos={[jit(i, 1) * 0.04, 0.05, z]} ry={jit(i, 2) * 0.03} red={b >= 0 ? red(b) : 0} hi={hi(c.kind)} dim={c.kind === "nit" ? dimNit : 0} />;
      })}
    </>
  );
};

const HookB: React.FC = () => {
  const frame = useCurrentFrame();
  const ten = useCue("ten", 45);
  const comments = useCue("comments", 75);
  const red = () => ease(interpolate(frame, [ten - 2, ten + 14], [0, 1], clamp));
  return (
    <>
      <Scene3D pos={[0.9, 2.3, 6.2]} look={[0, -0.6, -4]} fog={[6, 26]}>
        <Feed shift={8 + frame * FLOW} red={red} hi={() => 0} />
      </Scene3D>
      <HookText cues={{ ten, comments }} />
    </>
  );
};

const NoiseB: React.FC = () => {
  const frame = useCurrentFrame();
  const blocking = useCue("blocking", 170);
  const hiOn = fade(frame, blocking - 2, 12);
  const t = sine(interpolate(frame, [0, 360], [0, 1], clamp));
  return (
    <>
      <Scene3D pos={[0.9 + t * 1.2, 2.3 + t * 4, 6.2 + t * 2]} look={[0, -0.6 - t * 1.5, -4 - t * 4]} fog={[6 + t * 6, 26 + t * 14]}>
        <Feed shift={8 + (frame + 120) * FLOW} red={() => 1} hi={(k) => (k === "block" ? hiOn : 0)} dimNit={hiOn * 0.7} />
      </Scene3D>
      <NoiseText />
    </>
  );
};

export const SCENES_A: Record<string, React.FC> = { hook: HookA, noise: NoiseA };
export const SCENES_B: Record<string, React.FC> = { hook: HookB, noise: NoiseB };

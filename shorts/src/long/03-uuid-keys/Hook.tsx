// Long-form trial (16:9): the UUIDv7 long video's cold hook, 3D belts of order rows into two databases.
// Built against the HyperFrames version of the same beat so Javlon can pick a tool. Timings are the Whisper
// word starts of the ElevenLabs take (work-long-uuid/s01taketrim.wav); rates come from data.json (lab run 1).
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BG, FG, GOLD, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { fmt, fmtRows, phase, rateAt, round100, rowsAt, speed, type Key } from "../../shorts/03-uuid-keys/sim";

export const LW = 2560;
export const LH = 1440;
const S = 30; // fps
const at = (sec: number) => Math.round(sec * S);
// Word cues from the take.
const CUE = { today: at(2.6), grows: at(4.18), rows: at(7.28), inserts: at(8.06), x14: at(8.64), fix: at(10.68), uuid: at(11.64) };
export const HOOK_FRAMES = at(13.6);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

const Cam: React.FC<{ pos: [number, number, number]; look: [number, number, number] }> = ({ pos, look }) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
  }, [camera, pos, look]);
  return null;
};

// v4 on the far lane (top of the screen), v7 on the near lane.
const LANES: { key: Key; label: string; sub: string; z: number }[] = [
  { key: "v4", label: "UUIDv4", sub: "random", z: -2.7 },
  { key: "v7", label: "UUIDv7", sub: "time-ordered", z: 2.7 },
];
// The camera looks right of the scene, so the 3D sits in the left of the frame and the labels own the right column.
const BX0 = -6.2;
const BX1 = 0.9;
const CX = 2.2;
const GAP = 0.66;
const UNIT = 0.06;

const laneColor = (k: Key, rate: number, judged: boolean) => {
  if (!judged) return LIGHT;
  return k === "v7" ? GREEN : mix(LIGHT, RED, interpolate(rate, [20_000, 120_000], [1, 0], clamp));
};

const Lane: React.FC<{ k: Key; z: number; dim: number; judged: boolean }> = ({ k, z, dim, judged }) => {
  const frame = useCurrentFrame();
  const rows = rowsAt(frame, CUE.grows, CUE.rows);
  const rate = rateAt(k, rows);
  const color = laneColor(k, rate, judged);
  const p = phase(k, frame, CUE.grows, CUE.rows, UNIT);
  const v = speed(k, frame, CUE.grows, CUE.rows, UNIT);
  const len = BX1 - BX0;
  const n = Math.round(len / GAP);
  const gap = len / n;
  const glow = (0.15 + 0.5 * Math.min(1, v / 0.07)) * (1 - 0.7 * dim);
  // v4 only: once the index outgrows memory, pages come up from the disk one by one (each insert waits on a read).
  const reads = k === "v4" && frame > CUE.grows + 20;
  return (
    <group>
      <mesh position={[(BX0 + BX1) / 2 + 0.5, 0.05, z]}>
        <boxGeometry args={[len + 1, 0.1, 1.1]} />
        <meshStandardMaterial color="#2a2e34" roughness={0.7} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const x = BX0 + ((((p + i * gap) % len) + len) % len);
        const s = interpolate(x, [BX0, BX0 + 0.3, BX1 - 0.25, BX1], [0, 1, 1, 0], clamp);
        return (
          <mesh key={i} position={[x, 0.26, z]} scale={[s, s, s]}>
            <boxGeometry args={[0.44, 0.28, 0.9]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25 * (1 - 0.7 * dim)} roughness={0.35} metalness={0.1} transparent opacity={1 - 0.6 * dim} />
          </mesh>
        );
      })}
      {[0.38, 1.0, 1.62].map((y, i) => (
        <mesh key={i} position={[CX, y, z]}>
          <cylinderGeometry args={[0.78, 0.78, 0.52, 56]} />
          <meshStandardMaterial color="#23272d" emissive={color} emissiveIntensity={glow} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      {k === "v4" ? (
        <>
          {/* DISK: a dark slab under the floor line, behind the database */}
          <mesh position={[CX + 2.1, 0.18, z - 0.2]}>
            <boxGeometry args={[1.6, 0.36, 1.2]} />
            <meshStandardMaterial color="#30343b" emissive={RED} emissiveIntensity={reads ? 0.12 * (1 - dim) : 0} roughness={0.8} />
          </mesh>
          {reads
            ? Array.from({ length: 3 }, (_, i) => {
                // a page every 18 frames travels from the disk into the database, slowly
                const t = (((frame - CUE.grows - 20) / 54 + i / 3) % 1 + 1) % 1;
                return (
                  <mesh key={i} position={[CX + 2.1 - 2.1 * t, 0.5 + Math.sin(t * Math.PI) * 1.4, z]} rotation={[0, t * 1.2, 0]}>
                    <boxGeometry args={[0.36, 0.48, 0.06]} />
                    <meshStandardMaterial color={FG} emissive={RED} emissiveIntensity={0.5} transparent opacity={(1 - dim) * interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0])} />
                  </mesh>
                );
              })
            : null}
        </>
      ) : null}
      <pointLight position={[CX, 2.6, z + 0.7]} color={color} intensity={(6 * Math.min(1, v / 0.07) + 1) * (1 - 0.6 * dim)} distance={4.5} />
    </group>
  );
};

const Sfx: React.FC<{ name: string; from: number; volume?: number }> = ({ name, from, volume = 0.5 }) => (
  <Sequence from={from} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

export const LongHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = rowsAt(frame, CUE.grows, CUE.rows);
  const judged = frame >= CUE.grows + 30;
  const dim = interpolate(frame, [CUE.fix, CUE.fix + 20], [0, 1], clamp);
  const win = spring({ frame: frame - CUE.uuid, fps, config: { damping: 16, stiffness: 120 } });
  const x14 = spring({ frame: frame - (CUE.x14 - 3), fps, config: { damping: 14, stiffness: 200 } });
  const fadeIn = interpolate(frame, [0, 8], [0, 1], clamp);
  // Camera: a slow push-in and drift from the left, calm enough to read.
  const t = interpolate(frame, [0, HOOK_FRAMES], [0, 1], clamp);
  const pos: [number, number, number] = [1.5 + 0.9 * t, 9.6 - 0.6 * t, 13.4 - 1.2 * t];
  const look: [number, number, number] = [2.5, 0.2, 0.5];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("audio/long-03-hook-en.wav")} />
      <AbsoluteFill style={{ opacity: fadeIn }}>
        <ThreeCanvas width={LW} height={LH} style={{ position: "absolute", inset: 0 }} camera={{ fov: 38 }}>
          <Cam pos={pos} look={look} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[4, 9, 7]} intensity={2.2} />
          <directionalLight position={[-6, 4, -4]} intensity={0.6} color="#8fb4ff" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color={BG} roughness={0.95} />
          </mesh>
          <gridHelper args={[60, 60, "#2c3036", "#24272c"]} />
          {LANES.map((l) => (
            <Lane key={l.key} k={l.key} z={l.z} dim={l.key === "v4" ? dim : 0} judged={judged} />
          ))}
        </ThreeCanvas>
      </AbsoluteFill>

      {/* row counter, top left */}
      <div style={{ position: "absolute", top: 90, left: 120, opacity: fadeIn }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, color: MUTED }}>rows in the table</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 150, color: FG, letterSpacing: -3, lineHeight: 1.05 }}>{fmtRows(rows)}</div>
        <div style={{ marginTop: 10, width: 180, height: 10, borderRadius: 5, background: GOLD }} />
      </div>

      {/* lane labels and live rates, right side */}
      {LANES.map((l) => {
        const rate = rateAt(l.key, rows);
        const color = laneColor(l.key, rate, judged);
        const end = frame >= CUE.rows;
        const shown = end ? (l.key === "v4" ? 6600 : 93000) : round100(rate);
        const isV7 = l.key === "v7";
        const scale = isV7 ? 1 + 0.12 * win : 1;
        const op = isV7 ? 1 : 1 - 0.6 * dim;
        return (
          <div key={l.key} style={{ position: "absolute", left: 1800, top: isV7 ? 900 : 300, opacity: op * fadeIn, transform: `scale(${scale})`, transformOrigin: "left center" }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color, textShadow: "0 6px 24px #000" }}>
              {l.label}
              <div style={{ fontWeight: 400, fontSize: 48, color: MUTED, marginTop: -6 }}>{l.sub}</div>
            </div>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 104, color, textShadow: "0 6px 24px #000", opacity: interpolate(frame, [CUE.grows, CUE.grows + 10], [0.35, 1], clamp) }}>
              {fmt(shown)}
              <span style={{ fontSize: 52, color: MUTED, fontWeight: 400 }}> rows/s</span>
            </div>
            {isV7 ? (
              <div style={{ position: "absolute", inset: -24, borderRadius: 24, border: `6px solid ${GREEN}`, opacity: 0.85 * win, boxShadow: `0 0 60px ${GREEN}55` }} />
            ) : null}
          </div>
        );
      })}

      {/* the v4 lane's disk: pages are read from here once the index outgrows memory */}
      <div style={{ position: "absolute", left: 1400, top: 555, fontFamily: SANS, fontWeight: 700, fontSize: 40, color: MUTED, letterSpacing: 4, opacity: interpolate(frame, [CUE.grows + 20, CUE.grows + 35], [0, 1], clamp) * (1 - 0.6 * dim) }}>DISK</div>

      {/* 14x between the two rates */}
      {frame >= CUE.x14 - 3 ? (
        <div style={{ position: "absolute", left: 1800, top: 640, transform: `scale(${0.5 + 0.5 * x14})`, transformOrigin: "left center", opacity: Math.min(1, x14 * 2) * (1 - 0.3 * dim), fontFamily: MONO, fontWeight: 800, fontSize: 150, color: RED, textShadow: `0 0 50px ${RED}66` }}>
          14x <span style={{ fontFamily: SANS, fontSize: 64, fontWeight: 700 }}>slower</span>
        </div>
      ) : null}

      <Sfx name="whoosh" from={CUE.grows} volume={0.4} />
      <Sfx name="stamp" from={CUE.x14 - 3} volume={0.5} />
      <Sfx name="reveal" from={CUE.uuid} volume={0.35} />
    </AbsoluteFill>
  );
};

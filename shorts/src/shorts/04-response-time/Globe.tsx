// A dotted globe (Natural Earth land, tools/land_dots.py) with the client and the server pinned, the route between
// them as an arc, and packets that fly real round trips along it. Labels are flat HTML placed by projecting the 3D
// points with the same camera, so text never sits in perspective.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import land from "../../lib/land.json";
import { FG, GRAY, LIGHT, MONO, MUTED, SANS } from "../../theme";
import data from "./data.json";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (t: number) => 1 - (1 - t) ** 3;
export const sine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
export const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const shadow = "0 4px 18px #000";

const W = 1080;
const H = 1920;
const FOV = 38;
const rad = Math.PI / 180;

export const ll = (lat: number, lon: number, r = 1) =>
  new THREE.Vector3(r * Math.cos(lat * rad) * Math.sin(lon * rad), r * Math.sin(lat * rad), r * Math.cos(lat * rad) * Math.cos(lon * rad));

const CLIENT = ll(data.client.lat, data.client.lon);
const SERVER = ll(data.server.lat, data.server.lon);

// Face the middle of the route, north up: Sydney lands bottom right, Frankfurt top left.
const MID = CLIENT.clone().add(SERVER).normalize();
const MID_LAT = Math.asin(MID.y) / rad;
const MID_LON = Math.atan2(MID.x, MID.z) / rad;

const ARC_H = 0.3;
// Point on the route at u (0 = client, 1 = server), lifted off the surface in the middle.
export const arcPoint = (u: number, a = CLIENT, b = SERVER, h = ARC_H) => {
  const w = a.angleTo(b);
  const p = a
    .clone()
    .multiplyScalar(Math.sin((1 - u) * w))
    .add(b.clone().multiplyScalar(Math.sin(u * w)))
    .divideScalar(Math.sin(w));
  return p.multiplyScalar(1 + h * Math.sin(Math.PI * u));
};

// A view: camera distance, how far the globe sits below the frame centre (world units), and a small spin (degrees).
// face: the [lat, lon] that looks at the camera (default: the middle of the route).
export type View = { dist: number; drop: number; spin?: number; tilt?: number; face?: [number, number] };

const rotation = (v: View) => {
  const [lat, lon] = v.face ?? [MID_LAT, MID_LON];
  return new THREE.Euler((lat + (v.tilt ?? 0)) * rad, (-lon + (v.spin ?? 0)) * rad, 0, "XYZ");
};

const camFor = (v: View) => {
  const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 100);
  cam.position.set(0, v.drop, v.dist);
  cam.lookAt(0, v.drop, 0);
  cam.updateMatrixWorld();
  return cam;
};

// Screen position (px) of a point on the globe for this view.
export const project = (p: THREE.Vector3, v: View) => {
  const q = p.clone().applyEuler(rotation(v)).project(camFor(v));
  return { x: ((q.x + 1) / 2) * W, y: ((1 - q.y) / 2) * H };
};
export const clientAt = (v: View) => project(CLIENT, v);
export const serverAt = (v: View) => project(SERVER, v);

const Cam: React.FC<{ v: View }> = ({ v }) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(0, v.drop, v.dist);
    camera.lookAt(0, v.drop, 0);
    camera.updateProjectionMatrix();
  }, [camera, v.dist, v.drop]);
  return null;
};

const Dots: React.FC = () => {
  const mesh = useMemo(() => {
    const geo = new THREE.CircleGeometry(0.0085, 8);
    const mat = new THREE.MeshBasicMaterial({ color: "#59616c", side: THREE.DoubleSide });
    const m = new THREE.InstancedMesh(geo, mat, land.length);
    const o = new THREE.Object3D();
    (land as number[][]).forEach(([lat, lon], i) => {
      const p = ll(lat, lon, 1.001);
      o.position.copy(p);
      o.lookAt(p.clone().multiplyScalar(2));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, []);
  return <primitive object={mesh} />;
};

const Route: React.FC<{ color: string; opacity: number; draw: number }> = ({ color, opacity, draw }) => {
  const geo = useMemo(() => {
    const pts = Array.from({ length: 80 }, (_, i) => arcPoint(i / 79));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.005, 6, false);
  }, []);
  // Draw-on: only the first `draw` share of the tube's index buffer is rendered.
  const count = Math.floor((geo.index!.count / 3) * draw) * 3;
  useLayoutEffect(() => geo.setDrawRange(0, count), [geo, count]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
};

const Pin: React.FC<{ at: THREE.Vector3; color: string; pulse: number }> = ({ at, color, pulse }) => {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), at.clone().normalize()), [at]);
  const s = 1 + pulse * 1.6;
  return (
    <group position={at.clone().multiplyScalar(1.003)} quaternion={q}>
      <mesh>
        <circleGeometry args={[0.026, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh scale={[s, s, s]}>
        <ringGeometry args={[0.04, 0.05, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8 * (1 - pulse)} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// One packet flying a round trip: u goes 0 -> 1 (client to server) and back over [start, start + dur] frames.
export type Trip = { start: number; dur: number; color: string; size?: number };

const Packet: React.FC<{ trip: Trip; frame: number }> = ({ trip, frame }) => {
  const p = (frame - trip.start) / trip.dur;
  if (p < 0 || p > 1) return null;
  const there = p < 0.5;
  // Sine easing: a gentle start and stop, peak speed only 1.57x the average.
  const u = there ? sine(p * 2) : sine(2 - p * 2);
  const size = trip.size ?? 1;
  return (
    <group>
      {Array.from({ length: 7 }, (_, k) => {
        const uu = there ? u - k * 0.01 : u + k * 0.01;
        if (uu < 0 || uu > 1) return null;
        const r = 0.026 * size * (1 - k / 8);
        return (
          <mesh key={k} position={arcPoint(uu)}>
            <sphereGeometry args={[r, 12, 12]} />
            <meshBasicMaterial color={k === 0 ? FG : trip.color} transparent opacity={k === 0 ? 1 : 0.6 * (1 - k / 7)} />
          </mesh>
        );
      })}
      <mesh position={arcPoint(u)}>
        <sphereGeometry args={[0.055 * size, 16, 16]} />
        <meshBasicMaterial color={trip.color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

// Extra packets from anywhere to the server (the "under load" teaser).
export type Swarm = { from: THREE.Vector3; start: number; dur: number; color: string };

const SwarmPacket: React.FC<{ s: Swarm; frame: number }> = ({ s, frame }) => {
  const p = (frame - s.start) / s.dur;
  if (p < 0 || p > 1) return null;
  const u = sine(p);
  return (
    <mesh position={arcPoint(u, s.from, SERVER, 0.08)}>
      <sphereGeometry args={[0.026, 10, 10]} />
      <meshBasicMaterial color={s.color} />
    </mesh>
  );
};

export const Globe: React.FC<{
  v: View;
  trips?: Trip[];
  swarm?: Swarm[];
  route?: { color?: string; opacity?: number; draw?: number };
  serverGlow?: { color: string; amount: number };
  clientColor?: string;
}> = ({ v, trips = [], swarm = [], route = {}, serverGlow, clientColor = FG }) => {
  const frame = useCurrentFrame();
  const pulse = (frame % 45) / 45;
  return (
    <ThreeCanvas width={W} height={H} style={{ position: "absolute", inset: 0 }} camera={{ fov: FOV, position: [0, v.drop, v.dist] }}>
      <Cam v={v} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[-3, 4, 5]} intensity={1.4} />
      <group rotation={rotation(v)}>
        <mesh>
          <sphereGeometry args={[1, 96, 96]} />
          <meshStandardMaterial color="#23272e" roughness={0.9} />
        </mesh>
        <mesh scale={[1.035, 1.035, 1.035]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial color="#6f8fb3" transparent opacity={0.07} side={THREE.BackSide} />
        </mesh>
        <Dots />
        <Route color={route.color ?? LIGHT} opacity={route.opacity ?? 0.45} draw={route.draw ?? 1} />
        <Pin at={CLIENT} color={clientColor} pulse={pulse} />
        <Pin at={SERVER} color={serverGlow?.color ?? FG} pulse={(pulse + 0.5) % 1} />
        {serverGlow ? (
          <mesh position={SERVER.clone().multiplyScalar(1.01)}>
            <sphereGeometry args={[0.03 + 0.04 * serverGlow.amount, 16, 16]} />
            <meshBasicMaterial color={serverGlow.color} transparent opacity={0.6 * serverGlow.amount} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ) : null}
        {trips.map((t, i) => (
          <Packet key={i} trip={t} frame={frame} />
        ))}
        {swarm.map((s, i) => (
          <SwarmPacket key={i} s={s} frame={frame} />
        ))}
      </group>
    </ThreeCanvas>
  );
};

// A city label next to its pin: name, then the role in mono.
export const CityLabel: React.FC<{ at: { x: number; y: number }; name: string; role: string; side: "left" | "right"; opacity?: number; dy?: number }> = ({
  at,
  name,
  role,
  side,
  opacity = 1,
  dy = 0,
}) => (
  <div
    style={{
      position: "absolute",
      top: at.y - 40 + dy,
      ...(side === "right" ? { left: at.x + 34 } : { right: W - at.x + 34 }),
      textAlign: side === "right" ? "left" : "right",
      opacity,
    }}
  >
    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG, textShadow: shadow }}>{name}</div>
    <div style={{ fontFamily: MONO, fontSize: 30, color: MUTED, textShadow: shadow }}>{role}</div>
  </div>
);

export const SlowMo: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <div style={{ position: "absolute", left: 70, top: 1262, fontFamily: MONO, fontSize: 26, color: GRAY, opacity }}>slow motion</div>
);

export const fade = (frame: number, at: number, len = 8) => interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: ease });
export { CLIENT, SERVER };

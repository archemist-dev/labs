// Shared 3D helpers for the long-video scenes 8 and 9: the camera, lights and a projector that turns a world
// point into screen pixels, so HTML labels can follow the 3D objects while the camera moves.
import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { Audio, Sequence, staticFile } from "remotion";

export const LW = 2560;
export const LH = 1440;
export const FOV = 38;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const settle = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const sec = (s: number) => Math.round(s * 30);

export type V3 = [number, number, number];

export const Cam: React.FC<{ pos: V3; look: V3 }> = ({ pos, look }) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
  }, [camera, pos, look]);
  return null;
};

export const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.55} />
    <directionalLight position={[4, 9, 7]} intensity={2.2} />
    <directionalLight position={[-6, 4, -4]} intensity={0.6} color="#8fb4ff" />
  </>
);

export const Grid: React.FC<{ y?: number }> = ({ y = -0.02 }) => (
  <gridHelper args={[80, 80, "#2c3036", "#24272c"]} position={[0, y, 0]} />
);

// World point to pixel coordinates for the given camera (same maths as the canvas camera).
export const toScreen = (pos: V3, look: V3, world: V3) => {
  const cam = new THREE.PerspectiveCamera(FOV, LW / LH, 0.1, 200);
  cam.position.set(...pos);
  cam.lookAt(...look);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const v = new THREE.Vector3(...world).project(cam);
  return { x: ((v.x + 1) / 2) * LW, y: ((1 - v.y) / 2) * LH };
};

export const Sfx: React.FC<{ name: string; from: number; volume?: number }> = ({ name, from, volume = 0.4 }) => (
  <Sequence from={from} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

export const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(t))).join(",")})`;
};

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The parcel: one encoded message as a 3D object. A tray with its bytes laid along x, in proportion to the real sizes.
// JSON carries amber name tags beside every value (461 of its 1,076 bytes are field names); Protobuf carries a small
// dark field-number marker per value; Avro carries values only. Lengths are bytes / 250 world units.
import React from "react";
import { BG, GRAY, GREEN, LIGHT } from "../../theme";
import { AMBER, Block } from "./common";

export const U = 1 / 250; // world units per byte

export type Seg = { len: number; color: string; h?: number };

/** JSON: 6 name/value pairs, names 43% of the bytes. Protobuf: number marker + value. Avro: values only. */
export const layout = (kind: "json" | "proto" | "avro", bytes: number): Seg[] => {
  const n = 6;
  const per = bytes / n;
  if (kind === "json")
    return Array.from({ length: n }).flatMap(() => [
      { len: per * 0.43, color: AMBER, h: 0.42 },
      { len: per * 0.57, color: LIGHT, h: 0.62 },
    ]);
  if (kind === "proto")
    return Array.from({ length: n }).flatMap(() => [
      { len: per * 0.12, color: "#3a3f47", h: 0.3 },
      { len: per * 0.88, color: GREEN, h: 0.62 },
    ]);
  return Array.from({ length: n }).map(() => ({ len: per, color: GRAY, h: 0.62 }));
};

export const Parcel: React.FC<{
  x: number; // left edge
  y?: number;
  z: number;
  segs: Seg[];
  grow?: number; // 0..1, segments appear left to right
  dim?: number; // 0..1, fades toward the background
  depth?: number;
}> = ({ x, y = 0, z, segs, grow = 1, dim = 0, depth = 1.3 }) => {
  const gap = 0.05;
  const total = segs.reduce((a, s) => a + s.len * U + gap, 0);
  let cx = x;
  const shown = Math.ceil(segs.length * grow);
  return (
    <group>
      <Block p={[x + total / 2, y + 0.06, z]} s={[total + 0.2, 0.12, depth + 0.25]} color="#2a2e35" glow={0.02} opacity={1 - dim * 0.6} />
      {segs.map((s, i) => {
        const w = s.len * U;
        const p: [number, number, number] = [cx + w / 2 + gap / 2, y + 0.12 + (s.h ?? 0.6) / 2, z];
        cx += w + gap;
        if (i >= shown) return null;
        return <Block key={i} p={p} s={[w, s.h ?? 0.6, depth]} color={s.color} glow={0.14 * (1 - dim)} opacity={1 - dim * 0.7} />;
      })}
    </group>
  );
};

export const parcelLen = (segs: Seg[]) => segs.reduce((a, s) => a + s.len * U + 0.05, 0);

/** A belt under a row: a long dark strip with faint slats that slide with the parcel. */
export const Belt: React.FC<{ z: number; x0: number; x1: number; shift?: number }> = ({ z, x0, x1, shift = 0 }) => {
  const n = Math.floor((x1 - x0) / 0.8);
  return (
    <group>
      <Block p={[(x0 + x1) / 2, -0.06, z]} s={[x1 - x0, 0.08, 1.8]} color="#202328" glow={0} />
      {Array.from({ length: n }).map((_, i) => {
        const xx = x0 + (((i * 0.8 + shift) % (x1 - x0)) + (x1 - x0)) % (x1 - x0);
        return <Block key={i} p={[xx, -0.015, z]} s={[0.06, 0.01, 1.7]} color={BG} glow={0} />;
      })}
    </group>
  );
};

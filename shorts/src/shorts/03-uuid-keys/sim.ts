// Shared, deterministic motion for the week 3 Short 1 visual prototypes (A: 2D, B: 3D).
// Rates come from data.json (03-uuid-keys/video_data.py, run 1 of the lab log); nothing here is typed by hand.
import data from "./data.json";

export type Key = "v7" | "v4";

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
// The row counter steps in round numbers, so the digits don't flicker.
export const fmtRows = (n: number) => fmt(n >= 1_000_000 ? Math.floor(n / 250_000) * 250_000 : Math.floor(n / 50_000) * 50_000);
// Keys glide in and settle into their page instead of accelerating.
export const settle = (t: number) => 1 - (1 - t) ** 3;
// Live rates step in thousands so the digits stay calm; the spoken end values (6,600 and 93,000) are set by the scenes.
export const round100 = (n: number) => Math.round(n / 1000) * 1000;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Inserts per second at a given table size, interpolated between the lab's per-million windows.
export function rateAt(key: Key, rows: number) {
  const { rows: xs, rate } = data[key];
  if (rows <= xs[0]) return rate[0];
  for (let i = 1; i < xs.length; i++) {
    if (rows <= xs[i]) {
      const t = (rows - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return rate[i - 1] + t * (rate[i] - rate[i - 1]);
    }
  }
  return rate[rate.length - 1];
}

// Table size on screen: 0.2M -> 1M while the hook is spoken, 1M -> 10M from "ten" to "6,600", then 10M.
export function rowsAt(frame: number, ten: number, slow: number) {
  if (frame < ten) return 200_000 + 800_000 * clamp01(frame / Math.max(1, ten));
  if (frame < slow) return 1_000_000 + 9_000_000 * easeInOut((frame - ten) / Math.max(1, slow - ten));
  return 10_000_000;
}

const TOP = data.v7.rate[0];

// Belt speed (units per frame) follows the real insert rate; v7's first window is the reference speed.
export const speed = (key: Key, frame: number, ten: number, slow: number, unit: number) =>
  (unit * rateAt(key, rowsAt(frame, ten, slow))) / TOP;

// Distance travelled by a belt up to `frame` (the sum of its per-frame speeds).
export function phase(key: Key, frame: number, ten: number, slow: number, unit: number) {
  let p = 0;
  for (let f = 0; f < frame; f++) p += speed(key, f, ten, slow, unit);
  return p;
}

// ---- Index pages: where each new key lands --------------------------------------------------------------------

export type Page = { id: number; fill: number; hit: number; split: number; born: number };
export type Drop = { k: number; page: number; spawn: number; land: number; label: string };

export const FALL = 22; // frames a key takes to drop into its page (slow enough to read the ID)
const EVERY = 15; // a new key every half second
const STEP = { v7: 0.3, v4: 0.2 }; // share of a page one key fills (pages hold only a few keys on screen)
const V7_FULL = 0.9; // lab: v7 leaves end 90% full, v4 about 70%

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (n: number, len: number) => n.toString(16).padStart(len, "0").slice(-len);

// Replays the inserts up to `frame` (scene frames; keys start at `start`) and returns the pages and keys in flight.
// v7: every key goes to the last page; a page closes at 90% and a new one opens on the right.
// v4: every key goes to a random page; a page that overflows splits into two half-full pages.
export function simulate(key: Key, frame: number, start = 8) {
  const rand = mulberry32(key === "v4" ? 7 : 3);
  let nextId = 6;
  const pages: Page[] =
    key === "v7"
      ? Array.from({ length: 6 }, (_, i) => ({ id: i, fill: i < 5 ? V7_FULL : 0.3, hit: -99, split: -99, born: -99 }))
      : Array.from({ length: 6 }, (_, i) => ({ id: i, fill: 0.55 + 0.3 * rand(), hit: -99, split: -99, born: -99 }));
  const drops: Drop[] = [];
  // Replay in time order: landings at f, then the spawn at f picks its page from the pages as they are now.
  for (let f = start, k = 0; f <= frame; f++) {
    for (const d of drops) {
      if (d.land !== f) continue;
      // A time-ordered key always goes to the newest page, even if that page opened while the key was falling.
      const i = key === "v7" ? pages.length - 1 : pages.findIndex((p) => p.id === d.page);
      if (i < 0) continue;
      const p = pages[i];
      p.fill += STEP[key];
      p.hit = f;
      if (key === "v7" && p.fill >= V7_FULL - 1e-9) {
        p.fill = V7_FULL;
        pages.push({ id: nextId++, fill: 0, hit: -99, split: -99, born: f });
      }
      if (key === "v4" && p.fill > 1) {
        const half = p.fill / 2;
        p.fill = half;
        p.split = f;
        pages.splice(i + 1, 0, { id: nextId++, fill: half, hit: f, split: f, born: f });
      }
    }
    if ((f - start) % EVERY === 0) {
      const target = key === "v7" ? pages[pages.length - 1] : pages[Math.floor(rand() * pages.length)];
      const label = key === "v7" ? `019a${hex(0x3c10 + k, 4)}` : hex(Math.floor(rand() * 0xffffff), 6);
      drops.push({ k: k++, page: target.id, spawn: f, land: f + FALL, label });
    }
  }
  const last = pages[pages.length - 1].id;
  const inFlight = drops.filter((d) => d.land > frame).map((d) => (key === "v7" ? { ...d, page: last } : d));
  return { pages, inFlight };
}

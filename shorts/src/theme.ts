import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

// Same palette as the labs diagrams.py files: green = win, gray = neutral, red = bad, gold only under the title.
export const BG = "#1b1d21";
export const FG = "#f2efe9";
export const MUTED = "#8a8f98";
export const GRAY = "#5c6370";
export const LIGHT = "#9aa1ab";
export const GRID = "#2c3036";
export const GREEN = "#34c77b";
export const GREEN_BG = "#20352a";
export const RED = "#e5484d";
export const GOLD = "#d4a017";

const subsets: ("latin" | "latin-ext" | "cyrillic")[] = ["latin", "latin-ext", "cyrillic"];
export const SANS = loadInter("normal", { weights: ["400", "700", "800"], subsets }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "700", "800"], subsets }).fontFamily;

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// Safe zones on a 1080x1920 Short (YouTube Shorts and Instagram Reels overlays, 2026-11-09, Javlon: "eyes hurt";
// text and visuals in the right zones). The top bar (search, camera) covers y < 180; the action column (like,
// comment, share, remix) covers the right edge from about y 950; title, channel and music cover y > 1500.
// Content: x 70..1010 above y 950, x 70..930 below it, and nothing below y 1300 except the captions.
export const SAFE = { top: 200, left: 70, right: 1010, lowRight: 930, lowFrom: 950, bottom: 1300, captionTop: 1330 };

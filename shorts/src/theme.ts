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
// Content: x 80..1000 above y 900, x 80..890 below it, and nothing below y 1300 except the captions.
// 2026-11-20 (Javlon: text too close to the borders and under the app buttons on Instagram and YouTube): the Shell
// scaled every scene by up to 1.05, which pushed content laid out at x 80 to x 57 and the title up to y 188, and few
// scenes read SAFE at all. The Shell no longer scales; tools/safezone.py checks every render against these zones
// (keep ZONES there in step with SAFE). Full-bleed 3D backgrounds may cross the zones; text, numbers and cards may not.
export const SAFE = { top: 220, left: 80, right: 1000, lowRight: 890, lowFrom: 900, bottom: 1300, captionTop: 1330 };

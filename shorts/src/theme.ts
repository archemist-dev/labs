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

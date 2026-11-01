// Writes the HyperFrames project for Short 2 (week 2) from the script's cue markers and the paced narration's
// Whisper timings: index.html, one compositions/<scene>.html per scene, and captions.
// Usage (from shorts-hf/): node --experimental-strip-types build.mjs
// Numbers on screen come from 02-extract-first/README.md (typical order, 10,000 orders a day).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildTrack } from "../shorts/src/lib/track.ts";
import { short2 } from "./script.ts";

const OUT = "w2s2";
const BG = "#1b1d21", FG = "#f2efe9", MUTED = "#8a8f98", GRAY = "#5c6370", LIGHT = "#9aa1ab";
const GREEN = "#34c77b", GREEN_BG = "#20352a", RED = "#e5484d", GOLD = "#d4a017";

const transcript = JSON.parse(readFileSync("narration/paced.json", "utf8"));
const track = buildTrack(short2.en, transcript);
const D = Math.ceil(track.duration * 30) / 30;
const VOICE = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "narration/paced.wav"]).toString().trim();
const r = (n) => Math.round(n * 1000) / 1000;

mkdirSync(`${OUT}/compositions`, { recursive: true });
mkdirSync(`${OUT}/assets/sfx`, { recursive: true });
copyFileSync("narration/paced.wav", `${OUT}/assets/short2-en.wav`);
const SFX = ["impact", "reveal", "stamp", "whoosh", "buzz", "cricket"];
for (const s of SFX) copyFileSync(`../../labs/shorts/public/sfx/${s}.wav`, `${OUT}/assets/sfx/${s}.wav`);
const sfxLen = Object.fromEntries(
  SFX.map((s) => [s, +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${OUT}/assets/sfx/${s}.wav`]).toString().trim()]),
);

// ---------- shared scene pieces ----------
const baseCss = (id) => `
  #root { position: absolute; inset: 0; font-family: "Inter", sans-serif; color: ${FG}; }
  #${id}-cam { position: absolute; inset: 0; transform-origin: 50% 45%; }
  #${id}-flash { position: absolute; inset: 0; background: ${FG}; opacity: 0; }
  .${id}-t { position: absolute; left: 80px; top: 220px; right: 80px; }
  .${id}-t b { display: block; font-weight: 900; font-size: 72px; line-height: 1.05; }
  .${id}-t i { display: block; margin-top: 22px; width: 120px; height: 8px; border-radius: 4px; background: ${GOLD}; transform-origin: 0 50%; }
  .${id}-t u { display: block; margin-top: 22px; font-family: "JetBrains Mono", monospace; font-size: 32px; color: ${MUTED}; text-decoration: none; }
  .${id}-box { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; border: 4px solid ${LIGHT}; border-radius: 14px; font-weight: 700; font-size: 44px; line-height: 1.1; color: ${LIGHT}; }
  .${id}-mono { position: absolute; font-family: "JetBrains Mono", monospace; font-weight: 700; line-height: 1; white-space: nowrap; }
`;
const title = (id, text, sub) =>
  `<div class="${id}-t"><b>${text}</b><i id="${id}-line"></i>${sub ? `<u>${sub}</u>` : ""}</div>`;
const camJs = (id, dur, first, hasTitle = true) => `
  tl.fromTo("#${id}-cam", { opacity: ${first ? 1 : 0}, y: ${first ? 0 : 40}, scale: ${first ? 1.18 : 1} },
    { opacity: 1, y: 0, scale: 1, duration: ${first ? 0.33 : 0.27}, ease: "power3.out" }, 0);
  tl.to("#${id}-cam", { scale: 1.05, duration: ${r(dur)}, ease: "none" }, 0.33);
  tl.to("#${id}-cam", { opacity: 0, duration: 0.17, ease: "power1.in" }, ${r(dur - 0.17)});
  tl.fromTo("#${id}-flash", { opacity: ${first ? 0.95 : 0.12} }, { opacity: 0, duration: ${first ? 0.3 : 0.17}, ease: "none" }, 0);
  ${hasTitle ? `tl.fromTo("#${id}-line", { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "back.out(2)" }, 0.13);` : ""}
`;
const pop = (sel, at, d = 0.3) => `tl.fromTo("${sel}", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: ${d}, ease: "back.out(2)" }, ${r(at)});\n`;
const fade = (sel, at, d = 0.25) => `tl.fromTo("${sel}", { opacity: 0 }, { opacity: 1, duration: ${d}, ease: "power1.out" }, ${r(at)});\n`;
const box = (id, name, x, y, w, h, color, fill = "transparent", label = name, extra = "") =>
  `<div id="${id}-${name}" class="${id}-box" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-color:${color};color:${color};background:${fill};${extra}">${label}</div>`;
const mono = (id, name, text, x, y, size, color, extra = "") =>
  `<div id="${id}-${name}" class="${id}-mono" style="left:${x}px;top:${y}px;font-size:${size}px;color:${color};${extra}">${text}</div>`;

// ---------- scenes ----------
const MODS = ["menu", "orders", "payments", "couriers", "notifications"];
const monolith = (id, withLinks) => `
  <div style="position:absolute;left:80px;top:520px;width:560px;height:640px;border:4px solid ${GRAY};border-radius:18px"></div>
  ${MODS.map((m, i) => box(id, m, 110, 555 + i * 117, 500, 95, m === "orders" && withLinks ? LIGHT : LIGHT, BG)).join("\n")}`;

const scenes = {
  hook(id, dur, c) {
    // 30 pins along the courier's route, one every ~0.1 s, to show the logs piling up.
    const route = "M120,1190 C300,1000 520,1250 700,1070 S900,1010 980,1120";
    const pins = Array.from({ length: 30 }, (_, i) => `<circle id="${id}-pin${i}" r="9" fill="${RED}" cx="0" cy="0"/>`).join("");
    const end = c("n150", 3.2) + 0.2;
    return {
      html: `${title(id, "One order, two writers", "3 items · £11.99 · DELIVERED")}
        ${mono(id, "rows", "10", 80, 520, 190, LIGHT)}
        ${mono(id, "rowsl", "order rows", 84, 740, 44, LIGHT, "font-family:Inter,sans-serif;font-weight:700")}
        ${mono(id, "logs", "0", 560, 520, 190, RED)}
        ${mono(id, "logsl", "courier logs", 564, 740, 44, RED, "font-family:Inter,sans-serif;font-weight:700")}
        <div style="position:absolute;left:80px;top:940px;width:920px;height:320px;border:4px solid ${GRAY};border-radius:18px"></div>
        ${mono(id, "from", "restaurant", 110, 1210, 30, MUTED)}${mono(id, "to", "guest", 880, 1090, 30, MUTED)}
        <svg width="1080" height="1920" style="position:absolute;inset:0"><path id="${id}-route" d="${route}" fill="none" stroke="${GRAY}" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>${pins}<circle id="${id}-dot" r="20" fill="${GREEN}"/></svg>`,
      js: `
        const route = document.getElementById("${id}-route"); const L = route.getTotalLength();
        const at = (p) => route.getPointAtLength(L * p);
        const o = { p: 0, v: 0 };
        tl.fromTo("#${id}-rows", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 0.12);
        tl.to(o, { v: 150, duration: ${r(end - 0.2)}, ease: "power2.out", onUpdate: () => { document.getElementById("${id}-logs").textContent = Math.round(o.v); } }, 0.2);
        tl.to(o, { p: 1, duration: ${r(end - 0.2)}, ease: "power1.inOut", onUpdate: () => { const q = at(o.p); const d = document.getElementById("${id}-dot"); d.setAttribute("cx", q.x); d.setAttribute("cy", q.y); } }, 0.2);
        for (let i = 0; i < 30; i++) {
          const q = at((i + 1) / 31); const e = document.getElementById("${id}-pin" + i);
          e.setAttribute("cx", q.x); e.setAttribute("cy", q.y);
          tl.fromTo(e, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.15, transformOrigin: "50% 50%", ease: "back.out(3)" }, 0.2 + (i / 30) * ${r(end - 0.2)} * 0.9);
        }
        tl.fromTo("#${id}-dot", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.2);
        tl.to("#${id}-logs", { scale: 1.12, duration: 0.12, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, ${r(end)});
        tl.to("#${id}-rows", { scale: 1.1, duration: 0.12, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, ${r(c("orders", end + 1.5))});`,
    };
  },

  story(id, dur, c) {
    // orders' ten dependencies as red lines to the other boxes, then couriers lifts out on its word.
    const lines = [];
    const target = { menu: 0, payments: 2, couriers: 3, notifications: 4 };
    const n = { menu: 2, payments: 3, couriers: 3, notifications: 2 };
    let k = 0;
    for (const [m, i] of Object.entries(target))
      for (let j = 0; j < n[m]; j++) {
        const y0 = 555 + 1 * 117 + 47 + (k++ - 4.5) * 7;
        const y1 = 555 + i * 117 + 47 + (j - (n[m] - 1) / 2) * 18;
        lines.push(`<line class="${id}-dep" x1="610" y1="${y0}" x2="610" y2="${y1}" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>`);
      }
    return {
      html: `${title(id, "Which goes first?", "the monolith · 5 modules")}${monolith(id)}
        <svg width="1080" height="1920" style="position:absolute;inset:0">${lines.map((l, i) => l.replace('x1="610"', `x1="${610 + 18 + i * 3}"`).replace('x2="610"', `x2="${610 + 18 + i * 3}"`)).join("")}</svg>
        ${mono(id, "ten", "10", 700, 760, 130, RED)}${mono(id, "tenl", "dependencies", 700, 910, 36, RED)}`,
      js: `
        tl.to("#${id}-orders", { borderColor: "${RED}", color: "${RED}", duration: 0.25 }, ${r(c("orders", 1))});
        tl.fromTo(".${id}-dep", { opacity: 0 }, { opacity: 0.85, duration: 0.2, stagger: 0.03 }, ${r(c("orders", 1))});
        ${pop(`#${id}-ten`, c("orders", 1) + 0.2)}${pop(`#${id}-tenl`, c("orders", 1) + 0.3)}
        tl.to([".${id}-dep", "#${id}-ten", "#${id}-tenl"], { opacity: 0, duration: 0.2 }, ${r(c("couriers", 3.5) - 0.1)});
        tl.to("#${id}-couriers", { x: 420, duration: 0.5, ease: "back.out(1.4)", borderColor: "${GREEN}", color: "${GREEN}", backgroundColor: "${GREEN_BG}" }, ${r(c("couriers", 3.5))});`,
    };
  },

  path(id, dur, c) {
    const rows = [["menu", 520], ["orders", 700], ["payments", 880]];
    return {
      html: `${title(id, "Creating an order", "the order path")}
        <div style="position:absolute;left:60px;top:500px;width:6px;height:490px;background:${RED};border-radius:3px;opacity:0.7"></div>
        ${rows.map(([m, y]) => box(id, m, 110, y, 420, 110, LIGHT, BG, m) + mono(id, m + "s", "BLOCKS", 580, y + 34, 44, RED)).join("\n")}
        ${[[630], [810]].map(([y], i) => `<div class="${id}-ar" style="position:absolute;left:316px;top:${y}px;width:6px;height:70px;background:${GRAY};border-radius:3px"></div>`).join("")}
        <div style="position:absolute;left:80px;top:1040px;width:920px;height:0;border-top:4px dashed ${GRAY}"></div>
        ${mono(id, "off", "off the path", 80, 1066, 30, MUTED)}
        ${box(id, "couriers", 110, 1120, 420, 110, GREEN, GREEN_BG, "couriers")}${mono(id, "safe", "SAFE", 580, 1154, 44, GREEN)}`,
      js: `
        ${pop(`#${id}-menu`, c("menu", 1), 0.25)}${fade(`#${id}-menus`, c("menu", 1) + 0.2, 0.2)}
        ${pop(`#${id}-orders`, c("orders", 1.4), 0.25)}${fade(`#${id}-orderss`, c("orders", 1.4) + 0.2, 0.2)}
        ${pop(`#${id}-payments`, c("payments", 1.8), 0.25)}${fade(`#${id}-paymentss`, c("payments", 1.8) + 0.2, 0.2)}
        tl.fromTo(".${id}-ar", { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.15 }, ${r(c("orders", 1.4))});
        tl.to(["#${id}-menu", "#${id}-orders", "#${id}-payments"], { borderColor: "${RED}", color: "${RED}", duration: 0.25, stagger: 0.08 }, ${r(c("break", 3.5))});
        ${fade(`#${id}-off`, c("couriers", 5) - 0.2, 0.25)}${pop(`#${id}-couriers`, c("couriers", 5), 0.3)}${fade(`#${id}-safe`, c("couriers", 5) + 0.25, 0.2)}`,
    };
  },

  deps(id, dur, c) {
    const calls = [["assign", "ASSIGN", 670], ["status", "STATUS", 770], ["point", "DELIVERY POINT", 870]];
    return {
      html: `${title(id, "Couriers → orders", "its dependencies")}
        ${box(id, "co", 80, 560, 300, 380, GREEN, GREEN_BG, "couriers")}${box(id, "or", 700, 560, 300, 380, LIGHT, BG, "orders")}
        ${calls.map(([k, label, y]) => `<div id="${id}-${k}l" style="position:absolute;left:400px;top:${y}px;width:280px;height:6px;background:${LIGHT};border-radius:3px;transform-origin:0 50%"></div><div id="${id}-${k}h" style="position:absolute;left:662px;top:${y - 11}px;width:0;height:0;border-left:24px solid ${LIGHT};border-top:14px solid transparent;border-bottom:14px solid transparent"></div>` + mono(id, k, label, 400, y - 44, 30, LIGHT)).join("\n")}
        ${mono(id, "n", "3 calls", 80, 990, 80, FG)}
        ${box(id, "tables", 80, 1110, 600, 100, GREEN, GREEN_BG, "shared tables  0", "font-size:40px")}`,
      js: `
        ${calls.map(([k], i) => `tl.fromTo("#${id}-${k}l", { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, ${r(c(k, 1 + i))});
        tl.fromTo(["#${id}-${k}h", "#${id}-${k}"], { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${r(c(k, 1 + i))});`).join("\n")}
        ${pop(`#${id}-n`, c("calls", 7), 0.3)}${pop(`#${id}-tables`, c("tables", 8), 0.3)}`,
    };
  },

  safe(id, dur, c) {
    return {
      html: `${title(id, "Couriers go down", "orders keep coming")}
        ${box(id, "couriers", 140, 520, 420, 110, RED, BG, "couriers")}
        ${mono(id, "down", "DOWN", 600, 548, 54, RED)}
        ${box(id, "taken", 140, 690, 800, 110, GREEN, GREEN_BG, "ORDER TAKEN ✓")}
        ${box(id, "paid", 140, 820, 800, 110, GREEN, GREEN_BG, "PAID ✓")}
        ${box(id, "hand", 140, 950, 800, 110, LIGHT, BG, "DISPATCH BY HAND", "transform:rotate(-2deg)")}
        ${mono(id, "small", "small fleet only", 140, 1100, 44, RED)}${mono(id, "then", "back then: ok", 140, 1165, 44, GREEN)}`,
      js: `
        tl.fromTo("#${id}-down", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.3);
        ${pop(`#${id}-taken`, c("taken", 1))}${pop(`#${id}-paid`, c("paid", 2))}${pop(`#${id}-hand`, c("hand", 3.5), 0.25)}
        tl.to("#${id}-hand", { borderColor: "${RED}", color: "${RED}", duration: 0.25 }, ${r(c("notgood", 5))});
        ${fade(`#${id}-small`, c("small", 6), 0.25)}${fade(`#${id}-then`, c("okay", 8), 0.25)}`,
    };
  },

  growth(id, dur, c) {
    const dots = Array.from({ length: 150 }, (_, i) => `<i class="${id}-d" style="left:${80 + (i % 30) * 26}px;top:${630 + Math.floor(i / 30) * 26}px"></i>`).join("");
    const rowDots = Array.from({ length: 10 }, (_, i) => `<i class="${id}-o" style="left:${80 + i * 26}px;top:520px"></i>`).join("");
    return {
      html: `${title(id, "Rows per order")}
        <style>.${id}-d,.${id}-o{position:absolute;width:20px;height:20px;border-radius:50%;background:${RED}}.${id}-o{background:${LIGHT}}</style>
        ${rowDots}${mono(id, "ol", "order · 10 rows", 360, 515, 34, LIGHT)}
        ${mono(id, "cl", "courier · 150 logs", 80, 580, 34, RED)}${dots}
        ${mono(id, "day", "10,000 orders / day · 1 year", 80, 810, 32, MUTED)}
        ${mono(id, "ol2", "order data", 80, 870, 30, LIGHT)}
        <div id="${id}-b1" style="position:absolute;left:80px;top:910px;width:60px;height:64px;background:${LIGHT};border-radius:8px;transform-origin:0 50%"></div>
        ${mono(id, "v1", "36.5M", 160, 922, 44, LIGHT)}
        ${mono(id, "cl2", "location logs", 80, 1000, 30, RED)}
        <div id="${id}-b2" style="position:absolute;left:80px;top:1040px;width:920px;height:64px;background:${RED};border-radius:8px;transform-origin:0 50%"></div>
        ${mono(id, "v2", "548M", 100, 1052, 44, FG)}
        ${mono(id, "x15", "15x", 760, 770, 110, RED)}
        ${box(id, "easy", 80, 1160, 430, 110, GREEN, GREEN_BG, "writes 62/s ✓", "font-size:40px")}
        ${box(id, "size", 570, 1160, 430, 110, RED, BG, "size 55 GB/yr", "font-size:40px")}`,
      js: `
        ${pop(`#${id}-ol`, c("ten", 0.8), 0.25)}
        tl.fromTo(".${id}-o", { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.15, stagger: 0.04, ease: "back.out(3)" }, ${r(c("ten", 0.8))});
        ${pop(`#${id}-cl`, c("c150", 2), 0.25)}
        tl.fromTo(".${id}-d", { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.12, stagger: 0.008, ease: "back.out(3)" }, ${r(c("c150", 2))});
        ${fade(`#${id}-day`, c("day", 4))}${fade(`#${id}-ol2`, c("day", 4))}
        tl.fromTo("#${id}-b1", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, ${r(c("day", 4))});
        ${fade(`#${id}-v1`, c("day", 4) + 0.3)}
        ${fade(`#${id}-cl2`, c("half", 6))}
        tl.fromTo("#${id}-b2", { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power2.out" }, ${r(c("half", 6) - 0.2)});
        ${fade(`#${id}-v2`, c("half", 6) + 0.4)}
        ${pop(`#${id}-x15`, c("x15", 8), 0.35)}
        ${pop(`#${id}-easy`, c("easy", 10), 0.25)}${pop(`#${id}-size`, c("size", 11), 0.25)}`,
    };
  },

  fix(id, dur, c) {
    return {
      html: `${title(id, "Cheaper first", "location logs")}
        ${box(id, "s1", 80, 1000, 300, 150, LIGHT, BG, "keep<br>30 days")}
        ${box(id, "s2", 390, 880, 300, 270, LIGHT, BG, "split<br>by day")}
        ${box(id, "s3", 700, 760, 300, 390, GREEN, GREEN_BG, "own<br>database", "")}
        ${mono(id, "d1", "day 1", 770, 700, 40, GREEN)}
        ${mono(id, "hint", "cheaper ➜ bigger", 80, 1190, 34, MUTED)}`,
      js: `
        ${pop(`#${id}-s3`, c("db", 0.8), 0.3)}${fade(`#${id}-d1`, c("db", 0.8) + 0.2)}
        ${pop(`#${id}-s1`, c("thirty", 2.5), 0.25)}${pop(`#${id}-s2`, c("split", 3.5), 0.25)}${fade(`#${id}-hint`, c("split", 3.5) + 0.3)}`,
    };
  },

  copy(id, dur, c) {
    const arrows = Array.from({ length: 50 }, (_, i) => `<line class="${id}-a" x1="${400 + (i % 25) * 10.4}" y1="${1050 + Math.floor(i / 25) * 22}" x2="${400 + (i % 25) * 10.4}" y2="${1064 + Math.floor(i / 25) * 22}" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>`).join("");
    return {
      html: `${title(id, "One delivery address", "orders → couriers")}
        ${box(id, "o1", 80, 520, 300, 100, LIGHT, BG, "orders")}${box(id, "c1", 700, 520, 300, 100, GREEN, GREEN_BG, "couriers")}
        <div id="${id}-arrow" style="position:absolute;left:400px;top:568px;width:280px;height:6px;background:${GREEN};border-radius:3px;transform-origin:0 50%"></div>
        ${box(id, "chip", 410, 650, 260, 70, FG, "#23262b", "East Rd, CB1", "font-size:30px;color:#f2efe9")}
        ${mono(id, "one", "1 lookup", 420, 515, 36, GREEN, "opacity:0")}
        ${box(id, "o2", 80, 1010, 300, 100, LIGHT, BG, "orders")}${box(id, "c2", 700, 1010, 300, 100, RED, BG, "couriers")}
        <svg width="1080" height="1920" style="position:absolute;inset:0">${arrows}</svg>
        ${mono(id, "fifty", "50 lookups", 400, 1140, 54, RED)}
        ${mono(id, "lab1", "copy once", 80, 770, 34, GREEN)}${mono(id, "lab2", "every refresh", 80, 940, 34, RED)}`,
      js: `
        tl.fromTo("#${id}-arrow", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.out" }, ${r(c("once", 1.5))});
        tl.fromTo("#${id}-chip", { opacity: 0, x: -300 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, ${r(c("once", 1.5))});
        ${fade(`#${id}-lab1`, c("once", 1.5) + 0.3)}
        ${fade(`#${id}-lab2`, c("fifty", 4))}${pop(`#${id}-o2`, c("fifty", 4) - 0.2)}${pop(`#${id}-c2`, c("fifty", 4) - 0.2)}
        tl.fromTo(".${id}-a", { opacity: 0 }, { opacity: 1, duration: 0.08, stagger: 0.03 }, ${r(c("fifty", 4))});
        ${fade(`#${id}-fifty`, c("fifty", 4) + 0.2)}
        tl.to("#${id}-one", { opacity: 1, duration: 0.2 }, ${r(c("one", 6))});
        tl.fromTo("#${id}-one", { scale: 0.7 }, { scale: 1.25, duration: 0.3, ease: "back.out(2)", transformOrigin: "0 50%" }, ${r(c("one", 6))});`,
    };
  },

  production(id, dur, c) {
    return {
      html: `<svg width="620" height="709" viewBox="0 0 420 480" style="position:absolute;left:230px;top:430px">
          <rect x="20" y="20" width="380" height="440" rx="36" fill="#262a30" stroke="${LIGHT}" stroke-width="6"/>
          ${[330, 370, 410].map((y) => `<line x1="70" y1="${y}" x2="350" y2="${y}" stroke="${GRAY}" stroke-width="6" stroke-linecap="round"/>`).join("")}
          ${[140, 280].map((cx) => `<g><circle cx="${cx}" cy="160" r="34" fill="${FG}"/><circle cx="${cx}" cy="170" r="14" fill="${BG}"/><rect class="${id}-lid" x="${cx - 40}" y="120" width="80" height="26" fill="#262a30"/><line class="${id}-lidl" x1="${cx - 38}" y1="146" x2="${cx + 38}" y2="146" stroke="${LIGHT}" stroke-width="6" stroke-linecap="round"/></g>`).join("")}
          <line x1="160" y1="255" x2="260" y2="255" stroke="${LIGHT}" stroke-width="8" stroke-linecap="round"/>
        </svg>
        ${mono(id, "name", "PRODUCTION", 330, 1180, 44, MUTED)}`,
      js: `
        tl.fromTo("#${id}-name", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
        tl.to(".${id}-lid", { attr: { height: 40 }, duration: 0.06, yoyo: true, repeat: 1 }, ${r(c("bold", 2.5) + 0.5)});
        tl.to(".${id}-lidl", { attr: { y1: 160, y2: 160 }, duration: 0.06, yoyo: true, repeat: 1 }, ${r(c("bold", 2.5) + 0.5)});`,
    };
  },

  close(id, dur, c) {
    return {
      html: `${title(id, "Supporting first", "free the core")}${monolith(id)}
        ${mono(id, "core", "core", 690, 698, 44, GREEN, "opacity:0")}
        ${mono(id, "rows", "10", 80, 1230, 90, LIGHT)}${mono(id, "logs", "150", 560, 1230, 90, RED)}`,
      js: `
        tl.to("#${id}-orders", { borderColor: "${FG}", color: "${FG}", duration: 0.3 }, 0.2);
        tl.to(["#${id}-couriers", "#${id}-notifications"], { x: 420, duration: 0.5, ease: "back.out(1.4)", borderColor: "${GREEN}", color: "${GREEN}", backgroundColor: "${GREEN_BG}", stagger: 0.15 }, ${r(c("support", 1.5))});
        ${fade(`#${id}-core`, c("core", 3), 0.3)}
        tl.to("#${id}-orders", { borderColor: "${GREEN}", color: "${GREEN}", duration: 0.4 }, ${r(c("core", 3))});
        ${fade(`#${id}-rows`, c("core", 3) + 0.3)}${fade(`#${id}-logs`, c("core", 3) + 0.3)}`,
    };
  },
};

// ---------- sound effects: [scene, cue, effect, volume] ----------
const SFX_GAIN = 0.35;
const sfxAt = [
  ["hook", null, "impact", 0.7, 0],
  ["hook", "n150", "reveal", 0.35],
  ["path", "break", "stamp", 0.35],
  ["path", "couriers", "reveal", 0.35],
  ["deps", "tables", "reveal", 0.35],
  ["safe", "taken", "reveal", 0.35],
  ["safe", "hand", "stamp", 0.35],
  ["growth", "half", "reveal", 0.35],
  ["growth", "x15", "stamp", 0.4],
  ["fix", "db", "reveal", 0.35],
  ["copy", "one", "reveal", 0.35],
  ["production", "bold", "buzz", 0.5],
  ["close", "core", "reveal", 0.35],
];

// ---------- write scene files ----------
const hosts = [];
track.beats.forEach((b, i) => {
  const id = `sc-${b.scene}`;
  const dur = b.end - b.start;
  const cues = Object.fromEntries(Object.entries(b.cues).map(([k, t]) => [k, t - b.start]));
  const c = (name, fallback) => cues[name] ?? fallback;
  const s = scenes[b.scene](id.replace("sc-", ""), dur, c);
  const sid = id.replace("sc-", "");
  writeFileSync(
    `${OUT}/compositions/${id}.html`,
    `<template>
  <style>${baseCss(sid)}</style>
  <div id="root" data-composition-id="${id}" data-width="1080" data-height="1920">
    <div id="${sid}-cam">${s.html}</div>
    <div id="${sid}-flash"></div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${camJs(sid, dur, i === 0, s.html.includes(`${sid}-line`))}
    ${s.js}
    window.__timelines["${id}"] = tl;
  </script>
</template>
`,
  );
  hosts.push({ id, start: b.start, dur, sid });
});

// ---------- captions ----------
const words = track.beats.flatMap((b) => b.words);
const chunks = [];
let cur = [];
for (const w of words) {
  cur.push(w);
  if (cur.length === 3 || /[.?!,:]$/.test(w.text)) { chunks.push(cur); cur = []; }
}
if (cur.length) chunks.push(cur);
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let capHtml = "", capJs = "";
chunks.forEach((ch, i) => {
  const open = Math.max(0.1, ch[0].start - 0.05);
  const close = Math.min(ch[ch.length - 1].end + 0.5, chunks[i + 1] ? Math.max(open + 0.2, chunks[i + 1][0].start - 0.05) : D);
  capHtml += `<div id="cap${i}" class="cap">${ch.map((w, j) => `<span id="cap${i}w${j}">${esc(w.text)}</span>`).join(" ")}</div>\n`;
  capJs += `tl.set("#cap${i}", { opacity: 1, visibility: "visible" }, ${r(open)});\n`;
  ch.forEach((w, j) => {
    capJs += `tl.fromTo("#cap${i}w${j}", { color: "${MUTED}", opacity: 0.5, scale: 1 }, { color: "${FG}", opacity: 1, scale: 1.06, duration: 0.1, ease: "power2.out", overwrite: "auto" }, ${r(Math.max(open, w.start))});\n`;
    const nextStart = ch[j + 1] ? ch[j + 1].start : close;
    capJs += `tl.to("#cap${i}w${j}", { scale: 1, duration: 0.1, overwrite: "auto" }, ${r(Math.max(open + 0.1, nextStart + 0.12))});\n`;
  });
  capJs += `tl.to("#cap${i}", { opacity: 0, duration: 0.1, ease: "power2.in" }, ${r(close - 0.1)});\ntl.set("#cap${i}", { opacity: 0, visibility: "hidden" }, ${r(close)});\n`;
});
writeFileSync(
  `${OUT}/compositions/captions.html`,
  `<template>
  <style>
    #root { position: absolute; inset: 0; }
    .cap { position: absolute; top: 1330px; left: 60px; right: 60px; text-align: center; font-family: "Inter", sans-serif; font-weight: 900; font-size: 70px; line-height: 1.15; opacity: 0; visibility: hidden; text-shadow: 0 4px 18px rgba(0,0,0,.7); }
    .cap span { display: inline-block; margin: 0 18px; }
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-caption-zone>
    ${capHtml}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${capJs}
    window.__timelines["captions"] = tl;
  </script>
</template>
`,
);

// ---------- root ----------
const hostHtml = hosts
  .map((h, i) => `    <div id="${h.id}" data-composition-id="${h.id}" data-composition-src="compositions/${h.id}.html" data-start="${r(h.start)}" data-duration="${r(h.dur)}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>`)
  .join("\n");
const sfxHtml = sfxAt
  .map(([scene, cue, name, vol, fixed], i) => {
    const b = track.beats.find((x) => x.scene === scene);
    const t = fixed ?? b.cues[cue];
    return `    <audio id="sfx-${i}-${name}" src="assets/sfx/${name}.wav" data-start="${r(t + (fixed === undefined ? 0.03 : 0))}" data-duration="${r(Math.min(sfxLen[name], D - t))}" data-track-index="${3 + (i % 3)}" data-volume="${r(vol * SFX_GAIN)}"></audio>`;
  })
  .join("\n");
writeFileSync(
  `${OUT}/index.html`,
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      #bg { position: absolute; inset: 0; background: ${BG}; }
      #progress { position: absolute; left: 0; top: 0; height: 8px; width: 1080px; background: ${FG}; opacity: 0.35; transform-origin: 0 50%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${r(D)}" data-width="1080" data-height="1920">
    <div id="bg"></div>
${hostHtml}
    <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${r(D)}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920"></div>
    <div id="progress" class="clip" data-start="0" data-duration="${r(D)}" data-track-index="6"></div>
    <audio id="voice" src="assets/short2-en.wav" data-start="0" data-duration="${r(VOICE)}" data-track-index="7" data-volume="1"></audio>
${sfxHtml}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: ${r(D)}, ease: "none" }, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`,
);
console.log(`built ${hosts.length} scenes, ${chunks.length} caption groups, ${r(D)} s`);
hosts.forEach((h) => console.log(`  ${h.id.padEnd(14)} ${r(h.start)} -> ${r(h.start + h.dur)}`));

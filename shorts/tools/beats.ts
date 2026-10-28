// Prints where each beat of a script starts in a recording, for tools/pace.py, and how long the pause before each
// new scene must be so the previous scene's last element stays readable: a beat's `hold` (default HOLD) counts from
// the scene's last cue, and the next scene takes over SWITCH before its first word.
// Usage: node --experimental-strip-types tools/beats.ts src/shorts/01-payload-encoding/script.ts short1 en transcript.json > beats.json
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildTrack } from "../src/lib/track.ts";

const [scriptPath, exportName, lang, transcriptPath] = process.argv.slice(2);
const scripts = (await import(pathToFileURL(resolve(scriptPath)).href))[exportName];
const HOLD = 1.5;
const SWITCH = 0.3; // as in src/lib/track.ts
const script = scripts[lang];
const track = buildTrack(script, JSON.parse(readFileSync(transcriptPath, "utf8")));
let lastCue = 0; // the latest cue of the current scene, in seconds
const beats = track.beats.map((b, k) => {
  const change = k > 0 && b.scene !== track.beats[k - 1].scene;
  let need = 0;
  if (change) {
    const prev = track.beats[k - 1];
    need = Math.max(0, lastCue + (script[k - 1].hold ?? HOLD) + SWITCH - prev.words[prev.words.length - 1].end);
    lastCue = 0;
  }
  const cues = Object.values(b.cues);
  lastCue = Math.max(lastCue, ...(cues.length ? cues : [b.words[b.words.length - 1].start]));
  return { start: b.words[0].start, scene: b.scene, change, need: Math.round(need * 100) / 100 };
});
console.log(JSON.stringify(beats.slice(1)));

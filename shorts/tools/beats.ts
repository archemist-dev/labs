// Prints where each beat of a script starts in a recording, for tools/pace.py.
// Usage: node --experimental-strip-types tools/beats.ts src/shorts/01-payload-encoding/script.ts short1 en transcript.json > beats.json
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildTrack } from "../src/lib/track.ts";

const [scriptPath, exportName, lang, transcriptPath] = process.argv.slice(2);
const scripts = (await import(pathToFileURL(resolve(scriptPath)).href))[exportName];
const track = buildTrack(scripts[lang], JSON.parse(readFileSync(transcriptPath, "utf8")));
const beats = track.beats.map((b, k) => ({ start: b.words[0].start, scene: b.scene, change: k > 0 && b.scene !== track.beats[k - 1].scene }));
console.log(JSON.stringify(beats.slice(1)));

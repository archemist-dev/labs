import { staticFile } from "remotion";
import { buildTrack, type Beat } from "./track";
import { FPS } from "../theme";
import type { ShortProps } from "../components/Shell";

// Effects from the playbook's sound table; drop files named like this into public/sfx/.
const SFX = ["stamp", "reveal", "buzz", "whoosh", "slap", "cricket", "impact", "alarm", "type"];
const AUDIO_EXT = ["wav", "m4a", "mp3"];

async function exists(path: string) {
  try {
    const res = await fetch(staticFile(path), { method: "HEAD" });
    return res.ok && !(res.headers.get("content-type") ?? "").includes("text/html");
  } catch {
    return false;
  }
}

async function firstExisting(paths: string[]) {
  for (const p of paths) if (await exists(p)) return p;
  return null;
}

async function json(path: string) {
  try {
    const res = await fetch(staticFile(path));
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Finds the voice, its transcript and the effects for one Short, then times the script to them.
export async function loadShort(props: ShortProps, script: Beat[]) {
  const base = `${props.id}-${props.lang}`;
  const transcript = await json(`transcripts/${base}.json`);
  const audio = await firstExisting(AUDIO_EXT.map((e) => `audio/${base}.${e}`));
  const sfx: Record<string, string> = {};
  for (const name of SFX) {
    const path = await firstExisting([`sfx/${name}.wav`, `sfx/${name}.mp3`]);
    if (path) sfx[name] = path;
  }
  const track = buildTrack(script, transcript);
  return { durationInFrames: Math.ceil(track.duration * FPS), props: { ...props, track, audio, sfx } };
}

// Turns a script (beats of text with {cue} markers) into timings.
// With a Whisper transcript the timings follow the real voice; without one they are estimated at a calm pace.

export type Beat = { scene: string; text: string };
export type Word = { text: string; start: number; end: number }; // seconds
export type TimedBeat = { scene: string; start: number; end: number; words: Word[]; cues: Record<string, number> };
export type Track = { beats: TimedBeat[]; duration: number; estimated: boolean };

const WPS = 2.6; // words per second, calm pace
const LEAD = 0.4;
const GAP = 0.45; // pause between beats when estimating
const TAIL = 1.0; // hold after the last word
const SWITCH = 0.3; // a new scene appears this long before its first word, inside the pause

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// "Orders has {ten}ten." -> words ["Orders", "has", "ten."], cues { ten: 2 }
export function parse(text: string) {
  const words: string[] = [];
  const cues: Record<string, number> = {};
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const w = raw.replace(/\{(\w+)\}/g, (_, name: string) => {
      cues[name] = words.length;
      return "";
    });
    if (w) words.push(w);
  }
  return { words, cues };
}

// Accepts openai-whisper / faster-whisper JSON ({segments: [{words}]}) or a flat {words: [...]}.
export function wordsFromTranscript(json: any): Word[] {
  const raw = json.words ?? (json.segments ?? []).flatMap((s: any) => s.words ?? []);
  return raw
    .map((w: any) => ({ text: String(w.word ?? w.text).trim(), start: w.start, end: w.end }))
    .filter((w: Word) => w.text);
}

function estimate(script: Beat[]): Track {
  let t = LEAD;
  const beats = script.map((b) => {
    const { words, cues } = parse(b.text);
    const start = t;
    const timed = words.map((text) => {
      const w = { text, start: t, end: t + 1 / WPS };
      t += 1 / WPS + (/[.?!]$/.test(text) ? 0.3 : /[,:]$/.test(text) ? 0.12 : 0);
      return w;
    });
    t += GAP;
    return { scene: b.scene, start, end: t, words: timed, cues: cueTimes(cues, timed, start) };
  });
  beats[0].start = 0;
  beats[beats.length - 1].end += TAIL;
  return { beats, duration: beats[beats.length - 1].end, estimated: true };
}

function cueTimes(cues: Record<string, number>, words: Word[], fallback: number) {
  return Object.fromEntries(
    Object.entries(cues).map(([name, i]) => [name, words[Math.min(i, words.length - 1)]?.start ?? fallback]),
  );
}

// Finds where each beat starts in the spoken words: its first two words, searched just after the previous beat.
function align(script: Beat[], spoken: Word[]): Track {
  const parsed = script.map((b) => parse(b.text));
  const starts: number[] = [];
  let p = 0;
  for (const { words } of parsed) {
    const a = norm(words[0]);
    const b = norm(words[1] ?? "");
    const window = spoken.slice(p, p + 15).map((w) => norm(w.text));
    let i = window.findIndex((w, j) => w === a && (!b || window[j + 1] === b));
    if (i < 0) i = window.indexOf(a);
    const at = p + Math.max(i, 0);
    starts.push(at);
    p = at + Math.max(1, words.length - 3);
  }
  const beats = script.map((b, k) => {
    const heard = spoken.slice(starts[k], starts[k + 1] ?? spoken.length);
    // Captions keep the script's words (Whisper misspells Uzbek); the voice only gives the timing.
    const mine = parsed[k].words;
    const words = mine.map((text, i) => {
      const w = heard[Math.min(heard.length - 1, Math.floor((i * heard.length) / mine.length))];
      return { text, start: w.start, end: w.end };
    });
    const start = k === 0 ? 0 : Math.max(0, words[0].start - SWITCH);
    return { scene: b.scene, start, end: 0, words, cues: cueTimes(parsed[k].cues, words, start) };
  });
  beats.forEach((b, k) => (b.end = beats[k + 1]?.start ?? spoken[spoken.length - 1].end + TAIL));
  return { beats, duration: beats[beats.length - 1].end, estimated: false };
}

export function buildTrack(script: Beat[], transcript: any | null): Track {
  const spoken = transcript ? wordsFromTranscript(transcript) : [];
  return spoken.length ? align(script, spoken) : estimate(script);
}

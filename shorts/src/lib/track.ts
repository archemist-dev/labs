// Turns a script (beats of text with {cue} markers) into timings.
// With a Whisper transcript the timings follow the real voice; without one they are estimated at a calm pace.

// hold: seconds the scene's last element stays on screen before the next scene (tools/beats.ts, default 1.5).
export type Beat = { scene: string; text: string; hold?: number };
export type Word = { text: string; start: number; end: number }; // seconds
export type TimedBeat = { scene: string; start: number; end: number; words: Word[]; cues: Record<string, number> };
export type Track = { beats: TimedBeat[]; duration: number; estimated: boolean };

const WPS = 2.6; // words per second, calm pace
const LEAD = 0.4;
const GAP = 0.45; // pause between beats when estimating
const TAIL = 2.0; // hold after the last word: the end card needs reading time
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

// Spoken forms Whisper writes differently from the script.
const SAME: Record<string, string> = { "0": "zero", "46": "fortysix", jason: "json" };
const key = (s: string) => {
  const n = norm(s);
  return SAME[n] ?? n;
};

// Times each script word by the spoken word it matches, searched a few words ahead, so a cue lands on its word even
// when Whisper splits words differently ("total price" for totalPrice, "46" for forty-six). Words that don't match
// are placed between their matched neighbours.
function matchWords(mine: string[], heard: Word[]): Word[] {
  const at: (number | null)[] = mine.map(() => null);
  let p = 0;
  mine.forEach((text, i) => {
    const k = key(text);
    for (let j = p; j < Math.min(heard.length, p + 5); j++) {
      const one = key(heard[j].text);
      const two = j + 1 < heard.length ? one + key(heard[j + 1].text) : "";
      if (one === k || two === k) {
        at[i] = j;
        p = j + (two === k ? 2 : 1);
        return;
      }
    }
  });
  return mine.map((text, i) => {
    if (at[i] !== null) {
      const w = heard[at[i]!];
      return { text, start: w.start, end: w.end };
    }
    let lo = i - 1;
    while (lo >= 0 && at[lo] === null) lo--;
    let hi = i + 1;
    while (hi < mine.length && at[hi] === null) hi++;
    const a = lo >= 0 ? at[lo]! + 1 : 0;
    const b = hi < mine.length ? at[hi]! - 1 : heard.length - 1;
    const j = Math.min(heard.length - 1, Math.max(0, Math.round(a + ((i - lo) / (hi - lo)) * Math.max(0, b - a))));
    return { text, start: heard[j].start, end: heard[j].end };
  });
}

// Finds where each beat starts in the spoken words: its first two words, searched just after the previous beat.
function align(script: Beat[], spoken: Word[]): Track {
  const parsed = script.map((b) => parse(b.text));
  const starts: number[] = [];
  let p = 0;
  for (const { words } of parsed) {
    const a = key(words[0]);
    const b = words[1] ? key(words[1]) : "";
    const window = spoken.slice(p, p + 15).map((w) => key(w.text));
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
    const words = matchWords(mine, heard);
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

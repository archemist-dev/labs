"""Set the rhythm of a narration: every pause gets a deliberate length.

Usage: python tools/pace.py IN.wav TRANSCRIPT.json BEATS.json OUT.wav
BEATS.json comes from tools/beats.ts. Pauses inside a sentence and between sentences are shortened to a natural
length (never lengthened); before a new beat the pause is set to BEAT, before a new scene to SCENE, adding room
tone when the recording's pause is shorter.

Edits happen only inside continuous silence (Whisper finds the gap, the loudness finds the silence in it), so no
word is ever cut; words that run together keep their gap. Every join is an equal-power crossfade and the room tone
loops with crossfades, so there are no clicks.
"""
import json
import sys
import wave

import numpy as np

src, tr, beats_path, out = sys.argv[1:5]
PHRASE, SENTENCE, BEAT, SCENE = 0.24, 0.38, 0.6, 0.85  # seconds of silence between words
MIN_SILENCE = 0.08  # shorter gaps are left alone
MIN_SCENE = 4.0  # a shorter scene gets the difference added to the pause after it
XFADE, HOP = 0.03, 0.01

with wave.open(src) as w:
    rate, ch = w.getframerate(), w.getnchannels()
    pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).astype(np.float32)
mono = pcm.mean(axis=1)
hop = int(HOP * rate)
db = np.array([20 * np.log10(np.sqrt((mono[i:i + hop] ** 2).mean()) + 1) for i in range(0, len(mono) - hop, hop)])
quiet = db < np.percentile(db, 10) + 6  # 6 dB above the room noise floor; soft word endings sit just above it
words = [x for s in json.load(open(tr, encoding="utf-8"))["segments"] for x in s["words"]]
beats = json.load(open(beats_path, encoding="utf-8"))
X = int(XFADE * rate)
up = np.sin(np.linspace(0, np.pi / 2, X))[:, None]  # equal-power ramps: both sides of a join are room noise
down = np.cos(np.linspace(0, np.pi / 2, X))[:, None]


def join(a, b):
    if len(a) < X or len(b) < X:
        return np.concatenate([a, b])
    return np.concatenate([a[:-X], a[-X:] * down + b[:X] * up, b[X:]])


def quiet_runs(lo, hi):
    runs, k = [], lo
    while k < hi:
        if quiet[k]:
            j = k
            while j < hi and quiet[j]:
                j += 1
            runs.append((k, j))
            k = j
        else:
            k += 1
    return runs


# Room tone: the longest run of real room noise, looped with crossfades. Digital silence (zero padding at the
# file's ends) doesn't count: looped in, it plays as a dropout.
live = db > 10
room = [r for r in quiet_runs(0, len(quiet)) if live[r[0]:r[1]].all() and r[1] - r[0] > 10]
if room:
    r0, r1 = max(room, key=lambda r: r[1] - r[0])
    tone_src = pcm[(r0 + 3) * hop:(r1 - 3) * hop]
else:  # a studio-clean take (TTS): its pauses are silence already, so silence is the room tone
    tone_src = np.zeros((int(0.5 * rate), ch), dtype=np.float32)
    live[:] = True  # and there are no dropouts to fill


def tone(seconds):
    n = int(seconds * rate) + X  # X extra: the crossfade into the next piece eats it
    buf = tone_src.copy()
    while len(buf) < n:
        buf = join(buf, tone_src)
    return buf[:n]


# Dropouts: stretches of digital silence inside the recording (splices between takes) are filled with room tone,
# crossfaded in and out, so the room never cuts to dead air. Timing is unchanged.
k = 1
while k < len(live):
    if not live[k]:
        j = k
        while j < len(live) and not live[j]:
            j += 1
        lo, hi = max(0, k * hop - X), min(len(pcm), j * hop + X)
        fill = tone((hi - lo) / rate)[:hi - lo]
        ramp = np.r_[np.linspace(0, 1, X), np.ones(max(0, hi - lo - 2 * X)), np.linspace(1, 0, X)][:hi - lo, None]
        pcm[lo:hi] = pcm[lo:hi] * (1 - ramp) + fill * ramp
        k = j
    else:
        k += 1


def pause_kind(a, b):
    scene_start = 0.0
    for beat in beats:
        if abs(beat["start"] - b["start"]) < 0.02:
            if not beat["change"]:
                return BEAT
            # at least SCENE; longer when the scene is short, or when its last element needs reading time
            return max(SCENE + max(0.0, MIN_SCENE - (a["end"] - scene_start + SCENE)), beat.get("need", 0.0))
        if beat["change"]:
            scene_start = beat["start"]
    return SENTENCE if a["word"].strip()[-1:] in ".?!" else PHRASE


# Edits on the input timeline: (seconds, ("cut", until)) or (seconds, ("tone", length)).
edits = []
for a, b in zip(words, words[1:]):
    # Whisper sometimes folds a pause into the next word ("So" 0.76 s long), so look up to 0.5 s into it;
    # the longest quiet run wins, and a pause is far longer than a consonant's closure.
    runs = quiet_runs(int((a["end"] - 0.05) / HOP), min(int(min(b["start"] + 0.5, b["end"] - 0.1) / HOP), len(quiet)))
    if not runs:
        continue
    s0, s1 = (v * HOP for v in max(runs, key=lambda r: r[1] - r[0]))
    have, want = s1 - s0, pause_kind(a, b)
    if have < MIN_SILENCE:
        continue
    # Soft starts ("th", "s") sit below the quiet threshold, so the run can end inside them: keep 0.22 s before.
    before = max(want / 2, 0.22)
    after = max(want - before, 0.08)  # the run starts where the word's sound has already died away
    if have > after + before + 0.03:  # shorten
        edits.append((s0 + after, ("cut", s1 - before)))
    elif want >= BEAT and want - have > 0.05:  # beat and scene breaks get longer: room tone mid-silence
        edits.append(((s0 + s1) / 2, ("tone", want - have)))

outbuf, cursor = np.zeros((0, ch), dtype=np.float32), 0.0
for at, (kind, val) in edits:
    outbuf = join(outbuf, pcm[int(cursor * rate):int(at * rate)])
    if kind == "cut":
        cursor = val
    else:
        outbuf = join(outbuf, tone(val))
        cursor = at
outbuf = join(outbuf, pcm[int(cursor * rate):])
# The video holds about a second after the last word: fill it with room tone fading out, and fade the start in,
# so the audio never jumps between room noise and dead silence.
outbuf = join(outbuf, tone(0.9))
fade = int(0.4 * rate)
outbuf[-fade:] *= np.linspace(1, 0, fade)[:, None]
outbuf[:X] *= up

with wave.open(out, "wb") as w:
    w.setnchannels(ch)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(np.clip(outbuf, -32768, 32767).astype(np.int16).tobytes())
cuts = sum(1 for _, e in edits if e[0] == "cut")
print(f"{len(pcm) / rate:.1f}s -> {len(outbuf) / rate:.1f}s, {cuts} pauses shortened, {len(edits) - cuts} lengthened")

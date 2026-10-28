"""Insert a second voice's line (e.g. Production) into a narration, right before a given word.

Usage: python tools/insert.py NARRATION.wav TRANSCRIPT.json CLIP.wav WORD OUT.wav
WORD is the first word after the gap ("Now"), or after=WORD for the last word before it ("after=46"), when the
next word is too common to find ("A").
Both files must share a sample rate. The clip is levelled to the narration's speech
level, trimmed of its own silence and faded in and out; tools/pace.py then sets the pauses around it.
"""
import json
import sys
import wave

import numpy as np

src, tr, clip_path, anchor, out = sys.argv[1:6]


def read(p):
    with wave.open(p) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768, w.getframerate()


def voiced_db(x, r):
    h = r // 50
    v = np.sqrt((x[:len(x) // h * h].reshape(-1, h) ** 2).mean(axis=1))
    v = v[v > v.max() * 0.05]
    return 20 * np.log10(np.sqrt((v ** 2).mean()))


nar, r = read(src)
clip, r2 = read(clip_path)
assert r == r2, f"sample rates differ: {r} vs {r2}"
words = [x for s in json.load(open(tr, encoding="utf-8"))["segments"] for x in s["words"]]
word = lambda w: w["word"].strip().lower().strip(".,!?")
if anchor.startswith("after="):
    i = next(k for k, w in enumerate(words) if word(w) == anchor[6:].lower()) + 1
else:
    i = next(k for k, w in enumerate(words) if k and word(w).startswith(anchor.lower()))
cut = (words[i - 1]["end"] + words[i]["start"]) / 2

clip *= 10 ** ((voiced_db(nar, r) - voiced_db(clip, r)) / 20)
h = r // 100
db = 20 * np.log10(np.sqrt((clip[:len(clip) // h * h].reshape(-1, h) ** 2).mean(axis=1)) + 1e-9)
act = np.where(db > db.max() - 40)[0]
clip = clip[max(act[0] - 5, 0) * h:(act[-1] + 10) * h]
X = int(0.02 * r)
clip[:X] *= np.linspace(0, 1, X)
clip[-X:] *= np.linspace(1, 0, X)
gap = np.zeros(int(0.15 * r))  # pace.py replaces this digital silence with room tone
y = np.concatenate([nar[:int(cut * r)], gap, clip, gap, nar[int(cut * r):]])
with wave.open(out, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(r)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
print(f"{clip_path}: {len(clip) / r:.1f} s inserted at {cut:.2f} s, before '{words[i]['word'].strip()}'")

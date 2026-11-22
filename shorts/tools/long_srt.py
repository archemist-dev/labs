"""Captions (.srt) for a long video from its timings.json, scenes in order with their frame offsets.

Usage: python tools/long_srt.py TIMINGS.json OUT.srt ORDER [NN=frames ...]
ORDER is a comma list of scene ids, e.g. 01,02,03; a scene without words (the sting) needs NN=frames.
Joins split number tokens ("1" ",076" -> "1,076"), applies FIXES to Whisper's spellings, and breaks a cue at a
sentence end, a pause over 0.45 s, or 42 characters.
"""
import json, re, sys

FIXES = {"Jason": "JSON", "Jason,": "JSON,", "protobuf": "Protobuf", "avro": "Avro", "cURL": "curl", "okay.": "OK.",
         "favorite": "favourite", "$10": "10"}
tim, out, order = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
extra = {k: int(v) for k, v in (a.split("=") for a in sys.argv[4:])}
T = json.load(open(tim, encoding="utf-8"))
words, off = [], 0.0
for nn in order:
    if nn in T:
        for w in T[nn]["words"]:
            t = w["w"]
            if words and re.match(r"^[,.\-]\S", t) and abs(w["start"] + off - words[-1][2]) < 0.6:
                words[-1][0] += t
                words[-1][2] = w["end"] + off
                continue
            words.append([FIXES.get(t, t), w["start"] + off, w["end"] + off])
        off += T[nn]["frames"] / 30
    else:
        off += extra[nn] / 30
cues, cur = [], []
for i, w in enumerate(words):
    if cur and (w[1] - cur[-1][2] > 0.45 or len(" ".join(x[0] for x in cur + [w])) > 42):
        cues.append(cur); cur = []
    cur.append(w)
    if re.search(r"[.?!]$", w[0]):
        cues.append(cur); cur = []
if cur:
    cues.append(cur)
ts = lambda s: f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round(s % 1 * 1000)) % 1000:03d}"
with open(out, "w", encoding="utf-8") as f:
    for i, c in enumerate(cues, 1):
        end = c[-1][2] + 0.15
        if i < len(cues):
            end = min(end, cues[i][0][1] - 0.02)
        f.write(f"{i}\n{ts(c[0][1])} --> {ts(end)}\n{' '.join(x[0] for x in c)}\n\n")
print(f"{len(cues)} cues, ends {ts(cues[-1][-1][2])}")

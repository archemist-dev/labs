"""Cut a stray sound before the first word of a take (a breath, cough or throat-clear ElevenLabs v4 sometimes adds).

Usage: python tools/trim_head.py IN.wav OUT.wav
Week 4 Short 1: the take opened with 0.2 s of a throat sound, 0.4 s of silence, then "Same"; Whisper folded it into
the first word and level.py lifted it by up to 12 dB, so the posted Short starts with a cough. Run this right after
converting the take to wav, before transcribing and levelling.

Looks at the first 1.5 s: if a short burst (under 0.45 s) is followed by at least 0.2 s of silence and then speech,
everything before the silence is dropped and the file starts 0.1 s before the speech. Otherwise it is copied as is.
"""
import sys
import wave

import numpy as np

src, out = sys.argv[1:3]
SILENT_DB, MAX_BURST, MIN_GAP, LEAD = -42.0, 0.45, 0.2, 0.1
HOP = 0.01

with wave.open(src) as w:
    params = w.getparams()
    raw = w.readframes(w.getnframes())
x = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768
if params.nchannels == 2:
    mono = x.reshape(-1, 2).mean(1)
else:
    mono = x
rate = params.framerate
hop = int(rate * HOP)
n = min(len(mono) // hop, int(1.5 / HOP))
db = np.array([20 * np.log10(np.sqrt((mono[i * hop:(i + 1) * hop] ** 2).mean()) + 1e-9) for i in range(n)])
loud = db > SILENT_DB

cut = 0
i = 0
while i < n and not loud[i]:  # leading silence
    i += 1
burst_start = i
while i < n and loud[i]:
    i += 1
burst = (i - burst_start) * HOP
gap_start = i
while i < n and not loud[i]:
    i += 1
gap = (i - gap_start) * HOP
if 0 < burst < MAX_BURST and gap >= MIN_GAP and i < n:
    cut = max(0, int((i * HOP - LEAD) * rate))

frames = len(x) // params.nchannels
start = cut * params.nchannels
with wave.open(out, "wb") as w:
    w.setparams(params)
    w.writeframes((x[start:] * 32768).clip(-32768, 32767).astype(np.int16).tobytes())
print(f"{src}: {'cut %.2f s (burst %.2f s, gap %.2f s)' % (cut / rate, burst, gap) if cut else 'nothing to cut'} -> {out}")

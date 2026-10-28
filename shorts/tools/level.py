"""Even out a narration's loudness, phrase by phrase, so soft lines (a whispered opening) aren't lost under music
and effects. Usage: python tools/level.py IN.wav OUT.wav

Speech loudness is measured over 0.4 s windows (only windows with speech count) and pulled toward TARGET_DB:
at most +MAX_UP dB and -MAX_DOWN dB, the gain changing smoothly between phrases. A lookahead limiter then keeps
peaks under CEIL without clipping. The emotion stays in the delivery; only the level is evened out.
"""
import sys
import wave

import numpy as np

src, out = sys.argv[1:3]
TARGET_DB, MAX_UP, MAX_DOWN, CEIL = -17.0, 12.0, 4.0, 0.89
WIN, SMOOTH = 0.4, 0.25  # seconds: measuring window, gain smoothing

with wave.open(src) as w:
    sr, ch = w.getframerate(), w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).mean(axis=1) / 32768

h = int(0.02 * sr)
frames = x[:len(x) // h * h].reshape(-1, h)
rms = np.sqrt((frames ** 2).mean(axis=1))
speech = rms > rms.max() * 0.06
per = int(WIN / 0.02)
gain_db = np.zeros(len(rms))
for i in range(len(rms)):
    lo, hi = max(0, i - per // 2), min(len(rms), i + per // 2 + 1)
    v = rms[lo:hi][speech[lo:hi]]
    if len(v):
        level = 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-9)
        gain_db[i] = np.clip(TARGET_DB - level, -MAX_DOWN, MAX_UP)
    else:
        gain_db[i] = np.nan  # silence: keep the gain of the speech around it
idx = np.arange(len(gain_db))
ok = ~np.isnan(gain_db)
gain_db = np.interp(idx, idx[ok], gain_db[ok])
k = max(1, int(SMOOTH / 0.02))
gain_db = np.convolve(np.pad(gain_db, k, mode="edge"), np.ones(2 * k + 1) / (2 * k + 1), mode="valid")
g = 10 ** (np.interp(np.arange(len(x)), np.arange(len(gain_db)) * h + h / 2, gain_db) / 20)
y = x * g

# Lookahead limiter: smooth gain reduction ahead of each peak, slow release.
look = int(0.005 * sr)
peak = np.lib.stride_tricks.sliding_window_view(np.concatenate([np.abs(y), np.zeros(look)]), look + 1).max(axis=1)[:len(y)]
need = np.minimum(1.0, CEIL / np.maximum(peak, 1e-9))
rel = np.exp(-1 / (0.08 * sr))
lim = np.empty_like(need)
cur = 1.0
for i, n in enumerate(need):
    cur = n if n < cur else n + (cur - n) * rel
    lim[i] = cur
y *= lim

with wave.open(out, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
print(f"gain {gain_db.min():+.1f} to {gain_db.max():+.1f} dB, peak {np.abs(y).max():.2f} -> {out}")

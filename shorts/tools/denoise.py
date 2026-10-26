"""Remove steady background noise (room hiss, hum, rumble) from a narration, before speeding up and pacing.

Usage: python tools/denoise.py IN.wav OUT.wav
Needs numpy, scipy, noisereduce. A high-pass at 70 Hz removes rumble below the voice; then spectral gating learns
the noise from the recording's own pauses and subtracts it. PROP < 1 leaves a trace of the room so the voice
doesn't sound underwater.
"""
import sys
import wave

import noisereduce as nr
import numpy as np
from scipy.signal import butter, sosfiltfilt

src, out = sys.argv[1:3]
HIGHPASS, PROP = 70, 0.9

with wave.open(src) as w:
    rate, ch = w.getframerate(), w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).mean(axis=1) / 32768
x = sosfiltfilt(butter(4, HIGHPASS, "highpass", fs=rate, output="sos"), x)

# The noise sample: the quietest 10 ms frames that aren't digital silence.
h = int(0.01 * rate)
frames = x[:len(x) // h * h].reshape(-1, h)
db = 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9)
live = db > -90
noise = frames[live & (db < np.percentile(db[live], 15))].ravel()

y = nr.reduce_noise(y=x, sr=rate, y_noise=noise, stationary=True, prop_decrease=PROP)
with wave.open(out, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(np.clip(y * 32768, -32768, 32767).astype(np.int16).tobytes())
print(f"noise sample {len(noise) / rate:.1f} s; wrote {out}")

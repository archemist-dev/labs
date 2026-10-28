"""Synthesize the Shorts' sound effects into public/sfx/ (not committed). Usage: python tools/sfx.py

Built from sine partials and filtered noise with smooth envelopes, so every effect starts and ends at zero
(no clicks). Names match lib/load.ts; drop a better file with the same name into public/sfx/ to replace one.
"""
import wave
from pathlib import Path

import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parent.parent / "public" / "sfx"
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, attack=0.004, decay=None):
    """Fast attack, exponential decay (or linear release if decay is None), zero at both ends."""
    x = np.arange(n) / SR
    a = np.minimum(1, x / attack)
    d = np.exp(-x / decay) if decay else np.linspace(1, 0, n)
    e = a * d
    e[-64:] *= np.linspace(1, 0, 64)
    return e


def lowpass(x, cutoff):
    k = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):  # one-pole filter
        acc = (1 - k) * v + k * acc
        y[i] = acc
    return y


def bandnoise(n, lo, hi):
    noise = rng.standard_normal(n)
    return lowpass(noise, hi) - lowpass(noise, lo)


def impact():
    x = t(0.7)
    sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(140, 38, len(x))) / SR)
    burst = bandnoise(len(x), 200, 6000) * np.exp(-x / 0.03)
    return 0.9 * sweep * env(len(x), 0.002, 0.18) + 0.5 * burst


def whoosh():
    n = int(0.45 * SR)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    return 0.7 * bandnoise(n, 400, 3500) * shape


def stamp():
    x = t(0.3)
    thud = np.sin(2 * np.pi * 78 * x) * env(len(x), 0.002, 0.07)
    click = bandnoise(len(x), 800, 5000) * np.exp(-x / 0.008)
    return 0.95 * thud + 0.45 * click


def reveal():
    x = t(0.5)
    tone = sum(a * np.sin(2 * np.pi * f * x) for f, a in ((1760, 0.5), (2640, 0.3), (3960, 0.15)))
    return 0.45 * tone * env(len(x), 0.003, 0.12)


def buzz():
    x = t(0.32)
    sq = np.sign(np.sin(2 * np.pi * 110 * x)) * 0.5 + np.sign(np.sin(2 * np.pi * 165 * x)) * 0.3
    return 0.35 * lowpass(sq, 2500) * env(len(x), 0.005)


def alarm():
    x = t(1.1)
    ring = sum(a * np.sin(2 * np.pi * f * x) for f, a in ((980, 0.5), (2350, 0.3), (3900, 0.15)))
    tremolo = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 18 * x))  # the striker hitting the bell
    return 0.4 * lowpass(ring * tremolo, 6000) * env(len(x), 0.004)


def typing():
    out = np.zeros(int(0.7 * SR))
    for k in range(8):
        at = int((0.04 + k * 0.08 + rng.uniform(-0.015, 0.015)) * SR)
        n = int(0.025 * SR)
        out[at:at + n] += bandnoise(n, 1500, 7000) * np.exp(-np.arange(n) / SR / 0.004) * rng.uniform(0.5, 0.9)
    return 0.6 * out


def cricket():
    x = t(0.9)
    chirps = (np.sin(2 * np.pi * 30 * x) > 0.2) * (np.sin(2 * np.pi * 2.2 * x) > 0)
    return 0.2 * np.sin(2 * np.pi * 4300 * x) * lowpass(chirps.astype(float), 200) * env(len(x), 0.01)


def slap():
    n = int(0.15 * SR)
    return 0.8 * bandnoise(n, 300, 4000) * np.exp(-np.arange(n) / SR / 0.02)


EFFECTS = {"impact": impact, "whoosh": whoosh, "stamp": stamp, "reveal": reveal, "buzz": buzz,
           "alarm": alarm, "type": typing, "cricket": cricket, "slap": slap}

OUT.mkdir(parents=True, exist_ok=True)
for name, fn in EFFECTS.items():
    y = fn()
    y = y / max(1e-9, np.abs(y).max()) * 0.8
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())
    print(f"{name}.wav  {len(y) / SR:.2f} s")

"""One continuous narration take from ElevenLabs, built paragraph by paragraph with request stitching.

Usage: python eleven_take.py <voice_id> <text.txt> <out.wav> '<voice_settings json>' [seed]
- Each paragraph is its own request (keeps pace and loudness from drifting), chained with
  previous_request_ids / next_text so the prosody continues across the joins.
- Paragraphs are joined untrimmed with a 20 ms equal-power crossfade; pauses are left to labs pace.py.
- Loudness: one smooth gain per paragraph to a common speech level, then a lookahead limiter
  (no sample-by-sample clipping).
Prints per-paragraph pace and level so changes are measured.
"""
import json
import sys
from pathlib import Path

import numpy as np

import eleven

MODEL, SR = "eleven_multilingual_v2", 24000
TARGET_DB, CEIL = -19.0, 0.89  # speech level (dBFS RMS of voiced frames), limiter ceiling


def voiced_rms(x):
    h = SR // 50
    f = x[:len(x) // h * h].reshape(-1, h)
    r = np.sqrt((f ** 2).mean(axis=1))
    v = r[r > r.max() * 0.05]
    return np.sqrt((v ** 2).mean()), len(v) * 0.02


def limiter(x, attack=0.005, release=0.08):
    """Lookahead peak limiter: smooth gain reduction, so peaks are tamed without crackle."""
    look = int(attack * SR)
    peak = np.abs(x)
    # running max over the lookahead window
    pad = np.concatenate([peak, np.zeros(look)])
    win = np.lib.stride_tricks.sliding_window_view(pad, look + 1).max(axis=1)[:len(x)]
    need = np.minimum(1.0, CEIL / np.maximum(win, 1e-9))
    g = np.empty_like(need)
    rel = np.exp(-1 / (release * SR))
    cur = 1.0
    for i, n in enumerate(need):  # instant attack (lookahead covers it), slow release
        cur = n if n < cur else n + (cur - n) * rel
        g[i] = cur
    return x * g


def main():
    voice, src, dest, settings = sys.argv[1], sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
    seed = int(sys.argv[5]) if len(sys.argv) > 5 else 7
    paras = [p.strip() for p in Path(src).read_text(encoding="utf-8").strip().split("\n\n")]
    ids, chunks = [], []
    for i, text in enumerate(paras):
        body = {"text": text, "model_id": MODEL, "seed": seed, "voice_settings": settings,
                "previous_request_ids": ids[-3:], "next_text": paras[i + 1] if i + 1 < len(paras) else ""}
        pcm, headers = eleven.call(f"/text-to-speech/{voice}?output_format=pcm_{SR}", body, with_headers=True)
        ids.append(headers.get("request-id"))
        x = np.frombuffer(pcm, dtype=np.int16).astype(np.float64) / 32768
        rms, voiced = voiced_rms(x)
        x = x * (10 ** (TARGET_DB / 20) / rms)
        chunks.append(x)
        print(f"p{i + 1}: {len(x) / SR:5.1f}s  {len(text.split()) / (voiced / 60):4.0f} wpm  raw {20 * np.log10(rms):5.1f} dBFS  {text[:40]}",
              flush=True)
    X = int(0.02 * SR)
    up, down = np.sin(np.linspace(0, np.pi / 2, X)), np.cos(np.linspace(0, np.pi / 2, X))
    out = chunks[0]
    for c in chunks[1:]:
        out = np.concatenate([out[:-X], out[-X:] * down + c[:X] * up, c[X:]])
    out = limiter(out)
    pcm16 = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    import wave
    with wave.open(dest, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm16.tobytes())
    print(f"total {len(out) / SR:.1f}s, peak {np.abs(out).max():.2f} -> {dest}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

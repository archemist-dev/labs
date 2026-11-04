"""Transcribe a narration with word timings, in the openai-whisper JSON shape the other tools read
({"segments": [{"text", "start", "end", "words": [{"word", "start", "end"}]}]}).
Usage: .venv/Scripts/python tools/transcribe.py IN.wav OUT.json [model] [language]
Defaults: model medium.en, language en. Runs on the GPU when CUDA libraries are available, otherwise on the CPU
(int8). Needs faster-whisper (pip install in shorts/.venv).
"""
import json
import sys
import wave
from math import gcd

import numpy as np
from faster_whisper import WhisperModel
from scipy.signal import resample_poly

src, out = sys.argv[1:3]
model_name = sys.argv[3] if len(sys.argv) > 3 else "medium.en"
lang = sys.argv[4] if len(sys.argv) > 4 else "en"

# Read the WAV here and resample to 16 kHz, instead of letting faster-whisper decode it with PyAV.
with wave.open(src) as w:
    rate, ch = w.getframerate(), w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).mean(axis=1) / 32768
g = gcd(rate, 16000)
src = resample_poly(x, 16000 // g, rate // g).astype(np.float32)

try:
    model = WhisperModel(model_name, device="cuda", compute_type="float16")
    segments, _ = model.transcribe(src, language=lang, word_timestamps=True, beam_size=5)
    segments = list(segments)
except Exception:  # no CUDA runtime: fall back to the CPU
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(src, language=lang, word_timestamps=True, beam_size=5)
    segments = list(segments)

data = {
    "segments": [
        {
            "text": s.text,
            "start": round(s.start, 3),
            "end": round(s.end, 3),
            "words": [{"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3)} for w in (s.words or [])],
        }
        for s in segments
    ]
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print(" ".join(s["text"].strip() for s in data["segments"]))

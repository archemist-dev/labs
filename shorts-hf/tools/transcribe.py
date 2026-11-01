"""Whisper word timings for a narration, without Whisper's own ffmpeg call.

Usage: python tools/transcribe.py IN.wav OUT.json [model] [language]
Writes the same JSON shape as the whisper CLI ({segments: [{words}]}), which tools/pace.py, tools/insert.py and the
script aligner read. The wav is resampled to 16 kHz here, so only a plain PCM wav is needed.
"""
import json
import sys
import wave
from math import gcd

import numpy as np
import whisper
from scipy.signal import resample_poly

src, out = sys.argv[1:3]
model_name = sys.argv[3] if len(sys.argv) > 3 else "medium.en"
language = sys.argv[4] if len(sys.argv) > 4 else "en"

with wave.open(src) as w:
    rate, ch = w.getframerate(), w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).mean(axis=1) / 32768
g = gcd(16000, rate)
audio = resample_poly(x, 16000 // g, rate // g).astype(np.float32)

model = whisper.load_model(model_name)
result = model.transcribe(audio, language=language, word_timestamps=True, fp16=False)
with open(out, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False)
words = [w for s in result["segments"] for w in s["words"]]
print(f"{out}: {len(words)} words, {words[-1]['end']:.1f} s")
print(" ".join(w["word"].strip() for w in words))

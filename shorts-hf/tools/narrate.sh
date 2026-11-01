#!/usr/bin/env bash
# Narration for Short 2, start to finish: ElevenLabs take and Production's line, level, 1.1x, Whisper, insert
# Production, beats, pace, final Whisper. Run from shorts-hf/. Needs the .venv (see README) and a full FFmpeg on PATH.
# Output: narration/paced.wav and narration/paced.json (read by build.mjs). The ElevenLabs key is read from
# ~/.config/elevenlabs/api_key by eleven.py and never printed.
set -euo pipefail
export PYTHONIOENCODING=utf-8
PY=.venv/Scripts/python.exe
T=../shorts/tools
N=narration

$PY $T/eleven.py say dDTVtZ8tiBiK4S4LEKPv $N/short2-en.txt $N/take.mp3 '{"stability": 0.6}' eleven_v4 | tail -2
[ -f $N/production48.wav ] || { $PY $T/eleven.py say nPczCjzI2devNBz1zQrb $N/production.txt $N/production.mp3 '{"stability": 0.6}' eleven_v4 | tail -1
  ffmpeg -y -loglevel error -i $N/production.mp3 -ac 1 -ar 48000 $N/production48.wav; }

ffmpeg -y -loglevel error -i $N/take.mp3 -ac 1 -ar 24000 $N/take.wav
$PY - <<'EOF'
import parselmouth, numpy as np
f = parselmouth.Sound("narration/take.wav").to_pitch(pitch_floor=70, pitch_ceiling=300).selected_array["frequency"]
f = f[f > 0]
print("pitch range %.1f semitones (target 9-11)" % (12 * np.log2(np.percentile(f, 95) / np.percentile(f, 5))))
EOF
$PY $T/level.py $N/take.wav $N/lev.wav
ffmpeg -y -loglevel error -i $N/lev.wav -filter:a atempo=1.1 -ar 48000 $N/sped.wav
$PY tools/transcribe.py $N/sped.wav $N/sped.json medium.en en | head -1
$PY $T/insert.py $N/sped.wav $N/sped.json $N/production48.wav You $N/merged.wav
$PY tools/transcribe.py $N/merged.wav $N/merged.json medium.en en | head -1
(cd ../shorts && node --experimental-strip-types tools/beats.ts ../shorts-hf/script.ts short2 en ../shorts-hf/$N/merged.json 2>/dev/null > ../shorts-hf/$N/beats.json)
$PY $T/pace.py $N/merged.wav $N/merged.json $N/beats.json $N/paced.wav | tail -1
$PY tools/transcribe.py $N/paced.wav $N/paced.json medium.en en

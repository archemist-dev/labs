"""Word timings for a long video's scenes, in the shape src/long/*/timings.json uses
({"NN": {"audio", "seconds", "frames", "words": [{"w", "start", "end"}]}}).

Usage: python tools/long_timings.py WORKDIR AUDIO_PREFIX OUT.json [NN=tail_seconds ...]
Reads WORKDIR/sNN.json (tools/transcribe.py output for public/audio/<AUDIO_PREFIX>-sNN-en.wav).
A scene lasts its take plus a tail (default 1.0 s): the breath and reading hold before the next scene.
"""
import json, math, pathlib, sys, wave

work, prefix, out = sys.argv[1:4]
tails = {k: float(v) for k, v in (a.split("=") for a in sys.argv[4:])}
res = {}
for j in sorted(pathlib.Path(work).glob("s[0-9][0-9].json")):
    nn = j.stem[1:]
    wav = pathlib.Path("public/audio") / f"{prefix}-s{nn}-en.wav"
    with wave.open(str(wav)) as w:
        secs = w.getnframes() / w.getframerate()
    words = [{"w": x["word"].strip(), "start": round(x["start"], 2), "end": round(x["end"], 2)}
             for seg in json.load(open(j, encoding="utf-8"))["segments"] for x in seg["words"]]
    tail = tails.get(nn, 1.0)
    res[nn] = {"audio": f"audio/{wav.name}", "seconds": round(secs, 2), "frames": math.ceil((secs + tail) * 30), "words": words}
pathlib.Path(out).write_text(json.dumps(res, indent=1), encoding="utf-8")
total = sum(v["frames"] for v in res.values())
print(f"{len(res)} scenes, {total / 30:.1f} s ({total} frames)")

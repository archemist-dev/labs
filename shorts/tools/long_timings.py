"""Word timings for a long video's scenes, in the shape src/long/*/timings.json uses
({"NN": {"audio", "seconds", "frames", "words": [{"w", "start", "end"}]}}).

Usage: python tools/long_timings.py WORKDIR AUDIO_PREFIX OUT.json [NN=tail_seconds ...]
Reads WORKDIR/sNN.json (tools/transcribe.py output for public/audio/<AUDIO_PREFIX>-sNN-en.wav).
A scene lasts its take plus a tail (default 1.0 s): the breath and reading hold before the next scene.

With WORKDIR/sNN.words.json (the script's words, from tools/long_script.py) the take's timing is put on the script's
words, so cues and captions use the script's spelling ("337", "43,000", "read-only") whatever Whisper wrote. Every
place where the two differ is printed: read them, a line the voice skipped or changed shows up here.
"""
import difflib, json, math, pathlib, re, sys, wave

work, prefix, out = sys.argv[1:4]
tails = {k: float(v) for k, v in (a.split("=") for a in sys.argv[4:])}
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())


def align(nn, script, heard):
    """Script words with the heard words' times; a differing stretch shares its time span evenly."""
    sm = difflib.SequenceMatcher(None, [norm(w) for w in script], [norm(h["w"]) for h in heard], autojunk=False)
    res = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            res += [{"w": script[i1 + k], "start": heard[j1 + k]["start"], "end": heard[j1 + k]["end"]} for k in range(i2 - i1)]
            continue
        print(f"  s{nn} {op}: script {' '.join(script[i1:i2])!r} / heard {' '.join(h['w'] for h in heard[j1:j2])!r}")
        if i2 == i1:
            continue
        if j2 > j1:
            a, b = heard[j1]["start"], heard[j2 - 1]["end"]
        else:  # the take has nothing here: squeeze the words into the gap, so a cue on them still fires
            a = heard[j1 - 1]["end"] if j1 else 0.0
            b = heard[j1]["start"] if j1 < len(heard) else a
        step = (b - a) / (i2 - i1)
        res += [{"w": script[i1 + k], "start": round(a + k * step, 2), "end": round(a + (k + 1) * step, 2)} for k in range(i2 - i1)]
    return res


res = {}
for j in sorted(pathlib.Path(work).glob("s[0-9][0-9].json")):
    nn = j.stem[1:]
    wav = pathlib.Path("public/audio") / f"{prefix}-s{nn}-en.wav"
    with wave.open(str(wav)) as w:
        secs = w.getnframes() / w.getframerate()
    words = [{"w": x["word"].strip(), "start": round(x["start"], 2), "end": round(x["end"], 2)}
             for seg in json.load(open(j, encoding="utf-8"))["segments"] for x in seg["words"]]
    script = j.with_suffix(".words.json")
    if script.exists():
        words = align(nn, json.loads(script.read_text(encoding="utf-8")), words)
    tail = tails.get(nn, 1.0)
    res[nn] = {"audio": f"audio/{wav.name}", "seconds": round(secs, 2), "frames": math.ceil((secs + tail) * 30), "words": words}
pathlib.Path(out).write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding="utf-8")
total = sum(v["frames"] for v in res.values())
print(f"{len(res)} scenes, {total / 30:.1f} s ({total} frames)")

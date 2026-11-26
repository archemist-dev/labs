"""Voice text and estimated timings for a long video, straight from the script in its studio note.

Usage: python tools/long_script.py NOTE.md OUTDIR [TIMINGS.json]
Reads the note's "## Script (EN)" (### N. scenes; spoken lines start with a [feeling] tag; [ON SCREEN: ...] lines are
skipped). Writes OUTDIR/sNN.txt, one paragraph per spoken line for ElevenLabs v4 ("[feeling] text": the emoji, the
delivery marks / ↗ ↘ ** are removed and a number followed by {its spoken form} is replaced by that form), and
OUTDIR/sNN-production.txt for a Production line (another voice, spliced in with tools/insert.py).
With TIMINGS.json: also an ESTIMATE in the shape tools/long_timings.py writes (158 words a minute, pauses at the
marks, audio null), so scenes can be built and checked before the takes exist. The real takes replace it.
"""
import json, math, pathlib, re, sys

note, outdir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
text = note.read_text(encoding="utf-8")
body = text[text.index("## Script (EN)"):]
body = body[:body.index("\n## ", 5)]
outdir.mkdir(parents=True, exist_ok=True)
WORD, SLASH, SENT, PARA, TAIL = 60 / 185, 0.1, 0.22, 0.4, 1.0


def voice(line):
    """'[🙂 calm] One / **two** {2}.' -> ('calm', 'One, two.' spoken form, display words with pause marks)."""
    m = re.match(r"\[([^\]]*)\]\s*(.*)", line)
    tag = re.sub(r"[^\x00-\x7f]", "", m.group(1)).strip(" ,")
    rest = re.sub(r"\[[^\]]*\]", "", m.group(2))  # inline tags like [closing scene]
    rest = rest.replace("↗", "").replace("↘", "").replace('"', "")
    shown = re.sub(r"\s*\{[^}]*\}", "", rest).replace("**", "")
    spoken = re.sub(r"\*{0,2}([^\s*]+)\*{0,2}\s*\{([^}]*)\}", r"\2", rest).replace("**", "")
    spoken = re.sub(r"(?<![,.?!:;])\s+/\s+", ", ", spoken)
    spoken = re.sub(r"\s+/\s+", " ", spoken)
    return tag, re.sub(r"\s+", " ", spoken).strip(), shown


def estimate(shown_lines):
    words, t = [], 0.25
    for shown in shown_lines:
        for tok in shown.split():
            if tok == "/":
                t += SLASH
                continue
            words.append({"w": tok, "start": round(t, 2), "end": round(t + WORD * 0.85, 2)})
            t += WORD + (SENT if re.search(r"[.?!]$", tok) else 0)
        t += PARA
    return words, t - PARA


timings, total = {}, 0
for sc in re.split(r"\n### ", body)[1:]:
    nn = "%02d" % int(re.match(r"(\d+)\.", sc).group(1))
    paras, shown_lines = [], []
    for line in sc.splitlines()[1:]:
        line = line.strip()
        prod = re.match(r"\*\*Production[^*]*\*\*\s*(.*)", line)
        if prod:
            tag, spoken, shown = voice(prod.group(1))
            (outdir / f"s{nn}-production.txt").write_text(f"[{tag}] {spoken}\n", encoding="utf-8")
            shown_lines.append(shown)
        elif line.startswith("[") and not line.startswith("[ON SCREEN"):
            tag, spoken, shown = voice(line)
            paras.append(f"[{tag}] {spoken}")
            shown_lines.append(shown)
    if not paras:
        continue
    (outdir / f"s{nn}.txt").write_text("\n\n".join(paras) + "\n", encoding="utf-8")
    words, secs = estimate(shown_lines)
    timings[nn] = {"audio": None, "seconds": round(secs, 2), "frames": math.ceil((secs + TAIL) * 30), "words": words}
    total += timings[nn]["frames"]
    print(nn, len(paras), "paragraphs,", len(words), "words,", round(secs, 1), "s")
if len(sys.argv) > 3:
    pathlib.Path(sys.argv[3]).write_text(json.dumps(timings, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"estimate: {total / 30:.0f} s without the sting")

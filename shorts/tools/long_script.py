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


# Mild ElevenLabs v4 tags only (shorts-video skill): nothing low, quiet or whispered, no stacked intensifiers.
TAGS = {"low": "calm, conversational", "calm": "calm, matter-of-fact", "conversational": "clear, conversational",
        "doubtful": "a bit skeptical", "surprised": "a little surprised", "flat, slower": "flat, matter-of-fact",
        "serious, slower": "serious, a bit slower", "quiet, slower": "serious, a bit slower", "quiet": "serious",
        "calm, landing": "warm"}
STRONG = ("firm", "serious", "serious, a bit slower", "a little surprised")  # a take never opens on one of these
# Said as written here; the captions keep the script's spelling.
SAY = {"120": "one hundred twenty", "50": "fifty", "pg_dump": "P G dump", "pg_repack": "P G repack",
       "VACUUM FULL": "vacuum full", "by id": "by I D"}


def voice(line):
    """'[🙂 calm] One / **two** {2}.' -> ('calm', 'One, two.' spoken form, display words with pause marks)."""
    m = re.match(r"\[([^\]]*)\]\s*(.*)", line)
    tag = re.sub(r"[^\x00-\x7f]", "", m.group(1)).strip(" ,")
    tag = TAGS.get(tag, tag)
    rest = re.sub(r"\[[^\]]*\]", "", m.group(2))  # inline tags like [closing scene]
    rest = rest.replace("↗", "").replace("↘", "").replace('"', "")
    rest = re.sub(r"\s+", " ", rest)
    shown = re.sub(r"\s*\{[^}]*\}", "", rest).replace("**", "")
    spoken = re.sub(r"\*\*([^*]+)\*\*\s*\{([^}]*)\}", r"\2", rest)  # **1.8 million** {one point eight million}
    spoken = re.sub(r"\*{0,2}([^\s*]+)\*{0,2}\s*\{([^}]*)\}", r"\2", spoken).replace("**", "")
    spoken = re.sub(r"(?<![,.?!:;])\s+/\s+", ", ", spoken)
    spoken = re.sub(r"\s+/\s+", " ", spoken)
    for k, v in SAY.items():
        spoken = re.sub(rf"(?<![\w.]){re.escape(k)}(?!\w|\.\d)", v, spoken)
    spoken = re.sub(r"([.?!:] )([a-z])", lambda x: x.group(1) + x.group(2).upper(), spoken)
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
            if not paras and tag in STRONG:
                tag = "calm, matter-of-fact"
            paras.append(f"[{tag}] {spoken}")
            shown_lines.append(shown)
    if not paras:
        continue
    (outdir / f"s{nn}.txt").write_text("\n\n".join(paras) + "\n", encoding="utf-8")
    words, secs = estimate(shown_lines)
    # the script's own words, for tools/long_timings.py to put the take's timing on (cues and captions use these)
    (outdir / f"s{nn}.words.json").write_text(json.dumps([w["w"] for w in words], ensure_ascii=False), encoding="utf-8")
    timings[nn] = {"audio": None, "seconds": round(secs, 2), "frames": math.ceil((secs + TAIL) * 30), "words": words}
    total += timings[nn]["frames"]
    print(nn, len(paras), "paragraphs,", len(words), "words,", round(secs, 1), "s")
if len(sys.argv) > 3:
    pathlib.Path(sys.argv[3]).write_text(json.dumps(timings, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"estimate: {total / 30:.0f} s without the sting")

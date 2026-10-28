"""ElevenLabs text-to-speech for Archemist Shorts.

Key: env ELEVENLABS_API_KEY, or the file ~/.config/elevenlabs/api_key (never printed).
Usage:
  python eleven.py voices                          list voices (name, id, category)
  python eleven.py say <voice_id> <text.txt> <out.mp3> [stability] [model]
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

API = "https://api.elevenlabs.io/v1"


def key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    f = pathlib.Path.home() / ".config" / "elevenlabs" / "api_key"
    if not k and f.exists():
        k = f.read_text(encoding="utf-8").strip()
    if not k:
        sys.exit(f"No key: set ELEVENLABS_API_KEY or put it in {f}")
    return k


def call(path, body=None, with_headers=False):
    req = urllib.request.Request(API + path, headers={"xi-api-key": key(), "Content-Type": "application/json"},
                                 data=json.dumps(body).encode() if body else None)
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = r.read()
            return (data, r.headers) if with_headers else data
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:500]}")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if sys.argv[1] == "voices":
        for v in json.loads(call("/voices"))["voices"]:
            labels = ", ".join(f"{k}={x}" for k, x in (v.get("labels") or {}).items())
            print(f"{v['voice_id']}  {v['category']:<12} {v['name']}  [{labels}]")
        return
    if sys.argv[1] == "say":
        voice, src, out = sys.argv[2:5]
        arg = sys.argv[5] if len(sys.argv) > 5 else "0.5"
        # a number is just stability; a JSON object is the full voice_settings
        settings = json.loads(arg) if arg.startswith("{") else {"stability": float(arg)}
        model = sys.argv[6] if len(sys.argv) > 6 else "eleven_v3"
        text = pathlib.Path(src).read_text(encoding="utf-8").strip()
        audio = call(f"/text-to-speech/{voice}?output_format=mp3_44100_128",
                     {"text": text, "model_id": model, "voice_settings": settings})
        pathlib.Path(out).write_bytes(audio)
        print(f"{out}: {len(audio) // 1024} KB, {len(text)} chars")
        sub = json.loads(call("/user/subscription"))
        print(f"credits used {sub['character_count']} / {sub['character_limit']}")


if __name__ == "__main__":
    main()

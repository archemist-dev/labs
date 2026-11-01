# shorts-hf

Trial: week 2 Short 2 built with [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + GSAP rendered to MP4) instead of Remotion. Same narration pipeline as `../shorts`, same script cues, same brand palette.

## Make it

1. `narration/short2-en.txt` (one paragraph per beat, mild emotion tag each) and `narration/production.txt`, then ElevenLabs through `../shorts/tools/eleven.py` (Javlon `dDTVtZ8tiBiK4S4LEKPv`, Production `nPczCjzI2devNBz1zQrb`, model `eleven_v4`, stability 0.6). Key stays in `~/.config/elevenlabs/api_key`.
2. `tools/level.py`, speed 1.1x with `atempo`, `tools/transcribe.py` (Whisper `medium.en`, resamples itself), `tools/insert.py` for Production, `tools/beats.ts` + `tools/pace.py`, transcribe again into `narration/paced.json`. The tools are the ones in `../shorts/tools`.
3. `node --experimental-strip-types build.mjs` reads `script.ts` (cue markers) and `narration/paced.json` and writes `w2s2/index.html` and `w2s2/compositions/*.html`.
4. In `w2s2/`: `npx hyperframes check`, `npx hyperframes snapshot --at ...`, `npx hyperframes render --output ../out/02-short2-en-hf.mp4`.

## Setup notes (Windows)

- Python venv: `python -m venv .venv`, then `pip install numpy scipy praat-parselmouth openai-whisper`.
- HyperFrames needs a full FFmpeg and FFprobe on PATH. Remotion's bundled build lacks the `pcm_f32le` encoder (the render stops at the audio mix, "Unknown encoder"), and Whisper's own loader fails with it too. Use a Gyan.dev build (`winget install --id Gyan.FFmpeg -e`).
- Node 22.11 works but several dependencies ask for 22.12 or newer (warnings only).
- HyperFrames is a pinned dev dependency of `w2s2/` (run `npm install` there, then `npm run check|dev|render`), not a global install.
- Never run `npx hyperframes init` or `npx hyperframes skills ...`: they write the skills into `~/.claude/skills` and `~/.agents/skills` (the CLI has no project option). The skills live in the vault's `.claude/skills/` (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`; `media-use` is left out, it can call HeyGen's paid service).
- The CLI reports usage telemetry by default (`npx hyperframes telemetry status`, `... disable`).

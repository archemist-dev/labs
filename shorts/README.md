# shorts

Vertical Shorts (1080x1920, 30 fps) rendered with [Remotion](https://www.remotion.dev): the diagrams animate on the spoken word, with word-by-word captions and the playbook's sound effects. One set of scenes per Short; EN, UZ and RU are the same scenes with a different voice and script.

## Make a Short

0. Voice from ElevenLabs instead of a recording (Javlon's cloned voice "Javlon", `dDTVtZ8tiBiK4S4LEKPv`): the key stays outside the chat, in `ELEVENLABS_API_KEY` or `~/.config/elevenlabs/api_key`. Put the script in a text file, one paragraph per beat, then `python tools/eleven_take.py <voice_id> script.txt take.wav '{"stability": 0.5, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": true}'` (each paragraph its own request, chained so the prosody carries over, levelled and limited). `python tools/eleven.py voices` lists voices; `tools/eleven.py say` renders a single line, e.g. Production's (week 1: the premade voice Brian). Insert it with `python tools/insert.py take.wav take.json production.wav <first word after it> out.wav` (same sample rate; convert with `npx remotion ffmpeg -i in.mp3 -ac 1 -ar 24000 out.wav`). Use the model `eleven_v4` with an emotion tag per paragraph (`[quietly, like a confession]`, `[slowly, ominous]`...) in one request: `python tools/eleven.py say <voice_id> script.txt take.mp3 '{"stability": 0.5}' eleven_v4`. Week 1 Short 2: the tagged v4 take moved 11-14 semitones, the untagged multilingual_v2 take 3.5 ("monotonic"). A v4 take speaks at about 158 words a minute: speed it up 1.1x at most.

Sound effects: `python tools/sfx.py` synthesizes them into `public/sfx/` (impact, whoosh, stamp, reveal, buzz, alarm, type, cricket, slap). Reading time: give a beat a `hold` in `script.ts`; `tools/beats.ts` turns it into the pause before the next scene, so its last element stays readable.
1. Record the voice. Save it (not committed) as `public/audio/<id>-<lang>.wav` (or `.m4a`, `.mp3`), e.g. `02-short1-uz.wav`.
2. Transcribe it with word timings, locally with Whisper:
   ```
   whisper public/audio/02-short1-uz.wav --model medium --language uz --word_timestamps True --output_format json --output_dir public/transcripts
   ```
   Rhythm and length (week 1: 69 s became 62 s; 50 s at 1.32x was too fast to follow):
   0. Remove the background noise first: `python tools/denoise.py in.wav clean.wav` (week 1: room noise from -43 to -61 dBFS). Pacing fills pauses with the recording's own room tone, so noise left in becomes a continuous hiss.
   1. Speed up with the pitch kept, at most about 1.25x: `npx remotion ffmpeg -i clean.wav -filter:a atempo=1.25 -ar 48000 sped.wav`, then transcribe `sped.wav`.
   2. `node --experimental-strip-types tools/beats.ts src/shorts/<topic>/script.ts short1 en sped.json > beats.json` finds where each beat starts.
   3. `python tools/pace.py sped.wav sped.json beats.json public/audio/<id>-<lang>.wav` sets every pause: short inside a sentence, longer between sentences, a breath before each beat and a longer one before each scene change, so each scene lands before the next. It cuts only real silence, so soft word endings and starts ("gzip", "that") stay.
   4. Transcribe the result again into `public/transcripts/` and check every word survived.
3. Preview: `npm run studio`. Render: `npm run render -- 02-short1-uz` (writes `out/02-short1-uz.mp4`).

Without audio and a transcript, the Short renders silent at an estimated calm pace, which is useful for checking scenes before recording.

## How timing works

The script lives in `src/shorts/<topic>/script.ts`, one beat per paragraph, copied from the master note. `{name}` before a word marks where a scene element appears: `Orders has {ten}ten.` lets the orders bar grow on "ten". Every language places the same markers on its own words. Each beat is found in the Whisper transcript by its first words, and captions show the script's words (Whisper misspells Uzbek) at the voice's timing. Consecutive beats with the same scene play as one scene.

## Sound effects

Drop free files (not committed) into `public/sfx/` named after the playbook's table: `stamp` (verdict), `reveal`, `buzz` (Production says no), `whoosh` (transition), `slap` (tier placed), `cricket`. `.wav` or `.mp3`. A missing effect is skipped.

## Add a Short

1. `src/shorts/<NN-topic>/script.ts`: beats for each language, with markers.
2. `src/shorts/<NN-topic>/ShortN.tsx`: one component per scene, using `components/parts.tsx` (`Title`, `Bar`, `Stamp`, `Pop`, `Box`, `Mark`) and `useCue("name")`. Numbers come from the topic's README. Show the real thing (the payload, the bytes, the calculation), not boxes standing in for it.
3. Byte-level data comes from the lab, never typed by hand: e.g. `01-payload-encoding/video_data.py src/shorts/01-payload-encoding/data.json` (run from the lab's venv) writes the real JSON and Protobuf bytes and asserts they match the published sizes.
4. Register it in `SHORTS` in `src/Root.tsx`.

Style follows `diagrams.py`: charcoal, Inter labels, JetBrains Mono numbers, green = win, gray = neutral, red = bad, gold only under the title. Diagram labels stay in English for every language. Keep content inside the safe area: nothing below y 1500 (platform buttons and caption bar) except captions at 1330.

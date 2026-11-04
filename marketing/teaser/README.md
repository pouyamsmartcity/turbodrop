# Turbodrop teaser videos

Promo videos rendered entirely from code: an Instagram Reel (1080×1920, 30 s) and a YouTube video (1920×1080, 90 s),
each in English and Persian. Calm, premium style: "Pouyam presents", soft fades, real screenshots, a Pouyam mark
in the corner and a Pouyam end card; warm music (pads, felt piano); a calm Persian narrator with English subtitles.
The first, sports-broadcast cut is still available with `TEASER_STYLE=energetic` for the music (the scenes are in git history).

- `scenes.js`: the scenes, the copy in both languages and the two timelines (every claim comes from the README).
- `engine.js`: a small deterministic motion-graphics engine (keyframes, background, flashes, shake, glitch).
- `render.mjs`: renders every frame with Playwright into H.264 and writes the sound cues.
- `sound.py`: the music and sound effects, synthesised from scratch (no samples): calm by default, cuts on the beat.
- `voice-lines.json`: the narration (Persian and English) with English subtitles; `fit.py` fits each scene to its line.
- `tts.py` + `mix.sh`: the ElevenLabs voice-over (`eleven_v3`), placed per scene; the music ducks under the voice.
- `SCRIPT.fa.md`: script, direction, sound design, voice lines and posting copy (Persian, with English lines).

```bash
./build.sh                                   # out/turbodrop-{reel,youtube}-{en,fa}.mp4
ELEVENLABS_API_KEY=... python3 tts.py reel fa  # out/turbodrop-reel-fa-voice.mp4
```

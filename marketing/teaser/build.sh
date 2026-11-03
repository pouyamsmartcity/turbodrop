#!/bin/bash
# Renders the four teaser videos with music: out/turbodrop-<reel|youtube>-<en|fa>.mp4
# Needs Node 20+, Playwright's Chromium, Python 3 with numpy and scipy, ffmpeg, and the Inter Display and
# JetBrains Mono fonts installed. With ELEVENLABS_API_KEY set, also adds the voice-over (tts.py).
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --no-audit --no-fund
mkdir -p assets out
cp ../../docs/screenshots/*.png ../../apps/desktop/app-icon.svg ../../docs/pouyam-mark.svg assets/
cp "node_modules/vazirmatn/fonts/webfonts/Vazirmatn[wght].woff2" assets/vazirmatn.woff2
(node render.mjs reel en && node render.mjs youtube en) > out/log-en.txt 2>&1 &
(node render.mjs reel fa && node render.mjs youtube fa) > out/log-fa.txt 2>&1 &
wait
for f in reel youtube; do
  python3 sound.py out/$f-en-cues.json out/$f-music.wav
  for l in en fa; do
    ffmpeg -loglevel error -y -i out/$f-$l-silent.mp4 -i out/$f-music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/turbodrop-$f-$l.mp4
    if [ -n "$ELEVENLABS_API_KEY" ]; then python3 tts.py $f $l; fi
  done
done
ls -la out/turbodrop-*.mp4

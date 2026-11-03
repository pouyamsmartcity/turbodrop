#!/bin/bash
# Persian voice + English subtitles: fits the scenes to the voice lines in voice/, renders, adds music and voice.
#   ./voice-build.sh [lang]   (default fa)  ->  out/turbodrop-<reel|youtube>-<lang>-voice-subs.mp4
set -e
cd "$(dirname "$0")"
l=${1:-fa}
for f in reel youtube; do python3 fit.py $f $l; done
node render.mjs reel $l > out/log-reel-$l.txt 2>&1 &
node render.mjs youtube $l > out/log-youtube-$l.txt 2>&1 &
wait
for f in reel youtube; do
  python3 sound.py out/$f-$l-cues.json out/$f-music.wav
  python3 tts.py $f $l
done
ls -la out/turbodrop-*-$l-voice*.mp4
echo VOICE-BUILD-DONE

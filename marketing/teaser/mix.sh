#!/bin/bash
# Puts a voice-over on a finished teaser; the music ducks under the voice (sidechain), then loudness is set
# for Instagram/YouTube (-14 LUFS, true peak -1 dB).
#   ./mix.sh <reel|youtube> <en|fa> <voice file (mp3/wav)> [voice start in seconds, default 0]
# Several voice lines? Put them in one file with the right pauses, or give one file per scene start (see SCRIPT).
set -e
cd "$(dirname "$0")"
f=$1; l=$2; vo=$3; at=${4:-0}
ms=$(python3 -c "print(int(float('$at')*1000))")
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/$f-$l-silent.mp4)
ffmpeg -loglevel error -y -i out/$f-$l-silent.mp4 -i out/$f-music.wav -i "$vo" -filter_complex "
[2:a]aresample=48000,adelay=${ms}|${ms},highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.6,asplit=2[vo][key];
[1:a][key]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350:makeup=1[duck];
[duck][vo]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1:LRA=9[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -t "$dur" -movflags +faststart out/turbodrop-$f-$l-voice.mp4
# English subtitles burned in (Instagram has no subtitle upload), above the Reels buttons; the .srt is kept for YouTube.
if [ -f out/$f-$l.srt ]; then
  if [ "$f" = reel ]; then style="FontName=Inter Display,Bold=1,FontSize=8.5,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=3,Outline=1.2,Shadow=0,MarginV=45,MarginL=12,MarginR=12"; else style="FontName=Inter Display,Bold=1,FontSize=13,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=3,Outline=1.2,Shadow=0,MarginV=12"; fi
  ffmpeg -loglevel error -y -i out/turbodrop-$f-$l-voice.mp4 -vf "subtitles=out/$f-$l.srt:force_style='$style'" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a copy -movflags +faststart out/turbodrop-$f-$l-voice-subs.mp4
  echo out/turbodrop-$f-$l-voice-subs.mp4
fi
echo out/turbodrop-$f-$l-voice.mp4

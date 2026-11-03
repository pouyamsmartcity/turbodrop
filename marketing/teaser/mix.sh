#!/bin/bash
# Puts a voice-over on a finished teaser; the music ducks under the voice (sidechain), then loudness is set
# for Instagram/YouTube (-14 LUFS, true peak -1 dB).
#   ./mix.sh <reel|youtube> <en|fa> <voice file (mp3/wav)> [voice start in seconds, default 0]
# Several voice lines? Put them in one file with the right pauses, or give one file per scene start (see SCRIPT).
set -e
cd "$(dirname "$0")"
f=$1; l=$2; vo=$3; at=${4:-0}
ms=$(python3 -c "print(int(float('$at')*1000))")
ffmpeg -loglevel error -y -i out/$f-$l-silent.mp4 -i out/$f-music.wav -i "$vo" -filter_complex "
[2:a]aresample=48000,adelay=${ms}|${ms},highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.6,asplit=2[vo][key];
[1:a][key]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350:makeup=1[duck];
[duck][vo]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1:LRA=9[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/turbodrop-$f-$l-voice.mp4
echo out/turbodrop-$f-$l-voice.mp4

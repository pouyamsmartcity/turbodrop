"""Fits the scenes to the voice: each scene lasts at least as long as its voice line (spoken up to 1.1x faster) plus a pause,
in whole seconds (every cut stays on a beat). Writes out/timing-<format>-<lang>.json for render.mjs and tts.py.

python3 fit.py <reel|youtube> <lang>
"""
import json
import math
import os
import subprocess
import sys

fmt, lang = sys.argv[1], sys.argv[2]
DIR = os.path.dirname(os.path.abspath(__file__))
# Must match TIMELINES in scenes.js.
BASE = {'reel': [3, 4, 4, 6, 4, 4, 4, 5, 4, 4], 'youtube': [4, 7, 5, 9, 24, 6, 7, 6, 5, 9, 10, 7, 8]}
LAST_MIN = {'reel': 4, 'youtube': 8}  # the end card stays a moment after the last word


def duration(p):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


VERSION = json.load(open(os.path.join(DIR, 'voice-lines.json'), encoding='utf-8')).get('version', 'v1')
ds = []
for i, b in enumerate(BASE[fmt]):
    v = os.path.join(DIR, 'voice', VERSION, f'{fmt}-{lang}-{i:02d}.mp3')
    # Room to breathe: the line at its natural pace (at most 1.1x) plus a pause before the next scene.
    ds.append(max(b, math.ceil(duration(v) / 1.1 + 0.7)) if os.path.exists(v) else b)
ds[-1] = max(ds[-1], LAST_MIN[fmt])
os.makedirs(os.path.join(DIR, 'out'), exist_ok=True)
json.dump({'durations': ds}, open(os.path.join(DIR, 'out', f'timing-{fmt}-{lang}.json'), 'w'))
print(fmt, lang, sum(ds), 's', ds)

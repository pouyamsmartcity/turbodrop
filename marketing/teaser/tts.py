"""Voice-over with ElevenLabs, each line placed at its scene time, then mixed under the music (mix.sh).

ELEVENLABS_API_KEY=... python3 tts.py <reel|youtube> <en|fa> [voice_id]
Without a voice id the first voice whose name or labels mention "sports", "announcer", "trailer" or "narrat" is used.
Model: $ELEVENLABS_MODEL, default eleven_v4 (Persian and audio tags such as [excited]).
If voice/<version>/<format>-<lang>-NN.mp3 files exist for every line (version from voice-lines.json), they are used
and no API call is made.
"""
import json
import os
import subprocess
import sys
import urllib.request

KEY = os.environ.get('ELEVENLABS_API_KEY') or os.environ.get('XI_API_KEY')
fmt, lang = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else os.environ.get('ELEVENLABS_VOICE_ID')
MODEL = os.environ.get('ELEVENLABS_MODEL', 'eleven_v4')
DIR = os.path.dirname(os.path.abspath(__file__))

_doc = json.load(open(os.path.join(DIR, 'voice-lines.json'), encoding='utf-8'))
VERSION = _doc.get('version', 'v1')
LINES = {tuple(k.split('-')): [(None, x['text']) for x in v] for k, v in _doc.items() if k != 'version'}
SUBS = {tuple(k.split('-')): [x.get('sub_en') for x in v] for k, v in _doc.items() if k != 'version'}
VOICE_DIR = os.path.join(DIR, 'voice', VERSION)  # one folder per script version, so old takes never mix in


def api(path, body=None):
    req = urllib.request.Request('https://api.elevenlabs.io' + path, data=json.dumps(body).encode() if body else None,
                                 headers={'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' if body else 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


ready = [os.path.join(VOICE_DIR, f'{fmt}-{lang}-{i:02d}.mp3') for i in range(len(LINES[(fmt, lang)]))]
use_ready = all(os.path.exists(p) for p in ready)
if not use_ready and not KEY:
    sys.exit('ELEVENLABS_API_KEY is not set and voice/ has no ready-made lines')
if not use_ready and not voice:
    voices = json.loads(api('/v1/voices'))['voices']
    words = ('sports', 'announcer', 'trailer', 'narrat', 'commentat')
    pick = next((v for v in voices if any(w in json.dumps([v.get('name'), v.get('labels'), v.get('description')]).lower() for w in words)), voices[0])
    voice = pick['voice_id']
    print('voice:', pick['name'])

timing_file = os.path.join(DIR, 'out', f'timing-{fmt}-{lang}.json')
# Scenes fitted to the voice (fit.py; run here if it has not been): each line starts with its scene.
subprocess.run([sys.executable, os.path.join(DIR, 'fit.py'), fmt, lang], check=True)
ds = json.load(open(timing_file))['durations']
starts = [sum(ds[:i]) for i in range(len(ds))]
LINES[(fmt, lang)] = [(starts[i], text) for i, (_, text) in enumerate(LINES[(fmt, lang)])]
parts = []
for i, (t, text) in enumerate(LINES[(fmt, lang)]):
    if use_ready:
        parts.append((t, ready[i]))
        continue
    os.makedirs(VOICE_DIR, exist_ok=True)
    path = os.path.join(VOICE_DIR, f'{fmt}-{lang}-{i:02d}.mp3')
    audio = api(f'/v1/text-to-speech/{voice}?output_format=mp3_44100_192', {
        'text': text, 'model_id': MODEL, 'language_code': lang,
        # A calm, warm narration: steady delivery, little exaggeration.
        'voice_settings': {'stability': 0.7, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True},
    })
    open(path, 'wb').write(audio)
    parts.append((t, path))
    print(f'{t:>5}s  {text[:60]}')

def duration(p):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


# One track with every line at its scene time. A line longer than its slot is sped up a little (at most 1.12x);
# if it still does not fit, the next line waits for it, so lines never overlap.
TOTAL = sum(ds)
inputs, chains, cursor, timing = [], [], 0.0, []
for i, (t, p) in enumerate(parts):
    slot_end = parts[i + 1][0] if i + 1 < len(parts) else TOTAL - 0.3
    start = max(t + 0.08, cursor)
    d = duration(p)
    room = max(0.5, slot_end - start - 0.1)
    tempo = min(1.12, d / room) if d > room else 1.0
    cursor = start + d / tempo + 0.05
    if cursor > TOTAL:
        print(f'warning: line {i} ends at {cursor:.1f}s, after the video ({TOTAL}s)')
    print(f'line {i:02d}: {start:5.2f}s, {d:4.2f}s, tempo {tempo:.2f}')
    inputs += ['-i', p]
    chains.append(f'[{i}:a]aresample=48000,atempo={tempo:.3f},adelay={int(start * 1000)}|{int(start * 1000)}[v{i}]')
    timing.append((start, start + d / tempo))
track = os.path.join(DIR, 'out', f'vo-{fmt}-{lang}.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(chains) + ';' + ''.join(f'[v{i}]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0[a]', '-map', '[a]', track], check=True)


def chunks(text, limit):
    """Subtitle cards of at most `limit` characters, split at sentence ends, then commas, then words."""
    import re
    out = []
    for sent in re.split(r'(?<=[.?!…;:])\s+', text):
        while len(sent) > limit:
            cut = max(sent.rfind(', ', 0, limit), sent.rfind(' ', 0, limit))
            out.append(sent[: cut + 1].strip())
            sent = sent[cut + 1:].strip()
        if sent:
            out.append(sent)
    merged = []
    for c in out:  # join short neighbours
        if merged and len(merged[-1]) + len(c) + 1 <= limit:
            merged[-1] += ' ' + c
        else:
            merged.append(c)
    return merged


def ts(x):
    ms = int(round(x * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


# English subtitles timed to the voice (only for lines that have a translation).
subs = SUBS[(fmt, lang)]
if any(subs):
    limit = 32 if fmt == 'reel' else 62
    cards = []
    for (a, b), s in zip(timing, subs):
        if not s:
            continue
        parts_ = chunks(s, limit)
        total = sum(len(p) for p in parts_)
        t = a
        for p in parts_:
            d = (b - a) * len(p) / total
            cards.append([t, min(t + d + 0.25, b + 0.6), p])
            t += d
    for c, nxt in zip(cards, cards[1:]):  # never two cards on screen at once
        c[1] = min(c[1], nxt[0] - 0.02)
    srt = os.path.join(DIR, 'out', f'{fmt}-{lang}.srt')
    open(srt, 'w', encoding='utf-8').write('\n'.join(f'{i}\n{ts(a_)} --> {ts(b_)}\n{p}\n' for i, (a_, b_, p) in enumerate(cards, 1)))
    print(srt)
subprocess.run([os.path.join(DIR, 'mix.sh'), fmt, lang, track, '0'], check=True)

"""Music and sound design for the Turbodrop teaser, synthesised from scratch (no samples, no licences needed).
TEASER_STYLE=calm (default: pads, felt piano, soft pulse) or energetic (the first, sports-broadcast style).

python3 sound.py out/reel-en-cues.json out/reel-music.wav
120 BPM, A minor (Am - F - C - G), one bar = 2 s, so every scene cut lands on a bar line.
The arrangement follows the scenes; hits, whooshes, typing, the whistle and the crowd follow the cues.
"""
import json
import sys

import numpy as np
from scipy import signal

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(3)

cues_file, out_file = sys.argv[1], sys.argv[2]
info = json.load(open(cues_file))
TOTAL = info['total'] + 2.5  # tail for the last ring-out
N = int(TOTAL * SR)


def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def bus():
    return np.zeros((2, N))


def add(b, x, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i + len(x) <= 0:
        return
    x = x[: N - i] if x.ndim == 1 else x[:, : N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    if x.ndim == 1:
        b[0, i:i + len(x)] += x * gain * l * 1.414
        b[1, i:i + len(x)] += x * gain * r * 1.414
    else:
        b[:, i:i + x.shape[1]] += x * gain


def sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def saw(freq, t, detune=0.0):
    ph = (freq * (1 + detune) * t + rng.random()) % 1.0
    return 2 * ph - 1


def note(n):  # MIDI to Hz
    return 440 * 2 ** ((n - 69) / 12)


# ---------------- instruments ----------------

def kick():
    t = t_arr(0.5)
    f = 42 + 120 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 6.5)
    x[:150] += noise(150 / SR) * np.linspace(0.6, 0, 150)
    return np.tanh(x * 1.6)


def snare():
    t = t_arr(0.35)
    n = filt(noise(0.35), 'bandpass', [900, 7000]) * np.exp(-t * 16)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25)
    return (n * 0.9 + tone * 0.6) * 0.8


def clap():
    t = t_arr(0.4)
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * 90), 0)
    env += np.where(t >= 0.03, np.exp(-(t - 0.03) * 14) * 0.6, 0)
    return filt(noise(0.4), 'bandpass', [1000, 5000]) * env * 0.9


def hat(open_=False):
    d = 0.3 if open_ else 0.06
    t = t_arr(d)
    return filt(noise(d), 'highpass', 7500) * np.exp(-t * (11 if open_ else 70)) * 0.5


def tom(freq):
    t = t_arr(0.5)
    f = freq * (1 + 0.6 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)


def supersaw(freqs, dur, attack=0.005, release=0.2, cutoff=4000, voices=5, spread=0.012):
    t = t_arr(dur + release)
    out = np.zeros((2, len(t)))
    for f in freqs:
        for v in range(voices):
            det = (v - (voices - 1) / 2) * spread / max(1, voices - 1) * 2
            pan = (v / max(1, voices - 1)) * 2 - 1
            s = saw(f, t, det)
            out[0] += s * (1 - pan) / 2
            out[1] += s * (1 + pan) / 2
    env = np.minimum(1, t / attack) * np.where(t < dur, 1, np.exp(-(t - dur) / max(0.01, release / 4)))
    out *= env / (len(freqs) * voices) * 2.2
    return np.vstack([filt(out[0], 'lowpass', cutoff), filt(out[1], 'lowpass', cutoff)])


def bass_note(freq, dur):
    t = t_arr(dur)
    x = saw(freq, t) * 0.6 + np.sin(2 * np.pi * freq * t) * 0.8
    env = np.minimum(1, t / 0.004) * np.exp(-t * 2.5)
    return np.tanh(filt(x, 'lowpass', 420) * env * 1.8) * 0.75


def riser(dur):
    t = t_arr(dur)
    n = noise(dur)
    out = np.zeros_like(n)
    blocks = 64
    edges = np.linspace(0, len(n), blocks + 1).astype(int)
    for k in range(blocks):
        fc = 300 * (8000 / 300) ** (k / blocks)
        out[edges[k]:edges[k + 1]] = filt(n[edges[k]:edges[k + 1]], 'bandpass', [fc * 0.7, min(fc * 1.4, 20000)])
    sweep = np.sin(2 * np.pi * np.cumsum(200 * (6 ** (t / dur))) / SR) * 0.25
    return (out * 1.6 + sweep) * (t / dur) ** 2 * 0.7


def impact(big=1.0):
    t = t_arr(2.6)
    f = 30 + 45 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    crash = filt(noise(2.6), 'lowpass', 6000) * np.exp(-t * 3.5) * 0.45
    return np.tanh((boom * 1.4 + crash) * big)


def whoosh(dur=0.45):
    t = t_arr(dur)
    n = noise(dur)
    out = np.zeros_like(n)
    blocks = 24
    edges = np.linspace(0, len(n), blocks + 1).astype(int)
    for k in range(blocks):
        p = k / blocks
        fc = 500 + 5000 * np.sin(np.pi * p)
        out[edges[k]:edges[k + 1]] = filt(n[edges[k]:edges[k + 1]], 'bandpass', [fc * 0.6, fc * 1.6])
    return out * np.sin(np.pi * t / dur) ** 2 * 0.55


def click(freq=3200, dur=0.012, g=0.35):
    t = t_arr(dur)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 400) * g + filt(noise(dur), 'highpass', 3000) * np.exp(-t * 600) * g * 0.6


def pop():
    t = t_arr(0.09)
    f = 380 + 900 * t / 0.09
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.45


def ding():
    t = t_arr(1.2)
    return (np.sin(2 * np.pi * 1760 * t) + 0.5 * np.sin(2 * np.pi * 2637 * t) + 0.25 * np.sin(2 * np.pi * 3520 * t)) * np.exp(-t * 4) * 0.25


def glitch_sfx(dur=0.15):
    t = t_arr(dur)
    sq = np.sign(np.sin(2 * np.pi * (800 + 1600 * rng.random()) * t))
    crush = np.round(noise(dur) * 3) / 3
    gate = (np.floor(t * 60) % 2)
    return (sq * 0.25 + crush * 0.25) * gate * 0.6


def strike_sfx():
    t = t_arr(0.35)
    return snare() * 0.6 + np.concatenate([whoosh(0.2) * 0.8, np.zeros(len(t) - int(0.2 * SR))])[: len(snare())] * 0.5


def lock_sfx():
    a = click(1800, 0.02, 0.6)
    b = click(2600, 0.03, 0.7)
    out = np.zeros(int(0.2 * SR))
    out[: len(a)] += a
    out[int(0.06 * SR): int(0.06 * SR) + len(b)] += b
    return out + np.concatenate([tom(90)[: len(out)] * 0.4])


def whistle():
    """Referee whistle: two short blasts and a long one, with the pea's trill."""
    parts = []
    for dur in (0.16, 0.16, 0.7):
        t = t_arr(dur)
        trill = 1 + 0.5 * np.sin(2 * np.pi * 34 * t)
        f = 2950 + 60 * np.sin(2 * np.pi * 34 * t)
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * trill
        breath = filt(noise(dur), 'bandpass', [2400, 3600]) * 0.25
        env = np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.03)
        parts.append((tone * 0.35 + breath) * env)
        parts.append(np.zeros(int(0.07 * SR)))
    return np.concatenate(parts) * 0.8


def crowd(dur=3.5):
    t = t_arr(dur)
    n = np.vstack([filt(noise(dur), 'bandpass', [250, 2600]), filt(noise(dur), 'bandpass', [250, 2600])])
    mod = 0.7 + 0.3 * np.sin(2 * np.pi * 3.1 * t + rng.random() * 6) * np.sin(2 * np.pi * 0.7 * t)
    swell = np.minimum(1, t / 0.4) * np.exp(-np.maximum(0, t - 1.2) * 1.1)
    voices = np.zeros_like(t)
    for _ in range(40):  # many distant "hey!" shouts
        c = rng.random() * dur * 0.7
        f0 = 180 + rng.random() * 250
        d = 0.25 + rng.random() * 0.3
        m = (t >= c) & (t < c + d)
        tt = t[m] - c
        voices[m] += np.sin(2 * np.pi * f0 * tt * (1 + 0.15 * tt)) * np.sin(np.pi * tt / d) * 0.08
    voices = filt(voices, 'lowpass', 1800)
    return (n * mod * 0.35 + voices) * swell


def pad(freqs, dur):
    return supersaw(freqs, dur, attack=0.8, release=1.5, cutoff=1800, voices=5, spread=0.02) * 0.6


def energetic():
    """The first, sports-broadcast style (drums, drops, whistle, crowd)."""
    # ---------------- arrangement ----------------
    music = bus()   # drums, bass, chords (ducked by the voice later)
    sfx = bus()     # hits and effects
    CHORDS = [  # Am, F, C, G  (MIDI)
        (57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (48, [55, 60, 64, 67]), (55, [55, 59, 62, 67]),
    ]
    K, SN, CL = kick(), snare(), clap()
    HC, HO = hat(), hat(True)

    MODE = {'hook': 'intro', 'matchday': 'build', 'problems': 'build', 'reveal': 'drop', 'how': 'full', 'features': 'groove',
            'speed': 'full', 'numbers': 'full', 'security': 'full', 'platforms': 'full', 'ai': 'filtered', 'score': 'drop',
            'collective': 'groove', 'cta': 'full', 'end': 'outro'}
    scenes = info['scenes']
    end_t = info['total']
    filtered_mask = np.zeros(N)
    kick_times = []

    # One global bar grid (scenes may end on a half bar when they are fitted to a voice; cuts stay on the beat).
    def scene_at(t):
        cur = scenes[0]
        for sc in scenes:
            if sc['t0'] <= t + 1e-6:
                cur = sc
        return cur


    for bar_index in range(int(np.ceil(end_t / BAR - 1e-6))):
            t0 = bar_index * BAR
            s = scene_at(t0)
            mode = MODE.get(s['name'], 'full')
            scene_end = s['t0'] + s['d']
            nxt = scene_at(t0 + BAR - 0.01)
            root, chord = CHORDS[bar_index % 4]
            last_bar = t0 + BAR >= scene_end - 1e-6 or nxt is not s
            if nxt is not s:  # the scene ends inside this bar: its build-up belongs to the next one's entrance
                scene_end = nxt['t0']
            if mode == 'intro':
                add(music, pad([note(n) for n in chord], BAR), t0, 0.5)
                add(music, bass_note(note(root - 12), BAR), t0, 0.5)
                if last_bar:
                    add(sfx, riser(BAR), scene_end - BAR, 0.7)
                continue
            if mode == 'outro':
                add(music, supersaw([note(n) for n in chord + [chord[0] + 12]], 0.4, release=2.5, cutoff=5000), t0, 0.9)
                add(music, pad([note(n) for n in chord], BAR * 1.5), t0, 0.6)
                add(music, bass_note(note(root - 12), BAR), t0, 0.8)
                continue
            # Drums
            for beat in range(4):
                bt = t0 + beat * BEAT
                if mode in ('drop', 'full', 'groove', 'filtered'):
                    add(music, K, bt, 0.95); kick_times.append(bt)
                elif mode == 'build':
                    add(music, K if beat % 2 == 0 else tom(110 - beat * 8), bt, 0.85 if beat % 2 == 0 else 0.6); kick_times.append(bt) if beat % 2 == 0 else None
                if beat in (1, 3) and mode != 'build':
                    add(music, CL, bt, 0.6, 0.1)
                    add(music, SN, bt, 0.35)
                for e in range(2):
                    ht = bt + e * BEAT / 2
                    add(music, HO if (e == 1 and mode in ('drop', 'full')) else HC, ht, 0.35 if e else 0.25, 0.35 if e else -0.3)
            if mode == 'build' and last_bar:
                for i in range(16):  # snare roll into the next scene
                    add(music, SN, scene_end - BAR + i * BEAT / 4, 0.15 + 0.5 * i / 16, 0.0)
                add(sfx, riser(BAR), scene_end - BAR, 0.8)
            # Bass: 8th notes, root and octave
            if mode != 'build':
                for e in range(8):
                    f = note(root - 24 + (12 if e % 4 == 3 else 0))
                    add(music, bass_note(f, BEAT / 2 * 0.9), t0 + e * BEAT / 2, 0.8)
            else:
                add(music, bass_note(note(root - 24), BAR), t0, 0.6)
            # Chords: anthem stabs (3-3-2 on the 8th grid), pads in groove
            if mode in ('drop', 'full', 'filtered'):
                for step in (0, 3, 6, 8, 11, 14):
                    add(music, supersaw([note(n) for n in chord], BEAT / 2 * 0.7, release=0.15, cutoff=3500 if mode != 'filtered' else 2000), t0 + step * BEAT / 4, 0.55)
            if mode in ('groove', 'filtered'):
                add(music, pad([note(n) for n in chord], BAR), t0, 0.35)
            if mode == 'filtered':
                filtered_mask[int(t0 * SR): int((t0 + BAR) * SR)] = 1
                if last_bar:
                    add(sfx, riser(BAR), scene_end - BAR, 0.6)

    # The voice-friendly "filtered" section: a smooth low-pass blend.
    fm = np.convolve(filtered_mask, np.ones(4800) / 4800, mode='same')
    low = np.vstack([filt(music[0], 'lowpass', 700), filt(music[1], 'lowpass', 700)])
    music = music * (1 - fm) + low * fm * 1.2

    # Sidechain: the bass and chords breathe with the kick.
    duck = np.ones(N)
    for kt in kick_times:
        i = int(kt * SR)
        L = int(0.22 * SR)
        seg = 1 - 0.45 * np.exp(-np.arange(L) / SR * 18)
        duck[i:i + L] = np.minimum(duck[i:i + L], seg[: max(0, min(L, N - i))])
    music *= duck

    # ---------------- effects from the cues ----------------
    cut_spans = []
    pending_cut = None
    for c in info['cues']:
        t, ty = c['t'], c['type']
        if ty == 'impact':
            add(sfx, impact(0.7 if c.get('soft') else 1.0), t, 0.75 if c.get('soft') else 1.0)
        elif ty == 'drop':
            add(sfx, impact(1.2), t, 1.1)
            add(sfx, supersaw([note(n) for n in (45, 57, 60, 64, 69)], 0.5, release=1.8, cutoff=6000), t, 0.9)
        elif ty == 'final':
            add(sfx, impact(1.2), t, 1.0)
            add(sfx, crowd(3.0), t + 0.1, 0.35)
        elif ty == 'hit':
            add(sfx, impact(0.5)[: int(0.8 * SR)] * np.linspace(1, 0, int(0.8 * SR)), t, 0.45 if c.get('soft') else 0.6)
            add(sfx, SN, t, 0.4)
        elif ty == 'whoosh':
            add(sfx, whoosh(), t - 0.15, 0.7, -0.4)
        elif ty == 'rise':
            add(sfx, whoosh(0.6), t, 0.4, 0.4)
        elif ty == 'glitch':
            add(sfx, glitch_sfx(max(0.08, c.get('dur', 0.12))), t, 0.55)
        elif ty == 'strike':
            add(sfx, strike_sfx(), t, 0.7)
        elif ty == 'tick':
            add(sfx, click(2400, 0.02, 0.5), t, 0.6)
        elif ty == 'type':
            add(sfx, click(2800 + rng.random() * 900, 0.015, 0.35), t, 0.7, rng.random() * 0.6 - 0.3)
        elif ty == 'pop':
            add(sfx, pop(), t, 0.6)
        elif ty == 'ding':
            add(sfx, ding(), t, 0.7)
        elif ty == 'lock':
            add(sfx, lock_sfx(), t, 0.9)
        elif ty == 'shimmer':
            add(sfx, ding() * 0.6, t, 0.5, 0.3)
        elif ty == 'whistle':
            add(sfx, whistle(), t, 0.85)
            add(sfx, crowd(3.5), t + 0.1, 0.6)
        elif ty == 'counter':
            n = 18
            for i in range(n):
                add(sfx, click(1500 + i * 90, 0.012, 0.3), t + c['dur'] * (i / n) ** 0.7, 0.6)
        elif ty == 'cut':
            pending_cut = t
        if ty == 'hit' and pending_cut is not None:
            cut_spans.append((pending_cut, t))
            pending_cut = None

    # The music stops when the Wi-Fi "drops" (tape-stop) and comes back on the resume hit.
    for a, b in cut_spans:
        ia, ib = int(a * SR), int(b * SR)
        stop = int(0.12 * SR)
        seg = music[:, ia:ia + stop].copy()
        idx = (np.cumsum(np.linspace(1, 0.2, stop))).astype(int)
        idx = np.clip(idx, 0, stop - 1)
        music[:, ia:ia + stop] = seg[:, idx] * np.linspace(1, 0, stop)
        music[:, ia + stop:ib] *= 0.0

    return music, sfx



# ---------------- calm style (default) ----------------
CALM_CHORDS = [  # Cmaj7, Am7, Fmaj7, G6  (root, chord tones, MIDI)
    (36, [60, 64, 67, 71]), (33, [57, 60, 64, 67]), (29, [53, 57, 60, 64]), (31, [55, 59, 62, 64]),
]


def pluck(f, dur=1.8, vel=1.0):
    """A soft felt-piano-like note: a few decaying partials and a gentle hammer."""
    t = t_arr(dur)
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
         + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 6))
    env = np.minimum(1, t / 0.006) * np.exp(-t * 2.4)
    x = x * env
    x[:240] += filt(noise(240 / SR), 'lowpass', 1800) * np.linspace(0.08, 0, 240)
    return filt(x, 'lowpass', 2600) * 0.3 * vel


def warm_pad(freqs, dur):
    t = t_arr(dur + 2.0)
    out = supersaw(freqs, dur, attack=1.2, release=2.0, cutoff=1300, voices=4, spread=0.008) * 0.45
    sine = sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    env = np.minimum(1, t / 1.2) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.6))
    n = min(out.shape[1], len(t))
    out[:, :n] += sine[:n] * env[:n] * 0.18
    return out


def low_pulse(f, vel=1.0):
    t = t_arr(1.0)
    return np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.02) * np.exp(-t * 3.2) * 0.22 * vel


def shaker():
    t = t_arr(0.08)
    return filt(noise(0.08), 'highpass', 6500) * np.exp(-t * 45) * 0.06


def chime(soft=False):
    t = t_arr(3.0)
    x = (np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 1975.5 * t) + 0.25 * np.sin(2 * np.pi * 2637 * t))
    return x * np.exp(-t * 1.6) * (0.08 if soft else 0.12)


def swell(dur=2.0):
    t = t_arr(dur)
    n = filt(noise(dur), 'bandpass', [400, 3000])
    return n * (t / dur) ** 2.2 * 0.12


def blip():
    t = t_arr(0.35)
    return np.sin(2 * np.pi * 880 * t) * np.exp(-t * 14) * 0.08


def soft_down():
    t = t_arr(0.5)
    f = 620 - 300 * t / 0.5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.07


def calm():
    """Warm pads, a felt-piano arpeggio and a gentle low pulse; soft swells and chimes instead of hits."""
    music, sfx = bus(), bus()
    mode_of = {'intro': 'intro', 'problem': 'soft', 'reveal': 'reveal', 'collective': 'soft', 'end': 'outro', 'dev': 'filtered'}
    scenes = info['scenes']
    end_t = info['total']
    filtered_mask = np.zeros(N)

    def scene_at(t):
        cur = scenes[0]
        for sc in scenes:
            if sc['t0'] <= t + 1e-6:
                cur = sc
        return cur

    for bar_index in range(int(np.ceil(end_t / BAR - 1e-6))):
        t0 = bar_index * BAR
        s = scene_at(t0)
        mode = mode_of.get(s['name'], 'full')
        root, chord = CALM_CHORDS[bar_index % 4]
        freqs = [note(n) for n in chord]
        add(music, warm_pad(freqs, BAR), t0, 0.55 if mode in ('intro', 'outro') else 0.45)
        if mode in ('intro',):
            continue
        if mode == 'outro':
            add(music, pluck(note(chord[0] + 12), 3.0, 0.6), t0, 0.8)
            continue
        steps = [0, 1, 2, 3, 2, 1, 2, 3]
        vels = [0.9, 0.45, 0.7, 0.45, 0.8, 0.45, 0.65, 0.5]
        for i in range(8):
            if mode == 'soft' and i % 2:
                continue
            f = note(chord[steps[i]] + 12)
            add(music, pluck(f, 1.8, vels[i] * (0.7 if mode == 'soft' else 1.0)), t0 + i * BEAT / 2, 0.9, (i % 4 - 1.5) * 0.25)
        if mode in ('full', 'reveal', 'filtered'):
            for b in (0, 2):
                add(music, low_pulse(note(root + 12), 1.0 if b == 0 else 0.7), t0 + b * BEAT, 0.9)
            if mode == 'full':
                for e in range(8):
                    if e % 2:
                        add(music, shaker(), t0 + e * BEAT / 2, 0.8, 0.3)
        if mode == 'filtered':
            filtered_mask[int(t0 * SR): int((t0 + BAR) * SR)] = 1

    fm = np.convolve(filtered_mask, np.ones(9600) / 9600, mode='same')
    low = np.vstack([filt(music[0], 'lowpass', 900), filt(music[1], 'lowpass', 900)])
    music = music * (1 - fm) + low * fm * 1.15

    for c in info['cues']:
        t, ty = c['t'], c['type']
        if ty == 'chime':
            add(sfx, chime(bool(c.get('soft'))), t, 1.0, 0.2)
        elif ty == 'reveal':
            add(sfx, swell(2.0), t - 2.0, 1.0)
            add(sfx, chime(), t + 0.1, 1.0, -0.2)
            add(music, warm_pad([note(n) for n in (48, 55, 64, 71)], 2.5), t, 0.5)
        elif ty == 'whoosh':
            add(sfx, whoosh(0.7), t - 0.35, 0.18, -0.3)
        elif ty == 'blip':
            add(sfx, blip(), t, 1.0)
        elif ty == 'soft-down':
            add(sfx, soft_down(), t, 1.0)
        elif ty == 'type':
            add(sfx, click(2600 + rng.random() * 600, 0.012, 0.12), t, 0.6, rng.random() * 0.4 - 0.2)
    return music, sfx


import os  # noqa: E402

STYLE = os.environ.get('TEASER_STYLE', 'calm')
music, sfx = calm() if STYLE == 'calm' else energetic()
end_t = info['total']


# ---------------- mix and master ----------------
def reverb(x, secs=1.4, mix=0.18):
    L = int(secs * SR)
    ir = np.vstack([noise(secs) * np.exp(-np.arange(L) / SR * 4.5), noise(secs) * np.exp(-np.arange(L) / SR * 4.5)])
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    wet = np.vstack([signal.fftconvolve(x[0], ir[0])[:N], signal.fftconvolve(x[1], ir[1])[:N]])
    return x + wet * mix


if STYLE == 'calm':
    mix = reverb(music, secs=2.6, mix=0.3) * 0.9 + reverb(sfx, secs=2.6, mix=0.35)
else:
    mix = reverb(music, mix=0.12) * 0.8 + reverb(sfx, mix=0.22) * 0.95
mix = np.vstack([filt(mix[0], 'highpass', 28), filt(mix[1], 'highpass', 28)])
# Fade out after the end.
fade = np.ones(N)
fe = int(end_t * SR)
fade[fe:] = np.linspace(1, 0, N - fe) ** 2
mix *= fade
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * (1.1 if STYLE == 'calm' else 1.6)) / np.tanh(1.1 if STYLE == 'calm' else 1.6)
mix *= 0.89 / (np.max(np.abs(mix)) + 1e-9)

from scipy.io import wavfile  # noqa: E402

wavfile.write(out_file, SR, (mix.T * 32767).astype(np.int16))
np.save(out_file.replace('.wav', '-music.npy'), music.astype(np.float32))
print(out_file, f'{TOTAL:.1f}s')

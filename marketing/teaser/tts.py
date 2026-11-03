"""Voice-over with ElevenLabs, each line placed at its scene time, then mixed under the music (mix.sh).

ELEVENLABS_API_KEY=... python3 tts.py <reel|youtube> <en|fa> [voice_id]
Without a voice id the first voice whose name or labels mention "sports", "announcer", "trailer" or "narrat" is used.
Model: eleven_v3 (supports Persian and audio tags such as [excited]).
"""
import json
import os
import subprocess
import sys
import urllib.request

KEY = os.environ.get('ELEVENLABS_API_KEY') or os.environ.get('XI_API_KEY')
fmt, lang = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else os.environ.get('ELEVENLABS_VOICE_ID')
DIR = os.path.dirname(os.path.abspath(__file__))

LINES = {
    ('reel', 'fa'): [(0, '[whispers] از آیفون به ویندوز… [shouts] هنوز با کابل؟'), (2, 'امروز… روز مسابقه‌ست!'), (4, 'کابل. فضای ابری. نصب برنامه.'),
                     (6, '[excited] این… توربودراپه!'), (8, 'کد رو اسکن کن، بفرست. روی گوشی هیچی نصب نمی‌شه.'), (12, 'با تمام سرعت وای‌فای؛ قطع هم بشه، از همون‌جا ادامه می‌ده.'),
                     (14, 'رمزنگاری سرتاسری. بدون فضای ابری، بدون حساب کاربری.'), (16, 'همهٔ دستگاه‌ها.'), (18, 'حتی دستیار هوش مصنوعیت هم با یه دستور می‌تونه بفرسته.'),
                     (22, '[shouts] پایان بازی! توربودراپ برنده‌ست!'), (24, 'رایگان و متن‌باز. همین حالا بگیرش.'), (28, 'پویام. متن‌باز، برای همه.')],
    ('reel', 'en'): [(0, '[whispers] iPhone to Windows… [shouts] still using cables?'), (2, "It's… matchday."), (4, 'Cables. Cloud. Apps.'), (6, '[excited] This… is Turbodrop.'),
                     (8, 'Scan the code. Send. Nothing to install on the phone.'), (12, 'Full Wi-Fi speed — and if it drops, it picks up where it stopped.'),
                     (14, 'End-to-end encrypted. No cloud. No account.'), (16, 'Every device.'), (18, 'And your AI agent can send it too. One command.'),
                     (22, '[shouts] Full time! Turbodrop wins!'), (24, 'Free. Open source. Get it now.'), (28, 'Pouyam. Open source, for everyone.')],
    ('youtube', 'fa'): [(0, 'از آیفون به ویندوز… از اندروید به مک… [shouts] هنوز با کابل؟'), (4, 'امشب روز مسابقه‌ست: گوشی‌ات، در برابر کامپیوترت.'),
                        (8, 'روش قدیمی؟ کابل. فضای ابری. یه برنامهٔ دیگه برای نصب.'), (12, '[excited] با توربودراپ آشنا شو. مثل ایردراپ، برای همهٔ دستگاه‌ها.'),
                        (16, 'توربودراپ رو روی کامپیوتر باز کن، کد QR رو با دوربین گوشی اسکن کن… و بفرست. عکس، فیلم، پوشه، متن. روی گوشی هیچی لازم نیست نصب بشه.'),
                        (24, 'وسط کار وای‌فای قطع شد؟ از آخرین تکه ادامه می‌ده. کامپیوترها با یه کد چهار ایموجی به هم وصل می‌شن. دستگاه‌های نزدیک خودشون پیدا می‌شن. عکس‌ها با پیش‌نمایش می‌رسن و همه‌شون رو یه‌جا به‌صورت زیپ ذخیره می‌کنی. پوشه‌ها ساختارشون رو نگه می‌دارن و فایل تکراری دوباره فرستاده نمی‌شه. انگار مال خود ویندوز یازده‌ه؛ اونم به دوازده زبان.'),
                        (40, 'با تمام سرعت وای‌فای. اتصال قطع بشه؟ دقیقاً از همون‌جا ادامه می‌ده.'), (44, 'نصب‌کنندهٔ چهار مگابایتی. موتورش یه گیگ رو توی هفت و نیم ثانیه جابه‌جا می‌کنه؛ تنها محدودیت، شبکهٔ خودته.'),
                        (48, 'رمزنگاری سرتاسری. بدون فضای ابری، بدون حساب کاربری، بدون اینترنت.'), (52, 'ویندوز، آیفون، اندروید، مک و لینوکس.'),
                        (56, 'برای برنامه‌نویس‌ها هم یه خط فرمان واقعی با خروجی جیسون داره؛ پس دستیار هوش مصنوعیت، مثل کلاد کد، کرسر، کودکس یا جمنای، با یه دستور می‌تونه فایل رو به گوشیت بفرسته.'),
                        (64, '[shouts] پایان بازی! توربودراپ چهار، کابل صفر!'), (68, 'توربودراپ رو متن‌باز پویام ساخته: ابزارهای رایگانی که برای خودمون می‌سازیم و به همه می‌دیم؛ به برنامه‌نویس‌ها و به همهٔ دنیا.'),
                        (76, 'رایگانه، متن‌بازه. از سایتش بگیرش؛ لینک توی توضیحات.'), (82, 'پویام‌ورلد رو توی اینستاگرام و یوتیوب دنبال کن. اگه به کارت اومد… بهش توی گیت‌هاب ستاره بده.')],
    ('youtube', 'en'): [(0, 'iPhone to Windows… Android to Mac… [shouts] still using cables?'), (4, "Tonight's matchday: your phone… against your PC."),
                        (8, 'The old way? Cables. The cloud. Yet another app.'), (12, '[excited] Meet Turbodrop. Like AirDrop — for every device.'),
                        (16, "Open Turbodrop on the computer, scan the QR code with your phone's camera… and send. Photos, videos, folders, text. The phone needs nothing installed."),
                        (24, 'Lose the Wi-Fi halfway? It resumes from the last chunk. Computers pair with a four-emoji code. Nearby devices show up on their own. Photos arrive with previews — save them all as one ZIP. Folders keep their structure, and files already there are skipped. It feels at home on Windows 11 — in twelve languages.'),
                        (40, 'Full Wi-Fi speed. Drop the connection — and it picks up right where it stopped.'), (44, 'A four-megabyte installer. An engine that moves a gigabyte in seven and a half seconds — your network is the only limit.'),
                        (48, 'End-to-end encrypted. No cloud, no account, no internet needed.'), (52, 'Windows, iPhone, Android, Mac and Linux.'),
                        (56, 'And for developers: a real command line with JSON output. So your AI agent — Claude Code, Cursor, Codex, Gemini CLI — can send a file to your phone with a single command.'),
                        (64, '[shouts] Full time! Turbodrop four, cables nil!'), (68, 'Turbodrop is made by Pouyam Open Source: free tools we build for ourselves and give to everyone — developers and the whole world.'),
                        (76, "It's free. It's open source. Get it from the link in the description."), (82, 'Follow pouyamworld on Instagram and YouTube. And if it helped you… give it a star on GitHub.')],
}


def api(path, body=None):
    req = urllib.request.Request('https://api.elevenlabs.io' + path, data=json.dumps(body).encode() if body else None,
                                 headers={'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' if body else 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


if not KEY:
    sys.exit('ELEVENLABS_API_KEY is not set')
if not voice:
    voices = json.loads(api('/v1/voices'))['voices']
    words = ('sports', 'announcer', 'trailer', 'narrat', 'commentat')
    pick = next((v for v in voices if any(w in json.dumps([v.get('name'), v.get('labels'), v.get('description')]).lower() for w in words)), voices[0])
    voice = pick['voice_id']
    print('voice:', pick['name'])

parts = []
for i, (t, text) in enumerate(LINES[(fmt, lang)]):
    path = os.path.join(DIR, 'out', f'vo-{fmt}-{lang}-{i:02d}.mp3')
    audio = api(f'/v1/text-to-speech/{voice}?output_format=mp3_44100_192', {
        'text': text, 'model_id': 'eleven_v3', 'language_code': lang,
        'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.6},
    })
    open(path, 'wb').write(audio)
    parts.append((t, path))
    print(f'{t:>5}s  {text[:60]}')

# One track with every line at its start time.
inputs, chains = [], []
for i, (t, p) in enumerate(parts):
    inputs += ['-i', p]
    chains.append(f'[{i}:a]aresample=48000,adelay={int(t * 1000)}|{int(t * 1000)}[v{i}]')
track = os.path.join(DIR, 'out', f'vo-{fmt}-{lang}.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(chains) + ';' + ''.join(f'[v{i}]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0[a]', '-map', '[a]', track], check=True)
subprocess.run([os.path.join(DIR, 'mix.sh'), fmt, lang, track, '0'], check=True)

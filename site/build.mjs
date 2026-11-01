// Builds the landing page in English and Persian: node site/build.mjs → site/dist
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const HERE = import.meta.dirname;
const ROOT = join(HERE, '..');
const OUT = join(HERE, 'dist');
const SITE = 'https://pouyamsmartcity.github.io/turbodrop';
const REPO = 'https://github.com/pouyamsmartcity/turbodrop';
const REL = `${REPO}/releases/latest`;

const T = {
  en: {
    dir: 'ltr',
    title: 'Turbodrop — like AirDrop for Windows, iPhone & Android. No app on the phone.',
    desc: 'Free, open-source AirDrop alternative. Send files, photos and videos between Windows, iPhone, Android, Mac and Linux over Wi-Fi. Phones just scan a QR code. End-to-end encrypted, resumable, no internet needed.',
    nav: ['Features', 'How it works', 'Compare', 'FAQ'],
    badge: 'Free & open source · MIT',
    h1a: 'Like AirDrop,',
    h1b: 'for every device.',
    lead: 'Send files between Windows, iPhone, Android, Mac and Linux. The phone scans a QR code and sends <b>and</b> receives right in the browser — no app, no account, no cloud, no internet.',
    dl: 'Download for Windows',
    gh: 'Star on GitHub',
    other: 'macOS · Linux · CLI',
    stats: [['0', 'apps on the phone'], ['E2E', 'encrypted, every byte'], ['136 MiB/s', 'measured, encryption on'], ['12', 'languages, RTL included']],
    fTitle: 'Everything AirDrop does. On everything AirDrop doesn’t.',
    features: [
      ['📱', 'Zero-install phones', 'iPhone, iPad and Android send and receive in the browser after one QR scan. Works without the App Store.'],
      ['⏯️', 'Never start over', 'Wi‑Fi dropped? Phone locked? App restarted? The transfer resumes from the last chunk.'],
      ['🔒', 'End-to-end encrypted', 'XChaCha20-Poly1305 on every byte. The key lives in the QR code and never crosses the network.'],
      ['📁', 'Folders, intact', 'Send whole folders and keep the structure — on every side.'],
      ['🗜️', 'Save all as ZIP', 'Fifty photos, one tap on the phone. With previews and long-press to save to Photos.'],
      ['♻️', 'Smart duplicates', 'Already there? Skipped. Same name, new content? Saved next to it, never overwritten.'],
      ['🖱️', 'Right-click to send', '“Send with Turbodrop” in Windows Explorer, a tray icon, start with Windows, native notifications.'],
      ['💬', 'Text & links', 'Send a Wi‑Fi password or a link in one click. Links open, text copies.'],
      ['📡', 'Finds everyone', 'Nearby computers appear on a live radar. QR codes for Wi‑Fi, Ethernet, hotspot and Tailscale.'],
      ['✅', 'You decide', 'Approve unknown devices, compare a 4-emoji code, trust your own machines.'],
      ['🌍', '12 languages', 'Including Persian and Arabic with full right-to-left layouts and native digits.'],
      ['⌨️', 'A real CLI', 'QR code in the terminal, JSON output, Windows/macOS/Linux. Script your transfers.'],
    ],
    howTitle: 'Three steps. Ten seconds.',
    how: [['Open Turbodrop on the computer', 'Windows app, or the CLI on macOS/Linux.'], ['Scan the QR code with the phone camera', 'Same Wi‑Fi, or the computer’s hotspot.'], ['Drop files on either side', 'They fly over, encrypted, at full Wi‑Fi speed.']],
    shotsTitle: 'Designed for Windows 11. Loved on the phone.',
    cmpTitle: 'How it compares',
    cmpHead: ['', 'Turbodrop', 'LocalSend', 'PairDrop / Snapdrop'],
    cmp: [
      ['Phone without installing anything', 'yes|Send and receive', 'part|Browser can only download, one file at a time', 'yes|'],
      ['Works without internet', 'yes|', 'yes|', 'no|Needs a signaling server'],
      ['Resume after a dropped connection', 'yes|', 'no|Requested (#1191)', 'no|'],
      ['Skip files already there', 'yes|', 'no|Requested (#443)', 'no|'],
      ['Send folders', 'yes|', 'yes|', 'no|'],
      ['Save all as ZIP on the phone', 'yes|', 'no|', 'no|'],
      ['No certificate warnings in the browser', 'yes|', 'part|Self-signed HTTPS warning', 'yes|'],
    ],
    cmpNote: 'LocalSend is excellent when both sides have it installed. Turbodrop is for when the other side has nothing.',
    faqTitle: 'Questions',
    faq: [
      ['How do I send photos from an iPhone to a Windows PC without an app?', 'Install Turbodrop on the PC, open the Phone tab and scan the QR code with the iPhone camera. Tap “Send files”, pick the photos — they land in Downloads\\Turbodrop. No iTunes, cable, cloud or App Store app.'],
      ['Is it really free? What’s the catch?', 'It’s MIT-licensed open source by Pouyam. No ads, no accounts, no tracking, no servers — your files never leave your network.'],
      ['Does it need internet?', 'No. Only a shared local network: Wi‑Fi, Ethernet, or the PC’s mobile hotspot.'],
      ['Is it secure?', 'Every byte is encrypted end-to-end with XChaCha20-Poly1305. Computers pair with X25519 and show an emoji code. Read the full threat model on GitHub.'],
      ['What if the transfer gets interrupted?', 'It resumes. Turbodrop moves files in 4 MiB chunks and remembers where it stopped, even across app restarts.'],
      ['Android to iPhone?', 'Yes — connect both phones to Turbodrop on a computer and send through it, or send between phone and computer directly.'],
    ],
    ctaTitle: 'Every device. One drop.',
    footer: 'Made with ❤️ by <a href="https://www.pouyam.com">Pouyam</a>. AirDrop is a trademark of Apple Inc.; Turbodrop is independent and not affiliated with Apple.',
    langLink: ['fa/', 'فارسی'],
  },
  fa: {
    dir: 'rtl',
    title: 'توربودراپ — ایردراپ برای ویندوز، آیفون و اندروید، بدون نصب اپ روی گوشی',
    desc: 'جایگزین رایگان و متن‌باز ایردراپ. فایل، عکس و فیلم را از طریق وای‌فای بین ویندوز، آیفون، اندروید، مک و لینوکس جابه‌جا کنید. گوشی فقط کد QR را اسکن می‌کند. رمزنگاری سرتاسری دارد، بعد از قطعی ادامه می‌دهد و اینترنت لازم ندارد.',
    nav: ['امکانات', 'چطور کار می‌کند', 'مقایسه', 'پرسش‌ها'],
    badge: 'رایگان و متن‌باز · MIT',
    h1a: 'مثل ایردراپ،',
    h1b: 'برای همهٔ دستگاه‌ها.',
    lead: 'فایل‌ها را بین ویندوز، آیفون، اندروید، مک و لینوکس بفرستید. گوشی کد QR را اسکن می‌کند و همان‌جا در مرورگر، هم می‌فرستد <b>و هم</b> دریافت می‌کند: بدون اپ، بدون حساب کاربری، بدون فضای ابری و بدون اینترنت.',
    dl: 'دانلود برای ویندوز',
    gh: 'ستاره در گیت‌هاب',
    other: 'مک · لینوکس · خط فرمان',
    stats: [['۰', 'اپ روی گوشی'], ['E2E', 'رمزنگاری همهٔ داده‌ها'], ['۱۳۶ مگابایت/ثانیه', 'سرعت اندازه‌گیری‌شده با رمزنگاری'], ['۱۲', 'زبان، با راست‌به‌چپ']],
    fTitle: 'هر کاری ایردراپ می‌کند، روی دستگاه‌هایی که ایردراپ ندارند.',
    features: [
      ['📱', 'گوشی بدون نصب', 'آیفون، آیپد و اندروید با یک اسکن QR در مرورگر هم می‌فرستند و هم دریافت می‌کنند. اپ‌استور لازم نیست.'],
      ['⏯️', 'هیچ‌وقت از اول نه', 'وای‌فای قطع شد؟ گوشی قفل شد؟ برنامه بسته شد؟ انتقال از آخرین تکه ادامه پیدا می‌کند.'],
      ['🔒', 'رمزنگاری سرتاسری', 'همهٔ داده‌ها با XChaCha20-Poly1305 رمز می‌شوند. کلید داخل خود کد QR است و هیچ‌وقت روی شبکه فرستاده نمی‌شود.'],
      ['📁', 'پوشه با همان ساختار', 'پوشهٔ کامل را بفرستید، ساختار زیرپوشه‌ها همان می‌ماند.'],
      ['🗜️', 'ذخیرهٔ همه با ZIP', 'پنجاه عکس، با یک لمس روی گوشی. پیش‌نمایش هم دارد و با نگه داشتن انگشت در گالری ذخیره می‌شود.'],
      ['♻️', 'تشخیص تکراری', 'فایلی که از قبل هست دوباره فرستاده نمی‌شود. اگر اسم یکی باشد ولی محتوا فرق کند، کنارش ذخیره می‌شود و روی قبلی نوشته نمی‌شود.'],
      ['🖱️', 'ارسال با راست‌کلیک', 'گزینهٔ «ارسال با توربودراپ» در منوی راست‌کلیک ویندوز، آیکون کنار ساعت، اجرا همراه با ویندوز و اعلان‌های ویندوز.'],
      ['💬', 'متن و لینک', 'رمز وای‌فای یا یک لینک را با یک کلیک بفرستید.'],
      ['📡', 'پیدا کردن خودکار', 'دستگاه‌های نزدیک روی رادار زنده دیده می‌شوند. برای وای‌فای، کابل شبکه، هات‌اسپات و Tailscale کد QR جدا هست.'],
      ['✅', 'تصمیم با شماست', 'درخواست دستگاه ناشناس را قبول یا رد کنید، کد ۴ ایموجی‌ای را مقایسه کنید و به دستگاه‌های خودتان اعتماد کنید.'],
      ['🌍', '۱۲ زبان', 'فارسی و عربی با چیدمان کامل راست‌به‌چپ و اعداد فارسی.'],
      ['⌨️', 'خط فرمان واقعی', 'کد QR داخل ترمینال و خروجی JSON، روی ویندوز، مک و لینوکس.'],
    ],
    howTitle: 'سه قدم، ده ثانیه.',
    how: [['توربودراپ را روی کامپیوتر باز کنید', 'برنامهٔ ویندوز، یا خط فرمان روی مک و لینوکس.'], ['کد QR را با دوربین گوشی اسکن کنید', 'هر دو روی یک وای‌فای، یا گوشی روی هات‌اسپات کامپیوتر.'], ['فایل‌ها را در هر طرف رها کنید', 'با تمام سرعت وای‌فای و رمزنگاری‌شده منتقل می‌شوند.']],
    shotsTitle: 'طراحی‌شده برای ویندوز ۱۱، دوست‌داشتنی روی گوشی.',
    cmpTitle: 'مقایسه',
    cmpHead: ['', 'توربودراپ', 'LocalSend', 'PairDrop / Snapdrop'],
    cmp: [
      ['گوشی بدون نصب هیچ چیز', 'yes|ارسال و دریافت', 'part|مرورگر فقط دانلود، فایل‌به‌فایل', 'yes|'],
      ['کار بدون اینترنت', 'yes|', 'yes|', 'no|سرور واسط لازم دارد'],
      ['ادامه بعد از قطعی', 'yes|', 'no|درخواست‌شده (#1191)', 'no|'],
      ['رد کردن فایل‌های موجود', 'yes|', 'no|درخواست‌شده (#443)', 'no|'],
      ['ارسال پوشه', 'yes|', 'yes|', 'no|'],
      ['ذخیرهٔ همه با ZIP روی گوشی', 'yes|', 'no|', 'no|'],
      ['بدون هشدار گواهی در مرورگر', 'yes|', 'part|هشدار گواهی خودامضا', 'yes|'],
    ],
    cmpNote: 'وقتی هر دو طرف LocalSend نصب دارند، LocalSend عالی است. توربودراپ برای وقتی است که طرف مقابل هیچ چیز نصب ندارد.',
    faqTitle: 'پرسش‌ها',
    faq: [
      ['چطور بدون اپ عکس را از آیفون به ویندوز بفرستم؟', 'توربودراپ را روی کامپیوتر نصب کنید، بخش «گوشی» را باز کنید و کد QR را با دوربین آیفون اسکن کنید. «ارسال فایل» را بزنید و عکس‌ها را انتخاب کنید. فایل‌ها در Downloads\\Turbodrop ذخیره می‌شوند. آیتونز، کابل، فضای ابری یا اپ لازم نیست.'],
      ['واقعاً رایگان است؟', 'بله. متن‌باز با مجوز MIT و ساخت پویام است. تبلیغ، حساب کاربری، ردیابی و سرور واسط ندارد و فایل‌ها از شبکهٔ شما بیرون نمی‌روند.'],
      ['اینترنت لازم دارد؟', 'نه. فقط یک شبکهٔ محلی مشترک لازم است: وای‌فای، کابل شبکه یا هات‌اسپات کامپیوتر.'],
      ['امن است؟', 'همهٔ داده‌ها با XChaCha20-Poly1305 رمزنگاری سرتاسری می‌شوند. کامپیوترها با X25519 به هم وصل می‌شوند و کد ایموجی نشان می‌دهند. توضیح کامل امنیت در گیت‌هاب است.'],
      ['اگر وسط انتقال قطع شود چه؟', 'از همان‌جا ادامه می‌دهد. توربودراپ فایل را در تکه‌های ۴ مگابایتی منتقل می‌کند و جای توقف را حتی بعد از بسته شدن برنامه هم یادش می‌ماند.'],
      ['از اندروید به آیفون هم می‌شود؟', 'بله. هر دو گوشی را به توربودراپ روی کامپیوتر وصل کنید و از طریق کامپیوتر بفرستید.'],
    ],
    ctaTitle: 'هر دستگاهی را ایردراپی کنید.',
    footer: 'ساخته‌شده با ❤️ توسط <a href="https://www.pouyam.com">پویام</a>. AirDrop علامت تجاری Apple Inc. است؛ توربودراپ پروژه‌ای مستقل است و ارتباطی با اپل ندارد.',
    langLink: ['../', 'English'],
  },
};

function page(lang) {
  const t = T[lang];
  const base = lang === 'en' ? '' : '../';
  const url = lang === 'en' ? `${SITE}/` : `${SITE}/fa/`;
  const mark = (v) => {
    const [k, note] = v.split('|');
    const icon = k === 'yes' ? '✓' : k === 'no' ? '✕' : '~';
    return `<td class="${k}"><span class="m">${icon}</span>${note ? `<small>${note}</small>` : ''}</td>`;
  };
  const shots = lang === 'fa'
    ? ['desktop-home-fa.png', 'phone-receive-fa.png', 'desktop-nearby.png', 'phone-send-fa.png']
    : ['desktop-home.png', 'phone-receive.png', 'desktop-nearby.png', 'phone-send.png'];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Turbodrop',
    alternateName: lang === 'fa' ? 'توربودراپ' : undefined,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Windows, macOS, Linux, iOS (browser), Android (browser)',
    description: t.desc,
    url,
    downloadUrl: REL,
    license: 'https://opensource.org/licenses/MIT',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Pouyam', url: 'https://www.pouyam.com' },
    screenshot: `${SITE}/screenshots/${shots[0]}`,
  };
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
  return `<!doctype html>
<html lang="${lang}" dir="${t.dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t.title}</title>
<meta name="description" content="${t.desc}" />
<meta name="keywords" content="AirDrop alternative, AirDrop for Windows, iPhone to PC file transfer, Android to iPhone, LocalSend alternative, Snapdrop, PairDrop, send files over Wi-Fi, QR code file transfer, open source, Turbodrop, Pouyam, ایردراپ ویندوز, انتقال فایل آیفون به کامپیوتر" />
<link rel="canonical" href="${url}" />
<link rel="alternate" hreflang="en" href="${SITE}/" />
<link rel="alternate" hreflang="fa" href="${SITE}/fa/" />
<link rel="alternate" hreflang="x-default" href="${SITE}/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${t.title}" />
<meta property="og:description" content="${t.desc}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE}/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#070912" />
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;700;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${base}style.css" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
</head>
<body>
<div class="aurora"></div>
<header class="top">
  <a class="brand" href="${base || './'}"><img src="${base}favicon.svg" width="30" height="30" alt="" />Turbodrop</a>
  <nav><a href="#features">${t.nav[0]}</a><a href="#how">${t.nav[1]}</a><a href="#compare">${t.nav[2]}</a><a href="#faq">${t.nav[3]}</a></nav>
  <div class="right"><a class="lang" href="${t.langLink[0]}" hreflang="${lang === 'en' ? 'fa' : 'en'}">${t.langLink[1]}</a><a class="ghbtn" href="${REPO}" aria-label="GitHub"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.3 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z"/></svg></a></div>
</header>

<main>
<section class="hero">
  <span class="pill">${t.badge}</span>
  <h1>${t.h1a} <span class="grad">${t.h1b}</span></h1>
  <p class="lead">${t.lead}</p>
  <div class="ctas">
    <a class="btn primary" href="${REL}"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5 10 4.5v7H3zM11 4.4 21 3v8.5H11zM3 12.5h7v7l-7-1zM11 12.5h10V21l-10-1.4z"/></svg>${t.dl}</a>
    <a class="btn" href="${REPO}">★ ${t.gh}</a>
  </div>
  <a class="other" href="${REL}">${t.other}</a>
  <div class="stage">
    <img class="desk" src="${base}screenshots/${shots[0]}" alt="Turbodrop desktop app" width="1280" height="800" />
    <img class="phone" src="${base}screenshots/${shots[1]}" alt="Turbodrop on iPhone Safari" width="393" height="852" />
  </div>
</section>

<section class="stats">${t.stats.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</section>

<section id="features" class="block">
  <h2>${t.fTitle}</h2>
  <div class="grid">${t.features.map(([i, h, p]) => `<article class="card"><div class="ic">${i}</div><h3>${h}</h3><p>${p}</p></article>`).join('')}</div>
</section>

<section id="how" class="block">
  <h2>${t.howTitle}</h2>
  <ol class="steps">${t.how.map(([h, p], i) => `<li><span>${lang === 'fa' ? '۱۲۳'[i] : i + 1}</span><div><h3>${h}</h3><p>${p}</p></div></li>`).join('')}</ol>
</section>

<section class="block">
  <h2>${t.shotsTitle}</h2>
  <div class="gallery">
    <div class="g1">
      <img src="${base}screenshots/${shots[2]}" alt="Nearby devices radar" width="1280" height="800" />
      <img src="${base}screenshots/${shots[3]}" alt="Sending a video from the phone" width="393" height="852" />
    </div>
    <div class="g2">
      <img src="${base}screenshots/desktop-request.png" alt="Incoming request with emoji verification code" width="1280" height="800" />
      <img src="${base}screenshots/desktop-phone.png" alt="QR code to connect a phone" width="1280" height="800" />
    </div>
  </div>
</section>

<section id="compare" class="block">
  <h2>${t.cmpTitle}</h2>
  <div class="tablewrap"><table>
    <thead><tr>${t.cmpHead.map((h, i) => `<th${i === 1 ? ' class="us"' : ''}>${h}</th>`).join('')}</tr></thead>
    <tbody>${t.cmp.map((r) => `<tr><th>${r[0]}</th>${r.slice(1).map(mark).join('')}</tr>`).join('')}</tbody>
  </table></div>
  <p class="note">${t.cmpNote}</p>
</section>

<section id="faq" class="block">
  <h2>${t.faqTitle}</h2>
  <div class="faq">${t.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
</section>

<section class="cta">
  <h2>${t.ctaTitle}</h2>
  <div class="ctas"><a class="btn primary" href="${REL}">${t.dl}</a><a class="btn" href="${REPO}">★ ${t.gh}</a></div>
</section>
</main>

<footer><p>${t.footer}</p><p class="tiny">© 2026 Pouyam · MIT · <a href="${REPO}">GitHub</a> · <a href="${base}llms.txt">llms.txt</a></p></footer>
</body>
</html>`;
}

mkdirSync(join(OUT, 'fa'), { recursive: true });
writeFileSync(join(OUT, 'index.html'), page('en'));
writeFileSync(join(OUT, 'fa', 'index.html'), page('fa'));
cpSync(join(HERE, 'style.css'), join(OUT, 'style.css'));
cpSync(join(ROOT, 'web', 'public', 'favicon.svg'), join(OUT, 'favicon.svg'));
cpSync(join(ROOT, 'docs', 'screenshots'), join(OUT, 'screenshots'), { recursive: true });
cpSync(join(ROOT, 'llms.txt'), join(OUT, 'llms.txt'));
try {
  cpSync(join(ROOT, 'docs', 'og.png'), join(OUT, 'og.png'));
} catch {
  /* og image is rendered separately */
}
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc></url><url><loc>${SITE}/fa/</loc></url></urlset>\n`,
);
console.log('site built in', OUT, dirname(OUT) ? '' : '');

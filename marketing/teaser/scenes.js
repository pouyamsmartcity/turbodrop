// Turbodrop teaser: scenes, copy (English and Persian) and timelines for the Reel (9:16) and YouTube (16:9).
// Calm, premium style: soft fades, generous space, Pouyam branding from the first to the last frame.
// Every claim comes from the Turbodrop README.
(() => {
  const { FORMAT, LANG, V, W, H, U, E, el, flashes, clamp } = ENGINE;
  const FA = LANG === 'fa';
  const fa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const num = (s) => (FA ? fa(s) : String(s));

  const COPY = {
    en: {
      presents: 'Pouyam presents', brandWord: 'Pouyam',
      problemA: 'iPhone → Windows', problemB: 'It shouldn’t be hard.',
      brand: 'Turbodrop', tagline: 'Like AirDrop, for every device.',
      step1: 'Scan', step2: 'Send', stepCap: 'Nothing to install on the phone',
      resumeTitle: 'It picks up where it stopped', lost: 'Connection lost', resumed: 'Resumed', done: 'Done',
      privTitle: 'Private by design', secure: ['End‑to‑end encrypted', 'No cloud', 'No account', 'No internet needed'],
      devices: 'Every device', plat: ['Windows', 'macOS', 'Linux', 'iPhone', 'Android'], langs: '12 languages · right‑to‑left too',
      devTitle: 'For developers<br>and AI agents', devNote: 'Command line · JSON events · llms.txt',
      freeTitle: 'Free and open source', mit: 'MIT licence', platLine: 'Windows · macOS · Linux · phones need nothing',
      endA: 'An open-source project by Pouyam', endB: 'Free tools for developers and everyone',
      watchNext: 'Watch next', subscribe: 'Subscribe',
      features: [
        ['Pair with an emoji code', 'Computers pair with X25519 and show a four‑emoji code to compare.', 'desktop-request', 'win'],
        ['Finds nearby devices', 'Automatic discovery on your network, or add one by IP.', 'desktop-nearby', 'win'],
        ['Photos arrive with previews', 'Save them all at once as one ZIP on the phone.', 'phone-receive', 'phone'],
        ['4K video at full Wi‑Fi speed', 'From the phone straight to the computer.', 'phone-send', 'phone'],
        ['Folders keep their structure', 'Files already there are skipped; nothing is overwritten.', 'desktop-drop', 'win'],
        ['At home on Windows 11', 'Light and dark, tray icon, “Send with Turbodrop” in the right‑click menu.', 'desktop-home-light', 'win'],
      ],
      numA: ['≈ 4 MB', 'Windows installer'],
      numB: ['1 GiB in 7.5 s', 'engine test, encryption included · your network is the limit'],
      coll: 'Pouyam Open Source',
      collSub: 'Free tools we build for ourselves and share with everyone: developers and the whole world. No accounts, no tracking.',
      projects: [['Turbodrop', 'Like AirDrop, for every device'], ['rtlint', 'Finds and fixes right‑to‑left and Persian typography bugs in code'], ['Traceless', 'Makes photos, videos and voice notes safe to share, offline']],
    },
    fa: {
      presents: 'پویام تقدیم می‌کند', brandWord: 'پویام',
      problemA: 'از آیفون به ویندوز', problemB: 'نباید سخت باشد.',
      brand: 'توربودراپ', tagline: 'مثل ایردراپ، برای همهٔ دستگاه‌ها',
      step1: 'اسکن کنید', step2: 'بفرستید', stepCap: 'روی گوشی چیزی نصب نمی‌شود',
      resumeTitle: 'از همان‌جا ادامه می‌دهد', lost: 'اتصال قطع شد', resumed: 'ادامه داده شد', done: 'تمام شد',
      privTitle: 'خصوصی، از پایه', secure: ['رمزنگاری سرتاسری', 'بدون فضای ابری', 'بدون حساب کاربری', 'بدون نیاز به اینترنت'],
      devices: 'همهٔ دستگاه‌ها', plat: ['ویندوز', 'مک', 'لینوکس', 'آیفون', 'اندروید'], langs: '۱۲ زبان · با راست‌به‌چپ کامل',
      devTitle: 'برای برنامه‌نویس‌ها<br>و دستیارهای هوش مصنوعی', devNote: 'خط فرمان · خروجی JSON · llms.txt',
      freeTitle: 'رایگان و متن‌باز', mit: 'مجوز MIT', platLine: 'ویندوز · مک · لینوکس · گوشی هیچ چیز لازم ندارد',
      endA: 'یک پروژهٔ متن‌باز از پویام', endB: 'ابزارهای رایگان برای برنامه‌نویس‌ها و همه',
      watchNext: 'ویدیوی بعدی', subscribe: 'سابسکرایب',
      features: [
        ['اتصال با کد ایموجی', 'کامپیوترها با X25519 جفت می‌شوند و یک کد چهار ایموجی برای مقایسه نشان می‌دهند.', 'desktop-request', 'win'],
        ['دستگاه‌های نزدیک را پیدا می‌کند', 'خودکار در شبکهٔ شما، یا با وارد کردن آی‌پی.', 'desktop-nearby', 'win'],
        ['عکس‌ها با پیش‌نمایش می‌رسند', 'همه را یک‌جا، در یک فایل ZIP، روی گوشی ذخیره کنید.', 'phone-receive', 'phone'],
        ['فیلم 4K با تمام سرعت وای‌فای', 'از گوشی، مستقیم به کامپیوتر.', 'phone-send', 'phone'],
        ['پوشه‌ها ساختارشان را نگه می‌دارند', 'فایل‌هایی که از قبل هست رد می‌شوند و چیزی بازنویسی نمی‌شود.', 'desktop-drop', 'win'],
        ['هماهنگ با ویندوز ۱۱', 'حالت روشن و تیره، آیکون کنار ساعت و «Send with Turbodrop» در منوی راست‌کلیک.', 'desktop-home-light', 'win'],
      ],
      numA: ['≈ ۴ مگابایت', 'نصب‌کنندهٔ ویندوز'],
      numB: ['۱ گیگابایت در ۷٫۵ ثانیه', 'آزمایش موتور، با رمزنگاری · محدودیت اصلی، شبکهٔ شماست'],
      coll: 'متن‌باز پویام',
      collSub: 'ابزارهای رایگانی که برای خودمان می‌سازیم و در اختیار همه می‌گذاریم: برنامه‌نویس‌ها و همهٔ دنیا. بدون ثبت‌نام، بدون ردیابی.',
      projects: [['توربودراپ', 'مثل ایردراپ، برای همهٔ دستگاه‌ها'], ['rtlint', 'باگ‌های راست‌به‌چپ و نگارش فارسی را در کد پیدا و درست می‌کند'], ['Traceless', 'عکس، ویدیو و پیام صوتی را بدون اینترنت امن می‌کند']],
    },
  };
  const C = COPY[LANG];
  const URL_SITE = 'pouyamsmartcity.github.io/turbodrop';
  const AGENTS = ['Claude Code', 'Cursor', 'Codex', 'Gemini CLI'];
  const shot = (name) => `assets/${FA && ['phone-home', 'phone-send', 'phone-receive'].includes(name) ? name + '-fa' : name}.png`;

  const CUES = [];
  const SCENES = [];
  let T0 = 0, D = 0;
  function mk(html, base, opts) {
    const a = el(html, base, opts);
    a.off = T0;
    a.e.start = T0 - 0.01;
    a.e.end = T0 + D + 0.01;
    return a;
  }
  const cue = (t, type, extra = {}) => CUES.push({ t: +(T0 + t).toFixed(3), type, ...extra });
  const glow = (t, dur = 0.9, max = 0.16) => flashes.push({ t: T0 + t, dur, max, color: '199,210,254' });
  const tx = (s, size, cls = 'title', style = '') => `<div class="${cls}" style="font-size:${size * U}px;${style}">${s}</div>`;

  // The calm entrance used everywhere: a soft rise out of a light blur, and a quiet fade out at the scene's end.
  const enter = (a, t, y, rise = 26, dur = 0.9) => a.k(t, t + dur, { o: 0, y: y + rise, b: 10 }, { o: 1, y, b: 0 }, 'out');
  const leave = (a, d, dur = 0.5) => a.k(d - dur, d, {}, { o: 0 }, 'io');
  function put(html, pos, t, opts = {}) {
    const a = mk(html, pos);
    enter(a, t, pos.y ?? H / 2, opts.rise ?? 26, opts.dur ?? 0.9);
    if (opts.stay !== true) leave(a, D, opts.out ?? 0.5);
    return a;
  }

  // Words (Persian) or letters (Latin) appear one after another, softly.
  function words(text, size, cls, t0, stagger, pos) {
    const parts = FA || /[؀-ۿ]/.test(text) ? text.split(/(\s+)/) : [...text];
    const html = `<div class="title" style="font-size:${size * U}px">${parts.map((p) => `<span class="${cls}" style="display:inline-block;white-space:pre">${p}</span>`).join('')}</div>`;
    const a = mk(html, pos);
    const spans = a.node.querySelectorAll('span');
    const at = T0 + t0;
    a.fx((t) => {
      spans.forEach((s, i) => {
        const k = clamp((t - (at + i * stagger)) / 0.8);
        const e = E.out(k);
        s.style.opacity = k;
        s.style.transform = `translateY(${(1 - e) * 0.3}em)`;
        s.style.filter = k < 1 ? `blur(${(1 - k) * 6}px)` : '';
      });
    });
    leave(a, D);
    return a;
  }

  const ICON = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
    pc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/></svg>',
    term: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l3 3-3 3M12 15h5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3"/><path d="M12 16.8v1.7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2c-.2-1.6-1-2.6-2.6-2.8C17 5 12 5 12 5s-5 0-7.4.4C3 5.6 2.2 6.6 2 8.2 1.8 9.8 1.8 12 1.8 12s0 2.2.2 3.8c.2 1.6 1 2.6 2.6 2.8C7 19 12 19 12 19s5 0 7.4-.4c1.6-.2 2.4-1.2 2.6-2.8.2-1.6.2-3.8.2-3.8s0-2.2-.2-3.8zM10 15V9l5.2 3L10 15z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
  };
  const ico = (svg, size) => svg.replace('<svg', `<svg style="width:${size};height:${size};display:block"`);

  function qrSvg(matrix) {
    const n = matrix.length;
    let d = '';
    matrix.forEach((row, y) => [...row].forEach((c, x) => { if (c === '1') d += `M${x} ${y}h1v1h-1z`; }));
    return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><path d="${d}" fill="#05060d"/></svg>`;
  }

  const MARK = (size) => `<img src="assets/pouyam-mark.svg" style="width:${size}px;display:block">`;

  // ---------------- scenes ----------------
  const S = {};

  S.intro = (d) => {
    const cy = H * (V ? 0.44 : 0.42);
    const m = mk(MARK((V ? 24 : 15) * U), { y: cy });
    m.k(0.15, 1.6, { o: 0, s: 0.92, b: 14 }, { o: 1, s: 1, b: 0 }, 'out');
    leave(m, d, 0.7);
    const st = T0;
    m.fx((t, n) => { n.style.filter = (n.style.filter || '') + ` drop-shadow(0 0 ${24 + 10 * Math.sin((t - st) * 1.5)}px rgba(201,178,124,.45))`; });
    const line = mk(`<div style="width:${(V ? 30 : 20) * U}px;height:2px;background:linear-gradient(90deg,transparent,#c9b27c,transparent)"></div>`, { y: cy + (V ? 18 : 12) * U });
    line.k(0.8, 2.0, { o: 0, sx: 0 }, { o: 0.9, sx: 1 }, 'out');
    leave(line, d, 0.7);
    put(tx(C.presents, V ? 4.6 : 3.4, 'gold', 'font-weight:500;letter-spacing:.18em'), { y: cy + (V ? 24 : 17) * U }, 1.1, { out: 0.7 });
    cue(0.2, 'chime');
    cue(0, 'section', { mode: 'intro' });
  };

  S.problem = (d) => {
    const iy = H * (V ? 0.32 : 0.36);
    const gap = V ? 0.24 : 0.17;
    put(`<div class="soft" style="width:${(V ? 16 : 10) * U}px">${ico(ICON.phone, '100%')}</div>`, { x: W * (0.5 - gap), y: iy }, 0.2);
    put(`<div class="soft" style="width:${(V ? 16 : 10) * U}px">${ico(ICON.pc, '100%')}</div>`, { x: W * (0.5 + gap), y: iy }, 0.35);
    // A dotted path between the two devices, drawn slowly.
    const dw = W * gap * 2 - (V ? 26 : 16) * U;
    const dots = mk(`<div style="width:${dw}px;height:0;border-top:3px dotted rgba(165,180,252,.55)"></div>`, { y: iy });
    dots.k(0.7, 2.0, { o: 0, sx: 0 }, { o: 1, sx: 1 }, 'io');
    leave(dots, d);
    put(tx(C.problemA, V ? 5 : 3.6, 'soft', 'font-weight:500'), { y: H * (V ? 0.47 : 0.6) }, 0.9);
    put(tx(C.problemB, V ? 8.6 : 6.2), { y: H * (V ? 0.55 : 0.71) }, 1.5);
    cue(0, 'whoosh', { soft: 1 });
  };

  S.reveal = (d) => {
    const cy = H * (V ? 0.38 : 0.36);
    const halo = mk(`<div style="width:${70 * U}px;height:${70 * U}px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.35),rgba(99,102,241,0) 65%)"></div>`, { y: cy });
    halo.k(0, 2.2, { o: 0, s: 0.6 }, { o: 1, s: 1.1 }, 'out');
    leave(halo, d, 0.7);
    const logo = mk(`<img src="assets/app-icon.svg" style="width:${(V ? 34 : 22) * U}px;display:block">`, { y: cy });
    logo.k(0.1, 1.4, { o: 0, s: 0.9, b: 16 }, { o: 1, s: 1, b: 0 }, 'out').k(1.4, d, {}, { s: 1.03 }, 'lin');
    leave(logo, d, 0.7);
    const by = H * (V ? 0.58 : 0.64);
    words(C.brand, V ? 11 : 8, 'title', 0.8, FA ? 0.12 : 0.05, { y: by });
    if (FA) put(tx('Turbodrop', V ? 3.4 : 2.6, 'soft', 'letter-spacing:.45em;font-weight:500;font-family:Inter Display'), { y: by + (V ? 9 : 7) * U }, 1.4);
    put(tx(C.tagline, V ? 4.6 : 3.4, 'soft', 'font-weight:500'), { y: by + (V ? 15 : 12) * U }, 1.7);
    glow(0.1, 1.4, 0.14);
    cue(0, 'section', { mode: 'reveal' }); cue(0.1, 'reveal');
  };

  S.how = (d) => {
    const h = d / 2;
    const lblY = H * (V ? 0.13 : 0.2), lblX = V ? W / 2 : W * (FA ? 0.76 : 0.24);
    const step = (n, s) => `<div style="display:flex;align-items:baseline;gap:.45em"><span class="soft" style="font-weight:500">${num(n)}</span><span>${s}</span></div>`;
    const l1 = mk(tx(step(1, C.step1), V ? 8 : 6), { x: lblX, y: lblY });
    enter(l1, 0.1, lblY); l1.k(h - 0.4, h, {}, { o: 0 }, 'io');
    const l2 = mk(tx(step(2, C.step2), V ? 8 : 6), { x: lblX, y: lblY });
    enter(l2, h, lblY); leave(l2, d);
    const ww = V ? W * 0.84 : W * 0.44;
    const wh = ww / 1.6 + 34;
    const wpos = V ? { x: W / 2, y: H * 0.38 } : { x: W * (FA ? 0.28 : 0.3), y: H * 0.6 };
    if (!V) wpos.x = W * (FA ? 0.66 : 0.34);
    const win = mk(`<div class="win" style="width:${ww}px;height:${wh}px;position:relative"><div class="bar"><b></b><b></b><b></b></div><img src="${shot('desktop-phone')}" style="height:${wh - 34}px"><div class="scan" style="position:absolute;left:8%;right:8%;height:2px;background:linear-gradient(90deg,transparent,rgba(34,211,238,.8),transparent)"></div></div>`, wpos);
    enter(win, 0.3, wpos.y, 30, 1.1);
    win.k(h - 0.6, h + 0.4, {}, V ? { o: 0, y: wpos.y - 60 } : { o: 0.45, s: 0.94 }, 'io');
    leave(win, d);
    const scan = win.node.querySelector('.scan');
    const st = T0;
    win.fx((t) => { scan.style.top = 34 + (((t - st) * 0.45) % 1) * (wh - 40) + 'px'; });
    const ph = V ? H * 0.5 : H * 0.8;
    const pw = (ph * 1179) / 2556;
    const p1 = V ? { x: W / 2, y: H * 0.88 } : { x: W * (FA ? 0.22 : 0.78), y: H * 0.55 };
    const p2 = V ? { x: W / 2, y: H * 0.5 } : p1;
    const phone = mk(`<div class="phone" style="width:${pw}px;height:${ph}px;position:relative"><img src="${shot('phone-home')}" style="position:absolute;inset:0"><img class="p2" src="${shot('phone-send')}" style="position:absolute;inset:0;opacity:0"></div>`, p1);
    phone.k(0.7, 1.9, { o: 0, y: p1.y + 80 }, { o: 1, y: p1.y }, 'out').k(h - 0.2, h + 1.0, {}, { y: p2.y }, 'io');
    leave(phone, d);
    const p2el = phone.node.querySelector('.p2');
    phone.fx((t) => { p2el.style.opacity = clamp((t - (T0 + h + 0.4)) / 0.6); });
    const cap = mk(`<div class="chip">${C.stepCap}</div>`, V ? { y: H * 0.205 } : { x: lblX, y: H * 0.3 });
    cap.node.firstChild.style.fontSize = (V ? 3.6 : 2.6) * U + 'px';
    enter(cap, h + 0.5, V ? H * 0.205 : H * 0.3); leave(cap, d);
    cue(h, 'whoosh', { soft: 1 }); cue(0.7, 'blip');
  };

  S.resume = (d) => {
    const cy = H * (V ? 0.44 : 0.46);
    put(tx(C.resumeTitle, V ? 7 : 5.4), { y: H * (V ? 0.25 : 0.24) }, 0.1);
    const pct = mk(tx('0%', V ? 15 : 11, 'title', 'font-weight:600;font-variant-numeric:tabular-nums;direction:ltr'), { y: cy });
    enter(pct, 0.3, cy); leave(pct, d);
    const bw = V ? W * 0.74 : W * 0.46;
    const bar = mk(`<div class="bar-outer" style="width:${bw}px;height:${1.4 * U}px"><div class="bar-inner"></div></div>`, { y: cy + (V ? 11 : 9) * U });
    enter(bar, 0.4, cy + (V ? 11 : 9) * U); leave(bar, d);
    const inner = bar.node.querySelector('.bar-inner');
    const st = T0;
    const k = d / 4;
    const t1 = 0.6, tLost = 1.4 * k + 0.4, tRes = tLost + 0.9 * k, tEnd = d - 0.9;
    const prog = (t) => {
      const l = t - st;
      if (l < t1) return 0;
      if (l < tLost) return 0.64 * E.io((l - t1) / (tLost - t1));
      if (l < tRes) return 0.64;
      return 0.64 + 0.36 * E.io(clamp((l - tRes) / Math.max(0.5, tEnd - tRes)));
    };
    const big = pct.node.firstChild;
    pct.fx((t) => {
      const p = prog(t);
      big.textContent = FA ? `${fa(Math.round(p * 100))}٪` : `${Math.round(p * 100)}%`;
      inner.style.width = p * 100 + '%';
      inner.style.filter = t - st >= tLost && t - st < tRes ? 'grayscale(1) brightness(.7)' : '';
    });
    const sy = cy + (V ? 19 : 16) * U;
    const s1 = mk(`<div class="chip"><i style="background:#fbbf24;box-shadow:0 0 10px #fbbf24"></i>${C.lost}</div>`, { y: sy });
    s1.node.firstChild.style.fontSize = (V ? 3.8 : 2.8) * U + 'px';
    s1.k(tLost, tLost + 0.4, { o: 0 }, { o: 1 }, 'io').k(tRes - 0.3, tRes, {}, { o: 0 }, 'io');
    const s2 = mk(`<div class="chip"><i></i>${C.resumed} · ${FA ? fa(64) + '٪' : '64%'}</div>`, { y: sy });
    s2.node.firstChild.style.fontSize = (V ? 3.8 : 2.8) * U + 'px';
    s2.k(tRes, tRes + 0.4, { o: 0 }, { o: 1 }, 'io').k(tEnd, tEnd + 0.3, {}, { o: 0 }, 'io');
    const s3 = mk(`<div class="chip" style="color:#a7f3d0">${ico(ICON.check, '1em')}${C.done}</div>`, { y: sy });
    s3.node.firstChild.style.fontSize = (V ? 3.8 : 2.8) * U + 'px';
    s3.k(tEnd + 0.2, tEnd + 0.6, { o: 0 }, { o: 1 }, 'io');
    leave(s3, d);
    cue(tLost, 'soft-down'); cue(tRes, 'blip'); cue(tEnd + 0.2, 'chime', { soft: 1 });
  };

  S.privacy = (d) => {
    const ly = H * (V ? 0.3 : 0.4);
    const lx = V ? W / 2 : W * (FA ? 0.7 : 0.3);
    put(`<div style="width:${(V ? 22 : 16) * U}px;color:#c7d2fe;filter:drop-shadow(0 0 30px rgba(99,102,241,.6))">${ico(ICON.lock, '100%')}</div>`, { x: lx, y: ly }, 0.1);
    put(tx(C.privTitle, V ? 7 : 5.2), { x: lx, y: ly + (V ? 18 : 15) * U }, 0.4);
    const lx2 = V ? W / 2 : W * (FA ? 0.3 : 0.7);
    C.secure.forEach((s, i) => {
      const y = V ? H * (0.56 + i * 0.055) : H * (0.3 + i * 0.12);
      put(`<div class="list-row" style="font-size:${(V ? 4.2 : 3.2) * U}px;width:${V ? W * 0.56 : W * 0.3}px">${ico(ICON.check, '0.9em')}<span>${s}</span></div>`, { x: lx2, y }, 0.9 + i * 0.35 * (d / 4));
    });
    cue(0.2, 'blip');
  };

  S.devices = (d) => {
    put(tx(C.devices, V ? 8 : 6), { y: H * (V ? 0.2 : 0.2) }, 0.1);
    const icons = [ICON.pc, ICON.laptop, ICON.term, ICON.phone, ICON.phone];
    const pos = V ? [[0.28, 0.35], [0.72, 0.35], [0.28, 0.5], [0.72, 0.5], [0.5, 0.65]] : [[0.14, 0.5], [0.32, 0.5], [0.5, 0.5], [0.68, 0.5], [0.86, 0.5]];
    const tw = V ? W * 0.38 : W * 0.15, th = V ? H * 0.12 : H * 0.3;
    C.plat.forEach((p, i) => {
      const [x, y] = pos[i];
      put(`<div class="panel tile" style="width:${tw}px;height:${th}px;font-size:${(V ? 4.6 : 3.3) * U}px">${icons[i]}<div>${p}</div></div>`, { x: W * x, y: H * y }, 0.5 + i * 0.22 * (d / 4));
    });
    put(`<div class="chip" style="font-size:${(V ? 3.8 : 2.8) * U}px">${C.langs}</div>`, { y: H * (V ? 0.765 : 0.76) }, 0.6 + 1.4 * (d / 4));
  };

  S.dev = (d) => {
    const k = d / 5;
    put(tx(C.devTitle, V ? 6.4 : 4.6, 'title', 'text-align:center'), V ? { y: H * 0.15 } : { x: W * 0.5, y: H * 0.16 }, 0.1);
    const tw = V ? W * 0.86 : W * 0.5, th = V ? H * 0.3 : H * 0.52;
    const cmd = '$ turbodrop share report.pdf';
    const tpos = V ? { y: H * 0.43 } : { x: W * (FA ? 0.62 : 0.38), y: H * 0.58 };
    const term = mk(`<div class="win" style="width:${tw}px;height:${th}px;position:relative"><div class="bar"><b></b><b></b><b></b></div>
      <div class="term" style="padding:${2 * U}px;font-size:${(V ? 3.4 : 2.2) * U}px;color:#e2e8f0"><span class="c"></span><span class="cur" style="background:#a5b4fc;color:#000">&nbsp;</span>
<span class="o1" style="color:#a3adc8"></span></div>
      <div class="qrb" style="position:absolute;left:${2 * U}px;bottom:${2 * U}px;width:${th * 0.46}px;height:${th * 0.46}px;background:#fff;padding:6px;border-radius:8px">${qrSvg(window.QR.lan)}</div></div>`, tpos);
    enter(term, 0.3, tpos.y, 30, 1.0); leave(term, d);
    const c = term.node.querySelector('.c'), cur = term.node.querySelector('.cur'), o1 = term.node.querySelector('.o1'), qrb = term.node.querySelector('.qrb');
    const tType0 = T0 + 0.9, tType1 = T0 + 0.9 + 1.4 * k, tOut = tType1 + 0.4;
    term.fx((t) => {
      const n = Math.floor(clamp((t - tType0) / (tType1 - tType0)) * cmd.length);
      c.textContent = cmd.slice(0, n);
      cur.style.opacity = t < tOut ? (Math.floor(t * 2) % 2 ? 1 : 0.25) : 0;
      o1.textContent = t >= tOut ? 'Scan to receive · report.pdf · 2.4 MB' : '';
      qrb.style.opacity = clamp((t - tOut) / 0.6);
    });
    for (let i = 0; i < cmd.length; i += 3) cue(0.9 + (i / cmd.length) * 1.4 * k, 'type');
    const cpos = V ? [[0.28, 0.65], [0.72, 0.65], [0.28, 0.71], [0.72, 0.71]] : [[FA ? 0.18 : 0.82, 0.4], [FA ? 0.18 : 0.82, 0.5], [FA ? 0.18 : 0.82, 0.6], [FA ? 0.18 : 0.82, 0.7]];
    AGENTS.forEach((a, i) => {
      const [x, y] = cpos[i];
      put(`<div class="chip" style="font-size:${(V ? 3.8 : 2.8) * U}px">${a}</div>`, { x: W * x, y: H * y }, 2.6 * k + i * 0.25);
    });
    put(tx(C.devNote, V ? 3.2 : 2.4, 'soft', 'font-weight:500'), { y: H * (V ? 0.77 : 0.86) }, 3.4 * k);
    cue(0, 'section', { mode: 'filtered' });
  };

  S.free = (d) => {
    const tx0 = V ? W / 2 : W * (FA ? 0.64 : 0.36);
    put(tx(C.freeTitle, V ? 8 : 5.8), { x: tx0, y: H * (V ? 0.14 : 0.27) }, 0.1);
    put(`<div class="chip" style="font-size:${(V ? 3.4 : 2.6) * U}px">${C.mit}</div>`, { x: tx0, y: H * (V ? 0.215 : 0.38) }, 0.5);
    const qs = V ? 36 * U : 26 * U;
    put(`<div class="qr" style="width:${qs}px;height:${qs}px">${qrSvg(window.QR.site)}</div>`, V ? { y: H * 0.42 } : { x: W * (FA ? 0.22 : 0.78), y: H * 0.5 }, 0.8);
    put(`<div class="chip" style="font-size:${(V ? 3.8 : 2.8) * U}px;direction:ltr">${ico(ICON.globe, '1em')}${URL_SITE}</div>`, { x: tx0, y: H * (V ? 0.64 : 0.5) }, 1.1);
    put(tx(C.platLine, V ? 3.2 : 2.5, 'soft', 'font-weight:500'), { x: tx0, y: H * (V ? 0.7 : 0.6) }, 1.4);
    cue(0.8, 'blip');
  };

  S.end = (d) => {
    const cx = V ? W / 2 : W * (FA ? 0.68 : 0.32);
    const m = mk(MARK((V ? 22 : 14) * U), { x: cx, y: H * (V ? 0.32 : 0.3) });
    m.k(0.1, 1.4, { o: 0, s: 0.92, b: 14 }, { o: 1, s: 1, b: 0 }, 'out');
    put(tx(C.endA, V ? 5.6 : 4, 'title'), { x: cx, y: H * (V ? 0.47 : 0.5) }, 0.6, { stay: true });
    put(tx(C.endB, V ? 3.4 : 2.6, 'soft', 'font-weight:500'), { x: cx, y: H * (V ? 0.52 : 0.57) }, 0.9, { stay: true });
    const hs = (V ? 3.8 : 2.8) * U;
    const handle = (ic, label) => `<div class="chip" style="font-size:${hs}px;direction:ltr">${ico(ic, '1.05em')}${label}</div>`;
    put(handle(ICON.ig, '@pouyamworld'), { x: cx, y: H * (V ? 0.61 : 0.67) }, 1.2, { stay: true });
    put(handle(ICON.yt, '@pouyamworld'), { x: cx, y: H * (V ? 0.61 : 0.67) + (V ? 7.5 : 6.5) * U }, 1.35, { stay: true });
    put(tx('pouyam.com', V ? 3.6 : 2.7, 'gold', 'font-weight:600;letter-spacing:.1em;direction:ltr'), { x: cx, y: H * (V ? 0.75 : 0.85) }, 1.5, { stay: true });
    if (!V) {
      const ex = W * (FA ? 0.25 : 0.75);
      put(`<div style="width:${W * 0.3}px;height:${W * 0.3 * 9 / 16}px;border:2px dashed rgba(165,180,252,.3);border-radius:18px;display:grid;place-items:center;font-size:${2.4 * U}px" class="soft">▶ ${C.watchNext}</div>`, { x: ex, y: H * 0.36 }, 1.6, { stay: true });
      put(`<div style="width:${15 * U}px;height:${15 * U}px;border:2px dashed rgba(165,180,252,.3);border-radius:50%;display:grid;place-items:center;font-size:${2.2 * U}px" class="soft">${C.subscribe}</div>`, { x: ex, y: H * 0.74 }, 1.7, { stay: true });
    }
    cue(0, 'section', { mode: 'outro' }); cue(0.1, 'chime');
  };

  // ---- YouTube only ----
  S.features = (d) => {
    const n = C.features.length;
    const each = d / n;
    C.features.forEach(([title, desc, img, kind], i) => {
      const t0 = i * each;
      const tl = { x: W * (FA ? 0.77 : 0.23), y: H * 0.5 };
      const card = mk(`<div style="width:${W * 0.3}px;white-space:normal;text-align:${FA ? 'right' : 'left'}">
        <div class="soft" style="font-size:${2.6 * U}px;font-weight:500;letter-spacing:.1em">${num(String(i + 1).padStart(2, '0'))} / ${num(String(n).padStart(2, '0'))}</div>
        <div class="title" style="font-size:${4.8 * U}px;margin:.35em 0 .45em;white-space:normal;line-height:1.2">${title}</div>
        <div class="soft" style="font-size:${2.6 * U}px;line-height:1.6;font-weight:400">${desc}</div></div>`, tl);
      card.k(t0 + 0.1, t0 + 1.0, { o: 0, y: tl.y + 24, b: 8 }, { o: 1, y: tl.y, b: 0 }, 'out').k(t0 + each - 0.5, t0 + each, {}, { o: 0 }, 'io');
      const sx = W * (FA ? 0.3 : 0.7);
      const media = kind === 'phone'
        ? `<div class="phone" style="width:${H * 0.78 * 1179 / 2556}px;height:${H * 0.78}px"><img src="${shot(img)}"></div>`
        : `<div class="win" style="width:${W * 0.46}px;height:${W * 0.46 / 1.6 + 34}px"><div class="bar"><b></b><b></b><b></b></div><img src="${shot(img)}" style="height:${W * 0.46 / 1.6}px"></div>`;
      mk(media, { x: sx, y: H * 0.5 })
        .k(t0, t0 + 1.1, { o: 0, s: 0.97, b: 8 }, { o: 1, s: 1, b: 0 }, 'out')
        .k(t0 + 1.1, t0 + each - 0.5, {}, { s: 1.025 }, 'lin')
        .k(t0 + each - 0.5, t0 + each, {}, { o: 0 }, 'io');
      if (i) cue(t0, 'whoosh', { soft: 1 });
    });
  };

  S.numbers = (d) => {
    [C.numA, C.numB].forEach(([big, small], i) => {
      const y = H * (0.33 + i * 0.3);
      const t = 0.3 + i * 1.2 * (d / 6);
      put(tx(big, 8.5, 'title', 'font-weight:600'), { y }, t);
      put(tx(small, 2.7, 'soft', 'font-weight:500'), { y: y + 7.5 * U }, t + 0.35);
    });
  };

  S.collective = (d) => {
    put(MARK(9 * U), { y: H * 0.13 }, 0.1);
    put(tx(C.coll, 6), { y: H * 0.25 }, 0.4);
    put(`<div class="soft" style="font-size:${2.6 * U}px;white-space:normal;width:${W * 0.6}px;text-align:center;font-weight:400;line-height:1.6">${C.collSub}</div>`, { y: H * 0.35 }, 0.8);
    C.projects.forEach(([name, desc], i) => {
      const x = W * (FA ? 0.79 - i * 0.29 : 0.21 + i * 0.29);
      const badge = i === 0 ? '<img src="assets/app-icon.svg" style="width:1.2em;vertical-align:middle;margin-inline-end:.35em">' : '';
      put(`<div class="panel card" style="width:${W * 0.255}px;font-size:${3.2 * U}px;white-space:normal"><h3>${badge}${name}</h3><p>${desc}</p></div>`, { x, y: H * 0.6 }, 1.6 + i * 0.45);
    });
    put(`<div class="chip" style="font-size:${2.6 * U}px;direction:ltr">${ico(ICON.globe, '1em')}pouyamsmartcity.github.io · pouyam.com</div>`, { y: H * 0.82 }, 3.2);
  };

  const TIMELINES = {
    reel: [['intro', 3], ['problem', 4], ['reveal', 4], ['how', 6], ['resume', 4], ['privacy', 4], ['devices', 4], ['dev', 5], ['free', 4], ['end', 4]],
    youtube: [['intro', 4], ['problem', 7], ['reveal', 5], ['how', 9], ['features', 24], ['resume', 6], ['numbers', 7], ['privacy', 6], ['devices', 5], ['dev', 9], ['collective', 10], ['free', 7], ['end', 8]],
  };
  let t = 0;
  // Scene lengths fitted to the voice (fit.py), when there is one.
  const fitted = window.TIMING && window.TIMING.durations && window.TIMING.durations.length === TIMELINES[FORMAT].length ? window.TIMING.durations : null;
  for (const [i, [name, base]] of TIMELINES[FORMAT].entries()) {
    const dur = fitted ? fitted[i] : base;
    T0 = t; D = dur;
    SCENES.push({ name, t0: t, d: dur });
    S[name](dur);
    t += dur;
  }
  const TOTAL = t;

  // A small Pouyam mark in the top corner, from the end of the intro to the start of the end card.
  {
    const first = SCENES[1].t0, last = SCENES[SCENES.length - 1].t0;
    T0 = 0; D = TOTAL;
    const wx = V ? W * 0.075 : W * 0.045;
    const wm = mk(`<div class="watermark" style="font-size:${(V ? 3.4 : 2.4) * U}px">${MARK((V ? 5.4 : 3.8) * U)}<span>${C.brandWord}</span></div>`, { x: 0, y: 0 });
    wm.node.style.transformOrigin = '0 0';
    wm.k(first - 0.2, first + 0.8, { o: 0 }, { o: 0.95 }, 'io').k(last - 0.6, last, {}, { o: 0 }, 'io');
    wm.e.start = 0; wm.e.end = TOTAL;
    // Placed by its top-left corner (the engine centres elements): measured once the fonts are in.
    wm.fx((tt, node) => {
      const r = node.getBoundingClientRect();
      node.style.transform = `translate(${wx}px,${H * (V ? 0.062 : 0.06)}px)`;
    });
  }

  ENGINE.setBg((tt) => {
    const s = SCENES.find((x) => tt >= x.t0 && tt < x.t0 + x.d) || SCENES[0];
    if (s.name === 'intro' || s.name === 'end') return { grid: 0, blobs: 0.45, warp: 0 };
    if (s.name === 'reveal') return { grid: 0.03, blobs: 1, warp: 0 };
    return { grid: 0.03, blobs: 0.75, warp: 0 };
  });
  window.TEASER = { TOTAL, CUES: CUES.sort((a, b) => a.t - b.t), SCENES, FPS: 30 };
})();

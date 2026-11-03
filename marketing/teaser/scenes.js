// Turbodrop teaser: scenes, copy (English and Persian) and timelines for the Reel (9:16) and YouTube (16:9).
// Every claim comes from the Turbodrop README.
(() => {
  const { FORMAT, LANG, V, W, H, U, E, el, flashes, shakes, glitches, streaks, rng, clamp, lerp } = ENGINE;
  const FA = LANG === 'fa';
  const fa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const num = (s) => (FA ? fa(s) : String(s));

  const COPY = {
    en: {
      hook1: 'iPhone → Windows?', hook2: 'Still using cables?',
      md: 'MATCHDAY', mdSub: 'FILE TRANSFER', teamA: 'iPHONE', teamAs: 'the phone', teamB: 'WINDOWS', teamBs: 'the PC',
      oldWay: 'THE OLD WAY', problems: ['CABLES', 'CLOUD', 'APPS'],
      brand: 'TURBODROP', tagline: 'Like AirDrop, for every device.',
      step1: 'SCAN', step2: 'SEND', stepCap: 'Nothing to install on the phone',
      speedLbl: 'Full Wi‑Fi speed', unit: 'GB', dropped: 'Wi‑Fi dropped', resumed: 'Resumed, not restarted',
      secure: ['End‑to‑end encrypted', 'No cloud', 'No account', 'No internet needed'],
      devices: 'Every device', plat: ['Windows', 'iPhone', 'Android', 'Mac', 'Linux'], langs: '12 languages · right‑to‑left too',
      aiHead: 'Your AI agent<br>can send it too', aiNote: 'Command line · JSON events · llms.txt',
      fullTime: 'FULL TIME', win: 'TURBODROP', lose: 'CABLES', free: 'FREE · OPEN SOURCE · MIT',
      get: 'Get it free', platLine: 'Windows · macOS · Linux — phones need nothing', inst: 'Windows installer ≈ 4 MB',
      endA: 'A Pouyam open-source project', endB: 'Free tools for developers and everyone',
      watchNext: 'Watch next', subscribe: 'Subscribe',
      features: [
        ['Resumes, never restarts', 'Walk out of Wi‑Fi range, lock the phone, even restart the app: it continues from the last chunk.', 'desktop-transfers', 'win'],
        ['Approve with an emoji code', 'Computers pair with X25519 and show a 4‑emoji code to compare.', 'desktop-request', 'win'],
        ['Finds nearby devices', 'Automatic discovery on your network, or add one by IP.', 'desktop-nearby', 'win'],
        ['Photos arrive with previews', 'Save all as one ZIP on the phone: one tap instead of fifty.', 'phone-receive', 'phone'],
        ['4K video at full Wi‑Fi speed', 'Send from the phone straight to the computer.', 'phone-send', 'phone'],
        ['Folders keep their structure', 'Files already there are skipped; nothing is overwritten.', 'desktop-drop', 'win'],
        ['At home on Windows 11', 'Light and dark, tray icon, “Send with Turbodrop” in the right‑click menu.', 'desktop-home-light', 'win'],
        ['12 languages', 'Full right‑to‑left support for Persian and Arabic.', 'desktop-home-fa', 'win'],
      ],
      numA: ['≈ 4 MB', 'Windows installer · Electron apps are 80–150 MB'],
      numB: ['1 GiB in 7.5 s', 'engine speed test, encryption included · your network is the limit'],
      coll: 'POUYAM OPEN SOURCE',
      collSub: 'Free tools we build for ourselves and give to everyone: developers and the whole world. No accounts, no tracking.',
      projects: [['Turbodrop', 'Like AirDrop, for every device'], ['rtlint', 'Finds and fixes right‑to‑left and Persian typography bugs in code'], ['Traceless', 'Makes photos, videos and voice notes safe to share, offline']],
    },
    fa: {
      hook1: 'آیفون ← ویندوز؟', hook2: 'هنوز با کابل؟',
      md: 'روز مسابقه', mdSub: 'انتقال فایل', teamA: 'آیفون', teamAs: 'گوشی', teamB: 'ویندوز', teamBs: 'کامپیوتر',
      oldWay: 'روش قدیمی', problems: ['کابل', 'فضای ابری', 'نصب برنامه'],
      brand: 'توربودراپ', tagline: 'مثل ایردراپ، برای همهٔ دستگاه‌ها',
      step1: 'اسکن کن', step2: 'بفرست', stepCap: 'روی گوشی هیچ چیزی نصب نمی‌شود',
      speedLbl: 'با تمام سرعت وای‌فای', unit: 'گیگابایت', dropped: 'وای‌فای قطع شد', resumed: 'از همان‌جا ادامه داد',
      secure: ['رمزنگاری سرتاسری', 'بدون فضای ابری', 'بدون حساب کاربری', 'بدون اینترنت'],
      devices: 'همهٔ دستگاه‌ها', plat: ['ویندوز', 'آیفون', 'اندروید', 'مک', 'لینوکس'], langs: '۱۲ زبان · با راست‌به‌چپ کامل',
      aiHead: 'دستیار هوش مصنوعی‌ات<br>هم می‌تواند بفرستد', aiNote: 'خط فرمان · خروجی JSON · llms.txt',
      fullTime: 'پایان بازی', win: 'توربودراپ', lose: 'کابل', free: 'رایگان · متن‌باز · MIT',
      get: 'رایگان دریافت کن', platLine: 'ویندوز · مک · لینوکس — گوشی هیچ چیز لازم ندارد', inst: 'نصب‌کنندهٔ ویندوز ≈ ۴ مگابایت',
      endA: 'یک پروژهٔ متن‌باز از پویام', endB: 'ابزارهای رایگان برای برنامه‌نویس‌ها و همه',
      watchNext: 'ویدیوی بعدی', subscribe: 'سابسکرایب',
      features: [
        ['قطع شد؟ از همان‌جا ادامه می‌دهد', 'از برد وای‌فای بیرون بروید، گوشی را قفل کنید یا حتی برنامه را ببندید: انتقال از آخرین تکه ادامه پیدا می‌کند.', 'desktop-transfers', 'win'],
        ['تأیید با کد ایموجی', 'کامپیوترها با X25519 جفت می‌شوند و یک کد ۴ ایموجی برای مقایسه نشان می‌دهند.', 'desktop-request', 'win'],
        ['دستگاه‌های نزدیک را پیدا می‌کند', 'خودکار در شبکهٔ شما، یا با وارد کردن آی‌پی.', 'desktop-nearby', 'win'],
        ['عکس‌ها با پیش‌نمایش می‌رسند', 'ذخیرهٔ همه با یک ZIP روی گوشی: یک لمس به‌جای پنجاه بار.', 'phone-receive-fa', 'phone'],
        ['فیلم 4K با تمام سرعت وای‌فای', 'از گوشی مستقیم به کامپیوتر بفرستید.', 'phone-send-fa', 'phone'],
        ['پوشه‌ها ساختارشان را نگه می‌دارند', 'فایل‌هایی که از قبل هست رد می‌شوند و چیزی بازنویسی نمی‌شود.', 'desktop-drop', 'win'],
        ['انگار مال خود ویندوز ۱۱ است', 'حالت روشن و تیره، آیکون کنار ساعت و «Send with Turbodrop» در منوی راست‌کلیک.', 'desktop-home-light', 'win'],
        ['۱۲ زبان', 'پشتیبانی کامل راست‌به‌چپ برای فارسی و عربی.', 'desktop-home-fa', 'win'],
      ],
      numA: ['≈ ۴ مگابایت', 'نصب‌کنندهٔ ویندوز · برنامه‌های Electron بین ۸۰ تا ۱۵۰ مگابایت‌اند'],
      numB: ['۱ گیگ در ۷٫۵ ثانیه', 'آزمایش سرعت موتور، با رمزنگاری · محدودیت فقط شبکهٔ شماست'],
      coll: 'متن‌باز پویام',
      collSub: 'ابزارهای رایگانی که برای خودمان می‌سازیم و به همه می‌دهیم: برنامه‌نویس‌ها و همهٔ دنیا. بدون ثبت‌نام، بدون ردیابی.',
      projects: [['توربودراپ', 'مثل ایردراپ، برای همهٔ دستگاه‌ها'], ['rtlint', 'باگ‌های راست‌به‌چپ و نگارش فارسی را در کد پیدا و درست می‌کند'], ['Traceless · بی‌ردپا', 'عکس، ویدیو و پیام صوتی را بدون اینترنت امن می‌کند']],
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
  const flash = (t, dur = 0.25, max = 0.85, color = '255,255,255') => flashes.push({ t: T0 + t, dur, max, color });
  const shake = (t, amp = 14) => shakes.push({ t: T0 + t, amp });
  const glitch = (t, dur = 0.12) => { glitches.push({ t: T0 + t, dur }); cue(t, 'glitch', { dur }); };
  const streak = (t, dir = 1) => { streaks.push({ t: T0 + t, dir }); cue(t, 'whoosh'); };
  const tx = (s, size, cls = 'big', style = '') => `<div class="${cls}" style="font-size:${size * U}px;${style}">${s}</div>`;

  // Letters (Latin) or words (Persian, whose letters join) rise in one after another.
  function split(text, size, cls, t0, stagger = 0.05, base = {}) {
    const parts = FA || /[؀-ۿ]/.test(text) ? text.split(/(\s+)/) : [...text];
    // A gradient clipped to text does not survive transformed children, so each piece carries its own class.
    const html = `<div class="big" style="font-size:${size * U}px">${parts.map((p) => `<span class="${cls}" style="display:inline-block;white-space:pre">${p}</span>`).join('')}</div>`;
    const a = mk(html, base);
    const spans = a.node.querySelectorAll('span');
    const at = T0 + t0;
    a.fx((t) => {
      spans.forEach((s, i) => {
        const k = clamp((t - (at + i * stagger)) / 0.35);
        const e = E.out(k);
        s.style.opacity = k;
        s.style.transform = `translateY(${(1 - e) * 0.55}em) rotate(${(1 - e) * 8}deg)`;
        s.style.filter = k < 1 ? `blur(${(1 - k) * 8}px)` : '';
      });
    });
    return a;
  }

  const ICON = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
    pc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/></svg>',
    term: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l3 3-3 3M12 15h5"/></svg>',
    lockBody: '<svg viewBox="0 0 100 80"><defs><linearGradient id="lg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#6366f1"/><stop offset="1" stop-color="#d946ef"/></linearGradient></defs><rect x="2" y="2" width="96" height="76" rx="16" fill="url(#lg)"/><circle cx="50" cy="36" r="9" fill="#05060d"/><rect x="46" y="38" width="8" height="20" rx="4" fill="#05060d"/></svg>',
    shackle: '<svg viewBox="0 0 100 70"><path d="M24 70V38a26 26 0 0 1 52 0v32" fill="none" stroke="#c7d2fe" stroke-width="12" stroke-linecap="round"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2c-.2-1.6-1-2.6-2.6-2.8C17 5 12 5 12 5s-5 0-7.4.4C3 5.6 2.2 6.6 2 8.2 1.8 9.8 1.8 12 1.8 12s0 2.2.2 3.8c.2 1.6 1 2.6 2.6 2.8C7 19 12 19 12 19s5 0 7.4-.4c1.6-.2 2.4-1.2 2.6-2.8.2-1.6.2-3.8.2-3.8s0-2.2-.2-3.8zM10 15V9l5.2 3L10 15z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
  };

  function qrSvg(matrix) {
    const n = matrix.length;
    let d = '';
    matrix.forEach((row, y) => [...row].forEach((c, x) => { if (c === '1') d += `M${x} ${y}h1v1h-1z`; }));
    return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><path d="${d}" fill="#05060d"/></svg>`;
  }

  // ---------------- scenes ----------------
  const S = {};

  S.hook = (d) => {
    const y1 = H * (V ? 0.43 : 0.4), y2 = H * (V ? 0.56 : 0.6);
    mk(tx(C.hook1, V ? 9.2 : 8.5), { y: y1 }).k(0, 0.3, { o: 0, sx: 1.8, b: 24 }, { o: 1, sx: 1, b: 0 }, 'expo').k(d - 0.2, d, {}, { o: 0, s: 1.35, b: 12 }, 'in');
    const t2 = d > 2 ? 1.6 : 0.85;
    mk(tx(C.hook2, V ? 10.5 : 9.5, 'big grad'), { y: y2 }).k(t2, t2 + 0.3, { o: 0, y: y2 + 120, s: 0.8 }, { o: 1, y: y2, s: 1 }, 'expo').k(d - 0.2, d, {}, { o: 0, s: 1.35, b: 12 }, 'in');
    flash(0, 0.35, 0.95); shake(0, 22); glitch(0, 0.16); glitch(t2, 0.1);
    cue(0, 'impact'); cue(t2, 'hit');
  };

  S.matchday = (d) => {
    for (const [x, r0, r1] of [[0.15, 28, 14], [0.85, -28, -14]]) {
      mk('<div class="beam" style="width:' + W * 0.5 + 'px;height:' + H * 1.3 + 'px"></div>', { x: W * x, y: H * 0.45 })
        .k(0, d, { r: r0, o: 0.9 }, { r: r1, o: 0.6 }, 'io');
    }
    mk(`<div class="chip" style="font-size:${(V ? 3.6 : 2.6) * U}px;letter-spacing:.12em"><i style="background:#ef4444;box-shadow:0 0 12px #ef4444"></i>${C.md} · ${C.mdSub}</div>`, { y: H * (V ? 0.1 : 0.12) })
      .k(0, 0.35, { o: 0, y: -100 }, { o: 1, y: H * (V ? 0.1 : 0.12) }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    const team = (name, sub, ic, grad) => `<div class="panel team" style="width:${V ? W * 0.8 : W * 0.34}px;height:${V ? H * 0.22 : H * 0.56}px;font-size:${(V ? 10 : 8) * U}px;border-color:${grad}">
      <div style="color:${grad};width:${(V ? 9 : 12) * U}px">${ic}</div><div class="big">${name}</div><div class="muted" style="font-size:.32em;font-weight:600;letter-spacing:.08em">${sub}</div></div>`;
    const A = V ? { x: W / 2, y: H * 0.33 } : { x: W * 0.25, y: H * 0.56 };
    const B = V ? { x: W / 2, y: H * 0.69 } : { x: W * 0.75, y: H * 0.56 };
    mk(team(C.teamA, C.teamAs, ICON.phone, '#22d3ee'), A).k(0, 0.45, { x: -W * 0.6, r: -6 }, { x: A.x, r: 0 }, 'expo').k(d - 0.25, d, {}, { x: -W * 0.6, o: 0 }, 'in');
    mk(team(C.teamB, C.teamBs, ICON.pc, '#e879f9'), B).k(0.15, 0.6, { x: W * 1.6, r: 6 }, { x: B.x, r: 0 }, 'expo').k(d - 0.25, d, {}, { x: W * 1.6, o: 0 }, 'in');
    const tv = d > 2 ? 1.5 : 1.0;
    mk(tx('VS', V ? 18 : 15, 'big grad', 'font-style:italic;filter:drop-shadow(0 0 30px rgba(99,102,241,.9))'), { y: V ? H * 0.51 : H * 0.56 })
      .k(tv, tv + 0.35, { o: 0, s: 3.5, b: 20, r: -12 }, { o: 1, s: 1, b: 0, r: 0 }, 'back').k(d - 0.2, d, {}, { o: 0, s: 1.6 });
    streak(0, 1); cue(0.15, 'whoosh'); flash(tv, 0.22, 0.6); shake(tv, 26); cue(tv, 'impact');
  };

  S.problems = (d) => {
    const k = d / 2;
    mk(tx(C.oldWay, V ? 4 : 3, 'muted', 'font-weight:700;letter-spacing:.25em'), { y: H * (V ? 0.24 : 0.17) }).k(0, 0.3, { o: 0 }, { o: 1 }).k(d - 0.15, d, {}, { o: 0 });
    C.problems.forEach((w, i) => {
      const y = H * (V ? 0.38 + i * 0.13 : 0.34 + i * 0.2);
      const t = 0.1 + i * 0.5 * k;
      const a = mk(`<div style="position:relative;display:inline-block">${tx(w, V ? 13 : 11)}<div class="strike" style="transform:scaleX(0);height:${(V ? 13 : 11) * U * 0.11}px"></div></div>`, { y });
      a.k(t, t + 0.2, { o: 0, y: y + 60, s: 1.2 }, { o: 1, y, s: 1 }, 'expo').k(d - 0.15, d, {}, { o: 0, s: 0.8 });
      const sEl = a.node.querySelector('.strike');
      const st = T0 + t + 0.25;
      a.fx((tt) => { sEl.style.transform = `scaleX(${E.out(clamp((tt - st) / 0.15))})`; });
      cue(t, 'tick'); cue(t + 0.25, 'strike');
    });
    const tr = 1.6 * k;
    flash(tr, 0.3, 0.4, '251,113,133'); shake(tr, 16); glitch(tr, 0.15);
    cue(0, 'section', { mode: 'build' });
  };

  S.reveal = (d) => {
    const cy = H * (V ? 0.38 : 0.36);
    for (let i = 0; i < 3; i++) {
      mk(`<div class="ring" style="width:${40 * U}px;height:${40 * U}px"></div>`, { y: cy }).k(i * 0.12, i * 0.12 + 1, { s: 0.2, o: 0.9 }, { s: 3 + i, o: 0 }, 'out');
    }
    const logo = mk(`<img src="assets/app-icon.svg" style="width:${(V ? 42 : 30) * U}px;display:block">`, { y: cy })
      .k(0, 0.6, { s: 0, r: -120, o: 0 }, { s: 1, r: 0, o: 1 }, 'back').k(d - 0.2, d, {}, { s: 1.6, o: 0, b: 10 }, 'in');
    const lt = T0;
    logo.fx((t, n) => {
      const p = Math.sin((t - lt) * 3) * 0.5 + 0.5;
      n.style.filter = `drop-shadow(0 0 ${30 + p * 40}px rgba(99,102,241,.85))`;
    });
    const by = H * (V ? 0.62 : 0.68);
    split(C.brand, V ? 15 : 12, 'big grad', 0.35, FA ? 0.1 : 0.05, { y: by }).k(d - 0.2, d, {}, { o: 0 });
    if (FA) mk(tx('TURBODROP', V ? 4 : 3, 'muted', 'letter-spacing:.5em;font-weight:700;font-family:Inter Display'), { y: by + (V ? 11 : 9) * U }).k(0.8, 1.1, { o: 0 }, { o: 1 }).k(d - 0.2, d, {}, { o: 0 });
    mk(tx(C.tagline, V ? 5 : 4, '', 'font-weight:600'), { y: by + (V ? 17 : 14) * U }).k(1.0, 1.3, { o: 0, y: by + 22 * U }, { o: 1, y: by + (V ? 17 : 14) * U }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    flash(0, 0.5, 1); shake(0, 32); streak(0.02, -1);
    cue(0, 'section', { mode: 'drop' }); cue(0, 'drop'); cue(1.0, 'shimmer');
  };

  S.how = (d) => {
    const h = d / 2;
    // Step label, changes at half time.
    const lblY = H * (V ? 0.09 : 0.2), lblX = V ? W / 2 : W * (FA ? 0.75 : 0.25);
    const step = (n, s) => `<div style="display:flex;align-items:baseline;gap:.3em"><span class="big grad">${num(n)}</span><span class="big">${s}</span></div>`;
    mk(tx(step(1, C.step1), V ? 11 : 8, ''), { x: lblX, y: lblY }).k(0, 0.3, { o: 0, x: lblX - 200 }, { o: 1, x: lblX }, 'expo').k(h - 0.15, h, {}, { o: 0, y: lblY - 80 }, 'in');
    mk(tx(step(2, C.step2), V ? 11 : 8, ''), { x: lblX, y: lblY }).k(h, h + 0.3, { o: 0, y: lblY + 80 }, { o: 1, y: lblY }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    // The computer shows the QR code.
    const ww = V ? W * 0.9 : W * 0.46;
    const wh = ww / 1.6 + 34;
    const wpos = V ? { x: W / 2, y: H * 0.37 } : { x: W * (FA ? 0.32 : 0.3), y: H * 0.6 };
    if (!V) wpos.x = FA ? W * 0.3 : W * 0.3;
    const win = mk(`<div class="win" style="width:${ww}px;height:${wh}px;position:relative"><div class="bar"><b></b><b></b><b></b></div><img src="${shot('desktop-phone')}" style="height:${wh - 34}px"><div class="scan" style="position:absolute;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#22d3ee,transparent);box-shadow:0 0 30px #22d3ee"></div></div>`, wpos);
    win.k(0, 0.45, { o: 0, ry: FA ? -35 : 35, s: 0.8 }, { o: 1, ry: 0, s: 1 }, 'expo').k(h - 0.2, h + 0.2, {}, V ? { y: -H * 0.3, o: 0 } : { s: 0.85, o: 0.35, b: 3 }, 'io').k(d - 0.2, d, {}, { o: 0 });
    const scan = win.node.querySelector('.scan');
    const st = T0;
    win.fx((t) => { scan.style.top = 34 + ((((t - st) * 0.9) % 1) * (wh - 40)) + 'px'; });
    // The phone: home (connected), then sending.
    const ph = V ? H * 0.5 : H * 0.84;
    const pw = (ph * 1179) / 2556;
    const pPos1 = V ? { x: W / 2, y: H * 0.86 } : { x: W * (FA ? 0.22 : 0.78), y: H * 0.56 };
    const pPos2 = V ? { x: W / 2, y: H * 0.56 } : pPos1;
    const phone = mk(`<div class="phone" style="width:${pw}px;height:${ph}px;position:relative"><img src="${shot('phone-home')}" style="position:absolute;inset:0"><img class="p2" src="${shot('phone-send')}" style="position:absolute;inset:0;opacity:0"></div>`, pPos1);
    phone.k(0.35, 0.85, { o: 0, y: pPos1.y + 300, rx: 25 }, { o: 1, y: pPos1.y, rx: 0 }, 'expo').k(h, h + 0.45, {}, { y: pPos2.y, s: V ? 1.25 : 1.05 }, 'expo').k(d - 0.2, d, {}, { o: 0, s: 1.4, b: 8 }, 'in');
    const p2 = phone.node.querySelector('.p2');
    phone.fx((t) => { p2.style.opacity = clamp((t - (T0 + h + 0.2)) / 0.25); });
    // Upload chevrons in step 2.
    for (let i = 0; i < 3; i++) {
      const cx = V ? W * 0.85 : pPos1.x + pw * 0.75 * (FA ? -1 : 1);
      const a = mk(`<div class="grad big" style="font-size:${9 * U}px">⌃</div>`, { x: cx, y: H * 0.5 });
      const t0 = h + 0.3 + i * 0.25;
      a.k(t0, t0 + 0.6, { o: 0, y: H * 0.6 }, { o: 1, y: H * 0.42 }, 'out').k(t0 + 0.6, t0 + 0.9, {}, { o: 0, y: H * 0.36 });
    }
    const cap = mk(`<div class="chip" style="font-size:${(V ? 4 : 2.8) * U}px"><i></i>${C.stepCap}</div>`, V ? { y: H * 0.165 } : { x: lblX, y: H * 0.32 });
    cap.k(h + 0.3, h + 0.6, { o: 0, s: 0.7 }, { o: 1, s: 1 }, 'back').k(d - 0.2, d, {}, { o: 0 });
    streak(0, 1); cue(0, 'whoosh'); cue(0.35, 'rise'); cue(h, 'hit'); streak(h, -1); cue(h + 0.3, 'pop');
  };

  S.speed = (d) => {
    const k = d / 2;
    const cy = H * (V ? 0.42 : 0.44);
    mk(tx(C.speedLbl, V ? 5 : 4, 'muted', 'font-weight:700'), { y: cy - (V ? 15 : 13) * U }).k(0, 0.3, { o: 0 }, { o: 1 }).k(d - 0.2, d, {}, { o: 0 });
    const n = mk(tx('0.0', V ? 22 : 17, 'big', 'font-variant-numeric:tabular-nums'), { y: cy });
    n.k(0, 0.25, { o: 0, s: 1.4 }, { o: 1, s: 1 }, 'expo').k(d - 0.2, d, {}, { o: 0, s: 1.3 });
    const bw = V ? W * 0.8 : W * 0.56;
    const bar = mk(`<div class="bar-outer" style="width:${bw}px;height:${3.2 * U}px"><div class="bar-inner"></div></div>`, { y: cy + (V ? 15 : 13) * U });
    bar.k(0, 0.3, { o: 0, sx: 0.3 }, { o: 1, sx: 1 }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    const inner = bar.node.querySelector('.bar-inner');
    const t0 = T0;
    const tDrop = 1.0 * k, tRes = 1.35 * k, tEnd = 1.85 * k;
    const prog = (t) => {
      const l = t - t0;
      if (l < tDrop) return 0.97 * E.out(l / tDrop);
      if (l < tRes) return 0.97;
      return 0.97 + 0.03 * E.out(clamp((l - tRes) / (tEnd - tRes)));
    };
    const big = n.node.firstChild;
    n.fx((t) => {
      const p = prog(t);
      const v = (4 * p).toFixed(1);
      big.innerHTML = `${FA ? fa(v).replace('.', '٫') : v}<span style="font-size:.42em;margin-inline-start:.25em">${C.unit}</span>`;
      inner.style.width = p * 100 + '%';
      const dropped = t - t0 >= tDrop && t - t0 < tRes;
      inner.style.filter = dropped ? 'grayscale(1) brightness(.6)' : '';
    });
    const cy2 = cy + (V ? 25 : 22) * U;
    mk(`<div class="chip" style="font-size:${(V ? 4.2 : 3) * U}px;border-color:rgba(251,113,133,.6)"><i style="background:#fb7185;box-shadow:0 0 12px #fb7185"></i>${C.dropped}</div>`, { y: cy2 })
      .k(tDrop, tDrop + 0.1, { o: 0, s: 1.3 }, { o: 1, s: 1 }, 'expo').k(tRes - 0.05, tRes, {}, { o: 0 });
    mk(`<div class="chip" style="font-size:${(V ? 4.2 : 3) * U}px;border-color:rgba(52,211,153,.6)"><i></i>⏯ ${C.resumed}</div>`, { y: cy2 })
      .k(tRes, tRes + 0.3, { o: 0, s: 0.6 }, { o: 1, s: 1 }, 'back').k(d - 0.2, d, {}, { o: 0 });
    glitch(tDrop, 0.25 * k); cue(tDrop, 'cut'); cue(tRes, 'hit'); flash(tRes, 0.2, 0.35, '52,211,153'); cue(0, 'counter', { dur: tDrop });
    cue(tEnd, 'ding');
  };

  S.security = (d) => {
    const cy = H * (V ? 0.35 : 0.42);
    const lx = V ? W / 2 : W * 0.5;
    const ls = (V ? 34 : 22) * U;
    mk(`<div style="width:${ls}px">${ICON.shackle}</div>`, { x: lx, y: cy - ls * 0.42 })
      .k(0, 0.4, { o: 0, y: cy - ls * 0.9 }, { o: 1, y: cy - ls * 0.62 }, 'expo').k(0.45, 0.6, {}, { y: cy - ls * 0.42 }, 'back').k(d - 0.2, d, {}, { o: 0 });
    const body = mk(`<div style="width:${ls}px;filter:drop-shadow(0 0 40px rgba(99,102,241,.8))">${ICON.lockBody}</div>`, { x: lx, y: cy + ls * 0.1 });
    body.k(0, 0.35, { o: 0, s: 0.5 }, { o: 1, s: 1 }, 'back').k(d - 0.2, d, {}, { o: 0, s: 1.3 });
    const pos = V
      ? [[0.5, 0.58], [0.5, 0.65], [0.5, 0.72], [0.5, 0.79]]
      : [[0.2, 0.32], [0.2, 0.56], [0.8, 0.32], [0.8, 0.56]];
    C.secure.forEach((s, i) => {
      const [x, y] = pos[i];
      const t = 0.6 + i * 0.25 * (d / 2);
      mk(`<div class="chip" style="font-size:${(V ? 4.6 : 3.2) * U}px"><i></i>${s}</div>`, { x: W * x, y: H * y })
        .k(t, t + 0.3, { o: 0, s: 0.6, y: H * y + 40 }, { o: 1, s: 1, y: H * y }, 'back').k(d - 0.2, d, {}, { o: 0 });
      cue(t, 'pop');
    });
    if (!V) mk(tx('XChaCha20‑Poly1305 · X25519', 2.6, 'muted', 'font-family:JetBrains Mono;font-weight:600'), { y: H * 0.86 }).k(1.4, 1.8, { o: 0 }, { o: 0.9 }).k(d - 0.2, d, {}, { o: 0 });
    cue(0.5, 'lock'); shake(0.5, 10);
  };

  S.platforms = (d) => {
    mk(tx(C.devices, V ? 9 : 7, 'big grad'), { y: H * (V ? 0.16 : 0.2) }).k(0, 0.3, { o: 0, y: H * 0.1 }, { o: 1, y: H * (V ? 0.16 : 0.2) }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    const icons = [ICON.pc, ICON.phone, ICON.phone, ICON.laptop, ICON.term];
    const pos = V ? [[0.28, 0.36], [0.72, 0.36], [0.28, 0.53], [0.72, 0.53], [0.5, 0.7]] : [[0.14, 0.52], [0.32, 0.52], [0.5, 0.52], [0.68, 0.52], [0.86, 0.52]];
    const tw = V ? W * 0.4 : W * 0.16, th = V ? H * 0.14 : H * 0.34;
    C.plat.forEach((p, i) => {
      const [x, y] = pos[i];
      const t = 0.2 + i * 0.22 * (d / 2);
      mk(`<div class="panel tile" style="width:${tw}px;height:${th}px;font-size:${(V ? 5.5 : 4) * U}px">${icons[i]}<div>${p}</div></div>`, { x: W * x, y: H * y })
        .k(t, t + 0.3, { o: 0, s: 1.7, r: (i % 2 ? 1 : -1) * 10 }, { o: 1, s: 1, r: 0 }, 'back').k(d - 0.2, d, {}, { o: 0, s: 0.7 });
      cue(t, 'hit', { soft: 1 });
    });
    mk(`<div class="chip" style="font-size:${(V ? 4.4 : 3.2) * U}px">🌍 ${C.langs}</div>`, { y: H * (V ? 0.82 : 0.82) }).k(1.4 * (d / 2), 1.7 * (d / 2), { o: 0, s: 0.6 }, { o: 1, s: 1 }, 'back').k(d - 0.2, d, {}, { o: 0 });
    cue(1.4 * (d / 2), 'pop');
  };

  S.ai = (d) => {
    const k = d / 4;
    mk(tx(C.aiHead, V ? 8.2 : 6, 'big', 'text-align:center;white-space:nowrap'), V ? { y: H * 0.12 } : { x: W * 0.5, y: H * 0.15 })
      .k(0, 0.35, { o: 0, s: 1.3, b: 12 }, { o: 1, s: 1, b: 0 }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    const tw = V ? W * 0.9 : W * 0.52, th = V ? H * 0.38 : H * 0.6;
    const cmd = '$ turbodrop share report.pdf';
    const q = qrSvg(window.QR.lan);
    const term = mk(`<div class="win" style="width:${tw}px;height:${th}px"><div class="bar"><b style="background:#fb7185"></b><b style="background:#fbbf24"></b><b style="background:#34d399"></b></div>
      <div class="term" style="padding:${2 * U}px;font-size:${(V ? 3.6 : 2.3) * U}px;color:#e2e8f0"><span class="c"></span><span class="cur" style="background:#22d3ee;color:#000">&nbsp;</span>
<span class="o1" style="color:#a3adc8"></span></div>
      <div class="qrb" style="position:absolute;left:${2 * U}px;bottom:${2 * U}px;width:${th * 0.5}px;height:${th * 0.5}px;background:#fff;padding:6px;border-radius:8px">${q}</div></div>`,
      V ? { y: H * 0.47 } : { x: W * 0.38, y: H * 0.6 });
    term.k(0.1, 0.45, { o: 0, ry: -25, s: 0.85 }, { o: 1, ry: 0, s: 1 }, 'expo').k(d - 0.2, d, {}, { o: 0, s: 0.9 });
    term.node.firstChild.style.position = 'relative';
    const c = term.node.querySelector('.c'), cur = term.node.querySelector('.cur'), o1 = term.node.querySelector('.o1'), qrb = term.node.querySelector('.qrb');
    const tType0 = T0 + 0.4, tType1 = T0 + 0.4 + 1.0 * k, tOut = tType1 + 0.25;
    term.fx((t) => {
      const n = Math.floor(clamp((t - tType0) / (tType1 - tType0)) * cmd.length);
      c.textContent = cmd.slice(0, n);
      cur.style.opacity = t < tOut ? (Math.floor(t * 3) % 2 ? 1 : 0.2) : 0;
      o1.textContent = t >= tOut ? 'Scan to receive · report.pdf · 2.4 MB' : '';
      const qk = clamp((t - tOut) / 0.3);
      qrb.style.opacity = qk;
      qrb.style.transform = `scale(${0.6 + 0.4 * E.back(qk)})`;
    });
    for (let i = 0; i < cmd.length; i += 2) cue(0.4 + (i / cmd.length) * 1.0 * k, 'type');
    cue(tOut - T0, 'hit');
    const cpos = V ? [[0.28, 0.7], [0.72, 0.7], [0.28, 0.765], [0.72, 0.765]] : [[0.8, 0.4], [0.8, 0.52], [0.8, 0.64], [0.8, 0.76]];
    AGENTS.forEach((a, i) => {
      const [x, y] = cpos[i];
      const t = 2.0 * k + i * 0.2;
      mk(`<div class="chip" style="font-size:${(V ? 4.4 : 3.2) * U}px">🤖 ${a}</div>`, { x: W * x, y: H * y })
        .k(t, t + 0.3, { o: 0, s: 0.6 }, { o: 1, s: 1 }, 'back').k(d - 0.2, d, {}, { o: 0 });
      cue(t, 'pop');
    });
    mk(tx(C.aiNote, V ? 3.6 : 2.6, 'muted', 'font-weight:600'), { y: H * (V ? 0.825 : 0.9) }).k(2.8 * k, 3.1 * k, { o: 0 }, { o: 1 }).k(d - 0.2, d, {}, { o: 0 });
    cue(0, 'section', { mode: 'filtered' });
  };

  S.score = (d) => {
    const r = rng(11);
    const cols = ['#22d3ee', '#6366f1', '#d946ef', '#34d399', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 46; i++) {
      const x0 = r() * W, sp = 0.5 + r() * 0.8, rs = (r() - 0.5) * 900, del = r() * 0.6, col = cols[i % cols.length];
      const a = mk(`<div class="confetti" style="background:${col}"></div>`, { x: x0, y: -40 });
      const t0 = T0 + 0.25 + del;
      a.fx((t, node) => {
        const l = t - t0;
        if (l < 0) { node.style.opacity = 0; return; }
        const y = -40 + l * H * 0.55 * sp;
        node.style.opacity = 1;
        node.style.transform = `translate(${x0 + Math.sin(l * 3 + i) * 40}px,${y}px) rotate(${l * rs}deg) rotateX(${l * 400}deg)`;
      });
    }
    mk(`<div class="chip" style="font-size:${(V ? 4 : 3) * U}px;letter-spacing:.15em">⏱ ${C.fullTime}</div>`, { y: H * (V ? 0.25 : 0.24) })
      .k(0, 0.3, { o: 0, y: H * 0.18 }, { o: 1, y: H * (V ? 0.25 : 0.24) }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    const sz = V ? 10 : 7.5;
    const board = V
      ? `<div style="text-align:center;font-size:${sz * U}px"><div class="big grad">${C.win}</div><div class="score" style="justify-content:center;font-size:1.25em;margin:.15em 0"><span class="n">${num(4)}</span><span>–</span><span class="n">${num(0)}</span></div><div class="big muted">${C.lose}</div></div>`
      : `<div class="score" style="font-size:${sz * U}px;gap:.35em"><span class="big grad">${C.win}</span><span class="n">${num(4)}</span><span>–</span><span class="n">${num(0)}</span><span class="big muted">${C.lose}</span></div>`;
    mk(board, { y: H * (V ? 0.48 : 0.5) }).k(0.15, 0.5, { o: 0, s: 2.2, b: 16 }, { o: 1, s: 1, b: 0 }, 'back').k(d - 0.2, d, {}, { o: 0 });
    mk(tx(C.free, V ? 6 : 5, 'big', 'letter-spacing:.04em'), { y: H * (V ? 0.75 : 0.76) }).k(1.0, 1.35, { o: 0, sx: 1.6 }, { o: 1, sx: 1 }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    cue(0.1, 'whistle'); flash(0.15, 0.25, 0.6); shake(0.15, 20); cue(0.15, 'impact'); cue(1.0, 'hit');
    cue(0, 'section', { mode: 'drop' });
  };

  S.cta = (d) => {
    mk(tx(C.get, V ? 11 : 7, 'big grad'), V ? { y: H * 0.17 } : { x: W * (FA ? 0.62 : 0.38), y: H * 0.3 })
      .k(0, 0.35, { o: 0, s: 1.4, b: 14 }, { o: 1, s: 1, b: 0 }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    const qs = V ? 44 * U : 30 * U;
    mk(`<div class="qr" style="width:${qs}px;height:${qs}px;box-shadow:0 0 80px rgba(99,102,241,.7)">${qrSvg(window.QR.site)}</div>`, V ? { y: H * 0.43 } : { x: W * (FA ? 0.2 : 0.8), y: H * 0.52 })
      .k(0.2, 0.6, { o: 0, s: 0.5, r: -10 }, { o: 1, s: 1, r: 0 }, 'back').k(d - 0.2, d, {}, { o: 0 });
    const ux = V ? W / 2 : W * (FA ? 0.62 : 0.38);
    mk(`<div class="chip" style="font-size:${(V ? 4.1 : 3) * U}px;direction:ltr;border-color:rgba(99,102,241,.8);box-shadow:0 0 40px rgba(99,102,241,.5)">${ICON.globe.replace('<svg', '<svg style="width:1em;height:1em"')}${URL_SITE}</div>`, { x: ux, y: H * (V ? 0.68 : 0.47) })
      .k(0.5, 0.85, { o: 0, y: H * (V ? 0.72 : 0.52) }, { o: 1, y: H * (V ? 0.68 : 0.47) }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    mk(tx(C.platLine, V ? 3.7 : 2.8, 'muted', 'font-weight:600'), { x: ux, y: H * (V ? 0.76 : 0.6) }).k(0.9, 1.2, { o: 0 }, { o: 1 }).k(d - 0.2, d, {}, { o: 0 });
    mk(`<div class="chip" style="font-size:${(V ? 3.8 : 2.8) * U}px"><i></i>${C.inst}</div>`, { x: ux, y: H * (V ? 0.81 : 0.72) }).k(1.2, 1.5, { o: 0, s: 0.6 }, { o: 1, s: 1 }, 'back').k(d - 0.2, d, {}, { o: 0 });
    streak(0, 1); cue(0.2, 'pop'); cue(0.5, 'whoosh'); cue(1.2, 'pop');
  };

  S.end = (d) => {
    const cx = V ? W / 2 : W * (FA ? 0.68 : 0.32);
    mk(`<img src="assets/pouyam-mark.svg" style="width:${(V ? 22 : 15) * U}px;display:block;filter:drop-shadow(0 0 30px rgba(201,178,124,.6))">`, { x: cx, y: H * (V ? 0.33 : 0.3) })
      .k(0, 0.6, { o: 0, s: 0.3, r: 90 }, { o: 1, s: 1, r: 0 }, 'back');
    mk(tx(C.endA, V ? 5.6 : 4.2, 'big', 'letter-spacing:0'), { x: cx, y: H * (V ? 0.49 : 0.5) }).k(0.3, 0.6, { o: 0, y: H * 0.55 }, { o: 1, y: H * (V ? 0.49 : 0.5) }, 'expo');
    mk(tx(C.endB, V ? 3.7 : 2.8, 'muted', 'font-weight:600'), { x: cx, y: H * (V ? 0.55 : 0.58) }).k(0.5, 0.8, { o: 0 }, { o: 1 });
    const hs = (V ? 4.4 : 3.2) * U;
    const handle = (ic, label) => `<div class="chip" style="font-size:${hs}px;direction:ltr">${ic.replace('<svg', '<svg style="width:1.1em;height:1.1em"')}${label}</div>`;
    const hy = H * (V ? 0.67 : 0.7);
    mk(handle(ICON.ig, '@pouyamworld'), { x: cx, y: hy }).k(0.7, 1.0, { o: 0, s: 0.6 }, { o: 1, s: 1 }, 'back');
    mk(handle(ICON.yt, '@pouyamworld'), { x: cx, y: hy + (V ? 8 : 7) * U }).k(0.85, 1.15, { o: 0, s: 0.6 }, { o: 1, s: 1 }, 'back');
    mk(tx('pouyam.com', V ? 3.8 : 2.8, 'gold', 'font-weight:700;letter-spacing:.08em;direction:ltr'), { x: cx, y: H * (V ? 0.81 : 0.88) }).k(1.0, 1.3, { o: 0 }, { o: 1 });
    if (!V) {
      // YouTube end-screen areas (the video and subscribe elements are placed over these in YouTube Studio).
      const ex = W * (FA ? 0.25 : 0.75);
      mk(`<div style="width:${W * 0.3}px;height:${W * 0.3 * 9 / 16}px;border:3px dashed rgba(165,180,252,.35);border-radius:18px;display:grid;place-items:center;font-size:${2.6 * U}px" class="muted">▶ ${C.watchNext}</div>`, { x: ex, y: H * 0.36 }).k(1.2, 1.6, { o: 0 }, { o: 1 });
      mk(`<div style="width:${16 * U}px;height:${16 * U}px;border:3px dashed rgba(165,180,252,.35);border-radius:50%;display:grid;place-items:center;font-size:${2.4 * U}px" class="muted">${C.subscribe}</div>`, { x: ex, y: H * 0.74 }).k(1.3, 1.7, { o: 0 }, { o: 1 });
    }
    cue(0, 'section', { mode: 'outro' }); cue(0, 'final'); flash(0, 0.3, 0.5); streak(0, -1);
  };

  // ---- YouTube only ----
  S.features = (d) => {
    const n = C.features.length;
    const each = d / n;
    C.features.forEach(([title, desc, img, kind], i) => {
      const t0 = i * each;
      const tl = { x: W * (FA ? 0.77 : 0.23), y: H * 0.5 };
      const card = mk(`<div style="width:${W * 0.32}px;white-space:normal;text-align:${FA ? 'right' : 'left'}">
        <div class="big grad" style="font-size:${9 * U}px">${num(String(i + 1).padStart(2, '0'))}</div>
        <div class="big" style="font-size:${5.4 * U}px;margin:.2em 0 .35em;white-space:normal;line-height:1.1">${title}</div>
        <div class="muted" style="font-size:${2.7 * U}px;line-height:1.5;font-weight:500">${desc}</div></div>`, tl);
      card.k(t0, t0 + 0.4, { o: 0, x: tl.x + (FA ? 140 : -140) }, { o: 1, x: tl.x }, 'expo').k(t0 + each - 0.2, t0 + each, {}, { o: 0, x: tl.x + (FA ? -100 : 100) }, 'in');
      const sx = W * (FA ? 0.29 : 0.71);
      const media = kind === 'phone'
        ? `<div class="phone" style="width:${H * 0.8 * 1179 / 2556}px;height:${H * 0.8}px"><img src="${shot(img)}"></div>`
        : `<div class="win" style="width:${W * 0.48}px;height:${W * 0.48 / 1.6 + 34}px"><div class="bar"><b></b><b></b><b></b></div><img src="${shot(img)}" style="height:${W * 0.48 / 1.6}px"></div>`;
      mk(media, { x: sx, y: H * 0.52 })
        .k(t0, t0 + 0.5, { o: 0, ry: FA ? 30 : -30, s: 0.85, x: sx + (FA ? -200 : 200) }, { o: 1, ry: FA ? 6 : -6, s: 1, x: sx }, 'expo')
        .k(t0 + 0.5, t0 + each - 0.2, {}, { ry: 0, s: 1.04 }, 'lin')
        .k(t0 + each - 0.2, t0 + each, {}, { o: 0, s: 0.9 }, 'in');
      streak(t0, FA ? -1 : 1);
    });
    cue(0, 'section', { mode: 'groove' });
  };

  S.numbers = (d) => {
    const blocks = [C.numA, C.numB];
    blocks.forEach(([big, small], i) => {
      const y = H * (0.34 + i * 0.32);
      const t = 0.2 + i * 0.9;
      mk(tx(big, 11, 'big grad'), { y }).k(t, t + 0.4, { o: 0, s: 1.6, b: 16 }, { o: 1, s: 1, b: 0 }, 'expo').k(d - 0.2, d, {}, { o: 0 });
      mk(tx(small, 3, 'muted', 'font-weight:600'), { y: y + 9 * U }).k(t + 0.3, t + 0.6, { o: 0 }, { o: 1 }).k(d - 0.2, d, {}, { o: 0 });
      cue(t, 'impact', { soft: 1 }); shake(t, 12);
    });
  };

  S.collective = (d) => {
    mk(`<img src="assets/pouyam-mark.svg" style="width:${10 * U}px;display:block">`, { y: H * 0.13 }).k(0, 0.4, { o: 0, s: 0.4 }, { o: 1, s: 1 }, 'back').k(d - 0.2, d, {}, { o: 0 });
    mk(tx(C.coll, 7, 'big', 'letter-spacing:.06em'), { y: H * 0.26 }).k(0.2, 0.55, { o: 0, sx: 1.5 }, { o: 1, sx: 1 }, 'expo').k(d - 0.2, d, {}, { o: 0 });
    mk(`<div class="muted" style="font-size:${2.8 * U}px;white-space:normal;width:${W * 0.62}px;text-align:center;font-weight:500;line-height:1.5">${C.collSub}</div>`, { y: H * 0.36 }).k(0.6, 1.0, { o: 0 }, { o: 1 }).k(d - 0.2, d, {}, { o: 0 });
    const icons = ['assets/app-icon.svg', null, null];
    C.projects.forEach(([name, desc], i) => {
      const x = W * (FA ? 0.79 - i * 0.29 : 0.21 + i * 0.29);
      const t = 1.4 + i * 0.35;
      const badge = i === 0 ? `<img src="${icons[0]}" style="width:1.3em;vertical-align:middle;margin-inline-end:.3em">` : i === 1 ? '↔ ' : '🛡️ ';
      mk(`<div class="panel card" style="width:${W * 0.255}px;font-size:${3.4 * U}px;white-space:normal"><h3>${badge}${name}</h3><p>${desc}</p></div>`, { x, y: H * 0.62 })
        .k(t, t + 0.45, { o: 0, y: H * 0.75, rx: 30 }, { o: 1, y: H * 0.62, rx: 0 }, 'expo').k(d - 0.2, d, {}, { o: 0 });
      cue(t, 'pop');
    });
    mk(`<div class="chip" style="font-size:${2.8 * U}px;direction:ltr">${ICON.globe.replace('<svg', '<svg style="width:1em;height:1em"')}pouyamsmartcity.github.io · pouyam.com</div>`, { y: H * 0.87 }).k(2.8, 3.2, { o: 0 }, { o: 1 }).k(d - 0.2, d, {}, { o: 0 });
    streak(0, 1);
    cue(0, 'section', { mode: 'build' });
  };

  const TIMELINES = {
    reel: [['hook', 2], ['matchday', 2], ['problems', 2], ['reveal', 2], ['how', 4], ['speed', 2], ['security', 2], ['platforms', 2], ['ai', 4], ['score', 2], ['cta', 4], ['end', 2]],
    youtube: [['hook', 4], ['matchday', 4], ['problems', 4], ['reveal', 4], ['how', 8], ['features', 16], ['speed', 4], ['numbers', 4], ['security', 4], ['platforms', 4], ['ai', 8], ['score', 4], ['collective', 8], ['cta', 6], ['end', 8]],
  };
  let t = 0;
  for (const [name, dur] of TIMELINES[FORMAT]) {
    T0 = t; D = dur;
    SCENES.push({ name, t0: t, d: dur });
    S[name](dur);
    t += dur;
  }
  const TOTAL = t;
  ENGINE.setBg((tt) => {
    const s = SCENES.find((x) => tt >= x.t0 && tt < x.t0 + x.d) || SCENES[0];
    const l = tt - s.t0;
    if (s.name === 'reveal') return { grid: 0.16, blobs: 1.3, warp: Math.max(0, 1 - l * 1.2) };
    if (s.name === 'speed') return { grid: 0.18, blobs: 1, warp: l < s.d / 2 ? 0.5 : 0.1 };
    if (s.name === 'hook') return { grid: 0, blobs: 0.4, warp: 0 };
    if (s.name === 'end') return { grid: 0.06, blobs: 0.7, warp: 0 };
    return { grid: 0.12, blobs: 1, warp: 0 };
  });
  window.TEASER = { TOTAL, CUES: CUES.sort((a, b) => a.t - b.t), SCENES, FPS: 30 };
})();

// A tiny deterministic motion-graphics engine: every frame is a pure function of time t (seconds).
// Elements have keyframe tracks; scenes create elements; render(t) sets every style. No CSS animations,
// so a frame-by-frame capture is exact and repeatable.
(() => {
  const P = new URLSearchParams(location.search);
  const FORMAT = P.get('format') || 'reel';
  const LANG = P.get('lang') || 'en';
  const V = FORMAT === 'reel';
  const W = V ? 1080 : 1920;
  const H = V ? 1920 : 1080;
  const U = Math.min(W, H) / 100; // 1 unit = 1% of the short side
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.className = LANG;

  const E = {
    lin: (x) => x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    in: (x) => x * x * x,
    io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: (x) => {
      const c1 = 1.9, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    expo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    elastic: (x) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  };
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;

  // Seeded random (mulberry32), so grain and particles are the same in every render.
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const stage = document.getElementById('stage');
  stage.style.width = W + 'px';
  stage.style.height = H + 'px';
  const content = document.getElementById('content');

  const els = []; // {node, base, tracks, start, end, fx}
  const flashes = []; // {t, dur, color, max}
  const shakes = []; // {t, amp}
  const glitches = []; // {t, dur}
  const streaks = []; // {t, dir}

  function el(html, base = {}, opts = {}) {
    const node = document.createElement('div');
    node.className = 'el ' + (opts.cls || '');
    if (typeof html === 'string') node.innerHTML = html;
    else node.appendChild(html);
    if (opts.style) Object.assign(node.style, opts.style);
    (opts.parent || content).appendChild(node);
    const e = { node, base: Object.assign({ x: W / 2, y: H / 2, s: 1, r: 0, o: 1, b: 0, sk: 0, sx: 1, sy: 1, clip: 1, cdir: 0, rx: 0, ry: 0 }, base), tracks: [], start: -1e9, end: 1e9, fx: opts.fx || null };
    els.push(e);
    const api = {
      e,
      node,
      // k(t0, t1, from, to, ease): animate properties between times (scene-local seconds).
      k(t0, t1, from, to, ease = 'out') {
        e.tracks.push({ t0: t0 + api.off, t1: t1 + api.off, from, to, ease: E[ease] || ease });
        return api;
      },
      off: 0,
      life(a, b) { e.start = a + api.off; e.end = b + api.off; return api; },
      fx(f) { e.fx = f; return api; },
    };
    return api;
  }

  function value(e, prop, t) {
    let v = e.base[prop];
    let first = true;
    for (const tr of e.tracks) {
      if (!(prop in tr.to)) continue;
      const from = prop in tr.from ? tr.from[prop] : v;
      if (t < tr.t0) {
        if (first) v = from;
        break;
      }
      const k = tr.t1 <= tr.t0 ? 1 : tr.ease(clamp((t - tr.t0) / (tr.t1 - tr.t0)));
      v = lerp(from, tr.to[prop], k);
      first = false;
    }
    return v;
  }

  const PROPS = ['x', 'y', 's', 'r', 'o', 'b', 'sk', 'sx', 'sy', 'clip', 'rx', 'ry'];

  function renderEls(t) {
    for (const e of els) {
      if (t < e.start || t > e.end) {
        if (e.node.style.display !== 'none') e.node.style.display = 'none';
        continue;
      }
      const p = {};
      for (const k of PROPS) p[k] = value(e, k, t);
      if (p.o <= 0.001) {
        e.node.style.display = 'none';
        continue;
      }
      e.node.style.display = '';
      e.node.style.opacity = p.o;
      e.node.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) perspective(1600px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotate(${p.r}deg) skewX(${p.sk}deg) scale(${p.s * p.sx},${p.s * p.sy})`;
      e.node.style.filter = p.b > 0.05 ? `blur(${p.b}px)` : '';
      if (p.clip < 0.999) {
        const c = (1 - p.clip) * 100;
        e.node.style.clipPath = e.base.cdir === 1 ? `inset(0 0 0 ${c}%)` : e.base.cdir === 2 ? `inset(${c}% 0 0 0)` : `inset(0 ${c}% 0 0)`;
      } else e.node.style.clipPath = '';
      if (e.fx) e.fx(t, e.node, p);
    }
  }

  // ---------- background ----------
  const bg = document.getElementById('bg');
  bg.width = W; bg.height = H;
  const g = bg.getContext('2d');
  const R = rng(7);
  const parts = Array.from({ length: 90 }, () => ({ x: R() * W, y: R() * H, z: 0.3 + R() * 0.7, ph: R() * 6.28, c: R() }));
  let bgMode = () => ({ grid: 0.12, blobs: 1, warp: 0, hue: 0 });

  function drawBg(t) {
    const m = bgMode(t);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#05060d';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    const blobs = [
      ['34,211,238', 0.3 + 0.2 * Math.sin(t * 0.4), 0.25 + 0.1 * Math.cos(t * 0.3)],
      ['99,102,241', 0.7 + 0.15 * Math.cos(t * 0.35), 0.55 + 0.15 * Math.sin(t * 0.25)],
      ['217,70,239', 0.45 + 0.2 * Math.sin(t * 0.3 + 2), 0.85 + 0.08 * Math.cos(t * 0.45)],
    ];
    for (const [c, bx, by] of blobs) {
      const r = Math.max(W, H) * 0.55;
      const grd = g.createRadialGradient(bx * W, by * H, 0, bx * W, by * H, r);
      grd.addColorStop(0, `rgba(${c},${0.33 * m.blobs})`);
      grd.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
    }
    // Perspective floor grid, scrolling towards the viewer.
    if (m.grid > 0) {
      g.globalCompositeOperation = 'source-over';
      const hy = H * (V ? 0.62 : 0.6);
      g.strokeStyle = `rgba(99,102,241,${m.grid})`;
      g.lineWidth = 1.5;
      for (let i = -20; i <= 20; i++) {
        g.beginPath();
        g.moveTo(W / 2 + i * W * 0.02, hy);
        g.lineTo(W / 2 + i * W * 0.25, H);
        g.stroke();
      }
      const sp = (t * (0.6 + m.warp * 4)) % 1;
      for (let j = 0; j < 14; j++) {
        const z = (j + sp) / 14;
        const y = hy + (H - hy) * Math.pow(z, 2.2);
        g.globalAlpha = z;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    // Particles (light dust), faster in "warp" moments.
    g.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const y = (p.y - t * 16 * p.z * (1 + m.warp * 12)) % H;
      const yy = y < 0 ? y + H : y;
      const a = (0.18 + 0.22 * Math.sin(t * 0.8 + p.ph)) * p.z;
      g.fillStyle = p.c < 0.33 ? `rgba(34,211,238,${a})` : p.c < 0.66 ? `rgba(165,180,252,${a})` : `rgba(240,171,252,${a})`;
      if (m.warp > 0.05) g.fillRect(p.x, yy, 2 * p.z, 2 + m.warp * 60 * p.z);
      else {
        g.beginPath();
        g.arc(p.x, yy, 1.6 * p.z + 0.4, 0, 6.29);
        g.fill();
      }
    }
    g.globalCompositeOperation = 'source-over';
  }

  // ---------- overlays ----------
  const flashEl = document.getElementById('flash');
  const grainEl = document.getElementById('grain');
  const streakEl = document.getElementById('streak');
  const grainTiles = [];
  {
    const r = rng(42);
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      const d = x.createImageData(256, 256);
      for (let j = 0; j < d.data.length; j += 4) {
        const v = r() * 255;
        d.data[j] = d.data[j + 1] = d.data[j + 2] = v;
        d.data[j + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      grainTiles.push(`url(${c.toDataURL()})`);
    }
  }

  function renderOverlays(t, fi) {
    let f = 0, color = '255,255,255';
    for (const fl of flashes) {
      if (t >= fl.t && t < fl.t + fl.dur) {
        const k = (1 - (t - fl.t) / fl.dur) * fl.max;
        if (k > f) { f = k; color = fl.color; }
      }
    }
    flashEl.style.background = `rgba(${color},${f})`;
    let sx = 0, sy = 0, rot = 0;
    for (const s of shakes) {
      const d = t - s.t;
      if (d >= 0 && d < 0.6) {
        const a = s.amp * Math.exp(-d * 7);
        sx += a * Math.sin(d * 71);
        sy += a * Math.cos(d * 53);
        rot += a * 0.04 * Math.sin(d * 37);
      }
    }
    let gl = 0;
    for (const gg of glitches) if (t >= gg.t && t < gg.t + gg.dur) gl = 1;
    content.style.transform = `translate(${sx}px,${sy}px) rotate(${rot}deg)`;
    content.style.filter = gl ? `drop-shadow(${6 + (fi % 3) * 4}px 0 0 rgba(34,211,238,.8)) drop-shadow(${-6 - (fi % 2) * 5}px 0 0 rgba(217,70,239,.8))` : '';
    bg.style.transform = gl && fi % 2 ? `translateX(${(fi % 5) * 8 - 16}px)` : '';
    grainEl.style.backgroundImage = grainTiles[fi % grainTiles.length];
    // Light streak sweeping across on transitions.
    let st = -1, dir = 1;
    for (const s of streaks) if (t >= s.t && t < s.t + 0.45) { st = (t - s.t) / 0.45; dir = s.dir; }
    if (st >= 0) {
      streakEl.style.display = '';
      const x = lerp(-0.6, 1.6, E.io(st)) * W;
      streakEl.style.transform = `translateX(${dir > 0 ? x : W - x}px) skewX(-20deg)`;
    } else streakEl.style.display = 'none';
  }

  let sceneHook = () => {};
  window.ENGINE = {
    FORMAT, LANG, V, W, H, U, E, el, rng, clamp, lerp, flashes, shakes, glitches, streaks,
    setBg(f) { bgMode = f; },
    onFrame(f) { sceneHook = f; },
    render(t, fi = Math.round(t * 30)) {
      drawBg(t);
      renderEls(t);
      sceneHook(t, fi);
      renderOverlays(t, fi);
    },
  };
})();

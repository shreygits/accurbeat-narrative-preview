/* AccurBeat · Core Narrative — the packaged section (built 2026-10-14 by tools/build-package.py).
   Generated file: edit the prototype sources (js/*.js, package-src/*) and rebuild instead of editing here.
   Synthetic, illustrative data only — not patient data. */

const makeSignal = () => (() => {
  const window = {};
/* AccurKardia · Core Narrative
   A deterministic, synthetic 72-hour Holter recording that drives the parallax.
   Seeded, so every visitor sees the same three days. Illustrative only — not patient data. */
(function () {
  'use strict';

  const H = 3600, DAY = 86400, TOTAL = 3 * DAY;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(0x0ac2d1a);
  function gauss() {
    let u = 0;
    while (u === 0) u = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  }

  /* ---------- one heartbeat ----------
     Sum of Gaussians for P, Q, R, S, T (after McSharry et al., ECGSYN).
     Units: mV; phi = seconds from the R peak; rr = preceding R–R interval. */
  const g = (x, a, mu, s) => { const d = (x - mu) / s; return a * Math.exp(-0.5 * d * d); };

  function normalBeat(phi, rr) {
    return g(phi, 0.11, -0.165, 0.022)
         + g(phi, -0.09, -0.031, 0.0085)
         + g(phi, 1.0, 0, 0.0105)
         + g(phi, -0.24, 0.031, 0.011)
         + g(phi, 0.27, 0.235 * Math.sqrt(rr), 0.05);
  }
  // Ventricular ectopic beat: no P wave, wide QRS, discordant T. Matches the exploration's morphology, which Peter
  // (AccurKardia) confirmed as accurate on 2026-10-07.
  function ectopicBeat(phi) {
    return g(phi, 1.05, 0, 0.032)
         + g(phi, -0.55, 0.075, 0.03)
         + g(phi, -0.34, 0.31, 0.065);
  }
  const beatShape = (phi, rr, type) => (type ? ectopicBeat(phi) : normalBeat(phi, rr));
  const PHI0 = -0.3, PHI1 = 0.66; // support of a single beat

  /* ---------- three days of a life, as heart rate ---------- */
  const SLEEPS = [[-2, 6.5], [23.6, 30.75], [47.9, 54.8], [71.5, 80]].map(([a, b]) => [a * H, b * H]);
  const ACTS = [
    [7.0, 7.66, 148], [8.66, 9.1, 92], [12.5, 12.95, 95], [16.15, 16.6, 114],     // day 1
    [32.15, 32.45, 86], [42.5, 43.35, 138],                                       // day 2
    [56.5, 57.1, 94], [61.85, 62.7, 97], [65.9, 66.3, 110], [68.0, 68.7, 99],     // day 3
  ].map(([a, b, bpm]) => ({ t0: a * H, t1: b * H, bpm }));

  const sig = (x) => 1 / (1 + Math.exp(-x));
  const ph = [rand() * 6.283, rand() * 6.283, rand() * 6.283];

  function hrAt(t) {
    const h = (t % DAY) / H;
    let hr = 68 + 8 * Math.sin((2 * Math.PI * (h - 9)) / 24);
    let asleep = 0;
    for (let i = 0; i < SLEEPS.length; i++) {
      const s = SLEEPS[i];
      if (t > s[0] - 7200 && t < s[1] + 7200) asleep = Math.max(asleep, sig((t - s[0]) / 600) * sig((s[1] - t) / 900));
    }
    hr -= asleep * 9;
    for (let i = 0; i < ACTS.length; i++) {
      const A = ACTS[i];
      if (t > A.t0 - 3600 && t < A.t1 + 5400) hr += (A.bpm - hr) * sig((t - A.t0) / 150) * sig((A.t1 - t) / 420);
    }
    return hr + 2.4 * Math.sin(t / 1900 + ph[0]) + 1.7 * Math.sin(t / 731 + ph[1]) + 1.1 * Math.sin(t / 211 + ph[2]);
  }

  /* ---------- every beat ---------- */
  const CAP = 360000;
  const T = new Float64Array(CAP);   // R-peak time (s)
  const RR = new Float32Array(CAP);  // preceding R–R interval (s)
  const A = new Float32Array(CAP);   // amplitude scale
  const TY = new Uint8Array(CAP);    // 0 normal · 1 ventricular ectopic
  let n = 0;
  for (let t = 0.42; t < TOTAL && n < CAP;) {
    const resp = Math.sin((2 * Math.PI * t) / 4.2); // respiratory sinus arrhythmia
    T[n] = t; A[n] = 1 + 0.05 * resp + 0.02 * gauss(); n++;
    t += (60 / hrAt(t)) * (1 + 0.03 * resp + 0.011 * gauss());
  }

  function idxAt(t) { // last k with T[k] <= t, or -1
    if (t < T[0]) return -1;
    let lo = 0, hi = n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T[m] <= t) lo = m; else hi = m - 1; }
    return lo;
  }

  // Premature ectopic: fires early, the next sinus beat keeps its slot (full compensatory pause).
  function makeEctopic(k) {
    if (k < 2 || k > n - 3 || TY[k] || TY[k - 1]) return false;
    T[k] = T[k - 1] + (T[k] - T[k - 1]) * (0.56 + 0.08 * rand());
    TY[k] = 1; A[k] = 1 + 0.03 * gauss();
    return true;
  }

  const SNAP = { t0: DAY + 11 * H + 52 * 60, dur: 10 };   // the doctor's 10-second ECG, day 2 · 11:52
  SNAP.t1 = SNAP.t0 + SNAP.dur; SNAP.c = SNAP.t0 + SNAP.dur / 2;

  const EVENTS = [
    { id: 1, t: 16 * H + 20 * 60, label: 'Palpitations', every: 2, dur: 30 },               // bigeminy on the stairs
    { id: 2, t: DAY + 3 * H + 14 * 60 + 22, label: 'While asleep', every: 2, dur: 48 },     // unfelt: a run of bigeminy while asleep (as confirmed)
    { id: 3, t: 2 * DAY + 18 * H + 5 * 60, label: 'Dizzy spell', every: 3, dur: 40 },       // trigeminy
  ];
  const protect = [[SNAP.t0 - 120, SNAP.t1 + 120], [EVENTS[1].t - 40, EVENTS[1].t + 40]];
  const isProtected = (t) => protect.some(([a, b]) => t > a && t < b);

  for (let k = 3; k < n - 3; k++) { // scattered ectopy, a little more at night
    const h = (T[k] % DAY) / H, night = h < 6.5 || h > 23.5;
    if (rand() < (night ? 0.0011 : 0.0007) && !isProtected(T[k])) makeEctopic(k);
  }
  for (const e of EVENTS) {
    if (!e.every) {
      const k = idxAt(e.t + 0.35);
      makeEctopic(k); e.t = T[k]; e.k = k;
      for (const dt of [-96, 47, 133, 288]) makeEctopic(idxAt(e.t + dt));
    } else {
      for (let k = idxAt(e.t - e.dur / 2); T[k] < e.t + e.dur / 2; k += e.every) makeEctopic(k);
    }
  }

  RR[0] = 60 / hrAt(T[0]);
  for (let k = 1; k < n; k++) RR[k] = T[k] - T[k - 1];

  function ecg(t) {
    const k = idxAt(t - PHI0);
    let v = 0;
    for (let j = k; j >= 0; j--) {
      const p = t - T[j];
      if (p > PHI1) break;
      if (p >= PHI0) v += A[j] * beatShape(p, RR[j], TY[j]);
    }
    return v;
  }

  // per-type [min, max] of one beat (for fast envelope rendering)
  const EXT = [0, 1].map((ty) => {
    let mn = 0, mx = 0;
    for (let p = PHI0; p < PHI1; p += 0.0005) { const v = beatShape(p, 0.85, ty); if (v < mn) mn = v; if (v > mx) mx = v; }
    return [mn, mx];
  });

  /* ---------- statistics ---------- */
  let nEct = 0;
  for (let k = 0; k < n; k++) nEct += TY[k];

  const hrHour = new Float32Array(72), cnt = new Uint32Array(72);
  for (let k = 1; k < n; k++) {
    if (TY[k] || TY[k - 1]) continue;
    const h = Math.min(71, Math.floor(T[k] / H));
    hrHour[h] += 60 / RR[k]; cnt[h]++;
  }
  for (let h = 0; h < 72; h++) hrHour[h] /= Math.max(1, cnt[h]);

  function meanHR(t0, t1) {
    let s = 0, c = 0;
    for (let k = Math.max(1, idxAt(t0) + 1); k < n && T[k] <= t1; k++) { if (TY[k] || TY[k - 1]) continue; s += 60 / RR[k]; c++; }
    return c ? s / c : 0;
  }

  SNAP.k0 = idxAt(SNAP.t0) + 1;
  SNAP.k1 = idxAt(SNAP.t1);
  SNAP.beats = SNAP.k1 - SNAP.k0 + 1;
  SNAP.hr = meanHR(SNAP.t0, SNAP.t1);
  let snapEct = 0;
  for (let k = SNAP.k0; k <= SNAP.k1; k++) snapEct += TY[k];
  SNAP.ectopic = snapEct;

  const TAGS = [
    { t: 3 * H, label: 'Sleep' },
    { t: 7.33 * H, label: 'Morning run' },
    { t: SNAP.c, label: "Doctor's visit", snap: true },
    { t: 42.9 * H, label: 'Gym' },
    { t: 50.5 * H, label: 'Sleep' },
    { t: 56.8 * H, label: 'Commute' },
    { t: 62.25 * H, label: 'Meeting' },
  ].map((tg) => ({ ...tg, hr: Math.round(tg.snap ? SNAP.hr : meanHR(tg.t - 180, tg.t + 180)) }));

  const NIGHTS = SLEEPS.map(([a, b]) => [Math.max(0, a), Math.min(TOTAL, b)]).filter(([a, b]) => b > a);

  const pad = (x) => String(x).padStart(2, '0');
  function clock(t) {
    const d = Math.floor(t / DAY), r = t - d * DAY;
    const hh = Math.floor(r / H), mm = Math.floor((r % H) / 60), ss = Math.floor(r % 60);
    return { day: d + 1, hm: pad(hh) + ':' + pad(mm), hms: pad(hh) + ':' + pad(mm) + ':' + pad(ss) };
  }

  window.AKSignal = {
    H, DAY, TOTAL, n, T, RR, A, TY, EXT, PHI0, PHI1,
    ecg, idxAt, beatShape, hrAt, meanHR, clock, mulberry32,
    nEct, hrHour, SNAP, EVENTS, EV: EVENTS[1], TAGS, NIGHTS,
  };
})();

  return window.AKSignal;
})();

const AKLife = (() => {
  const window = {};
/* AccurKardia · Daily-life photos on the timeline
   ---------------------------------------------------------------------------
   One implementation shared by the zoom-out lab (lab-zoom.html) and the narrative
   (v2-images.html), so a comp locked in the lab plays identically in the story.

     const life = AKLife(AKSignal, params);   // params: the lab's settings object
     life.build();                             // after seed / density changes
     life.draw(ctx, view);                     // every frame

   view = { W, H, DPR, L: { top, base, bot, fieldH, pw }, X(t) → px, span (s), kn (0…1 zoom),
            ink: [r,g,b], clipX / clipX1 (horizontal clip), alpha (0…1), safeTop, safeBottom,
            matte: CSS colour behind each photo (keeps the look identical on light and dark backgrounds) } */
(function () {
  'use strict';
  window.AKLife = function (S, initialParams, env) {
    const BASE = (env && env.assetBase) || '';   // where the photos live; the packaged section passes its assets folder
    const TOT = S.TOTAL, SN = S.SNAP;
    const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
    const lerp = (a, b, t) => a + (b - a) * t;
    const sstep = (t) => t * t * (3 - 2 * t);
    const sm = (a, b, x) => sstep(clamp((x - a) / (b - a)));
    const lsm = (a, b, s) => sm(Math.log(a), Math.log(b), Math.log(s));
    const out3 = (t) => 1 - Math.pow(1 - t, 3);
    const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + clamp(a).toFixed(3) + ')';
    const MONO = (s, w = 500) => w + ' ' + s + 'px "Geist Mono", ui-monospace, Menlo, monospace';
    const SANS = (s, w = 400) => w + ' ' + s + 'px Geist, system-ui, sans-serif';
    const hasLS = 'letterSpacing' in CanvasRenderingContext2D.prototype;
    function txt(c, s, x, y, font, color, align = 'left', ls = '0.07em') {
      c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic';
      if (hasLS) c.letterSpacing = ls;
      c.fillText(s, x, y);
      if (hasLS) c.letterSpacing = '0px';
    }
    let P = initialParams || {};
    // frame state, set by draw()
    let ctx = null, W = 0, H = 0, L = {}, X = (t) => t, DPR = 1, kn = 0, VIEW = {};
    const cam = { s: 1 };
    const px = (x) => (Math.round(x * DPR) + 0.5) / DPR;

  /* ---------- photos ---------- */
  const SRC = (BASE ? ['hero.jpg', 'mosaic/routine.jpg', 'mosaic/step1.jpg', 'mosaic/step2.jpg', 'mosaic/step3.jpg'].map((f) => BASE + f)
    : ['assets/hero.jpg', 'assets/mosaic/routine.jpg', 'assets/mosaic/step1.jpg', 'assets/mosaic/step2.jpg', 'assets/mosaic/step3.jpg']);
  /* each moment in the locked comp has its own photo: assets/life/<key>.jpg, picked from Unsplash (credits in credits.json).
     A card takes the photo of the moment nearest its start (within 20 min); any other card keeps one of the shared five. */
  // [hour, file, caption, lane]. Lanes (for 'by moment', 'above & below'): 0 above · 1 below · 2 above, outer · 3 below, outer.
  // The three episodes' moments (stairs1, sleep1, stairs2) sit in the inner lane below the graph; the rest balance them, 7 and 7.
  const OWN = [[7.0, 'walk-am', 'Walk', 0], [7.32, 'run', 'Run', 1], [16.32, 'stairs1', 'Stairs', 1], [21.6, 'home', 'Home', 0], [27.23, 'sleep1', 'Asleep', 1],
    [35.52, 'clinic1', 'Clinic', 0], [35.9, 'clinic2', 'Clinic', 0], [36.38, 'work1', 'Work', 1], [42.9, 'gym', 'Gym', 3], [50.15, 'sleep2', 'Asleep', 0],
    [56.75, 'commute', 'Commute', 1], [64.73, 'work2', 'Work', 0], [66.07, 'stairs2', 'Stairs', 1], [68.32, 'walk-pm', 'Walk', 2]];
  const OWN_AT = SRC.length;
  OWN.forEach(([, k]) => SRC.push((BASE || 'assets/') + 'life/' + k + '.jpg'));
  const PHOTOS = SRC.map((src) => { const p = { img: new Image(), c: null }; p.img.onload = () => tone(p); p.img.src = src; return p; });
  function tone(p) {
    if (!p.img.naturalWidth) return;
    const c = p.c || document.createElement('canvas'), w = p.img.naturalWidth, h = p.img.naturalHeight;
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.drawImage(p.img, 0, 0);
    const warm = [lerp(255, 214, P.warmth), lerp(255, 186, P.warmth), lerp(255, 162, P.warmth)];
    g.globalCompositeOperation = 'multiply'; g.fillStyle = rgba(warm.map(Math.round), 1); g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,' + (1 - P.saturation).toFixed(3) + ')'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(217,138,63,' + (0.5 * P.warmth).toFixed(3) + ')'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(0,0,0,' + (1 - P.brightness).toFixed(3) + ')'; g.fillRect(0, 0, w, h);
    p.c = c;
  }
  let toneT = 0;
  const retone = () => { clearTimeout(toneT); toneT = setTimeout(() => PHOTOS.forEach(tone), 60); };

  /* ---------- moments ---------- */
  const KIND = {
    sleep: { lvl: 0.04, src: [0, 1], dur: [5400, 8400], label: 'Asleep' },
    morning: { lvl: 0.32, src: [1, 2], dur: [900, 2400], label: 'Getting ready' },
    commute: { lvl: 0.5, src: [3], dur: [1500, 2700], label: 'Commute' },
    work: { lvl: 0.3, src: [2, 4], dur: [1800, 4500], label: 'At work' },
    walk: { lvl: 0.62, src: [3, 4], dur: [900, 2100], label: 'Out walking' },
    exercise: { lvl: 0.92, src: [0, 3], dur: [1800, 3300], label: 'Exercise' },
    home: { lvl: 0.24, src: [1, 2, 0], dur: [1200, 3600], label: 'At home' },
    moment: { lvl: 0.4, src: [0, 1, 2, 3, 4], dur: [240, 720], label: 'A moment' },
    clinic: { lvl: 0.3, src: [2, 4], dur: [900, 1200], label: "At the doctor's" },
  };
  function kindAt(t) {
    for (const [a, b] of S.NIGHTS) if (t >= a && t < b) return 'sleep';
    const hr = S.hrAt(t), h = (t % 86400) / 3600;
    if (hr > 118) return 'exercise';
    if (hr > 92) return 'walk';
    if (h < 9) return 'morning';
    if ((h > 8.4 && h < 9.4) || (h > 17.5 && h < 18.5)) return 'commute';
    if (h < 17.5) return 'work';
    return 'home';
  }
  const STORY = [[7.33, 2400, 'Morning run', 0, 'exercise'], [16.33, 600, 'Taking the stairs', 3, 'walk'], [27.24, 7200, 'Asleep', 0, 'sleep'],
    [42.9, 3000, 'At the gym', 3, 'exercise'], [56.75, 2100, 'Commute', 3, 'commute'], [66.08, 600, 'Taking the stairs', 4, 'walk'], [68.33, 2400, 'Evening walk', 4, 'walk']];

  let POOL = [], CARDS = [], RECTS = [];   // RECTS: where each card was last drawn (review/comps only)
  function buildPool() {
    const r = S.mulberry32(P.seed | 0);
    const pool = [];
    const mk = (t, dur, kind, imp, prio, extra = {}) => {
      const K = KIND[kind];
      pool.push({ t, dur, kind, imp, prio, label: K.label, src: K.src[(r() * K.src.length) | 0], cx: r(), cy: lerp(0.15, 0.6, r()), z: lerp(0.5, 0.85, r()),
        lvl: clamp(K.lvl + (r() - 0.5) * 0.22, 0.02, 0.98), depth: r(), delay: r(), aspR: r(), jit: r(), ...extra });
    };
    const nearVisit = (t, dur) => Math.abs(t + dur / 2 - SN.c) < 1500 + dur / 2;
    for (let t = 900; t < TOT - 1200;) {
      const kind = kindAt(t);
      if (kind === 'sleep') { const d = lerp(5400, 8400, r()); mk(t, d, 'sleep', 'M', 20); t += 6000 + r() * 3000; continue; }
      const K = KIND[kind], d = lerp(K.dur[0], K.dur[1], r());
      if (!nearVisit(t, d)) mk(t, d, kind, r() < 0.3 ? 'M' : 'S', 10 + r() * 10);
      t += 1500 + r() * 2700;
    }
    // short moments are named by what the day is doing then, so the recorded side can annotate them in the same words
    for (let i = 0; i < 180; i++) { const t = r() * TOT, d = lerp(240, 720, r()); if (kindAt(t) !== 'sleep' && !nearVisit(t, d)) mk(t, d, 'moment', 'S', r() * 5, { label: KIND[kindAt(t)].label }); }
    for (const [h, dur, label, src, kind] of STORY) mk(h * 3600, dur, kind, 'L', 100, { label, src });
    mk(SN.t0 - 1260, 1140, 'clinic', 'M', 200, { side: -1, src: 2, cx: 0.3, cy: 0.4 });
    mk(SN.t1 + 120, 960, 'clinic', 'M', 200, { side: 1, src: 4, cx: 0.6, cy: 0.4 });
    POOL = pool;
    select();
  }
  function select() {
    const r = S.mulberry32((P.seed | 0) + 7);
    const must = POOL.filter((m) => m.prio >= 200 || (m.prio >= 100 && P.storyMoments));
    let rest = POOL.filter((m) => m.prio < 100 && (P.includeSleep || m.kind !== 'sleep'));
    const n = Math.max(0, Math.round(P.count) - must.length);
    let chosen = [];
    if (P.distribution === 'random') {
      rest = rest.map((m) => [r(), m]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
      chosen = rest.slice(0, n);
    } else if (P.distribution === 'importance') {
      chosen = rest.slice().sort((a, b) => b.prio - a.prio).slice(0, n);
    } else { // even: the moment nearest to each evenly spaced instant
      const used = new Set();
      for (let i = 0; i < n; i++) {
        const target = ((i + 0.5) / n) * TOT;
        let best = null, bd = Infinity;
        for (const m of rest) { if (used.has(m)) continue; const d = Math.abs(m.t - target); if (d < bd) { bd = d; best = m; } }
        if (best) { used.add(best); chosen.push(best); }
      }
    }
    CARDS = must.concat(chosen).sort((a, b) => a.t - b.t);
    for (const c of CARDS) {
      if (c.src0 == null) c.src0 = c.src;
      let b = -1, bd = 1200;
      OWN.forEach(([h], i) => { const d = Math.abs(c.t - h * 3600); if (d < bd) { bd = d; b = i; } });
      c.src = b >= 0 ? OWN_AT + b : c.src0;
      c.key = b >= 0 ? OWN[b][1] : null;
    }
  }


  // one-word captions, outside the photo (the narrative's photos; the lab can use them too)
  const CAPS = {}, LANE = {};
  OWN.forEach(([, k, cap, lane]) => { CAPS[k] = cap; LANE[k] = lane; });
  const mixc = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * clamp(t)));
  function paint(photo, c, x0, y0, ww, hh, alpha) {
    const iw = photo.c.width, ih = photo.c.height, asp = ww / hh;
    let cw = Math.min(iw, ih * asp) * c.z, ch = cw / asp;
    if (ch > ih) { ch = ih; cw = ch * asp; }
    ctx.save();
    if (P.radius > 0 && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x0, y0, ww, hh, Math.min(P.radius, ww / 2)); ctx.clip(); }
    if (VIEW.matte) {   // a dark mat behind the photo, so it composites identically on any background
      const ga = ctx.globalAlpha; ctx.globalAlpha = alpha; ctx.fillStyle = VIEW.matte; ctx.fillRect(x0, y0, ww, hh); ctx.globalAlpha = ga;
    }
    ctx.drawImage(photo.c, (iw - cw) * c.cx, (ih - ch) * c.cy, cw, ch, x0, y0, ww, hh);
    ctx.restore();
    if (P.borderWidth > 0 && P.border > 0) {
      ctx.strokeStyle = rgba([243, 236, 227], P.border); ctx.lineWidth = P.borderWidth;
      if (P.dashed) ctx.setLineDash([3, 3]);
      ctx.beginPath();
      if (P.radius > 0 && ctx.roundRect) ctx.roundRect(x0 + 0.5, y0 + 0.5, ww - 1, hh - 1, Math.min(P.radius, ww / 2)); else ctx.rect(x0 + 0.5, y0 + 0.5, ww - 1, hh - 1);
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function frameFlag(x0, y0, ww, hh, a) {   // a recorded episode: the photo framed in the flag colour
    ctx.globalAlpha = a; ctx.strokeStyle = rgba(VIEW.flag || [232, 106, 8], 1); ctx.lineWidth = 1.5;
    ctx.strokeRect(x0 + 0.75, y0 + 0.75, ww - 1.5, hh - 1.5); ctx.globalAlpha = 1;
  }
  let CAPQ = null, CURK = null;   // while drawing cards, captions queue here (with their card) so neighbours can be nudged apart
  function capOut(name, tag, cx, y0, hh, below, color, a) {   // the name nearest the photo, a tag beyond it
    if (a <= 0.003) return;
    if (CAPQ) { const fs = W < 760 ? 11 : 12; ctx.font = SANS(fs, 500); CAPQ.push({ k: CURK, name, tag, cx, y0, hh, below, color, a, w: ctx.measureText(name).width, x: cx }); return; }
    ctx.globalAlpha = a;
    const fs = W < 760 ? 11 : 12, y1 = below ? y0 + hh + fs + 3 : y0 - 8;
    txt(ctx, name, cx, y1, SANS(fs, 500), color, 'center', '0px');
    if (tag) txt(ctx, tag, cx, below ? y1 + 14 : y1 - 15, MONO(9.5, 600), color, 'center');
    ctx.globalAlpha = 1;
  }
  // the narrative's dive: one episode photo held on screen while the camera zooms in (o: { xt, capA, name })
  function drawOne(c, v, key, cx, yTop, w, h, o) {
    ctx = c; W = v.W; H = v.H; L = v.L; DPR = v.DPR || 1; VIEW = v;
    const card = CARDS.find((q) => q.key === key); if (!card) return;
    const photo = PHOTOS[card.src].c ? PHOTOS[card.src] : PHOTOS[card.src0]; if (!photo.c) return;
    const x0 = cx - w / 2, a = o.alpha == null ? 1 : o.alpha, below = yTop > L.base;
    ctx.globalAlpha = a * 0.8; ctx.strokeStyle = rgba(VIEW.flag, 1); ctx.lineWidth = 1; ctx.beginPath();
    if (below) { ctx.moveTo(px(cx), yTop); ctx.lineTo(px(o.xt), o.leadTo != null ? o.leadTo : L.base + 4); }
    else { ctx.moveTo(px(cx), yTop + h); ctx.lineTo(px(o.xt), L.top); ctx.moveTo(px(o.xt), L.top); ctx.lineTo(px(o.xt), L.top + 6); }
    ctx.stroke();
    ctx.globalAlpha = a * P.opacity;
    paint(photo, card, x0, yTop, w, h, a);
    frameFlag(x0, yTop, w, h, a);
    capOut(o.name, 'FLAGGED', cx, yTop, h, below, rgba(VIEW.flagText || VIEW.flag, 1), a * (o.capA == null ? 1 : o.capA));
  }

  const ASPECT = { '4:5': 0.8, '2:3': 0.667, '1:1': 1, '5:4': 1.25, '3:2': 1.5, '16:9': 1.78 };
  function drawCards(sx, ink) {
    const ap = lsm(P.appearFrom, Math.max(P.appearFrom * 1.01, P.appearFull), cam.s) * (VIEW.alpha == null ? 1 : VIEW.alpha);
    if (ap <= 0.003 || !CARDS.length) return;
    if (P.sizeBy === 'time block (graph height)') return drawBlocks(ap, ink);
    const scaleK = sstep(lsm(Math.max(P.appearFrom, 60), P.spanEnd * 3600, cam.s));
    let scale = lerp(P.scaleStart, P.scaleEnd, scaleK);
    // keep the outermost lanes inside the safe area (clear of the HUD above and the copy below)
    {
      const n = Math.max(1, Math.round(P.lanes)), lp = P.lanePitch, gap = P.laneGap;
      const above = P.position === 'above graph' ? n : P.position === 'above & below' ? Math.ceil(n / 2) : 0;
      const below = P.position === 'below graph' ? n : P.position === 'above & below' ? Math.floor(n / 2) : 0;
      const big = (P.sizeBy === 'importance' ? Math.max(1, P.ratioL) : 1) * P.baseSize / (ASPECT[P.aspect] || 0.8);
      const fit = (room, k) => (room - (k - 1) * gap) / (1 + (k - 1) * lp);
      if (above && VIEW.safeTop != null) scale = Math.min(scale, fit(L.top - 14 - VIEW.safeTop, above) / big);
      if (below && VIEW.safeBottom != null) scale = Math.min(scale, fit(VIEW.safeBottom - (L.base + 44), below) / big);
      scale = Math.max(0.15, scale);
    }
    const settle = sm(0.55, 1, kn);
    const baseAspect = ASPECT[P.aspect];
    const Mh = (P.baseSize * scale) / (baseAspect || 0.8);
    const pitch = Mh * P.lanePitch + P.laneGap;
    const lanesN = Math.max(1, Math.round(P.lanes));
    const laneRight = new Array(lanesN).fill(-Infinity);
    const placed = [];
    // 1. size + horizontal position for every card
    CARDS.forEach((c, i) => {
      let w;
      if (P.sizeBy === 'duration') w = L.pw * Math.pow(c.dur / cam.s, P.durExp) * 0.85;
      else w = P.baseSize * scale * (P.sizeBy === 'uniform' ? 1 : c.imp === 'S' ? P.ratioS : c.imp === 'L' ? P.ratioL : 1);
      w = clamp(w, 3, P.maxSize);
      const asp = baseAspect || [0.8, 1, 1.25, 1.5][Math.floor(c.aspR * 4)];
      const h = w / asp;
      const at = P.anchor === 'start' ? c.t : c.t + c.dur / 2;
      const xt = X(at);
      let x = xt + (xt - sx) * (c.depth - 0.5) * 2 * P.parallax * (1 - settle);
      if (c.side && P.frameSliver) x = c.side < 0 ? Math.min(x, sx - P.sliverGap - w / 2) : Math.max(x, sx + P.sliverGap + w / 2);
      else if (P.dodgeSliver && Math.abs(x - sx) < w / 2 + P.sliverGap) x = x < sx ? sx - P.sliverGap - w / 2 : sx + P.sliverGap + w / 2;
      placed.push({ c, i, w, h, x, xt });
    });
    // 2. lanes
    for (const p of placed) {
      let lane = 0;
      if (lanesN > 1) {
        if (P.laneRule === 'alternate') lane = p.i % lanesN;
        else if (P.laneRule === 'by moment') lane = (LANE[p.c.key] != null ? LANE[p.c.key] : p.i) % lanesN;
        else if (P.laneRule === 'by size') lane = Math.min(lanesN - 1, p.c.imp === 'L' ? 0 : p.c.imp === 'M' ? 1 : 2);
        else if (P.laneRule === 'random') lane = Math.floor(p.c.delay * lanesN);
        else { // pack: the first lane with room, else the emptiest
          lane = laneRight.findIndex((r) => p.x - p.w / 2 >= r + P.gutter);
          if (lane < 0) lane = laneRight.indexOf(Math.min(...laneRight));
        }
      }
      p.hidden = P.collisions === 'hide if overlapping' && p.x - p.w / 2 < laneRight[lane] + P.gutter && !p.c.side;
      if (!p.hidden) laneRight[lane] = Math.max(laneRight[lane], p.x + p.w / 2);
      p.lane = lane;
    }
    // 3. vertical position
    for (const p of placed) {
      const { c, h, lane } = p;
      let yTop;
      switch (P.position) {
        case 'above graph': yTop = L.top - 14 - h - lane * pitch; break;
        case 'below graph': yTop = L.base + 44 + lane * pitch; break;   // just under the time ruler
        case 'on the axis': yTop = L.base - h / 2 - lane * pitch * (lane % 2 ? -1 : 1) * 0.5; break;
        case 'above & below': yTop = lane % 2 ? L.base + 44 + Math.floor(lane / 2) * pitch : L.top - 14 - h - Math.floor(lane / 2) * pitch; break;
        case 'on graph · scatter': yTop = clamp(L.base - (0.08 + 0.84 * c.lvl) * L.fieldH - h / 2, L.top, L.base - h - 4); break;
        default: yTop = L.base - P.railOffset - h - lane * pitch; // on graph · rail
      }
      p.y = yTop + (c.jit - 0.5) * P.jitter;
    }
    // 4. draw order
    RECTS = [];
    let order = placed.filter((p) => !p.hidden);
    if (P.order === 'size: big under') order.sort((a, b) => b.w - a.w);
    else if (P.order === 'size: big over') order.sort((a, b) => a.w - b.w);
    else if (P.order === 'random') order.sort((a, b) => a.c.delay - b.c.delay);
    // 5. draw
    // In the narrative the recording sweep restyles each card as it passes (VIEW.wipe): an episode's photo stays as it
    // is and takes the episode's name; every other moment shrinks toward the graph and fades right back.
    const rec = VIEW.wipe != null, EPS = VIEW.episodes || {};
    CAPQ = [];
    for (const p of order) {
      const { c, w, h } = p;
      if (VIEW.skipKey && c.key === VIEW.skipKey) continue;   // drawn on its own by the narrative (the dive's anchor)
      const photo = PHOTOS[c.src].c ? PHOTOS[c.src] : PHOTOS[c.src0];   // own photo, or the shared one until it loads
      let x = p.x, y = p.y;
      if (x + w / 2 < -20 || x - w / 2 > W + 20) continue;
      // entry
      let a = ap;
      if (P.trigger === 'ripple from sliver') { const d = Math.abs(c.t - SN.c) / (TOT / 2); a *= sm(d * P.stagger, d * P.stagger + 0.25, kn); }
      else if (P.trigger === 'random stagger') a *= sm(c.delay * P.stagger, c.delay * P.stagger + 0.25, kn);
      if (a <= 0.003) continue;
      let sc = 1;
      if (P.entry === 'scale') sc = lerp(0.6, 1, out3(a));
      if (P.entry === 'rise') y += (1 - out3(a)) * 26;
      const alpha = P.entry === 'cut' ? (a > 0.5 ? 1 : 0) : a;
      const below = y > L.base, ep = EPS[c.key];
      const k = rec ? sm(x - w / 2 - 12, x + w / 2 + 12, VIEW.wipe) : 0;   // 0 ahead of the sweep, 1 once recorded
      if (!ep) sc *= lerp(1, VIEW.fadedScale || 0.62, k);
      const fade = ep ? 1 : lerp(1, VIEW.fadedAlpha == null ? 0.2 : VIEW.fadedAlpha, k);
      const ww = w * sc, hh = h * sc, x0 = x - ww / 2, y0 = below ? y : y + (h - hh);   // shrink toward the graph
      const inkC = rec ? mixc(VIEW.inkD || ink, VIEW.inkL || ink, k) : ink;
      RECTS.push({ key: c.key, label: c.label, t: c.t, x: +x0.toFixed(1), y: +y0.toFixed(1), w: +ww.toFixed(1), h: +hh.toFixed(1), xt: +p.xt.toFixed(1), below, ep: !!c.side });
      if (!photo.c) continue;
      // connector to its moment
      if (P.connector !== 'none' && VIEW.lineAlpha !== 0) {
        const la = VIEW.lineAlpha == null ? 1 : rec ? lerp(VIEW.lineAlpha, VIEW.lineAlphaRec == null ? VIEW.lineAlpha : VIEW.lineAlphaRec, k) : VIEW.lineAlpha;
        const yEdge = below ? y0 : y0 + hh;
        ctx.globalAlpha = alpha * fade * 0.55 * la; ctx.strokeStyle = rgba(inkC, 0.55); ctx.fillStyle = rgba(inkC, 0.7); ctx.lineWidth = 1;
        if (ep && k > 0.003) { ctx.globalAlpha = alpha * lerp(0.55 * la, 0.8, k); ctx.strokeStyle = rgba(mixc(inkC, VIEW.flag || inkC, k), lerp(0.55, 1, k)); }
        if (P.connector === 'box edge') {
          // stops at the graph box, so nothing crosses the data or the labels in it: a short leader, a tick into the box
          ctx.beginPath(); ctx.moveTo(px(x), yEdge); ctx.lineTo(px(p.xt), below ? L.base + 4 : L.top);
          if (!below) { ctx.moveTo(px(p.xt), L.top); ctx.lineTo(px(p.xt), L.top + 6); }
          ctx.stroke();
        } else {
          if (P.connector === 'leader' || P.connector === 'leader + dot') ctx.setLineDash([1, 3]);
          if (P.connector !== 'dot on axis') { ctx.beginPath(); ctx.moveTo(px(x), yEdge); ctx.lineTo(px(p.xt), L.base + (yEdge > L.base ? 3 : -3)); ctx.stroke(); }
          ctx.setLineDash([]);
          if (P.connector === 'dot on axis' || P.connector === 'leader + dot') { ctx.beginPath(); ctx.arc(p.xt, L.base, 2, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      ctx.globalAlpha = alpha * P.opacity * fade;
      // shadow
      if (P.shadow === 'shingle edge' && ww > 10) {
        const g = ctx.createLinearGradient(x0 - 12, 0, x0, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + P.shadowStrength + ')');
        ctx.fillStyle = g; ctx.fillRect(x0 - 12, y0 + 2, 12, hh - 2);
      } else if (P.shadow === 'drop' && ww > 10) {
        ctx.fillStyle = 'rgba(0,0,0,' + (P.shadowStrength * 0.6) + ')'; ctx.fillRect(x0 + 3, y0 + 5, ww, hh);
      }
      paint(photo, c, x0, y0, ww, hh, alpha * fade);
      if (ep && k > 0.003) frameFlag(x0, y0, ww, hh, alpha * k);
      // captions
      if (P.captions === 'outside') {
        const cap = CAPS[c.key] || c.label;
        CURK = c.key;
        if (k < 0.997 || !ep) capOut(cap, null, x, y0, hh, below, rgba(inkC, 0.82), alpha * fade * (ep ? 1 - k : 1 - k * 0.6) * sm(26, 40, ww));
        if (ep && k > 0.003) capOut(ep, 'FLAGGED', x, y0, hh, below, rgba(VIEW.flagText || VIEW.flag, 1), alpha * k);
        ctx.globalAlpha = 1;
        continue;
      }
      const capOn = P.captions === 'all' || (P.captions === 'key' && (c.imp === 'L' || c.side));
      const la = capOn ? sm(P.captionMin, P.captionMin + 26, ww) : 0;
      if (la > 0.01) {
        const gc = ctx.createLinearGradient(0, y0 + hh - 44, 0, y0 + hh);
        gc.addColorStop(0, 'rgba(17,13,10,0)'); gc.addColorStop(1, 'rgba(17,13,10,0.85)');
        ctx.fillStyle = gc; ctx.fillRect(x0, y0 + hh - 44, ww, 44);
        const ck = S.clock(c.t);
        ctx.globalAlpha = alpha * la;
        txt(ctx, 'DAY ' + ck.day + ' · ' + ck.hm, x0 + 8, y0 + hh - 22, MONO(9), 'rgba(243,236,227,0.6)');
        txt(ctx, c.label, x0 + 8, y0 + hh - 8, SANS(12, 500), 'rgba(243,236,227,0.92)', 'left', '0px');
      }
      ctx.globalAlpha = 1;
    }
    // captions on the same line that would touch move apart, each keeping as close to its photo as it can
    const q = CAPQ; CAPQ = null;
    for (const side of [false, true]) {
      const row = q.filter((c) => c.below === side).sort((a, b) => a.cx - b.cx);
      for (let it = 0; it < 30; it++) {
        let moved = false;
        for (let i = 0; i + 1 < row.length; i++) {
          const a = row[i], b = row[i + 1];
          if (a.k === b.k) continue;   // one card's two captions (mid-crossfade) share a place
          if (Math.abs(a.y0 + (a.below ? a.hh : 0) - (b.y0 + (b.below ? b.hh : 0))) > 20) continue;
          const over = a.x + a.w / 2 + 8 - (b.x - b.w / 2);
          if (over > 0.5) { a.x -= over / 2; b.x += over / 2; moved = true; }
        }
        if (!moved) break;
      }
      for (const c of row) { c.x = Math.min(W - 4 - c.w / 2, Math.max(4 + c.w / 2, c.x)); capOut(c.name, c.tag, c.x, c.y0, c.hh, c.below, c.color, c.a); }
    }
    cardsVisible = order.length;
  }
  let cardsVisible = 0;

  // Time blocks: each photo fills the graph container top to baseline and spans exactly its
  // moment's start → end on the true timeline. No scale curve, no lanes: it compresses only as
  // time does, the same physics as the orange container.
  function drawBlocks(ap, ink) {
    const yTop = P.blockTop === 'lower half' ? L.base - L.fieldH / 2 : L.top;
    const yB = L.base;   // the container's bottom edge is the baseline
    const h = yB - yTop;
    const seq = CARDS.slice().sort((a, b) => a.t - b.t);
    let n = 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(X(0), yTop, X(TOT) - X(0), h); ctx.clip();
    for (let i = 0; i < seq.length; i++) {
      const c = seq[i], photo = PHOTOS[c.src].c ? PHOTOS[c.src] : PHOTOS[c.src0];
      if (!photo.c) continue;
      let t1 = c.t + c.dur;
      if (P.contiguous) {                     // run each moment up to the next one
        const nxt = seq[i + 1];
        t1 = nxt ? Math.max(t1, nxt.t) : Math.max(t1, TOT);
        if (c.side === -1) t1 = Math.min(t1, SN.t0 - 60);   // the 10 s window stays open
      }
      const x0 = X(c.t) + P.blockGap / 2, x1 = X(t1) - P.blockGap / 2, w = x1 - x0;
      if (w < 0.5 || x1 < 0 || x0 > W) continue;
      let a = ap;
      if (P.trigger === 'ripple from sliver') { const d = Math.abs(c.t - SN.c) / (TOT / 2); a *= sm(d * P.stagger, d * P.stagger + 0.25, kn); }
      else if (P.trigger === 'random stagger') a *= sm(c.delay * P.stagger, c.delay * P.stagger + 0.25, kn);
      if (a <= 0.003) continue;
      // cover-crop the photo into the block (visible part only, so huge blocks stay cheap)
      const vx0 = Math.max(x0, -2), vx1 = Math.min(x1, W + 2), vw = vx1 - vx0;
      const iw = photo.c.width, ih = photo.c.height, asp = w / h;
      let cw = Math.min(iw, ih * asp) * c.z, ch = cw / asp;
      if (ch > ih) { ch = ih; cw = ch * asp; }
      if (cw > iw) { cw = iw; ch = cw / asp; }
      const sx0 = (iw - cw) * c.cx + ((vx0 - x0) / w) * cw, sw = (vw / w) * cw;
      const aIn = P.entry === 'cut' ? (a > 0.5 ? 1 : 0) : a;
      if (VIEW.matte) { ctx.globalAlpha = aIn; ctx.fillStyle = VIEW.matte; ctx.fillRect(vx0, yTop, vw, h); }
      ctx.globalAlpha = aIn * P.opacity;
      ctx.drawImage(photo.c, sx0, (ih - ch) * c.cy, Math.max(0.5, sw), ch, vx0, yTop, vw, h);
      if (P.border > 0 && P.borderWidth > 0 && w > 3) {
        ctx.strokeStyle = rgba([243, 236, 227], P.border); ctx.lineWidth = P.borderWidth;
        if (P.dashed) ctx.setLineDash([3, 3]);
        ctx.strokeRect(x0 + 0.5, yTop + 0.5, w - 1, h - 1); ctx.setLineDash([]);
      }
      const capOn = P.captions === 'all' || (P.captions === 'key' && (c.imp === 'L' || c.side));
      const la = capOn ? sm(P.captionMin, P.captionMin + 26, w) : 0;
      if (la > 0.01) {
        const gc = ctx.createLinearGradient(0, yB - 48, 0, yB);
        gc.addColorStop(0, 'rgba(17,13,10,0)'); gc.addColorStop(1, 'rgba(17,13,10,0.85)');
        ctx.fillStyle = gc; ctx.fillRect(vx0, yB - 48, vw, 48);
        const ck = S.clock(c.t), lx = Math.max(x0, 0) + 10;
        ctx.globalAlpha = a * la;
        txt(ctx, 'DAY ' + ck.day + ' · ' + ck.hm, lx, yB - 24, MONO(9), 'rgba(243,236,227,0.6)');
        txt(ctx, c.label, lx, yB - 10, SANS(12, 500), 'rgba(243,236,227,0.92)', 'left', '0px');
      }
      n++;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    cardsVisible = n;
  }

    function draw(c, v) {
      ctx = c; W = v.W; H = v.H; L = v.L; X = v.X; DPR = v.DPR || 1; kn = v.kn; cam.s = v.span; VIEW = v;
      cardsVisible = 0;
      ctx.save();
      if (v.clipX != null || v.clipX1 != null) {   // optional horizontal clip [clipX, clipX1)
        const x0 = v.clipX != null ? v.clipX : -10, x1 = v.clipX1 != null ? v.clipX1 : W + 10;
        ctx.beginPath(); ctx.rect(x0, -10, Math.max(0, x1 - x0), H + 20); ctx.clip();
      }
      drawCards(X(SN.c), v.ink);
      ctx.restore();
    }
    buildPool();
    return {
      setParams(p) { P = p; },
      build: buildPool, select, retone, draw, drawOne,
      get visible() { return cardsVisible; },
      get total() { return CARDS.length; },
      get cards() { return CARDS; },
      get rects() { return RECTS; },
    };
  };
})();

  return window.AKLife;
})();

const CFG = (() => {
  const window = {};
/* The locked daily-life photo comp for beat 02, exported from the zoom-out lab (lab-zoom.html → "Copy settings").
   To change it: tune in the lab, copy the JSON, and paste it over this object.
   Geometry keys from the lab (graph centre/height) are not used here; the narrative has its own layout. */
window.AK_LIFE_CFG = {
  "count": 14,
  "distribution": "even",
  "storyMoments": true,
  "includeSleep": true,
  "seed": 2718,
  "position": "above & below",
  "lanes": 4,
  "laneRule": "by moment",
  "lanePitch": 0.69,
  "laneGap": 8,
  "railOffset": 16,
  "jitter": 0,
  "anchor": "start",
  "connector": "box edge",
  "sizeBy": "uniform",
  "baseSize": 72,
  "ratioS": 0.8,
  "ratioL": 1.36,
  "scaleStart": 1.8,
  "scaleEnd": 0.8,
  "durExp": 0.65,
  "aspect": "4:5",
  "maxSize": 260,
  "contiguous": true,
  "blockGap": 2.5,
  "blockTop": "full box (= container)",
  "collisions": "shingle",
  "gutter": 4,
  "order": "time",
  "sliverGap": 12,
  "frameSliver": true,
  "dodgeSliver": true,
  "opacity": 0.88,
  "warmth": 0.6,
  "saturation": 0.5,
  "brightness": 0.92,
  "border": 0.16,
  "borderWidth": 1,
  "dashed": false,
  "radius": 1,
  "shadow": "none",
  "shadowStrength": 0.55,
  "captions": "outside",
  "captionMin": 104,
  "entry": "fade",
  "trigger": "on screen",
  "stagger": 0.5,
  "appearFrom": 150,
  "appearFull": 900,
  "parallax": 0,
  "spanEnd": 72
};

/* The uncertainty cloud on the graph (beats that happened but were never recorded).
   Tune live at v2-images.html?tune → "Copy cloud settings" → paste over this object. */
window.AK_CLOUD_CFG = {
  "on": true,
  "intensity": 1.77,
  "density": 0.29,
  "appearFrom": 11,
  "appearFull": 12,
  "spread": 0.82,
  "bandLow": 48,
  "bandHigh": 152,
  "edge": 1,
  "size": 2.9,
  "shape": "soft dot",
  "ring": 0.5,
  "color": "#8c8c8c",
  "shimmer": 25.5,
  "shimmerSpeed": 1.8,
  "jitterX": 6,
  "recording": "magnetic",
  "magRadius": 160,
  "magPull": 0.9,
  "magGlow": 0.6,
  "settleHours": 1.5
};

/* Beat 03's recorded graph and the photos on paper. Tune at v2-images.html?tune → "Copy settings" → paste the "graph" part here. */
window.AK_GRAPH_CFG = {
  "keepSliver": true,
  "lollipops": true,
  "lollipopHours": 1,
  "stemOpacity": 0.5,
  "headSize": 2.6,
  "headOpacity": 0.95,
  "axisLabels": true,
  "dotSize": 1.5,
  "dotStrength": 1,
  "photoLinesDark": 1,
  "photoLinesPaper": 0.18,
  "v1Graph": true,
  "photosDuringSweep": "episodes stay",
  "flagMotion": "v1 spring",
  "flagRiseHours": 6.2
};

  return { life: window.AK_LIFE_CFG, cloud: window.AK_CLOUD_CFG, graph: window.AK_GRAPH_CFG };
})();

let AKNarrative = null;
const __setEngine = (f) => { AKNarrative = f; };

/* AccurKardia · Core Narrative v2 — four beats in three scrolls
   ---------------------------------------------------------------------------
   01 Snapshot   a 10-second ECG draws; each beat leaves a dot
   02 Real life  the 10 s expands to 72 h; dots become heart rate; life is unrecorded
   03 Recording  a sweep turns dark into paper and fills every beat in
   04 Flagged    every beat lands on one heartbeat; the ones that broke the pattern stay red

   One dot = one heartbeat, the whole way through (WebGL, ~296k points).
   Scroll is measured in units: 1 unit = one viewport height of scroll. */
(() => {
  'use strict';
  // The engine is a factory, so the same code runs on these prototype pages (mounted on the document, below) and inside
  // the packaged <accurbeat-narrative> web component (mounted in a shadow root; see tools/build-package.py).
  //   opts: { signal, AKLife, root, query, life, theme, lifeCfg, cloudCfg, graphCfg, assetBase, debug }
  function AKNarrative(opts) {
  const S = opts.signal;
  if (!S) return null;
  const root = opts.root || document;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOT = S.TOTAL, SN = S.SNAP, EV = S.EV;
  // How regular life is shown in 02: 'cloud' (unrecorded beats as haze) or 'mosaic' (an image plot of the moments)
  const Q = new URLSearchParams(opts.query || '');
  // page-level listeners, tracked so destroy() removes every one (a host can remount with other options)
  const LISTEN = [];
  const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); LISTEN.push([t, type, fn, o]); };
  const MOSAIC = (Q.get('life') || opts.life || 'cloud') === 'mosaic';
  // Review: ?plate renders only the data (dots, cloud, nights, paper grid) at 2x, with no photos, labels, slivers or axis,
  // so the Figma comps can lay editable photos and labels over the real texture. AK.geom() reports where everything sits.
  const PLATE = Q.has('plate');
  // Exploring: any layer can be switched off, from the tuner's Layers folder or the URL, e.g. ?hide=photos,cloud,labels
  const LAYERS = { nav: true, photos: false, cloud: true, labels: true, episodes: true, axis: true, grid: true, sweep: true, card: true, copy: true, hud: true };
  if (Q.has('hide')) for (const k of Q.get('hide').split(',')) if (k.trim() in LAYERS) LAYERS[k.trim()] = false;
  if (opts.nav === false) LAYERS.nav = false;
  if (Q.has('show')) for (const k of Q.get('show').split(',')) if (k.trim() in LAYERS) LAYERS[k.trim()] = true;   // photos are off by default
  // The uncertainty cloud: beats that happened but were never recorded. Tunable live with ?tune.
  const CLOUD_DEFAULTS = {
    on: true, intensity: 1, density: 1, appearFrom: 11, appearFull: 12,
    spread: 1, bandLow: 52, bandHigh: 136, edge: 1,
    size: 3.2, shape: 'hollow ring', ring: 0.6, color: '#f3ece3',
    shimmer: 12, shimmerSpeed: 1, jitterX: 1.5,
    recording: 'magnetic', magRadius: 160, magPull: 0.9, magGlow: 0.6, settleHours: 1.5,
  };
  // Beat 03's recorded graph and the photos on paper. Tunable live with ?tune.
  const GRAPH_DEFAULTS = {
    keepSliver: true,                                     // the doctor's 10 s stays visible through the sweep
    lollipops: true, lollipopHours: 1, stemOpacity: 0.5, headSize: 2.6, headOpacity: 0.95, axisLabels: true,
    dotSize: 1.5, dotStrength: 1,                         // every recorded beat
    photoLinesDark: 1, photoLinesPaper: 0.18,             // photo connector lines, before / after the sweep
    v1Graph: true,                                        // the recorded graph is v1's, lifted from js/narrative.js
    photosDuringSweep: 'episodes stay',                   // 'episodes stay' (the rest shrink and fade) · 'go away' · 'stay'
    flagMotion: 'v1 spring',                              // flagged beats: 'v1 spring' (born on the baseline, fly up red) · 'magnet settle'
    flagRiseHours: 6.2,
    before: 'cloud',                                      // unrecorded beats, ahead of the sweep: 'cloud' (unknown values) · 'faded trace' (every beat, dimmed, as in the first exploration) · 'nothing'
    traceStrength: 0.4,                                   // the faded trace's opacity, relative to the recorded dots
    ending: 'zoom',                                       // beat 04: 'zoom' (dive into Day 2, beat-shape card; confirmed by Peter) · 'form' (every beat on one heartbeat)                                   // v1 rose over 2.8 h of data in a 1.3-unit sweep; v2's sweep is 0.58 units, so 6.2 h keeps v1's on-screen duration
  };
  const TUNE = Q.has('tune');
  const GRAPH = Object.assign({}, GRAPH_DEFAULTS, opts.graphCfg || {});
  if (TUNE) { try { Object.assign(GRAPH, JSON.parse(localStorage.getItem('ak-graph-v1') || '{}')); } catch (e) { /* storage blocked */ } }
  // review links: ?graph=v1|v2  ?photos=away|stay  ?flags=v1|magnet  ?ending=zoom|form
  if (Q.has('graph')) GRAPH.v1Graph = Q.get('graph') !== 'v2';
  if (Q.has('ending')) GRAPH.ending = Q.get('ending') === 'form' ? 'form' : 'zoom';
  if (Q.has('flags')) GRAPH.flagMotion = Q.get('flags') === 'magnet' ? 'magnet settle' : 'v1 spring';
  if (Q.has('before')) GRAPH.before = { trace: 'faded trace', none: 'nothing', cloud: 'cloud' }[Q.get('before')] || GRAPH.before;
  if (Q.has('photos')) GRAPH.photosDuringSweep = { away: 'go away', stay: 'stay' }[Q.get('photos')] || 'episodes stay';
  const CLOUD = Object.assign({}, CLOUD_DEFAULTS, opts.cloudCfg || {});
  if (opts.cloudCfg && !opts.cloudCfg.recording && 'settle' in opts.cloudCfg) CLOUD.recording = opts.cloudCfg.settle ? 'settle from cloud' : 'rise from baseline';
  if (TUNE) { try { Object.assign(CLOUD, JSON.parse(localStorage.getItem('ak-cloud-v1') || '{}')); } catch (e) { /* storage blocked */ } }
  const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255);

  /* ---------- math ---------- */
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (u, r) => clamp((u - r[0]) / (r[1] - r[0]));
  const sstep = (t) => t * t * (3 - 2 * t);
  const sm = (a, b, x) => sstep(clamp((x - a) / (b - a)));
  const inout = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out3 = (t) => 1 - Math.pow(1 - t, 3);
  const logLerp = (a, b, t) => Math.exp(lerp(Math.log(a), Math.log(b), t));
  const lsm = (a, b, s) => sm(Math.log(a), Math.log(b), Math.log(s)); // smoothstep on a log scale
  const fmtInt = (v) => Math.round(v).toLocaleString('en-US');
  const backOut = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  // one heartbeat's window around the R peak (beat 04's superimposed form, from v1)
  const PH_A = -0.3, PH_B = 0.62, PH_W = PH_B - PH_A, PH_C = (PH_A + PH_B) / 2;

  /* ---------- choreography (units) ---------- */
  const K = {
    draw: [-0.5, 0.22],     // the write head crosses 10 s while the stage scrolls in
    c1: [0.02, 0.72],
    zoom: [0.64, 1.2],      // 11.6 s → 72 h
    life: [0.9, 1.1],
    ghosts: [1.04, 1.24],
    c2: [0.92, 1.5],
    sweep: [1.48, 2.06],
    c3: [1.6, 2.26],
    flags: [2.2, 2.42],
    out: [2.1, 2.22],       // the three days' annotations, photos and sliver step back
    zoomIn: [2.24, 2.66],   // ending 'zoom': 72 h → 8.5 s, onto the Day 2 episode
    lock: [2.6, 2.76],      // ending 'zoom': reticle, label and the beat-shape card land
    labels: [1.08, 1.22],   // beat 02's line of names (Regular life · Wearable alert · Doctor's visit)
    morph: [2.14, 2.56],    // ending 'form': every dot leaves its moment and swirls into one heartbeat
    notes: [2.52, 2.76],    // ending 'form': the form's few annotations land
    c4: [2.5, 99],
    white: [2.78, 3.0],
  };
  let UNITS = 3;
  const BEATS = [['01', 'Snapshot', -9], ['02', 'Real life', 0.7], ['03', 'Recording', 1.48], ['04', 'Flagged', 2.2]];

  /* ---------- pacing ----------
     'current': the 3-scroll timeline above. 'paced': about 5 scrolls. Every beat is motion, then a pause that holds a
     composed frame; the line of copy is fully in as each pause begins; the zooms move at an even speed through each
     ×10 of scale, easing in and out and, optionally, at 1 minute, 1 hour and 1 day (scale stops). All in scroll units. */
  const K_CURRENT = JSON.parse(JSON.stringify(K)), BEATS_CURRENT = BEATS.map((b) => b[2]);
  const PACE_DEFAULTS = {
    mode: 'current', draw: 0.3, pause1: 0.4, zoom: 1.05, pause2: 0.5, sweep: 1.0, pause3: 0.4, dive: 0.8, pause4: 0.35, scaleStops: 0.5, settle: false,
    // stepped (auto-land): one gesture plays the next transition over these seconds, with these curves
    stepEntry: 1.6, stepZoom: 2.3, stepSweep: 2.5, stepDive: 3,
    easeEntry: 'ease out', easeZoom: 'cubic in-out', easeSweep: 'sine in-out', easeDive: 'cubic in-out',
    stepHold: 0.5, stepSensitivity: 24,
    // …or, with detail 'sub-scenes', each transition is a run of sub-scenes, each with its own seconds and curve,
    // and the joins between them smoothed over stepJoin seconds (so a change of speed never jolts)
    stepDetail: 'sub-scenes', stepJoin: 0.2,
    // snap: the page scrolls natively and comes to rest on the frames; the visual follows on the sub-scenes' timing
    snapRate: 1, snapLand: true, snapDelay: 160, snapHold: 0.3, snapGap: 0.8, snapCommit: 0.2,
    // paced: each beat's hold and each transition's length, in scrolls (viewport heights); landing commits past `commit`
    pHold1: 0.5, pHold2: 0.6, pHold3: 0.55, pHold4: 0.55, pZoom: 1.0, pSweep: 0.75, pDive: 0.9, commit: 0.3,
    // paced follows the scroll but never faster than this × the authored pace (so a hard flick can't rush a zoom);
    // it doesn't land on beats unless `settle` is on
    pMaxRate: 1.5,
  };
  // the sub-scenes: [transition, key, name, seconds, curve]. Their spans are worked out in stepped's scenes().
  const SUBSCENES = [
    [0, 'e1', 'ECG draws', 1.6, 'soft out'], [0, 'e2', 'first line settles', 0.5, 'ease out'],
    [1, 'z1', 'line leaves', 0.25, 'soft in'], [1, 'z2', '10 s → 1 min', 0.55, 'ease in'], [1, 'z3', '1 min → 1 h', 0.45, 'linear'],
    [1, 'z4', '1 h → 1 day (photos in)', 0.4, 'linear'], [1, 'z5', '1 day → 3 days', 0.5, 'ease out'], [1, 'z6', 'labels + next line', 0.4, 'soft out'],
    [2, 's1', 'line leaves', 0.2, 'soft in'], [2, 's2', 'day 1', 0.55, 'soft in'], [2, 's3', 'day 2', 0.4, 'linear'],
    [2, 's4', 'day 3', 0.55, 'soft out'], [2, 's5', 'flags + next line', 0.45, 'soft out'],
    [3, 'd1', 'view clears', 0.3, 'soft in'], [3, 'd2', '3 days → 1 day', 0.45, 'ease in'], [3, 'd3', '1 day → 1 h', 0.4, 'linear'],
    [3, 'd4', '1 h → 1 min', 0.5, 'linear'], [3, 'd5', '1 min → 10 s', 0.6, 'ease out'], [3, 'd6', 'lock + card', 0.35, 'soft out'],
  ];
  SUBSCENES.forEach(([, k, , d, e]) => { PACE_DEFAULTS['d_' + k] = d; PACE_DEFAULTS['e_' + k] = e; });
  const PACE = Object.assign({}, PACE_DEFAULTS);
  const PACED_K = { draw: 0.3, pause1: 0.4, zoom: 1.05, pause2: 0.5, sweep: 1.0, pause3: 0.4, dive: 0.8, pause4: 0.35 };   // the story's moments (the K table) in every paced mode
  if (Q.has('tune')) { try { Object.assign(PACE, JSON.parse(localStorage.getItem('ak-pace-v3') || '{}')); } catch (e) { /* storage blocked */ } }
  const PACES = { current: 'current', paced: 'paced', stepped: 'stepped', snap: 'snap' };
  if (opts.pace && PACES[opts.pace]) PACE.mode = PACES[opts.pace];
  if (Q.has('pace')) PACE.mode = PACES[Q.get('pace')] || 'paced';
  const STEPPED = () => PACE.mode === 'stepped', SNAP = () => PACE.mode === 'snap';
  function pacedTimeline(P) {
    const d1 = P.draw, z0 = d1 + P.pause1, z1 = z0 + P.zoom, s0 = z1 + P.pause2, s1 = s0 + P.sweep, o0 = s1 + P.pause3;
    const zi0 = o0 + 0.14, zi1 = zi0 + P.dive, lk1 = zi1 + 0.12, end = lk1 + P.pause4;
    return {
      units: end, beats: [-9, z0 + 0.06, s0, o0 + 0.1],
      k: {
        draw: [-0.5, d1], c1: [0.02, z0 + 0.08],
        zoom: [z0, z1], life: [z0 + 0.46 * P.zoom, z0 + 0.82 * P.zoom], ghosts: [z1 - 0.1, z1 + 0.1], labels: [z1 - 0.1, z1 + 0.08],
        c2: [z1 - 0.2, s0 + 0.02],
        sweep: [s0, s1], c3: [s0 + 0.12, o0 + 0.04], flags: [s1 + 0.06, s1 + 0.28],
        out: [o0, o0 + 0.12], zoomIn: [zi0, zi1], lock: [zi1 - 0.06, lk1], morph: [o0 + 0.04, o0 + 0.46], notes: [o0 + 0.42, o0 + 0.66],
        c4: [zi1 - 0.1, 99], white: [end - 0.22, end],
      },
    };
  }
  // even-paced zooms: scroll progress → zoom progress (in log span), slower near the ends and at the scale stops
  let ZWARP = null, DWARP = null;
  const SUBS = () => (PACE.mode === 'stepped' && PACE.stepDetail === 'sub-scenes') || PACE.mode === 'snap' || PACE.mode === 'paced';
  function buildWarp(stops) {
    const n = 512, C = new Float64Array(n + 1), a = PACE.scaleStops * 2.4, w = 0.03;
    if (SUBS()) { for (let i = 0; i <= n; i++) C[i] = i / n; return C; }   // even log zoom; the sub-scenes pace it
    let acc = 0;
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      let d = 1 + 0.7 * (Math.exp(-((x / 0.07) ** 2)) + Math.exp(-(((1 - x) / 0.07) ** 2)));
      for (const st of stops) d += a * Math.exp(-(((x - st) / w) ** 2));
      if (i) acc += d / n;
      C[i] = acc;
    }
    for (let i = 0; i <= n; i++) C[i] /= acc;
    return C;
  }
  function unwarp(C, t) {   // the zoom progress whose scroll progress is t
    let lo = 0, hi = C.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] < t) lo = m; else hi = m; }
    return (lo + (t - C[lo]) / Math.max(1e-9, C[hi] - C[lo])) / (C.length - 1);
  }

  /* ---------- palette ---------- */
  // Theme: 'light' (the sweep turns dark into paper) or 'dark' (?theme=dark: the recorded side stays dark, lifted a
  // touch, with light ink). INK_L / PAPER / BRAND / RED are "the recorded side's" colours, whichever the theme.
  const ALLDARK = (Q.get('theme') || opts.theme || 'light') === 'dark';
  const DARK_BG = [17, 13, 10];
  const PAPER = ALLDARK ? [26, 21, 17] : [246, 244, 240], WHITE = ALLDARK ? [26, 21, 17] : [255, 255, 255];
  const INK_D = [243, 236, 227], INK_L = ALLDARK ? [243, 236, 227] : [10, 10, 10];
  // flagged beats are orange (the exploration's, confirmed); on paper a deeper orange so marks and labels hold up
  const FLAGT = ALLDARK ? [247, 168, 75] : [194, 82, 0];   // flagged, as text on paper
  const OR = [247, 168, 75], BRAND = ALLDARK ? [247, 168, 75] : [159, 45, 0], RED = ALLDARK ? [247, 168, 75] : [232, 106, 8];
  const GREY2 = ALLDARK ? [196, 188, 178] : [82, 82, 82], GREY3 = ALLDARK ? [160, 152, 143] : [115, 115, 115];
  const NIGHT = ALLDARK ? [0, 0, 0] : [80, 50, 20], NIGHT_A = ALLDARK ? 0.32 : 0.045;
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + clamp(a).toFixed(3) + ')';
  const mixc = (a, b, t) => [lerp(a[0], b[0], t) | 0, lerp(a[1], b[1], t) | 0, lerp(a[2], b[2], t) | 0];
  const MONO = (s, w = 500) => w + ' ' + s + 'px "Geist Mono", ui-monospace, Menlo, monospace';
  const SANS = (s, w = 400) => w + ' ' + s + 'px Geist, system-ui, sans-serif';

  /* ---------- DOM ---------- */
  const $ = (id) => root.getElementById(id);
  const section = $('narrative'), stage = $('stage');
  const elCallout = $('callout');
  if (ALLDARK) section.classList.add('theme-dark');
  const cvBack = $('cv-back'), cvGL = $('cv-gl'), cvFront = $('cv-front');
  const ctx = cvBack.getContext('2d'), fx = cvFront.getContext('2d');
  const hudEl = $('hud'), hudBeat = $('hud-lens'), hudIdx = $('hud-idx'), hudName = $('hud-name'), hudRead = $('hud-read');
  if (!$('r-l4') && $('hud-read')) {   // fourth readout: flagged beats, counted as the sweep records them
    const row = document.createElement('div');
    row.innerHTML = '<dt id="r-l4">Flagged</dt><dd id="r-v4">0</dd>';
    $('hud-read').appendChild(row);
  }
  const rl = [$('r-l1'), $('r-l2'), $('r-l3'), $('r-l4')], rv = [$('r-v1'), $('r-v2'), $('r-v3'), $('r-v4')];
  const hudCells = [...rl, ...rv].filter(Boolean);
  const ECT_T = (() => { const a = []; for (let k = 0; k < S.n; k++) if (S.TY[k]) a.push(S.T[k]); return a; })();
  const ectBefore = (t) => { let lo = 0, hi = ECT_T.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ECT_T[m] < t) lo = m + 1; else hi = m; } return lo; };
  const hasLS = 'letterSpacing' in CanvasRenderingContext2D.prototype;

  /* ---------- state ---------- */
  let W = 0, H = 0, DPR = 1, mobile = false;
  // the phone layout (layout 2; ?mlayout=1 brings back the first one): the three-day view bleeds off both edges, the
  // zoomed-in views crop the 10 s window, the graph sits in one place for every beat, the copy is centred between it and
  // the progress bar, and beat 04 keeps that layout with a smaller card over the graph
  const MLAYOUT = Q.get('mlayout') !== '1' && opts.mobileLayout !== 1, M2 = () => mobile && MLAYOUT;
  const ZEND = { s: 0, f: 0.5 };   // the zoom-out's end: the span across the plot and the doctor's visit's place in it
  let u = -1, uTarget = -1, time = 0;
  const L = {};
  const cam = { a: SN.c, f: 0.5, s: 10 };
  const X = (t) => L.px0 + (cam.f + (t - cam.a) / cam.s) * L.pw;
  const TX = (x) => cam.a + ((x - L.px0) / L.pw - cam.f) * cam.s;
  // heart-rate axis: 40 bpm on the baseline, 72 bpm at R-peak height, 165 bpm at the top of the graph box
  const hrY = (hr) => (hr <= 72 ? lerp(L.base, L.base - L.amp, clamp((hr - 40) / 32)) : lerp(L.base - L.amp, L.top, clamp((hr - 72) / 93)));
  const px = (x) => (Math.round(x * DPR) + 0.5) / DPR;

  let HALO = null;   // when set, text gets a soft outline in this colour (labels drawn over the trace)
  function txt(c, s, x, y, font, color, align = 'left', ls = '0.07em') {
    c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic';
    if (hasLS) c.letterSpacing = ls;
    if (HALO) { c.save(); c.strokeStyle = HALO; c.lineWidth = 4; c.lineJoin = 'round'; c.strokeText(s, x, y); c.restore(); }
    c.fillText(s, x, y);
    if (hasLS) c.letterSpacing = '0px';
  }

  /* ---------- copy: word reveal, recoloured by the sweep ---------- */
  function splitInto(el, cls, hidden, text) {
    const layer = document.createElement('span');
    layer.className = cls;
    if (hidden) layer.setAttribute('aria-hidden', 'true');
    const words = [];
    text.split(/\s+/).forEach((raw, i, arr) => {
      const m = document.createElement('span'); m.className = 'w';
      const s = document.createElement('span');
      s.textContent = raw.replace(/\*/g, '');
      if (/^\*.*\*[.,?]?$/.test(raw)) s.className = 'acc';
      m.appendChild(s); layer.appendChild(m);
      if (i < arr.length - 1) layer.appendChild(document.createTextNode(' '));
      words.push(s);
    });
    el.appendChild(layer);
    return { layer, words };
  }
  const COPY = [...root.querySelectorAll('.copy')].map((el) => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.textContent = '';
    el.setAttribute('aria-label', text.replace(/\*/g, ''));
    return { el, r: K[el.dataset.k], a: splitInto(el, 'ink-d', false, text), b: splitInto(el, 'ink-l', true, text), box: { l: 0, w: 1 } };
  });



  /* ---------- layout ---------- */
  function layout() {
    if (typeof resetTau === 'function') resetTau();
    const vh = window.innerHeight;
    stage.style.height = vh + 'px';
    section.style.height = Math.round(((REMAP() ? scrollUnits() : UNITS) + 1) * vh) + 'px';
    W = stage.clientWidth; H = vh;
    DPR = PLATE ? 2 : Math.min(2, window.devicePixelRatio || 1);
    mobile = W < 760;
    for (const c of [cvBack, cvFront]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    if (GL) GL.resize();
    L.px0 = mobile ? 20 : Math.round(Math.max(48, W * 0.065));
    L.pw = W - 2 * L.px0;
    // three days: the whole 72 h across the plot, or (phone layout 2) about 30 h, framed so the wearable alert sits
    // near the left and the doctor's visit right of centre, the rest of the 3 days running off both edges
    if (M2()) { const sp = 30 * 3600, vx = 50 + ((SN.c - ALERT.t) / sp) * L.pw; ZEND.s = sp; ZEND.f = (vx - L.px0) / L.pw; }
    else { ZEND.s = TOT; ZEND.f = SN.c / TOT; }
    // One graph box for everything: the ECG strip, the orange 10 s frame, regular life and the photos.
    // Nothing moves vertically between the 10-second view and three days.
    // The container runs from its top to the baseline (the baseline is its bottom edge). The ECG strip and the
    // orange frame add a small foot below for the S-wave dips; at three days that foot is the sliver crossing the axis.
    L.boxH = Math.round(H * (mobile ? (H < 720 ? 0.26 : 0.3) : 0.3));
    L.foot = Math.round(Math.max(24, L.boxH * 0.7 * 0.32));
    L.top = Math.round(H * (mobile ? 0.41 : 0.45) - (L.boxH + L.foot) / 2);
    section.classList.toggle('m2', M2());
    if (M2()) {   // graph + copy, centred as one group between the readouts and the progress bar
      const sr0 = stage.getBoundingClientRect(), hr = hudRead && hudRead.getBoundingClientRect();
      const hudBot = hr && hr.height ? hr.bottom - sr0.top : 96;
      const copyH = Math.max(60, ...COPY.map((c) => c.el.getBoundingClientRect().height || 0));
      const above = 16, gap = 116, a0 = hudBot + 24, a1 = H - 62 - 24, gh = above + L.boxH + gap + copyH;
      L.top = Math.round(a0 + Math.max(0, (a1 - a0 - gh) / 2) + above);
      // each line of copy centred between the graph's lowest point (beat 04's deepest dips) and the progress bar
      const gB = L.top + L.boxH + Math.round(L.boxH * 0.39);
      const pr = prog && prog.el.getBoundingClientRect(), pTop = pr && pr.height ? pr.top - sr0.top : H - 62;
      L.copyMid = (gB + pTop) / 2;
      L.copyAt = 0;
    } else L.copyAt = null;
    L.base = L.top + L.boxH;                      // ECG baseline = heart-rate baseline = container bottom
    L.bot = L.base + L.foot;                      // bottom of the strip / frame
    L.fieldH = L.base - L.top;
    L.amp = L.fieldH * 0.7;                       // the R peak reaches 70% of the way up
    L.hrScale = L.fieldH / 125;
    // the zoomed-in view (beats 01 and 04): 10 s with a margin; on phones (layout 2) about 5 s, so the beats get room and
    // the 10-second window runs off both edges, like the three days do
    L.spanB = M2() ? 5.2 : 10 / 0.86;
    // beat 04's camera: the flagged beat centred, or (layout 2) in the left third, clear of the card
    L.w4f = M2() ? (105 - L.px0) / L.pw + (W4.c - TGT) / L.spanB : 0.5;
    stage.style.setProperty('--gx', L.px0 + 'px');
    const sr = stage.getBoundingClientRect();
    for (const c of COPY) {
      c.el.style.transform = 'translate3d(-50%,0,0)';
      c.el.style.top = L.copyAt != null ? Math.round(L.copyMid - c.el.getBoundingClientRect().height / 2) + 'px' : ''; c.el.style.bottom = L.copyAt != null ? 'auto' : '';
      const r = c.el.getBoundingClientRect();
      c.box = { l: r.left - sr.left, w: r.width, t: r.top - sr.top };
    }
    const c2 = COPY.find((c) => c.el.dataset.k === 'c2');
    L.copyTop = c2 ? c2.box.t : H * 0.82;
    // beat 04: one heartbeat made of every beat, with its notes. The whole group (the form, the usual-beat
    // label, the ringed dip and the tags under it) is centred: across the stage, and between the HUD and the line of copy.
    const c4 = COPY.find((c) => c.el.dataset.k === 'c4');
    const fw = mobile ? W - 40 : Math.min(W * 0.62, 900), famp = mobile ? clamp(W * 0.3, 80, 130) : clamp(H * 0.24, 120, 220);
    const notesBelow = mobile ? 262 : 136;                       // the notes hang this far below the ringed dip (stacked under it on phones)
    const above = famp * 1.02, below = famp * 0.5 + notesBelow;  // R peak above the baseline · dip + tags below it
    const roomTop = 104, roomBot = (c4 ? c4.box.t : H * 0.85) - 28;
    L.form = { cx: W / 2, cy: (roomTop + roomBot) / 2 + (above - below) / 2, w: fw, amp: famp, pxps: fw / PH_W };
    for (const el of [hudBeat, hudRead, ...hudCells]) if (el) { const r = el.getBoundingClientRect(); el._cx = r.left - sr.left + r.width / 2; }
    { const r = hudRead && hudRead.getBoundingClientRect(); L.hudBot = r && r.height ? r.bottom - sr.top : 0; }
    layoutGraph();
    measureAnchor();
    layoutLift();
  }

  /* ---------- camera ---------- */
  // the beat the story ends on: the flagged beat nearest the Day 2 episode's moment
  const TGT_K = (() => { let b = -1; for (let k = Math.max(0, S.idxAt(EV.t - 40)); k < S.n && S.T[k] < EV.t + 40; k++) if (S.TY[k] && (b < 0 || Math.abs(S.T[k] - EV.t) < Math.abs(S.T[b] - EV.t))) b = k; return b; })();
  const TGT = S.T[TGT_K];
  const ZOOM_END = () => GRAPH.ending !== 'form';
  // beat 04 lands on beat 01's view: 11.6 s of ECG, centred, the flagged beat 40% across
  const W4 = { c: TGT + 1 };
  function updateCamera(uu) {
    if (ZOOM_END() && uu >= K.zoomIn[0]) {
      const t = seg(uu, K.zoomIn), k = PACE.mode !== 'current' && DWARP ? unwarp(DWARP, t) : inout(t);
      cam.s = logLerp(ZEND.s, L.spanB, k); cam.a = W4.c; cam.f = lerp(ZEND.f + (W4.c - SN.c) / ZEND.s, L.w4f, k);
      return;
    }
    const t = seg(uu, K.zoom), k = PACE.mode !== 'current' && ZWARP ? unwarp(ZWARP, t) : inout(t);
    cam.s = logLerp(L.spanB, ZEND.s, k); cam.a = SN.c; cam.f = lerp(0.5, ZEND.f, k);
  }
  // how "far" the camera is: 0 at the ECG, 1 at heart-rate scale
  const hrMix = () => lsm(60, 1800, cam.s);

  /* ---------- the recording sweep ---------- */
  const sweepK = (uu) => { const k = seg(uu, K.sweep); return lerp(k, sstep(k), 0.4); };
  const wipeX = (uu) => (uu <= K.sweep[0] ? 0 : uu >= K.sweep[1] ? W + 1 : lerp(-30, W + 30, sweepK(uu)));
  const TXend = (x) => SN.c + ((x - L.px0) / L.pw - ZEND.f) * ZEND.s;   // screen x → time, in the three-day view
  const sweepT = (uu) => (uu <= K.sweep[0] ? 0 : uu >= K.sweep[1] ? TOT : clamp(TXend(wipeX(uu)), 0, TOT));
  // the readouts count the 3 days at the sweep's pace (on phones most of them are off screen)
  const hudSweepT = (uu) => (!M2() ? sweepT(uu) : uu <= K.sweep[0] ? 0 : uu >= K.sweep[1] ? TOT : sweepK(uu) * TOT);
  const headT = (uu) => SN.t0 + SN.dur * seg(uu, K.draw);
  // The dots' clock: the same as sweepT, but not clamped at 72 h, so beats recorded in the last hours keep rising
  // while the head runs off screen (and hold there once it has), instead of freezing mid-flight.
  const sweepGL = (uu) => (uu <= K.sweep[0] ? 0 : uu >= K.sweep[1] ? Math.max(TXend(W + 30), TOT + 3600) : TXend(wipeX(uu)));

  function sides(c, wipe, fn) {
    if (wipe <= 0) return fn(false);
    if (wipe >= W) return fn(true);
    c.save(); c.beginPath(); c.rect(0, 0, wipe, H); c.clip(); fn(true); c.restore();
    c.save(); c.beginPath(); c.rect(wipe, 0, W - wipe, H); c.clip(); fn(false); c.restore();
  }

  /* ---------- ECG trace (only where data exists) ---------- */
  function trace(c, t0, t1) {
    if (t1 <= t0) return;
    const x0 = Math.max(-4, X(t0)), x1 = Math.min(W + 4, X(t1));
    if (x1 <= x0) return;
    const spp = cam.s / L.pw, ta = TX(x0), tb = TX(x1);
    const n = Math.min(9000, Math.ceil((tb - ta) / Math.min(0.8 * spp, 0.004)));
    for (let i = 0; i <= n; i++) {
      const t = ta + ((tb - ta) * i) / n, x = X(t), y = L.base - S.ecg(t) * L.amp;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
  }

  /* ---------- back canvas ---------- */
  function drawBackground(wipe, white) {
    ctx.fillStyle = rgba(DARK_BG, 1);
    ctx.fillRect(0, 0, W, H);
    if (wipe < W) {
      const g = ctx.createRadialGradient(W * 0.8, -H * 0.1, 0, W * 0.8, -H * 0.1, Math.max(W, H) * 0.8);
      g.addColorStop(0, 'rgba(217,138,63,0.16)'); g.addColorStop(0.5, 'rgba(122,63,23,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (wipe > 0) { ctx.fillStyle = rgba(mixc(PAPER, WHITE, white), 1); ctx.fillRect(0, 0, Math.min(W, wipe), H); }
  }

  // ECG paper, only while the camera is close enough to read a waveform
  function drawPaper(uu, wipe) {
    if (!LAYERS.grid) return;
    const near = 1 - lsm(14, 40, cam.s);
    const A = near * Math.max(seg(uu, [-0.6, -0.2]), 0) * (1 - seg(uu, [K.white[1] - 0.05, K.white[1] + 0.3]));
    if (A <= 0.003) return;
    const pps = L.pw / cam.s, small = 0.04 * pps;
    const y0 = L.top, y1 = footY(uu);
    sides(ctx, wipe, (light) => {
      ctx.lineWidth = 1 / DPR;
      const base = light ? 0.2 : 0.15;
      for (const [step, a] of [[0.04, sm(3, 8, small) * 0.45], [0.2, 1]]) {
        ctx.strokeStyle = rgba(OR, A * a * base);
        ctx.beginPath();
        for (let k = Math.ceil(TX(0) / step); k * step <= TX(W); k++) { const x = px(X(k * step)); ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
        const sy = step * pps;
        for (let y = L.base; y >= y0; y -= sy) { ctx.moveTo(0, px(y)); ctx.lineTo(W, px(y)); }
        for (let y = L.base + sy; y <= y1; y += sy) { ctx.moveTo(0, px(y)); ctx.lineTo(W, px(y)); }
        ctx.stroke();
      }
    });
  }

  // the waveform and its R-peak stems, wherever the camera is close and data exists
  function drawWave(uu, wipe) {
    const near = 1 - lsm(14, 60, cam.s);
    if (near <= 0.003) return;
    const ranges = [];
    const hT = headT(uu);
    if (hT > SN.t0) ranges.push([SN.t0, Math.min(SN.t1, hT)]);
    const sT = sweepT(uu);
    if (sT > 0) ranges.push([Math.max(0, TX(-4)), Math.min(sT, TX(W + 4))]);
    sides(ctx, wipe, (light) => {
      const ink = light ? INK_L : INK_D;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(ink, near * (light ? 0.5 : 0.62)); ctx.lineWidth = 1.4;
      ctx.beginPath(); for (const [a, b] of ranges) trace(ctx, a, b); ctx.stroke();
      // stems
      ctx.lineWidth = 1;
      for (const [a, b] of ranges) {
        for (let k = Math.max(0, S.idxAt(a) + 1); k < S.n && S.T[k] <= b; k++) {
          const x = X(S.T[k]); if (x < -10 || x > W + 10) continue;
          const flag = S.TY[k] && uu > K.flags[0];
          ctx.strokeStyle = flag ? rgba(RED, near * 0.6) : rgba(ink, near * 0.22);
          ctx.beginPath(); ctx.moveTo(px(x), L.base - S.A[k] * L.amp); ctx.lineTo(px(x), L.base + L.amp * 0.24); ctx.stroke();
          if (flag) { // the flagged beat, traced in red
            ctx.strokeStyle = rgba(RED, near); ctx.lineWidth = 2;
            ctx.beginPath(); trace(ctx, S.T[k] - 0.1, S.T[k] + 0.45); ctx.stroke(); ctx.lineWidth = 1;
          }
        }
      }
    });
    // the heart keeps beating outside the window, unread: a dashed ghost of the ECG
    const gA = near * windowA(uu) * (1 - seg(uu, [K.sweep[0] - 0.1, K.sweep[0]]));
    if (gA > 0.003) {
      ctx.save(); ctx.beginPath(); ctx.rect(wipe, 0, W - wipe, H); ctx.clip();
      ctx.strokeStyle = rgba(INK_D, 0.2 * gA); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); trace(ctx, TX(-4), SN.t0); trace(ctx, SN.t1, TX(W + 4)); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }
  }

  // The doctor's 10 seconds as an orange container: it snaps around the strip like a shutter,
  // then shrinks with the zoom to a sliver at true scale, so the eye can follow it.
  const windowA = (uu) => seg(uu, [K.draw[1] - 0.12, K.draw[1] + 0.06]);
  function drawWindow(uu, wipe) {
    let A = windowA(uu) * (GRAPH.keepSliver ? 1 - seg(uu, K.out) : 1 - seg(uu, [K.sweep[0] + 0.1, K.sweep[0] + 0.3]));
    if (A <= 0.003) return;
    const x0 = X(SN.t0), x1 = X(SN.t1), w = x1 - x0, cx = (x0 + x1) / 2;
    if (!GRAPH.keepSliver && wipe > cx) return;
    const hk = hrMix();
    // Locked to the graph box: the top and the baseline never move. The foot below the baseline only exists for the
    // ECG's S-wave dips, so it retracts as the waveform fades (same range as drawWave): at heart-rate scale the
    // sliver spans exactly the graph, top to baseline.
    const yT = L.top, yB = lerp(L.bot, L.base, lsm(14, 60, cam.s));
    const flash = 1 - seg(uu, [K.draw[1] + 0.02, K.draw[1] + 0.22]);
    ctx.fillStyle = rgba(OR, (0.08 + 0.22 * flash) * A);
    if (w > 3) {
      ctx.fillRect(x0, yT, w, yB - yT);
      ctx.strokeStyle = rgba(OR, 0.9 * A); ctx.lineWidth = 1;
      ctx.strokeRect(px(x0), px(yT), Math.round(w), Math.round(yB - yT));
    } else {
      const g = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0);
      g.addColorStop(0, rgba(OR, 0)); g.addColorStop(0.5, rgba(OR, 0.3 * A)); g.addColorStop(1, rgba(OR, 0));
      ctx.fillStyle = g; ctx.fillRect(cx - 16, yT, 32, yB - yT);
      ctx.fillStyle = rgba(OR, A); ctx.fillRect(Math.round(cx - Math.max(0.5, w / 2)), yT, Math.max(1, w), yB - yT);
    }
    // label: a frame tag while wide, a side note once it is a sliver
    const big = sm(170, 260, w);
    const c = S.clock(SN.t0);
    if (big > 0.003) {
      txt(ctx, '10 SECONDS  ·  ' + SN.beats + ' BEATS', Math.max(x0, L.px0), yT - 10, MONO(10.5, 600), rgba(OR, A * big));   // on screen when the frame runs off it
      if (!mobile) txt(ctx, "DOCTOR'S VISIT  ·  DAY " + c.day + ' ' + c.hm, x1, yT - 10, MONO(10.5), rgba(INK_D, 0.5 * A * big), 'right');
    }
  }

  // 02 + 03: life on a 72-hour axis
  function drawLife(uu, wipe) {
    const far = lsm(600, 6 * 3600, cam.s);
    const lifeA = seg(uu, K.life) * far * (1 - seg(uu, K.out));
    const axA = far * seg(uu, [K.zoom[0] + 0.25, K.zoom[1]]) * (1 - seg(uu, K.out));
    if (lifeA + axA <= 0.003) return;
    const xs = X(0), xe = X(TOT), sx = X(SN.c);
    const sT = sweepT(uu);
    sides(ctx, wipe, (light) => {
      const ink = light ? INK_L : INK_D;
      if (light && V1()) return;                         // on paper, v1's recorded graph draws its own nights and band
      // nights, once there is a recording to put them in context
      if (light) {
        for (const [a, b] of S.NIGHTS) {
          const x0 = Math.max(xs, X(a)), x1 = Math.min(xe, X(b));
          if (x1 <= x0) continue;
          ctx.fillStyle = rgba(NIGHT, NIGHT_A * axA); ctx.fillRect(x0, L.top, x1 - x0, L.boxH);
          if (x1 - x0 > 50) txt(ctx, 'ASLEEP', (x0 + x1) / 2, L.top - 9, MONO(9.5), rgba(ink, 0.42 * axA), 'center');
        }
      } else if (lifeA > 0.003) {
        // regular life: real, but nothing is recorded
        ctx.fillStyle = rgba(INK_D, 0.035 * lifeA);
        ctx.fillRect(xs, L.top, Math.max(0, sx - 6 - xs), L.boxH);
        ctx.fillRect(sx + 6, L.top, Math.max(0, xe - sx - 6), L.boxH);
      }
      if (PLATE) return;
      // the line of life
      ctx.strokeStyle = rgba(ink, 0.3 * Math.max(lifeA, axA)); ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(xs, px(L.base)); ctx.lineTo(xe, px(L.base)); ctx.stroke(); ctx.setLineDash([]);
    });
    if (!PLATE && LAYERS.episodes) drawEpisodes(uu, sT);
  }

  // three episodes happen in regular life; one of them matters later
  function drawEpisodes(uu, sT) {
    const ga = seg(uu, K.ghosts) * (1 - seg(uu, K.out));
    if (ga <= 0.003) return;
    const fk = seg(uu, K.flags);
    S.EVENTS.forEach((e, i) => {
      const x = X(e.t), y = L.base, a = ga * clamp(seg(uu, K.ghosts) * 2 - i * 0.3);
      if (a <= 0.003) return;
      const cap = sT > e.t, main = e === EV;
      if (cap && V1()) return;                           // recorded: v1's event marker on the band (drawEventsV1)
      const c = S.clock(e.t);
      const epY = !LAYERS.photos ? L.base + 52 : life && /below/.test(life.position) && !cap ? L.base - 34 : L.bot + 24;   // inside the graph only while photos sit below it
      if (!cap) {
        ctx.strokeStyle = rgba(INK_D, 0.8 * a); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        const ph = (time * 0.5 + i * 0.33) % 1;
        ctx.strokeStyle = rgba(INK_D, a * (1 - ph) * 0.5); ctx.beginPath(); ctx.arc(x, y, 7 + ph * 18, 0, Math.PI * 2); ctx.stroke();
        if (main) {
          txt(ctx, 'AN EPISODE', x, epY, MONO(10.5, 600), rgba(INK_D, 0.85 * a), 'center');
          txt(ctx, 'NOT RECORDED', x, epY + 15, MONO(10.5), rgba(INK_D, 0.42 * a), 'center');
        }
      } else {
        const ck = clamp((sT - e.t) / (TOT * 0.05));
        ctx.fillStyle = rgba(RED, a); ctx.strokeStyle = rgba(RED, a); ctx.lineWidth = 1.25;
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = rgba(RED, a * (1 - ck)); ctx.beginPath(); ctx.arc(x, y, 7 + 28 * out3(ck), 0, Math.PI * 2); ctx.stroke();
        if (main) {
          txt(ctx, 'AN EPISODE · DAY ' + c.day + ' ' + c.hm, x, epY, MONO(10.5, 600), rgba(INK_L, 0.85 * a), 'center');
          txt(ctx, 'FLAGGED', x, epY + 15, MONO(10.5, 600), rgba(RED, a), 'center');
        }
      }
    });
  }

  // a quiet time ruler, so every zoom reads as time growing or shrinking
  const STEPS = [1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200, 10800, 21600, 43200, 86400];
  function drawRuler(uu, wipe) {
    const A = lsm(30, 90, cam.s) * seg(uu, [K.zoom[0] + 0.04, K.zoom[0] + 0.14]) * (ZOOM_END() ? 1 - seg(uu, [K.white[1] - 0.05, K.white[1] + 0.3]) : 1 - seg(uu, K.out));
    if (A <= 0.003) return;
    let step = 86400;
    for (const st of STEPS) if (cam.s / st <= (mobile ? 4 : 7)) { step = st; break; }
    if (V1()) {   // v1's time axis on both sides of the sweep, on the baseline; its line only where there is a recording
      const far = lsm(6 * 3600, 36 * 3600, cam.s);
      return sides(ctx, wipe, (light) => drawAxis({ dark: !light, ink: light ? INK_L : INK_D }, A, 0, false, light ? far : 0));
    }
    const t0 = Math.max(0, TX(-20)), t1 = Math.min(TOT, TX(W + 20)), y = L.base;
    sides(ctx, wipe, (light) => {
      const ink = light ? INK_L : INK_D;
      ctx.strokeStyle = rgba(ink, 0.35 * A); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = Math.ceil(t0 / step); k * step <= t1; k++) { const x = px(X(k * step)); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + ((k * step) % 86400 ? 12 : 16)); }
      ctx.stroke();
      for (let k = Math.ceil(t0 / step); k * step <= t1; k++) {
        const t = k * step, c = S.clock(t), day = t % 86400 === 0;
        if (t >= TOT) continue;
        if (M2() && (X(t) < 2 || X(t) + 46 > W)) continue;   // a label the screen's edge would cut (the view bleeds on phones)
        const s = day && step >= 3600 ? 'DAY ' + c.day : step < 60 ? c.hms : c.hm;
        txt(ctx, s, X(t) + 5, y + 27, MONO(mobile ? 11 : 10, day ? 600 : 500), rgba(ink, (day ? 0.75 : 0.5) * A));
      }
    });
  }

  /* ---------- 02: daily life, as image cards pinned to their moment ----------
     Dashed = not recorded, the same language as the ghost beats and episode rings.
     Drop photos into assets/life/ with these names and they replace the placeholders. */
  const LIFE = [
    { h: 7.33, label: 'Morning run', src: 'run', depth: 1.22 },
    { h: 16.33, label: 'Taking the stairs', src: 'stairs1', depth: 0.84 },
    { h: 27.24, label: 'Asleep', src: 'sleep1', depth: 1.12, m: true },
    { h: 42.9, label: 'At the gym', src: 'gym', depth: 0.9, m: true },
    { h: 56.75, label: 'Commute', src: 'commute', depth: 1.16 },
    { h: 68.33, label: 'Evening walk', src: 'walk-pm', depth: 0.86, m: true },
  ].map((c) => ({ ...c, t: c.h * 3600 }));
  // Only where the page has a #life layer and the photos aren't drawn on canvas (the cloud page, v2.html). The photo
  // plot and the packaged section have neither, and built anyway the cards' <img>s would load (and 404) unseen.
  const lifeEl = MOSAIC ? null : $('life');
  if (lifeEl) LIFE.forEach((c) => {
    const k = S.clock(c.t);
    const el = document.createElement('figure');
    el.className = 'life-card';
    el.innerHTML = '<div class="life-ph"><span>Image</span><img alt="" src="' + (opts.assetBase || 'assets/') + 'life/' + c.src + '.jpg" onerror="this.remove()"></div>' +
      '<figcaption><b>Day ' + k.day + ' · ' + k.hm + '</b>' + c.label + '</figcaption>';
    lifeEl.appendChild(el); c.el = el;
  });
  const lifeState = [];
  function updateLife(uu, wipe) {
    lifeState.length = 0;
    const base = MOSAIC ? 0 : lsm(1800, 5 * 3600, cam.s) * (uu < K.out[1] ? 1 : 0) * (1 - seg(uu, [K.flags[0], K.flags[0] + 0.1]));
    const settle = sm(0.55, 1, seg(uu, K.zoom));
    const grow = lerp(1.22, 1, lsm(1800, TOT, cam.s));
    const ax = X(SN.c), cs = clamp(H / 900, 0.8, 1.1) * (mobile ? 0.62 : 1);
    for (const c of LIFE) {
      const show = !mobile || c.m;
      const xt = X(c.t), d = lerp(c.depth, 1, settle);
      let x = ax + (xt - ax) * d;
      if (mobile) x = clamp(x, 40, W - 40);
      const edge = clamp((x + 60) / 80) * clamp((W + 60 - x) / 80);
      const swept = clamp((x - wipe - 30) / 110);
      const a = show ? base * edge * swept : 0;
      if (!c.el) continue;
      c.el.style.visibility = a > 0.003 ? 'visible' : 'hidden';
      if (a <= 0.003) continue;
      const sc = grow * cs * lerp(1 / c.depth, 1, settle);
      const hgt = 100 * sc;                                   // card is 112 × 100 before scaling, origin bottom-centre
      const yB = mobile ? L.bot + 50 + hgt : Math.max(92 + hgt, L.top - 14);
      c.el.style.opacity = a.toFixed(3);
      c.el.style.transform = 'translate3d(' + (x - 56).toFixed(1) + 'px,' + (yB - 100).toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
      lifeState.push({ x, xt, y0: mobile ? yB - hgt : yB, a });
    }
  }
  function drawLifeLeaders(uu, wipe) {
    if (!lifeState.length) return;
    ctx.lineWidth = 1; ctx.setLineDash([1, 3]);
    for (const s2 of lifeState) {
      ctx.strokeStyle = rgba(INK_D, 0.38 * s2.a);
      ctx.beginPath(); ctx.moveTo(s2.x, s2.y0 + (mobile ? 0 : 2)); ctx.lineTo(s2.xt, L.base - 2); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  /* ---------- 02 (mosaic variant): daily life as photos on the timeline ----------
     Rendered by the shared module (js/life-photos.js) with the comp locked in the lab (js/life-config.js),
     so what plays here is exactly what was tuned in lab-zoom.html. */
  const life = MOSAIC && opts.AKLife ? opts.AKLife(S, Object.assign({}, opts.lifeCfg || {}), { assetBase: opts.assetBase || '' }) : null;
  if (life) life.position = (opts.lifeCfg || {}).position || '';
  function drawMosaic(uu, wipe) {
    if (!life || PLATE || !LAYERS.photos) return;
    const kn = clamp((Math.log(cam.s) - Math.log(L.spanB)) / (Math.log(ZEND.s) - Math.log(L.spanB)));
    // the copy pushes the photos only while a line is on screen: before it fades in they can be as big as the comp says
    const copyOn = Math.max(...['c2', 'c3', 'c4'].map((k) => seg(uu, [K[k][0], K[k][0] + 0.22]) * (uu < K[k][1] ? 1 : 0)));
    const view = {
      W, H, DPR, L, X, span: cam.s, kn,
      alpha: seg(uu, [K.zoom[0] + 0.05, K.zoom[0] + 0.2]) * (1 - seg(uu, K.out)),
      safeTop: mobile ? 124 : 40, safeBottom: lerp(H + 600, L.copyTop - 14, copyOn),
      matte: rgba(DARK_BG, 1),   // photos read the same after the sweep as before it
    };
    if (GRAPH.photosDuringSweep === 'episodes stay') {
      // one pass: as the sweep reaches each photo, an episode's photo stays and takes the episode's name and the flag;
      // every other photo shrinks toward the graph and fades right back. The Day 2 photo is held through the dive.
      life.draw(ctx, { ...view, ink: INK_D, inkD: INK_D, inkL: INK_L, wipe, episodes: epPhotos(), flag: RED, flagText: FLAGT,
        fadedScale: 0.6, fadedAlpha: 0.16, lineAlpha: GRAPH.photoLinesDark, lineAlphaRec: GRAPH.photoLinesPaper,
        skipKey: ZOOM_END() && uu >= K.out[0] ? anchor().key : null });
      const r = life.rects.find((q) => q.key === anchor().key);
      if (r && cam.s > ZEND.s * 0.9 && uu < K.out[0]) ANCHOR.rect = r;
      return;
    }
    // ahead of the sweep, dark ink; behind it the photos either stay (paper ink) or are wiped off ('go away')
    if (wipe < W) life.draw(ctx, { ...view, ink: INK_D, lineAlpha: GRAPH.photoLinesDark, clipX: Math.max(0, wipe) });
    if (wipe > 0 && GRAPH.photosDuringSweep !== 'go away') life.draw(ctx, { ...view, ink: INK_L, lineAlpha: GRAPH.photoLinesPaper, clipX: 0, clipX1: Math.min(W, wipe) });
  }
  // the photos of the three episodes (the moment each happened in), named as the recorded side names them
  let EP_PHOTOS = null;
  function epPhotos() {
    if (EP_PHOTOS || !life) return EP_PHOTOS || {};
    EP_PHOTOS = {};
    for (const e of S.EVENTS) {
      let b = null; for (const c of life.cards) if (c.key && Math.abs(c.t - e.t) < 3600 && (!b || Math.abs(c.t - e.t) < Math.abs(b.t - e.t))) b = c;
      if (b) EP_PHOTOS[b.key] = e === EV ? 'Unfelt, asleep' : e.label;
    }
    return EP_PHOTOS;
  }
  // the dive's anchor: the Day 2 episode's photo, kept on screen while the camera zooms in on its flagged beat
  const ANCHOR = { key: null, rect: null };
  function anchor() {
    if (!ANCHOR.key && life) { const ep = epPhotos(); ANCHOR.key = Object.keys(ep).find((k) => ep[k] === 'Unfelt, asleep') || null; }
    return ANCHOR;
  }

  /* ---------- front canvas ---------- */
  function drawHead(uu) {
    const dk = seg(uu, K.draw);
    const A = (dk > 0 && dk < 1 ? 1 : dk >= 1 ? 1 - seg(uu, [K.draw[1], K.draw[1] + 0.15]) : seg(uu, [-0.8, -0.55]));
    if (A <= 0.003) return;
    const t = headT(uu), hx = X(t), hy = L.base - (dk > 0 ? S.ecg(t) * L.amp : 0);
    const pulse = dk > 0 ? 1 : 0.6 + 0.4 * Math.sin(time * 4.6);
    if (dk > 0) {
      const t0 = Math.max(SN.t0, t - 0.6);
      fx.strokeStyle = rgba(OR, 0.9 * A); fx.lineWidth = 2; fx.lineJoin = 'round';
      fx.beginPath(); trace(fx, t0, t); fx.stroke();
    }
    const g = fx.createRadialGradient(hx, hy, 0, hx, hy, 28);
    g.addColorStop(0, rgba(OR, 0.55 * A * pulse)); g.addColorStop(1, rgba(OR, 0));
    fx.fillStyle = g; fx.fillRect(hx - 28, hy - 28, 56, 56);
    fx.fillStyle = rgba([255, 226, 190], A); fx.beginPath(); fx.arc(hx, hy, 3, 0, Math.PI * 2); fx.fill();
  }

  // 03, after v1: the hourly mean heart rate as a comb of lollipops rising behind the sweep, over every beat.
  function drawLollipops(uu, wipe) {
    if (V1() || !GRAPH.lollipops || uu <= K.sweep[0] || wipe <= 0) return;
    const A = lsm(6 * 3600, 36 * 3600, cam.s) * (1 - seg(uu, K.out));
    if (A <= 0.003) return;
    const sT = sweepT(uu), step = Math.max(1, Math.round(GRAPH.lollipopHours)), r = GRAPH.headSize;
    const yOf = (hr) => L.base - clamp(hr - 40, 0, 125) * L.hrScale;
    const stems = new Path2D(), dots = new Path2D();
    for (let h = 0; h + step <= 72; h += step) {
      const tc = (h + step / 2) * 3600;
      if (tc > sT) break;
      let hr = 0;
      for (let j = h; j < h + step; j++) hr += S.hrHour[j];
      const x = X(tc), y = lerp(L.base, yOf(hr / step), backOut(clamp((sT - tc) / (3600 * 2.6))));
      stems.moveTo(px(x), L.base); stems.lineTo(px(x), y);
      dots.moveTo(x + r, y); dots.arc(x, y, r, 0, Math.PI * 2);
    }
    fx.save();
    fx.beginPath(); fx.rect(0, 0, Math.min(W, wipe), H); fx.clip();
    if (GRAPH.axisLabels) {
      fx.lineWidth = 1 / DPR; fx.setLineDash([2, 4]);
      for (const hr of [60, 100, 140]) {
        const y = px(yOf(hr));
        fx.strokeStyle = rgba(INK_L, 0.12 * A); fx.beginPath(); fx.moveTo(X(0), y); fx.lineTo(Math.min(X(TOT), wipe), y); fx.stroke();
        if (!mobile) txt(fx, String(hr), X(0) - 10, y + 3.5, MONO(10), rgba(INK_L, 0.42 * A), 'right');
      }
      fx.setLineDash([]);
      if (!mobile) txt(fx, 'BPM', X(0) - 10, yOf(160) + 3.5, MONO(10, 600), rgba(INK_L, 0.6 * A), 'right');
    }
    fx.lineWidth = 1;
    fx.globalAlpha = A * GRAPH.stemOpacity; fx.strokeStyle = rgba(INK_L, 1); fx.stroke(stems);
    fx.globalAlpha = A * GRAPH.headOpacity; fx.fillStyle = rgba(INK_L, 1); fx.fill(dots);
    fx.restore();
    fx.globalAlpha = 1;
  }

  function drawSweep(uu, wipe) {
    if (V1()) return drawSweepHead(uu, wipe);
    if (uu <= K.sweep[0] || uu >= K.sweep[1]) return;
    const x = wipe;
    const g = fx.createLinearGradient(x - 90, 0, x + 4, 0);
    g.addColorStop(0, rgba(OR, 0)); g.addColorStop(0.92, rgba(OR, 0.18)); g.addColorStop(1, rgba(OR, 0));
    fx.fillStyle = g; fx.fillRect(x - 90, 0, 94, H);
    fx.strokeStyle = rgba(OR, 1); fx.lineWidth = 1.5;
    fx.beginPath(); fx.moveTo(x, 0); fx.lineTo(x, H); fx.stroke();
    const t = sweepT(uu), c = S.clock(Math.min(t, TOT - 1));
    const flip = x > W - 220, al = flip ? 'right' : 'left', dx = flip ? -12 : 12;
    const y = L.top + 18;
    fx.fillStyle = rgba(OR, 0.55 + 0.45 * Math.sin(time * 6));
    fx.beginPath(); fx.arc(x + (flip ? -16 : 16), y - 4, 3.5, 0, Math.PI * 2); fx.fill();
    txt(fx, 'REC', x + dx + (flip ? -12 : 12), y, MONO(10.5, 600), rgba(OR, 1), al);
    txt(fx, 'DAY ' + c.day + ' · ' + c.hm, x + dx, y + 16, MONO(10.5), rgba(flip ? INK_L : INK_D, 0.8), al);
  }

  // 04: the system flags what it caught
  function drawFlags(uu) {
    if (V1() || uu <= K.sweep[0]) return;                // v1 mode: the episode marker + FLAGGED label carry it
    const sT = sweepT(uu), zk = seg(uu, K.out);
    S.EVENTS.forEach((e, i) => {
      const k = clamp((sT - e.t) / (TOT * 0.05)), main = e === EV;   // pops the moment the sweep records it
      const a = out3(k) * (main ? 1 - sm(0.5, 0.9, zk) : 1 - sm(0, 0.25, zk));
      if (a <= 0.003) return;
      const x = px(X(e.t)), y0 = L.top, yb = L.base;
      fx.strokeStyle = rgba(RED, 0.75 * a); fx.lineWidth = 1;
      fx.beginPath(); fx.moveTo(x, y0 + (1 - out3(k)) * (yb - y0)); fx.lineTo(x, yb); fx.stroke();
      fx.fillStyle = rgba(RED, a);
      fx.beginPath(); fx.moveTo(x, y0); fx.lineTo(x + 9, y0 + 4); fx.lineTo(x, y0 + 8); fx.closePath(); fx.fill();
      const ring = clamp(k * 1.4);
      fx.strokeStyle = rgba(RED, a * (1 - ring)); fx.beginPath(); fx.arc(x, L.base, 7 + 30 * ring, 0, Math.PI * 2); fx.stroke();
      const c = S.clock(e.t);
      if (!mobile || main) txt(fx, 'DAY ' + c.day + ' · ' + c.hm, x + 6, y0 + 24, MONO(10, 600), rgba(RED, a));   // under the pennant, clear of the night labels
    });
  }



  /* ---------- 04: one heartbeat, made of every beat ----------
     The dots land on the superimposed beat in the shader (uMorph). Here: the hairline mean through them, and the
     few notes set straight on the paper: what the usual beat is, the doctor's 10 seconds on it, and the ringed dip
     where the flagged beats break away, with one line per episode. */
  const DISP = (s) => '400 ' + s + 'px "Faculty Glyphic", Georgia, serif';
  const EP_NOTES = [['Every 2nd beat', 'On the stairs'], ['Every 2nd beat', 'Asleep'], ['Every 3rd beat', 'On the stairs']];
  function drawFormNotes(uu) {
    if (ZOOM_END()) return;
    const F = L.form, lineA = seg(uu, [K.morph[1] - 0.08, K.morph[1] + 0.04]);
    if (lineA > 0.003) {
      fx.beginPath();
      for (let i = 0; i <= 400; i++) { const ph = PH_A + (PH_W * i) / 400, x = F.cx + (ph - PH_C) * F.pxps, y = F.cy - S.beatShape(ph, 1, 0) * F.amp; if (i) fx.lineTo(x, y); else fx.moveTo(x, y); }
      fx.lineJoin = 'round'; fx.strokeStyle = rgba(INK_L, 0.62 * lineA); fx.lineWidth = 1; fx.stroke();
    }
    const nk = seg(uu, K.notes);
    if (nk <= 0.003) return;
    const step = (i) => out3(clamp(nk * 1.7 - i * 0.14)), rise = (a) => (1 - a) * 6;
    // the usual beat, named once, under the P wave
    const rx = F.cx + (0.087 - PH_C) * F.pxps, ry = F.cy + 0.5 * F.amp;
    const ux = F.cx - F.w / 2, uy = mobile ? ry + 46 : F.cy + 50, a0 = step(0), a1 = step(1);
    txt(fx, 'Narrow, P present', ux, uy + 20 + rise(a0), DISP(21), rgba(INK_L, a0), 'left', '0px');
    txt(fx, 'YOUR USUAL BEAT · ' + fmtInt(S.n - S.nEct), ux, uy + 37 + rise(a0), MONO(10.5), rgba(GREY3, a0), 'left', '0.08em');
    txt(fx, '●', ux, uy + 60 + rise(a1), MONO(10.5), rgba(OR, a1), 'left', '0px');
    txt(fx, 'YOUR 10-SECOND ECG · ' + SN.beats + ' BEATS', ux + 18, uy + 60 + rise(a1), MONO(10.5), rgba(BRAND, a1), 'left', '0.08em');
    // the dip, ringed; the tags hang off it
    const a2 = step(2);
    fx.strokeStyle = rgba(RED, 0.85 * a2); fx.lineWidth = 1.2;
    fx.beginPath(); fx.arc(rx, ry, 32 * lerp(1.4, 1, a2), 0, Math.PI * 2); fx.stroke();
    const tx = mobile ? ux : rx + 70, ty = mobile ? uy + 84 : ry + 4;
    if (!mobile) { fx.strokeStyle = rgba(RED, 0.6 * a2); fx.lineWidth = 1; fx.setLineDash([3, 4]); fx.beginPath(); fx.moveTo(rx + 33, ry); fx.lineTo(rx + 62, ry + 16); fx.stroke(); fx.setLineDash([]); }
    const a3 = step(3);
    txt(fx, 'Wide, no P', tx, ty + 20 + rise(a3), DISP(21), rgba(RED, a3), 'left', '0px');
    S.EVENTS.forEach((e, i) => {
      const a = step(4 + i), c = S.clock(e.t), y = ty + 47 + i * 22 + rise(a), [what, where] = EP_NOTES[i];
      fx.font = MONO(10.5, 600); if (hasLS) fx.letterSpacing = '0.08em';
      const w = fx.measureText(what.toUpperCase()).width; if (hasLS) fx.letterSpacing = '0px';
      txt(fx, what.toUpperCase(), tx, y, MONO(10.5, 600), rgba(RED, a), 'left', '0.08em');
      txt(fx, 'DAY ' + c.day + ' · ' + c.hm + ' · ' + where.toUpperCase(), tx + w + 10, y, MONO(10.5), rgba(GREY2, a), 'left', '0.08em');
    });
    const a7 = step(7), fy = ty + 120 + rise(a7);
    fx.fillStyle = rgba(RED, a7); fx.fillRect(tx, fy - 7, 6, 6);
    txt(fx, 'FLAGGED FOR PHYSICIAN REVIEW', tx + 14, fy, MONO(10.5, 600), rgba(RED, a7), 'left', '0.08em');
  }


  // a label straight on the graph (no plate): runs of text on one baseline; returns its extent
  function runsW(parts) {
    let w = 0;
    parts.forEach(([str, f, , ls], i) => { fx.font = f; if (hasLS) fx.letterSpacing = ls || '0px'; w += fx.measureText(str).width + (i ? 8 : 0); if (hasLS) fx.letterSpacing = '0px'; });
    return w;
  }
  function runs(parts, left, y) {
    let x = left;
    for (const [str, f, col, ls, fs] of parts) {
      txt(fx, str, x, y + fs * 0.36, f, col, 'left', ls || '0px');
      fx.font = f; if (hasLS) fx.letterSpacing = ls || '0px'; x += fx.measureText(str).width + 8; if (hasLS) fx.letterSpacing = '0px';
    }
    return { x0: left, x1: x - 8, y };
  }
  /* ---------- 02: name the comparison, on one line through the middle of the graph box ----------
     Regular life at either edge of the graph; Wearable alert and Doctor's visit beside their slivers; all on the box's
     vertical centre, written straight on the graph. Regular life is only ahead of the sweep (the recording removes it);
     the two snapshots hold their place through it. */
  const ALERT = { t: S.EVENTS[0].t, dur: 30 };   // a 30-second wearable reading, at the Day 1 palpitations
  function drawLifeLabels(uu, wipe) {
    const out = 1 - seg(uu, K.out);
    const lifeA = seg(uu, K.labels) * lsm(6 * 3600, 36 * 3600, cam.s) * out;
    const fw = X(SN.t1) - X(SN.t0);
    const visitA = windowA(uu) * (1 - sm(40, 120, fw)) * (GRAPH.keepSliver ? out : 1 - seg(uu, [K.sweep[0] + 0.1, K.sweep[0] + 0.3]));
    if (lifeA + visitA <= 0.003) return;
    const yC = L.top + L.boxH / 2, fs = mobile ? 13 : 15, ms = 10.5;
    const ax = X(ALERT.t), sx = X(SN.c);
    // the wearable alert: a second snapshot, drawn the way the doctor's 10 s is (it stays once recorded)
    if (lifeA > 0.003) {
      const g = ctx.createLinearGradient(ax - 14, 0, ax + 14, 0);
      g.addColorStop(0, rgba(OR, 0)); g.addColorStop(0.5, rgba(OR, 0.26 * lifeA)); g.addColorStop(1, rgba(OR, 0));
      ctx.fillStyle = g; ctx.fillRect(ax - 14, L.top, 28, L.boxH);
      ctx.fillStyle = rgba(OR, 0.9 * lifeA); ctx.fillRect(Math.round(ax - 0.5), L.top, 1, L.boxH);
    }
    if (!LAYERS.labels) return;
    // the two snapshots, beside their lines (90%), on the centre line; they stay there through the sweep and only
    // take the paper's colours as it passes them
    const snap = (x, title, sub, a) => {
      const cross = sm(x - 30, x + 30, wipe);
      const parts = [[title, SANS(fs, 500), rgba(mixc(OR, BRAND, cross), 0.9 * a), '0px', fs], [sub, MONO(ms), rgba(mixc(INK_D, INK_L, cross), 0.55 * a), '0.07em', ms]];
      return { parts, w: runsW(parts), x };
    };
    const S1 = lifeA > 0.003 ? snap(ax, 'Wearable alert', '30 S', lifeA) : null, S2 = visitA > 0.003 ? snap(sx, "Doctor's visit", '10 S', visitA) : null;
    if (M2()) {   // phone layout 2: each snapshot's name over its length, beside its line; regular life in the gap between them
      const ends = [];
      [[S1, ax, lifeA], [S2, sx, visitA]].forEach(([sn, x, a]) => {
        if (!sn) { ends.push(x + 10); return; }
        const [t, dd] = sn.parts, x0 = x + 10, w2 = Math.max(runsW([t]), runsW([dd])), h = sm(x0 + w2, x0 + w2 + 40, wipe) * a;
        HALO = h > 0.02 ? rgba(PAPER, 0.92 * h) : null;
        runs([t], x0, yC - 8); runs([dd], x0, yC + 10);
        HALO = null;
        ends.push(x0 + w2);
      });
      if (lifeA > 0.003 && wipe < W) {
        fx.save(); fx.beginPath(); fx.rect(Math.max(0, wipe), 0, W, H); fx.clip();
        const rl = [['Regular life', SANS(12, 400), rgba(INK_D, 0.9 * lifeA), '0px', 12]], w = runsW(rl);
        for (const [l, r] of [[Math.max(0, X(0)) + 10, ax - 10], [ends[0] + 14, sx - 14], [ends[1] + 14, Math.min(W, X(TOT)) - 10]]) if (r - l >= w) runs(rl, (l + r - w) / 2, yC);
        fx.restore();
      }
      return;
    }
    // phones: if the alert's label would run into the doctor's line, the two step apart, above and below the centre
    const clash = S1 && S2 && ax + 12 + S1.w + 8 > sx, above = clash && mobile, d = clash && !above ? 18 : 0;
    const placed = [];
    [[S1, above ? L.top - 34 : yC - d], [S2, above ? L.top - 14 : yC + d]].forEach(([sn, y], i) => {
      if (!sn) return;
      const x0 = sn.x + (above ? 4 : 12), h = sm(x0 + sn.w, x0 + sn.w + 40, wipe) * (i ? visitA : lifeA);   // only once the whole label is on paper
      HALO = h > 0.02 ? rgba(PAPER, 0.92 * h) : null;
      placed.push(runs(sn.parts, x0, y));
      HALO = null;
    });
    // regular life: at the two edges of the graph, ahead of the sweep. On a phone, each takes whichever line has room.
    if (lifeA > 0.003 && wipe < W) {
      fx.save(); fx.beginPath(); fx.rect(Math.max(0, wipe), 0, W, H); fx.clip();
      const rf = mobile ? 12 : fs, pad = mobile ? 8 : 16;
      const rl = [['Regular life', SANS(rf, 400), rgba(INK_D, 0.9 * lifeA), '0px', rf]], w = runsW(rl);
      const rows = d ? [yC + d, yC - d] : [yC];
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? X(0) + pad : X(TOT) - pad - w, x1 = x0 + w;
        if (side < 0 ? x1 > ax - (mobile ? 4 : 8) : x0 < sx + 8) continue;          // never across a snapshot's line
        for (const y of rows) {
          if (placed.some((e) => Math.abs(e.y - y) < 14 && e.x0 < x1 + 12 && e.x1 > x0 - 12)) continue;
          runs(rl, x0, y); break;
        }
      }
      fx.restore();
    }
  }

  /* ---------- 04 (ending 'zoom'): the catch, as in the exploration Peter confirmed ----------
     The camera dives back into Day 2 · 03:14; a reticle locks onto the flagged beat; the beat-shape card lands. */
  const fmtClockS = (t) => { const c = S.clock(t); return 'day ' + c.day + ', ' + c.hms + '.' + Math.floor((t % 1) * 10); };
  // the wide beats dip further below the baseline than the doctor's normal ones: the strip's foot deepens to hold them
  const footY = (uu) => (ZOOM_END() ? lerp(L.bot, Math.max(L.bot, L.base + L.amp * 0.56), seg(uu, K.zoomIn)) : L.bot);
  // The Day 2 episode's marker and photo stay on screen through the whole dive, so the eye has somewhere to hold.
  // As the camera lands the marker rises onto the flagged R peak and opens into the reticle.
  const CATCH = { labelY: 0, photoBottom: 0 };
  let LIFT = 0;
  /* Beat 04 keeps beat 01's baseline until the dive, then lifts the strip so the end frame (the ring and the card
     above, the photo and its time below) sits centred between the top and the line of copy. Beats 01–03 never move. */
  function layoutLift() {
    if (!ZOOM_END()) { L.lift = 0; return; }
    const yR = L.base - S.A[TGT_K] * L.amp * 0.95, foot = L.base + L.amp * 0.56;
    const ph = ANCHOR.rect && LAYERS.photos ? ANCHOR.rect.h : 0, ch = L.cardH = elCallout ? elCallout.offsetHeight : 0;
    if (M2()) { L.lift = 0; return; }   // phone layout 2: the strip stays where beat 01's is; the card sits over the graph
    // the time label: beside the photo, or (photos off) under the strip, where drawCatch writes it
    const photoBot = ph ? foot + 12 + ph : 0, labelBot = ph ? foot + 12 + ph / 2 + 14 + 4 : L.base + L.amp * 0.8 + 20;
    let top = yR - 42, bot = Math.max(photoBot, labelBot);
    if (mobile) bot = Math.max(photoBot, labelBot) + 14 + ch;   // phones: the card stacks under the photo and its time
    else top = Math.min(top, yR - ch / 2);                         // desktop: the card sits beside the beat, centred on its peak
    const c4 = COPY.find((c) => c.el.dataset.k === 'c4');
    const safeTop = mobile ? Math.max(64, L.hudBot + 16) : 88, safeBot = (c4 ? c4.box.t : H * 0.85) - (mobile ? 24 : 40);
    L.lift = Math.max(0, ((top - safeTop) - (safeBot - bot)) / 2);
  }
  // the dive's photo: where it sits on the recorded graph, measured once per layout (an off-screen pass of the photos)
  function measureAnchor() {
    if (!life || !anchor().key) return;
    const save = { s: cam.s, a: cam.a, f: cam.f };
    cam.s = ZEND.s; cam.a = SN.c; cam.f = ZEND.f;
    const off = document.createElement('canvas'); off.width = off.height = 1;
    life.draw(off.getContext('2d'), { W, H, DPR: 1, L, X, span: TOT, kn: 1, alpha: 1, safeTop: mobile ? 124 : 40, safeBottom: L.copyTop - 14,
      matte: rgba(DARK_BG, 1), ink: INK_D, inkD: INK_D, inkL: INK_L, wipe: 0, episodes: epPhotos(), flag: RED, lineAlpha: 0 });
    const r = life.rects.find((q) => q.key === ANCHOR.key);
    if (r) ANCHOR.rect = r;
    Object.assign(cam, save);
  }
  function drawCatch(uu) {
    if (!ZOOM_END() || uu < K.out[0]) return null;
    const k = out3(seg(uu, K.lock));
    const x = X(TGT), yR = L.base - S.A[TGT_K] * L.amp * 0.95;
    const y = lerp(G.evY, yR, k), r = lerp(12, 30, k);
    fx.fillStyle = rgba(RED, 1 - k); fx.beginPath(); fx.arc(x, y, 5, 0, Math.PI * 2); fx.fill();
    fx.strokeStyle = rgba(RED, 1); fx.lineWidth = 1.5; fx.beginPath(); fx.arc(x, y, r, 0, Math.PI * 2); fx.stroke();
    if (k > 0.003) {
      fx.globalAlpha = k; fx.lineWidth = 1; fx.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { fx.moveTo(x + dx * (r + 4), y + dy * (r + 4)); fx.lineTo(x + dx * (r + 12), y + dy * (r + 12)); }
      fx.stroke(); fx.globalAlpha = 1;
    }
    // the photo (below the graph, where the episodes' photos sit), following its beat in x; as the ECG appears it
    // settles just under the strip, and the moment's time is written beside it
    const an = anchor(), kz = inout(seg(uu, K.zoomIn)), foot = L.base + L.amp * 0.56;
    let pw = 0, ph = 0, py = foot + 12;
    if (life && an.key && LAYERS.photos) {
      pw = an.rect ? an.rect.w : 57.6; ph = an.rect ? an.rect.h : pw / 0.8;
      const y0 = an.rect ? an.rect.y : L.base + 44;
      py = lerp(y0, Math.max(y0, foot + 12), kz);
      life.drawOne(fx, { W, H, L, DPR, flag: RED, flagText: FLAGT, matte: rgba(DARK_BG, 1) }, an.key, x, py, pw, ph,
        { xt: x, leadTo: lerp(L.base + 4, py - 8, kz), name: 'Unfelt, asleep', capA: 1 - k });
    }
    if (k > 0.003 && !M2()) {
      const lx = pw ? x + pw / 2 + 14 : x, al = pw ? 'left' : 'center', ly = pw ? py + ph / 2 - 2 : L.base + L.amp * 0.8;
      txt(fx, fmtClockS(TGT), lx, ly, MONO(11), rgba(RED, k), al, '0.02em');
      txt(fx, 'asleep, no symptoms', lx, ly + 16, MONO(11), rgba(GREY3, k), al, '0.02em');
      CATCH.labelY = ly + 16;
    }
    CATCH.photoBottom = py + ph;
    return { x, y, r, A: k };
  }
  function updateCallout(uu, ret) {
    if (!elCallout) return;
    const ca = ZOOM_END() ? seg(uu, [K.lock[0] + 0.04, K.lock[1]]) : 0;
    elCallout.style.visibility = ca > 0.003 ? 'visible' : 'hidden';
    if (ca <= 0.003 || !ret) return;
    const cw = elCallout.offsetWidth, ch = elCallout.offsetHeight;
    if (Math.abs(ch - (L.cardH || 0)) > 1) layoutLift();   // the card's real height (its fonts load late): re-balance the end frame
    const m2 = M2(), top2 = Math.max((L.hudBot || 0) + 12, ret.y - LIFT - ret.r - 2);
    const cx = m2 ? clamp(ret.x + ret.r + 14, 12, W - cw - 12) : mobile ? Math.round((W - cw) / 2) : clamp(ret.x + ret.r + 28, 20, W - cw - 24);
    // desktop: right beside the flagged beat, centred on its R peak; phones: under the photo and its time
    const cy = m2 ? Math.round(Math.min(top2, L.base - ch - 8)) : mobile ? clamp(Math.max(CATCH.labelY, CATCH.photoBottom) - LIFT + 14, 16, H - ch - 16) : clamp(ret.y - LIFT - ch / 2, 24, H - ch - 24);
    const k = out3(ca);
    elCallout.style.opacity = ca.toFixed(3);
    elCallout.style.transform = 'translate3d(' + (cx + (1 - k) * 16).toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    if (!mobile) {
      fx.strokeStyle = rgba(RED, 0.6 * ca * ret.A); fx.lineWidth = 1; fx.setLineDash([3, 4]);
      fx.beginPath(); fx.moveTo(ret.x + ret.r + 2, ret.y); fx.lineTo(cx + (1 - k) * 16, ret.y); fx.stroke(); fx.setLineDash([]);
    }
  }
  function fillCallout() {   // the card's two little beats, drawn from the same beat model as everything else
    const mini = (type, w, h) => { let d = ''; for (let i = 0; i <= 160; i++) { const p = -0.42 + (1.14 * i) / 160; d += (i ? 'L' : 'M') + ((i / 160) * w).toFixed(1) + ',' + (h * 0.62 - S.beatShape(p, 0.9, type) * h * 0.5).toFixed(1); } return d; };
    const n = $('co-path-n'), v = $('co-path-v');
    // the moment, inside the card (phone layout 2 shows it there instead of under the strip)
    if (elCallout && !elCallout.querySelector('.ak-when')) {
      const p = document.createElement('p'); p.className = 'ak-when'; p.innerHTML = '<b>' + fmtClockS(TGT).replace(/\.\d$/, '') + '</b><br>asleep, no symptoms';
      const h4 = elCallout.querySelector('h4'); if (h4) h4.after(p); else elCallout.prepend(p);
    }
    if (n) n.setAttribute('d', mini(0, 110, 40));
    if (v) v.setAttribute('d', mini(1, 110, 40));
  }

  /* ---------- 03: v1's recorded graph ----------
     Lifted from v1 (js/narrative.js: layout's tagY, the recorded side of drawTimeline, drawGrid, drawAxis, the captured
     branch of drawEvents, drawTrend, drawSweepHead), not redrawn. What changed:
       · it sits on beat 02's graph: same baseline (the box bottom) and the same bpm scale as the dark side
       · v1's grey band of every beat is gone; its time axis sits on the baseline and also serves the dark side
       · its tags are the photos' own moments (storyTags), so the photos and the annotations tell one story
       · captured episodes read FLAGGED; the REC chip sits where v2 keeps it clear of the photos */
  const G = {};
  const V1 = () => !!GRAPH.v1Graph;
  const gY = (hr) => lerp(G.hrBase, G.hrTop, (hr - 40) / 120);   // v1's hrY
  const XF = (t) => L.px0 + (t / TOT) * L.pw;                    // v1's full-view X (72 h)
  const graphA = (uu) => (V1() ? lsm(6 * 3600, 36 * 3600, cam.s) * (1 - seg(uu, K.out)) : 0);

  function layoutGraph() {
    G.hrBase = L.base;                          // 40 bpm on the baseline, as on the dark side
    G.hrTop = L.base - 120 * L.hrScale;         // 160 bpm: v2's px-per-bpm, so both sides share one scale
    G.axis = L.base;                            // v1's axis line, on the baseline (dashed ahead of the sweep, solid behind)
    G.axisY = G.axis + 13; G.lblY = G.axis + 45;   // v1's offsets from its axis line
    G.evY = L.base;                             // episode markers where beat 02 drew them
    G.tags = storyTags();
    // the moments row: one label per photo moment, kept only where it fits; the episodes' moments win the space
    {
      fx.font = SANS(mobile ? 12 : 14, 500);
      const cand = G.tags.filter((tg) => !tg.snap).map((tg) => ({ t: tg.t, label: tg.label, x: XF(tg.t), ep: S.EVENTS.some((e) => Math.abs(e.t - tg.t) < 3600) }));
      cand.forEach((r) => { r.w = fx.measureText(r.label).width; });
      const kept = [], gap = 18, sx = XF(SN.c);
      for (const r of cand.slice().sort((a, b) => b.ep - a.ep)) {
        const l = r.x - r.w / 2, rr = r.x + r.w / 2;
        if (l < L.px0 - 20 || rr > L.px0 + L.pw + 20) continue;
        if (Math.abs(r.x - sx) < r.w / 2 + 90) continue;   // clear of the doctor's-visit label by the sliver
        if (kept.some((k) => l < k.x + k.w / 2 + gap && k.x - k.w / 2 - gap < rr)) continue;
        kept.push(r);
      }
      G.row = kept.sort((a, b) => a.t - b.t);
    }

    // tag label heights: sit above the local trend, and step up when a neighbour is too close.
    // (v1 compared anchor x only; with more tags, right-aligned labels need their real extent)
    const tw = (str) => { ctx.font = MONO(10, 600); if (hasLS) ctx.letterSpacing = '0.07em'; const w = ctx.measureText(str.toUpperCase()).width; if (hasLS) ctx.letterSpacing = '0px'; return w; };
    G.tagY = [];
    const placed = [];
    G.tags.forEach((tg, i) => {
      const x = XF(tg.t), h = Math.min(71, Math.floor(tg.t / 3600));
      const w = Math.max(tw(tg.label), tw(tg.hr + ' BPM'));
      const x0 = x > L.px0 + L.pw * 0.84 ? x - 7 - w : x + 7, x1 = x0 + w;
      let y = Math.min(gY(S.hrHour[h]), gY(tg.hr)) - 24;
      for (let pass = 0; pass < 4; pass++) {
        const hit = placed.find((p) => p.x0 < x1 + 14 && x0 < p.x1 + 14 && Math.abs(p.y - y) < 30);
        if (!hit) break;
        y = hit.y - 32;
      }
      y = Math.max(G.hrTop - 6, y);
      if (!tg.snap) placed.push({ x0, x1, y });
      G.tagY[i] = y;
    });
  }

  // The annotations on paper are the photos' own moments: each photo the sweep wipes off leaves its moment behind,
  // labelled with the heart rate it was lived at. Photos within 90 min of each other are one moment (the most
  // important one names it); the two photos at the doctor's are the 10 s itself.
  function storyTags() {
    if (!life || !life.cards.length) return S.TAGS;
    const RANK = { L: 3, M: 2, S: 1 };
    const groups = [];
    for (const c of life.cards.slice().sort((a, b) => a.t - b.t)) {
      const g = groups[groups.length - 1];
      if (g && c.t - g[g.length - 1].t < 5400) g.push(c); else groups.push([c]);
    }
    return groups.map((g) => {
      if (g.some((c) => c.side)) return S.TAGS.find((tg) => tg.snap);
      const c = g.reduce((a, b) => (RANK[b.imp] > RANK[a.imp] ? b : a));
      return { t: c.t, label: c.label, hr: Math.round(S.meanHR(c.t - 180, c.t + 180)) };
    });
  }

  // v1's time grid (vertical part of drawGrid), paper side only
  const LV = [0.04, 0.2, 1, 5, 15, 60, 300, 900, 3600, 10800, 21600, 86400];
  function drawGridV1(uu, wipe) {
    if (!LAYERS.grid) return;
    const vA = graphA(uu);
    if (vA <= 0.003 || wipe <= 0) return;
    const spp = cam.s / L.pw;
    const y0 = H * 0.05, y1 = H * 0.95;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.min(W, wipe), H); ctx.clip();
    ctx.lineWidth = 1 / DPR;
    const ca = 0.62;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, rgba(OR, 0)); g.addColorStop(0.2, rgba(OR, ca)); g.addColorStop(0.8, rgba(OR, ca)); g.addColorStop(1, rgba(OR, 0));
    ctx.strokeStyle = g;
    const tl = Math.max(0, TX(-2)), tr = Math.min(TOT, TX(W + 2));
    for (const lv of LV) {
      const p = lv / spp;
      if (p < 2.5) continue;
      const k0 = Math.ceil(tl / lv), k1 = Math.floor(tr / lv);
      if (k1 - k0 > 1200) continue;
      ctx.globalAlpha = vA * sm(2.5, 10, p) * 0.12;
      ctx.beginPath();
      for (let k = k0; k <= k1; k++) { const x = px(X(k * lv)); ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // back canvas, paper side: nights and captured episodes (v1's band of every beat is no longer drawn)
  function drawGraphBack(uu, wipe) {
    const A = graphA(uu);
    if (A <= 0.003 || wipe <= 0) return;
    const sT = sweepT(uu);
    const xs = X(0), xe = X(TOT);
    const zo = sm(4 * 3600, 30 * 3600, cam.s);
    const th = { dark: false, ink: INK_L };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.min(W, wipe), H); ctx.clip();
    // nights: the full height of the graph box
    if (zo > 0.003) {
      const top = L.top;
      for (const [a, b] of S.NIGHTS) {
        const x0 = Math.max(xs, X(a)), x1 = Math.min(xe, X(b));
        if (x1 <= x0) continue;
        ctx.globalAlpha = A * zo;
        ctx.fillStyle = th.dark ? 'rgba(0,0,0,0.3)' : rgba(NIGHT, NIGHT_A);
        ctx.fillRect(x0, top, x1 - x0, L.base - top);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (!PLATE && LAYERS.episodes) drawEventsV1(A, sT, uu);
  }

  // lineA: the axis line itself (0 on the dark side, where the dashed line of life is the baseline)
  function drawAxis(th, A, avoidX, avoid, lineA = 1) {
    const spp = cam.s / L.pw;
    const LVL = [1, 5, 15, 60, 300, 900, 3600, 10800, 21600, 43200, 86400];
    const minPx = mobile ? 66 : 92;
    let lv = 86400;
    for (const l of LVL) if (l / spp >= minPx) { lv = l; break; }
    const daysOnly = cam.s > 1.5 * 86400;   // at the three-day view only the days are named; finer ticks stay, unlabelled
    const tl = Math.max(0, TX(-20)), tr = Math.min(TOT, TX(W + 20));
    const k0 = Math.ceil(tl / lv), k1 = Math.floor(tr / lv);
    const ax = G.axis;
    ctx.globalAlpha = 1; ctx.lineWidth = 1 / DPR;
    ctx.strokeStyle = rgba(th.ink, 0.22 * A * lineA);
    ctx.beginPath(); ctx.moveTo(Math.max(X(0), 0), px(ax)); ctx.lineTo(Math.min(X(TOT), W), px(ax)); ctx.stroke();
    ctx.beginPath();
    for (let k = k0; k <= k1; k++) { const x = px(X(k * lv)); ctx.moveTo(x, ax); ctx.lineTo(x, ax + ((k * lv) % 86400 === 0 ? 9 : 5)); }
    ctx.strokeStyle = rgba(th.ink, 0.4 * A); ctx.stroke();
    for (let k = k0; k <= k1; k++) {
      const t = k * lv, x = X(t);
      if (avoid && Math.abs(x - avoidX) < 74) continue;
      const isDay = t % 86400 === 0, c = S.clock(t);
      if (daysOnly && !isDay) continue;
      if (M2() && (x < 24 || x > W - 24)) continue;   // centred labels the screen's edge would cut (the view bleeds on phones)
      const label = isDay ? (t >= TOT ? '72 H' : 'DAY ' + c.day) : lv < 60 ? c.hms : c.hm;
      const al = mobile && t <= 0 ? 'left' : mobile && t >= TOT ? 'right' : 'center';
      txt(ctx, label, al === 'left' ? x - 2 : al === 'right' ? x + 2 : x, G.axisY + 12, MONO(mobile ? 11 : 10, isDay ? 600 : 500), rgba(th.ink, (isDay ? 0.85 : 0.42) * A), al);
    }
  }

  // v1's captured branch; ahead of the sweep the episode is v2's (drawEpisodes). The tag above already says
  // "asleep", so the unfelt episode says what the snapshot could never have heard about.
  function drawEventsV1(A, sT, uu) {
    // neighbours too close to centre both labels (phones): splay them apart, each hanging away from the other
    const lf = SANS(mobile ? 13 : 15, 500), name = (e) => (e === EV ? 'Unfelt, asleep' : e.label);
    ctx.font = lf; const wd = S.EVENTS.map((e) => ctx.measureText(name(e)).width), al = S.EVENTS.map(() => 'center');
    for (let i = 1; i < S.EVENTS.length; i++) if (X(S.EVENTS[i].t) - X(S.EVENTS[i - 1].t) < (wd[i] + wd[i - 1]) / 2 + 16) { al[i - 1] = 'right'; al[i] = 'left'; }
    S.EVENTS.forEach((e, i) => {
      const x = X(e.t);
      if (x < -80 || x > W + 80) return;
      const a = A;
      if (a <= 0.003 || sT <= e.t) return;
      if (e === EV && ZOOM_END() && uu >= K.out[0]) return;   // held through the dive by drawCatch
      const y = G.evY, c = S.clock(e.t);
      const ly = G.lblY;
      const ck = clamp((sT - e.t) / (TOT * 0.05));
      // the episodes are the point of the white side: a bigger mark, and two words, no timestamp
      ctx.globalAlpha = a; ctx.fillStyle = rgba(RED, 1); ctx.strokeStyle = rgba(RED, 1); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = a * (1 - ck); ctx.beginPath(); ctx.arc(x, y, 12 + 40 * out3(ck), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      if (life) return;   // the episode's photo carries its name and the flag
      const lx = x + (al[i] === 'right' ? 8 : al[i] === 'left' ? -8 : 0);
      txt(ctx, name(e), lx, ly - 2, lf, rgba(INK_L, 0.9 * a), al[i], '0px');
      txt(ctx, 'FLAGGED', lx, ly + 15, MONO(10.5, 600), rgba(RED, a), al[i]);
    });
  }

  // Drawn on the front canvas so the hourly means sit on top of the per-beat particle cloud.
  function drawTrend(c, uu, wipe) {
    if (uu < K.sweep[0] || life) return;   // with photos, the photos are the moments
    const A = graphA(uu);
    if (A <= 0.003) return;
    const sT = sweepT(uu);
    const xs = X(0), xr = Math.min(wipe, X(TOT));
    if (xr <= xs) return;
    c.save();
    c.beginPath(); c.rect(0, 0, Math.max(0, wipe), H); c.clip();
    // one row of daily-life moments, always at the same height (so the eye reads one line), each with a faint guide
    // down to its moment; the episodes' moments are guided in orange to their flagged marks on the baseline
    const rowY = G.hrTop - 30;
    for (const r of G.row) {
      if (r.t > sT) continue;
      const pk = out3(clamp((sT - r.t) / (TOT * 0.025)));
      c.globalAlpha = A * pk * (r.ep ? 0.55 : 0.22); c.strokeStyle = rgba(r.ep ? RED : INK_L, 1); c.lineWidth = 1; c.setLineDash([1, 3]);
      c.beginPath(); c.moveTo(px(r.x), rowY + 8); c.lineTo(px(r.x), G.axis - (r.ep ? 14 : 2)); c.stroke(); c.setLineDash([]);
      c.globalAlpha = 1;
      txt(c, r.label, r.x, rowY + (1 - pk) * 6, SANS(mobile ? 12 : 14, 500), rgba(INK_L, 0.88 * A * pk), 'center', '0px');
    }
    c.restore();
    c.globalAlpha = 1;
  }

  function drawSweepHead(uu, wipe) {
    if (uu <= K.sweep[0] || uu >= K.sweep[1]) return;
    const x = wipe;
    const g = fx.createLinearGradient(x - 90, 0, x + 4, 0);
    g.addColorStop(0, rgba(OR, 0)); g.addColorStop(0.92, rgba(OR, 0.16)); g.addColorStop(1, rgba(OR, 0));
    fx.fillStyle = g; fx.fillRect(x - 90, 0, 94, H);
    fx.strokeStyle = rgba(OR, 1); fx.lineWidth = 1.5;
    fx.beginPath(); fx.moveTo(x, 0); fx.lineTo(x, H); fx.stroke();
    const t = sweepT(uu), c = S.clock(Math.min(t, TOT - 1));
    const flip = x > W - 230, al = flip ? 'right' : 'left', dx = flip ? -12 : 12;
    const y = L.top + 18;                                        // v1: max(96, hrTop − 92), which lands on the photos above
    const blink = 0.55 + 0.45 * Math.sin(time * 6);
    fx.fillStyle = rgba(OR, blink);
    fx.beginPath(); fx.arc(x + (flip ? -16 : 16), y - 4, 3.5, 0, Math.PI * 2); fx.fill();
    txt(fx, 'REC', x + dx + (flip ? -12 : 12), y, MONO(10.5, 600), rgba(OR, 1), al);
    const ink = flip ? INK_L : INK_D;
    txt(fx, 'DAY ' + c.day, x + dx, y + 16, MONO(10.5), rgba(ink, 0.85), al);
  }

  /* ---------- every beat, one dot (WebGL) ---------- */
  const GL = (() => {
    const gl = cvGL.getContext('webgl', { preserveDrawingBuffer: PLATE, alpha: true, antialias: false, premultipliedAlpha: true, depth: false, stencil: false });
    if (!gl) return null;
    const VS = `
      precision highp float;
      attribute vec4 aA;   // hour, seconds in hour, amplitude, instantaneous heart rate
      attribute vec2 aB;   // ectopic flag, seed
      attribute vec2 aC;   // its place on the superimposed heartbeat: phase from the R peak, value
      uniform float uMorph, uSwirl, uFormA; uniform vec4 uForm;
      uniform vec3 uInkRec, uRedC;   // ink and red on the recorded side
      uniform vec2 uRes; uniform float uDpr, uLift;
      uniform float uRefH, uRefS, uSpan, uF, uX0, uPW;
      uniform float uBase, uAmp, uHrScale, uHrMix, uTop, uAxis;
      uniform float uSnap0, uSnap1, uHead, uSweep, uRise, uTotal;
      uniform float uWipe, uFlag, uAlphaN, uSize, uFade;
      uniform float uGhost, uGhostA, uTime, uCloud, uTrace, uTraceOn;
      uniform float uCSize, uCRing, uCSpread, uCLo, uCHi, uCEdge, uCShim, uCShimSpd, uCJit, uCDens, uCShape;
      uniform vec3 uCTint;
      uniform float uMag, uMagR, uMagPull, uMagGlow;
      uniform float uV1, uRBase, uRScale, uRTop, uFlagV1, uFlagRise;
      varying float vShape;
      varying vec4 vCol;
      varying float vRing;
      void main() {
        float d = (aA.x - uRefH) * 3600.0 + (aA.y - uRefS);
        float x = uX0 + (uF + d / uSpan) * uPW;
        float tAbs = aA.x * 3600.0 + aA.y;
        float isF = aB.x;
        float pinY = uBase - aA.z * uAmp * mix(1.0, 0.95, isF);
        // beat 02: 72 bpm sits at R-peak height so the 10 s dots hold still through the zoom.
        // From the recording on, the axis eases to linear (40 → 165 bpm) so the trend keeps its true shape.
        float hrPiece = aA.w <= 72.0 ? mix(uBase, uBase - uAmp, clamp((aA.w - 40.0) / 32.0, 0.0, 1.0)) : mix(uBase - uAmp, uTop, clamp((aA.w - 72.0) / 93.0, 0.0, 1.0));
        float hrV1 = max(uRTop - 46.0, uRBase - (aA.w - 40.0) * uRScale);   // v1's hrY, with its ceiling
        float hrLin = mix(uBase - clamp(aA.w - 40.0, 0.0, 125.0) * uHrScale, hrV1, uV1);
        float hrYv = mix(hrPiece, hrLin, uAxis);
        float yT = mix(pinY, hrYv, uHrMix);
        // recorded: the doctor's 10 s (once drawn) + everything the sweep has passed
        float snapV = step(uSnap0, tAbs) * step(tAbs, min(uSnap1, uHead));
        float recV = clamp((uSweep - tAbs) / 240.0, 0.0, 1.0);
        float vis = max(snapV, recV);
        // unrecorded: the beat still happened, but its value is unknown. Up close it sits where the
        // waveform would be; zoomed out it dissolves into a uniform cloud of possibilities.
        // independent hashes, so thinning the cloud (density) never stripes its vertical distribution
        float hD = fract(sin(aB.y * 12.9898 + 4.1) * 43758.5453);
        float hA = fract(sin(aB.y * 78.233 + 1.7) * 43758.5453), hB = fract(sin(aB.y * 39.425 + 9.2) * 43758.5453);
        float ghost = uGhost * (1.0 - vis) * step(hD, uCDens);
        float rU = hA, rT = (hA + hB) * 0.5;   // uniform vs triangular (soft edges)
        float yRand = uBase - (uCLo - 40.0 + (uCHi - uCLo) * mix(rU, rT, uCEdge)) * uHrScale;
        float yG0 = mix(yT, yRand, uHrMix * uCSpread);
        float n = sin(uTime * 0.55 * uCShimSpd + aB.y * 61.0) * 0.6 + sin(uTime * 1.25 * uCShimSpd + aB.y * 17.0) * 0.4;
        float yG = yG0 + n * uCShim * (0.25 + 0.75 * uHrMix);
        // recording resolves the cloud: each beat settles from its unknown position onto its true value
        // The sweep as a magnet: within uMagR px ahead of the head, muddy dots are pulled toward the line
        // (harder the closer they get) and begin lining up toward their true value; behind it they spring into place.
        float dxh = x - uWipe;
        float kM = uMag * (1.0 - vis) * step(0.0, dxh) * pow(clamp(1.0 - dxh / uMagR, 0.0, 1.0), 2.0);
        float rk = max(snapV, clamp((uSweep - tAbs) / uRise, 0.0, 1.0));
        // The beats that break the pattern skip the magnet and keep v1's motion: born on the baseline, red from the
        // first frame, rising with the same overshoot over as much scroll as v1 gave them (uFlagRise). Being premature,
        // they sit far above the trend, so they fly ~2.6x farther than the beats around them.
        float fV1 = isF * uFlagV1;
        rk = mix(rk, max(snapV, clamp((uSweep - tAbs) / uFlagRise, 0.0, 1.0)), fV1);
        float rm = rk - 1.0;
        float yBase0 = mix(uBase, uRBase, uV1);
        // with the faded trace, a normal beat is already where it belongs: the sweep only brings it to full strength
        float yStart = mix(mix(uCloud < 0.5 ? yBase0 : (uCloud < 1.5 ? yG0 : mix(yG0, yT, 0.6)), yT, uTraceOn), yBase0, fV1);
        float yRec = mix(yStart, yT, 1.0 + 2.4 * rm * rm * rm + 1.4 * rm * rm);
        float xG = x + sin(uTime * 0.4 * uCShimSpd + aB.y * 37.0) * uCJit;
        float useRec = clamp(vis * 4.0, 0.0, 1.0);
        vec2 gP = vec2(mix(xG, uWipe + 1.5, kM * uMagPull), mix(yG, yT, kM * 0.6));
        // v1's recorded look (uV1): about 1 in 7 normal beats, 0.17 alpha, each nudged by a fixed gaussian-ish jitter
        float j1 = fract(sin(aB.y * 93.989 + 2.3) * 43758.5453) + fract(sin(aB.y * 27.61 + 5.9) * 43758.5453) + fract(sin(aB.y * 51.17 + 7.7) * 43758.5453) - 1.5;
        float j2 = fract(sin(aB.y * 11.13 + 3.1) * 43758.5453) + fract(sin(aB.y * 67.71 + 8.3) * 43758.5453) + fract(sin(aB.y * 45.33 + 6.1) * 43758.5453) - 1.5;
        vec2 jit = vec2(j1 * 1.0, j2 * 1.4) * uV1 * (1.0 - snapV);
        float keep = max(max(snapV, isF), step(hD, mix(1.0, 0.142, uV1)));
        gP = mix(gP, vec2(x, yT) + jit, uTraceOn);   // faded trace: unrecorded beats sit at their true value
        vec2 p = mix(gP, vec2(x, yRec) + jit, useRec);
        float fl = isF * max(max(clamp((uSweep - tAbs) / (uRise * 0.6), 0.0, 1.0), uFlagV1 * recV), clamp(uFlag * 1.6 - (tAbs / uTotal) * 0.6, 0.0, 1.0));   // flagged as it is recorded
        vec3 ink = p.x < uWipe ? uInkRec : vec3(0.953, 0.925, 0.89);
        vec3 col = mix(ink, uRedC, fl);
        float a = vis * mix(mix(uAlphaN, 0.17, uV1) * keep, 1.0, snapV) * uFade;
        // the faded trace: every beat not yet recorded, dimmed; the flagged ones stay hidden until the sweep reveals them
        a = max(a, uTrace * (1.0 - vis) * (1.0 - isF) * mix(uAlphaN, 0.17, uV1) * keep * uFade);
        a = max(a, fl * vis * 0.95 * uFade);
        float ga = ghost * uGhostA * uFade * (1.0 + kM * uMagGlow * 6.0);
        vRing = step(a, ga);
        a = max(a, ga);
        float sz = uSize * (1.0 + fl * mix(1.3, 0.5, uV1)) * mix(1.0, 1.35, snapV);
        // beat 04: every beat leaves its moment and lands on one heartbeat, each on its own timing (v1's swirl).
        // The beats v1's look left out fade in on the way; the doctor's 12 turn orange; the flagged ones stay red.
        if (uMorph > 0.0) {
          float hM = fract(sin(aB.y * 17.17 + 3.3) * 43758.5453), s0 = hM * 0.42;
          float e = smoothstep(s0, s0 + 0.58, uMorph);
          vec2 pF = vec2(uForm.x + (aC.x - 0.16) * uForm.z, uForm.y - aC.y * uForm.w);
          float ang = hA * 6.2831853 + e * 2.4;
          p = mix(p, pF, e) + vec2(cos(ang), sin(ang)) * sin(3.14159265 * e) * (12.0 + 64.0 * hM) * uSwirl;
          a = mix(a, mix(uFormA, 0.85, isF), e); a = mix(a, 1.0, snapV * e);
          sz = mix(sz, mix(1.1, 4.4, isF), e); sz = mix(sz, 7.0, snapV * e);   // point sizes are diameters
          col = mix(col, mix(uInkRec, uRedC, isF), e); col = mix(col, vec3(0.969, 0.659, 0.294), snapV * e);
          vRing *= 1.0 - e;
        }
        gl_PointSize = mix(sz, max(sz, uCSize) * (1.0 + kM * uMagGlow * 0.7), vRing) * uDpr;
        vShape = uCShape;
        vec2 c = (p - vec2(0.0, uLift)) / uRes * 2.0 - 1.0;
        gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
        vCol = vec4(mix(col, mix(uCTint, vec3(0.97, 0.66, 0.29), kM * uMagGlow), vRing), a);
      }`;
    const FS = `
      precision mediump float;
      varying vec4 vCol;
      varying float vRing;
      varying float vShape;
      uniform float uCRingF;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.5, 1.0, d)) * vCol.a;
        if (vRing > 0.5) {                                    // the cloud: hollow ring, soft dot or square
          if (vShape < 0.5) a *= smoothstep(1.0 - uCRingF - 0.15, 1.0 - uCRingF + 0.12, d);
          else if (vShape > 1.5) a = vCol.a;
        }
        if (a < 0.003) discard;
        gl_FragColor = vec4(vCol.rgb * a, a);
      }`;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    const U = {};
    ['uRes', 'uDpr', 'uLift', 'uRefH', 'uRefS', 'uSpan', 'uF', 'uX0', 'uPW', 'uBase', 'uAmp', 'uHrScale', 'uHrMix', 'uSnap0', 'uSnap1', 'uHead', 'uSweep', 'uRise', 'uTotal', 'uWipe', 'uFlag', 'uAlphaN', 'uSize', 'uFade', 'uGhost', 'uGhostA', 'uTime', 'uCloud', 'uTrace', 'uTraceOn', 'uTop', 'uAxis', 'uCSize', 'uCRing', 'uCRingF', 'uCSpread', 'uCLo', 'uCHi', 'uCEdge', 'uCShim', 'uCShimSpd', 'uCJit', 'uCDens', 'uCShape', 'uCTint', 'uMag', 'uMagR', 'uMagPull', 'uMagGlow', 'uV1', 'uRBase', 'uRScale', 'uRTop', 'uFlagV1', 'uFlagRise', 'uMorph', 'uSwirl', 'uFormA', 'uForm', 'uInkRec', 'uRedC']
      .forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    // one record per beat
    const A = new Float32Array(S.n * 4), B = new Float32Array(S.n * 2), C = new Float32Array(S.n * 2);
    const rnd = S.mulberry32(5);
    for (let k = 0; k < S.n; k++) {
      const t = S.T[k], h = Math.floor(t / 3600);
      A[k * 4] = h; A[k * 4 + 1] = t - h * 3600; A[k * 4 + 2] = S.A[k]; A[k * 4 + 3] = 60 / S.RR[k];
      B[k * 2] = S.TY[k]; B[k * 2 + 1] = rnd();
    }
    // beat 04: each beat's place on the superimposed heartbeat (v1's arc-length sampling, so the dots draw the
    // shape evenly), scaled by the beat's own amplitude, with v1's small spread
    {
      const sampler = (type, M = 1400) => {
        const P = new Float64Array(M + 1), V = new Float32Array(M + 1), Cc = new Float32Array(M + 1), sx = 970, sy = 216;
        for (let i = 0; i <= M; i++) { P[i] = PH_A + (PH_W * i) / M; V[i] = S.beatShape(P[i], 1, type); if (i) Cc[i] = Cc[i - 1] + Math.hypot((P[i] - P[i - 1]) * sx, (V[i] - V[i - 1]) * sy); }
        return (r, mixU) => {
          if (mixU) { const ph = PH_A + PH_W * r; return [ph, S.beatShape(ph, 1, type)]; }
          const sv = r * Cc[M]; let lo = 0, hi = M;
          while (lo < hi - 1) { const m = (lo + hi) >> 1; if (Cc[m] <= sv) lo = m; else hi = m; }
          const f = (sv - Cc[lo]) / Math.max(1e-9, Cc[hi] - Cc[lo]);
          return [lerp(P[lo], P[hi], f), lerp(V[lo], V[hi], f)];
        };
      };
      const tN = sampler(0), tV = sampler(1), r2 = S.mulberry32(911);
      const gs = () => { let q = 0; while (q === 0) q = r2(); return Math.sqrt(-2 * Math.log(q)) * Math.cos(6.283185 * r2()); };
      let aBar = 0; for (let k = 0; k < S.n; k++) aBar += S.A[k]; aBar /= S.n;
      for (let k = 0; k < S.n; k++) {
        const [ph, v] = (S.TY[k] ? tV : tN)(r2(), r2() < 0.36), tail = r2() < 0.035 ? 4 : 1;
        C[k * 2] = ph + 0.0035 * gs() * tail; C[k * 2 + 1] = v * (S.A[k] / aBar) * (1 + 0.04 * gs()) + 0.013 * gs() * tail;
      }
    }
    [['aA', A, 4], ['aB', B, 2], ['aC', C, 2]].forEach(([n, arr, size]) => {
      const loc = gl.getAttribLocation(prog, n), buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return {
      resize() { cvGL.width = Math.round(W * DPR); cvGL.height = Math.round(H * DPR); gl.viewport(0, 0, cvGL.width, cvGL.height); },
      dispose() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
      draw(p) {
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        if (p.fade <= 0.002) return;
        const refH = Math.floor(cam.a / 3600);
        gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, DPR); gl.uniform1f(U.uLift, LIFT);
        gl.uniform1f(U.uRefH, refH); gl.uniform1f(U.uRefS, cam.a - refH * 3600);
        gl.uniform1f(U.uSpan, cam.s); gl.uniform1f(U.uF, cam.f); gl.uniform1f(U.uX0, L.px0); gl.uniform1f(U.uPW, L.pw);
        gl.uniform1f(U.uBase, L.base); gl.uniform1f(U.uAmp, L.amp); gl.uniform1f(U.uHrScale, L.hrScale); gl.uniform1f(U.uHrMix, p.hrMix); gl.uniform1f(U.uTop, L.top); gl.uniform1f(U.uAxis, p.axis);
        gl.uniform1f(U.uSnap0, SN.t0); gl.uniform1f(U.uSnap1, SN.t1); gl.uniform1f(U.uHead, p.head);
        gl.uniform1f(U.uSweep, p.sweep); gl.uniform1f(U.uRise, Math.max(60, CLOUD.settleHours * 3600)); gl.uniform1f(U.uTotal, TOT);
        gl.uniform1f(U.uWipe, p.wipe); gl.uniform1f(U.uFlag, p.flag); gl.uniform1f(U.uAlphaN, p.alphaN);
        gl.uniform1f(U.uSize, p.size); gl.uniform1f(U.uFade, p.fade);
        gl.uniform1f(U.uGhost, p.ghost); gl.uniform1f(U.uGhostA, p.ghostA); gl.uniform1f(U.uTime, REDUCED ? 0 : time); const rec = CLOUD.on ? CLOUD.recording : 'rise from baseline';
        gl.uniform1f(U.uCloud, rec === 'magnetic' ? 2 : rec === 'settle from cloud' ? 1 : 0);
        gl.uniform1f(U.uTrace, p.trace || 0); gl.uniform1f(U.uTraceOn, GRAPH.before === 'faded trace' ? 1 : 0);
        gl.uniform1f(U.uMag, rec === 'magnetic' && p.sweepOn && GRAPH.before === 'cloud' ? 1 : 0); gl.uniform1f(U.uMagR, CLOUD.magRadius);
        gl.uniform1f(U.uMagPull, CLOUD.magPull); gl.uniform1f(U.uMagGlow, CLOUD.magGlow);
        const tint = hex3(CLOUD.color || '#f3ece3');
        gl.uniform1f(U.uCSize, CLOUD.size); gl.uniform1f(U.uCRingF, CLOUD.ring); gl.uniform1f(U.uCSpread, CLOUD.spread);
        gl.uniform1f(U.uCLo, Math.min(CLOUD.bandLow, CLOUD.bandHigh - 1)); gl.uniform1f(U.uCHi, CLOUD.bandHigh); gl.uniform1f(U.uCEdge, CLOUD.edge);
        gl.uniform1f(U.uCShim, CLOUD.shimmer); gl.uniform1f(U.uCShimSpd, CLOUD.shimmerSpeed); gl.uniform1f(U.uCJit, CLOUD.jitterX);
        gl.uniform1f(U.uCDens, CLOUD.density); gl.uniform1f(U.uCShape, CLOUD.shape === 'soft dot' ? 1 : CLOUD.shape === 'square' ? 2 : 0);
        gl.uniform3f(U.uCTint, tint[0], tint[1], tint[2]);
        gl.uniform1f(U.uMorph, p.morph || 0); gl.uniform1f(U.uSwirl, REDUCED ? 0 : 1); gl.uniform1f(U.uFormA, clamp(0.034 * Math.pow((L.form.w * L.form.amp) / (900 * 216), 0.8), 0.009, 0.034));   // same ink on any screen
        gl.uniform4f(U.uForm, L.form.cx, L.form.cy, L.form.pxps, L.form.amp);
        gl.uniform3f(U.uInkRec, INK_L[0] / 255, INK_L[1] / 255, INK_L[2] / 255); gl.uniform3f(U.uRedC, RED[0] / 255, RED[1] / 255, RED[2] / 255);
        gl.uniform1f(U.uV1, p.v1); gl.uniform1f(U.uFlagV1, GRAPH.flagMotion === 'magnet settle' ? 0 : 1); gl.uniform1f(U.uFlagRise, Math.max(60, GRAPH.flagRiseHours * 3600)); gl.uniform1f(U.uRBase, G.hrBase); gl.uniform1f(U.uRScale, (G.hrBase - G.hrTop) / 120); gl.uniform1f(U.uRTop, G.hrTop);
        gl.drawArrays(gl.POINTS, 0, S.n);
      },
    };
  })();

  /* ---------- DOM ---------- */
  let lastBeat = -2;
  const fmtSpan = (s) => (s < 90 ? s.toFixed(1) + ' s' : s < 5400 ? (s / 60).toFixed(1) + ' min' : s < 172800 ? (s / 3600).toFixed(1) + ' h' : (s / 86400).toFixed(2) + ' days');
  const fmtPct = (v) => (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.01 ? v.toFixed(2) : v.toFixed(4)) + '%';
  const setText = (el, s) => { if (el._t !== s) { el.textContent = s; el._t = s; } };
  const setCls = (el, c, on) => { if (!!el['_' + c] !== on) { el.classList.toggle(c, on); el['_' + c] = on; } };

  function updateDOM(uu, wipe) {
    for (const c of COPY) {
      const [a, b] = c.r, on = uu > a && uu < b;
      c.el.style.visibility = on ? 'visible' : 'hidden';
      if (!on) continue;
      const ink = clamp((uu - a) / 0.22), outK = clamp((uu - (b - 0.12)) / 0.12), n = c.a.words.length;
      for (let i = 0; i < n; i++) {
        const k = out3(clamp(ink * (1 + n * 0.08) - i * 0.08));
        const tr = 'translate3d(0,' + ((1 - k) * 105).toFixed(2) + '%,0)';
        c.a.words[i].style.transform = tr; c.b.words[i].style.transform = tr;
      }
      c.el.style.opacity = (1 - outK).toFixed(3);
      c.el.style.transform = 'translate3d(-50%,' + (-outK * 16).toFixed(1) + 'px,0)';
      c.el.style.filter = outK > 0 ? 'blur(' + (outK * 6).toFixed(1) + 'px)' : 'none';
      const cut = clamp(wipe - c.box.l, 0, c.box.w);
      c.a.layer.style.clipPath = 'inset(0 0 0 ' + cut.toFixed(1) + 'px)';
      c.b.layer.style.clipPath = 'inset(0 ' + (c.box.w - cut).toFixed(1) + 'px 0 0)';
    }
    if (prog) setCls(prog.el, 'on-light', !ALLDARK && wipe > W / 2);   // the progress bar flips as the sweep passes its centre
    if (!hudEl) return;   // the HUD is optional (the packaged section ships without it)
    hudEl.style.opacity = seg(uu, [-0.35, -0.1]).toFixed(3);
    setCls(hudBeat, 'on-light', !ALLDARK && wipe > hudBeat._cx);
    for (const el of hudCells) setCls(el, 'on-light', !ALLDARK && wipe > el._cx);   // each cell as the sweep passes it (on phones the block spans both sides)
    let bi = 0;
    for (let i = 0; i < BEATS.length; i++) if (uu >= BEATS[i][2]) bi = i;
    if (bi !== lastBeat) {
      lastBeat = bi;
      setText(hudIdx, BEATS[bi][0]); setText(hudName, BEATS[bi][1]);
      hudBeat.classList.remove('flip'); void hudBeat.offsetWidth; hudBeat.classList.add('flip');
    }
    const sT = hudSweepT(uu);
    let v2, l2 = 'Beats recorded', l3 = 'Coverage', v3;
    if (uu < K.zoom[0]) {
      v2 = String(clamp(S.idxAt(headT(uu)) - SN.k0 + 1, 0, SN.beats));
      v3 = fmtPct(Math.min(100, (SN.dur / cam.s) * 100));
    } else if (uu < K.sweep[0]) {
      v2 = String(SN.beats);
      v3 = fmtPct(Math.min(100, (SN.dur / cam.s) * 100));
      if (uu > K.zoom[0] + 0.3) v2 = SN.beats + ' of ' + fmtInt(S.n);
    } else {
      v2 = fmtInt(Math.max(SN.beats, sT > 0 ? S.idxAt(sT) + 1 : 0));
      v3 = fmtPct((Math.max(SN.dur, sT) / TOT) * 100);
    }
    setText(rl[1], l2); setText(rv[0], fmtSpan(cam.s)); setText(rv[1], v2); setText(rl[2], l3); setText(rv[2], v3);
    if (rv[3]) {
      const on = uu > K.sweep[0];
      rv[3].parentNode.style.visibility = on ? 'visible' : 'hidden';
      if (on) setText(rv[3], fmtInt(ectBefore(sT)) + ' beats');
    }
  }



  /* ---------- frame ---------- */
  function render() {
    const uu = u;
    updateCamera(uu);
    const wipe = wipeX(uu), white = seg(uu, K.white);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fx.clearRect(0, 0, W, H);
    drawBackground(wipe, white);
    // beat 04: the strip rises during the dive (everything on the canvases and the GL dots together; the copy stays)
    LIFT = ZOOM_END() ? (L.lift || 0) * inout(seg(uu, K.zoomIn)) : 0;
    if (LIFT) { ctx.setTransform(DPR, 0, 0, DPR, 0, -LIFT * DPR); fx.setTransform(DPR, 0, 0, DPR, 0, -LIFT * DPR); }
    drawPaper(uu, wipe);
    updateLife(uu, wipe);
    drawGridV1(uu, wipe);
    if (MOSAIC) drawMosaic(uu, wipe);
    drawLife(uu, wipe);
    if (!PLATE && LAYERS.axis) drawRuler(uu, wipe);
    drawGraphBack(uu, wipe);
    if (!PLATE) drawWindow(uu, wipe);
    drawWave(uu, wipe);
    if (!PLATE) drawLifeLeaders(uu, wipe);
    if (GL) {
      const beatsPerPx = (S.n * (cam.s / TOT)) / L.pw;
      const v1 = V1() ? lsm(6 * 3600, 36 * 3600, cam.s) : 0;   // v1's dot look at the 3-day view, every beat again as the camera dives in
      GL.draw({
        v1, morph: ZOOM_END() ? 0 : seg(uu, K.morph),
        hrMix: hrMix(), head: headT(uu), sweepOn: uu > K.sweep[0] && uu < K.sweep[1], axis: GRAPH.before === 'faded trace' ? 1 : seg(uu, [K.sweep[0] - 0.12, K.sweep[0] + 0.08]) /* the trace keeps the recorded graph's shape throughout */, sweep: sweepGL(uu), wipe, flag: seg(uu, K.flags),
        alphaN: clamp(GRAPH.dotStrength * 1.1 / Math.pow(Math.max(beatsPerPx, 1e-4), 0.55), 0.02, 1),
        size: lerp(5.2, lerp(GRAPH.dotSize, 1.05 * 1.8, v1), lsm(60, 6 * 3600, cam.s)), fade: 1,
        // unrecorded beats: present from the moment the window snaps, gone once recorded
        ghost: GRAPH.before === 'cloud' && CLOUD.on && LAYERS.cloud ? windowA(uu) * (1 - seg(uu, [K.flags[0], K.flags[0] + 0.1])) * lsm(CLOUD.appearFrom, Math.max(CLOUD.appearFrom * 1.01, CLOUD.appearFull), cam.s) : 0,
        // or the faded trace: every beat at its true value, dimmed, from the same moment the cloud would appear
        trace: GRAPH.before === 'faded trace' ? GRAPH.traceStrength * windowA(uu) * lsm(CLOUD.appearFrom, Math.max(CLOUD.appearFrom * 1.01, CLOUD.appearFull), cam.s) : 0,
        // same perceived haze on any screen: normalise by beats per square pixel of the cloud
        ghostA: CLOUD.intensity * clamp(0.026 / Math.max((beatsPerPx * CLOUD.density) / (Math.max(8, CLOUD.bandHigh - CLOUD.bandLow) * L.hrScale), 1e-4), 0.003, 0.24),
      });
    }
    if (!PLATE) drawHead(uu);
    if (!PLATE) drawLollipops(uu, wipe);
    if (!PLATE && V1()) drawTrend(fx, uu, wipe);
    if (!PLATE && LAYERS.sweep) drawSweep(uu, wipe);
    if (!PLATE) drawFlags(uu);
    if (!PLATE) drawLifeLabels(uu, wipe);
    if (!PLATE) drawFormNotes(uu);
    if (!PLATE) updateCallout(uu, drawCatch(uu));
    updateDOM(uu, wipe);
  }

  let last = performance.now(), visible = true, raf = 0, alive = true, io = null, onResize = null;
  const measureU = () => -section.getBoundingClientRect().top / H;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; time += dt;
    if (glide) stepGlide(dt);
    if (STEPPED() && stepState !== 'free') stepFrame(dt);
    else if (REMAP() && !REDUCED) remapFrame(dt);
    else if (REMAP()) u = uTarget = sToU(clamp(measureU(), -1.2, scrollUnits() + 0.4));
    else {
      uTarget = clamp(measureU(), -1.2, UNITS + 0.4);
      if (REDUCED) u = uTarget;
      else { u += (uTarget - u) * (1 - Math.exp(-dt * 7.5)); if (Math.abs(uTarget - u) < 1e-4) u = uTarget; }
    }
    if (visible) { render(); updateProg(u); }
    if (tunerNav) tunerNav.u = Math.round(u * 1000) / 1000;
    if (alive) raf = requestAnimationFrame(frame);
  }
  // Review helper: AK.jump(1.8) lands on any moment (also ?u=1.8 in the URL).
  function jump(v) { if (STEPPED()) { stepState = 'free'; play = null; stopIdx = -1; manual = true; queued = null; } if (REMAP()) { snapManual = true; glide = null; sV = null; tauV = null; rest = restOf(v); } window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY + (REMAP() ? uToS(v) : v) * H); u = uTarget = v; render(); }
  function destroy() {
    alive = false; cancelAnimationFrame(raf);
    if (io) io.disconnect();
    for (const [t, type, fn, o] of LISTEN.splice(0)) t.removeEventListener(type, fn, o);
    clearTimeout(snapT); glide = null;
    if (GL && GL.dispose) GL.dispose();
  }
  // Review: where everything sits on screen right now (CSS px), for laying out comps over a ?plate render
  function geom() {
    const d = (t) => +X(t).toFixed(1);
    return {
      W, H, mobile, L: { px0: L.px0, pw: L.pw, top: L.top, base: L.base, bot: L.bot, boxH: L.boxH },
      days: [0, 1, 2, 3].map((k) => d(k * 86400)), sliver: { x0: d(SN.t0), x1: d(SN.t1), cx: d(SN.c) }, alert: d(ALERT.t),
      events: S.EVENTS.map((e) => ({ x: d(e.t), label: e === EV ? 'Unfelt, asleep' : e.label, main: e === EV })),
      nights: S.NIGHTS.map(([a, b]) => [d(a), d(b)]),
      row: (G.row || []).map((r) => ({ x: +r.x.toFixed(1), label: r.label, ep: r.ep })),
      photos: life && life.rects ? life.rects : [],
      copy: COPY.map((c) => ({ k: c.el.dataset.k, ...c.box })), G: { evY: G.evY, lblY: G.lblY, axisY: G.axisY, hrTop: G.hrTop },
    };
  }
  const layerCSS = document.createElement('style'); (root.head || root).appendChild(layerCSS);
  const m2CSS = document.createElement('style'); (root.head || root).appendChild(m2CSS);
  m2CSS.textContent = `.ak-when{display:none}
    .m2 .ak-catch{width:224px;padding:10px 12px 9px;border-radius:8px}
    .m2 .ak-catch h4{margin:0 0 1px;font-size:13px}
    .m2 .ak-when{display:block;margin:0 0 4px;font:400 10px/1.35 'Geist Mono',ui-monospace,monospace;letter-spacing:.02em;color:#6b6460}
    .m2 .ak-when b{font-weight:500;color:#c25200}
    .m2 .ak-row{gap:8px;margin-top:1px;font-size:10px}
    .m2 .ak-row svg{width:56px;height:22px}
    .m2 .ak-flag{gap:7px;margin-top:6px;padding-top:6px;font-size:10px;letter-spacing:.04em}`;
  function applyLayers() {
    layerCSS.textContent = (LAYERS.copy ? '' : '.copy{opacity:0!important}') + (LAYERS.hud ? '' : '.hud{display:none!important}') + (LAYERS.card ? '' : '.ak-catch{display:none!important}');
  }
  applyLayers();
  if (Q.get('hud') === '0') { const st = document.createElement('style'); st.textContent = '.hud{display:none!important}'; (root.head || root).appendChild(st); }
  if (PLATE) { const st = document.createElement('style'); st.textContent = '.copy,.hud,.grain,.ak-catch{display:none!important}'; (root.head || root).appendChild(st); }
  // plan(): the stepped frames, curves and idle-compressed paths, for the video recorder (tools/record-video.mjs)
  let readyRes = null;
  const ready = new Promise((r) => { readyRes = r; });
  const api = { ready, jump, destroy, get u() { return u; }, K, life, G, GRAPH, geom, plan: () => ({ stops: stops(), units: UNITS, pace: PACE, map: playMap, eases: EASES, subs: SUBS(), path: scenePath, scenes: scenes() }) };

  // ?tune: a live panel for the uncertainty cloud, on the real renderer (all ~296k beats, GPU).
  let tunerNav = null;
  function buildTuner() {
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.umd.min.js';
    // the page's own .title style (display type) would leak into lil-gui's folder titles
    const st = document.createElement('style');
    st.textContent = '.lil-gui .title{font:600 11px/var(--title-height) var(--font-family);letter-spacing:.04em;margin:0;text-transform:uppercase}.lil-gui.root{--width:300px;--font-family:"Geist Mono",ui-monospace,monospace;--background-color:rgba(17,13,10,.94);--title-background-color:#1d1712;--widget-color:#2a221b;--hover-color:#3a2f25;--focus-color:#4a3c2f;--number-color:#f7a84b;max-height:calc(100vh - 16px);overflow-y:auto}';
    document.head.appendChild(st);
    sc.onload = () => {
      const gui = new lil.GUI({ title: 'Parallax studio' });
      gui.domElement.style.zIndex = 50;
      const save = () => { try { localStorage.setItem('ak-cloud-v1', JSON.stringify(CLOUD)); localStorage.setItem('ak-graph-v1', JSON.stringify(GRAPH)); } catch (e) { /* storage blocked */ } };
      tunerNav = { u: u };
      const actions = {
        'Copy settings (JSON)': () => {
          const json = JSON.stringify({ cloud: CLOUD, graph: GRAPH, pace: PACE }, null, 2);
          (navigator.clipboard ? navigator.clipboard.writeText(json) : Promise.reject()).then(() => alert('Cloud settings copied'), () => console.log(json));
        },
        'Reset all': () => { Object.assign(CLOUD, CLOUD_DEFAULTS, opts.cloudCfg || {}); Object.assign(GRAPH, GRAPH_DEFAULTS); Object.assign(PACE, PACE_DEFAULTS); applyPace(true); layoutGraph(); gui.controllersRecursive().forEach((c) => c.updateDisplay()); save(); try { localStorage.setItem('ak-pace-v3', JSON.stringify(PACE)); } catch (e) { /* storage blocked */ } },
      };
      // Hide the panel to see the experience clean: H toggles it, and a faint pill (top right) brings it back
      const pill = document.createElement('button');
      pill.type = 'button'; pill.textContent = 'Tuner · H';
      pill.style.cssText = 'position:fixed;top:10px;right:10px;z-index:51;display:none;font:500 11px/1 "Geist Mono",ui-monospace,monospace;letter-spacing:.06em;padding:8px 11px;border-radius:999px;border:1px solid rgba(243,236,227,.22);background:rgba(17,13,10,.6);color:#f3ece3;cursor:pointer;opacity:.35;transition:opacity .2s';
      pill.onmouseenter = () => { pill.style.opacity = '1'; }; pill.onmouseleave = () => { pill.style.opacity = '.35'; };
      document.body.appendChild(pill);
      let hidden = false;
      const setHidden = (h) => { hidden = h; gui.show(!h); pill.style.display = h ? 'block' : 'none'; try { localStorage.setItem('ak-tuner-hidden', h ? '1' : '0'); } catch (e) { /* storage blocked */ } };
      pill.onclick = () => setHidden(false);
      on(window, 'keydown', (e) => {
        if ((e.key !== 'h' && e.key !== 'H') || e.metaKey || e.ctrlKey || e.altKey || /^(input|textarea|select)$/i.test((e.target && e.target.tagName) || '')) return;
        setHidden(!hidden);
      });
      gui.add({ 'Hide panel (H)': () => setHidden(true) }, 'Hide panel (H)');
      try { if (localStorage.getItem('ak-tuner-hidden') === '1') setHidden(true); } catch (e) { /* storage blocked */ }
      // 1. View: where you are in the story
      const fv = gui.addFolder('View');
      const scrub = fv.add(tunerNav, 'u', -0.5, 5.5, 0.005).name('scrub').onChange((v) => jump(v)).listen();
      const moments = () => [['10 s', (K.draw[1] + K.zoom[0]) / 2], ['zooming', (K.zoom[0] + K.zoom[1]) / 2], ['3 days', (K.zoom[1] + K.sweep[0]) / 2],
        ['recording', (K.sweep[0] + K.sweep[1]) / 2], ['recorded', (K.sweep[1] + K.out[0]) / 2], ['the dive', (K.zoomIn[0] + K.zoomIn[1]) / 2], ['end', (K.lock[1] + UNITS) / 2]];
      moments().forEach(([n]) => fv.add({ [n]: () => jump(moments().find((m) => m[0] === n)[1]) }, n));
      // 2. Pacing: the 3-scroll version or the paced 5-scroll one, and its pauses
      const fp = gui.addFolder('Pacing');
      const paceInfo = { length: '' };
      const showLength = () => { paceInfo.length = (REMAP() ? scrollUnits() : UNITS).toFixed(2) + ' scrolls'; scrub.max(UNITS + 0.4); };
      const repace = () => { applyPace(true); showLength(); try { localStorage.setItem('ak-pace-v3', JSON.stringify(PACE)); } catch (e) { /* storage blocked */ } };
      const paceMode = fp.add(PACE, 'mode', { 'current (3 scrolls)': 'current', 'paced (~5 scrolls)': 'paced', 'stepped (auto-land)': 'stepped', 'snap (scroll + land)': 'snap' }).name('pace');
      // paced: holds and transition lengths in scrolls; the sub-scenes below shape each transition's motion
      const paced = [
        fp.add(PACE, 'pHold1', 0, 1.5, 0.01).name('hold · snapshot (scrolls)'),
        fp.add(PACE, 'pZoom', 0.3, 2.5, 0.01).name('zoom-out length (scrolls)'),
        fp.add(PACE, 'pHold2', 0, 1.5, 0.01).name('hold · three days'),
        fp.add(PACE, 'pSweep', 0.3, 2.5, 0.01).name('sweep length'),
        fp.add(PACE, 'pHold3', 0, 1.5, 0.01).name('hold · recorded'),
        fp.add(PACE, 'pDive', 0.3, 2.5, 0.01).name('dive length'),
        fp.add(PACE, 'pHold4', 0, 1.5, 0.01).name('hold · end frame'),
        fp.add(PACE, 'commit', 0.05, 0.95, 0.01).name('go on after (share of a transition)'),
        fp.add(PACE, 'pMaxRate', 0.5, 4, 0.05).name('speed limit (× authored pace)'),
        fp.add(PACE, 'settle').name('land on beats'),
      ];
      const easeNames = Object.keys(EASES);
      const storePace = () => { try { localStorage.setItem('ak-pace-v3', JSON.stringify(PACE)); } catch (e) { /* storage blocked */ } };
      const detail = fp.add(PACE, 'stepDetail', ['sub-scenes', 'whole transitions']).name('detail');
      const whole = [
        fp.add(PACE, 'stepEntry', 0.3, 4, 0.05).name('entry (s)'),
        fp.add(PACE, 'easeEntry', easeNames).name('entry curve'),
        fp.add(PACE, 'stepZoom', 0.5, 8, 0.05).name('zoom-out (s)'),
        fp.add(PACE, 'easeZoom', easeNames).name('zoom-out curve'),
        fp.add(PACE, 'stepSweep', 0.5, 8, 0.05).name('sweep (s)'),
        fp.add(PACE, 'easeSweep', easeNames).name('sweep curve'),
        fp.add(PACE, 'stepDive', 0.5, 8, 0.05).name('dive (s)'),
        fp.add(PACE, 'easeDive', easeNames).name('dive curve'),
      ];
      // sub-scenes: a folder per transition, each sub-scene's seconds and curve, and the transition's total
      const subTotals = {}, subFolders = [], totals = [];
      ['1 · entry', '2 · zoom-out', '3 · sweep', '4 · dive'].forEach((title, ti) => {
        const f = fp.addFolder(title);
        const rows = SUBSCENES.filter((x) => x[0] === ti), key = 't' + ti;
        const total = () => { subTotals[key] = (rows.reduce((n, [, k]) => n + PACE['d_' + k], 0) + PACE.stepJoin).toFixed(2) + ' s'; };
        rows.forEach(([, k, name]) => {
          f.add(PACE, 'd_' + k, 0.02, 4, 0.01).name(name + ' (s)').onChange(total).onFinishChange(() => { resetTau(); storePace(); });
          f.add(PACE, 'e_' + k, easeNames).name('↳ curve').onFinishChange(() => { resetTau(); storePace(); });
        });
        total(); totals.push(total); f.add(subTotals, key).name('total').disable().listen();
        if (ti) f.close();
        subFolders.push(f);
      });
      const join = fp.add(PACE, 'stepJoin', 0, 1, 0.01).name('smooth the joins (s)').onChange(() => totals.forEach((t) => t()));
      const snapLayout = [
        fp.add(PACE, 'snapHold', 0.05, 1, 0.01).name('hold zone (scrolls)'),
        fp.add(PACE, 'snapGap', 0.3, 2, 0.01).name('scroll between beats'),
      ];
      const snapCtl = [
        ...snapLayout,
        fp.add(PACE, 'snapCommit', 0.05, 0.95, 0.01).name('go on after (share of the gap)'),
        fp.add(PACE, 'snapRate', 0.5, 3, 0.05).name('follow speed (× authored)'),
        fp.add(PACE, 'snapLand').name('land on beats'),
        fp.add(PACE, 'snapDelay', 60, 600, 10).name('land after a pause of (ms)'),
      ];
      snapCtl.forEach((c) => c.onFinishChange(storePace));
      snapLayout.forEach((c) => c.onFinishChange(repace));
      const stepped = [
        ...whole,
        fp.add(PACE, 'stepHold', 0, 2, 0.05).name('hold before next step (s)'),
        fp.add(PACE, 'stepSensitivity', 4, 120, 1).name('gesture threshold (px)'),
      ];
      const stops3 = fp.add(PACE, 'scaleStops', 0, 1, 0.01).name('scale stops (1 min · 1 h · 1 day)');
      fp.add(paceInfo, 'length').name('total').disable().listen();
      const showPaced = () => {
        const st = PACE.mode === 'stepped', sn = PACE.mode === 'snap', sub = (st && PACE.stepDetail === 'sub-scenes') || sn || PACE.mode === 'paced';
        paced.forEach((c) => c.show(PACE.mode === 'paced')); stepped.forEach((c) => c.show(st)); detail.show(st); snapCtl.forEach((c) => c.show(sn));
        whole.forEach((c) => c.show(st && !sub)); subFolders.forEach((f) => f.show(sub)); join.show(sub);
        stops3.show(st && !sub);
      };
      paceMode.onChange(() => { showPaced(); repace(); });
      detail.onChange(() => { showPaced(); repace(); });
      paced.forEach((c) => c.onFinishChange(repace));
      stops3.onFinishChange(repace);
      stepped.forEach((c) => c.onFinishChange(storePace));
      join.onFinishChange(() => { resetTau(); storePace(); });
      showPaced(); showLength();
      // 3. Story: the choices that change what happens
      const fs = gui.addFolder('Story');
      const traceStrength = { c: null };
      fs.add(GRAPH, 'before', ['cloud', 'faded trace', 'nothing']).name('before the sweep').onChange(() => traceStrength.c.show(GRAPH.before === 'faded trace'));
      traceStrength.c = fs.add(GRAPH, 'traceStrength', 0.05, 1, 0.01).name('faded trace strength');
      traceStrength.c.show(GRAPH.before === 'faded trace');
      fs.add(GRAPH, 'photosDuringSweep', ['episodes stay', 'go away', 'stay']).name('photos during sweep');
      fs.add(GRAPH, 'ending', ['zoom', 'form']).name('beat 04 ending');
      // 4. Layers: switch any part off (collapsed)
      const fl = gui.addFolder('Layers (switch off)');
      [['photos', 'photos'], ['cloud', 'uncertainty cloud'], ['labels', 'beat 02 labels'], ['episodes', 'episode marks'], ['axis', 'time axis'],
        ['grid', 'ECG paper / grid'], ['sweep', 'recording head'], ['card', 'beat-shape card'], ['copy', 'copy lines'], ['hud', 'HUD readout']]
        .forEach(([k, n]) => fl.add(LAYERS, k).name(n).onChange(applyLayers));
      fl.close();
      // 5. Advanced: the fine settings, two levels down
      const fa = gui.addFolder('Advanced');
      const fr = fa.addFolder('Recording & flags');
      fr.add(GRAPH, 'flagMotion', ['v1 spring', 'magnet settle']).name('flagged beats');
      fr.add(GRAPH, 'flagRiseHours', 1, 12, 0.1).name('flag rise (h of data)');
      fr.add(GRAPH, 'v1Graph').name('v1 recorded graph');
      fr.add(CLOUD, 'recording', ['magnetic', 'settle from cloud', 'rise from baseline']).name('recording');
      fr.add(CLOUD, 'magRadius', 20, 600, 5).name('magnet: capture zone (px)');
      fr.add(CLOUD, 'magPull', 0, 1, 0.01).name('magnet: pull');
      fr.add(CLOUD, 'magGlow', 0, 1, 0.01).name('magnet: energise');
      fr.add(CLOUD, 'settleHours', 0.1, 6, 0.1).name('settle time (h of data)');
      const fcl = fa.addFolder('Uncertainty cloud');
      fcl.add(CLOUD, 'on').name('cloud on');
      fcl.add(CLOUD, 'intensity', 0, 4, 0.01);
      fcl.add(CLOUD, 'density', 0.02, 1, 0.01).name('density (share of beats)');
      fcl.add(CLOUD, 'appearFrom', 11, 7200, 1).name('appears from (s view)');
      fcl.add(CLOUD, 'appearFull', 12, 36000, 1).name('fully in at (s view)');
      fcl.add(CLOUD, 'spread', 0, 1, 0.01).name('spread (0 true · 1 unknown)');
      fcl.add(CLOUD, 'bandLow', 30, 120, 1).name('band low (bpm)');
      fcl.add(CLOUD, 'bandHigh', 60, 170, 1).name('band high (bpm)');
      fcl.add(CLOUD, 'edge', 0, 1, 0.01).name('edge softness');
      fcl.add(CLOUD, 'size', 1, 8, 0.1).name('size (px)');
      fcl.add(CLOUD, 'shape', ['hollow ring', 'soft dot', 'square']);
      fcl.add(CLOUD, 'ring', 0.1, 0.9, 0.01).name('ring thickness');
      fcl.addColor(CLOUD, 'color');
      fcl.add(CLOUD, 'shimmer', 0, 40, 0.5).name('shimmer (px)');
      fcl.add(CLOUD, 'shimmerSpeed', 0, 4, 0.05).name('shimmer speed');
      fcl.add(CLOUD, 'jitterX', 0, 8, 0.1).name('horizontal jitter (px)');
      const fg = fa.addFolder('Recorded graph');
      fg.add(GRAPH, 'keepSliver').name('keep 10 s sliver');
      fg.add(GRAPH, 'dotSize', 0.5, 4, 0.1).name('every-beat dot size');
      fg.add(GRAPH, 'dotStrength', 0.2, 4, 0.05).name('every-beat strength');
      fg.add(GRAPH, 'lollipops').name('hourly lollipops (v2 graph)');
      fg.add(GRAPH, 'lollipopHours', 1, 6, 1).name('lollipop every (h)');
      fg.add(GRAPH, 'stemOpacity', 0, 1, 0.01).name('stem opacity');
      fg.add(GRAPH, 'headSize', 0, 6, 0.1).name('head size (px)');
      fg.add(GRAPH, 'headOpacity', 0, 1, 0.01).name('head opacity');
      fg.add(GRAPH, 'axisLabels').name('bpm axis');
      const fph = fa.addFolder('Photo lines');
      fph.add(GRAPH, 'photoLinesDark', 0, 1, 0.01).name('before sweep');
      fph.add(GRAPH, 'photoLinesPaper', 0, 1, 0.01).name('on paper (0 = off)');
      [fr, fcl, fg, fph].forEach((f) => f.close());
      fa.close();
      gui.add(actions, 'Copy settings (JSON)');
      gui.add(actions, 'Reset all');
      gui.onChange(save);
    };
    document.head.appendChild(sc);
  }

  function applyPace(keepMoment) {
    TAU = null;
    const before = [-1.2, K.draw[1], K.zoom[0], K.zoom[1], K.sweep[0], K.sweep[1], K.out[0], K.zoomIn[1], K.lock[1], UNITS, UNITS + 0.4];
    const tl = PACE.mode !== 'current' ? pacedTimeline(PACED_K) : { k: K_CURRENT, units: 3, beats: BEATS_CURRENT };
    for (const key of Object.keys(tl.k)) { K[key][0] = tl.k[key][0]; K[key][1] = tl.k[key][1]; }
    UNITS = tl.units;
    BEATS.forEach((b, i) => { b[2] = tl.beats[i]; });
    const span = Math.log(ZEND.s || TOT) - Math.log(L.spanB || 10 / 0.86), at = (sec) => (Math.log(sec) - Math.log(L.spanB || 10 / 0.86)) / span;
    ZWARP = buildWarp([at(60), at(3600), at(86400)]);
    DWARP = buildWarp([1 - at(86400), 1 - at(3600), 1 - at(60)]);
    if (!keepMoment) return;
    const after = [-1.2, K.draw[1], K.zoom[0], K.zoom[1], K.sweep[0], K.sweep[1], K.out[0], K.zoomIn[1], K.lock[1], UNITS, UNITS + 0.4];
    let v = u;
    for (let i = 0; i + 1 < before.length; i++) if (u <= before[i + 1] || i + 2 === before.length) { v = lerp(after[i], after[i + 1], clamp((u - before[i]) / Math.max(1e-6, before[i + 1] - before[i]))); break; }
    layout(); jump(v);
  }

  /* ---------- stepped (auto-land) ----------
     The story rests on four frames (snapshot, three days, recorded, the end). One gesture (wheel or trackpad flick,
     swipe, ↓ / Space / Page Down) plays the next transition over a set time on its own curve; the opposite gesture
     plays it back. Before the first frame and after the last, the page scrolls as usual. The window's scroll follows
     the story, so the scrollbar still shows progress, and dragging it scrubs freely and then lands on the nearest frame. */
  const stops = () => [K.c1[1] - 0.14, K.c2[1] - 0.14, K.out[0] - 0.09, K.lock[1] + 0.02];
  const EASES = {
    'sine in-out': (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
    'cubic in-out': inout,
    'expo in-out': (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    'ease out': out3,
    'ease in': (t) => t * t * t,
    'soft in': (t) => 1 - Math.cos((Math.PI * t) / 2),
    'soft out': (t) => Math.sin((Math.PI * t) / 2),
    'gentle in-out': (t) => lerp(t, 0.5 - 0.5 * Math.cos(Math.PI * t), 0.5),   // slows at the ends without stopping
    'linear': (t) => t,
  };
  // the sub-scenes' spans in scroll units: zoom levels where the camera passes 1 min, 1 h, 1 day; the sweep's day lines
  function scenes() {
    const S = stops(), lsB = Math.log(L.spanB || 10 / 0.86), at = (sec) => clamp((Math.log(sec) - lsB) / (Math.log(ZEND.s || TOT) - lsB));
    const zu = (sec) => lerp(K.zoom[0], K.zoom[1], at(sec)), du = (sec) => lerp(K.zoomIn[0], K.zoomIn[1], 1 - at(sec));
    const day = (d) => { let lo = K.sweep[0], hi = K.sweep[1]; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (sweepT(m) < d * 86400) lo = m; else hi = m; } return (lo + hi) / 2; };
    const edges = [[K.draw[0], K.draw[1], S[0]], [S[0], K.zoom[0], zu(60), zu(3600), zu(86400), K.zoom[1], S[1]],
      [S[1], K.sweep[0], day(1), day(2), K.sweep[1], S[2]], [S[2], K.zoomIn[0], du(86400), du(3600), du(60), K.zoomIn[1], S[3]]];
    return edges.map((e, ti) => SUBSCENES.filter((x) => x[0] === ti).map(([, key, name], i) => ({ key, name, a: e[i], b: Math.max(e[i], e[i + 1]) })));
  }
  // one transition's path from u0 to u1 through its sub-scenes → { D: seconds, at(0…1) → u }
  function scenePath(tIdx, u0, u1) {
    const fw = u1 >= u0, lo = Math.min(u0, u1), hi = Math.max(u0, u1);
    let segs = [];
    for (const sc of scenes()[tIdx]) {
      const a = Math.max(lo, sc.a), b = Math.min(hi, sc.b);
      if (b - a < 1e-6) continue;
      segs.push({ a, b, d: Math.max(0.02, (+PACE['d_' + sc.key] || 0.4) * ((b - a) / Math.max(1e-6, sc.b - sc.a))), e: EASES[PACE['e_' + sc.key]] || EASES.linear });
    }
    if (!segs.length) segs = [{ a: lo, b: hi, d: 0.3, e: EASES['ease out'] }];
    if (!fw) segs = segs.reverse().map((g) => ({ a: g.b, b: g.a, d: g.d, e: g.e }));
    const hz = 240, D0 = segs.reduce((n, g) => n + g.d, 0), N = Math.max(2, Math.ceil(D0 * hz) + 1), U = new Float64Array(N);
    for (let i = 0, gi = 0, t0 = 0; i < N; i++) {
      const t = Math.min(D0, i / hz);
      while (gi < segs.length - 1 && t > t0 + segs[gi].d) { t0 += segs[gi].d; gi++; }
      const g = segs[gi]; U[i] = lerp(g.a, g.b, g.e(clamp((t - t0) / g.d)));
    }
    // smooth the joins: a moving average over stepJoin seconds, run past both ends so it starts and ends exactly
    const p = Math.round((PACE.stepJoin * hz) / 2), M = N + 2 * p, V = new Float64Array(M);
    if (p > 0) {
      const E = (j) => U[clamp(j - p, 0, N - 1)];
      let sum = 0; for (let j = -p; j <= p; j++) sum += E(j);
      for (let j = 0; j < M; j++) { V[j] = sum / (2 * p + 1); sum += E(j + p + 1) - E(j - p); }
      V[0] = U[0]; V[M - 1] = U[N - 1];
    } else V.set(U);
    return { D: (M - 1) / hz, at: (t) => { const x = clamp(t) * (M - 1), i = Math.min(M - 2, Math.floor(x)); return lerp(V[i], V[i + 1], x - i); } };
  }
  // where something is moving; the player passes quickly over the stretches in between
  const motion = () => [K.draw, [K.c1[0], K.c1[0] + 0.22], [K.c1[1] - 0.12, K.c1[1]], K.zoom, K.labels, [K.c2[0], K.c2[0] + 0.22], [K.c2[1] - 0.12, K.c2[1]],
    K.sweep, K.flags, [K.c3[1] - 0.12, K.c3[1]], K.out, K.zoomIn, K.lock, [K.c4[0], K.c4[0] + 0.22]];
  function playMap(u0, u1) {
    const lo = Math.min(u0, u1), hi = Math.max(u0, u1), n = 256, C = new Float64Array(n + 1), M = motion();
    let acc = 0;
    for (let i = 0; i <= n; i++) { const v = lo + ((hi - lo) * i) / n; if (i) acc += (M.some(([a, b]) => v >= a && v <= b) ? 1 : 0.12) / n; C[i] = acc; }
    for (let i = 0; i <= n; i++) C[i] = acc > 0 ? C[i] / acc : i / n;
    return (e) => lo + (hi - lo) * unwarp(C, u1 >= u0 ? e : 1 - e);
  }
  let stepState = 'free', stopIdx = -1, play = null, holdUntil = 0, expectedY = null, manual = false, queued = null;
  // ?stepdebug: an on-screen log of what each gesture did
  const stepLog = Q.has('stepdebug') ? (() => { const el = document.createElement('pre'); el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;margin:0;padding:6px 8px;font:11px/1.4 ui-monospace,monospace;background:rgba(0,0,0,.72);color:#fff;border-radius:4px;pointer-events:none;white-space:pre'; document.body.appendChild(el); const lines = []; return (m) => { lines.push(((performance.now() / 1000) % 1000).toFixed(2) + '  ' + m); if (lines.length > 8) lines.shift(); el.textContent = lines.join('\n'); }; })() : () => {};
  let lastWheel = 0, acc = 0, gestureUsed = false, released = 0, lastScrollY = window.scrollY, lastDir = 0, stepIdleT = 0;
  const sectionY = () => section.getBoundingClientRect().top + window.scrollY;
  function selfScroll(v) { if (!Number.isFinite(v)) return; expectedY = Math.round(sectionY() + v * H); window.scrollTo(0, expectedY); }
  function playTo(k, from) {
    const S = stops(), to = S[k], tIdx = from <= to ? k : k + 1;   // transitions: 0 entry · 1 zoom-out · 2 sweep · 3 dive
    // landing back on the end frame from below (tIdx 4) is a short settle, like the entry
    const full = tIdx >= 4 ? PACE.stepEntry * 0.6 : [PACE.stepEntry, PACE.stepZoom, PACE.stepSweep, PACE.stepDive][tIdx];
    const ease = tIdx >= 4 ? 'ease out' : [PACE.easeEntry, PACE.easeZoom, PACE.easeSweep, PACE.easeDive][tIdx];
    const span = tIdx === 0 ? Math.max(0.05, S[0]) : tIdx >= 4 ? Math.max(0.05, UNITS + 0.05 - S[3]) : Math.abs(S[tIdx] - S[tIdx - 1]);
    const dur = REDUCED ? 0.01 : Math.max(0.45, full * Math.min(1, Math.abs(to - from) / span));   // landing from part-way takes its share
    if (!Number.isFinite(dur) || !Number.isFinite(from) || !Number.isFinite(to)) return;
    let fn;
    if (SUBS() && tIdx < 4 && !REDUCED) { const P = scenePath(tIdx, from, to); fn = P.at; play = { dur: Math.max(0.3, P.D) }; }
    else { const m = playMap(from, to), e = EASES[ease] || EASES['sine in-out']; fn = (t) => m(e(t)); play = { dur }; }
    Object.assign(play, { from, to, toIdx: k, t: 0, speed: 1, fn, dir: Math.sign(to - from) || 1 });
    stepState = 'playing'; manual = false;
  }
  function capture(uNow, dir) {   // take over: play to the next frame that way (dir 0: the nearest)
    const S = stops();
    let k = -1;
    if (dir > 0) k = S.findIndex((v) => v >= uNow + 0.005);
    else if (dir < 0) { for (let i = S.length - 1; i >= 0; i--) if (S[i] <= uNow - 0.005) { k = i; break; } }
    else k = S.reduce((b, v, i) => (Math.abs(v - uNow) < Math.abs(S[b] - uNow) ? i : b), 0);
    if (k < 0) return false;
    playTo(k, uNow);
    return true;
  }
  function release(dir) { stepState = 'free'; play = null; stopIdx = -1; released = dir; queued = null; }
  function stepFrame(dt) {
    if (play) {
      play.t = Math.min(1, play.t + (dt * play.speed) / play.dur);
      u = uTarget = play.fn(play.t);
      selfScroll(u);
      if (play.t >= 1) {
        u = uTarget = play.to; stopIdx = play.toIdx; play = null; stepState = 'locked'; holdUntil = performance.now() + PACE.stepHold * 1000;
        if (queued) { const k = stopIdx + queued.dir; if (k >= 0 && k <= 3 && performance.now() - queued.at < 1500) { stepLog('landed, playing the queued step'); playTo(k, u); } queued = null; }
      }
    } else if (stepState === 'locked' && queued && performance.now() >= holdUntil) {   // a gesture made during the hold
      const k = stopIdx + queued.dir, fresh = performance.now() - queued.at < 1500; queued = null;
      if (fresh && k >= 0 && k <= 3) { stepLog('hold over, playing the queued step'); playTo(k, u); }
    } else if (stepState === 'locked' && expectedY != null && Math.abs(window.scrollY - expectedY) > 1) selfScroll(u);
  }
  // one input, one decision. dir: +1 forward, −1 back. Returns true when the story used it (so the page mustn't scroll).
  function stepInput(dir) {
    const uNow = stepState === 'free' ? measureU() : u, S = stops();
    if (stepState === 'free') {
      // the page scrolls: above the story going down, below it going up are entries; past the ends are exits
      if (dir > 0 && (uNow < -0.02 || uNow >= S[3] - 0.005)) return false;
      if (dir < 0 && (uNow > UNITS + 0.05 || uNow <= S[0] + 0.005)) return false;
      return capture(uNow, dir);
    }
    if (stepState === 'locked' && ((dir > 0 && stopIdx === 3) || (dir < 0 && stopIdx === 0))) { release(dir); return false; }
    if (stepState === 'playing') {
      // the same way: early on, finish this one quickly; in its last stretch (where it already looks still), go on to the next
      if (dir === play.dir) {
        const left = (1 - play.t) * play.dur;
        if (play.t > 0.7 || left < 0.6) { queued = { dir, at: performance.now() }; stepLog('queued the next step (this one is landing)'); }
        else { play.speed = Math.max(play.speed, left / 0.35); stepLog('hurried this step'); }
      } else { capture(u, dir); stepLog('turned back'); }
      return true;
    }
    if (performance.now() < holdUntil) { queued = { dir, at: performance.now() }; stepLog('queued (just landed)'); return true; }
    stepLog('play ' + ['entry', 'zoom-out', 'sweep', 'dive'][Math.min(3, Math.max(0, stopIdx + (dir > 0 ? 1 : 0)))] + (dir > 0 ? '' : ' (back)'));
    const k = stopIdx + dir;
    if (k >= 0 && k <= 3) playTo(k, u);
    return true;
  }
  function onWheel(e) {
    if (!STEPPED() || e.ctrlKey) return;
    const now = performance.now(), gap = now - lastWheel; lastWheel = now;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1);
    if (gap > 160) { acc = 0; gestureUsed = false; released = 0; }     // a quiet gap starts a new gesture
    if (gap > 160) stepLog('wheel ' + (dy > 0 ? 'down' : 'up') + ', new gesture (gap ' + Math.min(9999, Math.round(gap)) + ' ms)');
    if (released) return;                                              // the rest of a gesture that left the story
    if (gestureUsed) {                                                 // its momentum
      if (stepState !== 'free') { e.preventDefault(); return; }
      // a flick that began outside the story is caught at its edge: from above onto the first frame, from below onto the last
      const uNow = measureU(), S = stops();
      if (dy > 0 && uNow >= -0.02 && uNow < S[0]) { if (capture(uNow, 1)) e.preventDefault(); }
      else if (dy < 0 && uNow > S[3] && uNow <= UNITS + 0.05) { if (capture(uNow, -1)) e.preventDefault(); }
      return;
    }
    acc += dy;
    const inStory = stepState !== 'free' || (measureU() >= -0.02 && measureU() <= stops()[3] + 0.02);
    if (Math.abs(acc) < PACE.stepSensitivity) { if (inStory && stepState !== 'free') e.preventDefault(); return; }
    gestureUsed = true; stepLog('gesture counted at ' + Math.round(Math.abs(acc)) + ' px');
    if (stepInput(Math.sign(acc))) e.preventDefault();
  }
  let touchY = null, touchUsed = false;
  function onTouchStart(e) { if (!STEPPED() || e.touches.length !== 1) return; touchY = e.touches[0].clientY; touchUsed = false; }
  function onTouchMove(e) {
    if (!STEPPED() || touchY == null) return;
    const dy = touchY - e.touches[0].clientY;
    if (touchUsed) { if (stepState !== 'free') e.preventDefault(); return; }
    if (Math.abs(dy) < 28) { if (stepState !== 'free') e.preventDefault(); return; }
    touchUsed = true;
    if (stepInput(Math.sign(dy))) e.preventDefault();
  }
  function onKey(e) {
    if (!STEPPED() || e.metaKey || e.ctrlKey || e.altKey || /^(input|textarea|select|button)$/i.test((e.target && e.target.tagName) || '')) return;
    const dir = ['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey) ? -1 : 0;
    if (dir && stepInput(dir)) e.preventDefault();
  }
  function onStepScroll() {
    const y = window.scrollY; if (y !== lastScrollY) lastDir = Math.sign(y - lastScrollY); lastScrollY = y;
    if (!STEPPED()) return;
    if (stepState !== 'free' && expectedY != null && Math.abs(y - expectedY) > 4) { stepState = 'free'; play = null; stopIdx = -1; }   // the scrollbar took over
    if (stepState === 'free') { clearTimeout(stepIdleT); stepIdleT = setTimeout(stepIdle, 260); }
  }
  function stepIdle() {   // free scrolling has stopped inside the story: land on the nearest frame (not while scrubbing by hand)
    if (!STEPPED() || stepState !== 'free' || manual || REDUCED) return;
    const uu = measureU(), S = stops();
    if (uu <= 0 || uu > UNITS + 0.05) return;
    if (uu < S[0] && lastDir < 0) return;      // on the way out, upwards
    if (uu > S[3] && lastDir > 0) return;      // on the way out, downwards
    capture(uu, 0);
  }
  on(window, 'wheel', onWheel, { passive: false });
  on(window, 'touchstart', onTouchStart, { passive: true });
  on(window, 'touchmove', onTouchMove, { passive: false });
  on(window, 'keydown', onKey);
  on(window, 'scroll', onStepScroll, { passive: true });

  /* ---------- paced + snap: holds, transitions, landing ----------
     Both scroll natively over the same layout: each beat has a hold (a stretch of scroll where its frame stays still)
     and each transition its own length. The sub-scenes (seconds and curves) are the motion's shape: paced spreads each
     transition's shape over its scroll length (the visual is the scroll, scrubbed); snap plays it in seconds, the visual
     following the page along the authored timeline. When scrolling stops inside a transition the page lands on a beat:
     on to the next one once you're past the commit point, otherwise back. Snap also moves one beat per gesture: until the
     page rests again, the visual goes no further than the next frame either way. */
  let TAU = null, tauV = null, tauVel = 0, snapManual = false, snapT = 0, scrollDir = 0, snapY = window.scrollY, touching = false;
  let SL = null, sV = null, rest = null, glide = null, lastScrollAt = 0;
  const REMAP = () => PACE.mode === 'paced' || PACE.mode === 'snap';
  function buildTau() {   // the whole story as one timeline: u at each authored second
    const S = stops(), sc = scenes(), lin = EASES.linear, segs = [{ a: -1.2, b: K.draw[0], d: 0.5, e: lin }];
    sc.forEach((list) => list.forEach((x) => { if (x.b - x.a > 1e-6) segs.push({ a: x.a, b: x.b, d: Math.max(0.02, +PACE['d_' + x.key] || 0.4), e: EASES[PACE['e_' + x.key]] || lin }); }));
    segs.push({ a: S[3], b: UNITS + 0.4, d: 1.2, e: lin });
    const hz = 120, D = segs.reduce((n, g) => n + g.d, 0), N = Math.ceil(D * hz) + 1, U = new Float64Array(N);
    for (let i = 0, gi = 0, t0 = 0; i < N; i++) {
      const t = Math.min(D, i / hz);
      while (gi < segs.length - 1 && t > t0 + segs[gi].d) { t0 += segs[gi].d; gi++; }
      const g = segs[gi]; U[i] = lerp(g.a, g.b, g.e(clamp((t - t0) / g.d)));
    }
    const p = Math.round((PACE.stepJoin * hz) / 2), V = new Float64Array(N);   // smoothed joins, as in stepped
    if (p > 0) { let sum = 0; const E = (j) => U[clamp(j, 0, N - 1)]; for (let j = -p; j <= p; j++) sum += E(j); for (let j = 0; j < N; j++) { V[j] = sum / (2 * p + 1); sum += E(j + p + 1) - E(j - p); } } else V.set(U);
    for (let i = 1; i < N; i++) if (V[i] < V[i - 1]) V[i] = V[i - 1];
    TAU = { V, hz, N };
  }
  const uOfTau = (t) => { if (!TAU) buildTau(); const x = clamp(t * TAU.hz, 0, TAU.N - 1), i = Math.min(TAU.N - 2, Math.floor(x)); return lerp(TAU.V[i], TAU.V[i + 1], x - i); };
  function tauOfU(v) {
    if (!TAU) buildTau();
    const V = TAU.V; if (v <= V[0]) return 0; if (v >= V[TAU.N - 1]) return (TAU.N - 1) / TAU.hz;
    let lo = 0, hi = TAU.N - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (V[m] < v) lo = m; else hi = m; }
    return (lo + (v - V[lo]) / Math.max(1e-9, V[hi] - V[lo])) / TAU.hz;
  }
  // the scroll layout (in viewports): [entry, the page's own scroll] [hold 1] [zoom-out] [hold 2] [sweep] [hold 3] [dive] [hold 4] [exit]
  function buildSL() {
    const S = stops(), sn = SNAP();
    const holds = sn ? [PACE.snapHold, PACE.snapHold, PACE.snapHold, PACE.snapHold] : [PACE.pHold1, PACE.pHold2, PACE.pHold3, PACE.pHold4];
    const trans = sn ? [PACE.snapGap, PACE.snapGap, PACE.snapGap] : [PACE.pZoom, PACE.pSweep, PACE.pDive];
    const segs = []; let s = S[0];
    for (let k = 0; k < 4; k++) {
      segs.push({ type: 'hold', k, s0: s, s1: s + holds[k] }); s += holds[k];
      if (k < 3) { segs.push({ type: 'trans', k: k + 1, s0: s, s1: s + trans[k] }); s += trans[k]; }
    }
    SL = { segs, start: S[0], end: s, units: s + (UNITS - S[3]), S };
  }
  const scrollUnits = () => { if (!SL) buildSL(); return SL.units; };
  const holdOf = (k) => { if (!SL) buildSL(); return SL.segs.find((g) => g.type === 'hold' && g.k === k); };
  const holdMid = (k) => { const g = holdOf(k); return (g.s0 + g.s1) / 2; };
  function sToU(s) {
    if (!SL) buildSL();
    if (s <= SL.start) return s;
    if (s >= SL.end) return SL.S[3] + (s - SL.end);
    for (const g of SL.segs) if (s <= g.s1) {
      if (g.type === 'hold') return SL.S[g.k];
      return uOfTau(lerp(tauOfU(SL.S[g.k - 1]), tauOfU(SL.S[g.k]), (s - g.s0) / (g.s1 - g.s0)));
    }
    return SL.S[3];
  }
  function uToS(v) {   // a moment's scroll position (a frame's is the middle of its hold)
    if (!SL) buildSL();
    const S = SL.S;
    if (v < S[0] - 1e-6) return v;
    if (v > S[3] + 1e-6) return SL.end + (v - S[3]);
    for (let k = 0; k < 4; k++) if (Math.abs(v - S[k]) < 1e-6) return holdMid(k);
    for (const g of SL.segs) if (g.type === 'trans' && v > S[g.k - 1] && v < S[g.k]) {
      const ta = tauOfU(S[g.k - 1]), tb = tauOfU(S[g.k]);
      return lerp(g.s0, g.s1, clamp((tauOfU(v) - ta) / Math.max(1e-9, tb - ta)));
    }
    return v;
  }
  // where a moment sits relative to the frames: −1 above the story, k on frame k, 4 below it, null in between
  const restOf = (v) => { const S = stops(); if (v < S[0] - 1e-3) return -1; if (v > S[3] + 1e-3) return 4; const k = S.findIndex((x) => Math.abs(x - v) < 1e-3); return k >= 0 ? k : null; };

  function remapFrame(dt) {
    const s = clamp(measureU(), -1.2, scrollUnits() + 0.4);
    // snap: the authored pace, one beat per gesture. paced: the scroll, but no faster than pMaxRate × the authored pace.
    follow(dt, s, SNAP());
  }
  function follow(dt, s, sn) {
    let tT = tauOfU(sToU(s));
    if (sn && rest != null) {   // one beat per gesture
      const S = stops(), b = (i) => (i < 0 ? 0 : i > 3 ? Infinity : tauOfU(S[i]));
      tT = clamp(tT, b(rest - 1), b(rest + 1));
    }
    if (tauV == null) { tauV = tT; tauVel = 0; }
    const gap = tT - tauV;
    // snap: at the authored pace, a little quicker when far behind; paced: capped, however far behind
    const rate = sn ? PACE.snapRate * Math.max(1, Math.abs(gap) / 2.5) : PACE.pMaxRate, want = Math.sign(gap) * Math.min(rate, Math.abs(gap) / 0.12);
    tauVel += (want - tauVel) * (1 - Math.exp(-dt / 0.1));
    tauV += tauVel * dt;
    if ((gap > 0 && tauV > tT) || (gap < 0 && tauV < tT) || Math.abs(tT - tauV) < 1e-4) { tauV = tT; tauVel = 0; }
    u = uTarget = uOfTau(tauV);
  }

  // glides: the page's own scroll, moved over time (so a landing in paced plays at the authored pace). Any input stops one.
  const transSecs = (k) => SUBSCENES.filter((x) => x[0] === k).reduce((n, x) => n + (+PACE['d_' + x[1]] || 0), 0);
  function glideDur(s0, s1) {
    if (SNAP() || !REMAP()) return clamp(0.45 + 0.22 * Math.abs(s1 - s0), 0.45, 0.9);
    const lo = Math.min(s0, s1), hi = Math.max(s0, s1); let d = 0;
    for (const g of SL.segs) { const o = Math.max(0, Math.min(hi, g.s1) - Math.max(lo, g.s0)); if (o) d += g.type === 'trans' ? (o / (g.s1 - g.s0)) * transSecs(g.k) : o * 0.5; }
    return clamp(d + Math.max(0, lo < SL.start ? SL.start - lo : 0) * 1.2, 0.4, 4);
  }
  function glideTo(s1, k) {
    const s0 = measureU();
    if (Math.abs(s1 - s0) < 0.003) { if (k !== undefined) rest = k; return; }
    glide = { s0, s1, t: 0, dur: glideDur(s0, s1), k };
  }
  function stepGlide(dt) {
    glide.t = Math.min(1, glide.t + dt / glide.dur);
    const e = EASES['sine in-out'](glide.t);
    window.scrollTo(0, Math.round(sectionY() + lerp(glide.s0, glide.s1, e) * H));
    if (glide.t >= 1) { if (glide.k !== undefined) rest = glide.k; glide = null; }
  }

  function landSettle() {   // scrolling has stopped: land on a beat
    if (!REMAP() || touching || snapManual || REDUCED || glide) return;
    if (PACE.mode === 'paced' ? !PACE.settle : !PACE.snapLand) return;
    if (!SL) buildSL();
    const s = measureU(), d = scrollDir, sn = SNAP();
    if (s < SL.start) { if (d > 0 && s > SL.start - 0.6) glideTo(holdMid(0), 0); else rest = -1; return; }   // above: on into the story, or leaving
    if (s > SL.end) { if (d < 0 && s < SL.end + 0.3) glideTo(holdMid(3), 3); else rest = 4; return; }          // below: back onto the end frame, or leaving
    const g = SL.segs.find((x) => s >= x.s0 && s <= x.s1) || SL.segs[SL.segs.length - 1];
    const one = (k) => (sn && rest != null ? clamp(k, Math.max(0, rest - 1), Math.min(3, rest + 1)) : k);
    if (g.type === 'hold') {
      const k = one(g.k);
      if (k !== g.k) glideTo(holdMid(k), k);                         // snap: a flick that ran past a whole beat comes back to the next one
      else if (sn && Math.abs(s - holdMid(k)) > 0.01) glideTo(holdMid(k), k);
      else rest = k;
      return;
    }
    const f = (s - g.s0) / (g.s1 - g.s0), c = sn ? PACE.snapCommit : PACE.commit;
    const k = d >= 0 ? (f >= c ? g.k : g.k - 1) : (1 - f >= c ? g.k - 1 : g.k);
    glideTo(holdMid(one(k)), one(k));
  }
  const landSoon = () => { clearTimeout(snapT); snapT = setTimeout(landSettle, PACE.snapDelay); };
  on(window, 'scroll', () => {
    const y = window.scrollY; if (Math.abs(y - snapY) > 0.5) scrollDir = Math.sign(y - snapY); snapY = y;
    lastScrollAt = performance.now();
    if (REMAP() && !glide) landSoon();
  }, { passive: true });
  on(window, 'scrollend', () => { if (REMAP() && !glide) { clearTimeout(snapT); snapT = setTimeout(landSettle, 40); } });
  const userMoved = () => { snapManual = false; glide = null; };
  on(window, 'wheel', userMoved, { passive: true });
  on(window, 'keydown', (e) => { if (!/^(Tab|Shift|Enter| )$/.test(e.key)) userMoved(); });
  on(window, 'touchstart', () => { touching = true; userMoved(); }, { passive: true });
  on(window, 'touchend', () => { touching = false; if (REMAP()) landSoon(); }, { passive: true });
  on(window, 'touchcancel', () => { touching = false; }, { passive: true });
  const resetTau = () => { TAU = null; SL = null; sV = null; tauV = null; };

  /* ---------- progress: where you are (1 of 4), with back and next ----------
     Four segments under the line of copy; each fills as its beat arrives, so every scroll shows. Back / next glide to the
     neighbouring beat at the authored pace; on the last beat, next continues to the following section. */
  const prog = LAYERS.nav && !PLATE ? (() => {
    const st = document.createElement('style');
    st.textContent = `.ak-prog{position:absolute;left:50%;bottom:max(26px,env(safe-area-inset-bottom));z-index:6;display:flex;align-items:center;gap:6px;
        transform:translateX(-50%);--ink:243,236,227;opacity:0;transition:opacity .3s;pointer-events:none}
      .ak-prog.on-light{--ink:10,10,10}
      .ak-prog.is-on{pointer-events:auto}
      .ak-prog button{all:unset;box-sizing:border-box;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;cursor:pointer;color:rgba(var(--ink),.8);transition:color .2s,background .2s,opacity .2s}
      .ak-prog button:hover{background:rgba(var(--ink),.08);color:rgba(var(--ink),1)}
      .ak-prog button:focus-visible{outline:2px solid rgba(var(--ink),.6);outline-offset:1px}
      .ak-prog button[aria-disabled=true]{opacity:.25;cursor:default;background:none}
      .ak-prog svg{width:16px;height:16px}
      .ak-prog ol{display:flex;gap:6px;margin:0;padding:0;list-style:none}
      .ak-prog li{position:relative;width:34px;height:3px;border-radius:2px;background:rgba(var(--ink),.18);overflow:hidden}
      .ak-prog li i{position:absolute;inset:0;transform-origin:0 50%;transform:scaleX(var(--f,0));background:rgba(var(--ink),.85)}
      .ak-prog li.is-cur i{background:#e86a08}
      .ak-skip{position:absolute;left:12px;top:12px;z-index:7;padding:8px 12px;border-radius:6px;background:#fff;color:#111;font:500 13px/1 system-ui,sans-serif;transform:translateY(-200%)}
      .ak-skip:focus{transform:none}
      .ak-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
      @media (max-width:760px){.ak-prog{bottom:max(18px,env(safe-area-inset-bottom));gap:4px}.ak-prog button{width:44px;height:44px}.ak-prog li{width:30px}}
      @media (prefers-reduced-motion:reduce){.ak-prog,.ak-prog button{transition:none}}`;
    (root.head || root).appendChild(st);
    const arrow = (d) => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const el = document.createElement('nav');
    el.className = 'ak-prog'; el.setAttribute('aria-label', 'Story progress');
    el.innerHTML = `<button type="button" data-d="-1">${arrow('M10 3.5 5.5 8l4.5 4.5')}</button><ol>${BEATS.map(() => '<li><i></i></li>').join('')}</ol><button type="button" data-d="1">${arrow('M6 3.5 10.5 8 6 12.5')}</button>`;
    const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'ak-skip'; skip.textContent = 'Skip the story';
    const live = document.createElement('p'); live.className = 'ak-sr'; live.setAttribute('aria-live', 'polite');
    stage.append(skip, el, live);
    const [bBack, bNext] = el.querySelectorAll('button'), segs = [...el.querySelectorAll('li')];
    skip.onclick = () => { userMoved(); window.scrollTo(0, sectionY() + section.offsetHeight); };
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && b.getAttribute('aria-disabled') !== 'true') navGo(+b.dataset.d); });
    return { el, bBack, bNext, segs, live, said: -1, cur: -1, a: -1 };
  })() : null;
  function navGo(dir) {
    const S = stops();
    if (STEPPED()) { stepInput(dir); return; }
    userMoved();
    let k = dir > 0 ? S.findIndex((x) => x > u + 0.005) : S.reduce((n, x, i) => (x < u - 0.005 ? i : n), -1);
    if (k < 0) { if (dir > 0) glideTo((REMAP() ? scrollUnits() : UNITS) + 1); return; }   // past the last beat: on to the next section
    glideTo(REMAP() ? holdMid(k) : S[k], k);
  }
  function updateProg(uu) {
    if (!prog) return;
    const S = stops(), a = sm(0, 0.18, uu) * (1 - sm(S[3] + 0.16, S[3] + 0.3, uu));
    const moving = glide || performance.now() - lastScrollAt < 350 || Math.abs(uTarget - uu) > 2e-3 || (STEPPED() && stepState === 'playing');
    const op = a * (moving ? 0.5 : 1);
    if (Math.abs(op - prog.a) > 0.01) { prog.el.style.opacity = op.toFixed(2); prog.a = op; prog.el.classList.toggle('is-on', a > 0.5); }
    const from = [0, S[0], S[1], S[2]];
    let cur = 0;
    prog.segs.forEach((li, i) => { const f = clamp((uu - from[i]) / Math.max(1e-6, S[i] - from[i])); li.style.setProperty('--f', f.toFixed(3)); if (f > 0.999) cur = i; });
    if (cur !== prog.cur) {
      prog.cur = cur;
      prog.segs.forEach((li, i) => li.classList.toggle('is-cur', i === cur));
      prog.bBack.setAttribute('aria-disabled', String(cur === 0));
      prog.bBack.setAttribute('aria-label', cur > 0 ? 'Back: ' + BEATS[cur - 1][1] : 'Back');
      prog.bNext.setAttribute('aria-label', cur < 3 ? 'Next: ' + BEATS[cur + 1][1] : 'Continue');
    }
    const restK = moving ? -1 : S.findIndex((x) => Math.abs(x - uu) < 2e-3);
    if (restK >= 0 && restK !== prog.said) { prog.said = restK; prog.live.textContent = 'Beat ' + (restK + 1) + ' of 4: ' + BEATS[restK][1]; }
  }

  async function init() {
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fonts optional */ }
    if (!alive) return;
    fillCallout();
    applyPace(false);
    layout();
    io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '20% 0px' });
    io.observe(section);
    let lastW = W, lastH = H, rt = 0;
    onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => { const w = stage.clientWidth, h = window.innerHeight; if (w !== lastW || Math.abs(h - lastH) > 120) { lastW = w; lastH = h; layout(); } }, 120);
    };
    on(window, 'resize', onResize);
    u = uTarget = REMAP() ? sToU(clamp(measureU(), -1.2, scrollUnits() + 0.4)) : clamp(measureU(), -1.2, UNITS + 0.4);
    rest = restOf(u);
    const q = Q.get('u');
    if (q !== null) jump(parseFloat(q));
    if (opts.debug) window.AK = api;
    if (TUNE) buildTuner();
    raf = requestAnimationFrame(frame);
    readyRes(api);
  }
  init();
  return api;
  }

  __setEngine(AKNarrative);
})();


const CSS = "/* AccurBeat \u00b7 Core Narrative \u2014 the packaged section's styles, sealed inside its shadow root.\n   Lifted from css/style.css (narrative stage, copy, HUD) plus the v2 page overrides; nothing here can leak into the site. */\n:host {\n  display: block; position: relative;\n  --ink: #0a0a0a; --brand: #9f2d00; --o300: #ffb869; --night: #0b0a09;\n  --f-display: 'Faculty Glyphic', 'Iowan Old Style', Georgia, serif;\n  --f-sans: 'Geist', system-ui, -apple-system, sans-serif;\n  --f-mono: 'Geist Mono', ui-monospace, Menlo, monospace;\n}\n*, *::before, *::after { box-sizing: border-box; }\n\n.narrative { position: relative; background: var(--night); height: 400vh; }   /* the engine sets the exact height: 4 viewports */\n.stage { position: sticky; top: 0; height: 100vh; overflow: hidden; isolation: isolate; }\n.stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }\n.grain {\n  position: absolute; inset: 0; pointer-events: none; opacity: .07; mix-blend-mode: overlay;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\");\n}\n\n/* one line of copy per beat; recoloured word by word as the sweep crosses it */\n.copy {\n  position: absolute; left: 50%; bottom: 10.5vh; transform: translate3d(-50%,0,0);\n  width: min(1160px, calc(100% - 40px)); margin: 0; display: grid; text-align: center;\n  font: 400 clamp(22px, 2.5vw, 40px)/1.22 var(--f-display); letter-spacing: -0.012em;\n  pointer-events: none; visibility: hidden; will-change: transform, opacity, filter;\n}\n.copy > span { grid-area: 1 / 1; text-wrap: balance; }\n.ink-d { color: #f4f0ea; }\n.ink-l { color: var(--ink); }\n.ink-d .acc { color: var(--o300); }\n.ink-l .acc { color: var(--brand); }\n.theme-dark .ink-l { color: #f4f0ea; }\n.theme-dark .ink-l .acc { color: var(--o300); }\n.w { display: inline-block; overflow: hidden; vertical-align: top; padding: 0 .02em .16em; margin-bottom: -.16em; }\n.w > span { display: inline-block; will-change: transform; transform: translate3d(0,105%,0); }\n\n/* HUD \u2014 only rendered with the `hud` attribute */\n.hud {\n  --ink: 244,240,234;\n  position: absolute; inset: 0; pointer-events: none; opacity: 0;\n  font: 500 11px/16px var(--f-mono); letter-spacing: .08em; text-transform: uppercase;\n}\n.hud .on-light { --ink: 10,10,10; }\n.hud-lens { position: absolute; left: var(--gx, 48px); top: 28px; display: flex; gap: 6px; align-items: baseline; color: rgba(var(--ink), .45); transition: color .3s; }\n.hud-lens b { font-weight: 600; color: rgba(var(--ink), .95); margin-left: 6px; }\n.hud-of { color: rgba(var(--ink), .35); }\n.hud-name { margin-left: 10px; color: rgba(var(--ink), .95); }\n.hud-lens.flip .hud-name, .hud-lens.flip b { animation: flip .5s cubic-bezier(.2,.8,.2,1); }\n@keyframes flip { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }\n.hud-read { position: absolute; right: var(--gx, 48px); top: 24px; margin: 0; display: grid; gap: 3px; min-width: 248px; }\n.hud-read div { display: flex; justify-content: space-between; gap: 28px; }\n.hud-read dt { color: rgba(var(--ink), .45); transition: color .3s; }\n.hud-read dd { margin: 0; color: rgba(var(--ink), .95); font-variant-numeric: tabular-nums; transition: color .3s; }\n\n.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n\n@media (max-width: 760px) {\n  .copy { bottom: 13vh; }\n  .hud-read { min-width: 0; top: 54px; left: var(--gx); right: auto; font-size: 11px; }\n  .hud-read div { gap: 14px; }\n}\n/* short phones: the readout keeps coverage and flagged */\n@media (max-width: 760px) and (max-height: 740px) { .hud-read div:nth-child(-n+2) { display: none; } }\n@media (prefers-reduced-motion: reduce) {\n  .hud-lens.flip .hud-name, .hud-lens.flip b { animation: none; }\n}\n\n/* beat 04: the beat-shape card (as in the exploration, on paper) */\n.ak-catch { position: absolute; left: 0; top: 0; width: 360px; padding: 16px 18px 14px; color: var(--ink, #0a0a0a); background: rgba(255,255,255,.74); border: 1px solid rgba(10,10,10,.12); border-radius: 10px; backdrop-filter: blur(18px) saturate(1.2); -webkit-backdrop-filter: blur(18px) saturate(1.2); box-shadow: 0 30px 80px -40px rgba(60,30,10,.35); opacity: 0; visibility: hidden; pointer-events: none; will-change: transform, opacity; }\n.ak-catch h4 { margin: 0 0 8px; font: 500 15px/1.3 Geist, system-ui, sans-serif; }\n.ak-row { display: flex; align-items: center; gap: 14px; margin-top: 6px; font: 400 12px/1.4 'Geist Mono', ui-monospace, monospace; color: #525252; }\n.ak-row svg { flex: none; width: 110px; height: 40px; overflow: visible; }\n.ak-row path { fill: none; stroke: rgba(10,10,10,.85); stroke-width: 1.3; stroke-linejoin: round; }\n.ak-row.is-flag { color: #c25200; }\n.ak-row.is-flag path { stroke: #e86a08; stroke-width: 1.6; }\n.theme-dark .ak-catch { color: #f3ece3; background: rgba(17,13,10,.86); border-color: rgba(243,233,220,.22); }\n.theme-dark .ak-row { color: rgba(243,236,227,.6); } .theme-dark .ak-row path { stroke: rgba(243,233,220,.85); }\n.theme-dark .ak-row.is-flag { color: #f7a84b; } .theme-dark .ak-row.is-flag path { stroke: #f7a84b; }\n.ak-flag { display: flex; align-items: center; gap: 9px; margin: 12px 0 0; padding-top: 11px; border-top: 1px solid rgba(10,10,10,.1); font: 500 10.5px/1.3 'Geist Mono', ui-monospace, monospace; letter-spacing: .07em; text-transform: uppercase; color: #c25200; }\n.ak-flag i { flex: none; width: 7px; height: 7px; border-radius: 50%; background: #e86a08; box-shadow: 0 0 0 3px rgba(232,106,8,.16); }\n.theme-dark .ak-flag { border-top-color: rgba(243,233,220,.16); color: #f7a84b; } .theme-dark .ak-flag i { background: #f7a84b; box-shadow: 0 0 0 3px rgba(247,168,75,.18); }\n@media (max-width: 760px) { .ak-catch { width: min(340px, calc(100% - 32px)); padding: 11px 14px 10px; } .ak-catch h4 { margin-bottom: 2px; font-size: 14px; } .ak-row { gap: 12px; margin-top: 2px; font-size: 11px; } .ak-row svg { width: 80px; height: 28px; } .ak-flag { margin-top: 8px; padding-top: 8px; font-size: 10px; } }\n\n/* pace=\"video\": one fold, the story as a looping video */\n.ak-video { position: relative; height: 100vh; height: 100svh; background: var(--night); overflow: hidden; }\n.ak-video video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: var(--night); }\n.ak-video video.is-phone { object-fit: cover; }\n.ak-vbtn { all: unset; position: absolute; left: 50%; bottom: max(18px, env(safe-area-inset-bottom)); transform: translateX(-50%); padding: 9px 16px; border-radius: 999px;\n  font: 500 13px/1 var(--f-sans); color: #f4f0ea; background: rgba(20,16,13,.6); border: 1px solid rgba(244,240,234,.22); cursor: pointer; }\n.ak-vbtn:focus-visible { outline: 2px solid rgba(244,240,234,.7); outline-offset: 2px; }\n\n/* the `switcher` attribute: a small control to compare the four versions, shown while the section is on screen */\n.ak-switch { position: fixed; z-index: 2147483000; right: 16px; bottom: 16px; display: flex; gap: 2px; padding: 3px; border-radius: 999px;\n  background: rgba(20,16,13,.8); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: 0 2px 10px rgba(0,0,0,.25);\n  font: 500 12px/1 system-ui, -apple-system, sans-serif; opacity: 0; visibility: hidden; transition: opacity .2s, visibility .2s; }\n.ak-switch.is-on { opacity: 1; visibility: visible; }\n.ak-switch button { all: unset; padding: 8px 11px; border-radius: 999px; color: rgba(255,255,255,.72); cursor: pointer; }\n.ak-switch button[aria-pressed=\"true\"] { background: #fff; color: #1a1714; }\n.ak-switch button:focus-visible, .ak-switch select:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }\n.ak-switch select { display: none; }\n@media (max-width: 760px) {\n  .ak-switch { top: max(10px, env(safe-area-inset-top)); right: 10px; bottom: auto; padding: 0; }\n  .ak-switch button { display: none; }\n  .ak-switch select { display: block; appearance: none; -webkit-appearance: none; border: 0; border-radius: 999px; padding: 8px 26px 8px 12px; font: inherit; color: #fff;\n    background: transparent url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23fff' stroke-width='1.5'/%3E%3C/svg%3E\") no-repeat right 11px center; }\n}\n";

/* ---------- the packaged section: <accurbeat-narrative> ----------
   Appended by tools/build-package.py after the engine, data and photo modules. Everything renders in a shadow root,
   so the site's CSS can't reach in and this section's CSS can't leak out.
   Four versions of the same story, chosen with `pace`:
     paced    scroll-driven, no landing; each beat holds for a stretch of scroll; never faster than 1.5× the authored pace
     snap     native scroll that lands on each beat; the visual plays each transition at its authored pace
     stepped  one gesture plays the next transition (the page's scroll is taken over while the story is on screen)
     video    a one-fold looping video of the story (no scroll-driven section) */

const DEFAULT_COPY = {
  c1: 'A wearable alert or a 10-second ECG sees only a *snapshot.*',
  c2: 'The odds of catching an episode in *those* *10* *seconds* are low.',
  c3: 'AccurBeat records *every* *beat* for 3 days, in real life.',
  c4: 'And catches the episodes a snapshot would have *missed.*',
};
const SUMMARY = [
  'A wearable alert or a 10-second ECG sees only a snapshot: about a dozen heartbeats. Across three days of real life, those 10 seconds are 0.004% of the time, so the odds of catching an episode in them are low.',
  'AccurBeat records every beat for three days and flags the 341 early beats among them, including three episodes: on the stairs on day one, asleep and unfelt on day two, and on the stairs again on day three. None of them fell inside the 10-second ECG. On day two at 03:14, while asleep and with no symptoms, every second beat was wide with no P wave, and it was flagged for physician review.',
];
const PACES = ['paced', 'snap', 'stepped', 'video'];
const PACE_NAMES = { paced: 'Paced', snap: 'Snap', stepped: 'Stepped', video: 'Video' };
const DEFAULT_PACE = 'snap';
const MODULE_ASSETS = new URL('./assets/', import.meta.url).href;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const withSlash = (p) => (p.endsWith('/') ? p : p + '/');
const plain = (s) => String(s).replace(/\*/g, '');

let SIGNAL = null;                       // the synthetic recording: built once (≈70 ms), shared by every instance
const signal = () => SIGNAL || (SIGNAL = makeSignal());

function markup(copy, hud, label) {
  return `
  <section class="narrative" id="narrative" aria-label="${esc(label)}">
    <div class="stage" id="stage">
      <canvas id="cv-back" aria-hidden="true"></canvas>
      <canvas id="cv-gl" aria-hidden="true"></canvas>
      <canvas id="cv-front" aria-hidden="true"></canvas>
      <div class="grain" aria-hidden="true"></div>
      ${['c1', 'c2', 'c3', 'c4'].map((k) => `<p class="copy" data-k="${k}">${esc(copy[k])}</p>`).join('\n      ')}
      <aside class="ak-catch" id="callout" aria-hidden="true">
      <h4>Beat shape</h4>
      <div class="ak-row"><svg viewBox="0 0 110 40" aria-hidden="true"><path id="co-path-n"/></svg><span>narrow, P wave present</span></div>
      <div class="ak-row is-flag"><svg viewBox="0 0 110 40" aria-hidden="true"><path id="co-path-v"/></svg><span>wide, no P wave</span></div>
      <p class="ak-flag"><i aria-hidden="true"></i>Flagged for physician review</p>
    </aside>

      ${hud ? `<div class="hud" id="hud" aria-hidden="true">
        <div class="hud-lens" id="hud-lens"><b id="hud-idx">01</b><span class="hud-of">/04</span><span class="hud-name" id="hud-name">Snapshot</span></div>
        <dl class="hud-read" id="hud-read">
          <div><dt id="r-l1">View</dt><dd id="r-v1">11.6 s</dd></div>
          <div><dt id="r-l2">Beats recorded</dt><dd id="r-v2">0</dd></div>
          <div><dt id="r-l3">Coverage</dt><dd id="r-v3">86%</dd></div>
        </dl>
      </div>` : ''}
    </div>
    <div class="sr-only">${SUMMARY.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  </section>`;
}

/**
 * Mount the scroll-driven narrative into any element (it gets a shadow root). Returns { ready, jump(u), destroy(), u, plan() }.
 * options: { pace = 'snap' | 'paced' | 'stepped', nav = true, hud = false, theme = 'light' | 'dark',
 *            assets = '<url of the assets folder>', copy = { c1..c4 }, label, debug }
 */
export function mountNarrative(host, options = {}) {
  const o = Object.assign({ pace: DEFAULT_PACE, nav: true, hud: false, theme: 'light', assets: MODULE_ASSETS, copy: {}, label: 'Why a 3-day Holter test?', debug: false }, options);
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${CSS}</style>` + markup(Object.assign({}, DEFAULT_COPY, o.copy), o.hud, o.label || 'Why a 3-day Holter test?');
  return AKNarrative({
    signal: signal(), AKLife, root: shadow, query: '', life: 'mosaic', theme: o.theme, pace: o.pace, nav: o.nav !== false,
    lifeCfg: CFG.life, cloudCfg: CFG.cloud, graphCfg: CFG.graph, assetBase: withSlash(o.assets), debug: !!o.debug,
  });
}

/**
 * The video version: one fold, the story playing on its own (muted, looping) while the fold is in view.
 * Phones get the vertical cut; wider screens the 16:9 one. Reduced motion shows the still frame with a Play button.
 * Returns { destroy() }.
 */
export function mountVideo(host, options = {}) {
  const o = Object.assign({ assets: MODULE_ASSETS, label: 'Why a 3-day Holter test?', copy: {} }, options);
  const base = withSlash(o.assets) + 'video/';
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const lines = ['c1', 'c2', 'c3', 'c4'].map((k) => plain(Object.assign({}, DEFAULT_COPY, o.copy)[k]));
  shadow.innerHTML = `<style>${CSS}</style>
  <section class="ak-video" aria-label="${esc(o.label)}">
    <video muted loop playsinline preload="metadata" aria-hidden="true"></video>
    <button class="ak-vbtn" type="button">Pause</button>
    <div class="sr-only">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}${SUMMARY.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  </section>`;
  const v = shadow.querySelector('video'), b = shadow.querySelector('.ak-vbtn');
  const mqPhone = matchMedia('(max-aspect-ratio: 4/5)'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cut = '', userPaused = still, inView = false;
  const pick = () => {
    const c = mqPhone.matches ? 'phone' : 'desktop';
    if (c === cut) return;
    cut = c;
    v.poster = base + `narrative-${c}-poster.jpg`;
    v.innerHTML = `<source src="${base}narrative-${c}.webm" type="video/webm"><source src="${base}narrative-${c}.mp4" type="video/mp4">`;
    v.classList.toggle('is-phone', c === 'phone');
    v.load();
    if (inView && !userPaused) v.play().catch(() => {});
  };
  const sync = () => { b.textContent = userPaused ? 'Play' : 'Pause'; b.setAttribute('aria-label', userPaused ? 'Play the story video' : 'Pause the story video'); };
  b.onclick = () => { userPaused = !userPaused; if (userPaused) v.pause(); else v.play().catch(() => {}); sync(); };
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView && !userPaused) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.5 });
  pick(); sync(); io.observe(v);
  mqPhone.addEventListener('change', pick);
  return { destroy() { io.disconnect(); mqPhone.removeEventListener('change', pick); v.pause(); v.removeAttribute('src'); v.innerHTML = ''; v.load(); } };
}

/* <accurbeat-narrative pace="snap" assets="/static/accurbeat-narrative/assets/" switcher>
     <p data-k="c1">Optional copy override, with *highlighted* words</p>
   </accurbeat-narrative>
   attributes: pace (snap · paced · stepped · video), switcher (a small control to compare the four), nav="off" (no
   progress bar), hud, theme, assets, label, debug. el.pace = 'paced' switches live. */
export class AccurbeatNarrative extends HTMLElement {
  static get observedAttributes() { return ['pace']; }
  get pace() { return this._pace || this._attrPace(); }
  set pace(p) { this.setAttribute('pace', p); }
  _attrPace() { const p = (this.getAttribute('pace') || DEFAULT_PACE).toLowerCase(); return PACES.includes(p) ? p : DEFAULT_PACE; }
  connectedCallback() {
    if (this._api) return;
    if (!this._copy) { this._copy = {}; this.querySelectorAll('[data-k]').forEach((el) => { this._copy[el.dataset.k] = el.textContent.trim(); }); }
    this._mount(this._attrPace());
    if (this.hasAttribute('switcher')) this._switcher();
  }
  disconnectedCallback() { this._unmount(); if (this._sw) { this._sw.io.disconnect(); this._sw.el.remove(); this._sw = null; } }
  attributeChangedCallback(name, was, now) { if (name === 'pace' && this._api && was !== now) this._switch(this._attrPace()); }
  /** Jump to a moment in the story (the beats' frames are this.frames()). */
  jump(u) { if (this._api && this._api.jump) this._api.jump(u); }
  /** The four beats' frames, in jump() units (empty for the video). */
  frames() { return this._api && this._api.plan ? this._api.plan().stops : []; }
  _mount(p) {
    this._pace = p;
    const common = { assets: this.getAttribute('assets') || MODULE_ASSETS, label: this.getAttribute('label') || undefined, copy: this._copy };
    this._api = p === 'video' ? mountVideo(this, common) : mountNarrative(this, Object.assign(common, {
      pace: p, nav: this.getAttribute('nav') !== 'off', hud: this.hasAttribute('hud'),
      theme: this.getAttribute('theme') || 'light', debug: this.hasAttribute('debug'),
    }));
    if (this._sw) this._sw.update();
  }
  _unmount() { if (this._api) { this._api.destroy(); this._api = null; } }
  // switch versions in place, staying on the beat you were on (or at the top of the section)
  _switch(p) {
    const api = this._api, top = this.getBoundingClientRect().top;
    let beat = -1;
    if (api && api.plan) { const S = api.plan().stops, u = api.u; S.forEach((v, i) => { if (u >= v - 0.02) beat = i; }); if (u < S[0] - 0.3) beat = -1; }
    const inside = top <= 1 && this.getBoundingClientRect().bottom > innerHeight;
    this._unmount(); this._mount(p);
    const toTop = () => window.scrollTo(0, Math.round(this.getBoundingClientRect().top + window.scrollY));
    if (this._api.ready) this._api.ready.then((a) => { if (a !== this._api) return; if (inside && beat >= 0) a.jump(a.plan().stops[beat]); else if (inside) toTop(); });
    else if (inside || top < 0) toTop();
  }
  // the compare control: fixed to the viewport while the section is on screen
  _switcher() {
    const el = document.createElement('nav');
    el.className = 'ak-switch'; el.setAttribute('aria-label', 'Compare versions');
    el.innerHTML = PACES.map((p) => `<button type="button" data-p="${p}">${PACE_NAMES[p]}</button>`).join('') +
      `<select aria-label="Version">${PACES.map((p) => `<option value="${p}">${PACE_NAMES[p]}</option>`).join('')}</select>`;
    el.addEventListener('click', (e) => { const b = e.target.closest('button[data-p]'); if (b) this.pace = b.dataset.p; });
    el.querySelector('select').onchange = (e) => { this.pace = e.target.value; };
    const update = () => {
      if (!this.shadowRoot.contains(el)) this.shadowRoot.appendChild(el);   // a remount rewrites the shadow root
      el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === this._pace)));
      el.querySelector('select').value = this._pace;
    };
    const io = new IntersectionObserver(([e]) => el.classList.toggle('is-on', e.isIntersecting), { threshold: 0 });
    io.observe(this);
    this._sw = { el, io, update };
    update();
  }
}
if (typeof customElements !== 'undefined' && !customElements.get('accurbeat-narrative')) customElements.define('accurbeat-narrative', AccurbeatNarrative);

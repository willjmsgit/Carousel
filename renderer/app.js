(() => {
  'use strict';
  const L = window.IGLogic;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const txt = (tag, cls, text) => { const e = el(tag, cls); e.textContent = text; return e; };

  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    rotL: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    rotR: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    flip: '<path d="M12 3v18"/><path d="m8 7-5 5 5 5V7z"/><path d="m16 7 5 5-5 5V7z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 21h16"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    comment: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-5.2A8.4 8.4 0 1 1 21 11.5z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    shFirst: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 10 2-1v7"/>',
    shMixed: '<rect x="2.5" y="4" width="8" height="16" rx="1.5"/><rect x="13.5" y="4" width="8" height="8" rx="1.5"/><rect x="13.5" y="14" width="8" height="6" rx="1.5"/>',
    sh34: '<rect x="6" y="4" width="12" height="16" rx="2"/>',
    sh45: '<rect x="4.8" y="3" width="14.4" height="18" rx="2"/>',
    sh11: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
    sh191: '<rect x="2" y="6.5" width="20" height="11" rx="2"/>',
    bookmark: '<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  };
  const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  function button(cls, html, title, fn) {
    const b = el('button', cls, html);
    b.type = 'button';
    if (title) { b.title = title; b.setAttribute('aria-label', title); }
    if (fn) b.onclick = fn;
    return b;
  }

  // ---------- state ----------
  const DEFAULT_ADJ = () => ({ brightness: 100, contrast: 100, saturation: 100, warmth: 0, grayscale: 0, sepia: 0 });
  const isDefaultAdj = (a) => Object.entries(DEFAULT_ADJ()).every(([k, v]) => a[k] === v);
  const filterName = (a) => Object.keys(FILTERS).find((k) => { const t = Object.assign(DEFAULT_ADJ(), FILTERS[k]); return Object.entries(t).every(([key, v]) => a[key] === v); }) || '';
  const FILTERS = {
    Original: {},
    Vivid: { contrast: 112, saturation: 135 },
    Warm: { warmth: 35, saturation: 110 },
    Cool: { warmth: -35 },
    Mono: { grayscale: 100, contrast: 110 },
    Fade: { contrast: 85, brightness: 108, saturation: 85 },
    Sepia: { sepia: 70 },
  };

  const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  // Instagram's own typeface is not licensed for other apps, so these use system fonts (Segoe UI on Windows).
  const TEXT_STYLES = {
    classic: { name: 'Classic', font: (px) => `700 ${px}px ${SANS}` },
    modern: { name: 'Modern', font: (px) => `400 ${px}px ${SANS}`, ls: 0.04 },
    neon: { name: 'Neon', font: (px) => `600 ${px}px ${SANS}`, glow: true },
    typewriter: { name: 'Typewriter', font: (px) => `500 ${px}px "Courier New", Courier, monospace` },
    strong: { name: 'Strong', font: (px) => `900 ${px}px Impact, "Arial Black", ${SANS}`, upper: true },
  };
  const TEXT_COLORS = ['#ffffff', '#000000', '#ed4956', '#ff8a00', '#ffd600', '#00c853', '#0095f6', '#8a3ab9'];
  // Close to Instagram's gradients (the logo and the story backgrounds). Instagram doesn't publish exact values.
  const BACKGROUNDS = {
    ig: { name: 'Instagram', stops: ['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5'] },
    sunset: { name: 'Sunset', stops: ['#f9ce34', '#ee2a7b', '#6228d7'] },
    ocean: { name: 'Ocean', stops: ['#00c6ff', '#0072ff'] },
    mint: { name: 'Mint', stops: ['#11998e', '#38ef7d'] },
    peach: { name: 'Peach', stops: ['#ffecd2', '#fcb69f'] },
    night: { name: 'Night', stops: ['#0f0c29', '#302b63', '#24243e'] },
  };
  const bgStops = (bg) => (BACKGROUNDS[bg.slice(2)] || BACKGROUNDS.ig).stops;
  const bgCss = (bg) => (bg.startsWith('g:') ? `linear-gradient(45deg, ${bgStops(bg).join(',')})` : bg);
  function paintBg(ctx, bg, w, h) {
    if (bg.startsWith('g:')) {
      const st = bgStops(bg), gr = ctx.createLinearGradient(0, h, w, 0);
      st.forEach((c, i) => gr.addColorStop(i / (st.length - 1), c));
      ctx.fillStyle = gr;
    } else ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  const isLight = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150; };

  const state = {
    slides: [], // [{ id, asset, rot, flip, zoom, panX, panY, fit, bg, adj, layers: [{ id, asset, cx, cy, w, rot, flip, opacity }] }]
    sel: 0,
    layer: null, // selected layer id on the selected slide; null = the background photo
    panel: true, // right sidebar (layers + adjustments) visible
    shapeMenu: false,
    preview: 'feed', // off | feed | grid: live preview beside the editor
    ratio: 'auto',
    mode: 'match',
    theme: 'light',
    username: 'yourname',
    caption: 'Instagram will collapse long captions after abouuuut two lines, so the first sentence matters most, see?^',
  };
  const assets = new Map(); // id -> { id, name, file, img, proxy, w, h }
  const A = (id) => assets.get(id);
  const cur = () => state.slides[state.sel];
  const curLayer = () => { const s = cur(); return s && state.layer != null ? s.layers.find((l) => l.id === state.layer) || null : null; };
  let uid = 0, lastSig = '', toastTimer, dragIdx = null, ed = null, feed = null;
  const cam = { z: 1, x: 0, y: 0 }; // Edit-view zoom/pan (screen only, never exported)
  let space = false, vp = null, viewTimer;

  // ---------- undo / redo (slides + layers only; originals stay in `assets`) ----------
  let hist = [], fut = [];
  const snapshot = () => JSON.stringify({ slides: state.slides, sel: state.sel, layer: state.layer });
  function checkpoint() {
    const s = snapshot();
    if (hist[hist.length - 1] === s) return;
    hist.push(s);
    if (hist.length > 80) hist.shift();
    fut = [];
    updateTop();
  }
  function restore(js) {
    const o = JSON.parse(js);
    state.slides = o.slides;
    state.sel = Math.max(0, Math.min(o.sel, o.slides.length - 1));
    state.layer = o.layer;
    if (!curLayer()) state.layer = null;
  }
  function undo() { if (!hist.length) return; fut.push(snapshot()); restore(hist.pop()); renderAll(); }
  function redo() { if (!fut.length) return; hist.push(snapshot()); restore(fut.pop()); renderAll(); }

  // ---------- assets, slides, layers ----------
  function makeProxy(img) {
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  async function addAsset(file) {
    const img = await loadImage(file);
    const a = { id: ++uid, name: file.name, file, img, proxy: makeProxy(img), w: img.naturalWidth, h: img.naturalHeight };
    assets.set(a.id, a);
    return a;
  }
  async function loadAssets(files) {
    const out = [];
    for (const f of files) {
      try { out.push(await addAsset(f)); }
      catch { toast(`Couldn’t open ${f.name}. HEIC isn’t supported, so convert it to JPG or PNG first.`); }
    }
    return out;
  }
  const newSlide = (a) => ({ id: ++uid, asset: a.id, rot: 0, flip: false, zoom: 1, panX: 0, panY: 0, fit: 'cover', bg: '#000000', adj: DEFAULT_ADJ(), layers: [] });
  function makeLayer(a, s, x = 0.5, y = 0.5) {
    const fa = frameInfo().slideARs[Math.max(0, state.slides.indexOf(s))] || 0.8;
    const w = Math.min(0.5, (0.6 * a.w) / (a.h * fa)); // at most half the frame width and 60% of its height
    return { id: ++uid, asset: a.id, cx: L.clamp(x, 0, 1), cy: L.clamp(y, 0, 1), w, rot: 0, flip: false, opacity: 1 };
  }

  const makeText = (x = 0.5, y = 0.5) => ({ id: ++uid, kind: 'text', text: 'Your text', style: 'classic', color: '#ffffff', size: 0.09, align: 'center', fill: false, cx: x, cy: y, rot: 0, opacity: 1 });
  function focusText() { if (!state.panel) setPanel(true); const t = $('#panel textarea'); if (t) { t.focus(); t.select(); } }
  function addTextLayer() {
    const s = cur();
    if (!s) return;
    checkpoint();
    const ly = makeText();
    s.layers.push(ly);
    state.layer = ly.id;
    renderAll();
    focusText();
  }
  function addBlankSlide() {
    if (state.slides.length >= L.MAX_SLIDES) return toast(`Instagram allows ${L.MAX_SLIDES} slides per post`);
    checkpoint();
    const a = { id: ++uid, name: 'text-slide', blank: true, w: 1080, h: 1350 };
    assets.set(a.id, a);
    const s = newSlide(a);
    s.bg = 'g:ig';
    const ly = makeText();
    s.layers.push(ly);
    state.slides.push(s);
    state.sel = state.slides.length - 1;
    state.layer = ly.id;
    renderAll();
    focusText();
  }

  const imageFiles = (list) => [...list].filter((f) => f.type.startsWith('image/'));

  async function addFiles(list) {
    const files = imageFiles(list);
    if (!files.length) return toast('That selection has no images');
    const room = L.MAX_SLIDES - state.slides.length;
    if (room <= 0) return toast(`Instagram allows ${L.MAX_SLIDES} slides per post`);
    if (files.length > room) toast(`Instagram allows ${L.MAX_SLIDES} slides, so ${files.length - room} were skipped`);
    const loaded = await loadAssets(files.slice(0, room));
    if (!loaded.length) return;
    checkpoint();
    const first = state.slides.length;
    loaded.forEach((a) => state.slides.push(newSlide(a)));
    state.sel = first;
    state.layer = null;
    renderAll();
  }

  async function addLayerFiles(list, at) {
    const files = imageFiles(list);
    const sid = cur() && cur().id;
    if (!sid) return;
    if (!files.length) return toast('That selection has no images');
    const loaded = await loadAssets(files);
    const s = state.slides.find((x) => x.id === sid);
    if (!loaded.length || !s) return;
    checkpoint();
    let ly;
    loaded.forEach((a, k) => { ly = makeLayer(a, s, (at ? at.x : 0.5) + k * 0.04, (at ? at.y : 0.5) + k * 0.04); s.layers.push(ly); });
    state.sel = state.slides.indexOf(s);
    state.layer = ly.id;
    renderAll();
  }

  function moveSlide(from, to) {
    if (from === to || to < 0 || to >= state.slides.length) return;
    checkpoint();
    const id = cur() && cur().id;
    const [s] = state.slides.splice(from, 1);
    state.slides.splice(to, 0, s);
    state.sel = Math.max(0, state.slides.findIndex((x) => x.id === id));
    renderAll();
  }
  function removeSlide(i) {
    if (!state.slides[i]) return;
    checkpoint();
    state.slides.splice(i, 1);
    if (i < state.sel) state.sel--;
    state.sel = Math.max(0, Math.min(state.sel, state.slides.length - 1));
    state.layer = null;
    renderAll();
    toast('Slide removed', { label: 'Undo', fn: undo });
  }
  function duplicateSlide(i) {
    if (state.slides.length >= L.MAX_SLIDES) return toast(`Instagram allows ${L.MAX_SLIDES} slides per post`);
    checkpoint();
    const c = JSON.parse(JSON.stringify(state.slides[i]));
    c.id = ++uid;
    c.layers.forEach((l) => (l.id = ++uid));
    state.slides.splice(i + 1, 0, c);
    state.sel = i + 1;
    state.layer = null;
    renderAll();
  }
  function removeLayer(id) {
    const s = cur();
    checkpoint();
    s.layers = s.layers.filter((l) => l.id !== id);
    if (state.layer === id) state.layer = null;
    renderAll();
  }
  function shiftLayer(id, d) {
    const s = cur();
    const i = s.layers.findIndex((l) => l.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= s.layers.length) return;
    checkpoint();
    [s.layers[i], s.layers[j]] = [s.layers[j], s.layers[i]];
    renderAll();
  }

  // Moves (or with copy=true, copies) one slide's photo on top of another slide as a layer.
  function placeOnto(srcIdx, dstIdx, { copy = false, at } = {}) {
    const src = state.slides[srcIdx], dst = state.slides[dstIdx];
    if (!src || !dst) return;
    if (src === dst) return toast('Drop it on a different slide');
    if (A(src.asset).blank) return toast('A blank slide has no photo to place. Drag a photo slide instead.');
    checkpoint();
    const ly = makeLayer(A(src.asset), dst, at ? at.x : 0.5, at ? at.y : 0.5);
    dst.layers.push(ly);
    if (!copy) state.slides.splice(srcIdx, 1);
    state.sel = state.slides.indexOf(dst);
    state.layer = ly.id;
    renderAll();
    toast(copy ? 'Placed a copy on the slide' : 'Placed on the slide. The original slide was removed.', { label: 'Undo', fn: undo });
  }

  // ---------- drawing ----------
  const cssFilter = (a) => `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) grayscale(${a.grayscale}%) sepia(${a.sepia}%)`;

  const isText = (ly) => ly.kind === 'text';
  const scaleOf = (ly) => (isText(ly) ? ly.size : ly.w);
  const setScale = (ly, v) => { if (isText(ly)) ly.size = L.clamp(v, 0.02, 0.5); else ly.w = L.clamp(v, 0.03, 3); };
  const mctx = document.createElement('canvas').getContext('2d');
  // Size of a text layer's box when the frame is tw px wide. Everything scales with tw.
  function textBox(ly, tw) {
    const st = TEXT_STYLES[ly.style] || TEXT_STYLES.classic;
    const px = Math.max(2, ly.size * tw);
    mctx.font = st.font(px);
    mctx.letterSpacing = st.ls ? `${(st.ls * px).toFixed(2)}px` : '0px';
    const lines = (st.upper ? ly.text.toUpperCase() : ly.text).split('\n');
    const widest = Math.max(...lines.map((l) => mctx.measureText(l || ' ').width));
    const lh = px * 1.2, padX = ly.fill ? px * 0.4 : 0, padY = ly.fill ? px * 0.2 : 0;
    return { st, px, lines, lh, padX, padY, w: Math.max(px * 0.6, widest) + padX * 2, h: lh * lines.length + padY * 2 };
  }
  function drawText(ctx, ly, tw, th) {
    const b = textBox(ly, tw);
    ctx.save();
    ctx.globalAlpha = ly.opacity;
    ctx.translate(ly.cx * tw, ly.cy * th);
    ctx.rotate((ly.rot * Math.PI) / 180);
    ctx.font = b.st.font(b.px);
    ctx.letterSpacing = mctx.letterSpacing;
    ctx.textBaseline = 'middle';
    ctx.textAlign = ly.align;
    let ink = ly.color;
    if (ly.fill) {
      ctx.fillStyle = ly.color;
      ctx.beginPath();
      ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, b.px * 0.3);
      ctx.fill();
      ink = isLight(ly.color) ? '#000000' : '#ffffff';
    }
    const x = ly.align === 'left' ? -b.w / 2 + b.padX : ly.align === 'right' ? b.w / 2 - b.padX : 0;
    const lines = () => b.lines.forEach((t, k) => ctx.fillText(t, x, -b.h / 2 + b.padY + b.lh * (k + 0.5)));
    if (b.st.glow && !ly.fill) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = ly.color;
      ctx.shadowBlur = b.px * 0.5; lines();
      ctx.shadowBlur = b.px * 0.15; lines();
    } else { ctx.fillStyle = ink; lines(); }
    ctx.restore();
  }
  function layerBox(ly, W) {
    if (isText(ly)) { const b = textBox(ly, W); return { w: b.w, h: b.h }; }
    const a = A(ly.asset), w = ly.w * W;
    return { w, h: (w * a.h) / a.w };
  }

  function drawLayer(ctx, ly, tw, th, full) {
    if (isText(ly)) return drawText(ctx, ly, tw, th);
    const a = A(ly.asset);
    const src = full ? a.img : a.proxy;
    const w = ly.w * tw, h = (w * a.h) / a.w;
    ctx.save();
    ctx.globalAlpha = ly.opacity;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(ly.cx * tw, ly.cy * th);
    ctx.rotate((ly.rot * Math.PI) / 180);
    if (ly.flip) ctx.scale(-1, 1);
    ctx.drawImage(src, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawPhoto(s, a, ctx, tw, th, full) {
    const src = full ? a.img : a.proxy;
    const sw = full ? a.w : src.width, sh = full ? a.h : src.height;
    const { iw, ih } = s.rot % 180 ? { iw: sh, ih: sw } : { iw: sw, ih: sh };
    const p = L.placeImage(iw, ih, tw, th, s.zoom, s.panX, s.panY, s.fit);
    ctx.save();
    ctx.filter = cssFilter(s.adj);
    ctx.translate(p.cx, p.cy);
    ctx.rotate((s.rot * Math.PI) / 180);
    if (s.flip) ctx.scale(-1, 1);
    ctx.scale(p.scale, p.scale);
    ctx.drawImage(src, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
    if (s.adj.warmth) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(1, (Math.abs(s.adj.warmth) / 100) * 0.8);
      ctx.fillStyle = s.adj.warmth > 0 ? '#ff9a3c' : '#3c8cff';
      ctx.fillRect(0, 0, tw, th);
      ctx.restore();
    }
  }

  function renderSlide(s, canvas, tw, th, full) {
    const a = A(s.asset);
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    paintBg(ctx, s.bg, tw, th);
    if (!a.blank) drawPhoto(s, a, ctx, tw, th, full);
    for (const ly of s.layers) drawLayer(ctx, ly, tw, th, full);
  }

  function frameInfo() {
    return L.carousel(state.mode, state.ratio, state.slides.map((s) => { const a = A(s.asset); return L.naturalAR(a.w, a.h, s.rot); }));
  }

  // ---------- rendering ----------
  function renderAll() {
    lastSig = JSON.stringify(frameInfo());
    renderBar();
    renderStrip();
    renderStage();
    renderPanel();
    updateTop();
  }

  // After a single-slide edit: repaint only what changed, unless the frame shape changed.
  function refresh() {
    if (JSON.stringify(frameInfo()) !== lastSig) return renderAll();
    paintThumb(state.sel);
    paintEdit();
    paintPreview();
  }

  function updateTop() {
    $('#undo').disabled = !hist.length;
    $('#redo').disabled = !fut.length;
    $('#export').disabled = !state.slides.length;
    document.querySelectorAll('#views button').forEach((b) => {
      b.classList.toggle('on', b.dataset.view === state.preview);
      b.disabled = !state.slides.length;
    });
  }

  function toggle(label, on, fn, title) {
    const b = button('switch' + (on ? ' on' : ''), `<i></i><span>${label}</span>`, title, null);
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', String(on));
    b.onclick = () => { const v = !b.classList.contains('on'); b.classList.toggle('on', v); b.setAttribute('aria-checked', String(v)); fn(v); };
    return b;
  }

  function seg(options, value, onPick) {
    const d = el('div', 'seg');
    options.forEach(([v, label]) => {
      const b = button(v === value ? 'on' : '', label, null, () => onPick(v));
      d.append(b);
    });
    return d;
  }

  const SHAPES = [['first', 'Match first photo', 'shFirst'], ['mixed', 'Mixed', 'shMixed'], ['3:4', '3:4', 'sh34'], ['4:5', '4:5', 'sh45'], ['1:1', 'Square', 'sh11'], ['1.91:1', 'Landscape', 'sh191']];

  function renderBar() {
    const wrap = $('#shapeWrap'), btn = $('#shapeBtn'), menu = $('#shapeMenu');
    wrap.hidden = !state.slides.length;
    menu.innerHTML = '';
    if (!state.slides.length) { state.shapeMenu = false; menu.hidden = true; return; }
    const val = state.ratio !== 'auto' ? state.ratio : state.mode === 'mixed' ? 'mixed' : 'first';
    const now = SHAPES.find((x) => x[0] === val);
    btn.innerHTML = `${ic(now[2])}<span>${now[1]}</span>${ic('down')}`;
    btn.title = 'Post shape';
    btn.setAttribute('aria-label', `Post shape: ${now[1]}`);
    btn.setAttribute('aria-expanded', String(state.shapeMenu));
    menu.hidden = !state.shapeMenu;
    SHAPES.forEach(([v, label, icon]) => {
      const on = v === val;
      const it = button('menu-item' + (on ? ' on' : ''), `${ic(icon)}<span>${label}</span>${on ? ic('check') : ''}`, null, () => {
        if (v === 'first') { state.ratio = 'auto'; state.mode = 'match'; }
        else if (v === 'mixed') { state.ratio = 'auto'; state.mode = 'mixed'; }
        else state.ratio = v;
        state.shapeMenu = false;
        renderAll();
      });
      it.setAttribute('role', 'menuitemradio');
      it.setAttribute('aria-checked', String(on));
      menu.append(it);
    });
    const ar = frameInfo().frameAR;
    const names = [[3 / 4, '3:4'], [4 / 5, '4:5'], [1, '1:1'], [1.91, '1.91:1']];
    const hit = names.find(([v]) => Math.abs(v - ar) < 0.01);
    const nm = hit ? hit[1] : `${ar.toFixed(2)}:1`;
    const hint = val === 'mixed' ? 'Each slide keeps its own shape (3:4 to 1.91:1 only). The tallest sets the frame; shorter ones get bars.'
      : val === 'first' ? `Every slide is cropped to slide 1’s shape (${nm}).` : `Every slide is cropped to ${nm}.`;
    menu.append(txt('p', 'menu-note', hint));
  }

  function setShapeMenu(open) { state.shapeMenu = open; renderBar(); }

  function setPanel(open) {
    state.panel = open;
    $('#panel').hidden = !open;
    $('main').classList.toggle('no-panel', !open);
    const b = $('#togglePanel');
    b.setAttribute('aria-pressed', String(open));
    b.title = (open ? 'Hide sidebar' : 'Show sidebar') + ' (Ctrl+\\)';
    b.setAttribute('aria-label', open ? 'Hide sidebar' : 'Show sidebar');
    try { localStorage.setItem('carousel.panel', open ? '1' : '0'); } catch (e) { /* storage unavailable */ }
  }

  // ----- slide rail -----
  function paintThumb(i) {
    const it = document.querySelectorAll('#strip .item')[i];
    const t = it && it.querySelector('canvas');
    if (!t) return;
    const ar = frameInfo().slideARs[i];
    renderSlide(state.slides[i], t, 160, Math.round(160 / ar), false);
  }
  function markStrip() {
    document.querySelectorAll('#strip .item').forEach((n, k) => n.classList.toggle('sel', k === state.sel));
  }
  const zoneOf = (e, it) => { const r = it.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height; return y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'onto'; };
  const clearZone = (it) => it.classList.remove('z-before', 'z-after', 'z-onto');

  function renderStrip() {
    const strip = $('#strip');
    strip.innerHTML = '';
    const info = frameInfo();
    strip.append(el('div', 'strip-head', `<span>Slides</span><span class="muted">${state.slides.length}/${L.MAX_SLIDES}</span>`));
    state.slides.forEach((s, i) => {
      const it = el('div', 'item' + (i === state.sel ? ' sel' : ''));
      it.draggable = true;
      const c = document.createElement('canvas');
      renderSlide(s, c, 160, Math.round(160 / info.slideARs[i]), false);
      it.append(c, el('span', 'num', String(i + 1)));
      if (s.layers.length) it.append(el('span', 'tag', `${ic('layers')}${s.layers.length}`));
      const acts = el('div', 'item-acts');
      const act = (icon, title, fn) => button('mini', ic(icon), title, (e) => { e.stopPropagation(); fn(); });
      acts.append(act('up', 'Move up (Alt+←)', () => moveSlide(i, i - 1)), act('down', 'Move down (Alt+→)', () => moveSlide(i, i + 1)), act('copy', 'Duplicate', () => duplicateSlide(i)), act('trash', 'Remove (Del)', () => removeSlide(i)));
      it.append(acts);
      it.onclick = () => select(i);
      it.addEventListener('dragstart', (e) => {
        dragIdx = i;
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('text/plain', String(i));
        it.classList.add('dragging');
      });
      it.addEventListener('dragend', () => {
        dragIdx = null;
        it.classList.remove('dragging');
        strip.querySelectorAll('.item').forEach(clearZone);
        if (ed) ed.wrap.classList.remove('drop-target');
      });
      it.addEventListener('dragover', (e) => {
        if (dragIdx == null || dragIdx === i) return;
        e.preventDefault();
        const z = zoneOf(e, it);
        clearZone(it);
        it.classList.add('z-' + z);
        e.dataTransfer.dropEffect = z === 'onto' && e.altKey ? 'copy' : 'move';
      });
      it.addEventListener('dragleave', () => clearZone(it));
      it.addEventListener('drop', (e) => {
        if (dragIdx == null) return;
        e.preventDefault();
        e.stopPropagation();
        const z = zoneOf(e, it);
        clearZone(it);
        const from = dragIdx;
        dragIdx = null;
        if (from === i) return;
        if (z === 'onto') placeOnto(from, i, { copy: e.altKey });
        else moveSlide(from, z === 'before' ? (from < i ? i - 1 : i) : (from < i ? i : i + 1));
      });
      strip.append(it);
    });
    strip.append(button('add-tile', `${ic('plus')}<span>Add photos</span>`, 'Add photos', () => $('#file').click()), button('add-tile', `${ic('type')}<span>Blank slide</span>`, 'Add a blank slide with a background and text', addBlankSlide));
  }

  function select(i) {
    state.sel = L.clamp(i, 0, state.slides.length - 1);
    state.layer = null;
    markStrip();
    renderEdit();
    if (feed) goTo(state.sel);
    renderPanel();
  }

  // ----- stage: editor on the left, optional live preview on the right -----
  function renderStage() {
    const st = $('#stage');
    st.innerHTML = '';
    ed = null;
    feed = null;
    gridTiles = null;
    if (!state.slides.length) return emptyState(st);
    buildEdit(st);
    if (state.preview !== 'off') {
      const pane = el('aside', 'preview');
      st.append(pane);
      buildPreview(pane);
      layoutEdit(); // the pane takes width, so size the canvas again
    }
  }
  function renderEdit() {
    if (!ed) return renderStage();
    ed.holder.remove();
    ed = null;
    buildEdit($('#stage'));
  }

  function emptyState(st) {
    const d = el('div', 'empty', `<div class="ring">${ic('image')}</div><h2>Drop photos to start a post</h2><p>Reorder them, layer photos and text on top, and watch the feed and your profile grid update as you edit.</p>`);
    const row = el('div', 'row');
    row.style.justifyContent = 'center';
    row.append(button('btn primary', 'Choose photos', null, () => $('#file').click()), button('btn', 'Start with a blank slide', null, addBlankSlide));
    d.append(row);
    st.append(d);
  }

  // ----- edit canvas -----
  function toNorm(e) {
    const r = ed.wrap.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  function hitLayer(pt) {
    const s = cur();
    const W = ed.wrap.clientWidth, H = ed.wrap.clientHeight;
    for (let k = s.layers.length - 1; k >= 0; k--) {
      const ly = s.layers[k], bx = layerBox(ly, W);
      const dx = (pt.x - ly.cx) * W, dy = (pt.y - ly.cy) * H;
      const t = (-ly.rot * Math.PI) / 180;
      const lx = dx * Math.cos(t) - dy * Math.sin(t), lyy = dx * Math.sin(t) + dy * Math.cos(t);
      if (Math.abs(lx) <= bx.w / 2 && Math.abs(lyy) <= bx.h / 2) return ly;
    }
    return null;
  }

  function layoutEdit() {
    if (!ed || !cur()) return;
    const ar = frameInfo().slideARs[state.sel];
    const r = ed.holder.getBoundingClientRect();
    const w = Math.max(160, Math.min(r.width - 56, (r.height - 56) * ar));
    ed.wrap.style.width = `${w}px`;
    ed.wrap.style.height = `${w / ar}px`;
    applyView();
    paintEdit();
  }

  function applyView() {
    if (!ed) return;
    const off = cam.z === 1 && !cam.x && !cam.y;
    ed.wrap.style.setProperty('--z', cam.z);
    ed.wrap.style.transform = off ? '' : `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
    ed.badge.hidden = off;
    ed.badge.textContent = `${Math.round(cam.z * 100)}%`;
  }
  function resetView() { cam.z = 1; cam.x = cam.y = 0; applyView(); paintEdit(); }
  function zoomView(f, mx, my) {
    if (!ed) return;
    let z = L.clamp(cam.z * f, 0.5, 8);
    if (Math.abs(z - 1) < 0.03) z = 1;
    if (z === cam.z) return;
    const r = ed.wrap.getBoundingClientRect();
    const rcx = r.left + r.width / 2, rcy = r.top + r.height / 2; // centre on screen
    if (z === 1) { cam.x = cam.y = 0; }
    else {
      // keep the point under the cursor fixed while scaling
      cam.x = mx - (rcx - cam.x) - (z / cam.z) * (mx - rcx);
      cam.y = my - (rcy - cam.y) - (z / cam.z) * (my - rcy);
    }
    cam.z = z;
    applyView();
    clearTimeout(viewTimer);
    viewTimer = setTimeout(paintEdit, 120); // re-render sharper once zooming settles
  }

  function paintEdit() {
    if (!ed) return;
    const s = cur();
    if (!s) return;
    const ar = frameInfo().slideARs[state.sel];
    const W = ed.wrap.clientWidth, H = ed.wrap.clientHeight;
    if (!W) return;
    const pw = Math.min(cam.z > 1 ? 3600 : 1800, Math.round(W * (window.devicePixelRatio || 1) * Math.max(1, cam.z)));
    renderSlide(s, ed.canvas, pw, Math.round(pw / ar), false);

    // Faded copy of the whole photo behind the frame, so you can see what the crop cuts away.
    const a = A(s.asset);
    const iw = s.rot % 180 ? a.h : a.w, ih = s.rot % 180 ? a.w : a.h;
    const pl = L.placeImage(iw, ih, W, H, s.zoom, s.panX, s.panY, s.fit);
    const dw = iw * pl.scale, dh = ih * pl.scale;
    if (!a.blank && (dw > W + 1 || dh > H + 1)) {
      const gw = Math.min(1400, Math.round(dw * (window.devicePixelRatio || 1)));
      renderSlide({ ...s, zoom: 1, panX: 0, panY: 0, fit: 'cover', layers: [] }, ed.ghost, gw, Math.max(1, Math.round((gw * dh) / dw)), false);
      Object.assign(ed.ghost.style, { display: 'block', left: `${pl.cx - dw / 2}px`, top: `${pl.cy - dh / 2}px`, width: `${dw}px`, height: `${dh}px` });
    } else ed.ghost.style.display = 'none';

    const ly = curLayer();
    if (!ly) { ed.box.style.display = 'none'; return; }
    const bx = layerBox(ly, W);
    Object.assign(ed.box.style, {
      display: 'block', width: `${bx.w}px`, height: `${bx.h}px`,
      left: `${ly.cx * W - bx.w / 2}px`, top: `${ly.cy * H - bx.h / 2}px`,
      transform: `rotate(${ly.rot}deg)`,
    });
  }

  let g = null, raf = 0, lastWheel = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paintEdit(); paintThumb(state.sel); paintPreview(); }); };

  function buildEdit(st) {
    const holder = el('div', 'edit-holder');
    const wrap = el('div', 'canvas-wrap');
    const canvas = document.createElement('canvas');
    const box = el('div', 'selbox');
    ['nw', 'ne', 'sw', 'se'].forEach((k) => box.append(el('div', `handle ${k}`)));
    box.append(el('div', 'stem'), el('div', 'handle rot'));
    const ghost = document.createElement('canvas');
    ghost.className = 'ghost';
    wrap.append(ghost, canvas, box);
    holder.append(wrap);
    st.prepend(holder);
    const badge = button('zoom-badge', '100%', 'Reset zoom (Ctrl+0)', resetView);
    holder.append(badge);
    ed = { holder, wrap, canvas, ghost, box, badge };

    // Handles: resize and rotate the selected layer. They capture the pointer themselves.
    box.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('.handle');
      const ly = curLayer();
      if (!h || !ly) return;
      e.stopPropagation();
      const r = wrap.getBoundingClientRect();
      const cx = r.left + ly.cx * r.width, cy = r.top + ly.cy * r.height;
      g = { sx: e.clientX, sy: e.clientY, moved: false, ly, cx, cy };
      if (h.classList.contains('rot')) Object.assign(g, { type: 'rotate', a0: Math.atan2(e.clientY - cy, e.clientX - cx), r0: ly.rot });
      else Object.assign(g, { type: 'scale', d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, w0: scaleOf(ly) });
      h.setPointerCapture(e.pointerId);
    });

    // Anywhere else: grab a layer to move it, or the background photo to reposition it.
    wrap.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.handle')) return;
      const hit = hitLayer(toNorm(e));
      if (hit) {
        if (state.layer !== hit.id) { state.layer = hit.id; renderPanel(); paintEdit(); }
        g = { type: 'move', ly: hit };
      } else {
        if (state.layer != null) { state.layer = null; renderPanel(); paintEdit(); }
        if (A(cur().asset).blank) return;
        g = { type: 'pan' };
      }
      Object.assign(g, { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, moved: false });
      wrap.setPointerCapture(e.pointerId);
    });

    wrap.addEventListener('pointermove', (e) => {
      if (!g) return;
      if (!g.moved) {
        if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 3) return;
        checkpoint();
        g.moved = true;
      }
      const r = wrap.getBoundingClientRect();
      const s = cur();
      if (g.type === 'move') {
        g.ly.cx = L.clamp(g.ly.cx + (e.clientX - g.x) / r.width, 0, 1);
        g.ly.cy = L.clamp(g.ly.cy + (e.clientY - g.y) / r.height, 0, 1);
      } else if (g.type === 'pan') {
        const a = A(s.asset);
        const iw = s.rot % 180 ? a.h : a.w, ih = s.rot % 180 ? a.w : a.h;
        const pl = L.placeImage(iw, ih, r.width, r.height, s.zoom, 0, 0, s.fit);
        if (pl.mx > 0) s.panX = L.clamp(s.panX + (e.clientX - g.x) / pl.mx, -1, 1);
        if (pl.my > 0) s.panY = L.clamp(s.panY + (e.clientY - g.y) / pl.my, -1, 1);
      } else if (g.type === 'scale') {
        setScale(g.ly, (g.w0 * Math.hypot(e.clientX - g.cx, e.clientY - g.cy)) / g.d0);
      } else if (g.type === 'rotate') {
        let rot = g.r0 + ((Math.atan2(e.clientY - g.cy, e.clientX - g.cx) - g.a0) * 180) / Math.PI;
        rot = ((((rot + 180) % 360) + 360) % 360) - 180;
        g.ly.rot = e.shiftKey ? Math.round(rot / 15) * 15 : Math.round(rot * 10) / 10;
      }
      g.x = e.clientX;
      g.y = e.clientY;
      schedule();
    });
    const endGesture = () => { if (g && g.moved) renderPanel(); g = null; };
    wrap.addEventListener('pointerup', endGesture);
    wrap.addEventListener('pointercancel', endGesture);

    wrap.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) return; // Ctrl+scroll zooms the view (handled on the stage)
      e.preventDefault();
      const f = Math.exp(-e.deltaY * 0.0012);
      const now = Date.now();
      if (now - lastWheel > 500) checkpoint();
      lastWheel = now;
      const hit = hitLayer(toNorm(e));
      if (hit) { state.layer = hit.id; setScale(hit, scaleOf(hit) * f); }
      else if (!A(cur().asset).blank) cur().zoom = L.clamp(cur().zoom * f, 1, 4);
      renderPanel();
      refresh();
    }, { passive: false });

    wrap.addEventListener('dblclick', (e) => { const hit = hitLayer(toNorm(e)); if (hit && isText(hit)) focusText(); });

    layoutEdit();
  }

  // ----- feed preview -----
  function goTo(i) {
    if (!feed) return;
    feed.cur = Math.max(0, Math.min(state.slides.length - 1, i));
    feed.track.style.transform = `translateX(${-feed.cur * 100}%)`;
    [...feed.pager.children].forEach((d, k) => d.classList.toggle('on', k === feed.cur));
    if (feed.pill) feed.pill.textContent = `${feed.cur + 1}/${state.slides.length}`;
  }

  function buildFeed(st) {
    const info = frameInfo();
    const n = state.slides.length;
    const host = el('div', `phone ${state.theme}`);
    const hd = el('div', 'hd', '<div class="av"><i></i></div><div class="un"></div><div class="dots3">···</div>');
    hd.querySelector('.un').textContent = state.username || 'yourname';

    const frame = el('div', 'frame');
    frame.style.aspectRatio = String(info.frameAR);
    const track = el('div', 'track');
    const cells = state.slides.map(() => { const cell = el('div', 'cell'); const c = document.createElement('canvas'); cell.append(c); track.append(cell); return c; });
    frame.append(track);
    feed = { track, cells, cur: 0, pager: el('div', 'pager'), pill: null };
    for (let k = 0; k < n; k++) feed.pager.append(el('span'));

    if (n > 1) {
      feed.pill = el('div', 'pill');
      const a = button('arrow l', '‹', 'Previous slide', () => select(feed.cur - 1));
      const b = button('arrow r', '›', 'Next slide', () => select(feed.cur + 1));
      frame.append(feed.pill, a, b);
    }
    // Swipe. The pointer is only captured once a real drag starts, so button clicks still land.
    let sx = null, dragging = false;
    frame.addEventListener('pointerdown', (e) => { if (e.target.closest('.arrow')) return; sx = e.clientX; dragging = false; });
    frame.addEventListener('pointermove', (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx;
      if (!dragging && Math.abs(dx) > 5) { dragging = true; track.classList.add('dragging'); frame.setPointerCapture(e.pointerId); }
      if (dragging) track.style.transform = `translateX(calc(${-feed.cur * 100}% + ${dx}px))`;
    });
    const end = (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx, was = dragging;
      sx = null; dragging = false;
      track.classList.remove('dragging');
      if (was) select(dx < -50 ? feed.cur + 1 : dx > 50 ? feed.cur - 1 : feed.cur);
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);

    const acts = el('div', 'acts', `${ic('heart')}${ic('comment')}${ic('send')}`);
    if (n > 1) acts.append(feed.pager);
    acts.append(el('span', 'save', ic('bookmark')));
    const meta = el('div', 'meta', '<div class="likes">1 like</div><div class="cap"><b></b> <span></span></div><div class="more">more</div>');
    meta.querySelector('b').textContent = state.username || 'yourname';
    meta.querySelector('.cap span').textContent = state.caption;

    host.append(hd, frame, acts, meta);
    st.append(host);
    cells.forEach((c, i) => renderSlide(state.slides[i], c, 780, Math.round(780 / info.slideARs[i]), false));
    goTo(state.sel);
  }

  // ----- profile grid -----
  function buildGrid(st) {
    const info = frameInfo();
    const tileAR = L.GRID_AR; // Instagram's grid shows only slide 1, centre-cropped to 3:4
    const list = [[state.slides[0], 0]];
    const total = 9;
    gridTiles = [];
    const host = el('div', `profile ${state.theme}`);
    const hd = el('div', 'p-head', `<div class="av"><i></i></div><div><div class="un"></div><div class="stats"><span><b>${list.length}</b> posts</span><span><b>0</b> followers</span><span><b>0</b> following</span></div></div>`);
    hd.querySelector('.un').textContent = state.username || 'yourname';
    const grid = el('div', 'grid');
    const tw = 300, th = Math.round(300 / tileAR);
    for (let k = 0; k < total; k++) {
      if (!list[k]) { const ph = el('div', 'ph'); ph.style.aspectRatio = String(tileAR); grid.append(ph); continue; }
      const [s, i] = list[k];
      const ar = info.slideARs[i];
      const tmp = document.createElement('canvas');
      const c = document.createElement('canvas');
      c.width = tw; c.height = th;
      const draw = () => {
        const cr = L.gridCrop(ar, tileAR, 0, 0);
        c.getContext('2d').drawImage(tmp, cr.x * tmp.width, cr.y * tmp.height, cr.w * tmp.width, cr.h * tmp.height, 0, 0, tw, th);
      };
      const fresh = () => { renderSlide(s, tmp, 600, Math.round(600 / ar), false); draw(); };
      fresh();
      gridTiles.push({ idx: i, fresh });
      grid.append(c);
    }
    host.append(hd, grid);
    st.append(host);
  }

  // ---------- inspector ----------
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
  function section(title, ...kids) {
    const s = el('div', 'sec');
    if (title) s.append(el('div', 'sec-head', `<h3>${title}</h3>`));
    s.append(...kids);
    return s;
  }
  function slider(label, min, max, step, get, set, unit, dflt) {
    const row = el('label', 'sl');
    const inp = document.createElement('input');
    Object.assign(inp, { type: 'range', min, max, step, value: get() });
    const out = el('output', '', fmt(get()) + unit);
    inp.addEventListener('pointerdown', checkpoint);
    inp.addEventListener('keydown', (e) => { if (!e.repeat) checkpoint(); });
    const mark = () => row.classList.toggle('changed', +inp.value !== dflt);
    inp.oninput = () => { set(+inp.value); out.textContent = fmt(+inp.value) + unit; mark(); refresh(); const f = $('#filterSel'); if (f && cur()) f.value = filterName(cur().adj); };
    mark();
    row.append(txt('span', '', label), inp, out);
    return row;
  }
  function thumb(a) {
    const c = document.createElement('canvas');
    c.width = c.height = 72;
    const k = Math.min(a.proxy.width, a.proxy.height);
    c.getContext('2d').drawImage(a.proxy, (a.proxy.width - k) / 2, (a.proxy.height - k) / 2, k, k, 0, 0, 72, 72);
    return c;
  }

  function renderPanel() {
    const p = $('#panel');
    p.innerHTML = '';
    if (!state.slides.length) { p.append(section('', el('p', 'note', 'Add photos to start editing.'))); return; }
    panelEdit(p);
  }

  function bgThumb(s) {
    const c = document.createElement('canvas');
    c.width = c.height = 72;
    paintBg(c.getContext('2d'), s.bg, 72, 72);
    return c;
  }
  function textThumb(ly) {
    const c = document.createElement('canvas');
    c.width = c.height = 72;
    const x = c.getContext('2d');
    x.fillStyle = isLight(ly.color) ? '#2a2a2a' : '#d9d9d9';
    x.fillRect(0, 0, 72, 72);
    x.font = (TEXT_STYLES[ly.style] || TEXT_STYLES.classic).font(28);
    x.fillStyle = ly.color;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('Aa', 36, 38);
    return c;
  }

  function layerRow(label, sub, thumbEl, on, onSel, acts) {
    const r = el('div', 'lrow' + (on ? ' on' : ''));
    r.tabIndex = 0;
    const name = el('span', 'lname');
    name.append(txt('span', '', label), txt('span', 'lsub', sub));
    r.append(thumbEl, name);
    if (acts) r.append(...acts);
    r.onclick = onSel;
    r.onkeydown = (e) => { if (e.key === 'Enter' && e.target === r) onSel(); };
    return r;
  }

  function bgPicker(s) {
    const box = el('div');
    const sw = el('div', 'swatches');
    const add = (val, title) => {
      const b = button('sw' + (s.bg === val ? ' on' : ''), '', title, () => { checkpoint(); s.bg = val; renderPanel(); refresh(); });
      b.style.background = bgCss(val);
      sw.append(b);
    };
    add('#000000', 'Black');
    add('#ffffff', 'White');
    Object.entries(BACKGROUNDS).forEach(([k, v]) => add('g:' + k, v.name));
    const col = document.createElement('input');
    col.type = 'color'; col.value = s.bg.startsWith('g:') ? '#000000' : s.bg; col.title = 'Custom colour';
    col.onfocus = checkpoint;
    col.oninput = () => { s.bg = col.value; refresh(); };
    sw.append(col);
    box.append(sw);
    return box;
  }

  function panelImageLayer(p, ly) {
    const flip = button('btn', `${ic('flip')} Flip`, 'Mirror this layer', () => { checkpoint(); ly.flip = !ly.flip; refresh(); });
    const row = el('div', 'row');
    row.append(flip, button('btn danger', `${ic('trash')} Remove`, null, () => removeLayer(ly.id)));
    p.append(section('Selected photo',
      slider('Size', 3, 300, 1, () => Math.round(ly.w * 100), (v) => (ly.w = v / 100), '%', 50),
      slider('Rotate', -180, 180, 1, () => Math.round(ly.rot), (v) => (ly.rot = v), '°', 0),
      slider('Opacity', 0, 100, 1, () => Math.round(ly.opacity * 100), (v) => (ly.opacity = v / 100), '%', 100),
      row,
      el('p', 'note', 'Drag to move. Corner handles resize, the top handle rotates (hold Shift to snap).')));
  }

  function panelText(p, ly) {
    const f = el('label', 'field');
    const t = document.createElement('textarea');
    t.value = ly.text; t.rows = 3;
    t.onfocus = checkpoint;
    t.oninput = () => { ly.text = t.value; refresh(); };
    f.append(txt('span', '', 'Text'), t);

    const styles = el('div', 'row');
    Object.entries(TEXT_STYLES).forEach(([k, v]) => {
      const b = button('chip' + (ly.style === k ? ' on' : ''), v.name, null, () => { checkpoint(); ly.style = k; renderPanel(); refresh(); });
      b.style.font = v.font(13);
      styles.append(b);
    });

    const sw = el('div', 'swatches');
    TEXT_COLORS.forEach((c) => {
      const b = button('sw' + (ly.color === c ? ' on' : ''), '', c, () => { checkpoint(); ly.color = c; renderPanel(); refresh(); });
      b.style.background = c;
      sw.append(b);
    });
    const pick = document.createElement('input');
    pick.type = 'color'; pick.value = ly.color; pick.title = 'Custom colour';
    pick.onfocus = checkpoint;
    pick.oninput = () => { ly.color = pick.value; refresh(); };
    sw.append(pick);

    const gap = (n) => { n.style.marginTop = '12px'; return n; };
    const row = gap(el('div', 'row'));
    row.append(button('btn danger', `${ic('trash')} Remove`, null, () => removeLayer(ly.id)));
    p.append(section('Text', f, styles, gap(sw),
      gap(seg([['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], ly.align, (v) => { checkpoint(); ly.align = v; renderPanel(); refresh(); })),
      gap(toggle('Text background', ly.fill, (v) => { checkpoint(); ly.fill = v; refresh(); })),
      slider('Size', 2, 40, 1, () => Math.round(ly.size * 100), (v) => (ly.size = v / 100), '%', 9),
      slider('Rotate', -180, 180, 1, () => Math.round(ly.rot), (v) => (ly.rot = v), '°', 0),
      slider('Opacity', 0, 100, 1, () => Math.round(ly.opacity * 100), (v) => (ly.opacity = v / 100), '%', 100),
      row,
      el('p', 'note', 'Drag to move, or double-click the text on the canvas to edit it. Instagram’s own typeface isn’t available to other apps, so these styles use system fonts.')));
  }

  function panelEdit(p) {
    const s = cur(), ly = curLayer(), a0 = A(s.asset);
    const head = el('div', 'sec-head', '<h3>Layers</h3>');
    const adds = el('div', 'row');
    adds.append(button('mini text', `${ic('image')} Photo`, 'Add a photo on top of this slide', () => $('#fileLayer').click()), button('mini text', `${ic('type')} Text`, 'Add text on top of this slide', addTextLayer));
    head.append(adds);
    const list = el('div', 'layers');
    [...s.layers].reverse().forEach((l) => {
      const mk = (icon, title, fn) => button('mini', ic(icon), title, (e) => { e.stopPropagation(); fn(); });
      const text = isText(l);
      list.append(layerRow(text ? l.text.split('\n')[0].slice(0, 28) || 'Text' : A(l.asset).name, text ? 'Text' : 'Photo',
        text ? textThumb(l) : thumb(A(l.asset)), state.layer === l.id,
        () => { state.layer = l.id; renderPanel(); paintEdit(); },
        [mk('up', 'Bring forward', () => shiftLayer(l.id, 1)), mk('down', 'Send backward', () => shiftLayer(l.id, -1)), mk('trash', 'Remove layer', () => removeLayer(l.id))]));
    });
    const selBg = () => { state.layer = null; renderPanel(); paintEdit(); };
    list.append(a0.blank
      ? layerRow('Blank slide', 'Background', bgThumb(s), state.layer == null, selBg)
      : layerRow(a0.name, 'Background photo', thumb(a0), state.layer == null, selBg));
    const sec = el('div', 'sec');
    sec.append(head, list);
    if (!s.layers.length) sec.append(el('p', 'note', 'Add above, or drag from an existing slide. Hold [Alt] to keep the original'));
    p.append(sec);

    if (ly) return isText(ly) ? panelText(p, ly) : panelImageLayer(p, ly);

    if (a0.blank) {
      p.append(section('Background', bgPicker(s), el('p', 'note', 'Gradients are close to Instagram’s own. Instagram doesn’t publish the exact colours.')));
      return;
    }

    const tools = el('div', 'row');
    const t = (icon, title, fn) => tools.append(button('btn', ic(icon), title, fn));
    t('rotL', 'Rotate left', () => { checkpoint(); s.rot = (s.rot + 270) % 360; s.panX = s.panY = 0; renderAll(); });
    t('rotR', 'Rotate right', () => { checkpoint(); s.rot = (s.rot + 90) % 360; s.panX = s.panY = 0; renderAll(); });
    t('flip', 'Flip horizontally', () => { checkpoint(); s.flip = !s.flip; refresh(); });
    const fit = seg([['cover', 'Fill frame'], ['contain', 'Fit with border']], s.fit, (v) => { checkpoint(); s.fit = v; s.panX = s.panY = 0; renderAll(); });
    fit.style.marginTop = '10px';
    const photo = section('Photo', tools, fit);
    if (s.fit === 'contain') {
      const bg = el('div', 'field');
      bg.style.marginTop = '12px';
      bg.append(txt('span', '', 'Border background'), bgPicker(s));
      photo.append(bg);
    }
    photo.append(el('p', 'note', 'Drag the photo to reposition it, scroll to zoom, drag middle mouse to pan'));
    p.append(photo);

    const fsel = document.createElement('select');
    fsel.id = 'filterSel';
    Object.keys(FILTERS).forEach((k) => fsel.append(new Option(k, k)));
    const custom = new Option('Custom', '');
    custom.disabled = true;
    fsel.append(custom);
    fsel.value = filterName(s.adj);
    fsel.onchange = () => { checkpoint(); s.adj = Object.assign(DEFAULT_ADJ(), FILTERS[fsel.value]); renderPanel(); refresh(); };
    const frow = el('label', 'sl');
    frow.append(txt('span', '', 'Filter'), fsel);
    const adjust = section('Adjust',
      frow,
      slider('Zoom', 1, 4, 0.01, () => s.zoom, (v) => (s.zoom = v), '×', 1),
      slider('Brightness', 50, 150, 1, () => s.adj.brightness, (v) => (s.adj.brightness = v), '%', 100),
      slider('Contrast', 50, 150, 1, () => s.adj.contrast, (v) => (s.adj.contrast = v), '%', 100),
      slider('Saturation', 0, 200, 1, () => s.adj.saturation, (v) => (s.adj.saturation = v), '%', 100),
      slider('Warmth', -100, 100, 1, () => s.adj.warmth, (v) => (s.adj.warmth = v), '', 0));
    adjust.querySelector('.sec-head').append(button('icon-btn sm', ic('rotL'), 'Reset zoom and adjustments', () => {
      checkpoint();
      s.zoom = 1;
      s.adj = DEFAULT_ADJ();
      renderPanel();
      refresh();
    }));
    p.append(adjust);

    const all = button('btn wide', 'Copy these adjustments to all slides', null, () => { checkpoint(); state.slides.forEach((o) => (o.adj = { ...s.adj })); renderAll(); toast('Applied to all slides'); });
    all.style.marginTop = '12px';
    const reset = button('btn wide', 'Reset this photo', null, () => {
      checkpoint();
      Object.assign(s, { rot: 0, flip: false, zoom: 1, panX: 0, panY: 0, fit: 'cover', bg: '#000000', adj: DEFAULT_ADJ() });
      renderAll();
    });
    reset.style.marginTop = '8px';
    p.append(section(null, all, reset));
  }

  // ---------- live preview (feed / profile grid) ----------
  let pv = null, gridTiles = null;
  const labeled = (label, input) => { const d = el('label', 'field'); d.append(txt('span', '', label), input); return d; };
  function buildPreview(pane) {
    pv = { opts: el('div', 'pv-opts'), body: el('div', 'pv-body') };
    const f = el('div', 'pv-fields');
    const u = document.createElement('input');
    u.type = 'text'; u.value = state.username; u.placeholder = 'yourname';
    u.oninput = () => { state.username = u.value; syncPreviewText(); };
    f.append(labeled('Username', u));
    if (state.preview === 'feed') {
      const c = document.createElement('textarea');
      c.value = state.caption; c.rows = 3;
      c.oninput = () => { state.caption = c.value; syncPreviewText(); };
      f.append(labeled('Caption', c));
    }
    f.append(el('p', 'note', state.preview === 'grid' ? 'Instagram shows slide 1 on your profile, centre-cropped to 3:4. Preview only.' : 'Preview only. These are not exported.'));
    pane.append(pv.opts, pv.body, f);
    drawPreviewOpts();
    drawPreviewBody();
  }
  function drawPreviewOpts() {
    const o = pv.opts;
    o.innerHTML = '';
    const row = (label, ctl) => { const r = el('div', 'pv-row'); r.append(txt('span', '', label), ctl); o.append(r); };
    const redo = (fn) => (v) => { fn(v); drawPreviewOpts(); drawPreviewBody(); paintEdit(); };
    row('Appearance', seg([['light', 'Light'], ['dark', 'Dark']], state.theme, redo((v) => (state.theme = v))));
  }
  function drawPreviewBody() {
    pv.body.innerHTML = '';
    feed = null;
    gridTiles = null;
    if (state.preview === 'feed') buildFeed(pv.body); else buildGrid(pv.body);
  }
  function syncPreviewText() {
    const n = state.username || 'yourname';
    pv.body.querySelectorAll('.un, .cap b').forEach((e) => (e.textContent = n));
    const c = pv.body.querySelector('.cap span');
    if (c) c.textContent = state.caption;
  }
  // Repaints only the slide being edited in the preview.
  function paintPreview() {
    const i = state.sel;
    if (feed && feed.cells[i]) renderSlide(state.slides[i], feed.cells[i], 780, Math.round(780 / frameInfo().slideARs[i]), false);
    if (gridTiles) gridTiles.forEach((t) => { if (t.idx === i) t.fresh(); });
  }

  // ---------- export ----------
  // A slide is "untouched" when exporting it would give back the original pixels, so we copy the file byte for byte.
  function pristine(s, frameAR) {
    const a = A(s.asset);
    return !a.blank && !s.layers.length && s.rot === 0 && !s.flip && s.zoom === 1 && s.fit === 'cover' && isDefaultAdj(s.adj) &&
      Math.abs(frameAR / (a.w / a.h) - 1) < 0.003;
  }
  function outSize(s, a, ar) {
    const iw = s.rot % 180 ? a.h : a.w, ih = s.rot % 180 ? a.w : a.h;
    let sz = a.blank ? L.exportSize(ar) : L.nativeSize(iw, ih, ar, s.zoom, s.fit);
    for (const ly of s.layers) { // keep big layers sharp too
      if (isText(ly)) continue;
      const need = A(ly.asset).w / ly.w;
      if (need > sz.w) sz = L.capSize(need, need / ar);
    }
    return sz;
  }
  const pickType = (a, fmt) => (fmt === 'jpeg' ? 'image/jpeg' : fmt === 'png' ? 'image/png' : a.blank || a.file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png');

  function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }

  function openExport() {
    if (!state.slides.length) return toast('Add photos first');
    const info = frameInfo();
    const keep = state.slides.filter((s, i) => pristine(s, info.slideARs[i])).length;
    const edit = state.slides.length - keep;
    let fmt = 'match';
    const m = $('#modal');
    m.innerHTML = '';
    m.hidden = false;
    m.onclick = (e) => { if (e.target === m) closeModal(); };
    const card = el('div', 'card');
    card.append(txt('h2', '', 'Export'));
    const ul = el('ul');
    if (keep) ul.append(txt('li', '', `${keep} unchanged: copied as the exact original file (same pixels, EXIF and colour profile).`));
    if (edit) ul.append(txt('li', '', `${edit} edited: re-rendered at full resolution, never downscaled.`));
    card.append(ul);
    const fmtBox = el('div', 'field', '<span>Format for edited photos</span>');
    const drawFmt = () => {
      fmtBox.querySelector('.seg') && fmtBox.querySelector('.seg').remove();
      fmtBox.append(seg([['match', 'Match source'], ['jpeg', 'JPEG (high quality)'], ['png', 'PNG (lossless)']], fmt, (v) => { fmt = v; drawFmt(); }));
    };
    drawFmt();
    if (edit) {
      card.append(fmtBox, el('p', 'note', 'Re-rendering drops EXIF data and the embedded colour profile. PNG avoids any JPEG recompression.'));
    }
    card.append(el('p', 'note', 'Files go into a new folder as 01_name.ext, 02_name.ext and so on. Nothing existing is overwritten.'));
    const actions = el('div', 'actions');
    const go = button('btn primary', `${ic('download')} Export`, null, null);
    actions.append(button('btn', 'Cancel', null, closeModal), go);
    card.append(actions);
    m.append(card);
    go.onclick = async () => {
      go.disabled = true;
      try { await runExport(fmt, (i, n) => (go.textContent = `Exporting ${i}/${n}…`)); }
      catch (err) { toast(`Export failed: ${err.message}`); }
      closeModal();
    };
  }

  async function runExport(fmt, progress) {
    const info = frameInfo();
    const out = [];
    let copied = 0, rendered = 0;
    for (let i = 0; i < state.slides.length; i++) {
      progress(i + 1, state.slides.length);
      const s = state.slides[i], a = A(s.asset), ar = info.slideARs[i];
      const idx = String(i + 1).padStart(2, '0');
      if (pristine(s, ar)) {
        out.push({ name: `${idx}_${a.name}`, bytes: await a.file.arrayBuffer() });
        copied++;
        continue;
      }
      const { w, h } = outSize(s, a, ar);
      const c = document.createElement('canvas');
      renderSlide(s, c, w, h, true);
      const type = pickType(a, fmt);
      const blob = await new Promise((r) => c.toBlob(r, type, 0.97));
      c.width = c.height = 0;
      if (!blob) throw new Error(`slide ${i + 1} is too large to render (${w}×${h})`);
      out.push({ name: `${idx}_${a.name.replace(/\.[^.]+$/, '')}.${type === 'image/png' ? 'png' : 'jpg'}`, bytes: await blob.arrayBuffer() });
      rendered++;
    }
    const msg = `${copied} copied as-is, ${rendered} rendered`;
    if (window.api && window.api.saveFiles) {
      const dir = await window.api.saveFiles(out);
      if (dir) toast(`Saved ${out.length} files (${msg})`, window.api.revealExport ? { label: 'Show folder', fn: () => window.api.revealExport() } : null);
    } else {
      out.forEach(({ name, bytes }) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([bytes]));
        a.download = name;
        a.click();
      });
      toast(`Downloaded ${out.length} files (${msg})`);
    }
  }

  // ---------- misc ----------
  function toast(msg, action) {
    const t = $('#toast');
    t.innerHTML = '';
    t.append(txt('span', '', msg));
    if (action) t.append(button('toast-btn', action.label, null, () => { t.hidden = true; action.fn(); }));
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), action ? 7000 : 4000);
  }

  $('#undo').innerHTML = ic('undo');
  $('#redo').innerHTML = ic('redo');
  $('#export').innerHTML = `${ic('download')} Export`;
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#export').onclick = openExport;
  $('#togglePanel').innerHTML = ic('sidebar');
  $('#togglePanel').onclick = () => setPanel(!state.panel);
  $('#shapeBtn').onclick = () => setShapeMenu(!state.shapeMenu);
  document.addEventListener('pointerdown', (e) => { if (state.shapeMenu && !$('#shapeWrap').contains(e.target)) setShapeMenu(false); });
  let savedPanel = '1';
  try { savedPanel = localStorage.getItem('carousel.panel') || '1'; } catch (e) { /* storage unavailable */ }
  setPanel(savedPanel !== '0');
  $('#file').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
  $('#fileLayer').onchange = (e) => { addLayerFiles(e.target.files); e.target.value = ''; };
  document.querySelectorAll('#views button').forEach((b) => (b.onclick = () => { state.preview = b.dataset.view; renderStage(); updateTop(); }));
  new ResizeObserver(() => layoutEdit()).observe($('#stage'));

  // Drag and drop. Files dropped on the edit canvas become layers; anywhere else they become new slides.
  // A slide dragged from the rail onto the canvas becomes a layer on the open slide.
  const stage = $('#stage');
  const overCanvas = (e) => !!(ed && ed.wrap.contains(e.target));
  window.addEventListener('dragover', (e) => {
    if (dragIdx != null) {
      if (overCanvas(e)) { e.preventDefault(); e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move'; ed.wrap.classList.add('drop-target'); }
      else if (ed) ed.wrap.classList.remove('drop-target');
    } else if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      stage.classList.add('dragover');
    }
  });
  window.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) { stage.classList.remove('dragover'); if (ed) ed.wrap.classList.remove('drop-target'); }
  });
  window.addEventListener('drop', (e) => {
    stage.classList.remove('dragover');
    const onCanvas = overCanvas(e);
    if (dragIdx != null) {
      if (!onCanvas) return;
      e.preventDefault();
      const at = toNorm(e), from = dragIdx;
      dragIdx = null;
      ed.wrap.classList.remove('drop-target');
      placeOnto(from, state.sel, { copy: e.altKey, at });
    } else if (e.dataTransfer.files && e.dataTransfer.files.length) {
      e.preventDefault();
      if (onCanvas) addLayerFiles(e.dataTransfer.files, toNorm(e)); else addFiles(e.dataTransfer.files);
    }
  });

  // Edit view zoom: Ctrl+scroll (or trackpad pinch) zooms at the cursor; middle-drag or Space+drag pans; Ctrl+0 resets.
  stage.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey) || !ed || !ed.holder.contains(e.target)) return;
    e.preventDefault();
    zoomView(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }, { passive: false });
  stage.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); }); // no autoscroll
  stage.addEventListener('pointerdown', (e) => {
    if (!ed || !ed.holder.contains(e.target) || !(e.button === 1 || (e.button === 0 && space))) return;
    e.preventDefault();
    e.stopPropagation(); // keep the photo/layer drag from starting
    vp = { x: e.clientX, y: e.clientY };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('panning');
  }, true);
  stage.addEventListener('pointermove', (e) => {
    if (!vp) return;
    cam.x += e.clientX - vp.x;
    cam.y += e.clientY - vp.y;
    vp = { x: e.clientX, y: e.clientY };
    applyView();
  });
  const endViewPan = () => { vp = null; stage.classList.remove('panning'); };
  stage.addEventListener('pointerup', endViewPan);
  stage.addEventListener('pointercancel', endViewPan);
  const setSpace = (on) => { space = on; stage.classList.toggle('space', on); };
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') setSpace(false); });
  window.addEventListener('blur', () => setSpace(false));

  window.addEventListener('keydown', (e) => {
    if (!$('#modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (state.shapeMenu && e.key === 'Escape') { setShapeMenu(false); $('#shapeBtn').focus(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === '\\') { e.preventDefault(); return setPanel(!state.panel); }
    const t = document.activeElement;
    const typing = t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text'));
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === '0' && ed) { e.preventDefault(); return resetView(); }
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); return redo(); }
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (!state.slides.length) return;
    if (e.code === 'Space' && ed) { e.preventDefault(); setSpace(true); return; }
    const ly = curLayer();
    if (e.key === 'Escape' && ly) { state.layer = null; renderPanel(); paintEdit(); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); moveSlide(state.sel, state.sel - 1); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); moveSlide(state.sel, state.sel + 1); }
    else if (ly && e.key.startsWith('Arrow')) {
      e.preventDefault();
      checkpoint();
      const d = e.shiftKey ? 0.02 : 0.005;
      if (e.key === 'ArrowLeft') ly.cx -= d; else if (e.key === 'ArrowRight') ly.cx += d;
      else if (e.key === 'ArrowUp') ly.cy -= d; else ly.cy += d;
      ly.cx = L.clamp(ly.cx, 0, 1); ly.cy = L.clamp(ly.cy, 0, 1);
      refresh();
    }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') select(state.sel - 1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') select(state.sel + 1);
    else if (e.key === 'Delete') { if (ly) removeLayer(ly.id); else removeSlide(state.sel); }
  });

  // test hook (used by the headless smoke test)
  window.__ig = { state, assets, addFiles, addLayerFiles, addBlankSlide, addTextLayer, renderAll, moveSlide, placeOnto, undo, redo, pristine, frameInfo };
  renderAll();
})();

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
  const FILTERS = {
    Original: {},
    Vivid: { contrast: 112, saturation: 135 },
    Warm: { warmth: 35, saturation: 110 },
    Cool: { warmth: -35 },
    Mono: { grayscale: 100, contrast: 110 },
    Fade: { contrast: 85, brightness: 108, saturation: 85 },
    Sepia: { sepia: 70 },
  };

  const state = {
    slides: [], // [{ id, asset, rot, flip, zoom, panX, panY, fit, bg, adj, gridOff, layers: [{ id, asset, cx, cy, w, rot, flip, opacity }] }]
    sel: 0,
    layer: null, // selected layer id on the selected slide; null = the background photo
    view: 'edit', // edit | feed | grid
    ratio: 'auto',
    mode: 'match',
    theme: 'light',
    gridShape: 'new',
    gridFill: 'post',
    showCrop: true,
    username: 'yourname',
    caption: 'Your caption goes here. Instagram collapses long captions after about two lines, so the first sentence matters most.',
  };
  const assets = new Map(); // id -> { id, name, file, img, proxy, w, h }
  const A = (id) => assets.get(id);
  const cur = () => state.slides[state.sel];
  const curLayer = () => { const s = cur(); return s && state.layer != null ? s.layers.find((l) => l.id === state.layer) || null : null; };
  let uid = 0, lastSig = '', toastTimer, dragIdx = null, ed = null, feed = null;
  const view = { z: 1, x: 0, y: 0 }; // Edit-view zoom/pan (screen only, never exported)
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
  const newSlide = (a) => ({ id: ++uid, asset: a.id, rot: 0, flip: false, zoom: 1, panX: 0, panY: 0, fit: 'cover', bg: '#000000', adj: DEFAULT_ADJ(), gridOff: { x: 0, y: 0 }, layers: [] });
  function makeLayer(a, s, x = 0.5, y = 0.5) {
    const fa = frameInfo().slideARs[Math.max(0, state.slides.indexOf(s))] || 0.8;
    const w = Math.min(0.5, (0.6 * a.w) / (a.h * fa)); // at most half the frame width and 60% of its height
    return { id: ++uid, asset: a.id, cx: L.clamp(x, 0, 1), cy: L.clamp(y, 0, 1), w, rot: 0, flip: false, opacity: 1 };
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
    state.view = 'edit';
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
    checkpoint();
    const ly = makeLayer(A(src.asset), dst, at ? at.x : 0.5, at ? at.y : 0.5);
    dst.layers.push(ly);
    if (!copy) state.slides.splice(srcIdx, 1);
    state.sel = state.slides.indexOf(dst);
    state.layer = ly.id;
    state.view = 'edit';
    renderAll();
    toast(copy ? 'Placed a copy on the slide' : 'Placed on the slide. The original slide was removed.', { label: 'Undo', fn: undo });
  }

  // ---------- drawing ----------
  const cssFilter = (a) => `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) grayscale(${a.grayscale}%) sepia(${a.sepia}%)`;

  function drawLayer(ctx, ly, tw, th, full) {
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

  function renderSlide(s, canvas, tw, th, full) {
    const a = A(s.asset);
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, tw, th);
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
  }

  function updateTop() {
    $('#undo').disabled = !hist.length;
    $('#redo').disabled = !fut.length;
    $('#export').disabled = !state.slides.length;
    document.querySelectorAll('#views button').forEach((b) => {
      b.classList.toggle('on', b.dataset.view === state.view);
      b.disabled = !state.slides.length;
    });
  }

  function seg(options, value, onPick) {
    const d = el('div', 'seg');
    options.forEach(([v, label]) => {
      const b = button(v === value ? 'on' : '', label, null, () => onPick(v));
      d.append(b);
    });
    return d;
  }

  function renderBar() {
    const b = $('#bar');
    b.innerHTML = '';
    b.hidden = !state.slides.length;
    if (!state.slides.length) return;
    const val = state.ratio !== 'auto' ? state.ratio : state.mode === 'mixed' ? 'mixed' : 'first';
    const g1 = el('div', 'grp');
    g1.append(txt('span', 'muted', 'Post shape'), seg([['first', 'Match first photo'], ['mixed', 'Mixed'], ['3:4', 'Portrait 3:4'], ['4:5', 'Portrait 4:5'], ['1:1', 'Square'], ['1.91:1', 'Landscape']], val, (v) => {
      if (v === 'first') { state.ratio = 'auto'; state.mode = 'match'; }
      else if (v === 'mixed') { state.ratio = 'auto'; state.mode = 'mixed'; }
      else state.ratio = v;
      renderAll();
    }));
    const ar = frameInfo().frameAR;
    const names = [[3 / 4, '3:4'], [4 / 5, '4:5'], [1, '1:1'], [1.91, '1.91:1']];
    const hit = names.find(([v]) => Math.abs(v - ar) < 0.01);
    const nm = hit ? hit[1] : `${ar.toFixed(2)}:1`;
    const hint = val === 'mixed' ? 'Each slide keeps its own shape (3:4 to 1.91:1 only). The tallest sets the frame; shorter ones get bars.'
      : val === 'first' ? `Every slide is cropped to slide 1’s shape (${nm}).` : `Every slide is cropped to ${nm}.`;
    const g2 = txt('span', 'muted hint', hint);
    b.append(g1, g2, el('span', 'spacer'));
    if (state.view === 'edit') {
      b.append(button('chip' + (state.showCrop ? ' on' : ''), 'Profile crop guides', 'Shade the parts of slide 1 that the profile grid crops away', () => { state.showCrop = !state.showCrop; renderBar(); paintEdit(); }));
    }
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
    strip.append(button('add-tile', `${ic('plus')}<span>Add photos</span>`, 'Add photos', () => $('#file').click()));
  }

  function select(i) {
    state.sel = L.clamp(i, 0, state.slides.length - 1);
    state.layer = null;
    markStrip();
    if (state.view === 'feed') goTo(state.sel); else renderStage();
    renderPanel();
  }

  // ----- stage -----
  function renderStage() {
    const st = $('#stage');
    st.innerHTML = '';
    ed = null;
    feed = null;
    if (!state.slides.length) return emptyState(st);
    if (state.view === 'edit') buildEdit(st);
    else if (state.view === 'feed') buildFeed(st);
    else buildGrid(st);
  }

  function emptyState(st) {
    const d = el('div', 'empty', `<div class="ring">${ic('image')}</div><h2>Drop photos to start a post</h2><p>Reorder them, layer one photo on top of another, and preview the feed and your profile grid.</p>`);
    d.append(button('btn primary', 'Choose photos', null, () => $('#file').click()));
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
      const ly = s.layers[k], a = A(ly.asset);
      const dx = (pt.x - ly.cx) * W, dy = (pt.y - ly.cy) * H;
      const t = (-ly.rot * Math.PI) / 180;
      const lx = dx * Math.cos(t) - dy * Math.sin(t), lyy = dx * Math.sin(t) + dy * Math.cos(t);
      const hw = (ly.w * W) / 2, hh = (hw * a.h) / a.w;
      if (Math.abs(lx) <= hw && Math.abs(lyy) <= hh) return ly;
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
    const off = view.z === 1 && !view.x && !view.y;
    ed.wrap.style.setProperty('--z', view.z);
    ed.wrap.style.transform = off ? '' : `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
    ed.badge.hidden = off;
    ed.badge.textContent = `${Math.round(view.z * 100)}%`;
  }
  function resetView() { view.z = 1; view.x = view.y = 0; applyView(); paintEdit(); }
  function zoomView(f, mx, my) {
    if (!ed) return;
    let z = L.clamp(view.z * f, 0.5, 8);
    if (Math.abs(z - 1) < 0.03) z = 1;
    if (z === view.z) return;
    const r = ed.wrap.getBoundingClientRect();
    const rcx = r.left + r.width / 2, rcy = r.top + r.height / 2; // centre on screen
    if (z === 1) { view.x = view.y = 0; }
    else {
      // keep the point under the cursor fixed while scaling
      view.x = mx - (rcx - view.x) - (z / view.z) * (mx - rcx);
      view.y = my - (rcy - view.y) - (z / view.z) * (my - rcy);
    }
    view.z = z;
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
    const pw = Math.min(view.z > 1 ? 3600 : 1800, Math.round(W * (window.devicePixelRatio || 1) * Math.max(1, view.z)));
    renderSlide(s, ed.canvas, pw, Math.round(pw / ar), false);

    // Faded copy of the whole photo behind the frame, so you can see what the crop cuts away.
    const a = A(s.asset);
    const iw = s.rot % 180 ? a.h : a.w, ih = s.rot % 180 ? a.w : a.h;
    const pl = L.placeImage(iw, ih, W, H, s.zoom, s.panX, s.panY, s.fit);
    const dw = iw * pl.scale, dh = ih * pl.scale;
    if (dw > W + 1 || dh > H + 1) {
      const gw = Math.min(1400, Math.round(dw * (window.devicePixelRatio || 1)));
      renderSlide({ ...s, zoom: 1, panX: 0, panY: 0, fit: 'cover', layers: [] }, ed.ghost, gw, Math.max(1, Math.round((gw * dh) / dw)), false);
      Object.assign(ed.ghost.style, { display: 'block', left: `${pl.cx - dw / 2}px`, top: `${pl.cy - dh / 2}px`, width: `${dw}px`, height: `${dh}px` });
    } else ed.ghost.style.display = 'none';

    ed.crop.innerHTML = '';
    if (state.showCrop && (state.sel === 0 || state.gridFill === 'each')) {
      const g = L.gridCrop(ar, state.gridShape === 'new' ? L.GRID_AR : 1, s.gridOff.x, s.gridOff.y);
      if (g.w < 1) {
        const l = el('div', 'dim l'), r = el('div', 'dim r');
        l.style.width = `${g.x * 100}%`;
        r.style.width = `${(1 - g.x - g.w) * 100}%`;
        ed.crop.append(l, r);
      }
    }

    const ly = curLayer();
    if (!ly) { ed.box.style.display = 'none'; return; }
    const la = A(ly.asset);
    const bw = ly.w * W;
    Object.assign(ed.box.style, {
      display: 'block', width: `${bw}px`, height: `${(bw * la.h) / la.w}px`,
      left: `${ly.cx * W - bw / 2}px`, top: `${ly.cy * H - (bw * la.h) / la.w / 2}px`,
      transform: `rotate(${ly.rot}deg)`,
    });
  }

  let g = null, raf = 0, lastWheel = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paintEdit(); paintThumb(state.sel); }); };

  function buildEdit(st) {
    const holder = el('div', 'edit-holder');
    const wrap = el('div', 'canvas-wrap');
    const canvas = document.createElement('canvas');
    const crop = el('div', 'crop');
    const box = el('div', 'selbox');
    ['nw', 'ne', 'sw', 'se'].forEach((k) => box.append(el('div', `handle ${k}`)));
    box.append(el('div', 'stem'), el('div', 'handle rot'));
    const ghost = document.createElement('canvas');
    ghost.className = 'ghost';
    wrap.append(ghost, canvas, crop, box);
    holder.append(wrap);
    st.append(holder);
    const badge = button('zoom-badge', '100%', 'Reset zoom (Ctrl+0)', resetView);
    holder.append(badge);
    ed = { holder, wrap, canvas, ghost, crop, box, badge };

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
      else Object.assign(g, { type: 'scale', d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, w0: ly.w });
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
        g.ly.w = L.clamp((g.w0 * Math.hypot(e.clientX - g.cx, e.clientY - g.cy)) / g.d0, 0.03, 3);
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
      if (hit) { state.layer = hit.id; hit.w = L.clamp(hit.w * f, 0.03, 3); }
      else cur().zoom = L.clamp(cur().zoom * f, 1, 4);
      renderPanel();
      refresh();
    }, { passive: false });

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
    const meta = el('div', 'meta', '<div class="likes">1,234 likes</div><div class="cap"><b></b> <span></span></div><div class="more">more</div>');
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
    const tileAR = state.gridShape === 'new' ? L.GRID_AR : 1;
    const list = state.gridFill === 'each' ? state.slides.map((s, i) => [s, i]) : [[state.slides[0], 0]];
    const total = state.gridFill === 'each' ? Math.ceil(list.length / 3) * 3 : 9;
    const host = el('div', `profile ${state.theme}`);
    const hd = el('div', 'p-head', `<div class="av"><i></i></div><div><div class="un"></div><div class="stats"><span><b>${list.length}</b> posts</span><span><b>1,234</b> followers</span><span><b>321</b> following</span></div></div>`);
    hd.querySelector('.un').textContent = state.username || 'yourname';
    const grid = el('div', 'grid');
    const tw = 300, th = Math.round(300 / tileAR);
    for (let k = 0; k < total; k++) {
      if (!list[k]) { const ph = el('div', 'ph'); ph.style.aspectRatio = String(tileAR); grid.append(ph); continue; }
      const [s, i] = list[k];
      const ar = info.slideARs[i];
      const tmp = document.createElement('canvas');
      renderSlide(s, tmp, 600, Math.round(600 / ar), false);
      const c = document.createElement('canvas');
      c.width = tw; c.height = th;
      c.title = 'Drag to move the crop';
      const draw = () => {
        const cr = L.gridCrop(ar, tileAR, s.gridOff.x, s.gridOff.y);
        c.getContext('2d').drawImage(tmp, cr.x * tmp.width, cr.y * tmp.height, cr.w * tmp.width, cr.h * tmp.height, 0, 0, tw, th);
      };
      draw();
      let last = null, moved = false;
      c.addEventListener('pointerdown', (e) => { last = [e.clientX, e.clientY]; moved = false; c.setPointerCapture(e.pointerId); });
      c.addEventListener('pointermove', (e) => {
        if (!last) return;
        const cr = L.gridCrop(ar, tileAR, 0, 0);
        if (!moved) { checkpoint(); moved = true; }
        // Drag the picture, so the crop window moves the opposite way (exact for the tile's on-screen size).
        if (cr.w < 1) s.gridOff.x = L.clamp(s.gridOff.x - ((e.clientX - last[0]) / c.clientWidth) * ((2 * cr.w) / (1 - cr.w)), -1, 1);
        if (cr.h < 1) s.gridOff.y = L.clamp(s.gridOff.y - ((e.clientY - last[1]) / c.clientHeight) * ((2 * cr.h) / (1 - cr.h)), -1, 1);
        last = [e.clientX, e.clientY];
        draw();
      });
      c.addEventListener('pointerup', () => (last = null));
      c.addEventListener('pointercancel', () => (last = null));
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
    inp.oninput = () => { set(+inp.value); out.textContent = fmt(+inp.value) + unit; refresh(); };
    inp.ondblclick = () => { inp.value = dflt; inp.oninput(); };
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
    if (state.view === 'edit') panelEdit(p);
    else if (state.view === 'feed') panelFeed(p);
    else panelGrid(p);
  }

  function layerRow(label, sub, a, on, onSel, acts) {
    const r = el('div', 'lrow' + (on ? ' on' : ''));
    r.tabIndex = 0;
    const name = el('span', 'lname');
    name.append(txt('span', '', label), txt('span', 'lsub', sub));
    r.append(thumb(a), name);
    if (acts) r.append(...acts);
    r.onclick = onSel;
    r.onkeydown = (e) => { if (e.key === 'Enter' && e.target === r) onSel(); };
    return r;
  }

  function panelEdit(p) {
    const s = cur(), ly = curLayer();

    const head = el('div', 'sec-head', '<h3>Layers</h3>');
    head.append(button('mini text', `${ic('plus')} Add photo`, 'Add a photo on top of this slide', () => $('#fileLayer').click()));
    const list = el('div', 'layers');
    [...s.layers].reverse().forEach((l, k) => {
      const mk = (icon, title, fn) => button('mini', ic(icon), title, (e) => { e.stopPropagation(); fn(); });
      list.append(layerRow(A(l.asset).name, `Layer ${s.layers.length - k}`, A(l.asset), state.layer === l.id,
        () => { state.layer = l.id; renderPanel(); paintEdit(); },
        [mk('up', 'Bring forward', () => shiftLayer(l.id, 1)), mk('down', 'Send backward', () => shiftLayer(l.id, -1)), mk('trash', 'Remove layer', () => removeLayer(l.id))]));
    });
    list.append(layerRow(A(s.asset).name, 'Background photo', A(s.asset), state.layer == null, () => { state.layer = null; renderPanel(); paintEdit(); }));
    const sec = el('div', 'sec');
    sec.append(head, list);
    if (!s.layers.length) sec.append(el('p', 'note', 'Drag a slide from the left onto the canvas, or onto the middle of another slide, to layer it. Hold Alt to keep the original slide.'));
    p.append(sec);

    if (ly) {
      const del = button('btn danger', `${ic('trash')} Remove layer`, null, () => removeLayer(ly.id));
      const flip = button('btn', `${ic('flip')} Flip`, 'Mirror this layer', () => { checkpoint(); ly.flip = !ly.flip; refresh(); });
      const row = el('div', 'row');
      row.append(flip, del);
      p.append(section('Selected layer',
        slider('Size', 3, 300, 1, () => Math.round(ly.w * 100), (v) => (ly.w = v / 100), '%', 50),
        slider('Rotate', -180, 180, 1, () => Math.round(ly.rot), (v) => (ly.rot = v), '°', 0),
        slider('Opacity', 0, 100, 1, () => Math.round(ly.opacity * 100), (v) => (ly.opacity = v / 100), '%', 100),
        row,
        el('p', 'note', 'Drag to move. Corner handles resize, the top handle rotates (hold Shift to snap).')));
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
      const col = document.createElement('input');
      col.type = 'color'; col.value = s.bg; col.title = 'Border colour';
      col.onfocus = checkpoint;
      col.oninput = () => { s.bg = col.value; refresh(); };
      const r = el('div', 'row');
      r.append(txt('span', 'muted', 'Border colour'), col);
      photo.append(r);
    }
    photo.append(el('p', 'note', 'Drag the photo to reposition it, scroll to zoom. The faded area outside the frame is what gets cropped.'));
    p.append(photo);

    const adj = section('Adjust',
      slider('Zoom', 1, 4, 0.01, () => s.zoom, (v) => (s.zoom = v), '×', 1),
      slider('Brightness', 50, 150, 1, () => s.adj.brightness, (v) => (s.adj.brightness = v), '%', 100),
      slider('Contrast', 50, 150, 1, () => s.adj.contrast, (v) => (s.adj.contrast = v), '%', 100),
      slider('Saturation', 0, 200, 1, () => s.adj.saturation, (v) => (s.adj.saturation = v), '%', 100),
      slider('Warmth', -100, 100, 1, () => s.adj.warmth, (v) => (s.adj.warmth = v), '', 0),
      el('p', 'note', 'Double-click a slider to reset it.'));
    p.append(adj);

    const chips = el('div', 'row');
    Object.entries(FILTERS).forEach(([name, vals]) => chips.append(button('chip', name, null, () => { checkpoint(); s.adj = Object.assign(DEFAULT_ADJ(), vals); renderPanel(); refresh(); })));
    const all = button('btn wide', 'Copy these adjustments to all slides', null, () => { checkpoint(); state.slides.forEach((o) => (o.adj = { ...s.adj })); renderAll(); toast('Applied to all slides'); });
    all.style.marginTop = '12px';
    const reset = button('btn wide', 'Reset this photo', null, () => {
      checkpoint();
      Object.assign(s, { rot: 0, flip: false, zoom: 1, panX: 0, panY: 0, fit: 'cover', bg: '#000000', adj: DEFAULT_ADJ(), gridOff: { x: 0, y: 0 } });
      renderAll();
    });
    reset.style.marginTop = '8px';
    p.append(section('Filters', chips, all, reset));
  }

  function panelFeed(p) {
    const f1 = el('div', 'field', '<span>Username</span>');
    const u = document.createElement('input'); u.type = 'text'; u.value = state.username;
    u.oninput = () => { state.username = u.value; renderStage(); };
    f1.append(u);
    const f2 = el('div', 'field', '<span>Caption</span>');
    const t = document.createElement('textarea'); t.value = state.caption;
    t.oninput = () => { state.caption = t.value; renderStage(); };
    f2.append(t);
    const f3 = el('div', 'field', '<span>Phone appearance</span>');
    f3.append(seg([['light', 'Light'], ['dark', 'Dark']], state.theme, (v) => { state.theme = v; renderStage(); renderPanel(); }));
    p.append(section('Post details', f1, f2, f3, el('p', 'note', 'These only affect the preview. They are not exported.')));
  }

  function panelGrid(p) {
    const f1 = el('div', 'field', '<span>Tile shape</span>');
    f1.append(seg([['new', 'Current (3:4)'], ['old', 'Classic (1:1)']], state.gridShape, (v) => { state.gridShape = v; renderStage(); renderPanel(); }));
    const f2 = el('div', 'field', '<span>Show</span>');
    f2.append(seg([['post', 'This post'], ['each', 'Every photo']], state.gridFill, (v) => { state.gridFill = v; renderStage(); renderPanel(); }));
    const f3 = el('div', 'field', '<span>Phone appearance</span>');
    f3.append(seg([['light', 'Light'], ['dark', 'Dark']], state.theme, (v) => { state.theme = v; renderStage(); renderPanel(); }));
    p.append(section('Profile grid', f1, f2, f3, el('p', 'note', 'Posts show as a centre crop on your profile and a carousel shows only its first slide. Drag a tile to move the crop, like “Adjust preview” on Instagram.')));
  }

  // ---------- export ----------
  // A slide is "untouched" when exporting it would give back the original pixels, so we copy the file byte for byte.
  function pristine(s, frameAR) {
    const a = A(s.asset);
    return !s.layers.length && s.rot === 0 && !s.flip && s.zoom === 1 && s.fit === 'cover' && isDefaultAdj(s.adj) &&
      Math.abs(frameAR / (a.w / a.h) - 1) < 0.003;
  }
  function outSize(s, a, ar) {
    const iw = s.rot % 180 ? a.h : a.w, ih = s.rot % 180 ? a.w : a.h;
    let sz = L.nativeSize(iw, ih, ar, s.zoom, s.fit);
    for (const ly of s.layers) { // keep big layers sharp too
      const need = A(ly.asset).w / ly.w;
      if (need > sz.w) sz = L.capSize(need, need / ar);
    }
    return sz;
  }
  const pickType = (a, fmt) => (fmt === 'jpeg' ? 'image/jpeg' : fmt === 'png' ? 'image/png' : a.file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png');

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
    card.append(txt('h2', '', 'Export photos'));
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
  $('#add').innerHTML = `${ic('plus')} Add photos`;
  $('#export').innerHTML = `${ic('download')} Export`;
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#add').onclick = () => $('#file').click();
  $('#export').onclick = openExport;
  $('#file').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
  $('#fileLayer').onchange = (e) => { addLayerFiles(e.target.files); e.target.value = ''; };
  document.querySelectorAll('#views button').forEach((b) => (b.onclick = () => { state.view = b.dataset.view; renderAll(); }));
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
    if (!(e.ctrlKey || e.metaKey) || !ed) return;
    e.preventDefault();
    zoomView(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }, { passive: false });
  stage.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); }); // no autoscroll
  stage.addEventListener('pointerdown', (e) => {
    if (!ed || !(e.button === 1 || (e.button === 0 && space))) return;
    e.preventDefault();
    e.stopPropagation(); // keep the photo/layer drag from starting
    vp = { x: e.clientX, y: e.clientY };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('panning');
  }, true);
  stage.addEventListener('pointermove', (e) => {
    if (!vp) return;
    view.x += e.clientX - vp.x;
    view.y += e.clientY - vp.y;
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
    const t = document.activeElement;
    const typing = t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text'));
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === '0' && ed && !typing) { e.preventDefault(); return resetView(); }
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); return redo(); }
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (!state.slides.length) return;
    if (e.code === 'Space' && ed) { e.preventDefault(); setSpace(true); return; }
    const ly = state.view === 'edit' ? curLayer() : null;
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
  window.__ig = { state, assets, addFiles, addLayerFiles, renderAll, moveSlide, placeOnto, undo, redo, pristine, frameInfo };
  renderAll();
})();

(() => {
  const L = window.IGLogic;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  const state = {
    slides: [],
    sel: 0,
    ratio: 'auto',
    mode: 'match',
    theme: 'light',
    tab: 'edit',
    gridShape: 'new', // 'new' = 3:4, 'old' = 1:1
    gridFill: 'post', // 'post' = this post + placeholders, 'each' = every image as its own post
    username: 'yourname',
    caption: 'Your caption goes here. Instagram collapses long captions after about two lines, so the first sentence matters most.',
  };

  const DEFAULT_ADJ = () => ({ brightness: 100, contrast: 100, saturation: 100, warmth: 0, grayscale: 0, sepia: 0 });
  const FILTERS = {
    Original: {},
    Vivid: { contrast: 112, saturation: 135 },
    Warm: { warmth: 35, saturation: 110 },
    Cool: { warmth: -35 },
    Mono: { grayscale: 100, contrast: 110 },
    Fade: { contrast: 85, brightness: 108, saturation: 85 },
    Sepia: { sepia: 70 },
  };

  let uid = 0;
  let cells = []; // preview canvases, one per slide
  let lastSig = '';
  let toastTimer;

  // ---------- slides ----------
  function makeProxy(img) {
    const max = 1600;
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  function newSlide(name, img) {
    return {
      id: ++uid,
      name,
      img,
      proxy: makeProxy(img),
      w: img.naturalWidth,
      h: img.naturalHeight,
      rot: 0,
      flip: false,
      zoom: 1,
      panX: 0,
      panY: 0,
      fit: 'cover',
      bg: '#000000',
      adj: DEFAULT_ADJ(),
      gridOff: { x: 0, y: 0 },
    };
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return toast('No supported images in that selection');
    const room = L.MAX_SLIDES - state.slides.length;
    if (files.length > room) toast(`Instagram allows ${L.MAX_SLIDES} slides, skipped ${files.length - room}`);
    for (const f of files.slice(0, Math.max(0, room))) {
      try {
        state.slides.push(newSlide(f.name, await loadImage(f)));
      } catch {
        toast(`Couldn't open ${f.name} (HEIC isn't supported, convert to JPG/PNG first)`);
      }
    }
    state.sel = Math.min(state.sel, state.slides.length - 1);
    renderAll();
  }

  function moveSlide(from, to) {
    if (from === to || to < 0 || to >= state.slides.length) return;
    const selId = state.slides[state.sel] && state.slides[state.sel].id;
    const [s] = state.slides.splice(from, 1);
    state.slides.splice(to, 0, s);
    state.sel = Math.max(0, state.slides.findIndex((x) => x.id === selId));
    renderAll();
  }

  function removeSlide(i) {
    state.slides.splice(i, 1);
    state.sel = Math.min(state.sel, state.slides.length - 1);
    renderAll();
  }

  // ---------- rendering ----------
  const cssFilter = (a) =>
    `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) grayscale(${a.grayscale}%) sepia(${a.sepia}%)`;

  function dims(s, src) {
    const w = src.width, h = src.height;
    return s.rot % 180 ? { iw: h, ih: w } : { iw: w, ih: h };
  }

  function renderSlide(s, canvas, tw, th, full) {
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, tw, th);
    const src = full ? s.img : s.proxy;
    const sw = full ? s.img.naturalWidth : src.width;
    const sh = full ? s.img.naturalHeight : src.height;
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

  function frameInfo() {
    return L.carousel(state.mode, state.ratio, state.slides.map((s) => L.naturalAR(s.w, s.h, s.rot)));
  }

  function renderAll() {
    lastSig = JSON.stringify(frameInfo());
    $('#empty').parentElement.classList.toggle('has-slides', state.slides.length > 0);
    $('#count').textContent = state.slides.length ? `${state.slides.length}/${L.MAX_SLIDES} slides` : '';
    renderStrip();
    renderPhone();
    renderPanel();
  }

  // Re-render only what a single-slide change touches, unless the frame shape changed.
  function commit(i) {
    if (JSON.stringify(frameInfo()) !== lastSig) return renderAll();
    const info = frameInfo();
    renderCell(i, info);
    const t = $(`#strip .item:nth-child(${i + 1}) canvas`);
    if (t) renderSlide(state.slides[i], t, 120, Math.round(120 / info.slideARs[i]), false);
    if (i === state.sel) renderViewport();
    if (state.tab === 'grid') renderGrid();
  }

  function renderStrip() {
    const strip = $('#strip');
    strip.innerHTML = '';
    const info = frameInfo();
    let dragFrom = null;
    state.slides.forEach((s, i) => {
      const it = el('div', 'item' + (i === state.sel ? ' sel' : ''));
      it.draggable = true;
      const c = document.createElement('canvas');
      renderSlide(s, c, 120, Math.round(120 / info.slideARs[i]), false);
      it.append(c, el('span', 'num', String(i + 1)));
      const row = el('div', 'row');
      const l = el('button', '', '◀'), r = el('button', '', '▶'), x = el('button', '', '✕');
      l.title = 'Move earlier (Alt+←)'; r.title = 'Move later (Alt+→)'; x.title = 'Remove (Del)';
      l.onclick = (e) => { e.stopPropagation(); moveSlide(i, i - 1); };
      r.onclick = (e) => { e.stopPropagation(); moveSlide(i, i + 1); };
      x.onclick = (e) => { e.stopPropagation(); removeSlide(i); };
      row.append(l, x, r);
      it.append(row);
      it.onclick = () => select(i);
      it.addEventListener('dragstart', (e) => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); it.classList.add('dragging'); });
      it.addEventListener('dragend', () => { dragFrom = null; it.classList.remove('dragging'); });
      it.addEventListener('dragover', (e) => { if (dragFrom != null) { e.preventDefault(); it.classList.add('over'); } });
      it.addEventListener('dragleave', () => it.classList.remove('over'));
      it.addEventListener('drop', (e) => {
        if (dragFrom == null) return;
        e.preventDefault();
        e.stopPropagation();
        it.classList.remove('over');
        moveSlide(dragFrom, i);
        dragFrom = null;
      });
      strip.append(it);
    });
  }

  function select(i) {
    state.sel = i;
    document.querySelectorAll('#strip .item').forEach((n, k) => n.classList.toggle('sel', k === i));
    goTo(i);
    renderPanel();
  }

  // ----- phone preview -----
  let cur = 0;
  let trackEl, pagerEl, pillEl;

  function goTo(i) {
    cur = Math.max(0, Math.min(state.slides.length - 1, i));
    if (!trackEl) return;
    trackEl.style.transform = `translateX(${-cur * 100}%)`;
    [...pagerEl.children].forEach((d, k) => d.classList.toggle('on', k === cur));
    if (pillEl) pillEl.textContent = `${cur + 1}/${state.slides.length}`;
  }

  function renderCell(i, info) {
    const c = cells[i];
    if (!c) return;
    const ar = info.slideARs[i];
    renderSlide(state.slides[i], c, 780, Math.round(780 / ar), false);
  }

  function renderPhone() {
    const host = $('#phone');
    host.className = `phone ${state.theme}`;
    host.innerHTML = '';
    cells = [];
    trackEl = pagerEl = pillEl = null;
    if (!state.slides.length) return;
    const info = frameInfo();
    const n = state.slides.length;

    const hd = el('div', 'hd');
    hd.innerHTML = `<div class="av"><i></i></div><div><div class="un"></div></div><div class="dots3">···</div>`;
    hd.querySelector('.un').textContent = state.username || 'yourname';

    const frame = el('div', 'frame');
    frame.style.aspectRatio = String(info.frameAR);
    trackEl = el('div', 'track');
    state.slides.forEach(() => {
      const cell = el('div', 'cell');
      const c = document.createElement('canvas');
      cell.append(c);
      trackEl.append(cell);
      cells.push(c);
    });
    frame.append(trackEl);
    if (n > 1) {
      pillEl = el('div', 'pill');
      frame.append(pillEl);
      const a = el('button', 'arrow l', '‹'), b = el('button', 'arrow r', '›');
      a.onclick = () => select(Math.max(0, cur - 1));
      b.onclick = () => select(Math.min(n - 1, cur + 1));
      frame.append(a, b);
    }
    // swipe
    let sx = null;
    frame.addEventListener('pointerdown', (e) => { sx = e.clientX; trackEl.classList.add('dragging'); frame.setPointerCapture(e.pointerId); });
    frame.addEventListener('pointermove', (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx;
      trackEl.style.transform = `translateX(calc(${-cur * 100}% + ${dx}px))`;
    });
    const end = (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx;
      sx = null;
      trackEl.classList.remove('dragging');
      select(dx < -50 ? Math.min(n - 1, cur + 1) : dx > 50 ? Math.max(0, cur - 1) : cur);
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);

    const acts = el('div', 'acts');
    acts.innerHTML = '<span>♡</span><span>💬</span><span>➤</span>';
    pagerEl = el('div', 'pager');
    for (let k = 0; k < n; k++) pagerEl.append(el('span'));
    if (n > 1) acts.append(pagerEl);
    acts.append(el('span', 'save', '🔖'));

    const meta = el('div', 'meta');
    meta.innerHTML = '<div class="likes">1,234 likes</div><div class="cap"><b></b> <span></span></div><div class="more">more</div>';
    meta.querySelector('b').textContent = state.username || 'yourname';
    meta.querySelector('.cap span').textContent = state.caption;

    host.append(hd, frame, acts, meta);
    cells.forEach((_, i) => renderCell(i, info));
    goTo(Math.min(state.sel, n - 1));
  }

  // ---------- right panel ----------
  function renderPanel() {
    const p = $('#panel');
    p.innerHTML = '';
    const tabs = el('div', 'tabs');
    ['edit', 'grid'].forEach((t) => {
      const b = el('button', 'btn' + (state.tab === t ? ' on' : ''), t === 'edit' ? 'Edit slide' : 'Profile grid');
      b.onclick = () => { state.tab = t; renderPanel(); };
      tabs.append(b);
    });
    p.append(tabs);
    if (!state.slides.length) { p.append(el('div', 'note', 'Add images to start.')); return; }
    if (state.tab === 'edit') buildEdit(p); else buildGrid(p);
  }

  let vpCanvas, vpWrap;

  function renderViewport() {
    if (!vpCanvas) return;
    const s = state.slides[state.sel];
    const info = frameInfo();
    const ar = info.slideARs[state.sel];
    renderSlide(s, vpCanvas, 720, Math.round(720 / ar), false);
    vpWrap.querySelectorAll('.dim').forEach((n) => n.remove());
    if (state.sel === 0 || state.gridFill === 'each') {
      const tileAR = state.gridShape === 'new' ? L.GRID_AR : 1;
      const g = L.gridCrop(ar, tileAR, s.gridOff.x, s.gridOff.y);
      if (g.w < 1) {
        const l = el('div', 'dim l'), r = el('div', 'dim r');
        l.style.width = `${g.x * 100}%`;
        r.style.width = `${(1 - g.x - g.w) * 100}%`;
        vpWrap.append(l, r);
      }
    }
  }

  function slider(label, key, min, max, step, get, set, unit = '') {
    const row = el('div', 'sl');
    const inp = document.createElement('input');
    Object.assign(inp, { type: 'range', min, max, step, value: get() });
    const out = el('output', '', fmt(get()) + unit);
    inp.oninput = () => { set(+inp.value); out.textContent = fmt(+inp.value) + unit; commit(state.sel); };
    inp.ondblclick = () => { inp.value = key === 'zoom' ? 1 : (key === 'warmth' ? 0 : 100); inp.oninput(); };
    row.append(el('span', '', label), inp, out);
    return row;
  }
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

  function buildEdit(p) {
    const s = state.slides[state.sel];
    vpWrap = el('div', 'vp');
    vpCanvas = document.createElement('canvas');
    vpWrap.append(vpCanvas);
    p.append(vpWrap);
    p.append(el('div', 'note', 'Drag to reposition, scroll to zoom. Shaded bars show what the profile grid crops away (slide 1 only).'));

    // pan / zoom on the viewport
    let last = null;
    vpWrap.addEventListener('pointerdown', (e) => { last = [e.clientX, e.clientY]; vpWrap.setPointerCapture(e.pointerId); });
    vpWrap.addEventListener('pointermove', (e) => {
      if (!last) return;
      const r = vpWrap.getBoundingClientRect();
      const ar = frameInfo().slideARs[state.sel];
      const { iw, ih } = dims(s, s.proxy);
      const pl = L.placeImage(iw, ih, r.width, r.width / ar, s.zoom, 0, 0, s.fit);
      if (pl.mx > 0) s.panX = L.clamp(s.panX + (e.clientX - last[0]) / pl.mx, -1, 1);
      if (pl.my > 0) s.panY = L.clamp(s.panY + (e.clientY - last[1]) / pl.my, -1, 1);
      last = [e.clientX, e.clientY];
      commit(state.sel);
    });
    vpWrap.addEventListener('pointerup', () => (last = null));
    vpWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      s.zoom = L.clamp(s.zoom * (1 - e.deltaY * 0.001), 1, 4);
      const z = $('#zoomSl input');
      if (z) { z.value = s.zoom; z.nextSibling.textContent = fmt(+s.zoom.toFixed(2)); }
      commit(state.sel);
    }, { passive: false });

    const b = el('div', 'btns');
    const mk = (txt, title, fn) => { const x = el('button', 'btn small', txt); x.title = title; x.onclick = fn; b.append(x); return x; };
    mk('⟲', 'Rotate left', () => { s.rot = (s.rot + 270) % 360; s.panX = s.panY = 0; commit(state.sel); });
    mk('⟳', 'Rotate right', () => { s.rot = (s.rot + 90) % 360; s.panX = s.panY = 0; commit(state.sel); });
    mk('⇋ Flip', 'Flip horizontally', () => { s.flip = !s.flip; commit(state.sel); });
    mk(s.fit === 'cover' ? 'Fill' : 'Fit + border', 'Toggle between filling the frame and fitting inside it with a border', () => { s.fit = s.fit === 'cover' ? 'contain' : 'cover'; s.panX = s.panY = 0; renderAll(); });
    if (s.fit === 'contain') {
      const col = document.createElement('input');
      col.type = 'color'; col.value = s.bg; col.title = 'Border colour';
      col.oninput = () => { s.bg = col.value; commit(state.sel); };
      b.append(col);
    }
    mk('Reset', 'Reset this slide', () => { Object.assign(s, { rot: 0, flip: false, zoom: 1, panX: 0, panY: 0, fit: 'cover', bg: '#000000', adj: DEFAULT_ADJ(), gridOff: { x: 0, y: 0 } }); renderAll(); });
    p.append(b);

    p.append(el('div', 'sec', 'Adjust'));
    const zs = slider('Zoom', 'zoom', 1, 4, 0.01, () => s.zoom, (v) => (s.zoom = v), '×');
    zs.id = 'zoomSl';
    p.append(zs);
    p.append(slider('Brightness', 'brightness', 50, 150, 1, () => s.adj.brightness, (v) => (s.adj.brightness = v), '%'));
    p.append(slider('Contrast', 'contrast', 50, 150, 1, () => s.adj.contrast, (v) => (s.adj.contrast = v), '%'));
    p.append(slider('Saturation', 'saturation', 0, 200, 1, () => s.adj.saturation, (v) => (s.adj.saturation = v), '%'));
    p.append(slider('Warmth', 'warmth', -100, 100, 1, () => s.adj.warmth, (v) => (s.adj.warmth = v)));
    p.append(el('div', 'note', 'Double-click a slider to reset it.'));

    p.append(el('div', 'sec', 'Filters'));
    const chips = el('div', 'chips');
    Object.entries(FILTERS).forEach(([name, vals]) => {
      const c = el('button', 'btn small', name);
      c.onclick = () => { s.adj = Object.assign(DEFAULT_ADJ(), vals); renderPanel(); commit(state.sel); };
      chips.append(c);
    });
    p.append(chips);
    const all = el('button', 'btn small', 'Copy these adjustments to all slides');
    all.style.marginTop = '8px';
    all.onclick = () => { state.slides.forEach((o) => (o.adj = { ...s.adj })); renderAll(); toast('Applied to all slides'); };
    p.append(all);

    p.append(el('div', 'sec', 'Post details (preview only)'));
    const f1 = el('div', 'field', '<span class="muted">Username</span>');
    const u = document.createElement('input'); u.type = 'text'; u.value = state.username;
    u.oninput = () => { state.username = u.value; renderPhone(); };
    f1.append(u);
    const f2 = el('div', 'field', '<span class="muted">Caption</span>');
    const t = document.createElement('textarea'); t.value = state.caption;
    t.oninput = () => { state.caption = t.value; renderPhone(); };
    f2.append(t);
    p.append(f1, f2);

    renderViewport();
  }

  // ----- profile grid -----
  function buildGrid(p) {
    const row = el('div', 'btns');
    const shape = el('select');
    shape.innerHTML = '<option value="new">Current grid (3:4 tiles)</option><option value="old">Classic grid (1:1 tiles)</option>';
    shape.value = state.gridShape;
    shape.onchange = () => { state.gridShape = shape.value; renderGrid(); };
    const fill = el('select');
    fill.innerHTML = '<option value="post">This post only</option><option value="each">Every image as its own post</option>';
    fill.value = state.gridFill;
    fill.onchange = () => { state.gridFill = fill.value; renderGrid(); };
    row.append(shape, fill);
    p.append(row);
    p.append(el('div', 'note', 'Posts show as a centre-crop on your profile; the full image appears when opened. Drag a tile to move the crop (like Instagram’s “Adjust preview”). A carousel shows only its first slide.'));
    const gh = el('div');
    gh.id = 'gridHost';
    p.append(gh);
    renderGrid();
  }

  function renderGrid() {
    const host = $('#gridHost');
    if (!host) return;
    host.innerHTML = '';
    const g = el('div', 'grid');
    const info = frameInfo();
    const tileAR = state.gridShape === 'new' ? L.GRID_AR : 1;
    const tw = 300, th = Math.round(300 / tileAR);
    const list = state.gridFill === 'each' ? state.slides.map((s, i) => [s, i]) : [[state.slides[0], 0]];
    const total = state.gridFill === 'each' ? Math.ceil(list.length / 3) * 3 : 9;
    for (let k = 0; k < total; k++) {
      if (!list[k]) {
        const ph = el('div', 'ph');
        ph.style.aspectRatio = String(tileAR);
        g.append(ph);
        continue;
      }
      const [s, i] = list[k];
      const ar = info.slideARs[i];
      const tmp = document.createElement('canvas');
      renderSlide(s, tmp, 600, Math.round(600 / ar), false);
      const c = document.createElement('canvas');
      c.width = tw; c.height = th;
      const cr = L.gridCrop(ar, tileAR, s.gridOff.x, s.gridOff.y);
      c.getContext('2d').drawImage(tmp, cr.x * tmp.width, cr.y * tmp.height, cr.w * tmp.width, cr.h * tmp.height, 0, 0, tw, th);
      c.className = 'drag';
      let last = null;
      c.addEventListener('pointerdown', (e) => { last = [e.clientX, e.clientY]; c.setPointerCapture(e.pointerId); });
      c.addEventListener('pointermove', (e) => {
        if (!last) return;
        s.gridOff.x = L.clamp(s.gridOff.x - (e.clientX - last[0]) * 0.015, -1, 1);
        s.gridOff.y = L.clamp(s.gridOff.y - (e.clientY - last[1]) * 0.015, -1, 1);
        last = [e.clientX, e.clientY];
        renderGrid();
      });
      c.addEventListener('pointerup', () => (last = null));
      g.append(c);
    }
    host.append(g);
  }

  // ---------- export ----------
  async function exportAll() {
    if (!state.slides.length) return toast('Add images first');
    const info = frameInfo();
    const out = [];
    let upscaled = 0;
    for (let i = 0; i < state.slides.length; i++) {
      const s = state.slides[i];
      const { w, h } = L.exportSize(info.slideARs[i]);
      if (Math.min(s.w, s.h) < 1080 * 0.6 && Math.max(s.w, s.h) < 1080) upscaled++;
      const c = document.createElement('canvas');
      renderSlide(s, c, w, h, true);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
      out.push({ name: `${String(i + 1).padStart(2, '0')}.jpg`, blob, bytes: await blob.arrayBuffer() });
    }
    if (window.api && window.api.saveFiles) {
      const dir = await window.api.saveFiles(out.map(({ name, bytes }) => ({ name, bytes })));
      if (dir) toast(`Saved ${out.length} JPEGs to ${dir}`);
    } else {
      out.forEach(({ name, blob }) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
      });
      toast(`Downloaded ${out.length} JPEGs`);
    }
    if (upscaled) toast(`${upscaled} image(s) were smaller than 1080px and got upscaled`);
  }

  // ---------- misc ----------
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 4000);
  }

  $('#add').onclick = () => $('#file').click();
  $('#file').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
  $('#ratio').onchange = (e) => { state.ratio = e.target.value; renderAll(); };
  $('#mode').onchange = (e) => { state.mode = e.target.value; renderAll(); };
  $('#theme').onchange = (e) => { state.theme = e.target.value; renderPhone(); };
  $('#export').onclick = exportAll;

  const stage = $('#stage');
  window.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); stage.classList.add('dragover'); } });
  window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) stage.classList.remove('dragover'); });
  window.addEventListener('drop', (e) => {
    stage.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); }
  });

  window.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (!state.slides.length) return;
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); moveSlide(state.sel, state.sel - 1); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); moveSlide(state.sel, state.sel + 1); }
    else if (e.key === 'ArrowLeft') select(Math.max(0, state.sel - 1));
    else if (e.key === 'ArrowRight') select(Math.min(state.slides.length - 1, state.sel + 1));
    else if (e.key === 'Delete') removeSlide(state.sel);
  });

  // test hook (used by the headless smoke test)
  window.__ig = { state, addFiles, renderAll, moveSlide, exportAll };
  renderAll();
})();

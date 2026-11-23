// Instagram display rules, kept pure so they can be unit-tested in Node.
// Sources: Meta Graph/Ads docs (4:5 to 1.91:1 range, first-slide crop), and 2025-26 creator guides
// (3:4 profile grid, 3:4 feed uploads, 20 slides, 1080px width).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IGLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const WIDTH = 1080;
  const MAX_SLIDES = 20;
  const MIN_AR = 3 / 4; // tallest feed shape the app accepts (w/h)
  const MAX_AR = 1.91; // widest
  const GRID_AR = 3 / 4; // current profile-grid tile
  const PRESETS = { '3:4': 3 / 4, '4:5': 4 / 5, '1:1': 1, '1.91:1': 1.91 };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const clampAR = (ar) => clamp(ar, MIN_AR, MAX_AR);
  const naturalAR = (w, h, rot) => (rot % 180 ? h / w : w / h);

  // ratio: 'auto' | key of PRESETS. mode: 'match' (first slide sets the frame) | 'mixed'.
  function carousel(mode, ratio, ars) {
    if (ratio !== 'auto') {
      const a = PRESETS[ratio];
      return { frameAR: a, slideARs: ars.map(() => a) };
    }
    if (!ars.length) return { frameAR: 4 / 5, slideARs: [] };
    if (mode === 'match') {
      const a = clampAR(ars[0]);
      return { frameAR: a, slideARs: ars.map(() => a) };
    }
    const s = ars.map(clampAR);
    return { frameAR: Math.min(...s), slideARs: s };
  }

  // Where the image centre lands in a tw x th frame. pan is -1..1 across the available overflow.
  function placeImage(iw, ih, tw, th, zoom, panX, panY, fit) {
    const base = fit === 'contain' ? Math.min(tw / iw, th / ih) : Math.max(tw / iw, th / ih);
    const scale = base * zoom;
    const mx = Math.max(0, (iw * scale - tw) / 2);
    const my = Math.max(0, (ih * scale - th) / 2);
    return {
      scale,
      mx,
      my,
      cx: tw / 2 + clamp(panX, -1, 1) * mx,
      cy: th / 2 + clamp(panY, -1, 1) * my,
    };
  }

  // Centre-crop (with optional offset) of a slide to a profile-grid tile. Returns fractions.
  function gridCrop(slideAR, tileAR, offX, offY) {
    if (slideAR > tileAR) {
      const w = tileAR / slideAR;
      return { x: (1 - w) * (0.5 + clamp(offX, -1, 1) / 2), y: 0, w, h: 1 };
    }
    if (slideAR < tileAR) {
      const h = slideAR / tileAR;
      return { x: 0, y: (1 - h) * (0.5 + clamp(offY, -1, 1) / 2), w: 1, h };
    }
    return { x: 0, y: 0, w: 1, h: 1 };
  }

  const exportSize = (ar) => ({ w: WIDTH, h: Math.round(WIDTH / ar) });

  return { WIDTH, MAX_SLIDES, MIN_AR, MAX_AR, GRID_AR, PRESETS, clamp, clampAR, naturalAR, carousel, placeImage, gridCrop, exportSize };
});

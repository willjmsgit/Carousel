const assert = require('assert');
const L = require('../renderer/ratios.js');

const near = (a, b, eps = 0.5) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

// Profile grid: figures quoted by guides (4:5 loses ~34px/side, 1:1 loses ~135px/side at 1080 wide)
let c = L.gridCrop(4 / 5, L.GRID_AR, 0, 0);
near(((1 - c.w) / 2) * 1080, 33.75);
c = L.gridCrop(1, L.GRID_AR, 0, 0);
near(((1 - c.w) / 2) * 1080, 135);
c = L.gridCrop(3 / 4, L.GRID_AR, 0, 0);
assert.deepStrictEqual(c, { x: 0, y: 0, w: 1, h: 1 });
c = L.gridCrop(1.91, L.GRID_AR, -1, 0);
assert.strictEqual(c.x, 0);
c = L.gridCrop(1.91, L.GRID_AR, 1, 0);
near(c.x + c.w, 1, 1e-9);

// Carousel: first slide sets the frame, clamped to 3:4..1.91:1
let r = L.carousel('match', 'auto', [1, 0.5, 2.5]);
assert.strictEqual(r.frameAR, 1);
assert.deepStrictEqual(r.slideARs, [1, 1, 1]);
r = L.carousel('match', 'auto', [0.5]);
assert.strictEqual(r.frameAR, 0.75);
r = L.carousel('match', 'auto', [3]);
assert.strictEqual(r.frameAR, 1.91);
r = L.carousel('mixed', 'auto', [1, 0.8, 3]);
assert.deepStrictEqual(r.slideARs, [1, 0.8, 1.91]);
assert.strictEqual(r.frameAR, 0.8);
r = L.carousel('mixed', '1:1', [0.5, 2]);
assert.deepStrictEqual(r.slideARs, [1, 1]);

// Export sizes
assert.deepStrictEqual(L.exportSize(0.8), { w: 1080, h: 1350 });
assert.deepStrictEqual(L.exportSize(0.75), { w: 1080, h: 1440 });
assert.deepStrictEqual(L.exportSize(1.91), { w: 1080, h: 565 });

// Placement: cover fills, contain fits, pan is clamped
let p = L.placeImage(4000, 3000, 1080, 1350, 1, 0, 0, 'cover');
near(3000 * p.scale, 1350, 1e-6);
p = L.placeImage(4000, 3000, 1080, 1350, 1, 5, 0, 'cover');
near(p.cx, 540 + p.mx, 1e-6);
p = L.placeImage(4000, 3000, 1080, 1350, 1, 0, 0, 'contain');
near(4000 * p.scale, 1080, 1e-6);
assert.strictEqual(p.mx, 0);

assert.strictEqual(L.naturalAR(4000, 3000, 90), 0.75);

console.log('logic tests passed');

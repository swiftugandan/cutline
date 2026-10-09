import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewProjection, project, rayThrough, zoomAbout, orbitAbout, slideBy, fitCamera, lerpCamera, onTargetPlane, MAX_PITCH } from '../src/render/camera.js';

const W = 1200, H = 700;
/** @param {import('../src/render/camera.js').OrbitCamera} c @param {number[]} p */
const screen = (c, p) => /** @type {number[]} */ (project(viewProjection(c, W, H).matrix, p, W, H));
/** @param {number[]} a @param {number[]} b */
const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const cameras = [
  { target: [-2000, 0, 700], yaw: -0.6, pitch: 0.35, distance: 9000, ortho: false, scale: 1 },
  { target: [-2000, 0, 700], yaw: 2.4, pitch: -0.3, distance: 6000, ortho: true, scale: 1 },
];

test('a zoom keeps the point it zooms about still on the screen, in perspective and orthographic views', () => {
  for (const c of cameras) for (const point of [[-300, 700, 900], [-4200, -800, 200]]) {
    const before = screen(c, point);
    for (const factor of [1.6, 0.5]) {
      const z = zoomAbout(c, factor, point);
      assert.ok(apart(screen(z, point), before) < 1e-6, `${c.ortho ? 'ortho' : 'perspective'} zoom by ${factor} moved the point`);
      assert.ok(Math.abs(z.distance - c.distance / factor) < 1e-6);
    }
  }
  // A zoom stopped by the nearest distance still holds the point.
  const c = cameras[0], point = [-300, 700, 900], z = zoomAbout(c, 1e6, point);
  assert.ok(apart(screen(z, point), screen(c, point)) < 1e-6);
});

test('an orbit keeps its pivot still on the screen and turns the view by the angles asked for', () => {
  for (const c of cameras) {
    const pivot = [-1000, 400, 1100];
    const before = screen(c, pivot);
    const o = orbitAbout(c, 0.4, 0.2, pivot);
    assert.ok(apart(screen(o, pivot), before) < 1e-6);
    assert.ok(Math.abs(o.yaw - c.yaw - 0.4) < 1e-12 && Math.abs(o.pitch - c.pitch - 0.2) < 1e-12);
    // The pivot keeps its distance from the eye.
    assert.ok(Math.abs(o.distance - c.distance) < 1e-9);
  }
  // Pitch stops short of straight down from above, where the view would flip.
  assert.equal(orbitAbout(cameras[0], 0, 10, [0, 0, 0]).pitch, MAX_PITCH);
});

test('a slide moves a point at the target\'s depth with the pointer', () => {
  for (const c of cameras) {
    const before = screen(c, c.target);
    const s = slideBy(c, 37, -21, H);
    const after = screen(s, c.target);
    assert.ok(Math.abs(after[0] - before[0] - 37) < 1e-6 && Math.abs(after[1] - before[1] + 21) < 1e-6);
  }
});

test('a ray through a screen point meets the plane through the target at the point drawn there', () => {
  const c = cameras[0], m = viewProjection(c, W, H).matrix;
  const p = onTargetPlane(c, rayThrough(m, 300, 200, W, H));
  const back = screen(c, p);
  assert.ok(apart(back, [300, 200]) < 1e-6);
});

test('a fit frames every corner of the box inside the view', () => {
  const box = { min: [-4500, -900, 0], max: [0, 900, 1500] };
  for (const c of cameras) {
    const f = fitCamera(c, box, W, H);
    let edge = 0;
    for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) {
      const [sx, sy] = screen(f, [x, y, z]);
      assert.ok(sx >= 0 && sx <= W && sy >= 0 && sy <= H, `corner ${x}, ${y}, ${z} is off the screen`);
      edge = Math.max(edge, Math.abs(sx / W - 0.5) * 2, Math.abs(sy / H - 0.5) * 2);
    }
    // The tighter direction is filled to 92%.
    assert.ok(Math.abs(edge - 0.92) < 0.01, `filled ${edge}`);
  }
});

test('a camera move turns the short way round', () => {
  const a = { ...cameras[0], yaw: 3.0 }, b = { ...cameras[0], yaw: -3.0 };
  const mid = lerpCamera(a, b, 0.5);
  // From 3.0 to −3.0 rad the short way passes through π, not 0.
  assert.ok(Math.abs(Math.cos(mid.yaw) + 1) < 0.01);
  assert.deepEqual(lerpCamera(a, b, 1).target, b.target);
});

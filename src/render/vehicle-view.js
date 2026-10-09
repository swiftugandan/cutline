/** The vehicle in 3D: the model shaded in WebGL 2 (or see-through), the lamps as their apparent surfaces coloured by
 * their result, the selected lamp's field of geometric visibility and its regulation dimensions, and a ground grid.
 * Names, outlines, dimensions, the view cube and the axes are drawn on a 2D canvas laid over it, which also takes the
 * pointer. The camera maths is in ./camera.js. Coordinates are the vehicle frame in millimetres: x forwards, y to the
 * left, z up. */

import { lampFrame as frameOf } from '../core/installation.js';
import { viewProjection, project, rayThrough, onTargetPlane, zoomAbout, orbitAbout, slideBy, fitCamera, lerpCamera, copyCamera, frame, dot, HALF_FOV, MAX_PITCH } from './camera.js';

/** @import { PlacedLamp } from '../core/vehicle.js' */
/** @import { Bounds } from '../core/mesh/mesh.js' */
/** @import { VisibilityMap, InstallItem } from '../core/installation.js' */
/** @import { OrbitCamera, Box } from './camera.js' */

/** @typedef {'pass' | 'near' | 'fail' | 'none'} LampStatus */
/** @typedef {'front' | 'rear' | 'left' | 'right' | 'top' | 'iso'} ViewPreset */
/**
 * @typedef {{ a: number[], b: number[], ext: number[][][], text: string, status: 'pass' | 'near' | 'fail' }} Dimension
 *   A dimension line from a to b with its extension lines (pairs of points), labelled with text.
 * @typedef {{ a: number[], b: number[], text: string }} SnapGuide  A dashed guide between two points while a lamp snaps.
 */

const COLOURS = { pass: [0.32, 0.81, 0.4], near: [0.95, 0.76, 0.19], fail: [1, 0.42, 0.42], none: [0.76, 0.79, 0.84] };
const CSS = { pass: '#51cf66', near: '#f2c230', fail: '#ff6b6b' };
const HALO = 'rgba(11, 13, 17, .85)';

/** Each standard view's yaw and pitch. Top looks down with the front of the vehicle up the screen. */
const PRESETS = /** @type {Record<ViewPreset, [number, number]>} */ ({ front: [0, 0.02], rear: [Math.PI, 0.02], left: [Math.PI / 2, 0.02], right: [-Math.PI / 2, 0.02], top: [Math.PI, MAX_PITCH], iso: [-0.6, 0.35] });

/** The view cube's faces, in the vehicle frame. Bottom has no standard view. */
const FACES = /** @type {{ id: ViewPreset | 'bottom', n: number[], t: number[], label: string }[]} */ ([
  { id: 'front', n: [1, 0, 0], t: [0, 1, 0], label: 'Front' }, { id: 'rear', n: [-1, 0, 0], t: [0, 1, 0], label: 'Rear' },
  { id: 'left', n: [0, 1, 0], t: [1, 0, 0], label: 'Left' }, { id: 'right', n: [0, -1, 0], t: [1, 0, 0], label: 'Right' },
  { id: 'top', n: [0, 0, 1], t: [1, 0, 0], label: 'Top' }, { id: 'bottom', n: [0, 0, -1], t: [1, 0, 0], label: 'Bottom' },
]);

const MESH_VS = `#version 300 es
in vec3 p;
uniform mat4 mvp;
out vec3 wp;
void main() { wp = p; gl_Position = mvp * vec4(p, 1.0); }`;
const MESH_FS = `#version 300 es
precision highp float;
in vec3 wp;
uniform vec3 eye;
uniform vec3 base;
uniform float alpha;
out vec4 colour;
void main() {
  vec3 n = normalize(cross(dFdx(wp), dFdy(wp)));
  vec3 v = normalize(eye - wp);
  if (dot(n, v) < 0.0) n = -n;
  vec3 key = normalize(vec3(0.35, 0.45, 0.82));
  float light = 0.32 + 0.5 * max(dot(n, key), 0.0) + 0.28 * max(dot(n, v), 0.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.18;
  colour = vec4(base * light + rim, alpha);
}`;
const LINE_VS = `#version 300 es
in vec3 p;
in vec4 c;
uniform mat4 mvp;
out vec4 vc;
void main() { vc = c; gl_Position = mvp * vec4(p, 1.0); }`;
const LINE_FS = `#version 300 es
precision highp float;
in vec4 vc;
out vec4 colour;
void main() { colour = vc; }`;

/** The corners of a lamp's apparent surface, a few millimetres proud of its centre of reference. @param {PlacedLamp} l */
export function lampCorners(l) {
  const { axis, across } = frameOf(l);
  const o = [l.x + axis[0] * 3, l.y + axis[1] * 3, l.z];
  /** @param {number} u @param {number} w */
  const corner = (u, w) => [o[0] + u * across[0], o[1] + u * across[1], o[2] + w];
  return [corner(-l.width / 2, -l.height / 2), corner(l.width / 2, -l.height / 2), corner(l.width / 2, l.height / 2), corner(-l.width / 2, l.height / 2)];
}

/**
 * Where a ray meets a lamp's apparent surface, from either side, or null.
 * @param {number[]} origin @param {number[]} dir @param {PlacedLamp} l @param {(t: number) => number} pad
 *   the margin around the surface (mm) at a distance along the ray, so a small lamp is still easy to hit
 */
export function lampHit(origin, dir, l, pad) {
  const { axis, across } = frameOf(l);
  const c = [l.x + axis[0] * 3, l.y + axis[1] * 3, l.z];
  const denom = dot(dir, axis);
  if (Math.abs(denom) < 1e-6) return null;
  const t = dot([c[0] - origin[0], c[1] - origin[1], c[2] - origin[2]], axis) / denom;
  if (t <= 0) return null;
  const rel = [origin[0] + dir[0] * t - c[0], origin[1] + dir[1] * t - c[1], origin[2] + dir[2] * t - c[2]];
  const m = pad(t);
  return Math.abs(dot(rel, across)) <= l.width / 2 + m && Math.abs(rel[2]) <= l.height / 2 + m ? t : null;
}

/** @param {number} x */
const mm = x => `${Math.round(x).toLocaleString('en-GB')} mm`;

/**
 * The selected lamp's regulation dimensions, from its installation results: each height above the ground, its outer
 * edge to the vehicle's outer edge, its centre from the median plane, and its pair's separation. The numbers are the
 * results' own, so the drawing says what the table says.
 * @param {number} index @param {PlacedLamp[]} lamps @param {InstallItem[]} items @param {number} width the overall width (mm)
 * @returns {Dimension[]}
 */
export function dimensionsFor(index, lamps, items, width) {
  const l = lamps[index];
  if (!l) return [];
  const { axis, across, side } = frameOf(l);
  /** @type {Dimension[]} */
  const out = [];
  /** A point in the lamp's frame: u across (outwards), w up from the centre. @param {number} u @param {number} w */
  const at = (u, w) => [l.x + axis[0] * 4 + across[0] * u, l.y + axis[1] * 4 + across[1] * u, l.z + w];
  const status = (/** @type {InstallItem} */ it) => /** @type {'pass' | 'near' | 'fail'} */ (it.status === 'info' ? 'pass' : it.status);
  // Heights: vertical lines beside the lamp's outer edge, from the ground to the edge or centre measured.
  let offset = 90;
  for (const it of items.filter(i => i.lamp === index && i.check === 'height' && Number.isFinite(i.value))) {
    const u = l.width / 2 + offset, edge = it.value - l.z;
    const top = at(u, edge), foot = [top[0], top[1], 0];
    out.push({ a: foot, b: top, ext: [[at(l.width / 2, edge), at(u + 30, edge)]], text: mm(it.value), status: status(it) });
    offset += 110;
  }
  if (side) return out;
  const sign = l.y >= 0 ? 1 : -1;
  for (const it of items.filter(i => i.lamp === index && i.check === 'width' && Number.isFinite(i.value))) {
    if (it.id.endsWith(':outer-edge')) {
      // From the lamp's outer edge to the vehicle's outer edge, above the lamp.
      const w = l.height / 2 + 90, from = at(l.width / 2, w), to = [from[0], sign * width / 2, from[2]];
      out.push({ a: from, b: to, ext: [[at(l.width / 2, l.height / 2), at(l.width / 2, w + 30)], [[to[0], to[1], to[2] - 160], [to[0], to[1], to[2] + 40]]], text: mm(it.value), status: status(it) });
    } else if (it.id.endsWith(':median')) {
      // From the median plane to the lamp's centre, below the lamp.
      const w = -l.height / 2 - 90, from = at(0, w), to = [from[0], 0, from[2]];
      out.push({ a: to, b: from, ext: [[at(0, -l.height / 2), at(0, w - 30)], [[to[0], 0, to[2] - 40], [to[0], 0, to[2] + 40]]], text: mm(it.value), status: status(it) });
    }
  }
  // The pair's separation: between the inner edges, below both lamps.
  const pair = items.find(i => i.check === 'separation' && i.role === l.role && Number.isFinite(i.value));
  const twin = lamps.findIndex((o, j) => j !== index && o.role === l.role && Math.sign(o.y) === -sign && (o.facing === l.facing));
  if (pair && twin >= 0) {
    const o = lamps[twin];
    const z = Math.min(l.z - l.height / 2, o.z - o.height / 2) - 200, x = (l.x + o.x) / 2 + axis[0] * 4;
    const inner = (/** @type {PlacedLamp} */ p) => p.y - Math.sign(p.y) * p.width / 2;
    const a = [x, inner(l), z], b = [x, inner(o), z];
    out.push({ a, b, ext: [[[l.x + axis[0] * 4, inner(l), l.z - l.height / 2], [x, inner(l), z - 30]], [[o.x + axis[0] * 4, inner(o), o.z - o.height / 2], [x, inner(o), z - 30]]], text: mm(pair.value), status: status(pair) });
  }
  return out;
}

export class VehicleView {
  /** @param {HTMLCanvasElement} overlay the 2D canvas that takes the pointer @param {HTMLCanvasElement} glCanvas */
  constructor(overlay, glCanvas) {
    this.canvas = overlay;
    this.glCanvas = glCanvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (overlay.getContext('2d'));
    /** @type {WebGL2RenderingContext | null} */
    this.gl = null;
    this.width = 0; this.height = 0;
    /** @type {OrbitCamera} */
    this.camera = { target: [-2000, 0, 700], yaw: -0.6, pitch: 0.35, distance: 9000, ortho: false, scale: 1 };
    /** The camera a smooth move is heading for. @type {OrbitCamera | null} */
    this.goal = null;
    this.anim = 0;
    /** @type {Bounds | null} */
    this.bounds = null;
    this.triangles = 0;
    /** @type {PlacedLamp[]} */
    this.lamps = [];
    /** @type {LampStatus[]} */
    this.status = [];
    /** @type {number | null} */
    this.selected = null;
    /** The lamp under the pointer. @type {number | null} */
    this.hover = null;
    /** @type {VisibilityMap | null} the selected lamp's visibility */
    this.map = null;
    /** @type {Dimension[]} the selected lamp's dimensions */
    this.dims = [];
    /** The point an orbit turns about, marked while it turns. @type {number[] | null} */
    this.pivot = null;
    /** @type {SnapGuide | null} */
    this.snap = null;
    /** The view cube face under the pointer. @type {ViewPreset | null} */
    this.cubeHover = null;
    this.showFields = true;
    this.showDims = true;
    this.xray = false;
    this.active = false;
    this.raf = 0;
    /** The distance along a ray to the model, or null where it misses; the workspace gives it from its BVH.
     * @type {((origin: number[], dir: number[]) => number | null) | null} */
    this.surface = null;
    /** The shell's drawing over the view. @type {((ctx: CanvasRenderingContext2D) => void) | null} */
    this.overlay = null;
    /** Draw without on-screen aids, for an exported image. */
    this.plain = false;
    /** Called on each step of a smooth camera move. @type {(() => void) | null} */
    this.onCamera = null;
    /** @type {{ mesh: WebGLProgram, line: WebGLProgram, meshVao: WebGLVertexArrayObject | null, meshBuffer: WebGLBuffer | null } | null} */
    this.programs = null;
    /** @type {string | null} why 3D drawing is not available, if it is not */
    this.unavailable = null;
  }

  /** Creates the WebGL context and programs on first use. */
  init() {
    if (this.gl || this.unavailable) return;
    const gl = this.glCanvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) { this.unavailable = 'This browser cannot draw in 3D (WebGL 2 is not available).'; return; }
    this.gl = gl;
    /** @param {string} vs @param {string} fs */
    const program = (vs, fs) => {
      const p = /** @type {WebGLProgram} */ (gl.createProgram());
      for (const [type, src] of /** @type {[number, string][]} */ ([[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]])) {
        const s = /** @type {WebGLShader} */ (gl.createShader(type));
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'program');
      return p;
    };
    this.programs = { mesh: program(MESH_VS, MESH_FS), line: program(LINE_VS, LINE_FS), meshVao: null, meshBuffer: null };
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.width = r.width; this.height = r.height;
    for (const c of [this.canvas, this.glCanvas]) { c.width = Math.max(1, Math.round(r.width * dpr)); c.height = Math.max(1, Math.round(r.height * dpr)); }
    this.request();
  }

  request() {
    if (this.raf || !this.active) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); });
  }

  /** @param {Float32Array} positions @param {Bounds} bounds */
  setMesh(positions, bounds) {
    this.init();
    this.bounds = bounds;
    this.triangles = positions.length / 9;
    const gl = this.gl, P = this.programs;
    if (!gl || !P) return;
    if (P.meshBuffer) gl.deleteBuffer(P.meshBuffer);
    if (P.meshVao) gl.deleteVertexArray(P.meshVao);
    P.meshVao = gl.createVertexArray();
    gl.bindVertexArray(P.meshVao);
    P.meshBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, P.meshBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(P.mesh, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.request();
  }

  clearMesh() { this.bounds = null; this.triangles = 0; this.request(); }

  // ---------- Camera ----------

  /** The view-projection matrix for the current camera; keeps camera.scale current. */
  matrix() {
    const { matrix, scale } = viewProjection(this.camera, this.width, this.height);
    this.camera.scale = scale;
    return matrix;
  }

  /** Screen position of a vehicle point, or null behind the camera. @param {number[]} p @param {number[]} [m] */
  project(p, m = this.matrix()) { return project(m, p, this.width, this.height); }

  /** The ray through a screen point, in the vehicle frame. @param {number} x @param {number} y */
  ray(x, y) { return rayThrough(this.matrix(), x, y, this.width, this.height); }

  /** The model point under a screen point, or the point on the target's plane when the pointer is off the model.
   * @param {number} x @param {number} y */
  pointUnder(x, y) {
    const ray = this.ray(x, y);
    const t = this.surface?.(ray.origin, ray.dir) ?? null;
    return t !== null ? [0, 1, 2].map(a => ray.origin[a] + ray.dir[a] * t) : onTargetPlane(this.camera, ray);
  }

  /** The distance from the eye to a point, along the view: how far a slide that holds it must go. @param {number[]} p */
  depthOf(p) {
    const { dir } = frame(this.camera.yaw, this.camera.pitch);
    const t = this.camera.target;
    return Math.max(1, this.camera.distance - dot([p[0] - t[0], p[1] - t[1], p[2] - t[2]], dir));
  }

  /**
   * Moves the camera to another, smoothly over 280 ms unless asked not to or reduced motion is asked for.
   * @param {OrbitCamera} goal @param {boolean} animate
   */
  moveTo(goal, animate) {
    this.stop();
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || reduce || !this.active || !this.width) {
      this.camera = copyCamera(goal);
      this.matrix();
      this.request();
      this.onCamera?.();
      return;
    }
    this.goal = copyCamera(goal);
    const from = copyCamera(this.camera), start = performance.now(), ms = 280;
    /** @param {number} now */
    const step = now => {
      const t = Math.min(1, (now - start) / ms), k = 1 - (1 - t) ** 3;
      this.camera = t < 1 ? lerpCamera(from, /** @type {OrbitCamera} */ (this.goal), k) : copyCamera(/** @type {OrbitCamera} */ (this.goal));
      if (t < 1) this.anim = requestAnimationFrame(step); else { this.anim = 0; this.goal = null; }
      this.draw();
      this.onCamera?.();
    };
    this.anim = requestAnimationFrame(step);
  }

  /** Stops a smooth move where it is, when the user takes the camera. */
  stop() {
    if (!this.anim) return;
    cancelAnimationFrame(this.anim);
    this.anim = 0;
    this.goal = null;
  }

  /** The box fit frames: the model, or a car-sized box before one is open. @returns {Box} */
  box() { return this.bounds ?? { min: [-4500, -900, 0], max: [0, 900, 1500] }; }

  /** @param {boolean} [animate] */
  fit(animate = false) { this.moveTo(fitCamera(this.camera, this.box(), this.width, this.height), animate); }

  /** @param {ViewPreset} preset @param {boolean} [animate] */
  preset(preset, animate = true) {
    const [yaw, pitch] = PRESETS[preset];
    this.moveTo(fitCamera({ ...this.camera, yaw, pitch }, this.box(), this.width, this.height), animate);
  }

  /** Frames a lamp and what is around it, from the current direction. @param {PlacedLamp} l */
  frameLamp(l) {
    const r = Math.max(l.width, l.height) * 0.9 + 80;
    this.moveTo(fitCamera(this.camera, { min: [l.x - r, l.y - r, l.z - r], max: [l.x + r, l.y + r, l.z + r] }, this.width, this.height), true);
  }

  /** Looks at a lamp from along its reference axis, as an observer in front of it would. @param {PlacedLamp} l */
  lookAlong(l) {
    const { axis } = frameOf(l);
    const r = Math.max(l.width, l.height) * 0.9 + 80;
    this.moveTo(fitCamera({ ...this.camera, yaw: Math.atan2(axis[1], axis[0]), pitch: 0.04 }, { min: [l.x - r, l.y - r, l.z - r], max: [l.x + r, l.y + r, l.z + r] }, this.width, this.height), true);
  }

  /** Brings a point to the middle of the view, from the same direction and depth, so the camera then turns about it.
   * @param {number[]} p */
  orbitAround(p) { this.moveTo({ ...this.camera, target: [...p], distance: this.depthOf(p) }, true); }

  /** The shell's "Centre here": centre on the model point under a screen point. @param {number} x @param {number} y */
  centreOn(x, y) { this.orbitAround(this.pointUnder(x, y)); }

  /** Zooms about a screen point, which stays where it is; without one, about the target.
   * @param {number} factor @param {number} [x] @param {number} [y] */
  zoom(factor, x, y) {
    this.stop();
    const point = x !== undefined && y !== undefined && this.width ? this.pointUnder(x, y) : this.camera.target;
    this.camera = zoomAbout(this.camera, factor, point);
    this.request();
  }

  /** Turns the camera about a pivot (the target by default). @param {number} dx @param {number} dy @param {number[]} [pivot] */
  orbit(dx, dy, pivot = this.camera.target) {
    this.stop();
    this.camera = orbitAbout(this.camera, -dx * 0.008, dy * 0.008, pivot);
    this.request();
  }

  /** The shell's drag: turn about the target. @param {number} dx @param {number} dy */
  pan(dx, dy) { this.orbit(dx, dy); }

  /** Slides the camera across the screen so a point at depth follows the pointer. @param {number} dx @param {number} dy @param {number} [depth] */
  slide(dx, dy, depth) {
    this.stop();
    this.camera = slideBy(this.camera, dx, dy, this.height, depth);
    this.request();
  }

  // ---------- Picking ----------

  /** The lamp whose apparent surface is under a screen point, nearest first, leaving out lamps behind bodywork unless
   * the body is see-through. @param {number} x @param {number} y */
  lampAt(x, y) {
    if (!this.width || !this.lamps.length) return null;
    const { origin, dir } = this.ray(x, y);
    const body = this.xray ? null : this.surface?.(origin, dir) ?? null;
    const perPixel = 2 * Math.tan(HALF_FOV) / Math.max(1, this.height);
    const pad = (/** @type {number} */ t) => 5 * perPixel * (this.camera.ortho ? this.camera.distance : t);
    let best = null, bestT = Infinity;
    this.lamps.forEach((l, i) => {
      const t = lampHit(origin, dir, l, pad);
      if (t === null || t >= bestT) return;
      // A lamp sits on the body; the body hides it only when it is clearly nearer along the ray.
      if (body !== null && body < t - 40) return;
      bestT = t; best = i;
    });
    return best;
  }

  /** The view cube's geometry: its centre, half size and the faces that face the camera, each with its outline. */
  cube() {
    const { dir, side, up } = frame(this.camera.yaw, this.camera.pitch);
    const cx = this.width - 64, cy = 66, s = 25;
    /** @param {number[]} v */
    const at = v => [cx + dot(v, side) * s, cy - dot(v, up) * s];
    const faces = FACES.map(f => {
      const t2 = [f.n[1] * f.t[2] - f.n[2] * f.t[1], f.n[2] * f.t[0] - f.n[0] * f.t[2], f.n[0] * f.t[1] - f.n[1] * f.t[0]];
      const corner = (/** @type {number} */ a, /** @type {number} */ b) => at([0, 1, 2].map(k => f.n[k] + a * f.t[k] + b * t2[k]));
      return { ...f, facing: dot(f.n, dir), outline: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], centre: at(f.n) };
    }).filter(f => f.facing > 1e-3);
    return { cx, cy, s, faces };
  }

  /** The view cube face under a screen point, if it has a standard view. @param {number} x @param {number} y @returns {ViewPreset | null} */
  cubeAt(x, y) {
    if (this.plain || !this.width) return null;
    const face = this.cube().faces.find(f => f.id !== 'bottom' && inside(f.outline, x, y));
    return face ? /** @type {ViewPreset} */ (face.id) : null;
  }

  // ---------- Drawing ----------

  draw() {
    this.init();
    const gl = this.gl, P = this.programs;
    const m = this.matrix();
    const ctx = this.ctx, dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (!gl || !P) {
      ctx.fillStyle = '#0b0d11'; ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#c3cad6'; ctx.font = '13px Barlow, sans-serif'; ctx.fillText(this.unavailable ?? '', 20, 30);
      return;
    }
    gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
    gl.clearColor(0.06, 0.07, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    if (!this.xray) this.drawMesh(m, 1);
    // Ground grid, lamps and visibility fields as coloured lines and quads.
    /** @type {number[]} */
    const lines = [];
    /** @type {number[]} */
    const quads = [];
    const b = this.box();
    const pad = 1000, step = 500;
    const x0 = Math.floor((b.min[0] - pad) / step) * step, x1 = Math.ceil((b.max[0] + pad) / step) * step;
    const y0 = Math.floor((b.min[1] - pad) / step) * step, y1 = Math.ceil((b.max[1] + pad) / step) * step;
    for (let x = x0; x <= x1; x += step) lines.push(x, y0, 0, ...[0.6, 0.65, 0.75, x === 0 ? 0.5 : 0.14], x, y1, 0, ...[0.6, 0.65, 0.75, x === 0 ? 0.5 : 0.14]);
    for (let y = y0; y <= y1; y += step) lines.push(x0, y, 0, ...[0.6, 0.65, 0.75, y === 0 ? 0.5 : 0.14], x1, y, 0, ...[0.6, 0.65, 0.75, y === 0 ? 0.5 : 0.14]);
    this.lamps.forEach((l, i) => {
      const { axis } = frameOf(l);
      const c = COLOURS[this.status[i] ?? 'none'];
      const pts = lampCorners(l);
      const alpha = i === this.selected ? 0.95 : 0.75;
      for (const k of [0, 1, 2, 0, 2, 3]) quads.push(...pts[k], c[0], c[1], c[2], alpha);
      const edge = [c[0] * 0.6, c[1] * 0.6, c[2] * 0.6, 1];
      for (let k = 0; k < 4; k++) lines.push(...pts[k], ...edge, ...pts[(k + 1) % 4], ...edge);
      // The reference axis.
      const o = [l.x + axis[0] * 3, l.y + axis[1] * 3, l.z];
      lines.push(...o, c[0], c[1], c[2], 0.9, o[0] + axis[0] * 250, o[1] + axis[1] * 250, o[2], c[0], c[1], c[2], 0.9);
    });
    if (this.showFields && this.selected !== null && this.map && this.lamps[this.selected]) this.fieldLines(lines);
    gl.enable(gl.BLEND);
    // Blend colour by alpha but keep the picture opaque, so an exported image has no see-through pixels.
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.drawColoured(gl.TRIANGLES, quads, m);
    gl.depthMask(false);
    this.drawColoured(gl.LINES, lines, m);
    gl.depthMask(true);
    // See-through: the body last, translucent, so the lamps behind it show through and the ones before it do not dim.
    if (this.xray) { gl.depthMask(false); this.drawMesh(m, 0.24); gl.depthMask(true); }
    gl.disable(gl.BLEND);
    this.drawOverlay(m);
  }

  /** @param {number[]} m @param {number} alpha */
  drawMesh(m, alpha) {
    const gl = /** @type {WebGL2RenderingContext} */ (this.gl), P = /** @type {NonNullable<VehicleView['programs']>} */ (this.programs);
    if (!this.triangles || !P.meshVao) return;
    gl.useProgram(P.mesh);
    gl.uniformMatrix4fv(gl.getUniformLocation(P.mesh, 'mvp'), false, m);
    gl.uniform3fv(gl.getUniformLocation(P.mesh, 'eye'), eyeAt(this.camera));
    gl.uniform3fv(gl.getUniformLocation(P.mesh, 'base'), [0.55, 0.6, 0.68]);
    gl.uniform1f(gl.getUniformLocation(P.mesh, 'alpha'), alpha);
    gl.bindVertexArray(P.meshVao);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
    gl.drawArrays(gl.TRIANGLES, 0, this.triangles * 3);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindVertexArray(null);
  }

  /** The selected lamp's sight lines and the outline of its field. @param {number[]} lines */
  fieldLines(lines) {
    const l = this.lamps[/** @type {number} */ (this.selected)], { axis, across } = frameOf(l), map = /** @type {VisibilityMap} */ (this.map), f = map.field;
    const o = [l.x, l.y, l.z], R = 900;
    /** @param {number} beta @param {number} alpha */
    const dirOf = (beta, alpha) => {
      const a = (alpha * Math.PI) / 180, bb = (beta * Math.PI) / 180;
      return [Math.cos(a) * (Math.cos(bb) * axis[0] + Math.sin(bb) * across[0]), Math.cos(a) * (Math.cos(bb) * axis[1] + Math.sin(bb) * across[1]), Math.sin(a)];
    };
    for (const s of map.sights) {
      const d = dirOf(s.beta, s.alpha);
      const c = s.visible < 1 ? [1, 0.42, 0.42, 0.9] : [0.32, 0.81, 0.4, 0.28];
      lines.push(...o, ...c, o[0] + d[0] * R, o[1] + d[1] * R, o[2] + d[2] * R, ...c);
    }
    const ring = [];
    for (let beta = -f.in; beta <= f.out; beta += 2.5) ring.push([beta, f.up]);
    for (let alpha = f.up; alpha >= -f.down; alpha -= 2.5) ring.push([f.out, alpha]);
    for (let beta = f.out; beta >= -(f.inBelowH ?? f.in); beta -= 2.5) ring.push([beta, -f.down]);
    for (let alpha = -f.down; alpha <= f.up; alpha += 2.5) ring.push([alpha < 0 ? -(f.inBelowH ?? f.in) : -f.in, alpha]);
    for (let k = 0; k + 1 < ring.length; k++) {
      const a = dirOf(ring[k][0], ring[k][1]), d2 = dirOf(ring[k + 1][0], ring[k + 1][1]);
      lines.push(o[0] + a[0] * R, o[1] + a[1] * R, o[2] + a[2] * R, 0.95, 0.76, 0.19, 0.9, o[0] + d2[0] * R, o[1] + d2[1] * R, o[2] + d2[2] * R, 0.95, 0.76, 0.19, 0.9);
    }
  }

  /** The 2D layer: outlines, dimensions, guides, names, the view cube, the axes and the shell's drawing. @param {number[]} m */
  drawOverlay(m) {
    const ctx = this.ctx;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.font = '600 11px Barlow, sans-serif';
    /** Labels placed so far, as [x, y, width, height], so later ones keep clear of them. @type {number[][]} */
    const placed = [];
    /** Where a lamp's name goes: above its apparent surface, to the right, kept inside the view. @param {number} i */
    const nameOf = i => {
      const l = this.lamps[i], p = this.project([l.x, l.y, l.z + l.height / 2 + 10], m);
      if (!p) return null;
      const w = ctx.measureText(l.name).width, x = Math.max(4, Math.min(this.width - w - 4, p[0] + 6)), y = Math.max(16, p[1] - 4);
      return { x, y, rect: [x - 3, y - 13, w + 6, 17] };
    };
    const selected = this.selected !== null && this.lamps[this.selected] ? this.lamps[this.selected] : null;
    const selectedName = selected ? nameOf(/** @type {number} */ (this.selected)) : null;
    if (selectedName) placed.push(selectedName.rect);
    if (!this.plain) {
      if (this.hover !== null && this.hover !== this.selected && this.lamps[this.hover]) this.outline(this.lamps[this.hover], m, 'rgba(255, 255, 255, .75)', 1.5);
      if (selected) this.outline(selected, m, '#ffffff', 2.25);
      // Dimensions only once the lamp is big enough on screen for them to be read.
      if (this.showDims && selected && this.screenSize(selected, m) >= 12) for (const d of this.dims) this.dimension(d, m, placed);
      if (this.snap) this.guide(this.snap, m);
    }
    // Names over the lamps. A lamp behind bodywork keeps its name hidden, and a name that would cover another label is
    // left out, except the selected and hovered lamps'.
    this.lamps.forEach((l, i) => {
      if (i !== this.selected && i !== this.hover && (this.camera.scale < 0.12 || this.hidden(l, m))) return;
      const name = i === this.selected ? selectedName : nameOf(i);
      if (!name) return;
      if (i !== this.selected) {
        if (i !== this.hover && placed.some(r => overlaps(r, name.rect))) return;
        placed.push(name.rect);
      }
      ctx.font = '600 11px Barlow, sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = HALO; ctx.fillStyle = i === this.selected ? '#ffffff' : '#d6dce6';
      ctx.strokeText(l.name, name.x, name.y); ctx.fillText(l.name, name.x, name.y);
    });
    if (this.plain) return;
    if (this.pivot) {
      const p = this.project(this.pivot, m);
      if (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(111, 182, 207, .35)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      }
    }
    this.drawCube();
    this.drawAxes();
    this.overlay?.(ctx);
  }

  /** @param {PlacedLamp} l @param {number[]} m @param {string} colour @param {number} width */
  outline(l, m, colour, width) {
    const pts = lampCorners(l).map(p => this.project(p, m));
    if (pts.some(p => !p)) return;
    const ctx = this.ctx, q = /** @type {number[][]} */ (pts);
    ctx.beginPath(); q.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.lineWidth = width + 3; ctx.strokeStyle = HALO; ctx.stroke();
    ctx.lineWidth = width; ctx.strokeStyle = colour; ctx.stroke();
  }

  /** Whether bodywork hides a lamp's centre from the camera; never with a see-through body. @param {PlacedLamp} l @param {number[]} m */
  hidden(l, m) {
    if (this.xray || !this.surface) return false;
    const p = this.project([l.x, l.y, l.z], m);
    if (!p) return true;
    const { origin, dir } = rayThrough(m, p[0], p[1], this.width, this.height);
    const body = this.surface(origin, dir);
    const t = dot([l.x - origin[0], l.y - origin[1], l.z - origin[2]], dir);
    return body !== null && body < t - 40;
  }

  /** How large a lamp is on screen, across its diagonal, in pixels. @param {PlacedLamp} l @param {number[]} m */
  screenSize(l, m) {
    const c = lampCorners(l), a = this.project(c[0], m), b = this.project(c[2], m);
    return a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
  }

  /** A dimension line with its extension lines, end ticks and value. The value sits at the middle of the line, or
   * further along it to keep clear of other labels, or is left out. @param {Dimension} d @param {number[]} m @param {number[][]} placed */
  dimension(d, m, placed) {
    const ctx = this.ctx, colour = CSS[d.status];
    const a = this.project(d.a, m), b = this.project(d.b, m);
    if (!a || !b) return;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(214, 220, 230, .55)';
    for (const [p, q] of d.ext) {
      const s = this.project(p, m), t = this.project(q, m);
      if (s && t) { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); }
    }
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    ctx.strokeStyle = HALO; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = colour; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    if (len > 1) {
      // Ticks across each end, slanted as on a drawing.
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, k = 5;
      const tx = (ux - uy) * k * 0.7071, ty = (uy + ux) * k * 0.7071;
      ctx.lineWidth = 1.75;
      for (const p of [a, b]) { ctx.beginPath(); ctx.moveTo(p[0] - tx, p[1] - ty); ctx.lineTo(p[0] + tx, p[1] + ty); ctx.stroke(); }
    }
    ctx.font = '600 11px Barlow, sans-serif';
    const w = ctx.measureText(d.text).width + 12;
    for (const t of len > w * 0.6 ? [0.5, 0.3, 0.7] : []) {
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, rect = [x - w / 2, y - 9, w, 18];
      if (placed.some(r => overlaps(r, rect))) continue;
      placed.push(rect);
      pill(ctx, d.text, x, y, colour);
      break;
    }
    ctx.restore();
  }

  /** @param {SnapGuide} g @param {number[]} m */
  guide(g, m) {
    const a = this.project(g.a, m), b = this.project(g.b, m);
    if (!a || !b) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.25; ctx.strokeStyle = '#6fb6cf';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]);
    pill(ctx, g.text, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, '#6fb6cf');
    ctx.restore();
  }

  /** The view cube in the top right: it turns with the model and each face gives a standard view. */
  drawCube() {
    const ctx = this.ctx, { faces } = this.cube();
    ctx.save();
    ctx.font = '600 9.5px Barlow, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of faces.sort((p, q) => p.facing - q.facing)) {
      const hot = f.id === this.cubeHover;
      ctx.beginPath(); f.outline.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      const shade = 0.55 + 0.45 * f.facing;
      ctx.fillStyle = hot ? `rgba(29, 111, 139, ${0.75 + 0.2 * f.facing})` : `rgba(${Math.round(30 * shade + 10)}, ${Math.round(36 * shade + 10)}, ${Math.round(46 * shade + 12)}, .92)`;
      ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = hot ? 'rgba(147, 202, 221, .9)' : 'rgba(195, 202, 214, .38)'; ctx.stroke();
      if (f.facing > 0.32) {
        ctx.fillStyle = hot ? '#ffffff' : `rgba(214, 220, 230, ${Math.min(1, 0.25 + f.facing)})`;
        ctx.fillText(f.label, f.centre[0], f.centre[1] + 0.5);
      }
    }
    ctx.restore();
  }

  /** The axes in the bottom right: x forwards, y to the left, z up. */
  drawAxes() {
    const ctx = this.ctx, { side, up } = frame(this.camera.yaw, this.camera.pitch);
    const ox = this.width - 46, oy = this.height - 38, L = 20;
    ctx.save();
    ctx.font = '600 10px Barlow, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [v, name] of /** @type {[number[], string][]} */ ([[[1, 0, 0], 'x'], [[0, 1, 0], 'y'], [[0, 0, 1], 'z']])) {
      const ex = ox + dot(v, side) * L, ey = oy - dot(v, up) * L;
      ctx.strokeStyle = HALO; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = name === 'z' ? '#e3e8f2' : '#9aa6b9'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
      const lx = ox + dot(v, side) * (L + 8), ly = oy - dot(v, up) * (L + 8);
      ctx.fillStyle = '#c3cad6';
      ctx.fillText(name, lx, ly);
    }
    ctx.restore();
  }

  /** The view as one image: the 3D drawing with the 2D layer over it, as last drawn. */
  snapshot() {
    const c = document.createElement('canvas');
    c.width = this.glCanvas.width; c.height = this.glCanvas.height;
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    ctx.drawImage(this.glCanvas, 0, 0); ctx.drawImage(this.canvas, 0, 0);
    return c;
  }

  /** @param {number} mode @param {number[]} data x y z r g b a per vertex @param {number[]} m */
  drawColoured(mode, data, m) {
    const gl = this.gl, P = this.programs;
    if (!gl || !P || !data.length) return;
    gl.useProgram(P.line);
    gl.uniformMatrix4fv(gl.getUniformLocation(P.line, 'mvp'), false, m);
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STREAM_DRAW);
    const p = gl.getAttribLocation(P.line, 'p'), c = gl.getAttribLocation(P.line, 'c');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(c); gl.vertexAttribPointer(c, 4, gl.FLOAT, false, 28, 12);
    gl.drawArrays(mode, 0, data.length / 7);
    gl.bindVertexArray(null);
    gl.deleteBuffer(buf); gl.deleteVertexArray(vao);
  }
}

/** @param {OrbitCamera} c */
function eyeAt(c) {
  const { dir } = frame(c.yaw, c.pitch);
  return [c.target[0] + dir[0] * c.distance, c.target[1] + dir[1] * c.distance, c.target[2] + dir[2] * c.distance];
}

/** Whether two rectangles [x, y, width, height] overlap. @param {number[]} a @param {number[]} b */
function overlaps(a, b) { return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]; }

/** Whether a point is inside a convex polygon. @param {number[][]} poly @param {number} x @param {number} y */
function inside(poly, x, y) {
  let sign = 0;
  for (let k = 0; k < poly.length; k++) {
    const [ax, ay] = poly[k], [bx, by] = poly[(k + 1) % poly.length];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c !== 0) { if (sign && Math.sign(c) !== sign) return false; sign = Math.sign(c); }
  }
  return true;
}

/** A value in a dark pill centred on a point. @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} x @param {number} y @param {string} colour */
function pill(ctx, text, x, y, colour) {
  ctx.font = '600 11px Barlow, sans-serif';
  const w = ctx.measureText(text).width + 12, ht = 18;
  ctx.fillStyle = 'rgba(9, 13, 22, .9)';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - ht / 2, w, ht, 9); ctx.fill();
  ctx.fillStyle = colour;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
}

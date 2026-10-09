/** The vehicle in 3D: the model shaded in WebGL 2, the lamps as their apparent surfaces coloured by their result,
 * the selected lamp's field of geometric visibility, and a ground grid. Names and dimensions are drawn on a 2D
 * canvas laid over it, which also takes the pointer. Coordinates are the vehicle frame in millimetres: x forwards,
 * y to the left, z up. */

import { lampFrame as frameOf } from '../core/installation.js';

/** @import { PlacedLamp } from '../core/vehicle.js' */
/** @import { Bounds } from '../core/mesh/mesh.js' */
/** @import { VisibilityMap } from '../core/installation.js' */

/** @typedef {'pass' | 'near' | 'fail' | 'none'} LampStatus */
/** @typedef {'front' | 'rear' | 'left' | 'right' | 'top' | 'iso'} ViewPreset */

const COLOURS = { pass: [0.32, 0.81, 0.4], near: [0.95, 0.76, 0.19], fail: [1, 0.42, 0.42], none: [0.76, 0.79, 0.84] };

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
out vec4 colour;
void main() {
  vec3 n = normalize(cross(dFdx(wp), dFdy(wp)));
  vec3 v = normalize(eye - wp);
  if (dot(n, v) < 0.0) n = -n;
  vec3 key = normalize(vec3(0.35, 0.45, 0.82));
  float light = 0.32 + 0.5 * max(dot(n, key), 0.0) + 0.28 * max(dot(n, v), 0.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.18;
  colour = vec4(base * light + rim, 1.0);
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

/** @param {number[]} a @param {number[]} b column-major 4 × 4 */
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

/** @param {number[]} m @param {number[]} p @returns {number[]} [x, y, z, w] */
function apply(m, p) {
  return [0, 1, 2, 3].map(r => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
}

/** @param {number[]} a @param {number[]} b */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {number[]} a */
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export class VehicleView {
  /** @param {HTMLCanvasElement} overlay the 2D canvas that takes the pointer @param {HTMLCanvasElement} glCanvas */
  constructor(overlay, glCanvas) {
    this.canvas = overlay;
    this.glCanvas = glCanvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (overlay.getContext('2d'));
    /** @type {WebGL2RenderingContext | null} */
    this.gl = null;
    this.width = 0; this.height = 0;
    /** Orbit camera about a target; scale is pixels per millimetre at the target, for the zoom read-out. */
    this.camera = { target: [-2000, 0, 700], yaw: -0.6, pitch: 0.35, distance: 9000, ortho: false, scale: 1 };
    /** @type {Bounds | null} */
    this.bounds = null;
    this.triangles = 0;
    /** @type {PlacedLamp[]} */
    this.lamps = [];
    /** @type {LampStatus[]} */
    this.status = [];
    /** @type {number | null} */
    this.selected = null;
    /** @type {VisibilityMap | null} the selected lamp's visibility */
    this.map = null;
    this.showFields = true;
    this.active = false;
    this.raf = 0;
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

  /** The camera's eye position and basis. */
  eye() {
    const c = this.camera;
    const dir = [Math.cos(c.pitch) * Math.cos(c.yaw), Math.cos(c.pitch) * Math.sin(c.yaw), Math.sin(c.pitch)];
    return { eye: [c.target[0] + dir[0] * c.distance, c.target[1] + dir[1] * c.distance, c.target[2] + dir[2] * c.distance], dir };
  }

  /** The view-projection matrix (column-major) for the current camera. */
  matrix() {
    const c = this.camera, { eye } = this.eye();
    const f = norm([c.target[0] - eye[0], c.target[1] - eye[1], c.target[2] - eye[2]]);
    const up0 = Math.abs(f[2]) > 0.999 ? [1, 0, 0] : [0, 0, 1];
    const s = norm(cross(f, up0)), u = cross(s, f);
    const view = [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0,
      -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]), -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]), f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2], 1];
    const aspect = Math.max(1e-6, this.width / Math.max(1, this.height));
    const near = Math.max(10, c.distance / 200), far = c.distance * 20 + 50000;
    let proj;
    if (c.ortho) {
      const hh = c.distance * Math.tan(0.35), hw = hh * aspect;
      proj = [1 / hw, 0, 0, 0, 0, 1 / hh, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1];
    } else {
      const t = 1 / Math.tan(0.35);
      proj = [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
    }
    c.scale = this.height / (2 * c.distance * Math.tan(0.35));
    return mul(proj, view);
  }

  /** Screen position of a vehicle point, or null behind the camera. @param {number[]} p @param {number[]} [m] */
  project(p, m = this.matrix()) {
    const q = apply(m, p);
    if (q[3] <= 0) return null;
    return [(q[0] / q[3] * 0.5 + 0.5) * this.width, (0.5 - q[1] / q[3] * 0.5) * this.height];
  }

  /** The ray through a screen point, in the vehicle frame. @param {number} x @param {number} y */
  ray(x, y) {
    const m = this.matrix();
    const inv = invert(m);
    const nx = (x / this.width) * 2 - 1, ny = 1 - (y / this.height) * 2;
    const a = apply(inv, [nx, ny, -1]), b = apply(inv, [nx, ny, 1]);
    const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
    return { origin: /** @type {[number, number, number]} */ (p0), dir: /** @type {[number, number, number]} */ (norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]])) };
  }

  fit() {
    const b = this.bounds ?? { min: [-4500, -900, 0], max: [0, 900, 1500] };
    this.camera.target = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
    this.camera.distance = Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) * 1.5;
    // Bring the camera in until the box's corners fill 92% of the view in its tighter direction.
    const corners = [];
    for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) corners.push([x, y, z]);
    for (let k = 0; k < 4 && this.width > 0; k++) {
      const m = this.matrix();
      let extent = 0;
      for (const c of corners) { const q = apply(m, c); if (q[3] > 0) extent = Math.max(extent, Math.abs(q[0] / q[3]), Math.abs(q[1] / q[3])); }
      if (extent > 0) this.camera.distance *= extent / 0.92;
    }
    this.request();
  }

  /** @param {ViewPreset} preset */
  preset(preset) {
    const angles = { front: [0, 0.02], rear: [Math.PI, 0.02], left: [Math.PI / 2, 0.02], right: [-Math.PI / 2, 0.02], top: [-Math.PI / 2, Math.PI / 2 - 0.001], iso: [-0.6, 0.35] };
    [this.camera.yaw, this.camera.pitch] = angles[preset];
    this.fit();
  }

  /** @param {number} factor */
  zoom(factor) { this.camera.distance = Math.max(200, Math.min(200000, this.camera.distance / factor)); this.request(); }

  /** Turns the camera about its target. @param {number} dx @param {number} dy */
  pan(dx, dy) {
    this.camera.yaw -= dx * 0.008;
    this.camera.pitch = Math.max(-1.45, Math.min(1.5, this.camera.pitch + dy * 0.008));
    this.request();
  }

  /** Slides the camera and its target across the screen. @param {number} dx @param {number} dy */
  slide(dx, dy) {
    const { dir } = this.eye();
    const right = norm(cross([0, 0, 1], dir)), up = cross(dir, right);
    const k = this.camera.distance * 2 * Math.tan(0.35) / Math.max(1, this.height);
    for (let a = 0; a < 3; a++) this.camera.target[a] += (dx * right[a] - dy * up[a]) * -k;
    this.request();
  }

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
    const { eye } = this.eye();
    if (this.triangles && P.meshVao) {
      gl.useProgram(P.mesh);
      gl.uniformMatrix4fv(gl.getUniformLocation(P.mesh, 'mvp'), false, m);
      gl.uniform3fv(gl.getUniformLocation(P.mesh, 'eye'), eye);
      gl.uniform3fv(gl.getUniformLocation(P.mesh, 'base'), [0.55, 0.6, 0.68]);
      gl.bindVertexArray(P.meshVao);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
      gl.drawArrays(gl.TRIANGLES, 0, this.triangles * 3);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindVertexArray(null);
    }
    // Ground grid, lamps and visibility fields as coloured lines and quads.
    /** @type {number[]} */
    const lines = [];
    /** @type {number[]} */
    const quads = [];
    const b = this.bounds ?? { min: [-4500, -900, 0], max: [0, 900, 1500] };
    const pad = 1000, step = 500;
    const x0 = Math.floor((b.min[0] - pad) / step) * step, x1 = Math.ceil((b.max[0] + pad) / step) * step;
    const y0 = Math.floor((b.min[1] - pad) / step) * step, y1 = Math.ceil((b.max[1] + pad) / step) * step;
    for (let x = x0; x <= x1; x += step) lines.push(x, y0, 0, ...[0.6, 0.65, 0.75, x === 0 ? 0.5 : 0.14], x, y1, 0, ...[0.6, 0.65, 0.75, x === 0 ? 0.5 : 0.14]);
    for (let y = y0; y <= y1; y += step) lines.push(x0, y, 0, ...[0.6, 0.65, 0.75, y === 0 ? 0.5 : 0.14], x1, y, 0, ...[0.6, 0.65, 0.75, y === 0 ? 0.5 : 0.14]);
    this.lamps.forEach((l, i) => {
      const { axis, across } = frameOf(l);
      const c = COLOURS[this.status[i] ?? 'none'];
      const o = [l.x + axis[0] * 3, l.y + axis[1] * 3, l.z];
      const corner = (/** @type {number} */ u, /** @type {number} */ w) => [o[0] + u * across[0], o[1] + u * across[1], o[2] + w];
      const pts = [corner(-l.width / 2, -l.height / 2), corner(l.width / 2, -l.height / 2), corner(l.width / 2, l.height / 2), corner(-l.width / 2, l.height / 2)];
      const alpha = i === this.selected ? 0.95 : 0.75;
      for (const k of [0, 1, 2, 0, 2, 3]) quads.push(...pts[k], c[0], c[1], c[2], alpha);
      const edge = i === this.selected ? [1, 1, 1, 1] : [c[0] * 0.6, c[1] * 0.6, c[2] * 0.6, 1];
      for (let k = 0; k < 4; k++) lines.push(...pts[k], ...edge, ...pts[(k + 1) % 4], ...edge);
      // The reference axis.
      lines.push(...o, c[0], c[1], c[2], 0.9, o[0] + axis[0] * 250, o[1] + axis[1] * 250, o[2], c[0], c[1], c[2], 0.9);
    });
    if (this.showFields && this.selected !== null && this.map && this.lamps[this.selected]) {
      const l = this.lamps[this.selected], { axis, across } = frameOf(l), f = this.map.field;
      const o = [l.x, l.y, l.z], R = 900;
      /** @param {number} beta @param {number} alpha */
      const dirOf = (beta, alpha) => {
        const a = (alpha * Math.PI) / 180, bb = (beta * Math.PI) / 180;
        return [Math.cos(a) * (Math.cos(bb) * axis[0] + Math.sin(bb) * across[0]), Math.cos(a) * (Math.cos(bb) * axis[1] + Math.sin(bb) * across[1]), Math.sin(a)];
      };
      for (const s of this.map.sights) {
        const d = dirOf(s.beta, s.alpha);
        const blocked = s.visible < 1;
        const c = blocked ? [1, 0.42, 0.42, 0.9] : [0.32, 0.81, 0.4, 0.28];
        lines.push(...o, ...c, o[0] + d[0] * R, o[1] + d[1] * R, o[2] + d[2] * R, ...c);
      }
      // The field's outline.
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
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.drawColoured(gl.TRIANGLES, quads, m);
    gl.depthMask(false);
    this.drawColoured(gl.LINES, lines, m);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    // Names over the lamps.
    ctx.font = '600 11px Barlow, sans-serif';
    ctx.lineJoin = 'round';
    this.lamps.forEach((l, i) => {
      if (i !== this.selected && this.camera.scale < 0.12) return;
      const p = this.project([l.x, l.y, l.z + l.height / 2 + 10], m);
      if (!p) return;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(11, 13, 17, .85)'; ctx.fillStyle = i === this.selected ? '#ffffff' : '#d6dce6';
      ctx.strokeText(l.name, p[0] + 6, p[1] - 4); ctx.fillText(l.name, p[0] + 6, p[1] - 4);
    });
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

  /** The lamp nearest a screen point, within reach. @param {number} x @param {number} y */
  lampAt(x, y) {
    const m = this.matrix();
    let best = null, bestD = 14;
    this.lamps.forEach((l, i) => {
      const p = this.project([l.x, l.y, l.z], m);
      if (!p) return;
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
}

/** The inverse of a column-major 4 × 4 matrix. @param {number[]} m */
function invert(m) {
  const inv = new Array(16);
  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  return inv.map(x => x / det);
}

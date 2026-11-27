import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Merge a static group's meshes by material: thousands of draw calls -> a few hundred.
export function bake(group) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const byMat = new Map();
  group.traverse((m) => {
    if (!m.isMesh) return;
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(m);
  });
  for (const [material, meshes] of byMat) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    });
    const merged = new THREE.Mesh(mergeGeometries(geos), material);
    merged.castShadow = meshes.some((m) => m.castShadow);
    merged.receiveShadow = true;
    meshes.forEach((m) => m.parent.remove(m));
    group.add(merged);
  }
  return group;
}

// ---------- tiny animation system (driven by main loop) ----------
const anims = [];
export function anim(dur, fn, ease = easeOutCubic) {
  return new Promise((res) => anims.push({ t: 0, dur, fn, ease, res }));
}
export function tickAnims(dt) {
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    a.fn(a.ease(k), k);
    if (k >= 1) { anims.splice(i, 1); a.res(); }
  }
}
export const wait = (s) => anim(s, () => {});

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInCubic = (t) => t * t * t;
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeOutElastic = (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1);
export const linear = (t) => t;

// ---------- materials ----------
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    const { roughness, metalness = 0, envMapIntensity, ...rest } = opts;
    matCache.set(key, metalness > .3
      ? new THREE.MeshStandardMaterial({ color, roughness: roughness ?? .5, metalness, flatShading: true, ...rest })
      : new THREE.MeshLambertMaterial({ color, flatShading: true, ...rest }));
  }
  return matCache.get(key);
}

export function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'object' ? color : mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, seg, color, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'object' ? color : mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function sphere(r, color, detail = 1, opts) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), typeof color === 'object' ? color : mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

// ---------- canvas text textures (signs) ----------
export function signTexture(text, { w = 512, h = 128, bg = '#c0392b', fg = '#fff8e1', font = 800, size = 70, border = '#fff8e1', sub = '' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); }
  g.fillStyle = fg;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let s = size;
  g.font = `${font} ${s}px "Baloo 2", sans-serif`;
  while (g.measureText(text).width > w - 50 && s > 12) { s -= 2; g.font = `${font} ${s}px "Baloo 2", sans-serif`; }
  g.fillText(text, w / 2, sub ? h * .4 : h / 2 + s * .06);
  if (sub) { g.font = `600 ${Math.round(h * .2)}px "Baloo 2", sans-serif`; g.fillText(sub, w / 2, h * .76); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function signMesh(text, w, h, opts) {
  const tex = signTexture(text, { w: 512, h: Math.round(512 * h / w), ...opts });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: opts?.glow ?? .25 }));
  return m;
}

// ---------- misc ----------
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export function weighted(entries) { // [[key, weight], ...]
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[entries.length - 1][0];
}

export function fmtMoney(n) {
  n = Math.round(n);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' tỷ';
  if (Math.abs(n) >= 1e7) return (n / 1e6).toFixed(1).replace('.', ',') + ' triệu';
  return n.toLocaleString('de-DE') + 'đ';
}

export function fmtEta(seconds, secPerYear) {
  const years = seconds / secPerYear;
  if (years >= 1) return `${Math.round(years)} năm`;
  const days = years * 365;
  if (days >= 30) return `${Math.round(days / 30)} tháng`;
  if (days >= 1) return `${Math.max(1, Math.round(days))} ngày`;
  return `${Math.max(1, Math.round(days * 24))} giờ`;
}

export const $ = (s) => document.querySelector(s);
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

import * as THREE from 'three';
import { mat, rand, pick, el } from './util.js';
import { world } from './world.js';

const parts = [];
const pool = [];
const geoCube = new THREE.BoxGeometry(1, 1, 1);
const geoPlane = new THREE.PlaneGeometry(1, .6);
const geoSphere = new THREE.IcosahedronGeometry(.5, 0);
const glowMats = {};
function glowMat(c) { return glowMats[c] || (glowMats[c] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); }
const paperMats = {};
function paperMat(c) { return paperMats[c] || (paperMats[c] = new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); }

function spawn(geo, material, pos, o) {
  let m = pool.pop();
  if (!m) { m = new THREE.Mesh(geo, material); }
  m.geometry = geo; m.material = material;
  m.position.copy(pos);
  m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
  m.visible = true;
  world.scene.add(m);
  parts.push({ m, life: o.life, max: o.life, vel: o.vel, g: o.g ?? 9, drag: o.drag ?? 1, s0: o.s0, s1: o.s1 ?? 0, spin: o.spin ?? 4, flutter: o.flutter || 0 });
}

export function updateFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { world.scene.remove(p.m); pool.push(p.m); parts.splice(i, 1); continue; }
    p.vel.y -= p.g * dt;
    p.vel.multiplyScalar(Math.exp(-p.drag * dt));
    if (p.flutter) { p.vel.x += Math.sin(p.life * 9 + i) * p.flutter * dt; }
    p.m.position.addScaledVector(p.vel, dt);
    if (p.m.position.y < .05) { p.m.position.y = .05; p.vel.y *= -.3; p.vel.x *= .6; p.vel.z *= .6; }
    p.m.rotation.x += p.spin * dt; p.m.rotation.y += p.spin * .7 * dt;
    const k = 1 - p.life / p.max;
    p.m.scale.setScalar(p.s0 + (p.s1 - p.s0) * k);
  }
  updateFloats(dt);
  updateShake(dt);
}

export function puff(pos, color = '#d9c8b4', n = 6, size = .35) {
  const m = mat(color);
  for (let i = 0; i < n; i++) {
    spawn(geoSphere, m, pos, { life: rand(.35, .6), vel: new THREE.Vector3(rand(-1.5, 1.5), rand(.6, 2), rand(-1.5, 1.5)), g: -.5, drag: 4, s0: size * rand(.6, 1.2), s1: 0, spin: 2 });
  }
}

export function sparkle(pos, color = '#ffe27a', n = 10) {
  for (let i = 0; i < n; i++) {
    spawn(geoCube, glowMat(color), pos, { life: rand(.4, .7), vel: new THREE.Vector3(rand(-3, 3), rand(2, 5), rand(-3, 3)), g: 9, drag: 2, s0: .14, s1: 0, spin: 10 });
  }
}

const CONFETTI = ['#e2433a', '#ffc94d', '#ff6b5b', '#fff1c4', '#ff9f1c'];
export function confetti(pos, n = 80, spread = 6) {
  for (let i = 0; i < n; i++) {
    const p = pos.clone().add(new THREE.Vector3(rand(-spread, spread) * .3, rand(0, 2), rand(-spread, spread) * .3));
    spawn(geoPlane, paperMat(pick(CONFETTI)), p, { life: rand(2.5, 4), vel: new THREE.Vector3(rand(-spread, spread), rand(6, 13), rand(-spread, spread)), g: 6, drag: 1.6, s0: .32, s1: .25, spin: 8, flutter: 14 });
  }
}

// pháo hoa: rocket + glowing burst (bloom does the rest)
export function firework(pos, color = pick(['#ffd36e', '#ff6b5b', '#7ee0ff', '#c56cf0', '#b8ff7a'])) {
  const start = pos.clone();
  const peak = start.clone().add(new THREE.Vector3(rand(-3, 3), rand(12, 17), rand(-3, 3)));
  spawn(geoCube, glowMat('#fff2c0'), start, { life: .7, vel: peak.clone().sub(start).multiplyScalar(1 / .7).add(new THREE.Vector3(0, 9 * .35, 0)), g: 9, drag: 0, s0: .25, s1: .1, spin: 0 });
  setTimeout(() => {
    for (let i = 0; i < 46; i++) {
      const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(7, 10));
      spawn(geoCube, glowMat(color), peak, { life: rand(1, 1.6), vel: dir, g: 3, drag: 1.8, s0: .28, s1: 0, spin: 6 });
    }
    world.onFireworkPop?.(peak);
  }, 700);
}

export function exhaust(pos) {
  spawn(geoSphere, mat('#bdb6ae'), pos, { life: .5, vel: new THREE.Vector3(rand(-.3, .3), rand(.4, .8), rand(-.3, .3)), g: -1, drag: 2, s0: .12, s1: .4, spin: 1 });
}

// rain: big instanced streak field following the camera
let rain;
export function initRain(scene) {
  const N = 1400;
  const geo = new THREE.BoxGeometry(.03, .7, .03);
  rain = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: .45 }), N);
  rain.frustumCulled = false;
  rain.userData.p = Array.from({ length: N }, () => new THREE.Vector3(rand(-30, 30), rand(0, 12), rand(-22, 16)));
  rain.visible = false;
  scene.add(rain);
}
const dummy = new THREE.Object3D();
export function updateRain(dt, center, on) {
  rain.visible = on > .01;
  if (!rain.visible) return;
  rain.material.opacity = .45 * on;
  const ps = rain.userData.p;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    p.y -= dt * 26; p.x -= dt * 3;
    if (p.y < 0) { p.y += 12; p.x = rand(-30, 30); p.z = rand(-22, 16); } // stay below the camera
    dummy.position.set(center.x + p.x, p.y, center.z + p.z);
    dummy.rotation.z = .12;
    dummy.updateMatrix();
    rain.setMatrixAt(i, dummy.matrix);
  }
  rain.instanceMatrix.needsUpdate = true;
}

// ---------- DOM floating text ----------
const floats = [];
const v3 = new THREE.Vector3();
export function floatText(worldPos, text, cls = '') {
  const d = el('div', 'float-txt ' + cls, text);
  document.body.appendChild(d);
  floats.push({ d, p: worldPos.clone(), t: 0 });
}
function updateFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    v3.copy(f.p); v3.y += 1.8 + f.t * 1.6;
    v3.project(world.camera);
    const x = (v3.x * .5 + .5) * innerWidth, y = (-v3.y * .5 + .5) * innerHeight;
    const k = f.t / 1.1;
    f.d.style.opacity = k < .7 ? 1 : 1 - (k - .7) / .3;
    f.d.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${f.t < .15 ? .6 + f.t / .15 * .5 : 1.1 - Math.min(.1, (f.t - .15))})`;
    if (k >= 1) { f.d.remove(); floats.splice(i, 1); }
  }
}

export function worldToScreen(p) {
  v3.copy(p).project(world.camera);
  return { x: (v3.x * .5 + .5) * innerWidth, y: (-v3.y * .5 + .5) * innerHeight };
}

// coins / polymer notes flying to an element
export function flyToEl(from, target, n = 8, kind = 'coin', onEach) {
  const r = target.getBoundingClientRect();
  const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const c = el('div', kind === 'note' ? 'note-fly' : 'coin-fly');
    document.body.appendChild(c);
    const sx = from.x + rand(-40, 40), sy = from.y + rand(-30, 30);
    const mx = sx + rand(-120, 120), my = sy - rand(60, 160);
    const delay = i * 55, dur = 650 + rand(0, 200);
    const t0 = performance.now() + delay;
    c.style.left = sx + 'px'; c.style.top = sy + 'px'; c.style.opacity = 0;
    const step = (now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / dur));
      if (now >= t0) c.style.opacity = 1;
      const a = 1 - k, e = k * k;
      const x = a * a * sx + 2 * a * k * mx + e * tx, y = a * a * sy + 2 * a * k * my + e * ty;
      c.style.left = x - 11 + 'px'; c.style.top = y - 11 + 'px';
      c.style.transform = `rotate(${k * 540}deg) scale(${1 - k * .4})`;
      if (k < 1) requestAnimationFrame(step); else { c.remove(); onEach?.(i); }
    };
    requestAnimationFrame(step);
  }
}

// ---------- camera shake ----------
let shakeAmt = 0;
export const shakeOffset = new THREE.Vector3();
export function shake(a) { shakeAmt = Math.max(shakeAmt, a); }
function updateShake(dt) {
  shakeAmt = Math.max(0, shakeAmt - dt * 2.2);
  shakeOffset.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shakeAmt * shakeAmt);
}

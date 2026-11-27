import * as THREE from 'three';
import { box, cyl, mat, rand, pick, weighted, anim, easeOutBack, easeInCubic } from './util.js';
import { world } from './world.js';
import { ITEM_TYPES } from './state.js';

const ZONES = [
  { x0: -44, x1: 58, z0: -7.1, z1: -4.6, w: 3 },
  { x0: -44, x1: 58, z0: 4.6, z1: 8.6, w: 3 },
  { x0: -44, x1: 58, z0: -3.6, z1: -2.9, w: 1 },
  { x0: -44, x1: 58, z0: 2.9, z1: 3.6, w: 1 },
  { x0: 8, x1: 12, z0: -37, z1: -9, w: 1.6 },
];

const shadowGeo = new THREE.CircleGeometry(.32, 10);
const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .22, depthWrite: false });
let glintTex;
function glintTexture() {
  if (glintTex) return glintTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.25, 'rgba(255,240,200,.6)'); grd.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(32, 0); g.lineTo(35, 29); g.lineTo(64, 32); g.lineTo(35, 35); g.lineTo(32, 64); g.lineTo(29, 35); g.lineTo(0, 32); g.lineTo(29, 29); g.fill();
  glintTex = new THREE.CanvasTexture(c);
  return glintTex;
}

export function makeItemMesh(type) {
  const g = new THREE.Group();
  if (type === 'plastic') {
    const b = cyl(.11, .11, .42, 8, mat('#9fd8f5', { roughness: .2, metalness: .1, transparent: true, opacity: .85 })); g.add(b);
    const neck = cyl(.05, .1, .1, 8, mat('#9fd8f5', { roughness: .2, transparent: true, opacity: .85 })); neck.position.y = .26; g.add(neck);
    const cap = cyl(.05, .05, .06, 8, pick(['#2e86de', '#e2433a', '#27ae60'])); cap.position.y = .34; g.add(cap);
    const label = cyl(.115, .115, .14, 8, pick(['#e2433a', '#ffffff', '#27ae60'])); label.position.y = -.02; g.add(label);
    g.rotation.z = Math.PI / 2;
  } else if (type === 'can') {
    const col = pick(['#2f8f46', '#d63031', '#f1c40f', '#c0c6cc', '#1f6fb2']);
    const c = cyl(.13, .13, .34, 10, mat(col, { metalness: .65, roughness: .3 })); g.add(c);
    const top = cyl(.12, .13, .03, 10, mat('#dfe4e8', { metalness: .9, roughness: .25 })); top.position.y = .18; g.add(top);
    if (Math.random() < .5) { g.scale.y = .55; g.rotation.x = .3; } else g.rotation.z = Math.PI / 2;
  } else if (type === 'paper') {
    const b = box(.55, .34, .42, '#c49a6c'); g.add(b);
    const tape = box(.56, .02, .1, '#e8d8b8'); tape.position.y = .18; g.add(tape);
    const flap = box(.27, .02, .4, '#b88c5c'); flap.position.set(-.14, .2, 0); flap.rotation.z = .5; g.add(flap);
    g.rotation.y = rand(0, 3);
  } else { // metal scrap
    const m = mat('#7a848f', { metalness: .75, roughness: .35 });
    const pipe = new THREE.Mesh(new THREE.TorusGeometry(.22, .05, 5, 8, Math.PI * 1.2), m); pipe.castShadow = true; g.add(pipe);
    const gear = cyl(.14, .14, .07, 8, mat('#9aa3ab', { metalness: .8, roughness: .3 })); gear.position.set(.12, -.05, .05); gear.rotation.x = Math.PI / 2; g.add(gear);
    const rust = box(.18, .05, .12, '#a0522d'); rust.position.set(-.1, -.12, 0); g.add(rust);
  }
  return g;
}

export const items = {
  list: [],
  max: 30,
  timer: 0,
  scene: null,

  init(scene) {
    this.scene = scene;
    for (let i = 0; i < this.max; i++) this.spawn(true);
  },

  spawn(instant = false) {
    let x, z, tries = 0;
    do {
      const zn = weighted(ZONES.map((zz) => [zz, zz.w * (zz.x1 - zz.x0)]));
      x = rand(zn.x0, zn.x1); z = rand(zn.z0, zn.z1); tries++;
    } while (tries < 20 && (world.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + .5) || this.list.some((it) => it.pos.distanceTo(new THREE.Vector3(x, 0, z)) < 1.2) || (x < -28 && z < -4)));
    const type = weighted(Object.entries(ITEM_TYPES).map(([k, v]) => [k, v.weight]));
    const root = new THREE.Group();
    const bob = new THREE.Group(); root.add(bob);
    const mesh = makeItemMesh(type); bob.add(mesh);
    mesh.traverse((m) => { m.castShadow = false; });
    const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = .18; root.add(sh);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTexture(), color: '#fff6d8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    glint.scale.setScalar(.8); glint.position.set(.1, .55, .1); root.add(glint);
    root.position.set(x, 0, z);
    this.scene.add(root);
    const it = { type, root, bob, mesh, glint, pos: root.position, t: rand(0, 6), wet: false, claimed: null, flying: false };
    this.list.push(it);
    if (!instant) { root.scale.setScalar(0); anim(.5, (e) => root.scale.setScalar(e), easeOutBack); }
    return it;
  },

  update(dt, t, raining) {
    for (const it of this.list) {
      it.t += dt;
      it.bob.position.y = .42 + Math.sin(it.t * 2.4) * .08;
      it.bob.rotation.y += dt * .8;
      const gp = (it.t * .45) % 3;
      it.glint.material.opacity = gp < .35 ? Math.sin(gp / .35 * Math.PI) : 0;
      it.glint.material.rotation = it.t;
      if (raining && it.type === 'paper' && !it.wet) {
        it.wet = true;
        it.mesh.traverse((m) => { if (m.isMesh) m.material = mat('#7d5c3c'); });
      }
    }
    this.timer -= dt;
    if (this.timer <= 0 && this.list.length < this.max) { this.timer = 1.1; this.spawn(); }
  },

  // magnet attraction + pickup; returns picked items
  attract(dt, pos, radius, canTake) {
    const picked = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const it = this.list[i];
      if (it.claimed) continue;
      const dx = pos.x - it.pos.x, dz = pos.z - it.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < radius && canTake()) {
        if (d < .75) { this.list.splice(i, 1); picked.push(it); continue; }
        const pull = Math.min(1, dt * (6 + 10 / Math.max(d, .3)));
        it.pos.x += dx * pull; it.pos.z += dz * pull;
      }
    }
    return picked;
  },

  // fly item into the carrier, then dispose
  flyTo(it, getTarget, dur = .32) {
    const start = it.pos.clone();
    return anim(dur, (e) => {
      const tgt = getTarget();
      it.pos.lerpVectors(start, tgt, e);
      it.pos.y = Math.sin(e * Math.PI) * 1.2 + e * (tgt.y - start.y);
      it.root.scale.setScalar(1 - e * .7);
    }, easeInCubic).then(() => this.dispose(it));
  },

  dispose(it) {
    this.scene.remove(it.root);
    it.glint.material.dispose();
  },

  nearestFree(pos) {
    let best = null, bd = 1e9;
    for (const it of this.list) {
      if (it.claimed) continue;
      const d = it.pos.distanceToSquared(pos);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  },

  take(it) {
    const i = this.list.indexOf(it);
    if (i >= 0) this.list.splice(i, 1);
  },

  clearAll() { for (const it of this.list) this.dispose(it); this.list.length = 0; },
};

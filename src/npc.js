import * as THREE from 'three';
import { pick, rand, anim, easeOutBack } from './util.js';
import { world, LAYOUT } from './world.js';
import { makePerson, animateWalk, poseSit } from './people.js';
import { buildVehicle } from './player.js';
import { items } from './items.js';
import { puff } from './fx.js';
import { GOODS } from './state.js';

const NAMES_F = ['Cô Ba', 'Bà Tư', 'Bà Hai', 'Dì Năm', 'Cô Út'];
const NAMES_M = ['Ông Sáu', 'Chú Bảy', 'Ông Tám', 'Chú Chín'];

function region(p) {
  if (p.x > 7.6 && p.x < 12.4 && p.z < -7.5) return 'alley';
  if (p.x < -28.5 && p.z < -7.5) return 'lot';
  return 'street';
}
// each side region has an inner point (inside it) and an outer point (on the street) at its mouth
const MOUTH = {
  alley: [new THREE.Vector3(LAYOUT.alleyX, 0, -8.5), new THREE.Vector3(LAYOUT.alleyX, 0, -5.5)],
  lot: [new THREE.Vector3(-37, 0, -8.5), new THREE.Vector3(-37, 0, -5.5)],
};

function stepToward(obj, target, speed, dt) {
  const dx = target.x - obj.position.x, dz = target.z - obj.position.z;
  const d = Math.hypot(dx, dz);
  if (d < .05) return true;
  const s = Math.min(d, speed * dt);
  obj.position.x += dx / d * s; obj.position.z += dz / d * s;
  const h = Math.atan2(dx, dz);
  let dh = h - obj.rotation.y; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  obj.rotation.y += dh * Math.min(1, dt * 10);
  return d < .3;
}

// route through region mouths so NPCs never cut through houses
function makePath(from, to) {
  const a = region(from), b = region(to);
  if (a === b) return [to];
  const path = [];
  if (a !== 'street') path.push(MOUTH[a][0], MOUTH[a][1]);
  if (b !== 'street') path.push(MOUTH[b][1], MOUTH[b][0]);
  path.push(to);
  return path;
}
// walk along h.path; true once the final point is reached
function followPath(obj, path, speed, dt) {
  if (stepToward(obj, path[0], speed, dt)) path.shift();
  return path.length === 0;
}

// ---------- neighbours (phase 2: they bring stuff out when you run the loa) ----------
export const neighbours = {
  list: [],
  timer: 2,
  scene: null,
  init(scene) { this.scene = scene; },

  update(dt, t, loaOn, loaRadius, playerPos, interval) {
    if (loaOn) {
      this.timer -= dt;
      if (this.timer <= 0 && this.list.filter((n) => n.state !== 'leave').length < 3) {
        this.timer = interval * rand(.7, 1.3);
        const used = new Set(this.list.map((n) => n.door));
        const doors = world.doors.filter((d) => d.pos.distanceTo(playerPos) < loaRadius && d.pos.distanceTo(playerPos) > 4 && !used.has(d));
        if (doors.length) this.spawn(pick(doors));
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const n = this.list[i];
      n.t += dt;
      if (n.state === 'out') {
        const done = stepToward(n.rig.group, n.stand, 2.2, dt);
        animateWalk(n.rig, dt, done ? 0 : 2.2);
        if (done) { n.state = 'wait'; n.rig.group.rotation.y = Math.atan2(n.door.look.x, n.door.look.z); }
      } else if (n.state === 'wait') {
        animateWalk(n.rig, dt, 0);
        n.rig.armR.rotation.x = -2.6 + Math.sin(t * 6) * .4; // waving
        n.bundle.position.y = 1.0 + Math.sin(t * 3) * .05;
        if (n.t > 45) this.leave(n);
      } else if (n.state === 'leave') {
        const done = stepToward(n.rig.group, n.door.pos, 2.2, dt);
        animateWalk(n.rig, dt, 2.2);
        if (done) {
          anim(.3, (e) => n.rig.group.scale.setScalar(1 - e)).then(() => this.scene.remove(n.rig.group));
          this.list.splice(i, 1);
        }
      }
    }
  },

  spawn(door) {
    const female = Math.random() < .6;
    const rig = makePerson({ female, hat: Math.random() < .3 ? 'nonla' : 'none' });
    rig.group.position.copy(door.pos);
    const good = pick(GOODS);
    const bundle = new THREE.Group();
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 0), new THREE.MeshLambertMaterial({ color: pick(['#c49a6c', '#3a86d4', '#e2433a', '#9aa3ab']), flatShading: true }));
    b.castShadow = true; bundle.add(b);
    bundle.position.set(-.45, 1.0, .1);
    rig.group.add(bundle);
    this.scene.add(rig.group);
    rig.group.scale.setScalar(0); anim(.4, (e) => rig.group.scale.setScalar(e), easeOutBack);
    const stand = door.pos.clone().addScaledVector(door.look, 1.6);
    const n = { rig, door, stand, good, bundle, state: 'out', t: 0, name: pick(female ? NAMES_F : NAMES_M), female, pos: rig.group.position };
    this.list.push(n);
    return n;
  },

  nearestWaiting(p, r) {
    return this.list.find((n) => n.state === 'wait' && n.pos.distanceTo(p) < r);
  },

  leave(n, angry = false) {
    n.state = 'leave'; n.t = 0;
    if (angry) puff(n.pos.clone().setY(1.8), '#ff8a7a', 6, .25);
  },

  handOver(n) { n.rig.group.remove(n.bundle); this.leave(n); },

  clear() { for (const n of this.list) this.scene.remove(n.rig.group); this.list.length = 0; },
};

// ---------- helpers: "thằng em" on a bike collecting by themselves ----------
export const helpers = {
  list: [],
  scene: null,
  init(scene) { this.scene = scene; },

  add() {
    const g = new THREE.Group();
    const bike = buildVehicle('bike');
    const rig = makePerson({ hat: 'cap', shirt: pick(['#ff9f43', '#5fb36b', '#f4d35e']), scale: .85 });
    rig.group.position.copy(bike.userData.seat);
    poseSit(rig);
    g.add(bike, rig.group);
    g.position.copy(LAYOUT.base).add(new THREE.Vector3(rand(-2, 2), 0, 2));
    this.scene.add(g);
    g.scale.setScalar(0); anim(.5, (e) => g.scale.setScalar(e), easeOutBack);
    puff(g.position.clone().setY(.5), '#fff2d8', 12, .4);
    this.list.push({ g, rig, bike, target: null, carry: [], state: 'seek', t: 0 });
  },

  update(dt, t, onDeliver) {
    for (const h of this.list) {
      h.t += dt;
      const speed = 6.2;
      let moving = true;
      if (h.state === 'seek') {
        if (!h.target || !items.list.includes(h.target)) {
          h.target = items.nearestFree(h.g.position);
          if (h.target) { h.target.claimed = h; h.path = makePath(h.g.position, h.target.pos); }
        }
        if (h.target) {
          if (followPath(h.g, h.path, speed, dt)) {
            const it = h.target; h.target = null;
            items.take(it);
            items.flyTo(it, () => h.g.position.clone().setY(1));
            h.carry.push(it.type);
            if (h.carry.length >= 6) { h.state = 'return'; h.path = makePath(h.g.position, LAYOUT.base); }
          }
        } else moving = false;
      } else if (h.state === 'return') {
        if (followPath(h.g, h.path, speed, dt)) {
          onDeliver(h.carry, h.g.position);
          h.carry = []; h.state = 'seek';
        }
      }
      poseSit(h.rig, moving, t * 9);
      for (const w of h.bike.userData.wheels) w.userData.spin.rotation.z -= (moving ? speed : 0) * dt * 3;
    }
  },

  clear() { for (const h of this.list) this.scene.remove(h.g); this.list.length = 0; },
};

import * as THREE from 'three';
import { box, cyl, sphere, mat, damp, clamp, pick, anim, easeOutBack } from './util.js';
import { world, LAYOUT } from './world.js';
import { makePerson, animateWalk, poseSit } from './people.js';
import { puff, exhaust } from './fx.js';

const CARGO_COLS = ['#3a86d4', '#e2433a', '#c49a6c', '#7a848f', '#9fd8f5', '#f1c40f'];

// ---------- vehicles ----------
function wheel(r = .34) {
  const w = new THREE.Mesh(new THREE.TorusGeometry(r, .05, 6, 14), mat('#1c1c1c'));
  w.castShadow = true;
  const hub = cyl(.05, .05, .1, 6, '#bbb'); hub.rotation.x = Math.PI / 2; w.add(hub);
  for (let i = 0; i < 3; i++) { const s = box(r * 2, .02, .02, '#999'); s.rotation.z = i * Math.PI / 3; w.add(s); }
  const g = new THREE.Group(); g.add(w); g.rotation.y = Math.PI / 2; g.userData.spin = w;
  return g;
}

function makeBike() {
  const g = new THREE.Group();
  const wf = wheel(), wb = wheel();
  wf.position.set(0, .34, .62); wb.position.set(0, .34, -.62);
  g.add(wf, wb);
  const fm = mat('#2e86de');
  const top = box(.06, .06, 1, fm); top.position.set(0, .82, 0); g.add(top);
  const down = box(.06, .06, .9, fm); down.position.set(0, .6, .15); down.rotation.x = .5; g.add(down);
  const seatPost = box(.06, .5, .06, fm); seatPost.position.set(0, .7, -.32); g.add(seatPost);
  const seat = box(.18, .07, .3, '#222'); seat.position.set(0, .97, -.34); g.add(seat);
  const bar = box(.6, .05, .05, '#aaa'); bar.position.set(0, 1.08, .55); g.add(bar);
  const fork = box(.05, .7, .05, '#aaa'); fork.position.set(0, .72, .6); g.add(fork);
  const basket = new THREE.Group();
  const bb = box(.5, .05, .4, '#c8a165'); basket.add(bb);
  for (const [x, z, w, d] of [[0, .2, .5, .04], [0, -.2, .5, .04], [.25, 0, .04, .4], [-.25, 0, .04, .4]]) { const s = box(w, .32, d, '#c8a165'); s.position.set(x, .16, z); basket.add(s); }
  basket.position.set(0, .92, .86); g.add(basket);
  g.userData = { wheels: [wf, wb], cargoAnchor: basket, cargoSize: [.42, .34], seat: new THREE.Vector3(0, .17, -.36), pedal: true, slots: 10 };
  return g;
}

function makeBagac(motor = false) {
  const g = new THREE.Group();
  const col = motor ? '#1d6fb8' : '#2f7d5a';
  const wl = wheel(.3), wr = wheel(.3), wb = wheel(.34);
  wl.position.set(-.62, .3, .9); wr.position.set(.62, .3, .9); wb.position.set(0, .34, -.75);
  g.add(wl, wr, wb);
  const bed = box(1.5, .08, 1.3, '#8b6a45'); bed.position.set(0, .72, .9); g.add(bed);
  const sideMat = mat(col);
  for (const [x, z, w, d] of [[0, 1.55, 1.5, .06], [0, .25, 1.5, .06], [.75, .9, .06, 1.36], [-.75, .9, .06, 1.36]]) { const s = box(w, .36, d, sideMat); s.position.set(x, .92, z); g.add(s); }
  const frame = box(.08, .08, 1.1, col); frame.position.set(0, .7, -.2); g.add(frame);
  const seat = box(.24, .08, .34, '#222'); seat.position.set(0, .98, -.6); g.add(seat);
  const post = box(.06, .3, .06, col); post.position.set(0, .82, -.6); g.add(post);
  const bar = box(.7, .05, .05, '#aaa'); bar.position.set(0, 1.18, .05); g.add(bar);
  if (motor) {
    const eng = box(.4, .32, .45, '#555', { metalness: .5 }); eng.position.set(0, .45, -.45); g.add(eng);
    const pipe = cyl(.05, .05, .6, 6, '#888', { metalness: .7 }); pipe.rotation.x = Math.PI / 2; pipe.position.set(.25, .35, -.9); g.add(pipe);
    const lamp = box(.2, .14, .06, mat('#fff7d6', { emissive: '#fff1b0', emissiveIntensity: 1.8 })); lamp.position.set(0, .95, 1.6); g.add(lamp);
  }
  // the hand-painted plate every ba gác has
  const plate = box(.5, .2, .02, '#f1c40f'); plate.position.set(0, .8, 1.59); g.add(plate);
  const anchor = new THREE.Group(); anchor.position.set(0, .78, .9); g.add(anchor);
  g.userData = { wheels: [wl, wr, wb], cargoAnchor: anchor, cargoSize: [1.35, 1.15], seat: new THREE.Vector3(0, .19, -.62), pedal: !motor, motor, slots: 24 };
  return g;
}

export function buildVehicle(kind) {
  if (kind === 'bike') return makeBike();
  if (kind === 'bagac') return makeBagac(false);
  if (kind === 'bagacm') return makeBagac(true);
  return null;
}

// ---------- player ----------
export const player = {
  group: new THREE.Group(),
  rig: null,
  vel: new THREE.Vector3(),
  heading: 0,
  vehicle: null,
  vehicleKind: null,
  sack: null,
  stick: null,
  ring: null,
  cargoMeshes: [],
  cargoShown: 0,
  input: new THREE.Vector3(),
  stepT: 0,
  lean: 0,
  frozen: false,

  init(scene) {
    this.rig = makePerson({ hat: 'nonla', shirt: '#3a86d4', pants: '#4a3b2f', skin: '#d29468' });
    this.group.add(this.rig.group);
    // sack on the back
    this.sack = new THREE.Group();
    const s = sphere(.38, mat('#2b6cb0'), 1); s.scale.set(1, 1.15, .8); this.sack.add(s);
    const stripe = sphere(.385, mat('#e2433a'), 1); stripe.scale.set(1.0, .25, .82); stripe.position.y = .1; this.sack.add(stripe);
    const tie = cyl(.08, .14, .16, 6, '#2b6cb0'); tie.position.y = .45; this.sack.add(tie);
    this.sack.position.set(0, .55, -.38);
    this.rig.body.add(this.sack);
    // que gắp
    this.stick = new THREE.Group();
    const st = cyl(.025, .025, 1.2, 5, '#8a6a45'); st.position.y = -.5; this.stick.add(st);
    const mg = box(.18, .12, .12, mat('#d63031', { metalness: .5 })); mg.position.y = -1.1; this.stick.add(mg);
    this.stick.position.set(0, -.55, 0); this.stick.rotation.x = .5;
    this.rig.armR.add(this.stick);
    this.stick.visible = false;
    // pickup radius ring
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 48), new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: .25, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = .2;
    this.group.add(this.ring);
    this.ring.visible = false;
    this.group.position.copy(LAYOUT.base).add(new THREE.Vector3(2, 0, 3));
    scene.add(this.group);
  },

  get pos() { return this.group.position; },

  setTool(t, animate = true) {
    this.stick.visible = t.id === 'magnet';
    this.ring.visible = t.radius > 2;
    this.ring.scale.setScalar(t.radius);
    this.sack.visible = !t.vehicle;
    this.sack.children[0].material = t.id === 'hand' ? mat('#f4f1ea') : mat('#2b6cb0');
    if (t.vehicle !== this.vehicleKind) {
      if (this.vehicle) this.group.remove(this.vehicle);
      this.vehicle = buildVehicle(t.vehicle);
      this.vehicleKind = t.vehicle;
      this.cargoMeshes = []; this.cargoShown = 0;
      if (this.vehicle) {
        this.group.add(this.vehicle);
        this.rig.group.position.copy(this.vehicle.userData.seat);
        poseSit(this.rig);
        if (animate) { this.vehicle.scale.setScalar(0); anim(.6, (e) => this.vehicle.scale.setScalar(e), easeOutBack); }
      } else this.rig.group.position.set(0, 0, 0);
    }
    if (animate) puff(this.pos.clone().setY(.5), '#fff2d8', 14, .5);
  },

  // fill: 0..1
  setCargoFill(fill, count) {
    if (!this.vehicle) {
      const s = .35 + fill * .85;
      this.sack.scale.setScalar(fill === 0 ? .001 : s);
      return;
    }
    const ud = this.vehicle.userData;
    const want = Math.round(fill * ud.slots);
    while (this.cargoShown < want) {
      const i = this.cargoShown++;
      const [w, d] = ud.cargoSize;
      const per = ud.slots > 12 ? 4 : 2, rows = ud.slots > 12 ? 3 : 2;
      const layer = Math.floor(i / (per * rows)), k = i % (per * rows);
      const cx = (k % per + .5) / per - .5, cz = (Math.floor(k / per) + .5) / rows - .5;
      const sz = Math.min(w / per, d / rows) * .9;
      const m = box(sz, sz * .8, sz, pick(CARGO_COLS));
      m.position.set(cx * w, .1 + sz * .4 + layer * sz * .8, cz * d);
      m.rotation.y = (Math.random() - .5) * .4;
      ud.cargoAnchor.add(m);
      this.cargoMeshes.push(m);
      m.scale.setScalar(0); anim(.3, (e) => m.scale.setScalar(e), easeOutBack);
    }
    while (this.cargoShown > want) {
      this.cargoShown--;
      const m = this.cargoMeshes.pop();
      ud.cargoAnchor.remove(m);
    }
  },

  bump() { // squash on pickup
    const tgt = this.vehicle ? this.vehicle.userData.cargoAnchor : this.sack;
    const base = tgt.scale.x;
    anim(.25, (e) => { const k = Math.sin(e * Math.PI) * .18; tgt.scale.set(base * (1 + k), base * (1 - k), base * (1 + k)); });
  },

  carryPoint() {
    const p = this.pos.clone();
    p.y += this.vehicle ? 1.0 : 1.4;
    if (this.vehicle) p.add(new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)).multiplyScalar(this.vehicleKind === 'bike' ? .86 : .9));
    return p;
  },

  update(dt, t, keys, speed, radius) {
    // input (camera looks toward -Z, so W = -Z)
    const ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const iz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    this.input.set(ix, 0, iz);
    if (this.input.lengthSq() > 1) this.input.normalize();
    if (this.frozen) this.input.set(0, 0, 0);
    const accel = this.vehicle ? 7 : 14;
    this.vel.x = damp(this.vel.x, this.input.x * speed, accel, dt);
    this.vel.z = damp(this.vel.z, this.input.z * speed, accel, dt);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.move(this.vel.x * dt, this.vel.z * dt);

    if (sp > .3) {
      const target = Math.atan2(this.vel.x, this.vel.z);
      let d = target - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * (this.vehicle ? 7 : 14));
      this.lean = damp(this.lean, clamp(-d * .6, -.35, .35), 8, dt);
    } else this.lean = damp(this.lean, 0, 8, dt);
    this.group.rotation.y = this.heading;

    if (this.vehicle) {
      this.vehicle.rotation.z = this.lean * (this.vehicleKind === 'bike' ? 1 : .3);
      this.rig.group.rotation.z = this.vehicle.rotation.z;
      for (const w of this.vehicle.userData.wheels) w.userData.spin.rotation.z -= sp * dt * 3;
      poseSit(this.rig, this.vehicle.userData.pedal, t * (2 + sp * 1.3));
      this.rig.root.position.y = Math.sin(t * 20) * .01 * Math.min(1, sp);
      if (this.vehicle.userData.motor && Math.random() < dt * (6 + sp)) {
        const back = new THREE.Vector3(.25, .35, -1.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading).add(this.pos);
        exhaust(back);
      }
    } else {
      animateWalk(this.rig, dt, sp);
      this.rig.group.rotation.z = this.lean * .3;
    }
    // footstep dust
    this.stepT += dt * sp;
    if (sp > 2 && this.stepT > (this.vehicle ? 3 : 1.4)) { this.stepT = 0; puff(this.pos.clone().setY(.2), '#d9c8b4', 2, .22); }
    this.ring.material.opacity = .18 + Math.sin(t * 3) * .06;
    return sp;
  },

  move(dx, dz) {
    const p = this.pos;
    const r = this.vehicle ? .7 : .35;
    // body edges may sit in different rects: requiring one rect to hold the whole body jammed
    // vehicles (r=.7) at the street↔base / street↔alley seams
    const inside = (x, z) => LAYOUT.walk.some((w) => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1);
    const ok = (x, z) => inside(x, z) && inside(x + r, z) && inside(x - r, z) && inside(x, z + r) && inside(x, z - r);
    if (ok(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
    else if (ok(p.x + dx, p.z)) { p.x += dx; this.vel.z *= .5; }
    else if (ok(p.x, p.z + dz)) { p.z += dz; this.vel.x *= .5; }
    // push out of round colliders
    for (const c of world.colliders) {
      const ex = p.x - c.x, ez = p.z - c.z, d = Math.hypot(ex, ez), min = c.r + r * .8;
      if (d < min && d > 1e-4) { p.x = c.x + ex / d * min; p.z = c.z + ez / d * min; }
    }
  },
};

import * as THREE from 'three';
import { box, cyl, sphere, mat, signMesh, rand, pick, anim, wait, easeOutBack, easeInCubic } from './util.js';
import { world, LAYOUT } from './world.js';
import { makePerson } from './people.js';
import { buildVehicle } from './player.js';
import { puff } from './fx.js';

const B = new THREE.Vector3(-37, 0, -13.5); // base model centre (lot)

// ---------- Phase 1: gầm cầu ----------
function baseBridge() {
  const g = new THREE.Group();
  // blue tarp lean-to between pillars
  const tarp = box(6, .05, 4.4, mat('#2b6cb0', { roughness: .6 }));
  tarp.position.set(0, 2.5, -1.2); tarp.rotation.x = -.35; g.add(tarp);
  for (const x of [-2.9, 2.9]) { const p = cyl(.05, .05, 2.4, 5, '#8a6a45'); p.position.set(x, 1.2, .8); g.add(p); }
  // hammock (võng)
  const ham = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 2.4, 10, 1, true, 0, Math.PI), mat('#e85d75', { side: THREE.DoubleSide }));
  ham.rotation.z = Math.PI / 2; ham.rotation.y = 0; ham.position.set(-1, 1.0, -2.4); ham.castShadow = true; g.add(ham);
  for (const x of [-2.4, .4]) { const r = cyl(.015, .015, 1.3, 3, '#ddd'); r.position.set(x, 1.4, -2.4); r.rotation.z = x < 0 ? .9 : -.9; g.add(r); }
  // little table, ấm trà, cups
  const tb = box(.9, .45, .6, '#7a5232'); tb.position.set(1.6, .23, -.6); g.add(tb);
  const pot = sphere(.14, mat('#e8e0d0'), 1); pot.position.set(1.45, .58, -.6); g.add(pot);
  const spout = cyl(.02, .03, .16, 4, '#e8e0d0'); spout.position.set(1.62, .62, -.6); spout.rotation.z = -1; g.add(spout);
  for (const x of [1.8, 1.95]) { const c = cyl(.04, .035, .07, 6, '#f5f0e6'); c.position.set(x, .5, -.5); g.add(c); }
  // đèn dầu
  const lamp = new THREE.Group();
  const lb = cyl(.08, .1, .12, 6, '#b8860b', { metalness: .6 }); lamp.add(lb);
  const gl = cyl(.06, .08, .18, 6, mat('#ffcf70', { emissive: '#ffa63d', emissiveIntensity: 3 })); gl.position.y = .15; lamp.add(gl);
  lamp.position.set(1.25, .52, -.75); g.add(lamp);
  g.userData.tick = (dt, t) => { gl.scale.y = 1 + Math.sin(t * 13) * .08 + Math.sin(t * 7.3) * .06; };
  // cardboard bed + sacks
  const bed = box(1.8, .08, 1, '#c49a6c'); bed.position.set(-1.6, .05, -.3); g.add(bed);
  for (let i = 0; i < 3; i++) { const s = sphere(.35, pick(['#2b6cb0', '#e2433a', '#f4f1ea']), 1); s.scale.set(1, 1.2, .9); s.position.set(2.6 - i * .2, .4, -2.4 + i * .7); g.add(s); }
  // old wooden sign
  const sg = signMesh('MUA VE CHAI', 1.6, .5, { bg: '#7a5232', fg: '#fff1c4', glow: .2 }); sg.position.set(-2.4, .9, .9); sg.rotation.y = .2; g.add(sg);
  const sp = cyl(.04, .04, .9, 4, '#5b4636'); sp.position.set(-2.4, .45, .85); g.add(sp);
  return g;
}

// ---------- Phase 2: vựa nhỏ ----------
function baseSmall() {
  const g = new THREE.Group();
  const floor = box(9, .12, 6.5, '#a8a29a'); floor.position.set(0, .06, -1.4); g.add(floor);
  const back = box(9, 3.2, .2, '#d8c9a8'); back.position.set(0, 1.6, -4.6); g.add(back);
  const side = box(.2, 3.2, 6.5, '#d8c9a8'); side.position.set(-4.5, 1.6, -1.4); g.add(side);
  for (const x of [-4.4, 4.4, 0]) { const p = cyl(.08, .08, 3.4, 6, '#6f7a83'); p.position.set(x, 1.7, 1.7); g.add(p); }
  const roof = box(9.6, .1, 7.2, mat('#7d9ab0', { metalness: .55, roughness: .4 })); roof.position.set(0, 3.5, -1.4); roof.rotation.x = .08; g.add(roof);
  for (let x = -4.6; x < 4.8; x += .6) { const r = box(.05, .06, 7.2, '#6a8599', { metalness: .55 }); r.position.set(x, 3.56, -1.4); r.rotation.x = .08; g.add(r); }
  const sign = signMesh('VỰA VE CHAI', 5, 1, { bg: '#c0392b', glow: .5, sub: 'MUA BÁN PHẾ LIỆU' }); sign.position.set(0, 4.3, 1.8); g.add(sign);
  // cân đĩa
  const scale = new THREE.Group();
  const sb = box(.6, .5, .5, '#3a86d4'); sb.position.y = .25; scale.add(sb);
  const dial = cyl(.22, .22, .06, 14, '#fff'); dial.rotation.x = Math.PI / 2; dial.position.set(0, .45, .26); scale.add(dial);
  const plate = cyl(.4, .4, .05, 12, mat('#c9ced3', { metalness: .7 })); plate.position.y = .72; scale.add(plate);
  scale.position.set(2.6, 0, .6); g.add(scale);
  // bàn thờ ông Địa
  const altar = new THREE.Group();
  const ab = box(.9, .7, .5, '#b22222'); altar.add(ab);
  const roofA = box(1, .1, .55, '#f1c40f'); roofA.position.y = .4; altar.add(roofA);
  const statue = sphere(.15, '#f1c40f', 1); statue.position.set(0, .05, .1); altar.add(statue);
  const candle = cyl(.03, .03, .14, 5, mat('#ff5a3c', { emissive: '#ff3b1f', emissiveIntensity: 2.5 })); candle.position.set(.28, -.05, .12); altar.add(candle);
  altar.position.set(-3.9, .5, -4.2); g.add(altar);
  // piles of sacks + cardboard + cans
  for (let i = 0; i < 10; i++) { const s = sphere(.42, pick(['#2b6cb0', '#e2433a', '#f4f1ea', '#27ae60']), 1); s.scale.set(1, 1.15, .9); s.position.set(-3.4 + (i % 5) * .85, .45 + Math.floor(i / 5) * .7, -3.6 + Math.floor(i / 5) * .2); g.add(s); }
  for (let i = 0; i < 6; i++) { const c = box(.9, .25, .7, '#c49a6c'); c.position.set(2.8 + rand(-.1, .1), .2 + i * .26, -3.4); c.rotation.y = rand(-.2, .2); g.add(c); }
  const bike = buildVehicle('bike'); bike.position.set(-3, 0, 1.2); bike.rotation.y = -.4; g.add(bike);
  // the boss's chair + trà đá
  const chair = box(.5, .45, .5, '#2e86de'); chair.position.set(0, .22, -.5); g.add(chair);
  const bulb = sphere(.1, mat('#fff1c4', { emissive: '#ffd08a', emissiveIntensity: 3 }), 1); bulb.position.set(0, 3.2, -1); g.add(bulb);
  return g;
}

// ---------- Phase 3: vựa lớn ----------
function baseBig() {
  const g = new THREE.Group();
  const floor = box(16, .14, 9.5, '#9a958e'); floor.position.set(0, .07, -.5); g.add(floor);
  const back = box(16, 5, .25, '#c9bda5'); back.position.set(0, 2.5, -5.2); g.add(back);
  for (const x of [-8, 8]) { const s = box(.25, 5, 9.5, '#c9bda5'); s.position.set(x, 2.5, -.5); g.add(s); }
  for (const x of [-7.8, -2.6, 2.6, 7.8]) { const p = box(.25, 5.4, .25, '#556270'); p.position.set(x, 2.7, 4.1); g.add(p); }
  const roof = box(16.6, .14, 10.4, mat('#a33b32', { roughness: .6 })); roof.position.set(0, 5.6, -.5); roof.rotation.x = .07; g.add(roof);
  const sign = signMesh('VỰA PHẾ LIỆU LÊN ĐỜI', 9, 1.4, { bg: '#1d6fb8', glow: .6, sub: 'ĐẦU MỐI THU MUA — GIÁ CAO' }); sign.position.set(0, 6.5, 4.2); g.add(sign);
  // hydraulic press
  const press = new THREE.Group();
  const pb = box(1.6, 2.2, 1.4, '#f1c40f'); pb.position.y = 1.1; press.add(pb);
  const ram = box(1.3, .4, 1.1, '#555', { metalness: .6 }); ram.position.y = 2.4; press.add(ram);
  const stripes = box(1.62, .3, 1.42, '#222'); stripes.position.y = .3; press.add(stripes);
  press.position.set(-5.8, 0, -3.6); g.add(press);
  g.userData.ram = ram;
  // bàn thờ ông Địa (bigger, golder)
  const altar = box(1, .8, .5, '#b22222'); altar.position.set(6.8, 1.5, -4.8); g.add(altar);
  const al2 = box(1.1, .12, .55, '#f1c40f'); al2.position.set(6.8, 1.95, -4.8); g.add(al2);
  // stock pile anchor
  const pile = new THREE.Group(); pile.position.set(0, .14, -2.8); g.add(pile);
  g.userData.pile = pile;
  // office corner with fan & desk
  const desk = box(1.6, .75, .8, '#7a5232'); desk.position.set(5.6, .38, -1.6); g.add(desk);
  const pc = box(.5, .4, .1, '#222'); pc.position.set(5.6, .95, -1.8); g.add(pc);
  for (const x of [-4, 0, 4]) { const b = sphere(.12, mat('#fff1c4', { emissive: '#ffd08a', emissiveIntensity: 3 }), 1); b.position.set(x, 4.6, -1); g.add(b); }
  g.userData.tick = (dt, t) => { ram.position.y = 2.4 - Math.max(0, Math.sin(t * 1.5)) * 1.1; };
  return g;
}

// ---------- villa (ending) ----------
export function buildVillaParts() {
  const parts = [];
  const add = (m, x, y, z, group = 'body') => { m.position.set(x, y, z); m.userData.group = group; parts.push(m); return m; };
  const cream = '#fff3dc', gold = mat('#f5c542', { metalness: .85, roughness: .25, emissive: '#5a3a00', emissiveIntensity: .3 });
  add(box(14, .5, 12, '#e9e1d4'), 0, .25, 0, 'base');
  add(box(10, 3.4, 7, cream), 0, 2.2, -1.5, 'f1');
  add(box(10.4, .3, 7.6, '#f0e2c6'), 0, 4.05, -1.3, 'f1');
  add(box(9, 3.2, 6.4, cream), 0, 5.8, -1.7, 'f2');
  add(box(9.4, .3, 7, '#f0e2c6'), 0, 7.55, -1.5, 'f2');
  // Roman columns
  for (const x of [-4, -2, 2, 4]) {
    add(cyl(.32, .36, 7.2, 10, '#fffaf0'), x, 3.9, 2.4, 'cols');
    add(box(.9, .3, .9, '#f0e2c6'), x, 7.55, 2.4, 'cols');
    add(box(.9, .3, .9, '#f0e2c6'), x, .65, 2.4, 'cols');
  }
  add(box(9.6, .4, 1.4, '#f0e2c6'), 0, 7.8, 2.2, 'cols');
  // Thai roof (stacked tiers + gold trims)
  const roofMat = mat('#c0392b', { roughness: .5 });
  const r1 = new THREE.Mesh(new THREE.ConeGeometry(7.6, 2.4, 4), roofMat); r1.rotation.y = Math.PI / 4; r1.scale.set(1.2, 1, .9); r1.castShadow = true; add(r1, 0, 9.2, -.5, 'roof');
  const r2 = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 4), roofMat); r2.rotation.y = Math.PI / 4; r2.scale.set(1.2, 1, .9); r2.castShadow = true; add(r2, 0, 10.9, -.5, 'roof');
  add(new THREE.Mesh(new THREE.ConeGeometry(.3, 1.6, 6), gold), 0, 12.5, -.5, 'roof');
  for (const [x, z] of [[-6.4, 3.6], [6.4, 3.6], [-6.4, -4.6], [6.4, -4.6]]) { const h = new THREE.Mesh(new THREE.ConeGeometry(.18, 1.1, 5), gold); h.rotation.z = x < 0 ? .7 : -.7; add(h, x * 1.02, 8.5, z * .95, 'roof'); }
  // balcony with gold railing
  add(box(8, .5, .1, gold), 0, 4.5, 2.5, 'cols');
  // windows glowing
  for (const [x, y] of [[-3, 2.2], [3, 2.2], [-2.6, 5.9], [0, 5.9], [2.6, 5.9]]) add(box(1.4, 1.8, .1, mat('#ffe2a8', { emissive: '#ffbf66', emissiveIntensity: .55 })), x, y, 2.02, 'f2');
  add(box(1.8, 2.6, .12, '#7a4b2a'), 0, 1.8, 2.04, 'f1');
  // fence + gold gate
  for (const x of [-6.5, 6.5]) add(box(.1, 1.4, 12, '#fff3dc'), x, 1.2, 0, 'fence');
  add(box(4.4, 1.4, .1, '#fff3dc'), -4.3, 1.2, 6, 'fence');
  add(box(4.4, 1.4, .1, '#fff3dc'), 4.3, 1.2, 6, 'fence');
  for (const x of [-2.1, 2.1]) { add(box(.6, 2.6, .6, '#fff3dc'), x, 1.8, 6, 'gate'); add(sphere(.35, gold, 1), x, 3.4, 6, 'gate'); }
  const gate = new THREE.Group();
  for (let i = 0; i < 9; i++) { const b = box(.08, 2, .08, gold); b.position.set(-1.6 + i * .4, 0, 0); gate.add(b); }
  const gt = box(3.6, .14, .1, gold); gt.position.y = 1; gate.add(gt);
  const gb = box(3.6, .14, .1, gold); gb.position.y = -.9; gate.add(gb);
  add(gate, 0, 1.6, 6, 'gate');
  // lion statues
  for (const x of [-3.2, 3.2]) {
    const lion = new THREE.Group();
    const ped = box(1, .8, 1, '#e9e1d4'); ped.position.y = .4; lion.add(ped);
    const body = sphere(.45, '#d8d0c2', 1); body.position.set(0, 1.2, 0); body.scale.set(.9, 1, 1.2); lion.add(body);
    const head = sphere(.36, '#d8d0c2', 1); head.position.set(0, 1.75, .25); lion.add(head);
    const mane = sphere(.42, '#c9bfae', 0); mane.position.set(0, 1.7, .15); lion.add(mane);
    add(lion, x, 0, 7, 'lions');
  }
  // garden
  for (const [x, z] of [[-5, 4.5], [5, 4.5], [-5.5, -5], [5.5, -5]]) { const t = new THREE.Mesh(new THREE.DodecahedronGeometry(.9, 0), mat('#4f9a3e')); t.castShadow = true; add(t, x, 1.3, z, 'garden'); }
  return parts;
}

export const bases = {
  group: new THREE.Group(),
  current: null,
  ring: null,
  arrow: null,
  phase: 1,
  boss: null,

  init(scene) {
    scene.add(this.group);
    this.group.position.copy(B);
    // glowing drop-off ring
    const ring = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), new THREE.MeshBasicMaterial({ color: '#ffc94d', transparent: true, opacity: .22, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; ring.add(disc);
    const edge = new THREE.Mesh(new THREE.RingGeometry(1.8, 2, 48), new THREE.MeshBasicMaterial({ color: '#ffd36e', transparent: true, opacity: .9, depthWrite: false, toneMapped: false }));
    edge.rotation.x = -Math.PI / 2; ring.add(edge);
    ring.position.copy(LAYOUT.base).setY(.2);
    scene.add(ring);
    this.ring = ring;
    // floating arrow
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.35, .7, 4), new THREE.MeshBasicMaterial({ color: '#ffd36e', toneMapped: false }));
    arrow.rotation.x = Math.PI; arrow.position.copy(LAYOUT.base).setY(3);
    scene.add(arrow);
    this.arrow = arrow;
    // chú Tư / the buyer standing by the ring
    this.boss = makePerson({ hat: 'cap', shirt: '#f4f1ea', pants: '#2f3a4f', skin: '#c58558' });
    this.boss.group.position.set(LAYOUT.base.x - 3, 0, LAYOUT.base.z - .5);
    this.boss.group.rotation.y = .6;
    scene.add(this.boss.group);
    this.set(1, false);
  },

  build(phase) {
    return phase === 1 ? baseBridge() : phase === 2 ? baseSmall() : baseBig();
  },

  set(phase, animate = true) {
    if (this.current) this.group.remove(this.current);
    this.phase = phase;
    this.current = this.build(phase);
    this.group.add(this.current);
    if (animate) {
      this.current.scale.set(1, 0, 1);
      return anim(.9, (e) => this.current.scale.set(1, e, 1), easeOutBack);
    }
  },

  async swapAnimated(phase) {
    const old = this.current;
    await anim(.5, (e) => old.scale.set(1 + e * .1, 1 - e, 1 + e * .1), easeInCubic);
    puff(B.clone().setY(1), '#e8dcc8', 30, 1.2);
    await this.set(phase, true);
  },

  update(dt, t, highlight) {
    this.current?.userData.tick?.(dt, t);
    this.ring.children[1].scale.setScalar(1 + Math.sin(t * 4) * .04);
    this.ring.children[0].material.opacity = highlight ? .35 + Math.sin(t * 6) * .12 : .18;
    this.arrow.visible = highlight;
    this.arrow.position.y = 3 + Math.sin(t * 3) * .3;
    this.arrow.rotation.y += dt * 2;
    this.boss.head.rotation.y = Math.sin(t * .5) * .5;
  },

  // phase 3 stock pile visual: N bales stacked
  setStock(cells, cap) {
    const pile = this.current?.userData.pile;
    if (!pile) return;
    const want = Math.round(cells / cap * 40);
    while (pile.children.length < want) {
      const i = pile.children.length;
      const b = box(1.1, .8, .9, pick(['#c49a6c', '#aab4bf', '#3a86d4', '#7a848f']));
      b.position.set(-4.4 + (i % 8) * 1.2, .4 + Math.floor(i / 16) * .82, (Math.floor(i / 8) % 2) * 1.1);
      b.rotation.y = rand(-.06, .06);
      pile.add(b);
      b.scale.setScalar(0); anim(.3, (e) => b.scale.setScalar(e), easeOutBack);
    }
    while (pile.children.length > want) pile.remove(pile.children[pile.children.length - 1]);
  },
};

// ---------- the factory truck (phase 3) ----------
export function makeTruck() {
  const g = new THREE.Group();
  const bed = box(7, .3, 2.6, '#444'); bed.position.set(-1, .9, 0); g.add(bed);
  const cargo = box(6.8, 2.4, 2.5, '#2e86de'); cargo.position.set(-1, 2.25, 0); g.add(cargo);
  const s = signMesh('NHÀ MÁY TÁI CHẾ XANH', 6, 1, { bg: '#27ae60', glow: .4 }); s.position.set(-1, 2.3, 1.27); g.add(s);
  const cab = box(2, 2.2, 2.5, '#f4f1ea'); cab.position.set(3.4, 1.9, 0); g.add(cab);
  const win = box(.1, .9, 2.2, mat('#33414f', { roughness: .2, metalness: .3 })); win.position.set(4.42, 2.4, 0); g.add(win);
  for (const x of [-3.5, -1.5, 3.2]) for (const z of [-1.2, 1.2]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(.42, .16, 6, 12), mat('#1c1c1c')); w.position.set(x, .5, z); w.castShadow = true; g.add(w);
  }
  for (const z of [-.9, .9]) { const l = box(.06, .25, .4, mat('#fff7d6', { emissive: '#fff1b0', emissiveIntensity: 2 })); l.position.set(4.42, 1.3, z); g.add(l); }
  return g;
}

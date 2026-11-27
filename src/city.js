import * as THREE from 'three';
import { box, cyl, sphere, mat, at, signMesh, rand, randi, pick, bake } from './util.js';
import { world, LAYOUT } from './world.js';

const WALLS = ['#f6d68a', '#9fd8c9', '#f4a7a0', '#a9c8f0', '#f7e6c4', '#f2b880', '#c7e3a1', '#e8b4d8', '#fff1d6'];
const SIGNS = [
  ['TẠP HÓA CÔ BA', '#c0392b'], ['CƠM TẤM', '#e67e22'], ['PHỞ BÒ', '#16a085'], ['SỬA XE', '#2c3e50'],
  ['CÀ PHÊ VỢT', '#6d4c41'], ['GỘI ĐẦU', '#8e44ad'], ['TIỆM VÀNG KIM', '#b8860b'], ['NHÀ THUỐC', '#27ae60'],
  ['TRÀ SỮA', '#d35400'], ['BÚN BÒ HUẾ', '#c0392b'], ['ĐIỆN THOẠI', '#2980b9'], ['KARAOKE', '#8e44ad'], ['BÁNH XÈO', '#e67e22'],
];

let flagProto;
const flag = () => (flagProto ??= signMesh('★', .92, .6, { bg: '#da251d', fg: '#ffde00', border: '', size: 300, glow: .2 })).clone();

let ST; // everything static in the city, baked once
export function buildCity(scene) {
  ST = new THREE.Group(); scene.add(ST);
  world.colliders = [];
  world.doors = [];
  world.dirt = [];
  world.flowers = [];
  buildNorthRow(scene);
  buildAlley(scene);
  buildVillaLot(scene);
  buildPoles(scene);
  buildTrees(scene);
  buildBarriers(scene);
  bake(ST);
}

function tubeHouse(x, z, w, d, floors, opts = {}) {
  const g = new THREE.Group();
  const wall = opts.color || pick(WALLS);
  const H = floors * 3.1;
  const b = box(w, H, d, wall); b.position.set(0, H / 2, -d / 2); g.add(b);
  // ground floor shop opening
  const dark = box(w - .5, 2.5, .1, '#3b2f2a'); dark.position.set(0, 1.25, .02); dark.castShadow = false; g.add(dark);
  const shutter = box(w - .5, .35, .14, '#9aa3a8', { metalness: .4, roughness: .5 }); shutter.position.set(0, 2.45, .05); g.add(shutter);
  // warm interior glow
  const glow = box(w - 1.2, .1, .1, mat('#fff3d0', { emissive: '#ffcf87', emissiveIntensity: 1.6 })); glow.position.set(0, 2.2, .1); g.add(glow);
  // awning
  if (Math.random() < .6) {
    const aw = box(w - .2, .08, 1.3, pick(['#e2433a', '#2e86de', '#27ae60', '#f39c12'])); aw.position.set(0, 2.75, .6); aw.rotation.x = .25; g.add(aw);
  }
  // sign
  if (opts.sign !== false) {
    const [txt, col] = opts.sign || pick(SIGNS);
    const s = signMesh(txt, w - .5, .75, { bg: col, glow: .45 }); s.position.set(0, 3.25, .08); g.add(s);
  }
  // upper floors
  const rail = pick(['#ffffff', '#2f7d5a', '#3d5a80', '#7a4b2a']);
  for (let f = 1; f < floors; f++) {
    const y = f * 3.1;
    const slab = box(w, .14, 1, '#e9e1d4'); slab.position.set(0, y, .5); g.add(slab);
    const rl = box(w, .55, .06, rail); rl.position.set(0, y + .35, .98); g.add(rl);
    const win = box(w * .58, 1.6, .06, mat('#33414f', { roughness: .25, metalness: .3 })); win.position.set(-.1, y + 1.5, .02); g.add(win);
    const fr = box(w * .62, .12, .1, '#f5efe6'); fr.position.set(-.1, y + 2.35, .04); g.add(fr);
    if (Math.random() < .55) { // lit window
      const lw = box(w * .5, 1.3, .03, mat('#ffe2a8', { emissive: '#ffbf66', emissiveIntensity: .9 })); lw.position.set(-.1, y + 1.5, .06); lw.castShadow = false; g.add(lw);
    }
    if (Math.random() < .7) { // potted plants
      for (let p = 0; p < randi(1, 3); p++) {
        const pot = cyl(.15, .12, .25, 6, '#b5553c'); pot.position.set(-w / 2 + .5 + p * .7, y + .2, .7); g.add(pot);
        const leaf = sphere(.25, pick(['#4f9a3e', '#6bb34f', '#3f7f33']), 0); leaf.position.set(-w / 2 + .5 + p * .7, y + .5, .7); g.add(leaf);
      }
    }
    if (Math.random() < .5) { const ac = box(.75, .45, .35, '#eef0f0'); ac.position.set(w / 2 - .6, y + 2.2, .2); g.add(ac); }
    if (Math.random() < .3) { // drying laundry
      for (let c = 0; c < 3; c++) { const cl = box(.35, .5, .02, pick(['#e74c3c', '#f1c40f', '#3498db', '#fff'])); cl.position.set(-w / 2 + .7 + c * .5, y + 1.0, .9); cl.castShadow = false; g.add(cl); }
    }
    if (Math.random() < .3) { // bông giấy spilling over the railing
      for (let k = 0; k < 5; k++) { const b = sphere(.26, pick(['#e0409a', '#c2185b', '#f06292']), 0); b.position.set(w / 2 - .5 - k * .32, y + .55 - (k % 2) * .3, .98); b.castShadow = false; g.add(b); }
    }
    if (f === 1 && Math.random() < .4) { // cờ đỏ sao vàng on a slanted pole
      const a = .8, L = 1.8, px = -w / 2 + .35;
      const pole = cyl(.025, .025, L, 4, '#e9e4dc'); pole.rotation.x = a; pole.position.set(px, y + .7 + Math.cos(a) * L / 2, .98 + Math.sin(a) * L / 2); g.add(pole);
      const fl = flag(); fl.position.set(px + .46, y + .7 + Math.cos(a) * L - .3, .98 + Math.sin(a) * L); g.add(fl);
    }
  }
  // roof
  const par = box(w, .5, .2, wall); par.position.set(0, H + .25, -.1); g.add(par);
  if (floors <= 3 && Math.random() < .4) { // old house: hip roof in red ngói
    const r = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 4), mat('#b5452f')); r.rotation.y = Math.PI / 4; r.scale.set(w / 1.3, 1, d / 1.35); r.position.set(0, H + 1, -d / 2); r.castShadow = true; g.add(r);
  } else {
    if (Math.random() < .7) {
      const tank = cyl(.55, .55, 1.3, 10, mat('#dfe4e8', { metalness: .85, roughness: .28 })); tank.rotation.z = Math.PI / 2; tank.position.set(rand(-w / 4, w / 4), H + .9, -d / 2); g.add(tank);
      const stand = box(1.2, .3, .8, '#8a8f94'); stand.position.set(tank.position.x, H + .15, -d / 2); g.add(stand);
    }
    if (Math.random() < .4) { const tole = box(w, .1, d * .5, '#7d9ab0', { metalness: .5, roughness: .45 }); tole.position.set(0, H + 1.2, -d * .7); tole.rotation.x = -.2; g.add(tole); }
  }
  if (Math.random() < .35) { const ant = cyl(.03, .03, 2.2, 4, '#555'); ant.position.set(w / 3, H + 1.1, -d + 1); g.add(ant); }

  g.position.set(x, 0, z);
  if (opts.rotY) g.rotation.y = opts.rotY;
  ST.add(g);
  return g;
}

function buildNorthRow(scene) {
  // main row facing the street, between the bridge and the villa lot (gap at the alley)
  let x = -20.8;
  const slots = [];
  while (x < 39.6) {
    let w = rand(4.2, 5.6);
    if (x < 7.6 && x + w > 7.6) w = 7.6 - x;
    if (x >= 7.6 && x < 12.4) { x = 12.4; continue; }
    if (x + w > 39.6) w = 39.6 - x;
    if (w < 2.5) { x += w; continue; }
    slots.push([x + w / 2, w]);
    x += w;
  }
  slots.forEach(([cx, w], i) => {
    const floors = cx > 5 && cx < 15 ? randi(2, 3) : randi(2, 5);
    tubeHouse(cx, -7.5, w - .05, 12, floors, { sign: SIGNS[i % SIGNS.length] });
    world.doors.push({ pos: new THREE.Vector3(cx, 0, -7.1), look: new THREE.Vector3(0, 0, 1) });
  });
  // continuation east of the villa lot (decor only)
  for (let cx = 58.6, i = 0; cx < 100; i++) { const w = rand(4.4, 5.4); tubeHouse(cx + w / 2, -7.5, w - .05, 12, randi(2, 5)); cx += w; }
  // small shacks between the bridge foot and the first house
  const shack = box(6, 2.6, 5, '#b9a27a'); at(shack, -24.5, 1.3, -14); ST.add(shack);
  const tole = box(6.6, .1, 5.6, '#7d9ab0', { metalness: .5, roughness: .45 }); at(tole, -24.5, 2.75, -14); tole.rotation.x = .12; ST.add(tole);
}

function buildAlley(scene) {
  const ax = LAYOUT.alleyX;
  // houses on both sides, doors facing the alley
  for (let z = -20.5, i = 0; z > -42; i++) {
    const d = rand(4.2, 5.2);
    const fl = randi(2, 3);
    tubeHouse(ax - 2.4, z - d / 2, d - .05, 7, fl, { rotY: Math.PI / 2, sign: i % 2 ? false : pick(SIGNS) });
    tubeHouse(ax + 2.4, z - d / 2 - 1.3, d - .05, 7, fl, { rotY: -Math.PI / 2, sign: i % 2 ? pick(SIGNS) : false });
    world.doors.push({ pos: new THREE.Vector3(ax - 1.9, 0, z - d / 2), look: new THREE.Vector3(1, 0, 0) });
    world.doors.push({ pos: new THREE.Vector3(ax + 1.9, 0, z - d / 2 - 1.3), look: new THREE.Vector3(-1, 0, 0) });
    z -= d;
  }
  // alley end wall
  const endW = box(6, 4, .4, '#c9b79c'); at(endW, ax, 2, -40); scene.add(endW);
  // alley sign arch
  const arch = signMesh('HẺM 47', 4.4, .7, { bg: '#1d6fb8', glow: .6 }); arch.position.set(ax, 4.6, -7.6); scene.add(arch);
  for (const sx of [-2.3, 2.3]) { const p = cyl(.08, .08, 4.6, 6, '#444'); at(p, ax + sx, 2.3, -7.6); scene.add(p); }

  // string lights + lanterns across the alley
  const bulbMats = ['#ffd36e', '#ff7a6e', '#7ee0ff', '#b8ff7a'].map((c) => mat(c, { emissive: c, emissiveIntensity: 2.6 }));
  const bulbGeo = new THREE.SphereGeometry(.07, 6, 4);
  for (let z = -9; z > -38; z -= 3.5) {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      pts.push(new THREE.Vector3(ax - 2.2 + t * 4.4, 4.2 - Math.sin(t * Math.PI) * .5, z - t * 1.6));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#222' }));
    scene.add(line);
    pts.forEach((p, k) => { if (k % 1 === 0 && k > 0 && k < 10) { const b = new THREE.Mesh(bulbGeo, bulbMats[(k + Math.round(z)) & 3]); b.position.copy(p).y -= .08; ST.add(b); } });
  }
  const lanternMat = mat('#e8322a', { emissive: '#ff3b1f', emissiveIntensity: 1.6 });
  const lanterns = [];
  for (let z = -11; z > -36; z -= 7) {
    const l = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(.32, 8, 6), lanternMat); body.scale.y = 1.25; l.add(body);
    const cap = cyl(.15, .15, .1, 8, '#f1c40f'); cap.position.y = .42; l.add(cap);
    const tas = cyl(.02, .06, .35, 4, '#f1c40f'); tas.position.y = -.55; l.add(tas);
    l.position.set(ax, 3.6, z); scene.add(l); lanterns.push(l);
  }
  world.updaters.push((dt, t) => lanterns.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.5 + i) * .08; }));
  // ông Địa altar-ish red lights + motorbikes parked in the alley
  for (let z = -14; z > -36; z -= 8) parkedBike(scene, ax + (z % 16 ? -1.6 : 1.6), z, Math.PI / 2);
}

export function parkedBike(scene, x, z, rot = 0) {
  const g = makeMotorbike();
  g.position.set(x, 0, z); g.rotation.y = rot;
  scene.add(g);
  world.colliders.push({ x, z, r: .7 });
  return g;
}

export function makeMotorbike(color = pick(['#e2433a', '#2e86de', '#f1f1f1', '#222', '#f39c12', '#16a085'])) {
  const g = new THREE.Group();
  const wheelMat = mat('#1c1c1c');
  for (const z of [-.62, .62]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(.26, .08, 6, 12), wheelMat); w.rotation.y = Math.PI / 2; w.position.set(0, .3, z); w.castShadow = true; g.add(w);
  }
  const body = box(.32, .32, 1.1, color); body.position.set(0, .55, 0); g.add(body);
  const seat = box(.3, .12, .6, '#2a2420'); seat.position.set(0, .78, -.15); g.add(seat);
  const front = box(.34, .6, .2, color); front.position.set(0, .75, .5); g.add(front);
  const bar = box(.7, .05, .05, '#999'); bar.position.set(0, 1.08, .52); g.add(bar);
  const lamp = box(.16, .1, .06, mat('#fff7d6', { emissive: '#fff1b0', emissiveIntensity: 1.5 })); lamp.position.set(0, .95, .62); g.add(lamp);
  return bake(g);
}

function buildVillaLot(scene) {
  const lot = new THREE.Group();
  const v = LAYOUT.villa;
  // tôn fence around the empty lot
  const fenceMat = mat('#8fa6b5', { metalness: .4, roughness: .5 });
  const f1 = box(16, 2, .1, fenceMat); f1.position.set(v.x, 1, -7.8); lot.add(f1);
  const f2 = box(.1, 2, 14, fenceMat); f2.position.set(v.x - 8, 1, -14.8); lot.add(f2);
  const f3 = box(.1, 2, 14, fenceMat); f3.position.set(v.x + 8, 1, -14.8); lot.add(f3);
  const f4 = box(16, 2, .1, fenceMat); f4.position.set(v.x, 1, -21.8); lot.add(f4);
  const sign = signMesh('ĐẤT BÁN', 4.2, 1.6, { bg: '#fff8e1', fg: '#c0392b', border: '#c0392b', sub: '1 TỶ — chính chủ', glow: .3 });
  sign.position.set(v.x - 3, 3.4, -7.6); lot.add(sign);
  for (const sx of [-1.9, 1.9]) { const p = cyl(.06, .06, 3.4, 6, '#5b4636'); p.position.set(v.x - 3 + sx, 1.7, -7.7); lot.add(p); }
  // weeds inside
  for (let i = 0; i < 30; i++) { const w = cyl(0, .3, rand(.4, 1), 4, pick(['#6f8a3e', '#86a04a', '#5b7533'])); w.position.set(v.x + rand(-7, 7), .3, rand(-21, -9)); lot.add(w); }
  const dirt = box(15.8, .08, 13.8, '#9b8467'); dirt.position.set(v.x, .04, -14.8); lot.add(dirt);
  scene.add(lot);
  world.villaLot = lot;
}

function buildPoles(scene) {
  const wireMat = new THREE.LineBasicMaterial({ color: '#1a1a1a' });
  const poles = [];
  for (let x = -18; x < 95; x += 11) {
    if (Math.abs(x - LAYOUT.alleyX) < 3) x += 3;
    if (x > 40 && x < 56) continue; // keep the villa lot unobstructed
    const g = new THREE.Group();
    const p = cyl(.13, .2, 9, 6, '#a39b92'); p.position.y = 4.5; g.add(p);
    const arm = box(1.8, .12, .12, '#6b645c'); arm.position.y = 8.2; g.add(arm);
    const arm2 = box(1.4, .12, .12, '#6b645c'); arm2.position.y = 7.4; g.add(arm2);
    if (Math.random() < .5) { const tr = box(.6, .9, .5, '#6f7a83', { metalness: .4 }); tr.position.set(.35, 6.4, 0); g.add(tr); }
    if (Math.random() < .45) for (const s of [-1, 1]) { // loa phường
      const horn = cyl(.05, .24, .55, 8, '#9aa0a6', { metalness: .4 }); horn.rotation.z = s * (Math.PI / 2 - .25); horn.position.set(s * .3, 8.75, .1); g.add(horn);
    }
    if (Math.random() < .6) { // the iconic wire tangle
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(.35, .07, 40, 5, 3, 7), mat('#1d1d1d')); knot.position.y = 6.9; knot.rotation.x = Math.random() * 3; g.add(knot);
    }
    // street lamp
    const la = box(1.4, .08, .08, '#555'); la.position.set(0, 7.9, .7); la.rotation.y = Math.PI / 2; g.add(la);
    const lamp = box(.45, .14, .3, mat('#fff4d6', { emissive: '#ffd08a', emissiveIntensity: 2.4 })); lamp.position.set(0, 7.82, 1.35); g.add(lamp);
    g.position.set(x, 0, -6.9);
    ST.add(g); poles.push(g);
    world.colliders.push({ x, z: -6.9, r: .35 });
  }
  // sagging wires between poles
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i].position, b = poles[i + 1].position;
    for (let k = 0; k < 6; k++) {
      const y0 = 7.3 + (k % 3) * .45, dz = (k - 2.5) * .22, sag = rand(.4, 1.1);
      const pts = [];
      for (let s = 0; s <= 12; s++) { const t = s / 12; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, y0 - Math.sin(t * Math.PI) * sag, a.z + dz)); }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
  }
}

function buildTrees(scene) {
  const leafMats = ['#3f7f33', '#4f9a3e', '#5aa548'].map((c) => mat(c));
  for (let x = -12.5; x < 92; x += 11) {
    if (Math.abs(x - LAYOUT.alleyX) < 4 || (x > 40 && x < 56)) continue;
    // cây bàng: flat tiered canopy, trunk foot painted with vôi trắng
    const g = new THREE.Group();
    const trunk = cyl(.15, .24, 5, 6, '#6b4f3a'); trunk.position.y = 2.5; g.add(trunk);
    const lime = cyl(.25, .27, 1.1, 6, '#f4f1ea'); lime.position.y = .55; g.add(lime);
    [[2.1, 3.6], [1.6, 4.5], [1.05, 5.3]].forEach(([r, y], k) => {
      const c = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), leafMats[k % 3]);
      c.scale.y = .32; c.rotation.y = rand(0, 3); c.position.set(rand(-.25, .25), y, rand(-.2, .2)); c.castShadow = true; g.add(c);
    });
    g.position.set(x, 0, -6.4);
    scene.add(g);
    world.colliders.push({ x, z: -6.4, r: .45 });
    world.updaters.push((dt, t) => { g.rotation.z = Math.sin(t * .8 + x) * .015; });
  }
}

function buildBarriers(scene) {
  // road works at the west end + east end
  for (const x of [-47.2, 61]) {
    for (let z = -7; z <= 9; z += 1.6) {
      if (Math.abs(z) < 4.3) continue; // road stays open for traffic
      const g = new THREE.Group();
      const b = box(.25, .9, 1.4, '#f4f1ea'); b.position.y = .45; g.add(b);
      for (let k = 0; k < 2; k++) { const s = box(.27, .2, 1.42, '#d63031'); s.position.y = .25 + k * .4; g.add(s); }
      g.position.set(x, 0, z); ST.add(g);
    }
  }
}

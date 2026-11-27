import * as THREE from 'three';
import { box, cyl, sphere, mat, at, signMesh, rand, randi, pick, anim, easeOutBack, bake } from './util.js';
import { world, LAYOUT, registerOccluder } from './world.js';
import { makeMotorbike } from './city.js';
import { makePerson, poseSit } from './people.js';

const noShadow = (g) => g.traverse((m) => { m.castShadow = false; });

export function buildStreet(scene) {
  buildSouthProps(scene);
  buildDirtAndFlowers(scene);
  buildTraffic(scene);
}

function stool(color) { // ghế nhựa
  const g = new THREE.Group();
  const s = box(.38, .06, .38, color); s.position.y = .42; g.add(s);
  for (const [x, z] of [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]]) { const l = box(.05, .42, .05, color); l.position.set(x, .21, z); g.add(l); }
  return g;
}

function buildSouthProps(scene) {
  const add = (obj, x, z, r = .8) => { obj.position.set(x, 0, z); scene.add(obj); world.colliders.push({ x, z, r }); return obj; };

  // trà đá stall with people chilling
  const tra = (x) => {
    const g = new THREE.Group();
    const t = box(1.1, .5, .7, '#3a86d4'); t.position.y = .25; g.add(t);
    const jug = cyl(.18, .2, .45, 8, mat('#ff6b5b')); jug.position.set(-.3, .73, 0); g.add(jug);
    for (let i = 0; i < 3; i++) { const cup = cyl(.05, .04, .12, 6, mat('#f7e9a8', { transparent: true, opacity: .8 })); cup.position.set(.1 + i * .14, .56, .1); g.add(cup); }
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.6, .6, 8), mat('#e2433a')); umb.position.y = 2.4; umb.castShadow = true; g.add(umb);
    registerOccluder(umb);
    const pole = cyl(.03, .03, 2.2, 4, '#ddd'); pole.position.y = 1.1; g.add(pole);
    add(g, x, 8.4, 1.1);
    for (let i = 0; i < 3; i++) {
      const sx = x - 1.2 + i * 1.2, sz = 7.2;
      const s = stool(pick(['#e2433a', '#2e86de', '#27ae60'])); s.position.set(sx, 0, sz); scene.add(s);
      if (i !== 1) {
        const p = makePerson({ hat: Math.random() < .4 ? 'cap' : 'none' });
        poseSit(p); p.group.position.set(sx, .05, sz); p.group.rotation.y = Math.PI; scene.add(p.group);
        world.updaters.push((dt, tt) => { p.head.rotation.y = Math.sin(tt * .7 + sx) * .4; p.armR.rotation.x = -1.1 - Math.max(0, Math.sin(tt * .9 + sx)) * .9; });
      }
      world.colliders.push({ x: sx, z: sz, r: .35 });
    }
  };
  tra(-12); tra(30);

  // xe bánh mì
  const banhmi = () => {
    const g = new THREE.Group();
    const cart = box(1.5, .9, .8, '#f4f1ea'); cart.position.y = .75; g.add(cart);
    const glass = box(1.4, .55, .7, mat('#bfe6ff', { transparent: true, opacity: .5, roughness: .1 })); glass.position.y = 1.47; g.add(glass);
    for (let i = 0; i < 4; i++) { const b = box(.45, .14, .16, '#e8a85a'); b.position.set(-.45 + (i % 2) * .5, 1.3 + Math.floor(i / 2) * .16, 0); g.add(b); }
    const roof = box(1.6, .06, .9, '#e2433a'); roof.position.y = 1.8; g.add(roof);
    const s = signMesh('BÁNH MÌ', 1.4, .35, { bg: '#e2433a', glow: .5 }); s.position.set(0, 1.0, -.41); s.rotation.y = Math.PI; g.add(s);
    for (const x of [-.6, .6]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.22, .06, 6, 10), mat('#222')); w.position.set(x, .25, .42); w.castShadow = true; g.add(w); }
    const lamp = sphere(.08, mat('#fff1b0', { emissive: '#ffd36e', emissiveIntensity: 3 }), 0); lamp.position.set(.6, 1.7, -.2); g.add(lamp);
    const vendor = makePerson({ hat: 'nonla', female: true, shirt: '#f28fb0' });
    vendor.group.position.set(0, 0, .8); vendor.group.rotation.y = Math.PI; g.add(vendor.group);
    world.updaters.push((dt, t) => { vendor.armR.rotation.x = -.6 + Math.sin(t * 3) * .3; });
    return g;
  };
  add(banhmi(), 2, 8.6, 1.2);

  // parked motorbikes along the railing
  for (const x of [-30, -28.8, -27.6, 20, 21.2, 44, 45.2, 46.4]) {
    const b = makeMotorbike(); b.rotation.y = Math.PI / 2 + rand(-.15, .15); add(b, x, 8.6, .7);
  }
  // planters + street lamps on the canal side
  for (let x = -40; x < 60; x += 9.5) {
    if ([-12, 30, 2].some((s) => Math.abs(s - x) < 2.5)) continue;
    const pl = box(1.4, .5, .6, '#b9a58f'); pl.position.y = .25;
    const g = new THREE.Group(); g.add(pl);
    for (let k = 0; k < 3; k++) { const b = sphere(.32, pick(['#4f9a3e', '#6bb34f']), 0); b.position.set(-.4 + k * .4, .65, 0); g.add(b); }
    if (Math.random() < .6) for (let k = 0; k < 3; k++) { const f = sphere(.08, pick(['#ff6b8b', '#ffd36e', '#ffffff']), 0); f.position.set(-.4 + k * .4 + rand(-.1, .1), .95, rand(-.1, .1)); g.add(f); }
    add(g, x, 9.1, .75);
  }
  for (let x = -36; x < 60; x += 16) {
    const g = new THREE.Group();
    const p = cyl(.07, .1, 5, 6, '#3d4650'); p.position.y = 2.5; g.add(p);
    const arm = box(.08, .08, 1.2, '#3d4650'); arm.position.set(0, 4.95, -.5); g.add(arm);
    const lamp = box(.42, .14, .3, mat('#fff4d6', { emissive: '#ffd08a', emissiveIntensity: 2.4 })); lamp.position.set(0, 4.85, -1.05); g.add(lamp);
    add(g, x, 9.6, .3);
    registerOccluder(g);
  }
}

// Dirty patches fade away as the street gets cleaner; flower pots pop in.
function buildDirtAndFlowers(scene) {
  const stainMat = new THREE.MeshLambertMaterial({ color: '#5c4a3a', transparent: true, opacity: .32, depthWrite: false });
  const junkCols = ['#6d5a4a', '#8a7a6a', '#4f4a44', '#7a6a50'];
  for (let i = 0; i < 46; i++) {
    const g = new THREE.Group();
    const x = rand(-44, 58), z = pick([rand(-7.3, -4.4), rand(4.4, 9), rand(-3.6, 3.6)]);
    const st = new THREE.Mesh(new THREE.CircleGeometry(rand(.5, 1.05), 14), stainMat); st.rotation.x = -Math.PI / 2; st.position.y = .17; st.scale.y = rand(.5, 1); g.add(st);
    if (Math.random() < .6) for (let k = 0; k < randi(2, 5); k++) {
      const j = box(rand(.15, .4), rand(.05, .2), rand(.15, .4), pick(junkCols)); j.position.set(rand(-.5, .5), .2, rand(-.4, .4)); j.rotation.y = rand(0, 3); j.castShadow = false; g.add(j);
    }
    g.position.set(x, 0, z);
    scene.add(g); bake(g); noShadow(g); world.dirt.push(g);
  }
  world.dirt.sort(() => Math.random() - .5);
  const spots = [];
  for (let x = -42; x < 58; x += 4.2) spots.push([x + rand(-.5, .5), -4.6]);
  for (let x = -40; x < 58; x += 6.5) spots.push([x + rand(-.5, .5), 4.7]);
  spots.sort(() => Math.random() - .5);
  for (const [x, z] of spots) {
    const g = new THREE.Group();
    const pot = cyl(.22, .16, .3, 7, pick(['#c0583c', '#3a86d4', '#e9e1d4'])); pot.position.y = .3; g.add(pot);
    const bush = sphere(.28, pick(['#4f9a3e', '#5aa548']), 0); bush.position.y = .62; g.add(bush);
    for (let k = 0; k < 4; k++) { const f = sphere(.07, pick(['#ff6b8b', '#ffd36e', '#ff9f43', '#ffffff', '#c56cf0']), 0); f.position.set(rand(-.2, .2), .8 + rand(0, .1), rand(-.2, .2)); g.add(f); }
    bake(g); noShadow(g);
    g.position.set(x, .16, z); g.scale.setScalar(0); g.visible = false;
    scene.add(g); world.flowers.push(g);
  }
}

let dirtShown = -1;
export function setCleanliness(k) {
  const nd = world.dirt.length, nf = world.flowers.length;
  const keepDirt = Math.round(nd * (1 - k));
  const showFlowers = Math.round(nf * k);
  const key = keepDirt * 1000 + showFlowers;
  if (key === dirtShown) return;
  dirtShown = key;
  world.dirt.forEach((d, i) => {
    const want = i < keepDirt;
    if (want !== d.visible) {
      if (!want) anim(.6, (e) => d.scale.setScalar(1 - e)).then(() => { d.visible = false; });
      else { d.visible = true; d.scale.setScalar(1); }
    }
  });
  world.flowers.forEach((f, i) => {
    const want = i < showFlowers;
    if (want && !f.visible) { f.visible = true; anim(.6, (e) => f.scale.setScalar(e), easeOutBack); }
    else if (!want && f.visible) { f.visible = false; f.scale.setScalar(0); }
  });
}

// ---------- traffic (pure ambience; stops + honks if player is in the way) ----------
export const traffic = [];
function buildTraffic(scene) {
  for (let i = 0; i < 9; i++) {
    const dir = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    const bike = makeMotorbike(); g.add(bike);
    const rider = makePerson({ hat: 'helmet' });
    poseSit(rider); rider.group.position.set(0, .35, -.2); rider.armL.rotation.x = rider.armR.rotation.x = -1.3; g.add(rider.group);
    if (Math.random() < .35) { const p2 = makePerson({ hat: 'helmet', female: true }); poseSit(p2); p2.group.position.set(0, .4, -.75); g.add(p2.group); }
    if (Math.random() < .3) { // carrying a ridiculous load
      const load = box(.9, .7, .6, pick(['#c49a6c', '#3a86d4', '#e2433a'])); load.position.set(0, 1.0, -.9); g.add(load);
    }
    bake(g);
    g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.position.set(rand(-60, 75), 0, dir > 0 ? rand(1.3, 2.8) : rand(-2.8, -1.3));
    scene.add(g);
    traffic.push({ g, dir, speed: rand(5, 8.5), cur: 6, honk: 0, wheel: bike });
  }
}

export const blockers = []; // extra things motorbikes should stop for: {pos, len}
export function updateTraffic(dt, playerPos, onHonk) {
  for (const c of traffic) {
    const p = c.g.position;
    const ahead = (playerPos.x - p.x) * c.dir;
    const blocked = (ahead > 0 && ahead < 4.5 && Math.abs(playerPos.z - p.z) < 1.3) ||
      blockers.some((b) => { const a = (b.pos.x - p.x) * c.dir; return a > 0 && a < b.len + 3 && Math.abs(b.pos.z - p.z) < 1.8; });
    const target = blocked ? 0 : c.speed;
    c.cur += (target - c.cur) * Math.min(1, dt * (blocked ? 6 : 1.5));
    p.x += c.dir * c.cur * dt;
    c.honk -= dt;
    if (blocked && c.honk <= 0) { c.honk = 2.5; onHonk?.(p); }
    if (p.x > 80) p.x = -65;
    if (p.x < -65) p.x = 80;
    c.g.position.y = Math.sin(p.x * 2) * .015;
  }
}

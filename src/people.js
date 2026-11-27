import * as THREE from 'three';
import { box, sphere, cyl, mat, pick } from './util.js';

const SKINS = ['#e0a77a', '#d29468', '#c58558', '#eab48c'];
const SHIRTS = ['#3a86d4', '#e2433a', '#f4d35e', '#5fb36b', '#f28fb0', '#ffffff', '#9b6bd1', '#ff9f43'];
const PANTS = ['#2f3a4f', '#5b4636', '#33373d', '#6b5b95', '#1d3557'];

// Low-poly person, front faces +Z. Returns rig with limb pivots for animation.
export function makePerson({ skin = pick(SKINS), shirt = pick(SHIRTS), pants = pick(PANTS), hat = 'none', hair = '#1e1a18', scale = 1, female = false } = {}) {
  const g = new THREE.Group();
  const root = new THREE.Group(); g.add(root);

  const mkLeg = (x) => {
    const p = new THREE.Group(); p.position.set(x, .82, 0);
    const l = box(.19, .78, .21, pants); l.position.y = -.39; p.add(l);
    const f = box(.2, .1, .3, '#2a2420'); f.position.set(0, -.78, .05); p.add(f);
    root.add(p); return p;
  };
  const legL = mkLeg(-.13), legR = mkLeg(.13);

  const body = new THREE.Group(); body.position.y = .82; root.add(body);
  const torso = box(.52, .66, .3, shirt); torso.position.y = .36; body.add(torso);
  if (female) { const skirt = box(.56, .25, .34, shirt); skirt.position.y = .06; body.add(skirt); }

  const mkArm = (x) => {
    const p = new THREE.Group(); p.position.set(x, .64, 0);
    const a = box(.14, .56, .15, shirt); a.position.y = -.26; p.add(a);
    const h = box(.13, .13, .13, skin); h.position.y = -.6; p.add(h);
    body.add(p); return p;
  };
  const armL = mkArm(-.34), armR = mkArm(.34);

  const head = new THREE.Group(); head.position.y = .9; body.add(head);
  const skull = sphere(.21, skin, 1); skull.position.y = .12; head.add(skull);
  const hairM = sphere(.22, hair, 1); hairM.position.set(0, .17, -.04); hairM.scale.set(1, .8, .95); head.add(hairM);
  if (female) { const tail = box(.14, .32, .1, hair); tail.position.set(0, .0, -.2); head.add(tail); }
  const eyeMat = mat('#1a1410');
  for (const ex of [-.075, .075]) { const e = box(.045, .06, .02, eyeMat); e.position.set(ex, .14, .2); e.castShadow = false; head.add(e); }
  const cheek = mat('#f08a7a');
  for (const ex of [-.12, .12]) { const c = box(.05, .03, .02, cheek); c.position.set(ex, .07, .19); c.castShadow = false; head.add(c); }

  if (hat === 'nonla') {
    const n = new THREE.Mesh(new THREE.ConeGeometry(.46, .3, 12), mat('#e8d39a', { roughness: .7 }));
    n.position.y = .38; n.castShadow = true; head.add(n);
    const band = cyl(.21, .21, .03, 12, '#c0392b'); band.position.y = .25; head.add(band);
  } else if (hat === 'helmet') {
    const hm = sphere(.25, pick(['#e2433a', '#3a86d4', '#f4d35e', '#ffffff', '#2ecc71']), 1); hm.position.set(0, .2, -.02); hm.scale.set(1, .85, 1.05); head.add(hm);
  } else if (hat === 'cap') {
    const c = sphere(.23, '#e2433a', 1); c.position.set(0, .22, -.02); c.scale.set(1, .6, 1); head.add(c);
    const b = box(.3, .03, .2, '#e2433a'); b.position.set(0, .2, .2); head.add(b);
  }

  g.scale.setScalar(scale);
  const rig = { group: g, root, legL, legR, armL, armR, body, head, walkT: Math.random() * 10 };
  return rig;
}

// amount 0..1 blends idle -> full stride
export function animateWalk(rig, dt, speed) {
  const amt = Math.min(1, speed / 4);
  rig.walkT += dt * (4 + speed * 1.4);
  const s = Math.sin(rig.walkT) * .75 * amt;
  rig.legL.rotation.x = s; rig.legR.rotation.x = -s;
  rig.armL.rotation.x = -s * .8; rig.armR.rotation.x = s * .8;
  rig.root.position.y = Math.abs(Math.cos(rig.walkT)) * .07 * amt;
  if (amt < .05) { // idle breathe
    rig.body.scale.y = 1 + Math.sin(rig.walkT * .4) * .012;
  }
}

export function poseSit(rig, pedal = false, t = 0) {
  rig.legL.rotation.x = -1.3 + (pedal ? Math.sin(t) * .5 : 0);
  rig.legR.rotation.x = -1.3 + (pedal ? -Math.sin(t) * .5 : 0);
  rig.armL.rotation.x = -1.1; rig.armR.rotation.x = -1.1;
  rig.root.position.y = 0;
}

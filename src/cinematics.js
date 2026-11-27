import * as THREE from 'three';
import { $, anim, wait, easeInOutCubic, easeOutBack, easeInCubic, fmtMoney, rand } from './util.js';
import { world, LAYOUT } from './world.js';
import { G, PHASES } from './state.js';
import { player, buildVehicle } from './player.js';
import { bases, buildVillaParts } from './bases.js';
import { sfx, setMusicLevel } from './audio.js';
import { confetti, firework, shake, puff, sparkle } from './fx.js';
import { setCleanliness } from './street.js';
import { hud } from './hud.js';

const BASE_C = new THREE.Vector3(-37, 0, -13.5);
world.onFireworkPop = () => sfx.pop();

function banner(sub, title) {
  $('#banner-sub').textContent = sub;
  $('#banner-title').textContent = title;
  const b = $('#banner');
  b.classList.remove('hidden', 'out');
  return () => { b.classList.add('out'); setTimeout(() => b.classList.add('hidden'), 500); };
}

function camTo(cam, pos, look, dur) {
  const p0 = world.camera.position.clone(), l0 = cam.lookNow.clone();
  cam.mode = 'manual';
  return anim(dur, (e) => { cam.pos.lerpVectors(p0, pos, e); cam.look.lerpVectors(l0, look, e); }, easeInOutCubic);
}

export async function levelUpSequence(ctx, phase) {
  const { cam } = ctx;
  G.cutscene = true; player.frozen = true;
  hud.prompt(null); hud.indicators([]);
  const back = { pos: world.camera.position.clone(), look: cam.lookNow.clone() };
  await camTo(cam, new THREE.Vector3(-37, 8, 7), new THREE.Vector3(-37, 2.2, -13), 1.2);
  sfx.whoosh(); shake(.35);
  await bases.swapAnimated(phase);
  sfx.firecrackers(60); shake(.7);
  confetti(BASE_C.clone().setY(2), 140, 8);
  for (let i = 0; i < 4; i++) setTimeout(() => firework(BASE_C.clone().add(new THREE.Vector3(rand(-8, 8), 0, rand(2, 6)))), 300 + i * 450);
  sfx.fanfare();
  const hide = banner('LÊN ĐỜI!', `${PHASES[phase].icon} ${PHASES[phase].name}`);
  ctx.onPhase(phase);
  // slow orbit while celebrating
  const c0 = cam.pos.clone();
  await anim(3, (e) => { const a = (e - .5) * .5; cam.pos.set(-37 + Math.sin(a) * 20, 8 + e * 1.5, -13 + Math.cos(a) * 20); }, easeInOutCubic);
  hide();
  const gift = phase === 2 ? 60000 : 500000;
  ctx.addMoney(gift, BASE_C.clone().setY(2));
  hud.toast(`🧧 Lì xì khai trương: +${fmtMoney(gift)}`, 'gold', 3);
  if (phase === 2) setTimeout(() => hud.toast('🚲 Mở khóa: Xe đạp + 📢 Loa rao! Bấm SPACE để rao.', 'good', 4), 900);
  if (phase === 3) setTimeout(() => hud.toast('🏭 Giờ là đầu mối! Kho tự đầy — bấm T gọi xe tải nhà máy.', 'good', 4.5), 900);
  await camTo(cam, back.pos, back.look, 1);
  cam.mode = 'follow';
  G.cutscene = false; player.frozen = false;
  void c0;
}

export async function villaEnding(ctx) {
  const { cam } = ctx;
  G.cutscene = true; player.frozen = true; G.phase = 4;
  hud.hide();
  setMusicLevel(3);
  const V = LAYOUT.villa;
  $('#fade').classList.add('on');
  await wait(.7);
  world.scene.remove(world.villaLot);
  player.pos.set(V.x - 1, 0, -6.2); player.heading = Math.PI; player.group.rotation.y = Math.PI;
  G.clean = 1; setCleanliness(1);
  G.raining = false;
  cam.mode = 'manual';
  cam.pos.set(V.x - 14, 9, 14); cam.look.set(V.x, 3, -15); cam.lookNow.copy(cam.look);
  $('#fade').classList.remove('on');
  await wait(.6);

  const villa = new THREE.Group();
  villa.position.copy(V);
  world.scene.add(villa);
  const parts = buildVillaParts();
  const order = ['base', 'f1', 'cols', 'f2', 'roof', 'fence', 'gate', 'lions', 'garden'];
  const orbit = anim(order.length * .75 + 2.5, (e) => {
    const a = -.5 + e * .62;
    cam.pos.set(V.x + Math.sin(a) * 28, 9 + e * 4, V.z + Math.cos(a) * 28);
    cam.look.set(V.x + e * 7, 3.5 + e * 1.5, V.z);
  }, (t) => t);
  for (const grp of order) {
    const ps = parts.filter((p) => p.userData.group === grp);
    ps.forEach((p, i) => {
      const y = p.position.y;
      villa.add(p);
      p.position.y = y + 14;
      p.visible = false;
      setTimeout(() => {
        p.visible = true;
        anim(.5, (e) => { p.position.y = y + 14 * (1 - e); }, easeInCubic).then(() => {
          shake(.18); sfx.thud();
          puff(villa.position.clone().add(new THREE.Vector3(p.position.x, .3, p.position.z)), '#efe3cc', 4, .5);
        });
      }, i * 70);
    });
    await wait(.55 + ps.length * .07);
    if (grp === 'roof') { sfx.fanfare(); sparkle(V.clone().setY(12), '#ffe27a', 30); }
  }
  // the memento: first ba gác kept in the yard
  const bg = buildVehicle('bagac');
  bg.position.set(V.x + 4.6, .5, V.z + 3.6); bg.rotation.y = -.7;
  villa.parent.add(bg);
  bg.scale.setScalar(0); anim(.6, (e) => bg.scale.setScalar(e), easeOutBack);
  // fake spotlight: additive light cone (a real SpotLight would recompile every shader mid-cutscene)
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 8, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff1c4', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(bg.position.x, 4.4, bg.position.z);
  world.scene.add(beam);
  sparkle(bg.position.clone().setY(1.2), '#fff6b0', 24);
  hud.show();
  $('#hud-left').classList.add('hidden'); $('#hud-right').classList.add('hidden'); $('#actions').classList.add('hidden'); $('#objective').classList.add('hidden');
  hud.toast('🛺 Kỷ vật: chiếc ba gác đầu tiên', 'gold', 5);
  await orbit;
  // celebrate forever
  sfx.firecrackers(80); confetti(V.clone().setY(3), 200, 9);
  const fw = () => { if (G.phase === 4) firework(V.clone().add(new THREE.Vector3(rand(-12, 12), 0, rand(-6, 6)))); };
  setInterval(fw, 700);
  const mm = Math.floor(G.playTime / 60), ss = Math.floor(G.playTime % 60);
  $('#end-stats').innerHTML = [
    ['⏱ Thời gian', `${mm} phút ${String(ss).padStart(2, '0')} giây`],
    ['♻️ Ve chai đã nhặt', `${G.collected} món`],
    ['⚖️ Lần mặc cả thành công', `${G.deals}`],
    ['🚚 Chuyến xe nhà máy', `${G.trucks}`],
    ['💰 Tổng thu nhập', fmtMoney(G.earned)],
    ['🌿 Phố sạch', '100%'],
  ].map(([a, b]) => `<div class="result-line"><span>${a}</span><b>${b}</b></div>`).join('');
  $('#ending').classList.remove('hidden');
  // slow idle orbit behind the card
  let a = 0;
  world.updaters.push((dt) => { a += dt; const s = .12 + Math.sin(a * .12) * .14; cam.pos.set(V.x + Math.sin(s) * 29, 13, V.z + Math.cos(s) * 29); cam.look.set(V.x + 7, 4.5, V.z); });
}

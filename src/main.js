// only the subsets we use: everything gets inlined into the single-file build
import '@fontsource/baloo-2/latin-500.css';
import '@fontsource/baloo-2/vietnamese-500.css';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/vietnamese-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/vietnamese-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-2/vietnamese-800.css';
import './style.css';
import * as THREE from 'three';
import { initWorld, world, LAYOUT, followSun, setRainLevel, updateOccluders, renderFrame } from './world.js';
import { gfx } from './settings.js';
import { buildCity } from './city.js';
import { buildStreet, updateTraffic, setCleanliness, blockers } from './street.js';
import { items } from './items.js';
import { player } from './player.js';
import { bases, makeTruck } from './bases.js';
import { neighbours, helpers } from './npc.js';
import { hud } from './hud.js';
import { initAudio, sfx, sayLoa, toggleMute, setRain, setMusicLevel } from './audio.js';
import { updateFx, floatText, flyToEl, worldToScreen, puff, sparkle, shake, shakeOffset, initRain, updateRain, confetti } from './fx.js';
import { G, tool, lvl, capUsed, incomeMul, potentialRate, ITEM_TYPES, PHASE_ITEM_MUL, TOOLS, EXTRAS, HOMES, VILLA_COST, P3, SEC_PER_YEAR, PHASES, SORT_ORDER, GOODS } from './state.js';
import { $, anim, tickAnims, damp, rand, clamp, fmtMoney, fmtEta, easeInOutCubic, wait, pick } from './util.js';
import { runSort } from './minigames/sort.js';
import { runCrush } from './minigames/crush.js';
import { runHaggle } from './minigames/haggle.js';
import { runTruck } from './minigames/truck.js';
import { runDisassemble } from './minigames/disassemble.js';
import { openMG, closeMG } from './minigames/common.js';
import { faceSVG, ICON } from './icons.js';
import { levelUpSequence, villaEnding } from './cinematics.js';

// ---------------------------------------------------------------- boot
await Promise.all(['600', '700', '800'].map((w) => document.fonts.load(`${w} 40px "Baloo 2"`, 'ĐẤT BÁN Ữ ỡ')));
initWorld($('#c'));
gfx.init();
const { scene, camera } = world;
buildCity(scene);
buildStreet(scene);
items.init(scene);
player.init(scene);
bases.init(scene);
neighbours.init(scene);
helpers.init(scene);
initRain(scene);
player.setTool(tool(), false);
player.setCargoFill(0, 0);
// compile effect shaders up front (out of sight) so the first confetti/sparkle doesn't stutter
{ const far = new THREE.Vector3(0, 6, -300); confetti(far, 2); sparkle(far, '#fff', 2); puff(far, '#fff', 2); world.renderer.compile(scene, camera); }

// ---------------------------------------------------------------- camera
export const cam = {
  mode: 'title', // title | follow | manual
  pos: new THREE.Vector3(), look: new THREE.Vector3(),
  off: new THREE.Vector3(0, 15.5, 17),
};
camera.position.set(0, 14, 24);

function updateCamera(dt, t) {
  if (cam.mode === 'title') {
    const x = Math.sin(t * .06) * 26 - 4;
    cam.pos.set(x, 11, 21); cam.look.set(x * .85 - 3, 2.5, -6);
    camera.position.lerp(cam.pos, 1 - Math.exp(-2 * dt));
  } else if (cam.mode === 'follow') {
    const zoom = 1 + (tool().speed - 5) * .025;
    cam.look.copy(player.pos).addScaledVector(player.vel, .12); cam.look.y += 1;
    cam.pos.copy(cam.look).addScaledVector(cam.off, zoom);
    camera.position.x = damp(camera.position.x, cam.pos.x, 9, dt);
    camera.position.y = damp(camera.position.y, cam.pos.y, 9, dt);
    camera.position.z = damp(camera.position.z, cam.pos.z, 9, dt);
  } else camera.position.copy(cam.pos);
  camera.position.add(shakeOffset);
  if (!cam.lookNow) cam.lookNow = cam.look.clone();
  cam.lookNow.lerp(cam.look, cam.mode === 'manual' ? 1 : 1 - Math.exp(-12 * dt));
  camera.lookAt(cam.lookNow);
  followSun(cam.mode === 'follow' ? player.pos : cam.look);
}

// ---------------------------------------------------------------- input
const keys = { up: false, down: false, left: false, right: false };
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (!G.started || G.cutscene) return;
  if (e.code === 'KeyM') { const m = toggleMute(); hud.toast(m ? '🔇 Tắt tiếng' : '🔊 Bật tiếng'); }
  if (e.code === 'KeyF') gfx.toggleFps();
  if (e.code === 'Backquote' && DEBUG) $('#debug').classList.toggle('hidden');
  if (e.code === 'KeyG' && (!G.paused || gfx.isOpen)) { gfx.toggle(); return; }
  if (e.code === 'Escape' && gfx.isOpen) { gfx.close(); return; }
  if (e.code === 'Escape' && !$('#shop').classList.contains('hidden')) closeShop();
  if (G.paused) return;
  if (e.code === 'KeyB') openShop();
  if (e.code === 'KeyL') tryLevelUp();
  if (e.code === 'Space') { e.preventDefault(); toggleLoa(); }
  if (e.code === 'KeyT') callTruck();
  if (e.code === 'KeyE') interact();
  if (e.code === 'BracketRight' && G.judge) { // presenter safety net (judge mode only)
    const next = HOMES[G.phase + 1]; if (next) addMoney(next.cost * .5, null, true);
  }
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

$('#btn-shop').onclick = () => !G.paused && !G.cutscene && openShop();
$('#btn-gfx').onclick = () => !G.paused && !G.cutscene && gfx.open();
gfx.onToggle = (open) => { if (G.started) G.paused = open; };
$('#btn-levelup').onclick = () => !G.paused && !G.cutscene && tryLevelUp();
$('#btn-loa').onclick = () => !G.paused && !G.cutscene && toggleLoa();
$('#btn-truck').onclick = () => !G.paused && !G.cutscene && callTruck();
$('#shop [data-close]').onclick = closeShop;
$('#shop').addEventListener('pointerdown', (e) => { if (e.target.id === 'shop') closeShop(); });

$('#btn-start').onclick = () => {
  initAudio();
  if (world.softwareGL) setTimeout(() => hud.toast('⚠️ Trình duyệt đang vẽ 3D bằng CPU nên sẽ giật. Bấm <b>G</b> (⚙️ Đồ họa) để chỉnh và xem cách sửa.', 'bad', 10), 1500);
  G.judge = $('#judge-mode').checked;
  $('#judge-tag').classList.toggle('hidden', !G.judge);
  $('#title').classList.add('out');
  setTimeout(() => $('#title').classList.add('hidden'), 800);
  hud.show();
  $('#debug')?.classList.remove('hidden');
  G.started = true;
  cam.mode = 'follow';
  sfx.fanfare();
  setTimeout(() => hud.toast('Gầm cầu, 5 giờ chiều. Trong túi: 0đ. Ước mơ: một căn biệt thự.', '', 4.5), 600);
};
$('#btn-replay').onclick = () => location.reload();
// buttons must not keep focus, or Space/Enter would re-trigger them during play
addEventListener('click', (e) => e.target.closest?.('button')?.blur());

// ---------------------------------------------------------------- economy helpers
function addMoney(amount, fromWorld, silent = false) {
  amount = Math.round(amount);
  G.money += amount;
  if (amount > 0) G.earned += amount;
  if (silent) return;
  const from = fromWorld ? worldToScreen(fromWorld) : { x: innerWidth / 2, y: innerHeight / 2 };
  flyToEl(from, $('#money'), Math.min(14, 4 + Math.round(Math.log10(Math.max(10, amount)))), amount > 1e6 ? 'note' : 'coin', (i) => { if (i % 2 === 0) sfx.coin(); hud.bumpMoney(); });
}

function itemValue(c) {
  if (c.good) return c.good.value;
  return ITEM_TYPES[c.type].value * PHASE_ITEM_MUL[G.phase] * (c.wet ? .5 : 1);
}

function updateClean() {
  G.clean = clamp(G.collected / 260, 0, 1);
  setCleanliness(G.clean);
}

function etaText() { return fmtEta(Math.max(0, VILLA_COST - G.money) / potentialRate(), SEC_PER_YEAR); }

// ---------------------------------------------------------------- shop
const shopActions = {
  buyTool(i) {
    const t = TOOLS[i];
    if (G.money < t.cost) return;
    const before = etaText();
    G.money -= t.cost;
    G.toolIdx = i;
    player.setTool(t);
    player.setCargoFill(capUsed() / t.cap);
    sfx.buy(); confetti(player.pos.clone().setY(1), 25, 3);
    hud.toast(`${t.icon} ${t.name}! ${t.desc}`, 'good');
    etaToast(before);
    hud.renderShop(shopActions);
  },
  buyExtra(id) {
    const x = EXTRAS.find((e) => e.id === id);
    const cost = x.costs[lvl(id)];
    if (G.money < cost) return;
    const before = etaText();
    G.money -= cost;
    G.extras[id] = lvl(id) + 1;
    sfx.buy();
    if (id === 'em') { helpers.add(); hud.toast('🧒 Thằng em đã vào việc! Nó tự đi nhặt rồi mang về.', 'good', 3); }
    else hud.toast(`${x.icon} ${x.name}: ${x.desc}`, 'good');
    etaToast(before);
    hud.renderShop(shopActions);
  },
  levelUp() { closeShop(); tryLevelUp(); },
};
function etaToast(before) {
  const after = etaText();
  if (after !== before) { hud.etaDrop(); setTimeout(() => hud.toast(`⏳ Biệt thự: ${before} → <b>${after}</b>!`, 'gold', 3), 400); }
}
function openShop() { G.paused = true; hud.renderShop(shopActions); $('#shop').classList.remove('hidden'); sfx.open(); }
function closeShop() { $('#shop').classList.add('hidden'); G.paused = false; sfx.close(); }

// ---------------------------------------------------------------- phase transitions
async function tryLevelUp() {
  const next = HOMES[G.phase + 1];
  if (!next) return;
  if (G.money < next.cost) {
    hud.toast(`Cần ${fmtMoney(next.cost)} để ${G.phase >= 3 ? 'xây biệt thự' : 'lên ' + next.name} (còn thiếu ${fmtMoney(next.cost - G.money)})`, 'bad');
    sfx.bad(); return;
  }
  G.money -= next.cost;
  if (next.phase === 4) { $('#debug')?.classList.add('hidden'); return villaEnding(ctx); }
  await levelUpSequence(ctx, next.phase);
}

const ctx = {
  cam, addMoney, hud,
  onPhase(phase) {
    G.phase = phase;
    setMusicLevel(phase);
    if (phase === 2) {
      const bi = TOOLS.findIndex((t) => t.id === 'bike');
      if (G.toolIdx < bi) { G.toolIdx = bi; player.setTool(tool()); }
      $('#btn-loa').classList.remove('hidden');
      items.max = 32;
    }
    if (phase === 3) {
      G.loa = false; $('#btn-loa').classList.add('hidden');
      neighbours.clear();
      $('#btn-truck').classList.remove('hidden');
      G.stock = P3.startStock;
    }
    player.setCargoFill(capUsed() / tool().cap);
  },
};

// ---------------------------------------------------------------- debug panel: always on, shown once the game starts (` hides it)
const DEBUG = true; // set false to ship without it
function debugJump(p) {
  if (p === 4) { // the ending plays its real cutscene
    if (G.phase < 3) debugJump(3);
    G.money = Math.max(G.money, VILLA_COST);
    return tryLevelUp();
  }
  bases.set(p, false);
  const bike = TOOLS.findIndex((t) => t.id === 'bike');
  G.toolIdx = Math.min(G.toolIdx, TOOLS.findLastIndex((t) => t.phase <= p));
  if (p >= 2) G.toolIdx = Math.max(G.toolIdx, bike);
  player.setTool(tool());
  if (p !== 2) { // undo phase-2 bits when jumping away from it
    G.loa = false; neighbours.clear();
    $('#btn-loa').classList.add('hidden'); $('#btn-loa').classList.remove('on'); $('#btn-loa span').textContent = 'Bật loa';
  }
  if (p < 3) { $('#btn-truck').classList.add('hidden'); G.stock = 0; bases.setStock(0, P3.stockCap); }
  G.cargo = [];
  ctx.onPhase(p);
  readyWarned = 0;
  hud.toast(`🐞 Chuyển tới phase ${p}: ${PHASES[p].name}`, 'gold');
}
// open any minigame with sample data, from any phase; practice only, no money changes
async function debugMinigame(k) {
  G.paused = true;
  let msg;
  if (k === 'sort') {
    const r = await runSort(Array.from({ length: 10 }, () => ({ type: pick(SORT_ORDER) })));
    msg = `${r.ok}/${r.total} chuẩn · giá ×${r.mult.toFixed(2).replace('.', ',')}`;
  } else if (k === 'crush') {
    const r = await runCrush(8);
    msg = `${r.total} lon trong ${r.secs.toFixed(1).replace('.', ',')}s · lon ×${r.mult.toFixed(2).replace('.', ',')}`;
  } else if (k === 'haggle') {
    const female = Math.random() < .5;
    const r = await runHaggle({ good: pick(GOODS), name: female ? 'Cô Ba' : 'Chú Bảy', female });
    msg = r.deal ? `chốt giá ${fmtMoney(r.paid)} (bán lại ${fmtMoney(r.value)})` : r.angry ? 'người bán giận bỏ đi' : 'không mua';
  } else if (k === 'dis') {
    const r = await runDisassemble(GOODS.filter((g) => g.elec).sort(() => Math.random() - .5).slice(0, 3));
    msg = `${r.copper.toFixed(1).replace('.', ',')} kg đồng · giá ×${r.mult.toFixed(2).replace('.', ',')}`;
  } else {
    const r = await runTruck({ stock: 45, cols: 10, rows: 5, cellValue: P3.cellValue, market: G.market });
    msg = `xếp kín ${Math.round(r.fill * 100)}% · ${fmtMoney(r.payout)}`;
  }
  G.paused = false;
  hud.toast(`🐞 Thử minigame: ${msg} (không tính tiền)`, 'gold', 3.5);
}
if (DEBUG) {
  const d = document.createElement('div');
  d.id = 'debug'; d.className = 'hidden';
  d.innerHTML = '<b>🐞 Debug</b><button data-p="1">Phase 1 · Gầm cầu</button><button data-p="2">Phase 2 · Vựa nhỏ</button><button data-p="3">Phase 3 · Vựa lớn</button><button data-p="4">🏰 Cảnh kết</button><b>Thử minigame</b><button data-mg="crush">🥫 Đập lon</button><button data-mg="sort">♻️ Phân loại</button><button data-mg="haggle">⚖️ Cân &amp; mặc cả</button><button data-mg="dis">🔧 Tháo đồ điện</button><button data-mg="truck">🚚 Xếp xe tải</button><b>Khác</b><button data-a="money">+ Tiền (½ mốc kế)</button><button data-a="stock">Đầy kho (phase 3)</button><button data-a="rain">Cho mưa</button>';
  document.body.appendChild(d);
  d.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || !G.started || G.paused || G.cutscene) return;
    sfx.click();
    if (b.dataset.p) return debugJump(+b.dataset.p);
    if (b.dataset.mg) return debugMinigame(b.dataset.mg);
    if (b.dataset.a === 'money') addMoney(Math.max(100000, (HOMES[G.phase + 1]?.cost || 0) * .5), player.pos);
    if (b.dataset.a === 'stock' && G.phase >= 3) G.stock = P3.stockCap;
    if (b.dataset.a === 'rain' && G.phase <= 2) rainTimer = 0;
  };
  $('.controls').insertAdjacentHTML('beforeend', '<span><kbd>`</kbd> debug</span>');
}

// ---------------------------------------------------------------- deliveries
let deliverCooldown = 0;
async function deliver() {
  const cargo = G.cargo;
  if (!cargo.length) return;
  deliverCooldown = 2.5;
  if (G.phase === 1) {
    G.paused = true;
    const base = cargo.reduce((s, c) => s + itemValue(c), 0) * incomeMul();
    const cans = cargo.filter((c) => c.type === 'can');
    const canV = cans.reduce((s, c) => s + itemValue(c), 0) * incomeMul();
    const choice = await choose('Về tới gầm cầu! 🏚️', 'Chú Tư ghé thu mua. Phân loại sạch sẽ thì được giá hơn.',
      cans.length
        ? { ic: '🥫', nm: 'Đập lon, phân loại rồi bán', ds: 'Minigame ~20 giây · lon bẹp đến +30% · phân loại đến ×1,3', val: `đến ${fmtMoney((base + canV * .3) * 1.3)}` }
        : { ic: '♻️', nm: 'Phân loại rồi bán', ds: 'Minigame ~15 giây · thưởng đến ×1,3', val: `đến ${fmtMoney(base * 1.3)}` },
      { ic: '⚡', nm: 'Bán xô luôn', ds: 'Không phân loại · chú Tư ép giá ×0,8', val: fmtMoney(base * .8) });
    let mult = .8, result = null, crush = null;
    if (choice === 'a') {
      if (cans.length) crush = await runCrush(cans.length);
      result = await runSort(cargo); mult = result.mult;
    }
    await sellCard(cargo, mult, result, crush);
    G.cargo = [];
    player.setCargoFill(0);
    G.paused = false;
  } else if (G.phase === 2) {
    // electrical goods can be stripped for copper first (minigame) for a better price
    const elec = cargo.filter((c) => c.good?.elec);
    let mult = 1, dis = null;
    if (elec.length) {
      G.paused = true;
      const ev = elec.reduce((s, c) => s + itemValue(c), 0) * incomeMul();
      const choice = await choose('Về tới vựa! 🏪', `Có ${elec.length} món đồ điện cũ. Tháo ra lấy đồng thì đại lý trả giá cao hơn.`,
        { ic: '🔧', nm: 'Tháo lấy đồng', ds: `Minigame ~${Math.min(3, elec.length) * 6} giây · đồ điện đến ×1,6`, val: `đến ${fmtMoney(ev * 1.6)}` },
        { ic: '📦', nm: 'Bán nguyên con', ds: 'Không tháo · giá thường', val: fmtMoney(ev) });
      if (choice === 'a') { dis = await runDisassemble(elec.map((c) => c.good)); mult = dis.mult; }
      G.paused = false;
    }
    const total = cargo.reduce((s, c) => s + itemValue(c) * (c.good?.elec ? mult : 1), 0) * incomeMul();
    const goods = cargo.filter((c) => c.good).length;
    addMoney(total, LAYOUT.base);
    sfx.cash();
    hud.toast(`💰 Đại lý ông Bảy gom hết: +${fmtMoney(total)}${dis ? ` (đồng sạch ×${mult.toFixed(2).replace('.', ',')})` : goods ? ` (${goods} món đồ mua lại)` : ''}`, 'good', 3);
    G.cargo = []; player.setCargoFill(0);
  } else {
    const cells = cargo.length / P3.itemsPerCell;
    G.stock = Math.min(P3.stockCap, G.stock + cells);
    sfx.thud();
    hud.toast(`📦 +${cells.toFixed(1).replace('.', ',')} kiện vào kho`, 'good');
    G.cargo = []; player.setCargoFill(0);
  }
  sparkle(LAYOUT.base.clone().setY(1), '#ffe27a', 16);
}

// two-option panel before a delivery minigame; resolves 'a' (play) or 'b' (skip)
function choose(title, sub, a, b) {
  const card = (o, k) => `<button class="choice c-${k}"><div class="ic">${o.ic}</div><div class="nm">${o.nm}</div><div class="ds">${o.ds}</div><div class="val">${o.val}</div></button>`;
  return new Promise((res) => {
    const p = openMG(`<div class="panel-head"><div><h2>${title}</h2><div class="mg-sub">${sub}</div></div></div><div class="choice-grid">${card(a, 'a')}${card(b, 'b')}</div>`);
    p.querySelector('.c-a').onclick = () => { closeMG(); res('a'); };
    p.querySelector('.c-b').onclick = () => { closeMG(); res('b'); };
  });
}

function sellCard(cargo, mult, result, crush) {
  return new Promise((res) => {
    const counts = {};
    for (const c of cargo) { const k = c.type + (c.wet ? '_wet' : ''); counts[k] = counts[k] || { n: 0, v: 0, c }; counts[k].n++; counts[k].v += itemValue(c); }
    const base = cargo.reduce((s, c) => s + itemValue(c), 0);
    // flattened cans: bonus on the cans' value, then the sort multiplier applies to everything
    const crushBonus = crush ? cargo.filter((c) => c.type === 'can').reduce((s, c) => s + itemValue(c), 0) * (crush.mult - 1) : 0;
    const total = Math.round((base + crushBonus) * mult * incomeMul());
    const stars = result ? result.stars : 0;
    const lines = Object.values(counts).map(({ n, v, c }) => `<div class="result-line"><span>${ICON[c.type](c.wet).replace('<svg', '<svg style="width:22px;height:22px;vertical-align:middle"')} ${ITEM_TYPES[c.type].name}${c.wet ? ' (ướt)' : ''} ×${n}</span><b>${fmtMoney(v)}</b></div>`).join('');
    const say = !result ? 'Đồ lộn xộn quá, chú lấy giá xô thôi nghen.' : stars >= 3 ? 'Trời, phân loại sạch bong! Chú trả giá cao nhất luôn!' : stars === 2 ? 'Được đó con, gọn gàng ghê.' : stars === 1 ? 'Cũng tạm, lần sau kỹ hơn nha.' : 'Lộn xộn quá con ơi...';
    const p = openMG(`
      <div class="panel-head"><h2>Chú Tư thu mua 💵</h2></div>
      ${result ? `<div class="stars">${[0, 1, 2].map((i) => `<span>⭐</span>`).join('')}</div>` : ''}
      ${lines}
      ${crush ? `<div class="result-line"><span>🥫 Lon đập bẹp (${crush.total} lon, ${crush.secs.toFixed(1).replace('.', ',')}s)</span><b>+${fmtMoney(crushBonus)}</b></div>` : ''}
      <div class="result-line"><span>${result ? `Thưởng phân loại (${result.ok}/${result.total} chuẩn${result.maxCombo >= 8 ? ', combo dài!' : ''})` : 'Bán xô (ép giá)'}</span><b>×${mult.toFixed(2).replace('.', ',')}</b></div>
      ${G.judge ? '<div class="result-line"><span>Chế độ giám khảo</span><b>×3</b></div>' : ''}
      <div class="result-total">+${fmtMoney(total)}</div>
      <div class="seller"><div class="face">${faceSVG(stars >= 2 ? 2 : stars === 1 ? 1 : 0, { female: false, skin: '#c58558', hair: '#3a3a3a' })}</div><div class="say">“${say}”</div></div>
      <div class="mg-row"><button class="big-btn green btn-take">Nhận tiền 💵 <kbd>Enter</kbd></button></div>`, 'mg-panel sell-panel');
    p.style.width = 'min(520px, 94vw)';
    p.querySelectorAll('.stars span').forEach((s, i) => { if (i < stars) setTimeout(() => { s.classList.add('on'); sfx.good(); }, 300 + i * 280); });
    const take = () => {
      removeEventListener('keydown', onKey, true);
      const r = p.querySelector('.result-total').getBoundingClientRect();
      closeMG();
      addMoney(total, null, true);
      flyToEl({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, $('#money'), 12, 'note', (i) => { if (i % 2 === 0) sfx.coin(); hud.bumpMoney(); });
      sfx.cash();
      res();
    };
    const onKey = (e) => { if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); take(); } };
    addEventListener('keydown', onKey, true);
    p.querySelector('.btn-take').onclick = take;
  });
}

// ---------------------------------------------------------------- phase 2: loa + neighbours
let loaTimer = 0;
function toggleLoa() {
  if (G.phase !== 2) return;
  G.loa = !G.loa;
  $('#btn-loa').classList.toggle('on', G.loa);
  $('#btn-loa span').textContent = G.loa ? 'Đang rao…' : 'Bật loa';
  if (G.loa) { loaTimer = 0; hud.toast('📢 “Ai ve chai đồng nát bán hông…”', 'gold', 2.5); }
}
function loaRing() {
  const r = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color: '#ffd36e', transparent: true, opacity: .7, depthWrite: false, toneMapped: false }));
  r.rotation.x = -Math.PI / 2; r.position.copy(player.pos).setY(.3);
  scene.add(r);
  const R = lvl('loa') ? 30 : 18;
  anim(1.4, (e) => { r.scale.setScalar(1 + e * R); r.material.opacity = .7 * (1 - e); }).then(() => { scene.remove(r); r.geometry.dispose(); r.material.dispose(); });
}

let nearNb = null;
async function interact() {
  if (nearNb) {
    const nb = nearNb;
    if (capUsed() + nb.good.slots > tool().cap) { hud.toast('Xe đầy rồi! Về vựa bán bớt đã.', 'bad'); sfx.full(); return; }
    G.paused = true;
    const res = await runHaggle(nb, G.money);
    G.paused = false;
    if (res.deal) {
      G.money -= res.paid; G.deals++;
      G.cargo.push({ type: 'good', good: nb.good, slots: nb.good.slots });
      neighbours.handOver(nb);
      player.setCargoFill(capUsed() / tool().cap);
      player.bump(); sfx.good();
      floatText(player.pos, `${nb.good.icon} lời ~${fmtMoney(res.value * incomeMul() - res.paid)}`, 'money');
    } else neighbours.leave(nb, res.angry);
  }
}

// ---------------------------------------------------------------- phase 3: truck
let truckBusy = false;
async function callTruck() {
  if (G.phase < 3 || truckBusy) return;
  if (G.stock < P3.minTruck) { hud.toast(`Kho cần ít nhất ${P3.minTruck} kiện mới gọi xe (đang có ${Math.floor(G.stock)})`, 'bad'); sfx.bad(); return; }
  truckBusy = true;
  G.cutscene = true; player.frozen = true;
  const truck = makeTruck();
  truck.position.set(-80, 0, -2.2);
  scene.add(truck);
  const blk = { pos: truck.position, len: 5 };
  blockers.push(blk);
  sfx.engine(); sfx.honk();
  cam.mode = 'manual';
  const p0 = camera.position.clone(), l0 = cam.lookNow.clone();
  const p1 = new THREE.Vector3(-34, 9, 14), l1 = new THREE.Vector3(-37, 1.5, -5);
  await anim(1.6, (e) => { truck.position.x = -80 + e * 46; cam.pos.lerpVectors(p0, p1, e); cam.look.lerpVectors(l0, l1, e); }, easeInOutCubic);
  puff(truck.position.clone().setY(.4), '#d9c8b4', 12, .5);
  const big = lvl('truck') > 0;
  const res = await runTruck({ stock: G.stock, cols: big ? 12 : 10, rows: big ? 6 : 5, cellValue: P3.cellValue * (lvl('press') ? 1.5 : 1) * incomeMul(), market: G.market });
  G.stock = Math.max(0, G.stock - res.placed);
  G.trucks++;
  addMoney(res.payout, truck.position.clone().setY(2));
  sfx.cash(); confetti(truck.position.clone().setY(3), 40, 4);
  hud.toast(`🚚 Chuyến ${G.trucks}: xếp kín ${Math.round(res.fill * 100)}% → +${fmtMoney(res.payout)}`, 'gold', 3.5);
  sfx.engine();
  await anim(1.8, (e) => { truck.position.x = -34 + e * e * 120; cam.pos.lerpVectors(p1, p0, e); cam.look.lerpVectors(l1, l0, e); }, easeInOutCubic);
  scene.remove(truck);
  blockers.splice(blockers.indexOf(blk), 1);
  cam.mode = 'follow'; G.cutscene = false; player.frozen = false; truckBusy = false;
}

// ---------------------------------------------------------------- helpers delivering
function onHelperDeliver(carry, pos) {
  if (G.phase >= 3) { G.stock = Math.min(P3.stockCap, G.stock + carry.length / P3.itemsPerCell); floatText(pos, `📦 +${(carry.length / P3.itemsPerCell).toFixed(1)} kiện`); return; }
  const v = carry.reduce((s, t) => s + ITEM_TYPES[t].value * PHASE_ITEM_MUL[G.phase], 0) * incomeMul();
  G.money += v; G.earned += v;
  G.collected += carry.length; updateClean();
  floatText(pos, `🧒 +${fmtMoney(v)}`, 'money');
  sfx.coin();
}

// ---------------------------------------------------------------- objectives
function updateObjective() {
  const t = tool(), next = TOOLS[G.toolIdx + 1], home = HOMES[G.phase + 1];
  const full = capUsed() >= t.cap;
  let o;
  if (G.phase === 1) {
    if (G.earned === 0 && !full) o = G.cargo.length ? `Nhặt tiếp! Đầy ${t.cap} món thì về <b>gầm cầu</b> 🏚️` : 'Đi nhặt ve chai quanh phố <b>(W A S D)</b>';
    else if (full) o = 'Đầy rồi! Mang về <b>gầm cầu</b> bán cho chú Tư 🏚️';
    else if (G.money >= home.cost) o = '⭐ Đủ vốn! Bấm <b>LÊN ĐỜI (L)</b> để mở vựa nhỏ';
    else if (next && next.phase <= G.phase && G.money >= next.cost) o = `🛒 Đủ tiền mua <b>${next.name}</b> — bấm <b>B</b>`;
    else o = `Gom vốn lên <b>Vựa ve chai nhỏ</b>: ${fmtMoney(G.money)} / ${fmtMoney(home.cost)}`;
  } else if (G.phase === 2) {
    if (full) o = 'Xe đầy! Về <b>vựa</b> bán cho đại lý 🏪';
    else if (!G.loa) o = 'Bấm <b>SPACE</b> bật loa: “Ai ve chai đồng nát bán hông…” 📢';
    else if (neighbours.list.some((n) => n.state === 'wait')) o = 'Chạy tới chỗ người đang <b>vẫy tay</b>, bấm <b>E</b> để mua đồ';
    else if (G.money >= home.cost) o = '⭐ Đủ vốn! Bấm <b>LÊN ĐỜI (L)</b> mở vựa lớn';
    else o = `Vừa rao vừa nhặt. Mục tiêu <b>Vựa lớn</b>: ${fmtMoney(G.money)} / ${fmtMoney(home.cost)}`;
  } else {
    if (G.money >= VILLA_COST) o = '🏰 <b>ĐỦ TIỀN!</b> Bấm <b>L</b> để xây biệt thự';
    else if (G.stock >= P3.minTruck) o = `Kho có ${Math.floor(G.stock)} kiện — bấm <b>T</b> gọi xe tải (giá ×${G.market.toFixed(2).replace('.', ',')}${G.market > 1.15 ? ' 🔥 đang cao!' : ''})`;
    else o = `Kho đang đầy dần… Mục tiêu <b>biệt thự</b>: ${fmtMoney(G.money)} / ${fmtMoney(VILLA_COST)}`;
  }
  hud.objective(o);
}

// ---------------------------------------------------------------- main loop
let lastNow = performance.now();
let time = 0, fullWarned = false, rainTimer = rand(55, 80), rainLeft = 0, rainK = 0, marketT = 0, readyWarned = 0, honkCd = 0;

function gameplay(dt) {
  G.playTime += dt;
  const t = tool();
  player.update(dt, time, keys, t.speed, t.radius);

  // pickups
  const picked = items.attract(dt, player.pos, t.radius, () => capUsed() < t.cap);
  for (const it of picked) {
    const wet = it.wet || (G.raining && it.type === 'paper' && !lvl('tarp'));
    G.cargo.push({ type: it.type, wet });
    G.collected++;
    items.flyTo(it, () => player.carryPoint()).then(() => { player.bump(); player.setCargoFill(capUsed() / t.cap); });
    sfx.pickup(capUsed());
    floatText(it.pos, `+1 ${ITEM_TYPES[it.type].name}${wet ? ' 💧' : ''}`, wet ? 'bad' : '');
    updateClean();
  }
  const full = capUsed() >= t.cap;
  if (full && !fullWarned) { fullWarned = true; sfx.full(); hud.toast(G.phase === 1 ? 'Đầy bao rồi! Về gầm cầu bán thôi 🏚️' : 'Đầy xe! Về vựa thôi', 'bad'); }
  if (!full) fullWarned = false;

  // base drop-off
  deliverCooldown -= dt;
  const atBase = player.pos.distanceTo(LAYOUT.base) < 2.3;
  if (atBase && G.cargo.length && deliverCooldown <= 0) deliver();

  // phase 2 loa & neighbours
  if (G.phase === 2) {
    const R = lvl('loa') ? 30 : 18;
    if (G.loa) {
      loaTimer -= dt;
      if (loaTimer <= 0) { loaTimer = 7; sayLoa(); }
      if (Math.floor(time * 1.4) !== Math.floor((time - dt) * 1.4)) loaRing();
    }
    neighbours.update(dt, time, G.loa, R, player.pos, lvl('loa') ? 3 : 5.5);
  }
  nearNb = neighbours.nearestWaiting(player.pos, 2.6) || null;
  helpers.update(dt, time, onHelperDeliver);

  // phase 3 stock + market
  if (G.phase >= 3) {
    const rate = P3.baseStockRate + lvl('moi') * P3.moiRate;
    G.stock = Math.min(P3.stockCap, G.stock + rate * dt);
    bases.setStock(G.stock, P3.stockCap);
    const tl = `Gọi xe tải (${Math.floor(G.stock)} kiện)`, tb = $('#btn-truck span');
    if (tb.textContent !== tl) tb.textContent = tl;
    const pulse = G.stock >= P3.stockCap * .8;
    if ($('#btn-truck').classList.contains('pulse') !== pulse) $('#btn-truck').classList.toggle('pulse', pulse);
  }
  marketT -= dt;
  if (marketT <= 0) {
    marketT = .5;
    G.market = clamp(G.market + rand(-.045, .045) + (1.02 - G.market) * .03 + Math.sin(time * .15) * .012, .65, 1.45);
    G.marketHist.push(G.market); if (G.marketHist.length > 70) G.marketHist.shift();
  }

  // rain event (phases 1-2)
  if (G.phase <= 2) {
    if (rainLeft > 0) {
      rainLeft -= dt;
      if (rainLeft <= 0) { G.raining = false; setRain(false); $('#rainfx').classList.remove('on'); hud.toast('☀️ Tạnh mưa rồi!', 'good'); }
    } else if ((rainTimer -= dt) <= 0) {
      rainTimer = rand(75, 110); rainLeft = 16;
      G.raining = true; setRain(true); $('#rainfx').classList.add('on');
      let msg = '🌧️ Mưa! Carton ngoài đường bị ướt, mất nửa giá';
      if (!lvl('tarp')) {
        const wetN = G.cargo.filter((c) => c.type === 'paper' && !c.wet).length;
        G.cargo.forEach((c) => { if (c.type === 'paper') c.wet = true; });
        if (wetN) msg += ` — ${wetN} carton trong bao cũng ướt! (mua Tấm bạt)`;
      }
      hud.toast(msg, 'bad', 4);
    }
  }

  // prompts + markers
  if (nearNb) hud.prompt(`<kbd>E</kbd> Mua <b>${nearNb.good.icon} ${nearNb.good.name}</b> của ${nearNb.name}`);
  else if (atBase && !G.cargo.length) hud.prompt(G.phase === 3 ? 'Kho vựa — bấm <kbd>T</kbd> gọi xe tải' : 'Căn cứ — mang hàng về đây để bán');
  else hud.prompt(null);
  const marks = [];
  if (G.cargo.length && (full || player.pos.distanceTo(LAYOUT.base) > 12)) marks.push({ pos: LAYOUT.base, icon: ['', '🏚️', '🏪', '🏭'][G.phase], label: full ? 'Về bán!' : '', h: 3.6 });
  for (const n of neighbours.list) if (n.state === 'wait') marks.push({ pos: n.pos, icon: n.good.icon, label: n.name });
  if (G.money >= VILLA_COST) marks.push({ pos: LAYOUT.villa, icon: '🏰', label: 'Đất xây biệt thự', h: 4 });
  hud.indicators(marks);

  const home = HOMES[G.phase + 1];
  if (home && G.money >= home.cost && readyWarned !== G.phase) {
    readyWarned = G.phase; sfx.fanfare();
    hud.toast(G.phase >= 3 ? '🏰 ĐỦ TIỀN XÂY BIỆT THỰ! Bấm ⭐' : `⭐ Đủ vốn lên ${home.name}! Bấm LÊN ĐỜI`, 'gold', 4);
  }
  updateObjective();
}

function loop(now = performance.now()) {
  const raw = Math.max(0, now - lastNow) / 1000;
  lastNow = now;
  watchPerf(raw);
  frame(Math.min(raw, 1 / 12));
  requestAnimationFrame(loop);
}

// Auto-lower quality when the machine can't hold ~48 fps. Only steps down, so it never oscillates.
let perfWarm = 4, perfSum = 0, perfN = 0, autoTrial = null;
let pfT = 0, pfN = 0, pfWorst = 0;
function watchPerf(raw) {
  // F overlay: fps, worst frame, tier, GPU
  pfT += raw; pfN++; pfWorst = Math.max(pfWorst, raw);
  if (pfT >= .5) {
    const el = $('#perf');
    const fps = Math.round(pfN / pfT);
    if (!el.classList.contains('hidden')) el.textContent = `${fps} FPS · tệ nhất ${(pfWorst * 1000).toFixed(0)}ms · ${gfx.label()} · ${world.gpu}`;
    if (gfx.isOpen) gfx.setFpsText(`${fps} FPS`);
    pfT = 0; pfN = 0; pfWorst = 0;
  }
  if (gfx.mode !== 'auto' || raw > .25) return; // only "Tự động" adapts; ignore tab switches / hitches
  if ((perfWarm -= raw) > 0) return;
  perfSum += raw; perfN++;
  if (perfSum < 2) return;
  const avg = perfSum / perfN;
  perfSum = 0; perfN = 0;
  const fps = 1 / avg;
  if (autoTrial) {
    // a frame-rate cap (battery saver, 30 Hz screen/pane) isn't helped by lower graphics: undo and stop adapting
    if (fps < autoTrial.fps * 1.12) { gfx.setAutoPreset(autoTrial.prev); gfx.autoLocked = true; }
    else if (G.started) hud.toast(`⚙️ Tự giảm đồ họa cho mượt: ${gfx.label()} (phím G để chỉnh)`);
    autoTrial = null;
    return;
  }
  if (avg > 1 / 48 && !gfx.autoLocked) {
    const prev = gfx.autoPreset;
    if (gfx.stepDown()) { autoTrial = { prev, fps }; perfWarm = 1; }
  }
}
function frame(dt, render = true) {
  time += dt;
  tickAnims(dt);
  for (const u of world.updaters) u(dt, time);
  if (G.started && !G.paused && !G.cutscene) gameplay(dt);
  else if (G.started) { player.update(dt, time, {}, 0, 0); }
  bases.update(dt, time, G.started && G.cargo.length > 0 && G.phase < 4);
  honkCd -= dt;
  updateTraffic(dt, player.pos, (p) => { if (G.started && honkCd <= 0) { honkCd = 1.5; sfx.honk(); floatText(p, 'Bíp bíp! 🛵'); } });
  items.update(dt, time, G.raining);
  rainK = damp(rainK, G.raining ? 1 : 0, 1.2, dt);
  setRainLevel(rainK);
  updateRain(dt, G.started ? player.pos : cam.look, rainK);
  updateFx(dt);
  updateCamera(dt, time);
  updateOccluders(dt, G.started ? player.pos : null);
  if (G.started) hud.update(dt);
  if (render) renderFrame(G.paused ? 2 : 1);
}
loop();
if (import.meta.env.DEV) window.__game = { G, player, items, neighbours, helpers, bases, cam, addMoney, deliver, tryLevelUp, callTruck, world, advance(sec) { for (let i = 0; i < sec * 30; i++) frame(1 / 30, false); } };

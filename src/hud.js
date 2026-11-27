import * as THREE from 'three';
import { $, el, fmtMoney, fmtEta, damp } from './util.js';
import { G, tool, capUsed, potentialRate, VILLA_COST, SEC_PER_YEAR, PHASES, HOMES, TOOLS, EXTRAS, lvl, P3 } from './state.js';
import { ICON } from './icons.js';
import { world } from './world.js';

const v3 = new THREE.Vector3();
let lastCargoKey = '';
let lastObjective = '';
let lastMarketLen = -1, lastMarket = 0;

// Write to the DOM only when a value actually changes: per-frame writes force style/layout every frame.
const elCache = {};
const E = (s) => elCache[s] || (elCache[s] = document.querySelector(s));
const txt = (s, v) => { const e = E(s); if (e._t !== v) { e._t = v; e.textContent = v; } };
const html = (s, v) => { const e = E(s); if (e._h !== v) { e._h = v; e.innerHTML = v; } };
const css = (s, k, v) => { const e = E(s); if (e.style[k] !== v) e.style[k] = v; };
const cls = (s, c, on) => { const e = E(s); if (e.classList.contains(c) !== on) e.classList.toggle(c, on); };

export const hud = {
  show() { $('#hud').classList.remove('hidden'); },
  hide() { $('#hud').classList.add('hidden'); },

  update(dt) {
    // money count-up
    const diff = G.money - G.shownMoney;
    G.shownMoney = Math.abs(diff) < 50 ? G.money : damp(G.shownMoney, G.money, 7, dt);
    txt('#money', fmtMoney(G.shownMoney));

    const t = tool();
    const used = capUsed();
    txt('#cargo-txt', `${used}/${t.cap}`);
    css('#cargo-fill', 'width', Math.min(100, used / t.cap * 100).toFixed(1) + '%');
    cls('#cargo-box', 'full', used >= t.cap);
    const key = G.cargo.map((c) => c.type + (c.wet ? 'w' : '')).join();
    if (key !== lastCargoKey) {
      lastCargoKey = key;
      E('#cargo-icons').innerHTML = G.cargo.slice(-24).map((c) => c.good ? `<span style="font-size:18px">${c.good.icon}</span>` : ICON[c.type](c.wet)).join('');
    }
    txt('#tool-icon', t.icon);
    txt('#tool-name', t.name);
    const ph = PHASES[Math.min(G.phase, 3)];
    txt('#phase-icon', ph.icon);
    txt('#phase-name', ph.name);

    // the joke line
    const remain = Math.max(0, VILLA_COST - G.money);
    html('#eta', remain <= 0
      ? '🏰 <b>Đủ tiền xây biệt thự rồi!</b>'
      : `Với tốc độ hiện tại: còn <b>${fmtEta(remain / potentialRate(), SEC_PER_YEAR)}</b> nữa mới có biệt thự ${G.phase === 1 ? '🏚️' : G.phase === 2 ? '🏠' : '🏡'}`);

    css('#clean-fill', 'width', (G.clean * 100).toFixed(1) + '%');
    txt('#clean-pct', Math.round(G.clean * 100) + '%');

    // phase 3 panels
    const p3 = G.phase >= 3;
    cls('#stock-box', 'hidden', !p3);
    cls('#market-box', 'hidden', !p3);
    if (p3) {
      txt('#stock-txt', `${Math.floor(G.stock)}/${P3.stockCap} kiện`);
      css('#stock-fill', 'width', (G.stock / P3.stockCap * 100).toFixed(1) + '%');
      txt('#market-txt', '×' + G.market.toFixed(2).replace('.', ','));
      const mc = G.market >= 1.1 ? 'up' : G.market < .9 ? 'down' : '';
      if (E('#market-txt').className !== mc) E('#market-txt').className = mc;
      if (lastMarketLen !== G.marketHist.length || lastMarket !== G.market) { lastMarketLen = G.marketHist.length; lastMarket = G.market; drawMarket(); }
    }

    // Lên đời button
    const home = HOMES[G.phase + 1];
    if (home) {
      txt('#levelup-txt', `${home.icon} ${G.phase >= 3 ? 'Xây biệt thự' : 'Lên đời'} · ${fmtMoney(home.cost)}`);
      const ready = G.money >= home.cost;
      cls('#btn-levelup', 'ready', ready);
      cls('#btn-levelup', 'disabled', !ready);
    }
  },

  bumpMoney() {
    const m = $('#money');
    m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump');
    setTimeout(() => m.classList.remove('bump'), 150);
  },

  etaDrop() {
    const e = $('#eta');
    e.classList.remove('drop'); void e.offsetWidth; e.classList.add('drop');
    setTimeout(() => e.classList.remove('drop'), 1600);
  },

  toast(text, cls = '', dur = 2.4) {
    const box = $('#toasts');
    while (box.children.length > 3) box.firstChild.remove();
    const t = el('div', 'toast ' + cls, text);
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, dur * 1000);
  },

  objective(text) {
    if (text === lastObjective) return;
    lastObjective = text;
    const o = $('#objective');
    $('#objective-txt').innerHTML = text;
    o.classList.remove('new'); void o.offsetWidth; o.classList.add('new');
  },

  prompt(text) {
    const p = E('#prompt');
    if (!text) { if (!p.classList.contains('hidden')) p.classList.add('hidden'); return; }
    if (p._h !== text) { p._h = text; p.innerHTML = text; }
    if (p.classList.contains('hidden')) p.classList.remove('hidden');
  },

  // world-space markers; clamp to screen edge with an arrow when off-screen
  indicators(list) {
    const box = $('#indicators');
    while (box.children.length < list.length) box.appendChild(el('div', 'ind', '<div class="arrow"></div><div class="icon"></div><div class="lbl"></div>'));
    while (box.children.length > list.length) box.lastChild.remove();
    const W = innerWidth, H = innerHeight, m = 60, top = 200, bot = H - 110; // keep clear of HUD panels
    list.forEach((it, i) => {
      const d = box.children[i];
      v3.copy(it.pos); v3.y += it.h ?? 2.6;
      v3.project(world.camera);
      let x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * H;
      const behind = v3.z > 1;
      const on = !behind && x > m && x < W - m && y > 90 && y < bot;
      d.classList.toggle('onscreen', on);
      if (!on) {
        const cx = W / 2, cy = (top + bot) / 2;
        let dx = x - cx, dy = y - cy;
        if (behind) { dx = -dx; dy = -dy; }
        const s = Math.min((W / 2 - m) / Math.abs(dx || 1e-3), ((bot - top) / 2) / Math.abs(dy || 1e-3));
        x = cx + dx * s; y = cy + dy * s;
        d.querySelector('.arrow').style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`;
      }
      d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      const ic = d.querySelector('.icon');
      if (ic._t !== it.icon) { ic._t = it.icon; ic.textContent = it.icon; }
      const lbl = d.querySelector('.lbl'), lt = it.label || '';
      if (lbl._t !== lt) { lbl._t = lt; lbl.textContent = lt; lbl.style.display = lt ? '' : 'none'; }
    });
  },

  renderShop(actions) {
    const mk = (ic, nm, ds, state, price, onBuy, gold) => {
      const it = el('div', 'item ' + state);
      it.innerHTML = `<div class="ic">${ic}</div><div><div class="nm">${nm}</div><div class="ds">${ds}</div></div>`;
      const b = el('button', 'buy' + (gold ? ' gold' : ''), state === 'owned' ? '✓ Đã có' : state === 'locked' ? '🔒' : fmtMoney(price));
      b.disabled = state !== 'next' || G.money < price;
      if (state === 'next') b.onclick = onBuy;
      it.appendChild(b);
      return it;
    };
    const tools = $('#shop-tools'); tools.innerHTML = '';
    TOOLS.forEach((t, i) => {
      const state = i <= G.toolIdx ? 'owned' : i === G.toolIdx + 1 && t.phase <= G.phase ? 'next' : 'locked';
      const ds = state === 'locked' && t.phase > G.phase ? `Mở ở ${PHASES[t.phase].name}` : `${t.desc} · Tốc độ ${t.speed.toFixed(0)}`;
      tools.appendChild(mk(t.icon, t.name, ds, state, t.cost, () => actions.buyTool(i)));
    });
    const extra = $('#shop-extra'); extra.innerHTML = '';
    EXTRAS.forEach((x) => {
      const l = lvl(x.id);
      const maxed = l >= x.costs.length;
      const unlocked = x.phase <= G.phase && !(x.id === 'em' && l >= 1 && G.phase < 3);
      const state = maxed ? 'owned' : unlocked ? 'next' : 'locked';
      const nm = x.costs.length > 1 ? `${x.name} (${l}/${x.costs.length})` : x.name;
      const ds = state === 'locked' ? `Mở ở ${PHASES[Math.max(x.phase, x.id === 'em' && l >= 1 ? 3 : 0)].name}` : x.desc;
      extra.appendChild(mk(x.icon, nm, ds, state, x.costs[l], () => actions.buyExtra(x.id)));
    });
    const home = $('#shop-home'); home.innerHTML = '';
    HOMES.forEach((h, i) => {
      if (!h) return;
      const state = i <= G.phase ? 'owned' : i === G.phase + 1 ? 'next' : 'locked';
      home.appendChild(mk(h.icon, h.name, h.desc, state, h.cost, () => actions.levelUp(), true));
    });
  },
};

function drawMarket() {
  const c = $('#market-chart'), g = c.getContext('2d');
  const h = G.marketHist;
  g.clearRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.setLineDash([4, 4]);
  const y1 = c.height - (1 - .6) / .9 * c.height;
  g.beginPath(); g.moveTo(0, y1); g.lineTo(c.width, y1); g.stroke(); g.setLineDash([]);
  if (h.length < 2) return;
  g.lineWidth = 3; g.lineJoin = 'round';
  g.strokeStyle = G.market >= 1 ? '#2f9c5c' : '#e2433a';
  g.beginPath();
  h.forEach((v, i) => { const x = i / (h.length - 1) * c.width, y = c.height - (v - .6) / .9 * c.height; i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.stroke();
}

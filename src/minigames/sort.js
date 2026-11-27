// Phase 1 minigame: Phân loại rác — click / press the right bag before it lands.
import { openMG, closeMG, setKeys, popAt, sleep } from './common.js';
import { ICON } from '../icons.js';
import { SORT_ORDER, ITEM_TYPES } from '../state.js';
import { sfx } from '../audio.js';

const BAG_CLS = { plastic: 'bag-plastic', can: 'bag-can', paper: 'bag-paper', metal: 'bag-metal' };
const KEYS = { plastic: ['1', 'a'], can: ['2', 's'], paper: ['3', 'd'], metal: ['4', 'f'] };

export function runSort(cargo) {
  return new Promise((finishP) => {
    const queue = cargo.slice(0, 16).map((c) => c.type);
    for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
    const panel = openMG(`
      <div class="panel-head"><div><h2>♻️ Phân loại hàng</h2><div class="mg-sub">Bấm đúng bao trước khi đồ rơi xuống đất! Phân loại sạch thì chú Tư trả giá cao.</div></div></div>
      <div class="sort-hud"><span>Còn: <b class="left">${queue.length}</b></span><span class="combo"></span><span>Chuẩn: <b class="ok">0</b>/${queue.length}</span></div>
      <div class="sort-stage">
        <div class="bags">${SORT_ORDER.map((t) => `<div class="bag ${BAG_CLS[t]}" data-t="${t}">${ICON[t]()}<span class="bl">${ITEM_TYPES[t].bag}</span><kbd>${KEYS[t][0]}</kbd></div>`).join('')}</div>
      </div>`);
    const stage = panel.querySelector('.sort-stage');
    const bags = Object.fromEntries([...panel.querySelectorAll('.bag')].map((b) => [b.dataset.t, b]));
    let idx = 0, ok = 0, combo = 0, maxCombo = 0, cur = null, done = false;

    const H = () => stage.clientHeight;
    const landY = () => H() - 170;

    function spawn() {
      if (idx >= queue.length) return finish();
      const type = queue[idx++];
      panel.querySelector('.left').textContent = queue.length - idx;
      const d = document.createElement('div');
      d.className = 'sort-item'; d.innerHTML = ICON[type]();
      d.style.left = (42 + Math.random() * 16) + '%';
      stage.appendChild(d);
      const dur = Math.max(.95, 1.75 - idx * .065);
      cur = { type, d, t0: performance.now(), dur, wob: Math.random() * 6 };
    }

    function judge(choice) {
      if (!cur) return;
      const c = cur; cur = null;
      const sr = stage.getBoundingClientRect();
      const ir = c.d.getBoundingClientRect();
      const ix = ir.left - sr.left + ir.width / 2, iy = ir.top - sr.top + ir.height / 2;
      if (choice) {
        const b = bags[choice], br = b.getBoundingClientRect();
        c.d.classList.add('fly');
        c.d.style.left = (br.left - sr.left + br.width / 2) + 'px';
        c.d.style.top = (br.top - sr.top) + 'px';
        b.classList.remove('hit', 'miss'); void b.offsetWidth;
        if (choice === c.type) {
          ok++; combo++; maxCombo = Math.max(maxCombo, combo);
          b.classList.add('hit'); sfx.combo(combo);
          popAt(stage, ix, iy - 20, combo >= 3 ? `Chuẩn! ×${combo}` : 'Chuẩn!', '#b9ff8a');
        } else {
          combo = 0; b.classList.add('miss'); sfx.bad();
          popAt(stage, ix, iy - 20, 'Sai bao!', '#ff9a8a');
        }
      } else {
        combo = 0; sfx.thud();
        c.d.classList.add('drop'); c.d.style.top = (H() - 60) + 'px';
        popAt(stage, ix, iy - 20, 'Rớt rồi!', '#ffd36e');
      }
      panel.querySelector('.ok').textContent = ok;
      panel.querySelector('.combo').textContent = combo >= 2 ? `🔥 Combo ×${combo}` : '';
      setTimeout(() => c.d.remove(), 400);
      setTimeout(spawn, 200);
    }

    function frame(now) {
      if (done) return;
      if (cur) {
        const k = (now - cur.t0) / 1000 / cur.dur;
        cur.d.style.top = (k * landY()) + 'px';
        cur.d.style.transform = `rotate(${Math.sin(now / 200 + cur.wob) * 18}deg)`;
        if (k >= 1) judge(null);
      }
      requestAnimationFrame(frame);
    }

    for (const [t, b] of Object.entries(bags)) b.onpointerdown = () => judge(t);
    setKeys((e) => {
      const k = e.key.toLowerCase();
      const t = Object.keys(KEYS).find((x) => KEYS[x].includes(k));
      if (t) judge(t);
    });

    async function finish() {
      done = true;
      const acc = ok / queue.length;
      const mult = Math.round((.7 + .5 * acc + (maxCombo >= 8 ? .1 : 0)) * 100) / 100;
      const stars = acc >= .95 ? 3 : acc >= .75 ? 2 : acc >= .45 ? 1 : 0;
      await sleep(350);
      closeMG();
      finishP({ mult, stars, ok, total: queue.length, maxCombo });
    }
    setTimeout(spawn, 500);
    requestAnimationFrame(frame);
  });
}

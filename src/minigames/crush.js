// Phase 1 minigame (before sorting): Đập lon — click (or Space) as fast as you can to flatten each can.
// No timing, no penalty: every can gets crushed, faster = chú Tư pays more for the cans.
import { openMG, closeMG, setKeys, popAt, sleep } from './common.js';
import { ICON } from '../icons.js';
import { sfx } from '../audio.js';

const SQUASH = [1, .68, .42, .2]; // can height after each hit; last entry = flat
const HITS = SQUASH.length - 1;

export function runCrush(n) {
  return new Promise((finish) => {
    const total = Math.min(n, 8);
    const panel = openMG(`
      <div class="panel-head"><div><h2>🥫 Đập lon</h2><div class="mg-sub">Click liên tục (hoặc <kbd>Space</kbd>) để đập bẹp lon. Đập càng nhanh, chú Tư trả giá lon càng cao.</div></div></div>
      <div class="sort-hud"><span>Lon: <b class="ok">0</b>/${total}</span><span class="clock">⏱ 0,0s</span></div>
      <div class="crush-stage"><div class="slot"><div class="stump"></div></div></div>`);
    const stage = panel.querySelector('.crush-stage');
    const slot = panel.querySelector('.slot');
    const clock = panel.querySelector('.clock');
    let done = 0, hits = 0, can = null, t0 = 0, over = false;
    const secs = () => (t0 ? performance.now() - t0 : 0) / 1000;

    function spawn() {
      can = document.createElement('div');
      can.className = 'crush-it';
      can.innerHTML = ICON.can();
      slot.appendChild(can);
      hits = 0;
    }

    function hit() {
      if (!can || over) return;
      if (!t0) { t0 = performance.now(); requestAnimationFrame(tick); } // clock starts on the first hit
      const s = document.createElement('div');
      s.className = 'crush-slam'; s.textContent = '🩴';
      slot.appendChild(s);
      setTimeout(() => s.remove(), 200);
      stage.classList.remove('thump'); void stage.offsetWidth; stage.classList.add('thump');
      const h = SQUASH[++hits];
      can.style.animation = 'none';
      can.style.transform = `scale(${1 + (1 - h) * .5}, ${h})`;
      if (hits < HITS) return sfx.crunch();
      // flat: slide it onto the pile and bring the next can in right away
      const c = can;
      c.classList.add('out');
      c.style.transform = `translateX(240px) scale(1.4, ${h}) rotate(12deg)`;
      setTimeout(() => c.remove(), 350);
      panel.querySelector('.ok').textContent = ++done;
      sfx.crunch(); sfx.combo(done);
      popAt(stage, stage.clientWidth / 2, stage.clientHeight - 240, 'Bẹp!', '#b9ff8a');
      if (done < total) spawn(); else end();
    }

    function tick() {
      if (over) return;
      clock.textContent = `⏱ ${secs().toFixed(1).replace('.', ',')}s`;
      requestAnimationFrame(tick);
    }

    stage.onpointerdown = hit;
    setKeys((e) => {
      if (e.code !== 'Space') return false;
      e.preventDefault();
      if (!e.repeat) hit();
    });

    async function end() {
      over = true; can = null;
      const t = secs();
      clock.textContent = `⏱ ${t.toFixed(1).replace('.', ',')}s`;
      // ≤0,6s per can = full bonus, ≥1,6s per can = base bonus only
      const speed = Math.max(0, Math.min(1, 1.6 - t / total));
      const mult = Math.round((1.1 + .2 * speed) * 100) / 100;
      sfx.good();
      await sleep(800);
      closeMG();
      finish({ mult, total, secs: t });
    }
    spawn();
  });
}

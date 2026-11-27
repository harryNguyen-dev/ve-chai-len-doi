// Phase 2 minigame at the vựa: Tháo đồ điện — unscrew the case, yank the cord, strip the wire for copper.
// Mouse or Space for every step. Faster + cleaner strip = copper sells higher.
import { openMG, closeMG, setKeys, popAt, sleep } from './common.js';
import { rand } from '../util.js';
import { sfx } from '../audio.js';

const SCREWS = [[9, 12], [85, 12], [9, 78], [85, 78]]; // % positions on the case
const PULL = 190;                                     // px the plug must travel
const STEP_PAUSE = 650;                               // ms between phases so each step lands visibly
const READY = 700;                                    // ms the blade waits before sweeping

export function runDisassemble(goods) {
  return new Promise((finish) => {
    const rounds = goods.slice(0, 3);
    const results = [];
    let r = -1, stage = 0, t0 = 0, screwsLeft = 0, pulled = 0, strip = null, busy = false;

    const panel = openMG(`
      <div class="panel-head"><div><h2>🔧 Tháo đồ điện lấy đồng</h2><div class="mg-sub">Tháo ốc → rút dây → tuốt vỏ. Làm nhanh, tuốt khéo thì đồng sạch, đại lý trả giá cao. Chuột hoặc <kbd>Space</kbd>.</div></div>
        <div class="dis-round"></div></div>
      <div class="dis-steps"><span>① Tháo ốc</span><span>② Rút dây</span><span>③ Tuốt vỏ</span></div>
      <div class="dis-stage">
        <div class="dis-box">
          <div class="dis-inside"><div class="coil"></div></div>
          <div class="dis-lid"><div class="dis-ic"></div><div class="dis-name"></div>${SCREWS.map(([x, y], i) => `<button class="screw" data-i="${i}" style="left:${x}%;top:${y}%"></button>`).join('')}</div>
        </div>
        <div class="dis-right">
          <div class="cord"><div class="cord-line"></div><div class="plug">🔌</div></div>
          <div class="strip hidden"><div class="strip-wire"><div class="copper"></div><div class="insul"></div><div class="zone"></div><div class="blade">🔪</div></div></div>
        </div>
      </div>
      <div class="dis-hint"></div>`, 'mg-panel dis-panel');
    const $ = (s) => panel.querySelector(s);
    const stageEl = $('.dis-stage');
    const hint = (t) => { $('.dis-hint').innerHTML = t; };
    const steps = [...panel.querySelectorAll('.dis-steps span')];
    const setStage = (s) => { stage = s; steps.forEach((el, i) => { el.classList.toggle('on', i === s); el.classList.toggle('done', i < s); }); };
    // blocks input and is not counted against the speed bonus
    const pause = (ms, fn) => { busy = true; t0 += ms; setTimeout(() => { busy = false; fn(); }, ms); };

    function nextRound() {
      r++;
      if (r >= rounds.length) return end();
      const g = rounds[r];
      $('.dis-round').textContent = `Món ${r + 1}/${rounds.length}`;
      $('.dis-ic').textContent = g.icon;
      $('.dis-name').textContent = g.name;
      $('.dis-lid').classList.remove('off');
      panel.querySelectorAll('.screw').forEach((s) => s.classList.remove('out'));
      $('.cord').classList.remove('hidden', 'yanked');
      $('.plug').style.transform = '';
      $('.strip').classList.add('hidden');
      $('.insul').style.width = '100%';
      screwsLeft = 4; pulled = 0; strip = null; busy = false;
      setStage(0);
      hint('Bấm vào <b>4 con ốc</b> để tháo vỏ');
      t0 = performance.now();
    }

    // ① screws
    function unscrew(btn) {
      if (stage !== 0 || busy) return;
      btn = btn || [...panel.querySelectorAll('.screw')].find((s) => !s.classList.contains('out'));
      if (!btn || btn.classList.contains('out')) return;
      btn.classList.add('out');
      sfx.tick(); sfx.click();
      if (--screwsLeft > 0) return;
      sfx.whoosh();
      $('.dis-lid').classList.add('off');
      pause(STEP_PAUSE, () => { setStage(1); hint('Kéo <b>phích cắm 🔌</b> sang phải để rút dây (hoặc nhấp <kbd>Space</kbd> liên tục)'); });
    }
    panel.querySelectorAll('.screw').forEach((b) => { b.onpointerdown = () => unscrew(b); });

    // ② cord: drag the plug (or mash Space)
    function pull(px) {
      if (stage !== 1 || busy) return;
      pulled = Math.min(PULL, Math.max(pulled, px));
      $('.plug').style.transform = `translateX(${pulled}px)`;
      if (pulled < PULL) return;
      dragX = null;
      sfx.crunch();
      $('.cord').classList.add('yanked');
      popAt(stageEl, stageEl.clientWidth * .75, 70, 'Rắc!', '#ffd36e');
      pause(STEP_PAUSE, startStrip);
    }
    let dragX = null;
    $('.plug').onpointerdown = (e) => { if (stage === 1) { dragX = e.clientX - pulled; e.target.setPointerCapture(e.pointerId); } };
    $('.plug').onpointermove = (e) => { if (dragX != null) pull(e.clientX - dragX); };
    $('.plug').onpointerup = () => { dragX = null; };

    // ③ strip: a blade sweeps along the wire, cut inside the green zone
    function startStrip() {
      $('.cord').classList.add('hidden');
      $('.strip').classList.remove('hidden');
      setStage(2);
      hint('Bấm (hoặc <kbd>Space</kbd>) khi <b>dao 🔪</b> vào vùng xanh để tuốt vỏ');
      const zone = { c: rand(.3, .8), w: .2 };
      $('.zone').style.left = (zone.c - zone.w / 2) * 100 + '%';
      $('.zone').style.width = zone.w * 100 + '%';
      // speed = sweeps per second; blade parks at the left for READY ms first
      strip = { zone, t: performance.now() + READY, speed: rand(.75, 1), pos: 0 };
      t0 += READY;
      requestAnimationFrame(sweep);
    }
    function sweep(now) {
      if (!strip || stage !== 2) return;
      strip.pos = (Math.sin(Math.max(0, now - strip.t) / 1000 * strip.speed * Math.PI - Math.PI / 2) + 1) / 2;
      $('.blade').style.left = strip.pos * 100 + '%';
      $('.zone').classList.toggle('hot', Math.abs(strip.pos - strip.zone.c) <= strip.zone.w / 2);
      requestAnimationFrame(sweep);
    }
    function cut() {
      if (stage !== 2 || !strip || busy || performance.now() < strip.t) return;
      busy = true;
      const d = Math.abs(strip.pos - strip.zone.c);
      const q = d <= strip.zone.w / 2 ? 1 : d <= strip.zone.w ? .6 : .25;
      strip = null;
      const secs = (performance.now() - t0) / 1000;
      const speed = Math.max(0, Math.min(1, (12 - secs) / 7));
      const mult = 1 + .35 * q + .25 * speed;
      const g = rounds[r];
      results.push({ mult, copper: g.kg * (.2 + .15 * q) });
      $('.insul').style.width = q === 1 ? '0%' : q > .5 ? '35%' : '70%';
      if (q === 1) sfx.good(); else if (q > .5) sfx.combo(2); else sfx.bad();
      popAt(stageEl, stageEl.clientWidth * .72, 120, q === 1 ? 'Sạch bong! ✨' : q > .5 ? 'Tạm được' : 'Lẹm dây rồi!', q === 1 ? '#b9ff8a' : q > .5 ? '#ffd36e' : '#ff9a8a');
      setTimeout(nextRound, 1300);
    }
    stageEl.addEventListener('pointerdown', (e) => { if (stage === 2 && !e.target.closest('.screw')) cut(); });

    setKeys((e) => {
      if (e.code !== 'Space') return false;
      e.preventDefault();
      if (stage === 0) unscrew();
      else if (stage === 1) pull(pulled + 48);
      else if (!e.repeat) cut(); // held Space from the pull mash must not auto-cut
    });

    async function end() {
      stage = 3;
      const mult = results.reduce((s, x) => s + x.mult, 0) / results.length;
      const copper = results.reduce((s, x) => s + x.copper, 0);
      hint(`<b>Đồng thu được: ${copper.toFixed(1).replace('.', ',')} kg</b> · giá đồ điện ×${mult.toFixed(2).replace('.', ',')}`);
      sfx.cash();
      await sleep(1300);
      closeMG();
      finish({ mult, copper });
    }
    nextRound();
  });
}

// Phase 2 minigame: Cân & mặc cả — read the scale, then haggle with the neighbour.
import { openMG, closeMG, setKeys, sleep } from './common.js';
import { faceSVG } from '../icons.js';
import { fmtMoney, pick, rand } from '../util.js';
import { sfx } from '../audio.js';

const HELLO = [
  'Ê con, {n} có {g} nè, mua hông?',
  'Con ơi, lại đây {n} bán cho mớ {g}.',
  'Trời ơi chờ con hoài! {g} nè, coi giá đi con.',
];
const TOO_LOW = [
  'Trời đất! Bộ con tính ăn cướp hả?', 'Giá đó {n} cho luôn còn hơn!', 'Hông được đâu con ơi, đồ còn ngon lành mà!',
];
const COUNTER = ['Thêm chút đi con, {p} nha?', 'Thôi {p} đi, {n} để cho.', '{p}, hông bớt nữa nghen!'];
const DEAL = ['Thôi được, lấy đi con!', 'Ừ, coi như {n} làm phước.', 'Chốt! Lần sau ghé nữa nha.'];
const OVERPAY = ['Trời, con hào phóng quá ta! 😍', 'Cảm ơn con nhiều nha! Lần sau {n} để dành cho con hết!'];
const QUIT = ['Thôi, {n} hông bán nữa!', 'Đi đi, {n} bán cho người khác!'];

const fill = (s, o) => s.replace('{n}', o.n).replace('{g}', o.g).replace('{p}', o.p || '');

export function runHaggle(nb, budget = Infinity) {
  return new Promise((finish) => {
    const good = nb.good;
    const value = good.value;
    let min = value * rand(.42, .62);
    const guess = () => min * rand(.95, 1.05);
    let hint = guess();
    let patience = 3, stage = 'scale', mood = 0;
    const who = { n: nb.name.split(' ')[0].toLowerCase(), g: good.name.toLowerCase() };
    const faceOpts = { female: nb.female, skin: '#e0a77a', hair: '#2a1d14', hat: false };

    const slMax = Math.max(1, Math.floor(Math.min(value * 1.1, budget) / 1000));
    const slMin = Math.min(Math.round(value * .2 / 1000), slMax);
    const panel = openMG(`
      <div class="panel-head"><div><h2>⚖️ Cân & mặc cả</h2><div class="mg-sub">${nb.name} · ép giá quá thì người ta quay vô nhà, trả cao quá thì lỗ.</div></div>
        <div class="patience">${'<span>❤️</span>'.repeat(3)}</div></div>
      <div class="hag-top">
        <div class="hag-face">${faceSVG(0, faceOpts)}</div>
        <div>
          <div class="bubble"></div>
          <div class="hag-goods"><span class="g-ic">${good.icon}</span><div><b>${good.name}</b> · ${good.kg} kg<br/>Đại lý ông Bảy mua lại: <b style="color:#1f7a45">${fmtMoney(value)}</b></div></div>
        </div>
      </div>
      <div class="scale-wrap stage-scale">
        <svg class="scale-dial" viewBox="0 0 220 130">
          <path d="M20 120 A90 90 0 0 1 200 120" fill="#fff" stroke="#3a86d4" stroke-width="10"/>
          <path class="zone" d="" stroke="#3bb273" stroke-width="12" fill="none"/>
          ${Array.from({ length: 11 }, (_, i) => { const a = Math.PI + i / 10 * Math.PI; return `<line x1="${110 + Math.cos(a) * 80}" y1="${120 + Math.sin(a) * 80}" x2="${110 + Math.cos(a) * 70}" y2="${120 + Math.sin(a) * 70}" stroke="#555" stroke-width="3"/>`; }).join('')}
          <line class="needle" x1="110" y1="120" x2="110" y2="40" stroke="#e2433a" stroke-width="5" stroke-linecap="round"/>
          <circle cx="110" cy="120" r="9" fill="#2a1d14"/>
        </svg>
        <div style="max-width:250px"><b style="font-size:20px">Bước 1: Dằn cân</b><br/>Bấm <kbd>Space</kbd> hoặc click khi kim vào vạch xanh. Cân chuẩn thì người ta tin, dễ bớt giá.<br/><button class="big-btn green btn-weigh" style="margin-top:8px">Chốt cân</button></div>
      </div>
      <div class="slider-wrap stage-offer hidden">
        <div class="offer-line"><span>Bước 2: Trả giá <small>(<kbd>←</kbd><kbd>→</kbd>)</small></span><span class="offer"></span></div>
        <input type="range" class="sl" min="${slMin}" max="${slMax}" step="1"/>
        ${budget < value * 1.1 ? `<div style="font-size:13px;opacity:.7">Trong túi chỉ có ${fmtMoney(budget)}</div>` : ''}
        <div class="offer-line"><span class="profit"></span><span style="display:flex;gap:10px"><button class="big-btn alt btn-quit">Thôi</button><button class="big-btn btn-offer">Chốt giá! <kbd>Enter</kbd></button></span></div>
      </div>`);
    const $ = (s) => panel.querySelector(s);
    const bubble = $('.bubble'), faceBox = $('.hag-face');
    const say = (t) => { bubble.textContent = t; bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop'); };
    const setMood = (m) => { if (m !== mood) { mood = m; faceBox.innerHTML = faceSVG(m, faceOpts); } };
    say(fill(pick(HELLO), who));

    // --- step 1: scale ---
    const target = rand(-.5, .5); // where the true weight sits (-1..1 of the dial)
    const zoneW = .2;
    const arc = (a0, a1) => { const p = (k) => { const a = Math.PI + (k + 1) / 2 * Math.PI; return `${110 + Math.cos(a) * 90} ${120 + Math.sin(a) * 90}`; }; return `M${p(a0)} A90 90 0 0 1 ${p(a1)}`; };
    $('.zone').setAttribute('d', arc(target - zoneW, target + zoneW));
    let needle = 0, t0 = performance.now(), running = true;
    const spd = rand(2.6, 3.4);
    function tickNeedle(now) {
      if (!running) return;
      const t = (now - t0) / 1000;
      needle = Math.sin(t * spd) * .95 * Math.max(.55, 1 - t * .05) + Math.sin(t * spd * 2.7) * .06;
      const a = needle * 90;
      $('.needle').setAttribute('transform', `rotate(${a} 110 120)`);
      requestAnimationFrame(tickNeedle);
    }
    requestAnimationFrame(tickNeedle);
    function weigh() {
      if (stage !== 'scale') return;
      running = false;
      const hit = Math.abs(needle - target) <= zoneW;
      if (hit) { min *= .9; sfx.good(); say(`Cân chuẩn ${good.kg} ký! Con làm ăn đàng hoàng ghê.`); setMood(1); }
      else { min *= 1.06; sfx.bad(); say('Ủa, cân gì kỳ vậy con? Coi chừng nha!'); setMood(-1); }
      hint = guess();
      stage = 'offer';
      setTimeout(() => { $('.stage-scale').classList.add('hidden'); $('.stage-offer').classList.remove('hidden'); updateOffer(); }, 650);
    }
    $('.btn-weigh').onclick = weigh;

    // --- step 2: offer ---
    const sl = $('.sl');
    sl.value = Math.round(value * .35 / 1000);
    const offer = () => sl.value * 1000;
    function updateOffer() {
      const o = offer();
      $('.offer').textContent = fmtMoney(o);
      const p = value - o;
      const pr = $('.profit');
      pr.textContent = p >= 0 ? `Lời dự kiến: +${fmtMoney(p)}` : `Lỗ: ${fmtMoney(p)}`;
      pr.className = 'profit ' + (p >= 0 ? 'pos' : 'neg');
      setMood(o < hint * .75 ? -2 : o < hint ? -1 : o < hint * 1.18 ? 1 : 2);
    }
    sl.oninput = () => { sfx.tick(); updateOffer(); };
    async function submit() {
      if (stage !== 'offer') return;
      const o = offer();
      if (o >= min) {
        stage = 'done';
        say(fill(pick(o > value * .9 ? OVERPAY : DEAL), who)); setMood(2); sfx.cash();
        await sleep(1100);
        closeMG(); finish({ deal: true, paid: o, value });
      } else {
        patience--;
        panel.querySelectorAll('.patience span')[patience].classList.add('lost');
        sfx.bad(); setMood(-2);
        if (patience <= 0) {
          stage = 'done';
          say(fill(pick(QUIT), who));
          await sleep(1200);
          closeMG(); finish({ deal: false, angry: true });
          return;
        }
        const counter = Math.ceil(min * rand(1.04, 1.18) / 5000) * 5000;
        say(fill(pick(TOO_LOW), who) + ' ' + fill(pick(COUNTER), { ...who, p: fmtMoney(counter) }));
        hint = guess();
      }
    }
    $('.btn-offer').onclick = submit;
    $('.btn-quit').onclick = () => { stage = 'done'; running = false; closeMG(); finish({ deal: false }); };

    setKeys((e) => {
      if (e.code === 'Space') { e.preventDefault(); weigh(); }
      else if (e.key === 'Enter') submit();
      else if (e.key === 'ArrowLeft' || e.key === 'a') { sl.value = +sl.value - 2; sl.oninput(); }
      else if (e.key === 'ArrowRight' || e.key === 'd') { sl.value = +sl.value + 2; sl.oninput(); }
      else if (e.key === 'Escape') $('.btn-quit').onclick();
      else return false;
    });
  });
}

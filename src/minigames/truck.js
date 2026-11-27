// Phase 3 minigame: Xếp hàng lên xe tải — tetris-like packing. Fuller truck = more profit.
import { openMG, closeMG, setKeys, sleep } from './common.js';
import { fmtMoney, pick } from '../util.js';
import { sfx } from '../audio.js';

const SHAPES = [
  [[0, 0], [1, 0], [0, 1], [1, 1]],           // O 2x2
  [[0, 0], [1, 0], [2, 0]],                   // I3
  [[0, 0], [1, 0]],                           // I2
  [[0, 0], [1, 0], [2, 0], [0, 1]],           // L
  [[0, 0], [1, 0], [2, 0], [1, 1]],           // T
  [[0, 0], [1, 0], [1, 1], [2, 1]],           // S
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], // 3x2 big bale
  [[0, 0]],                                   // single
];
const KINDS = ['k-paper', 'k-can', 'k-plastic', 'k-metal', 'k-copper'];

const rot = (cells) => {
  const r = cells.map(([x, y]) => [-y, x]);
  const mx = Math.min(...r.map((c) => c[0])), my = Math.min(...r.map((c) => c[1]));
  return r.map(([x, y]) => [x - mx, y - my]);
};

function makeQueue(stock) {
  const q = [];
  let left = Math.floor(stock);
  while (left > 0) {
    let s = pick(SHAPES);
    if (s.length > left) s = SHAPES.find((x) => x.length <= left) || SHAPES[7];
    q.push({ cells: s, kind: pick(KINDS) });
    left -= s.length;
  }
  return q;
}

export function runTruck({ stock, cols = 10, rows = 5, cellValue, market, timeLimit = 40 }) {
  return new Promise((finish) => {
    const queue = makeQueue(stock);
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    let cur = queue.shift();
    let placed = 0, hover = null, timeLeft = timeLimit, over = false;
    const totalCells = cols * rows;

    const panel = openMG(`
      <div class="panel-head"><div><h2>🚚 Xếp hàng lên xe tải</h2><div class="mg-sub">Click để đặt kiện, <kbd>R</kbd>/chuột phải để xoay. Xếp càng kín, chuyến càng lời. Giá nhà máy hôm nay: <b>×${market.toFixed(2).replace('.', ',')}</b></div></div>
        <div style="font-size:28px;font-weight:800" class="timer">⏱ ${timeLimit}</div></div>
      <div class="truck-wrap">
        <div class="truck"><div class="truck-bed" style="grid-template-columns:repeat(${cols},40px)"></div><div class="truck-cab"></div></div>
        <div class="queue"><h4>Kiện tiếp theo</h4><div class="qpiece cur"></div><div class="qpiece q1"></div><div class="qpiece q2"></div><div class="q-left" style="font-weight:700;font-size:14px"></div></div>
      </div>
      <div class="truck-hud"><span>Độ kín:</span><div class="bar big fillbar"><i></i></div><b class="pct">0%</b><span class="val"></span><button class="big-btn green btn-go">Cho xe chạy 🚚</button></div>`, 'mg-panel truck-panel');
    panel.style.width = 'min(820px, 96vw)';
    const $ = (s) => panel.querySelector(s);
    const bed = $('.truck-bed');
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const c = document.createElement('div'); c.className = 'cell'; c.dataset.x = x; c.dataset.y = y; bed.appendChild(c); cells.push(c);
    }
    const cellAt = (x, y) => cells[y * cols + x];

    const mini = (p) => {
      if (!p) return '';
      const w = Math.max(...p.cells.map((c) => c[0])) + 1, h = Math.max(...p.cells.map((c) => c[1])) + 1;
      let html = `<div class="mini" style="grid-template-columns:repeat(${w},16px)">`;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) html += p.cells.some((c) => c[0] === x && c[1] === y) ? `<i class="${p.kind}"></i>` : '<i class="e"></i>';
      return html + '</div>';
    };
    function renderQueue() {
      $('.qpiece.cur').innerHTML = cur ? mini(cur) : '<b>Hết hàng!</b>';
      $('.q1').innerHTML = mini(queue[0]);
      $('.q2').innerHTML = mini(queue[1]);
      $('.q-left').textContent = `Còn ${queue.reduce((s, p) => s + p.cells.length, cur ? cur.cells.length : 0)} kiện chờ xếp`;
    }
    const fits = (px, py) => cur && cur.cells.every(([x, y]) => { const gx = px + x, gy = py + y; return gx >= 0 && gy >= 0 && gx < cols && gy < rows && !grid[gy][gx]; });
    function paintGhost() {
      cells.forEach((c) => c.classList.remove('ghost-ok', 'ghost-bad'));
      if (!hover || !cur) return;
      const ok = fits(hover[0], hover[1]);
      for (const [x, y] of cur.cells) { const gx = hover[0] + x, gy = hover[1] + y; if (gx < cols && gy < rows) cellAt(gx, gy).classList.add(ok ? 'ghost-ok' : 'ghost-bad'); }
    }
    function updateStats() {
      const pct = placed / totalCells;
      $('.fillbar i').style.width = pct * 100 + '%';
      $('.pct').textContent = Math.round(pct * 100) + '%';
      $('.val').textContent = '≈ ' + fmtMoney(payout());
    }
    // full rows are tightly packed -> small bonus
    const payout = () => {
      const fullRows = grid.filter((r) => r.every(Boolean)).length;
      return placed * cellValue * market * (1 + fullRows * .05);
    };
    function place() {
      if (!hover || !fits(hover[0], hover[1]) || over) { if (hover && !over) sfx.bad(); return; }
      for (const [x, y] of cur.cells) { const gx = hover[0] + x, gy = hover[1] + y; grid[gy][gx] = cur.kind; const c = cellAt(gx, gy); c.classList.add('filled', cur.kind); }
      placed += cur.cells.length;
      sfx.thud();
      const fullNow = grid.filter((r) => r.every(Boolean)).length;
      if (fullNow > (place.rows || 0)) { place.rows = fullNow; sfx.good(); }
      cur = queue.shift() || null;
      renderQueue(); paintGhost(); updateStats();
      if (!cur || placed >= totalCells) setTimeout(go, 400);
    }
    bed.addEventListener('mousemove', (e) => {
      const c = e.target.closest('.cell'); if (!c) return;
      hover = [+c.dataset.x, +c.dataset.y]; paintGhost();
    });
    bed.addEventListener('mouseleave', () => { hover = null; paintGhost(); });
    bed.addEventListener('click', place);
    bed.addEventListener('contextmenu', (e) => { e.preventDefault(); rotate(); });
    function rotate() { if (!cur) return; cur = { ...cur, cells: rot(cur.cells) }; sfx.tick(); renderQueue(); paintGhost(); }
    $('.btn-go').onclick = go;
    setKeys((e) => {
      if (e.key === 'r' || e.key === 'R') rotate();
      else if (e.key === 'Enter') go();
      else return false;
    });

    const iv = setInterval(() => {
      if (over) return;
      timeLeft--;
      $('.timer').textContent = '⏱ ' + timeLeft;
      if (timeLeft <= 5) { $('.timer').style.color = '#e2433a'; sfx.tick(); }
      if (timeLeft <= 0) go();
    }, 1000);

    async function go() {
      if (over) return;
      over = true; clearInterval(iv);
      const leftover = (cur ? cur.cells.length : 0) + queue.reduce((s, p) => s + p.cells.length, 0);
      const pay = payout();
      sfx.engine();
      $('.truck').classList.add('go');
      await sleep(1250);
      closeMG();
      finish({ payout: pay, placed, fill: placed / totalCells, leftover });
    }
    renderQueue(); updateStats();
  });
}

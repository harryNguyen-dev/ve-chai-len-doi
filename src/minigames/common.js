import { $ } from '../util.js';
import { sfx } from '../audio.js';

let keyHandler = null;
export function openMG(html, cls = 'mg-panel') {
  const mg = $('#mg');
  mg.innerHTML = `<div class="panel ${cls}">${html}</div>`;
  mg.classList.remove('hidden');
  sfx.open();
  return mg.firstElementChild;
}
export function closeMG() {
  const mg = $('#mg');
  mg.classList.add('hidden');
  mg.innerHTML = '';
  setKeys(null);
  sfx.close();
}
export function setKeys(fn) {
  if (keyHandler) removeEventListener('keydown', keyHandler, true);
  keyHandler = fn ? (e) => { if (fn(e) !== false) { e.stopPropagation(); } } : null;
  if (keyHandler) addEventListener('keydown', keyHandler, true);
}
export function popAt(parent, x, y, text, color = '#fff') {
  const p = document.createElement('div');
  p.className = 'sort-pop'; p.textContent = text; p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.color = color;
  parent.appendChild(p);
  setTimeout(() => p.remove(), 800);
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

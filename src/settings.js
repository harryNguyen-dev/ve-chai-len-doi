// ⚙️ Graphics settings panel: presets or per-option choices, remembered in localStorage.
import { $ } from './util.js';
import { world, PRESETS, PRESET_ORDER, applyGfx, detectPreset } from './world.js';
import { sfx } from './audio.js';

const KEY = 'vcld-gfx-v1';
const MODES = [['auto', 'Tự động'], ...PRESET_ORDER.map((id) => [id, PRESETS[id].name])];
const SCALES = [[.5, '50%'], [.6, '60%'], [.75, '75%'], [.85, '85%'], [1, '100%']];
const SHADOWS = [[0, 'Tắt'], [1024, 'Thấp'], [2048, 'Cao']];
const ONOFF = [[false, 'Tắt'], [true, 'Bật']];

export const gfx = {
  mode: 'auto',          // 'auto' | preset id | 'custom'
  autoPreset: 'high',
  autoLocked: false,     // set when lowering quality didn't raise fps (frame cap, not GPU load)
  showFps: false,
  onToggle: null,        // main.js pauses/resumes the game here

  init() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch { /* corrupted entry: fall back to auto */ }
    this.showFps = !!saved?.showFps;
    if (saved?.mode === 'custom' && saved.scale) { this.mode = 'custom'; applyGfx(saved); }
    else if (PRESETS[saved?.mode]) { this.mode = saved.mode; applyGfx(PRESETS[this.mode]); }
    else { this.mode = 'auto'; this.autoPreset = detectPreset(); applyGfx(PRESETS[this.autoPreset]); }

    seg('#seg-mode', MODES, (v) => this.setMode(v));
    seg('#seg-scale', SCALES, (v) => this.setOption({ scale: v }));
    seg('#seg-shadow', SHADOWS, (v) => this.setOption({ shadow: v }));
    seg('#seg-bloom', ONOFF, (v) => this.setOption({ bloom: v }));
    seg('#seg-fps', ONOFF, (v) => { this.showFps = v; this.save(); this.render(); });
    $('#gfx').querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => this.close(); });
    $('#gfx').addEventListener('pointerdown', (e) => { if (e.target.id === 'gfx') this.close(); });
    $('#btn-gfx-title').onclick = () => this.open();
    $('#gfx-gpu').textContent = `Card đồ họa: ${world.gpu}`;
    if (world.softwareGL) {
      $('#gfx-warn').innerHTML = '⚠️ Trình duyệt đang vẽ 3D bằng <b>CPU</b> nên sẽ giật dù chọn mức nào. Cách sửa: Chrome/Edge → <b>Cài đặt → Hệ thống</b> → bật <b>“Dùng tăng tốc đồ họa khi có”</b> → khởi động lại trình duyệt. (Mở game bằng <b>CHOI GAME.bat</b> thì tự bật.)';
      $('#gfx-warn').classList.remove('hidden');
      $('#title-gfx-warn').classList.remove('hidden');
    }
    this.render();
  },

  label() {
    if (this.mode === 'auto') return `Tự động (${PRESETS[this.autoPreset].name})`;
    return this.mode === 'custom' ? 'Tùy chỉnh' : PRESETS[this.mode].name;
  },

  setMode(m) {
    this.mode = m;
    if (m === 'auto') { this.autoPreset = detectPreset(); this.autoLocked = false; }
    applyGfx(PRESETS[m === 'auto' ? this.autoPreset : m]);
    this.save(); this.render();
  },

  setOption(change) {
    this.mode = 'custom';
    applyGfx({ ...world.gfx, ...change });
    this.save(); this.render();
  },

  // auto mode only: one preset lower. Returns the new preset name, or null if nothing changed.
  stepDown() {
    if (this.mode !== 'auto') return null;
    const i = PRESET_ORDER.indexOf(this.autoPreset);
    if (i >= PRESET_ORDER.length - 1) return null;
    this.autoPreset = PRESET_ORDER[i + 1];
    applyGfx(PRESETS[this.autoPreset]);
    this.render();
    return PRESETS[this.autoPreset].name;
  },

  setAutoPreset(id) {
    this.autoPreset = id;
    applyGfx(PRESETS[id]);
    this.render();
  },

  save() {
    const { scale, shadow, bloom } = world.gfx;
    localStorage.setItem(KEY, JSON.stringify({ mode: this.mode, showFps: this.showFps, scale, shadow, bloom }));
  },

  render() {
    const g = world.gfx;
    mark('#seg-mode', this.mode === 'custom' ? null : this.mode);
    mark('#seg-scale', g.scale);
    mark('#seg-shadow', g.shadow);
    mark('#seg-bloom', g.bloom);
    mark('#seg-fps', this.showFps);
    $('#gfx-mode-note').textContent = this.mode === 'auto' ? `Đang dùng: ${PRESETS[this.autoPreset].name} — sẽ tự giảm nếu máy chạy không kịp.` : this.mode === 'custom' ? 'Đang dùng cài đặt tùy chỉnh.' : '';
    $('#perf').classList.toggle('hidden', !this.showFps);
  },

  get isOpen() { return !$('#gfx').classList.contains('hidden'); },
  open() { if (this.isOpen) return; $('#gfx').classList.remove('hidden'); sfx.open(); this.render(); this.onToggle?.(true); },
  close() { if (!this.isOpen) return; $('#gfx').classList.add('hidden'); sfx.close(); this.onToggle?.(false); },
  toggle() { this.isOpen ? this.close() : this.open(); },
  toggleFps() { this.showFps = !this.showFps; this.save(); this.render(); },
  setFpsText(t) { $('#gfx-fps').textContent = t; },
};

// segmented button group
function seg(sel, options, onPick) {
  const box = $(sel);
  box.innerHTML = '';
  for (const [v, label] of options) {
    const b = document.createElement('button');
    b.className = 'seg-btn'; b.textContent = label; b._v = v;
    b.onclick = () => { sfx.click(); onPick(v); };
    box.appendChild(b);
  }
}
function mark(sel, v) {
  for (const b of $(sel).children) b.classList.toggle('on', b._v === v);
}

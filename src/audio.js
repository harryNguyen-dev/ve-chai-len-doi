// All sound is synthesised with WebAudio: zero asset files.
let ctx, master, sfxBus, musicBus, noiseBuf, rainNode, rainGain;
let muted = false;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = .7; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = .32; musicBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startMusic();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : .8, ctx.currentTime, .05);
  return muted;
}

function tone(freq, dur, { type = 'sine', vol = .3, attack = .005, slide = 0, delay = 0, bus = sfxBus, vibrato = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  if (vibrato) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = 5.5; lg.gain.value = freq * vibrato; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + .05);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + dur + .05);
}

function noise(dur, { vol = .3, freq = 2000, q = 1, type = 'bandpass', delay = 0, slide = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t, Math.random()); s.stop(t + dur + .05);
}

export const sfx = {
  pickup(n = 0) { const f = 520 * Math.pow(2, Math.min(n, 14) / 12); tone(f, .12, { type: 'triangle', vol: .25 }); tone(f * 1.5, .1, { type: 'sine', vol: .12, delay: .04 }); },
  coin() { tone(1320, .08, { type: 'square', vol: .06 }); tone(1760, .25, { type: 'square', vol: .06, delay: .07 }); },
  cash() { noise(.08, { vol: .3, freq: 3000 }); tone(2093, .5, { type: 'sine', vol: .25, delay: .05 }); tone(2637, .5, { type: 'sine', vol: .18, delay: .1 }); },
  click() { tone(800, .05, { type: 'square', vol: .06 }); },
  open() { tone(500, .08, { type: 'triangle', vol: .15, slide: 1.6 }); },
  close() { tone(700, .08, { type: 'triangle', vol: .15, slide: .6 }); },
  bad() { tone(180, .25, { type: 'sawtooth', vol: .12, slide: .7 }); },
  good() { tone(660, .09, { type: 'triangle', vol: .2 }); tone(990, .14, { type: 'triangle', vol: .2, delay: .07 }); },
  full() { tone(330, .12, { type: 'square', vol: .08 }); tone(262, .2, { type: 'square', vol: .08, delay: .12 }); },
  whoosh() { noise(.35, { vol: .2, freq: 400, slide: 6, q: .8 }); },
  thud() { tone(120, .2, { type: 'sine', vol: .4, slide: .5 }); noise(.12, { vol: .15, freq: 300, type: 'lowpass' }); },
  crunch() { noise(.12, { vol: .35, freq: 1200, q: .7 }); tone(90, .1, { type: 'square', vol: .1, slide: .6 }); },
  honk() { tone(440, .14, { type: 'square', vol: .06 }); tone(440, .18, { type: 'square', vol: .06, delay: .2 }); tone(554, .14, { type: 'square', vol: .04 }); tone(554, .18, { type: 'square', vol: .04, delay: .2 }); },
  combo(n) { tone(660 * Math.pow(2, Math.min(n, 12) / 12), .12, { type: 'square', vol: .07 }); },
  tick() { tone(1400, .03, { type: 'square', vol: .04 }); },
  buy() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, { type: 'triangle', vol: .2, delay: i * .06 })); },
  fanfare() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => { tone(f, .35, { type: 'square', vol: .07, delay: i * .11 }); tone(f / 2, .35, { type: 'triangle', vol: .15, delay: i * .11 }); });
  },
  firecrackers(count = 40) { // pháo
    for (let i = 0; i < count; i++) { const d = i * .045 + Math.random() * .03; noise(.05, { vol: .45, freq: 1500 + Math.random() * 2000, q: .5, delay: d }); }
  },
  pop() { noise(.25, { vol: .35, freq: 900, q: .4 }); tone(200, .3, { type: 'sine', vol: .2, slide: .4 }); },
  engine() { tone(70, .8, { type: 'sawtooth', vol: .08, slide: 1.5 }); },
  stamp() { tone(160, .12, { type: 'square', vol: .15, slide: .5 }); noise(.08, { vol: .3, freq: 800 }); },
  // the megaphone call (melody shaped like "Ai ve chai đồng nát bán hông...")
  loa() {
    const mel = [[392, .22], [440, .22], [392, .3], [330, .25], [392, .25], [294, .3], [330, .25], [392, .5]];
    let d = 0;
    for (const [f, len] of mel) {
      tone(f, len * 1.1, { type: 'square', vol: .05, delay: d, vibrato: .02 });
      tone(f * 2, len * 1.1, { type: 'sawtooth', vol: .015, delay: d, vibrato: .02 });
      d += len;
    }
  },
};

let viVoice = null;
if ('speechSynthesis' in window) {
  const pickVoice = () => { viVoice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('vi')) || null; };
  pickVoice(); speechSynthesis.onvoiceschanged = pickVoice;
}
export function sayLoa() {
  if (muted) return;
  if (viVoice) {
    const u = new SpeechSynthesisUtterance('Ai ve chai đồng nát, bán hông?');
    u.voice = viVoice; u.lang = viVoice.lang; u.rate = .95; u.pitch = 1.3; u.volume = .9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } else sfx.loa();
}

export function setRain(on) {
  if (!ctx) return;
  if (!rainNode) {
    rainNode = ctx.createBufferSource(); rainNode.buffer = noiseBuf; rainNode.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    rainGain = ctx.createGain(); rainGain.gain.value = 0;
    rainNode.connect(f).connect(rainGain).connect(sfxBus); rainNode.start();
  }
  rainGain.gain.setTargetAtTime(on ? .22 : 0, ctx.currentTime, .8);
}

// ---------- music: little pentatonic loop, đàn bầu-ish lead with slides ----------
let musicLevel = 1;
export function setMusicLevel(l) { musicLevel = l; }
function startMusic() {
  const bpm = 92, step = 60 / bpm / 2; // eighth notes
  const C = 261.63;
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21].map((s) => C * Math.pow(2, s / 12));
  const lead = [5, -1, 4, 3, 2, -1, 3, -1, 4, -1, 2, 1, 0, -1, -1, -1, 2, -1, 3, 4, 5, -1, 7, 6, 5, -1, 4, 3, 2, -1, -1, -1];
  const bass = [0, -1, -1, 0, 3, -1, -1, -1, 4, -1, -1, 4, 3, -1, 2, -1];
  let i = 0, next = ctx.currentTime + .2;
  setInterval(() => {
    while (next < ctx.currentTime + .25) {
      const delay = next - ctx.currentTime;
      const li = lead[i % lead.length];
      if (li >= 0 && musicLevel >= 1) tone(scale[li] , step * 2.2, { type: 'sine', vol: .16, delay, bus: musicBus, vibrato: .012, slide: Math.random() < .25 ? 1.06 : 0 });
      const bi = bass[i % bass.length];
      if (bi >= 0) tone(scale[bi] / 2, step * 1.6, { type: 'triangle', vol: .2, delay, bus: musicBus });
      if (i % 4 === 2) tone(1800, .03, { type: 'square', vol: .02 * musicLevel, delay, bus: musicBus }); // wood block
      if (musicLevel >= 2 && i % 2 === 1) tone(scale[(li >= 0 ? li : 2) + 2] || scale[4], step * .8, { type: 'triangle', vol: .05, delay, bus: musicBus });
      if (musicLevel >= 3 && i % 8 === 0) tone(scale[0] / 4, step * 3, { type: 'sine', vol: .25, delay, bus: musicBus, slide: .7 });
      next += step; i++;
    }
  }, 60);
}

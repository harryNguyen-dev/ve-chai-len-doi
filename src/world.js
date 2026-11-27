import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { box, cyl, sphere, mat, at, lerp, bake } from './util.js';

// Map layout (metres). Street runs along X. Camera looks toward -Z.
export const LAYOUT = {
  street: { x0: -46, x1: 60, z0: -4, z1: 4 },
  walk: [
    { x0: -46, x1: 60, z0: -7.5, z1: 9.4 },   // street + both sidewalks (canal railing at z=10)
    { x0: -45, x1: -29, z0: -17, z1: -6.4 },  // base lot (overlaps street rect so the seam is walkable) (under the bridge)
    { x0: 7.6, x1: 12.4, z0: -38, z1: -6.4 }, // the hẻm
  ],
  base: new THREE.Vector3(-37, 0, -10.5),     // drop-off ring
  villa: new THREE.Vector3(48, 0, -15),
  alleyX: 10,
};

export const world = { updaters: [], occluders: [] };

// Foreground props fade out when they sit between the camera and the player.
export function registerOccluder(obj) {
  const mats = [];
  obj.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; mats.push(m.material); } });
  world.occluders.push({ obj, mats, k: 1 });
}
const _wp = new THREE.Vector3();
export function updateOccluders(dt, target) {
  for (const o of world.occluders) {
    o.obj.getWorldPosition(_wp);
    const hide = target && _wp.z > target.z + .3 && _wp.z - target.z < 9 && Math.abs(_wp.x - target.x) < 2.6;
    const want = hide ? .28 : 1;
    o.k += (want - o.k) * Math.min(1, dt * 8);
    for (const m of o.mats) { m.opacity = o.k; m.depthWrite = o.k > .95; }
  }
}

const SKY = {
  top: new THREE.Color('#3d3b7d'), horizon: new THREE.Color('#ffae6b'), bottom: new THREE.Color('#c97a6a'),
  rainTop: new THREE.Color('#4a5066'), rainHorizon: new THREE.Color('#8a8f9e'),
};

export function initWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // refreshed from renderFrame() at the tier's rate
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#f3a37f', 70, 190);
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .5, 500);

  // ---- sky dome ----
  const sunDir = new THREE.Vector3(-0.75, 0.22, 0.35).normalize();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: SKY.top.clone() }, horizon: { value: SKY.horizon.clone() }, bottom: { value: SKY.bottom.clone() },
      sunDir: { value: sunDir }, sunCol: { value: new THREE.Color('#fff1c4') }, sunK: { value: 1 },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, horizon, bottom, sunDir, sunCol; uniform float sunK; varying vec3 vP;
      void main(){ vec3 d = normalize(vP); float h = d.y;
        vec3 c = mix(horizon, top, smoothstep(0.02, 0.55, h));
        c = mix(c, bottom, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * .45) * sunK;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat);
  scene.add(sky);

  // environment map from sky (warm reflections on water / metal)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat));
  scene.environment = pmrem.fromScene(envScene, .02).texture;
  scene.environmentIntensity = .35;

  // ---- lights ----
  const hemi = new THREE.HemisphereLight('#a9b8ff', '#ffb48a', 1.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffc58f', 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 160;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);

  // ---- post ----
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .5, .55, .88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  Object.assign(world, { renderer, scene, camera, composer, sun, hemi, sky, skyMat, sunDir, bloom });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  world.gpu = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown').replace(/^ANGLE \((.*?),\s*/, '').replace(/\s*\(0x[0-9a-f]+\).*$/i, '').replace(/ Direct3D.*$/, '');
  world.softwareGL = /swiftshader|llvmpipe|basic render|software/i.test(world.gpu);
  world.integratedGPU = /intel|uhd|iris|radeon\(tm\) graphics|vega|apple m\d|mali|adreno/i.test(world.gpu);
  // sensible default before the first render; the settings panel may override it right after
  applyGfx(PRESETS[detectPreset()]);

  const deco = new THREE.Group(); scene.add(deco);
  buildGround(deco);
  bake(deco);
  buildCanal(scene);
  buildBridge(scene);
  return world;
}

// ---- graphics settings: presets + per-option values (the ⚙️ panel edits these) ----
// scale = fraction of the screen's native resolution; shadow = map size (0 = off)
export const PRESETS = {
  high:   { name: 'Cao',       scale: 1,   shadow: 2048, bloom: true },
  mid:    { name: 'Vừa',       scale: .85, shadow: 2048, bloom: true },
  low:    { name: 'Thấp',      scale: .75, shadow: 1024, bloom: false },
  vlow:   { name: 'Rất thấp',  scale: .6,  shadow: 1024, bloom: false },
  potato: { name: 'Siêu thấp', scale: .5,  shadow: 0,    bloom: false },
};
export const PRESET_ORDER = ['high', 'mid', 'low', 'vlow', 'potato'];

export function detectPreset() {
  if (world.softwareGL) return 'potato';
  if (world.integratedGPU) return 'low';
  return devicePixelRatio > 1.3 ? 'mid' : 'high';
}

export function applyGfx({ scale, shadow, bloom }) {
  const r = world.renderer;
  world.gfx = { scale, shadow, bloom, shadowEvery: shadow >= 2048 ? 1 : 2 };
  const pr = Math.min(2, devicePixelRatio * scale);
  r.setPixelRatio(pr); r.setSize(innerWidth, innerHeight);
  world.composer.setPixelRatio(pr); world.composer.setSize(innerWidth, innerHeight);
  const on = shadow > 0;
  if (r.shadowMap.enabled !== on) {
    r.shadowMap.enabled = on;
    // shadow on/off changes the shader code: recompile everything once
    world.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
  }
  const sh = world.sun.shadow;
  if (on && sh.mapSize.x !== shadow) { sh.mapSize.set(shadow, shadow); sh.map?.dispose(); sh.map = null; }
  r.shadowMap.needsUpdate = true;
}

let frameNo = 0;
export function renderFrame(skipEvery = 1) {
  frameNo++;
  if (frameNo % skipEvery) return; // panels open: the 3D behind them doesn't need 60 fps
  if (frameNo % world.gfx.shadowEvery === 0) world.renderer.shadowMap.needsUpdate = true;
  if (world.gfx.bloom) world.composer.render();
  else world.renderer.render(world.scene, world.camera);
}

let rainK = -1;
const FOG_DRY = new THREE.Color('#f3a37f'), FOG_WET = new THREE.Color('#8f95a3');
export function setRainLevel(k) {
  if (Math.abs(k - rainK) < .002) return;
  rainK = k;
  const u = world.skyMat.uniforms;
  u.top.value.copy(SKY.top).lerp(SKY.rainTop, k);
  u.horizon.value.copy(SKY.horizon).lerp(SKY.rainHorizon, k);
  u.sunK.value = 1 - k * .9;
  world.sun.intensity = lerp(3.1, 1.0, k);
  world.hemi.intensity = lerp(1.75, 1.05, k);
  world.scene.fog.color.copy(FOG_DRY).lerp(FOG_WET, k);
  world.scene.fog.far = lerp(190, 110, k);
}

const SUN_OFF = new THREE.Vector3(-45, 32, 22);
const sunBasis = new THREE.Matrix4().lookAt(SUN_OFF, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
const sunBasisInv = sunBasis.clone().invert();
const _sv = new THREE.Vector3();
export function followSun(target) {
  // snap the shadow camera to whole shadow-map texels so edges don't shimmer while the camera moves
  const s = world.sun, c = s.shadow.camera;
  const texel = (c.right - c.left) / s.shadow.mapSize.x;
  _sv.set(target.x, 0, target.z).applyMatrix4(sunBasisInv);
  _sv.x = Math.round(_sv.x / texel) * texel;
  _sv.y = Math.round(_sv.y / texel) * texel;
  _sv.applyMatrix4(sunBasis);
  s.target.position.copy(_sv);
  s.position.copy(_sv).add(SUN_OFF);
}

// ---------------------------------------------------------------------------
function buildGround(scene) {
  const { street } = LAYOUT;
  // big ground
  // ground stops at the canal (z=10.5) and resumes past the far bank so the water shows
  for (const [z0, z1] of [[-250, 10.5], [49, 250]]) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(500, z1 - z0), mat('#a9876a'));
    g.rotation.x = -Math.PI / 2; g.position.set(0, -0.02, (z0 + z1) / 2); g.receiveShadow = true;
    scene.add(g);
  }
  // canal bed so the water has depth colour
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(500, 40), mat('#2c4a3a'));
  bed.rotation.x = -Math.PI / 2; bed.position.set(0, -2.2, 30); scene.add(bed);

  // asphalt
  const road = new THREE.Mesh(new THREE.PlaneGeometry(street.x1 - street.x0 + 40, 8), mat('#4a4550', { roughness: .95 }));
  road.rotation.x = -Math.PI / 2; road.position.set((street.x0 + street.x1) / 2 + 10, 0, 0); road.receiveShadow = true;
  scene.add(road);
  // centre dashes
  const dashGeo = new THREE.PlaneGeometry(2.2, .18);
  const dashMat = mat('#f4e7c4', { roughness: .7 });
  for (let x = street.x0; x < street.x1 + 20; x += 5) {
    const d = new THREE.Mesh(dashGeo, dashMat); d.rotation.x = -Math.PI / 2; d.position.set(x, .01, 0); d.receiveShadow = true; scene.add(d);
  }
  // crosswalk at the alley
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(.6, 6.4), dashMat); s.rotation.x = -Math.PI / 2; s.position.set(LAYOUT.alleyX - 2.7 + i * .9, .012, 0); scene.add(s);
  }
  // sidewalks (raised)
  const swN = box(street.x1 - street.x0 + 40, .16, 3.5, '#d4a58a'); at(swN, (street.x0 + street.x1) / 2 + 10, .08, -5.75); scene.add(swN);
  const swS = box(street.x1 - street.x0 + 40, .16, 6, '#d4a58a'); at(swS, (street.x0 + street.x1) / 2 + 10, .08, 7); scene.add(swS);
  // gạch đỏ tile grid on sidewalks
  const tileMat = mat('#b47a62');
  for (let x = street.x0; x < street.x1 + 20; x += 1.5) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(.06, 3.4), tileMat); t.rotation.x = -Math.PI / 2; t.position.set(x, .165, -5.75); scene.add(t);
    const t2 = new THREE.Mesh(new THREE.PlaneGeometry(.06, 5.8), tileMat); t2.rotation.x = -Math.PI / 2; t2.position.set(x, .165, 7); scene.add(t2);
  }
  for (const z of [-6.6, -5.1, 5.1, 6.6, 8.1]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(street.x1 - street.x0 + 40, .06), tileMat); t.rotation.x = -Math.PI / 2; t.position.set((street.x0 + street.x1) / 2 + 10, .165, z); scene.add(t);
  }
  // curbs
  const curbN = box(street.x1 - street.x0 + 40, .2, .25, '#e8e0d4'); at(curbN, (street.x0 + street.x1) / 2 + 10, .1, -4.05); scene.add(curbN);
  const curbS = box(street.x1 - street.x0 + 40, .2, .25, '#e8e0d4'); at(curbS, (street.x0 + street.x1) / 2 + 10, .1, 4.05); scene.add(curbS);
  // alley ground
  const al = box(5, .12, 32, '#9c8f86'); at(al, LAYOUT.alleyX, .06, -23.5); scene.add(al);
  // base lot dirt
  const lot = box(17, .1, 10, '#8f7a62'); at(lot, -37, .05, -12.3); scene.add(lot);
  // manholes
  for (const x of [-20, 18, 38]) {
    const m = cyl(.5, .5, .03, 12, '#3a3640', { metalness: .5, roughness: .5 }); at(m, x, .015, 1.6); scene.add(m);
  }
}

function buildCanal(scene) {
  const S = new THREE.Group(); scene.add(S);
  // railing + embankment at z=10, water beyond
  const wall = box(160, .7, .4, '#d9cbb8'); at(wall, 7, .35, 10); S.add(wall);
  for (let x = -70; x < 85; x += 2.2) { const p = box(.12, .55, .12, '#7a6a5e'); at(p, x, .95, 10); S.add(p); }
  const rail = box(160, .1, .1, '#7a6a5e'); at(rail, 7, 1.2, 10); S.add(rail);
  const bank = box(160, 1.4, 1, '#bfae99'); at(bank, 7, -.7, 10.6); S.add(bank);

  const geo = new THREE.PlaneGeometry(200, 34, 70, 12);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#4a8a6c', roughness: .22, metalness: .1, flatShading: true, envMapIntensity: .9 }));
  water.position.set(7, -.9, 28); water.receiveShadow = true;
  scene.add(water);
  const base = geo.attributes.position.array.slice();
  world.updaters.push((dt, t) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], z = base[i + 2];
      p[i + 1] = Math.sin(x * .35 + t * 1.3) * .12 + Math.cos(z * .5 + t * .9) * .1;
    }
    geo.attributes.position.needsUpdate = true;
  });
  // far bank: cây dừa, dừa nước at the waterline, a few nhà ven kênh
  const far = box(200, 1.6, 6, '#7d8f5e'); at(far, 7, -.2, 47); S.add(far);
  const frondMat = mat('#4f7f3a'), nipaMat = mat('#5d8a3e');
  for (let x = -80; x < 90; x += 3.5 + Math.random() * 4) {
    const h = 5 + Math.random() * 3, lean = (Math.random() - .5) * .35, z = 46 + Math.random() * 3;
    const palm = new THREE.Group(); at(palm, x, .6, z); palm.rotation.z = lean; S.add(palm);
    const trunk = cyl(.14, .22, h, 5, '#8a7259'); trunk.position.y = h / 2; palm.add(trunk);
    for (let k = 0; k < 7; k++) {
      const arm = new THREE.Group(); arm.position.y = h; arm.rotation.y = k * .9; palm.add(arm);
      const fr = box(.35, .05, 2.4, frondMat); fr.position.set(0, -.35, 1.1); fr.rotation.x = .45; arm.add(fr);
    }
  }
  for (let x = -80; x < 90; x += 2.5 + Math.random() * 2) {
    for (let k = 0; k < 7; k++) { const n = cyl(0, .16, 2.6, 3, nipaMat); n.rotation.z = (k - 3) * .3; at(n, x + (k - 3) * .35, .7, 44.4); S.add(n); }
  }
  for (let x = -80; x < 90; x += 2 + Math.random() * 2) { // lush backdrop: chuối, tre, bụi
    const b = sphere(1.2 + Math.random(), ['#4f7f3a', '#5d8a3e', '#46733a'][Math.floor(Math.random() * 3)], 0); b.scale.y = .75; at(b, x, 1, 49.5 + Math.random()); S.add(b);
  }
  for (let x = -70; x < 85; x += 8 + Math.random() * 8) {
    const w = 3 + Math.random() * 2;
    const hs = box(w, 2.4, 3, ['#e8d9b0', '#c7e3a1', '#a9c8f0', '#f2c28a'][Math.floor(Math.random() * 4)]); at(hs, x, 1.8, 47.5); S.add(hs);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(1, 1.4, 4), mat(Math.random() < .5 ? '#b5452f' : '#7d9ab0')); rf.rotation.y = Math.PI / 4; rf.scale.set(w / 1.3, 1, 3 / 1.3); at(rf, x, 3.7, 47.5); S.add(rf);
  }
  // a little moored boat
  const boat = new THREE.Group();
  const hull = box(4, .6, 1.4, '#3a6ea5'); hull.position.y = .1; boat.add(hull);
  const rim = box(4.1, .15, 1.5, '#f1e3c2'); rim.position.y = .45; boat.add(rim);
  const roof = box(1.6, .1, 1.3, '#c0392b'); roof.position.set(.5, 1.4, 0); boat.add(roof);
  for (const sx of [-.2, 1.2]) { const p = box(.08, .9, .08, '#5b4636'); p.position.set(sx, .9, 0); boat.add(p); }
  for (const s of [-1, 1]) { // mắt ghe on the bow
    const eye = box(.4, .24, .02, '#f4f1ea'); eye.position.set(1.6, .18, s * .71); boat.add(eye);
    const pup = box(.14, .14, .02, '#1a1a1a'); pup.position.set(1.65, .18, s * .725); boat.add(pup);
  }
  boat.position.set(-6, -.85, 14);
  scene.add(boat);
  world.updaters.push((dt, t) => { boat.position.y = -.85 + Math.sin(t * 1.4) * .08; boat.rotation.z = Math.sin(t * 1.1) * .04; });
  bake(S);
}

function buildBridge(scene) {
  const S = new THREE.Group(); scene.add(S);
  // Elevated road: an E-W span above the base lot that turns north at x=-27 (the "gầm cầu").
  const deckMat = mat('#b9b2aa');
  const deck = box(68, 1.2, 9, deckMat); at(deck, -61, 7.4, -16); S.add(deck);
  const north = box(9, 1.2, 50, deckMat); at(north, -26.5, 7.4, -45.5); S.add(north);
  for (const z of [-11.7, -20.3]) { const pa = box(68, .9, .4, '#d8d0c6'); at(pa, -61, 8.4, z); S.add(pa); }
  for (const x of [-30.8, -22.2]) { const pa = box(.4, .9, 50, '#d8d0c6'); at(pa, x, 8.4, -45.5); S.add(pa); }
  const pillar = (x, z) => { const p = box(1.3, 7, 1.3, '#a59d94'); at(p, x, 3.4, z); S.add(p); };
  for (const x of [-46.5, -60, -74, -88]) {
    pillar(x, -12.6); pillar(x, -19.4);
    const cap = box(1.6, .8, 8.4, '#9e968c'); at(cap, x, 6.6, -16); S.add(cap);
  }
  pillar(-28, -19.4);
  for (const z of [-26, -38, -50, -62]) { pillar(-30.4, z); pillar(-22.6, z); }
  // weeds + stains at the pillar feet
  const stain = mat('#7f776f');
  for (const x of [-46.5]) { const s = box(1.32, 1.6, .02, stain); at(s, x, 1.2, -11.94); s.castShadow = false; S.add(s); }
  for (let i = 0; i < 14; i++) {
    const w = cyl(0, .25, .5 + Math.random() * .4, 4, '#6f8a3e'); at(w, -45 + Math.random() * 16, .25, -17.5 + Math.random() * 1.2); S.add(w);
  }
  // lamp posts with glow
  for (const x of [-86, -72, -58, -44, -30]) {
    const pole = cyl(.07, .09, 3, 6, '#566070'); at(pole, x, 9.4, -11.9); S.add(pole);
    const lamp = box(.6, .18, .3, mat('#fff1c9', { emissive: '#ffd28a', emissiveIntensity: 2.2 })); at(lamp, x, 10.9, -11.6); S.add(lamp);
  }
  // slow cars on the span for life (scale in/out at the ends instead of popping)
  const cars = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Group();
    const b = box(3.4, 1, 1.6, ['#e9e4dc', '#d14b3c', '#3d6fb6', '#f0c040'][i]); b.position.y = .6; c.add(b);
    const t = box(1.8, .7, 1.5, '#2c3e50'); t.position.set(-.2, 1.4, 0); c.add(t);
    c.position.set(-92 + i * 17, 8, i % 2 ? -14 : -18);
    c.userData.dir = i % 2 ? 1 : -1;
    scene.add(c); cars.push(c);
  }
  world.updaters.push((dt) => {
    for (const c of cars) {
      c.position.x += c.userData.dir * dt * 8;
      if (c.position.x > -31) c.position.x = -94;
      if (c.position.x < -94) c.position.x = -31;
      const edge = Math.min(c.position.x + 94, -31 - c.position.x);
      c.scale.setScalar(Math.min(1, edge / 3));
    }
  });
  bake(S);
}

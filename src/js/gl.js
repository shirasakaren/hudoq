// One fixed WebGL canvas. The 3D Hudoq mask "lives" on the page: each frame it snaps to the
// nearest [data-mask-anchor] element (hero, lab, finale), so it travels with the scroll.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { asset } from './url.js';

const MODEL_W = 1.9, MODEL_H = 1.6;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

function leafTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.translate(64, 128);
  g.beginPath();
  g.moveTo(0, -120);
  g.bezierCurveTo(70, -70, 62, 60, 0, 124);
  g.bezierCurveTo(-62, 60, -70, -70, 0, -120);
  const grad = g.createLinearGradient(-60, 0, 60, 0);
  grad.addColorStop(0, '#d8d8d8'); grad.addColorStop(.5, '#ffffff'); grad.addColorStop(1, '#cfcfcf');
  g.fillStyle = grad; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -118); g.lineTo(0, 124); g.stroke();
  g.lineWidth = 1.4;
  for (let i = -100; i < 110; i += 17) {
    g.beginPath(); g.moveTo(0, i); g.lineTo(46 - Math.abs(i) * .18, i - 22); g.moveTo(0, i); g.lineTo(-46 + Math.abs(i) * .18, i - 22); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function createGL({ canvas, onProgress, reduced = false }) {
  const isSmall = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  let dprCap = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 1.75);
  renderer.setPixelRatio(dprCap);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
  scene.environmentIntensity = 0.42;

  const key = new THREE.DirectionalLight('#ffd9a0', 2.6); key.position.set(-3, 4, 6); scene.add(key);
  const rimR = new THREE.DirectionalLight('#e5533d', 3.2); rimR.position.set(5, 1.5, -4); scene.add(rimR);
  const rimL = new THREE.DirectionalLight('#d9a441', 1.9); rimL.position.set(-5, 0, -3); scene.add(rimL);

  // rig → head → model, so we can place, then look, independently
  const rig = new THREE.Group(); scene.add(rig);
  const head = new THREE.Group(); rig.add(head);

  // ── mask model
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((res, rej) => loader.load(asset('/models/hudoq-mask.glb'), res, (e) => e.lengthComputable && onProgress?.(e.loaded / e.total), rej));
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const ctr = box.getCenter(new THREE.Vector3());
  model.position.sub(ctr);
  // front faces keep the painted texture; the inside (seen from behind) is bare, dark wood — the mask is hollow
  const hollow = new THREE.MeshStandardMaterial({ color: '#3a2616', roughness: 0.92, metalness: 0, side: THREE.BackSide });
  const backs = [];
  model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.envMapIntensity = 1; o.material.side = THREE.FrontSide; } backs.push(o); } });
  backs.forEach((o) => { const b = o.clone(); b.material = hollow; b.frustumCulled = false; o.parent.add(b); });
  head.add(model);

  // ── falling leaves + embers
  const leafCount = reduced ? 0 : isSmall ? 26 : 64;
  const leafMat = new THREE.MeshBasicMaterial({ map: leafTexture(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, depthWrite: false, opacity: 0 });
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(.34, .68), leafMat, Math.max(1, leafCount));
  leaves.frustumCulled = false; leaves.visible = leafCount > 0;
  const pal = ['#2f5d3a', '#3f7a3c', '#6aa04a', '#9acb5b', '#c8412b', '#d9a441'].map((c) => new THREE.Color(c));
  const ld = [];
  for (let i = 0; i < leafCount; i++) {
    ld.push({ x: (Math.random() - .5) * 15, y: (Math.random() - .5) * 9, z: -4 + Math.random() * 6.5, vy: .12 + Math.random() * .34, sw: Math.random() * 6.28, sa: .3 + Math.random() * .8,
      rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: Math.random() * 6.28, sx: .6 + Math.random() * 1.2, sy: (Math.random() - .5) * 1.8, sz: (Math.random() - .5) * 1.2, s: .55 + Math.random() * .9 });
    leaves.setColorAt(i, pal[Math.random() < .18 ? 4 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 4)]);
  }
  if (leafCount) scene.add(leaves);

  const emberCount = reduced ? 0 : isSmall ? 70 : 180;
  const eg = new THREE.BufferGeometry();
  const ep = new Float32Array(emberCount * 3), es = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) { ep[i * 3] = (Math.random() - .5) * 14; ep[i * 3 + 1] = (Math.random() - .5) * 9; ep[i * 3 + 2] = -3 + Math.random() * 5; es[i] = Math.random(); }
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: '#f0b64d', size: 0.05, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  embers.frustumCulled = false;
  if (emberCount) scene.add(embers);

  // ── anchors & state
  const anchors = [...document.querySelectorAll('[data-mask-anchor]')].map((el) => ({ el, pose: el.dataset.pose }));
  const state = {
    x: 0, y: 0, s: 0.01, mx: 0, my: 0, lookX: 0, lookY: 0,
    intro: 0, introSpin: 0, leafA: 0, emberA: 0, active: null,
    lab: { on: false, yaw: 0, pitch: 0 }, extraYaw: 0,
  };
  const target = { x: 0, y: 0, s: 0.01 };
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  let vw = innerWidth, vh = innerHeight;
  function resize() {
    vw = innerWidth; vh = innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);
  const unitsPerPx = () => (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / vh;

  function pickAnchor() {
    let best = null, bestD = Infinity;
    for (const a of anchors) {
      const r = a.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.width === 0) continue;
      const d = Math.abs(r.top + r.height / 2 - vh / 2);
      if (d < bestD) { bestD = d; best = { ...a, r }; }
    }
    return best;
  }

  // frame-time monitor → adaptive pixel ratio (never changes the story, only sharpness)
  let slow = 0, fast = 0, frames = 0;
  function adapt(dt) {
    frames++;
    if (dt > 0.026) slow++; else if (dt < 0.019) fast++;
    if (frames >= 90) {
      if (slow > 55 && dprCap > 1) { dprCap = Math.max(1, dprCap - 0.25); renderer.setPixelRatio(dprCap); resize(); }
      else if (fast > 85 && dprCap < Math.min(window.devicePixelRatio || 1, 1.75)) { dprCap += 0.25; renderer.setPixelRatio(dprCap); resize(); }
      frames = slow = fast = 0;
    }
  }

  const tmp = new THREE.Vector3();
  let last = performance.now() / 1000, running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now() / 1000; });

  function frame() {
    if (!running) return;
    const now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now;
    const a = pickAnchor();
    const upp = unitsPerPx();

    if (a) {
      const { r } = a;
      target.x = (r.left + r.width / 2 - vw / 2) * upp;
      target.y = -(r.top + r.height / 2 - vh / 2) * upp;
      target.s = Math.min((r.width * upp) / MODEL_W, (r.height * upp) / MODEL_H);
      state.active = a.pose;
      canvas.classList.toggle('is-on', true);
    } else {
      state.active = null;
      canvas.classList.toggle('is-on', false);
    }
    if (state.s < 0.02 && a) { state.x = target.x; state.y = target.y; state.s = target.s * 0.7; }
    const k = a ? 9 : 4;
    state.x = damp(state.x, target.x, k, dt);
    state.y = damp(state.y, target.y, k, dt);
    state.s = damp(state.s, target.s, k, dt);

    // look at the pointer (gently), in the hero and finale only; the lab hands control to the user
    const lookOn = state.active === 'hero' || state.active === 'finale';
    const lx = lookOn ? pointer.x : 0, ly = lookOn ? pointer.y : 0;
    state.lookX = damp(state.lookX, lx, 3.2, dt);
    state.lookY = damp(state.lookY, ly, 3.2, dt);

    const t = now;
    const breathe = Math.sin(t * 0.9) * 0.012;
    rig.position.set(state.x, state.y + breathe * 2, 0);
    const s = state.s * (0.55 + 0.45 * state.intro);
    rig.scale.setScalar(Math.max(0.0001, s));
    const lab = state.lab;
    head.rotation.y = state.lookX * 0.55 + lab.yaw + state.extraYaw + (1 - state.intro) * -2.6 + state.introSpin + Math.sin(t * 0.5) * 0.04;
    head.rotation.x = state.lookY * 0.28 + lab.pitch + Math.sin(t * 0.7) * 0.015;
    head.rotation.z = state.lookX * -0.05;

    // leaves + embers fade with the active pose
    const centred = a ? clamp(1 - Math.abs(a.r.top + a.r.height / 2 - vh / 2) / (vh * 0.75), 0, 1) : 0; // leaves fade as the anchor drifts off-centre
    const wantLeaf = (state.active === 'hero' || state.active === 'finale' ? 1 : 0) * centred;
    state.leafA = damp(state.leafA, wantLeaf * state.intro, 2.4, dt);
    leafMat.opacity = state.leafA * 0.92;
    embers.material.opacity = state.leafA * 0.85;

    if (leafCount && state.leafA > 0.01) {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
      for (let i = 0; i < leafCount; i++) {
        const d = ld[i];
        d.y -= d.vy * dt; d.sw += dt * 0.7; d.rx += d.sx * dt * .7; d.ry += d.sy * dt; d.rz += d.sz * dt * .5;
        if (d.y < -5.2) { d.y = 5.2; d.x = (Math.random() - .5) * 15; }
        p.set(d.x + Math.sin(d.sw) * d.sa, d.y, d.z); e.set(d.rx, d.ry, d.rz); q.setFromEuler(e); sc.setScalar(d.s);
        m4.compose(p, q, sc); leaves.setMatrixAt(i, m4);
      }
      leaves.instanceMatrix.needsUpdate = true;
    }
    if (emberCount && state.leafA > 0.01) {
      const pos = eg.attributes.position;
      for (let i = 0; i < emberCount; i++) {
        let y = pos.getY(i) + dt * (0.12 + es[i] * 0.22);
        if (y > 5) y = -5;
        pos.setY(i, y); pos.setX(i, pos.getX(i) + Math.sin(t * 0.6 + es[i] * 20) * dt * 0.08);
      }
      pos.needsUpdate = true;
    }

    if (a || state.leafA > 0.02) { renderer.render(scene, camera); adapt(dt); }
  }
  gsap.ticker.add(frame);

  // ── public API
  const api = {
    renderer, scene, camera, head, state,
    /** local-space point on the mask → client px (for hotspot pins) */
    project(local) {
      tmp.set(local[0], local[1], local[2]);
      model.localToWorld(tmp);
      tmp.project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * vw, y: (-tmp.y * 0.5 + 0.5) * vh, behind: tmp.z > 1 };
    },
    /** world-space normal facing camera? local-space direction of a point (for visibility tests) */
    facing(local) {
      tmp.set(local[0], local[1], local[2]);
      model.localToWorld(tmp);
      const n = tmp.clone().sub(rig.position).normalize();
      return n.z; // >0 = faces camera
    },
    intro() {
      state.intro = 0; state.introSpin = 0;
      return gsap.timeline()
        .to(state, { intro: 1, duration: 2.2, ease: 'h.reveal' }, 0)
        .fromTo(state, { introSpin: 0.0 }, { introSpin: 0, duration: 0.01 }, 0);
    },
    setIntro(v) { state.intro = v; },
    pulse() { gsap.fromTo(state, { introSpin: 0 }, { introSpin: Math.PI * 2, duration: 1.6, ease: 'h.move', onComplete: () => { state.introSpin = 0; } }); },
    dispose() { gsap.ticker.remove(frame); renderer.dispose(); },
  };
  return api;
}

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
  let dprCap = Math.min(window.devicePixelRatio || 1, isSmall ? 1.25 : 1.75);
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
  // one shader patch gives the mask a rim light (breathes with the gong) and an ember dissolve (burn in / burn out)
  const U = { uRim: { value: 0.35 }, uRimColor: { value: new THREE.Color('#d9a441') }, uDissolve: { value: 1 }, uEdge: { value: new THREE.Color('#ff7a2e') }, uAudio: { value: 0 } };
  const patch = (m) => {
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uRim, uDissolve, uAudio; uniform vec3 uRimColor, uEdge; varying vec3 vObj;
          float h3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
          float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
            return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x), f.y),
                       mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x), f.y), f.z); }`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          float dn = vn(vObj * 7.0) * 0.65 + vn(vObj * 23.0) * 0.35 + (vObj.y * 0.25);
          if (dn < uDissolve * 1.25 - 0.05) discard;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float edge = 1.0 - smoothstep(0.0, 0.07, dn - (uDissolve * 1.25 - 0.05));
          totalEmissiveRadiance += uEdge * edge * step(0.001, uDissolve) * 5.0;`)
        .replace('#include <opaque_fragment>', `
          float fr = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 3.0);
          outgoingLight += uRimColor * fr * (uRim + uAudio * 0.8);
          #include <opaque_fragment>`);
    };
    m.needsUpdate = true;
  };
  // front faces keep the painted texture; the inside (seen from behind) is bare, dark wood — the mask is hollow
  const hollow = new THREE.MeshStandardMaterial({ color: '#3a2616', roughness: 0.92, metalness: 0, side: THREE.BackSide });
  const backs = [], samples = []; let sampleMesh = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.renderOrder = 2;
    if (o.material) { o.material.envMapIntensity = 1; o.material.side = THREE.FrontSide; patch(o.material); }
    backs.push(o);
    if (!sampleMesh) sampleMesh = o;
  });
  patch(hollow);
  backs.forEach((o) => { const b = o.clone(); b.material = hollow; b.frustumCulled = false; b.renderOrder = 2; o.parent.add(b); });
  if (sampleMesh) { // pre-sample points on the mask surface: embers are born here when it burns
    const pa = sampleMesh.geometry.attributes.position;
    for (let i = 0; i < 240; i++) { const k = Math.floor(Math.random() * pa.count); samples.push(new THREE.Vector3(pa.getX(k), pa.getY(k), pa.getZ(k))); }
  }
  head.add(model);

  // ── leaves (all motion on the GPU) + embers
  const leafCount = reduced ? 0 : isSmall ? 18 : 48;
  const Ulv = { uTime: { value: 0 }, uWind: { value: 0 } };
  const leafMat = new THREE.MeshBasicMaterial({ map: leafTexture(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, depthWrite: false, opacity: 0 });
  leafMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, Ulv);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSeed; uniform float uTime, uWind; varying float vShade;')
      .replace('#include <begin_vertex>', `
        float t = uTime * (0.25 + aSeed.x * 0.35) + aSeed.y * 40.0;
        float a = t * (0.6 + aSeed.z), b = t * 0.7;
        mat3 R = mat3(cos(a),sin(a),0., -sin(a),cos(a),0., 0.,0.,1.) * mat3(1.,0.,0., 0.,cos(b),sin(b), 0.,-sin(b),cos(b));
        vec3 transformed = R * position;
        float fall = 5.2 - mod(t * 1.1, 10.4);
        transformed.y += fall;
        transformed.x += sin(t * 1.3) * (0.3 + aSeed.w) + uWind * (0.6 + aSeed.w) * (5.2 - fall) * 0.12;
        vShade = 0.55 + 0.45 * abs((R * vec3(0.,0.,1.)).z);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vShade;')
      .replace('#include <opaque_fragment>', 'outgoingLight *= vShade;\n#include <opaque_fragment>');
  };
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(.34, .68), leafMat, Math.max(1, leafCount));
  leaves.frustumCulled = false; leaves.visible = leafCount > 0; leaves.renderOrder = 1;
  const seeds = new Float32Array(Math.max(1, leafCount) * 4);
  const pal = ['#2f5d3a', '#3f7a3c', '#6aa04a', '#9acb5b', '#c8412b', '#d9a441'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), sc = new THREE.Vector3();
  for (let i = 0; i < leafCount; i++) {
    seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    sc.setScalar(0.55 + Math.random() * 0.9);
    m4.compose(new THREE.Vector3((Math.random() - .5) * 15, 0, -4 + Math.random() * 4.4), new THREE.Quaternion(), sc); // x/z spread only; the shader does the rest
    leaves.setMatrixAt(i, m4);
    leaves.setColorAt(i, pal[Math.random() < .18 ? 4 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 4)]);
  }
  leaves.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  leaves.instanceMatrix.needsUpdate = true;
  if (leafCount) scene.add(leaves);

  const emberCount = reduced ? 0 : isSmall ? 60 : 160;
  const eg = new THREE.BufferGeometry();
  const ep = new Float32Array(emberCount * 3), ev = new Float32Array(emberCount * 3), el = new Float32Array(emberCount), ec = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) { ep[i * 3] = (Math.random() - .5) * 14; ep[i * 3 + 1] = (Math.random() - .5) * 9; ep[i * 3 + 2] = -3 + Math.random() * 5; el[i] = Math.random(); ec.set([1, 0.75, 0.3], i * 3); }
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  eg.setAttribute('color', new THREE.BufferAttribute(ec, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: '#f0b64d', size: 0.05, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  embers.frustumCulled = false;
  if (emberCount) scene.add(embers);

  // ── anchors & state
  const anchors = [...document.querySelectorAll('[data-mask-anchor]')].map((el) => ({ el, pose: el.dataset.pose }));
  const state = {
    x: 0, y: 0, s: 0.01, mx: 0, my: 0, lookX: 0, lookY: 0,
    intro: 0, introSpin: 0, leafA: 0, leafKill: 0, burst: 0, emberA: 0, emberMode: 'ambient', active: null,
    lab: { on: false, yaw: 0, pitch: 0, zoom: 1, ox: 0, oy: 0, key: 0, rim: 0, userYaw: 0, userPitch: 0 }, extraY: 0, hold: null,
    // per-pose offsets: each chapter tweens only its own, and only the active pose is applied, so nothing leaks between chapters
    fx: { hero: { yaw: 0, pitch: 0, scale: 1, rim: 0 }, finale: { yaw: 0, pitch: 0, scale: 1, rim: 0 } },
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
  let last = performance.now() / 1000, running = true, clock = 0;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now() / 1000; });
  const baseKeyAngle = Math.atan2(-3, 6), keyR = Math.hypot(-3, 6);
  const NEUTRAL_FX = { yaw: 0, pitch: 0, scale: 1, rim: 0 };
  const spawnBurn = (i) => {
    if (!samples.length || !sampleMesh) return false;
    tmp.copy(samples[Math.floor(Math.random() * samples.length)]);
    sampleMesh.localToWorld(tmp);
    ep[i * 3] = tmp.x; ep[i * 3 + 1] = tmp.y; ep[i * 3 + 2] = tmp.z;
    const out = tmp.clone().sub(rig.position).normalize();
    ev[i * 3] = out.x * 0.9 + (Math.random() - 0.5) * 0.6; ev[i * 3 + 1] = 0.7 + Math.random() * 1.1; ev[i * 3 + 2] = out.z * 0.4;
    el[i] = 1; return true;
  };

  function frame() {
    if (!running) return;
    const now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now; clock += dt;
    const a = pickAnchor();
    const upp = unitsPerPx();

    if (a) {
      const { r } = a;
      target.x = (r.left + r.width / 2 - vw / 2) * upp;
      target.y = -(r.top + r.height / 2 - vh / 2) * upp;
      target.s = Math.min((r.width * upp) / MODEL_W, (r.height * upp) / MODEL_H);
      state.active = a.pose;
    } else {
      state.active = null;
    }
    canvas.classList.toggle('is-on', !!a || state.leafA > 0.02); // stays on while a leaf burst is still falling
    if (state.s < 0.02 && a) { state.x = target.x; state.y = target.y; state.s = target.s * 0.7; }
    const k = a ? 9 : 4;
    state.x = damp(state.x, target.x, k, dt);
    state.y = damp(state.y, target.y, k, dt);
    state.s = damp(state.s, target.s, k, dt);

    const lookOn = state.active === 'hero' || state.active === 'finale';
    const lx = lookOn ? pointer.x : 0, ly = lookOn ? pointer.y : 0;
    state.lookX = damp(state.lookX, lx, 3.2, dt);
    state.lookY = damp(state.lookY, ly, 3.2, dt);

    const t = now, lab = state.lab;
    const breathe = Math.sin(t * 0.9) * 0.012;
    const fx = state.fx[state.active] || NEUTRAL_FX;
    const sFinal = state.s * (0.94 + 0.06 * state.intro) * lab.zoom * fx.scale;
    rig.position.set(state.x + lab.ox * state.s, state.y + breathe * 2 + lab.oy * state.s + state.extraY * state.s, 0);
    rig.scale.setScalar(Math.max(0.0001, sFinal));
    head.rotation.y = state.lookX * 0.55 + lab.yaw + lab.userYaw + fx.yaw + state.introSpin + Math.sin(t * 0.5) * 0.04;
    head.rotation.x = state.lookY * 0.28 + lab.pitch + lab.userPitch + fx.pitch + (1 - state.intro) * 0.22 + Math.sin(t * 0.7) * 0.015;
    head.rotation.z = state.lookX * -0.05;

    // light study: the key light swings around the mask and the rim lifts per station (lab only)
    const ka = baseKeyAngle + lab.key;
    key.position.set(Math.sin(ka) * keyR, 4, Math.cos(ka) * keyR);
    const rimSum = lab.rim + fx.rim;
    rimL.intensity = 1.9 * (1 + rimSum); rimR.intensity = 3.2 * (1 + rimSum * 0.6);
    U.uRim.value = 0.35 + rimSum * 0.6 + (api.level ? api.level.lo * 0.8 : 0);

    // leaves: only the hero, the suit's cloak burst and the finale; never over paper
    const centred = a ? clamp(1 - Math.abs(a.r.top + a.r.height / 2 - vh / 2) / (vh * 0.75), 0, 1) : 0;
    let wantLeaf = 0;
    if (state.active === 'hero') wantLeaf = centred * (1 - state.leafKill);
    else if (state.active === 'finale') wantLeaf = clamp((centred - 0.45) / 0.35, 0, 1); // never over the paper chapter above
    wantLeaf = Math.max(wantLeaf, state.burst);
    state.leafA = damp(state.leafA, wantLeaf * (state.intro > 0.05 ? 1 : 0), 6, dt);
    leafMat.opacity = state.leafA * 0.92;
    Ulv.uTime.value = clock;
    embers.material.opacity = Math.max(state.leafA, state.emberMode === 'burn' ? 1 : 0) * 0.85;

    if (emberCount && embers.material.opacity > 0.01) {
      const pos = eg.attributes.position, col = eg.attributes.color;
      const burn = state.emberMode === 'burn';
      for (let i = 0; i < emberCount; i++) {
        if (burn) {
          if (el[i] <= 0 || el[i] > 1.01) { if (U.uDissolve.value > 0.03 && U.uDissolve.value < 0.97 && Math.random() < 0.5) spawnBurn(i); else { el[i] = 0; col.setXYZ(i, 0, 0, 0); continue; } }
          el[i] -= dt * 0.55;
          pos.setXYZ(i, pos.getX(i) + ev[i * 3] * dt, pos.getY(i) + ev[i * 3 + 1] * dt, pos.getZ(i) + ev[i * 3 + 2] * dt);
          const f = Math.max(0, el[i]); col.setXYZ(i, f, f * 0.55, f * 0.15);
        } else {
          let y = pos.getY(i) + dt * (0.12 + (i % 7) * 0.03);
          if (y > 5) y = -5;
          pos.setY(i, y); pos.setX(i, pos.getX(i) + Math.sin(t * 0.6 + i) * dt * 0.08);
          col.setXYZ(i, 1, 0.75, 0.3);
        }
      }
      pos.needsUpdate = true; col.needsUpdate = true;
    }

    if (a || state.leafA > 0.02 || state.hold) { renderer.render(scene, camera); adapt(dt); }
  }
  gsap.ticker.add(frame);

  // ── public API
  const api = {
    renderer, scene, camera, head, state, uniforms: U, level: null,
    /** local-space point on the mask → client px (for hotspot pins / leader lines) */
    project(local) {
      tmp.set(local[0], local[1], local[2]);
      model.localToWorld(tmp);
      tmp.project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * vw, y: (-tmp.y * 0.5 + 0.5) * vh, behind: tmp.z > 1 };
    },
    /** >0 when a local-space point faces the camera */
    facing(local) {
      tmp.set(local[0], local[1], local[2]);
      model.localToWorld(tmp);
      return tmp.clone().sub(rig.position).normalize().z;
    },
    /** burn the mask in: the dissolve edge glows ember-orange and recedes */
    dissolveIn(d = 0.9) { state.emberMode = 'burn'; U.uDissolve.value = 1; return gsap.to(U.uDissolve, { value: 0, duration: d, ease: 'h.reveal', onComplete: () => { state.emberMode = 'ambient'; } }); },
    dissolveOut(d = 1.6) { state.emberMode = 'burn'; return gsap.to(U.uDissolve, { value: 1, duration: d, ease: 'h.move' }); },
    show() { U.uDissolve.value = 0; },
    setWind(v) { Ulv.uWind.value = v; },
    hide() { U.uDissolve.value = 1; },
    /** the cloak moment: a short flurry of leaves in front of the figure */
    leafBurst(ms = 2500) { state.burst = 1; setTimeout(() => { state.burst = 0; }, ms); },
    /** settle after the loader hands over */
    intro() {
      state.intro = 0;
      return gsap.to(state, { intro: 1, duration: 1.4, ease: 'h.reveal' });
    },
    setIntro(v) { state.intro = v; },
    pulse() { gsap.fromTo(state, { introSpin: 0 }, { introSpin: Math.PI * 2, duration: 1.6, ease: 'h.move', onComplete: () => { state.introSpin = 0; } }); },
    dispose() { gsap.ticker.remove(frame); renderer.dispose(); },
  };
  return api;
}

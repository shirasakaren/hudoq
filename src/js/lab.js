import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';

// Local-space anchor on the mask for each station + the pose that shows it best.
// (the model is centred on the origin; front faces +z)
export const STATIONS = [
  { name: 'Eyes',   pt: [0.265, 0.12, 0.34],  yaw: 0.0,   pitch: 0.0 },
  { name: 'Beak',   pt: [0.0, -0.1, 0.52],    yaw: 1.05,  pitch: 0.02 },
  { name: 'Ears',   pt: [0.78, 0.18, 0.05],   yaw: -0.62, pitch: 0.1 },
  { name: 'Jaw',    pt: [0.0, -0.36, 0.36],   yaw: 0.32,  pitch: -0.2 },
  { name: 'Hollow', pt: [0.0, 0.0, -0.4],     yaw: Math.PI, pitch: 0.08 },
];

/** Chapter 06: drag the real 3D mask, or scroll through five stations. */
export function initLab(gl, lenis, reduced) {
  const section = document.getElementById('mask');
  const stage = document.getElementById('labStage');
  const notes = [...section.querySelectorAll('.lab-note')];
  const dotsBox = document.getElementById('labDots');
  const pinsBox = document.getElementById('labPins');
  const lab = gl?.state.lab;

  const dots = STATIONS.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'lab-dot'; b.type = 'button'; b.textContent = s.name; b.dataset.cursor = '';
    b.addEventListener('click', () => goTo(i));
    dotsBox.appendChild(b); return b;
  });
  const pins = STATIONS.map(() => { const p = document.createElement('i'); p.className = 'lab-pin-dot'; pinsBox.appendChild(p); return p; });

  let cur = -1, st = null, userTouched = false;
  function setStation(i, fromUser = false) {
    if (i === cur) return; cur = i;
    notes.forEach((n, j) => n.classList.toggle('is-active', j === i));
    dots.forEach((d, j) => d.classList.toggle('is-active', j === i));
    pins.forEach((p, j) => p.classList.toggle('is-active', j === i));
    if (lab) gsap.to(lab, { yaw: STATIONS[i].yaw, pitch: STATIONS[i].pitch, duration: 1.4, ease: 'expo.inOut', overwrite: true });
    audio.pluck(i * 2, 0, 0.6);
  }
  function goTo(i) {
    if (!st) { setStation(i, true); return; }
    lenis.scrollTo(st.start + (st.end - st.start) * ((i + 0.5) / STATIONS.length), { duration: 1.4 });
  }
  setStation(0);

  if (reduced || !gl) {
    section.classList.add('is-static');
    return;
  }

  st = ScrollTrigger.create({
    trigger: section, start: 'top top', end: '+=420%', pin: '.lab-pin', scrub: true, anticipatePin: 1,
    onUpdate: (self) => setStation(Math.min(STATIONS.length - 1, Math.floor(self.progress * STATIONS.length))),
    onToggle: (self) => { if (!self.isActive && lab) gsap.to(lab, { yaw: 0, pitch: 0, duration: 1.2, ease: 'expo.out', overwrite: true }); },
  });

  // drag to spin (with a little inertia)
  let dragging = false, lx = 0, ly = 0, vx = 0, vy = 0;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true; lx = e.clientX; ly = e.clientY; vx = vy = 0; stage.setPointerCapture(e.pointerId); gsap.killTweensOf(lab);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    vx = dx * 0.011; vy = dy * 0.007;
    lab.yaw += vx; lab.pitch = Math.max(-0.7, Math.min(0.7, lab.pitch + vy));
  });
  const end = () => { dragging = false; };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  gsap.ticker.add(() => {
    if (dragging || !st?.isActive) return;
    if (Math.abs(vx) > 0.0004 || Math.abs(vy) > 0.0004) { lab.yaw += vx; lab.pitch = Math.max(-0.7, Math.min(0.7, lab.pitch + vy)); vx *= 0.93; vy *= 0.93; }
  });
  stage.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key];
    if (!k) return; e.preventDefault();
    gsap.to(lab, { yaw: lab.yaw + k[0], pitch: Math.max(-0.7, Math.min(0.7, lab.pitch + k[1])), duration: 0.5, ease: 'power3.out', overwrite: true });
  });

  // keep the pulsing pin glued to the active part of the mask
  gsap.ticker.add(() => {
    if (!st.isActive || cur < 0) return;
    const s = STATIONS[cur], pin = pins[cur];
    const f = gl.facing(s.pt);
    const pos = gl.project(s.pt);
    pin.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    pin.style.opacity = f > 0.05 || s.name === 'Hollow' ? 1 : 0.15;
  });
}

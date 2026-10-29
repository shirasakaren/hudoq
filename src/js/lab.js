import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';
import { stepper, nearestStep } from './reveal.js';

// Per part: where the mask points, how far the camera pushes in, where it slides to, where the key light swings, how hard the rim lifts.
// `pt` is a local-space point on the mask the leader line is attached to.
export const STATIONS = [
  { name: 'Eyes',   pt: [0.265, 0.12, 0.34], yaw: 0,       pitch: 0,    zoom: 1.75, ox: -0.12, oy: -0.18, key: -0.6, rim: 0.4 },
  { name: 'Beak',   pt: [0.0, -0.1, 0.52],   yaw: 1.05,    pitch: 0.02, zoom: 1.55, ox: 0.05,  oy: 0.05,  key: 0.9,  rim: 0.6 },
  { name: 'Ears',   pt: [0.78, 0.18, 0.05],  yaw: -0.62,   pitch: 0.1,  zoom: 1.3,  ox: -0.25, oy: -0.05, key: -1.2, rim: 0.5 },
  { name: 'Jaw',    pt: [0.0, -0.36, 0.36],  yaw: 0.32,    pitch: -0.2, zoom: 1.65, ox: 0,     oy: 0.3,   key: 0.3,  rim: 0.3 },
  { name: 'Hollow', pt: [0.0, 0.0, -0.4],    yaw: Math.PI, pitch: 0.08, zoom: 1.05, ox: 0,     oy: 0,     key: 2.6,  rim: 1.0 },
];

/** Chapter 06: a light study. Scroll moves the camera, the key light and the rim per part; drag adds your own turn on top. */
export function initLab(gl, lenis, reduced, L = 1) {
  const section = document.getElementById('mask');
  const stage = document.getElementById('labStage');
  const notes = [...section.querySelectorAll('.lab-note')];
  const dotsBox = document.getElementById('labDots');
  const pin = section.querySelector('.lab-pin');
  const lab = gl?.state.lab;
  const NS = 'http://www.w3.org/2000/svg';
  const leader = document.createElementNS(NS, 'svg'); leader.setAttribute('class', 'lab-leader'); leader.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(NS, 'line'); const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', 5);
  leader.append(line, dot); pin.appendChild(leader);
  section.querySelector('#labPins')?.remove();

  const dots = STATIONS.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'lab-dot'; b.type = 'button'; b.textContent = s.name; b.dataset.cursor = '';
    b.addEventListener('click', () => goTo(i));
    dotsBox.appendChild(b); return b;
  });

  let cur = -1, st = null, tl = null, dragging = false, idleAt = 0;
  function setStation(i) {
    if (i === cur) return; cur = i;
    notes.forEach((n, j) => n.setAttribute('aria-hidden', j === i ? 'false' : 'true'));
    dots.forEach((d, j) => d.classList.toggle('is-active', j === i));
    gsap.fromTo(line, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.5, ease: 'h.reveal' });
    audio.tick(1400, 0.3);
  }
  function goTo(i) {
    if (!st) { setStation(i); return; }
    const p = tl.labels['s' + i] / tl.duration();
    lenis.scrollTo(st.start + (st.end - st.start) * p, { duration: 1.4 });
  }
  setStation(0);

  if (reduced || !gl) { section.classList.add('is-static'); notes.forEach((n) => gsap.set([...n.children], { autoAlpha: 1 })); leader.remove(); return; }

  // scroll drives the study: notes cross-fade; the camera, key light and rim move on the same labels
  tl = stepper(notes, { hold: 0.9, xf: 0.5 });
  STATIONS.forEach((k, i) => {
    if (i === 0) { tl.fromTo(lab, { yaw: 0, pitch: 0, zoom: 1, ox: 0, oy: 0, key: 0, rim: 0 }, { yaw: k.yaw, pitch: k.pitch, zoom: k.zoom, ox: k.ox, oy: k.oy, key: k.key, rim: k.rim, duration: 0.5, ease: 'h.move' }, 0); return; }
    tl.to(lab, { yaw: k.yaw, pitch: k.pitch, zoom: k.zoom, ox: k.ox, oy: k.oy, key: k.key, rim: k.rim, duration: 1.1, ease: 'h.move' }, `s${i}-=0.6`);
  });
  st = ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + Math.round(innerHeight * 3.6 * L), pin: '.lab-pin', scrub: 0.8, anticipatePin: 1,
    animation: tl, invalidateOnRefresh: true,
    onUpdate: () => setStation(nearestStep(tl, notes.length)),
    onToggle: (self) => { if (!self.isActive) gsap.to(lab, { yaw: 0, pitch: 0, zoom: 1, ox: 0, oy: 0, key: 0, rim: 0, userYaw: 0, userPitch: 0, duration: 1.2, ease: 'h.reveal', overwrite: true }); },
  });

  // drag to turn: your turn is added on top of the scripted one, then eases away
  let lx = 0, ly = 0, vx = 0, vy = 0;
  stage.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; vx = vy = 0; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    vx = dx * 0.011; vy = dy * 0.007;
    lab.userYaw += vx; lab.userPitch = Math.max(-0.7, Math.min(0.7, lab.userPitch + vy));
  });
  const end = () => { dragging = false; idleAt = performance.now() + 1500; };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key];
    if (!k) return; e.preventDefault(); idleAt = performance.now() + 2500;
    gsap.to(lab, { userYaw: lab.userYaw + k[0], userPitch: Math.max(-0.7, Math.min(0.7, lab.userPitch + k[1])), duration: 0.5, ease: 'h.reveal', overwrite: 'auto' });
  });

  gsap.ticker.add(() => {
    if (!st.isActive) return;
    if (!dragging) {
      if (Math.abs(vx) > 0.0004 || Math.abs(vy) > 0.0004) { lab.userYaw += vx; lab.userPitch = Math.max(-0.7, Math.min(0.7, lab.userPitch + vy)); vx *= 0.93; vy *= 0.93; }
      else if (performance.now() > idleAt) { lab.userYaw *= 0.97; lab.userPitch *= 0.97; }
    }
    // backlight follows the key light; the leader line joins the part to its note
    pin.style.setProperty('--kx', (50 + Math.sin(lab.key) * 26).toFixed(1) + '%');
    const s = STATIONS[Math.max(0, cur)];
    const p = gl.project(s.pt), f = gl.facing(s.pt);
    const nr = notes[cur]?.getBoundingClientRect();
    if (!nr) return;
    const tx = nr.left + 8, ty = nr.top - 14;
    line.setAttribute('x1', p.x); line.setAttribute('y1', p.y); line.setAttribute('x2', tx); line.setAttribute('y2', ty);
    dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y);
    leader.style.opacity = f > 0.05 || s.name === 'Hollow' ? 1 : 0.2;
  });
}

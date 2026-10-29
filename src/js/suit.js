import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';
import { stepper, nearestStep } from './reveal.js';

// where on the figure (as % of its height) each part sits, and how far to push in
const PARTS = [
  { y: 9,  zoom: 1.9 },  // crown
  { y: 31, zoom: 2.3 },  // mask
  { y: 57, zoom: 1.9 },  // chest
  { y: 86, zoom: 1.5 },  // cloak
];

/** Chapter 07: the costume, part by part — the camera pushes in on each piece as you scroll, a leader line joins it to its note. */
export function initSuit(lenis, reduced, gl, L = 1) {
  const section = document.getElementById('suit');
  const notes = [...section.querySelectorAll('.suit-note')];
  const hots = [...section.querySelectorAll('.hot')];
  const fig = document.getElementById('suitFig');
  const zoom = document.getElementById('suitZoom');
  const word = section.querySelector('.suit-bg-word');
  const pin = section.querySelector('.suit-pin');
  const NS = 'http://www.w3.org/2000/svg';
  const leader = document.createElementNS(NS, 'svg'); leader.setAttribute('class', 'suit-leader'); leader.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(NS, 'line'); leader.appendChild(line); pin.appendChild(leader);

  let cur = -1, st = null, tl = null;
  const set = (i) => {
    if (i === cur) return; cur = i;
    notes.forEach((n, j) => n.setAttribute('aria-hidden', j === i ? 'false' : 'true'));
    hots.forEach((h, j) => h.classList.toggle('is-active', j === i));
    gsap.fromTo(line, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.5, ease: 'h.reveal' });
    audio.pluck(i * 2 + 1, 0, 0.5);
    if (i === 3) gl?.leafBurst(2600); // the cloak is fresh each time: a flurry of leaves earns it
  };
  set(0);
  hots.forEach((h, i) => h.addEventListener('click', () => {
    if (st) lenis.scrollTo(st.start + (st.end - st.start) * (tl.labels['s' + i] / tl.duration()), { duration: 1.2 }); else set(i);
  }));
  if (reduced) { section.classList.add('is-static'); notes.forEach((n) => gsap.set([...n.children], { autoAlpha: 1 })); leader.remove(); return; }

  tl = stepper(notes, { hold: 0.9, xf: 0.5 });
  PARTS.forEach((p, i) => {
    const at = i === 0 ? 0 : `s${i}-=0.6`;
    const dur = i === 0 ? 0.01 : 1.1;
    tl.to(zoom, { scale: p.zoom, transformOrigin: `50% ${p.y}%`, duration: dur, ease: 'h.move' }, at)
      .to(hots, { '--inv': 1 / p.zoom, duration: dur, ease: 'h.move' }, '<');
  });
  tl.fromTo(word, { xPercent: 8 }, { xPercent: -8, ease: 'none', duration: tl.duration() }, 0);

  st = ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + Math.round(innerHeight * 3 * L), pin: '.suit-pin', scrub: 0.8, anticipatePin: 1,
    animation: tl, invalidateOnRefresh: true,
    onUpdate: () => set(nearestStep(tl, notes.length)),
  });

  gsap.ticker.add(() => {
    if (!st.isActive || cur < 0) return;
    const hr = hots[cur].getBoundingClientRect(), nr = notes[cur].getBoundingClientRect();
    line.setAttribute('x1', nr.right + 14); line.setAttribute('y1', nr.top + 20);
    line.setAttribute('x2', hr.left + hr.width / 2); line.setAttribute('y2', hr.top + hr.height / 2);
  });

  // gentle tilt toward the pointer
  const img = fig.querySelector('img');
  fig.addEventListener('pointermove', (e) => {
    const r = fig.getBoundingClientRect();
    gsap.to(img, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 8, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 5, duration: 0.8, ease: 'h.reveal', transformPerspective: 900 });
  });
  fig.addEventListener('pointerleave', () => gsap.to(img, { rotateX: 0, rotateY: 0, duration: 1, ease: 'h.reveal' }));
}

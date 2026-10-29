import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';

// where on the figure (as % of its height) each part sits, and how far to push in
const PARTS = [
  { y: 9,  zoom: 1.9 },  // crown
  { y: 31, zoom: 2.3 },  // mask
  { y: 57, zoom: 1.9 },  // chest
  { y: 86, zoom: 1.5 },  // cloak
];

/** Chapter 07: the costume, part by part — the camera pushes in on each piece as you scroll. */
export function initSuit(lenis, reduced) {
  const section = document.getElementById('suit');
  const notes = [...section.querySelectorAll('.suit-note')];
  const hots = [...section.querySelectorAll('.hot')];
  const fig = document.getElementById('suitFig');
  const zoom = document.getElementById('suitZoom');
  let cur = -1, st = null;
  const set = (i) => {
    if (i === cur) return; cur = i;
    notes.forEach((n, j) => n.classList.toggle('is-active', j === i));
    hots.forEach((h, j) => h.classList.toggle('is-active', j === i));
    audio.pluck(i * 2 + 1, 0, 0.5);
    if (reduced) return;
    const { y, zoom: z } = PARTS[i];
    gsap.to(zoom, { scale: z, transformOrigin: `50% ${y}%`, duration: 1.5, ease: 'expo.inOut', overwrite: true });
    gsap.to(hots, { '--inv': 1 / z, duration: 1.5, ease: 'expo.inOut', overwrite: 'auto' });
  };
  set(0);
  hots.forEach((h, i) => h.addEventListener('click', () => {
    if (st) lenis.scrollTo(st.start + (st.end - st.start) * ((i + 0.5) / notes.length), { duration: 1.2 }); else set(i);
  }));
  if (reduced) { section.classList.add('is-static'); return; }
  st = ScrollTrigger.create({
    trigger: section, start: 'top top', end: '+=280%', pin: '.suit-pin', scrub: true, anticipatePin: 1,
    onUpdate: (self) => { set(Math.min(notes.length - 1, Math.floor(self.progress * notes.length))); },
  });
}

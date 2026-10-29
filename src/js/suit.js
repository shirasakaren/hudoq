import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';

/** Chapter 07: the costume, part by part. */
export function initSuit(lenis, reduced) {
  const section = document.getElementById('suit');
  const notes = [...section.querySelectorAll('.suit-note')];
  const hots = [...section.querySelectorAll('.hot')];
  const fig = document.getElementById('suitFig');
  let cur = -1, st = null;
  const set = (i) => {
    if (i === cur) return; cur = i;
    notes.forEach((n, j) => n.classList.toggle('is-active', j === i));
    hots.forEach((h, j) => h.classList.toggle('is-active', j === i));
    audio.pluck(i * 2 + 1, 0, 0.5);
  };
  set(0);
  hots.forEach((h, i) => h.addEventListener('click', () => {
    if (st) lenis.scrollTo(st.start + (st.end - st.start) * ((i + 0.5) / notes.length), { duration: 1.2 }); else set(i);
  }));
  if (reduced) { section.classList.add('is-static'); return; }
  st = ScrollTrigger.create({
    trigger: section, start: 'top top', end: '+=320%', pin: '.suit-pin', scrub: true, anticipatePin: 1,
    onUpdate: (self) => { set(Math.min(notes.length - 1, Math.floor(self.progress * notes.length))); gsap.set(fig, { y: -self.progress * 18 }); },
  });
  // gentle tilt toward the pointer
  const img = fig.querySelector('img');
  fig.addEventListener('pointermove', (e) => {
    const r = fig.getBoundingClientRect();
    gsap.to(img, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 8, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 5, duration: 0.8, ease: 'power3.out', transformPerspective: 900 });
  });
  fig.addEventListener('pointerleave', () => gsap.to(img, { rotateX: 0, rotateY: 0, duration: 1, ease: 'expo.out' }));
}

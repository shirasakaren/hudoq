import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';

/** Chapters 10–12: photo-wall parallax, count-up numbers, finale mask spin. */
export function initNow(gl, reduced) {
  // photo wall: columns drift at different speeds
  if (!reduced) {
    gsap.utils.toArray('.wall-col').forEach((col) => {
      gsap.to(col, { y: parseFloat(col.dataset.speed), ease: 'none', scrollTrigger: { trigger: '#wall', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // timeline: big outlined years fill when they arrive
    gsap.utils.toArray('.tl b').forEach((b) => {
      gsap.fromTo(b, { webkitTextStrokeColor: 'rgba(217,164,65,1)', color: 'rgba(217,164,65,0)' }, { color: 'rgba(217,164,65,1)', ease: 'none', scrollTrigger: { trigger: b, start: 'top 85%', end: 'top 45%', scrub: true } });
    });
  }

  // counters
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', fmt = el.dataset.fmt === 'int';
    const set = (v) => { const n = Math.round(v); el.textContent = (fmt ? n.toLocaleString('en-US') : n) + suffix; };
    if (reduced) { set(end); return; }
    const o = { v: 0 }; set(0);
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'expo.out', onUpdate: () => set(o.v) }) });
  });

  // finale: click the mask to make it spin and answer with a gong
  const fin = document.querySelector('.finale');
  fin?.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    gl?.pulse(); audio.gong(110, 0.8); audio.pluck(3, 1, 0.8);
  });
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Chapter 01: a procession. The word is a parade — life-size dancer cut-outs walk past at different depths
 * over a looping festival film, behind a ground line that hides their cut edges. Almost no text.
 */
export function initProcession(reduced, L = 1) {
  const section = document.getElementById('what');
  const track = section.querySelector('.proc-track');
  const figs = [...section.querySelectorAll('.proc-fig')];
  const words = [...section.querySelectorAll('.proc-bigword span')];
  if (reduced) { section.classList.add('is-static'); return; }

  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.fromTo(track, { x: 0 }, { x: () => -dist(), duration: 1 }, 0);
  // depth: near figures slip a little faster than the track, far ones a little slower
  figs.forEach((f) => {
    const k = parseFloat(getComputedStyle(f).getPropertyValue('--k')) || 1;
    const sp = f.classList.contains('is-near') ? 1.14 : f.classList.contains('is-far') ? 0.9 : 1.02;
    tl.fromTo(f, { x: 0 }, { x: () => -dist() * (sp - 1), duration: 1 }, 0);
    tl.fromTo(f.firstElementChild, { yPercent: 6 }, { yPercent: 0, duration: 0.25, ease: 'h.reveal' }, 0);
  });
  // the giant outlined word slides the other way, row by row
  words.forEach((w, i) => tl.fromTo(w, { xPercent: i % 2 ? -18 : 6 }, { xPercent: i % 2 ? 6 : -22, duration: 1 }, 0));

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + Math.round(dist() * 0.8 * L + innerHeight * 0.3), pin: '.proc-pin', scrub: 0.7, anticipatePin: 1,
    animation: tl, invalidateOnRefresh: true,
  });
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';

/** Chapter 04: the river-spirit legend — cards drift across a pinned screen; ripples fire on each beat. */
export function initLegend(reduced) {
  const section = document.getElementById('legend');
  const track = section.querySelector('.legend-track');
  const cards = [...track.children];
  const cut = section.querySelector('.legend-cut');
  const circles = [...section.querySelectorAll('.ripples circle')];
  if (reduced) { section.classList.add('is-static'); return; }

  const dist = () => track.scrollWidth - innerWidth * 0.52 - parseFloat(getComputedStyle(track).paddingLeft) + innerWidth * 0.5;
  let last = -1;
  const ripple = () => {
    circles.forEach((c, i) => gsap.fromTo(c, { attr: { r: 20 }, opacity: 0.9 }, { attr: { r: 380 }, opacity: 0, duration: 3.2, delay: i * 0.35, ease: 'power2.out' }));
  };
  ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + Math.max(innerHeight * 3, dist() * 1.1), pin: '.legend-pin', scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
    animation: gsap.to(track, { x: () => -dist(), ease: 'none' }),
    onUpdate: (self) => {
      const i = Math.min(cards.length - 1, Math.floor(self.progress * cards.length));
      if (i !== last) { last = i; ripple(); audio.pluck(i, -1, 0.5); }
      gsap.to(cut, { opacity: self.progress > 0.78 ? 1 : 0, x: self.progress > 0.78 ? 0 : 60, duration: 0.9, ease: 'expo.out', overwrite: true });
    },
  });
}

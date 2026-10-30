import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { asset } from './url.js';

/** Chapter 03: the village, in footage. A full-screen film that cuts between seven moments as you scroll, one word each. */
export function initFilm(reduced, L = 1) {
  const section = document.getElementById('film');
  const clips = [...section.querySelectorAll('.film-clip')];
  const words = [...section.querySelectorAll('.film-words span')];
  const ticks = [...section.querySelectorAll('.film-ticks li')];
  const n = clips.length;

  const load = (i) => { const v = clips[i]; if (v && !v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); } };
  let active = -1;
  const setActive = (i) => {
    if (i === active) return; active = i;
    ticks.forEach((t, j) => t.classList.toggle('is-on', j === i));
    [i - 1, i, i + 1, i + 2].forEach(load);
    clips.forEach((v, j) => { if (!v.src) return; if (j === i || j === i - 1) v.play().catch(() => {}); else v.pause(); });
  };
  setActive(0);

  if (reduced) { // posters only, words listed
    section.classList.add('is-static');
    return;
  }

  gsap.set(clips, { opacity: 0 }); gsap.set(clips[0], { opacity: 1 });
  gsap.set(words, { yPercent: 115 }); gsap.set(words[0], { yPercent: 0 });
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  for (let i = 0; i < n; i++) {
    tl.fromTo(clips[i], { scale: 1.14 }, { scale: 1, duration: 1.3 }, i - 0.3);          // a slow push on every shot
    if (i === 0) continue;
    tl.to(clips[i], { opacity: 1, duration: 0.45 }, i - 0.3)                              // cut: the next shot fades up under the last
      .to(words[i - 1], { yPercent: -115, duration: 0.3, ease: 'h.exit' }, i - 0.2)
      .fromTo(words[i], { yPercent: 115 }, { yPercent: 0, duration: 0.45, ease: 'h.reveal' }, i - 0.02);
  }
  tl.to({}, { duration: 0.6 }, n - 1);                                                     // let the last shot breathe
  tl.eventCallback('onUpdate', () => setActive(Math.max(0, Math.min(n - 1, Math.round(tl.time() - 0.05)))));

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + Math.round(innerHeight * 0.62 * n * L), pin: '.film-pin', scrub: 0.6, anticipatePin: 1,
    animation: tl, invalidateOnRefresh: true,
    onToggle: (s) => { if (s.isActive) { load(0); load(1); } },
  });
  ScrollTrigger.create({ trigger: section, start: 'top 200%', once: true, onEnter: () => { load(0); load(1); } });
}

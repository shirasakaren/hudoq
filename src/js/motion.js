import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * One motion language for the whole page.
 *  - things ARRIVE with a long, soft landing:   expo.out
 *  - things TRAVEL (wipes, camera, layout):     expo.inOut
 *  - things scrubbed to scroll are linear:      none
 * Durations: micro .35 · ui .7 · reveal 1.2 · scene 1.6.
 */
export const EASE = { out: 'expo.out', inOut: 'expo.inOut', soft: 'power3.out', back: 'back.out(1.6)' };
export const DUR = { micro: 0.35, ui: 0.7, reveal: 1.2, scene: 1.6 };
export const STAGGER = { text: 0.09, grid: 0.07 };

/** Image/video reveal: a clip-path curtain opens while the picture settles from a slight zoom. */
export function revealMedia(el, { trigger = el, start = 'top 88%', from = 'bottom', delay = 0 } = {}) {
  const inner = el.matches('img, video') ? el : el.querySelector('img, video');
  const hidden = { bottom: 'inset(100% 0 0 0)', top: 'inset(0 0 100% 0)', left: 'inset(0 100% 0 0)', right: 'inset(0 0 0 100%)' }[from];
  gsap.set(el, { clipPath: hidden });
  if (inner) gsap.set(inner, { scale: 1.22 });
  const tl = gsap.timeline({ paused: true, delay })
    .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.reveal, ease: EASE.inOut }, 0);
  if (inner) tl.to(inner, { scale: 1, duration: DUR.reveal + 0.5, ease: EASE.out }, 0);
  ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tl.play() });
  return tl;
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { D, S, stag } from './motion.js';

/** Headlines: lines rise out of a vertical-only mask with a small hinge. */
export const lineRise = (el, { delay = 0, start = 'top 85%' } = {}) => SplitText.create(el, {
  type: 'lines', mask: 'lines', autoSplit: true, aria: 'none', linesClass: 'ln',
  onSplit: (s) => gsap.from(s.lines, {
    yPercent: 108, rotate: 2.5, transformOrigin: '0% 100%', duration: D.reveal, ease: 'h.reveal',
    stagger: stag(s.lines.length, S.line), delay, scrollTrigger: { trigger: el, start, once: true },
  }),
});

/** Small mono labels: a colour block wipes across, then retracts to reveal the text (Lando-style ink line). */
export function inkLine(el, color = 'var(--vermilion)') {
  const block = Object.assign(document.createElement('i'), { className: 'ink-block' });
  block.style.cssText = `position:absolute;inset:0;background:${color};transform-origin:100% 50%;pointer-events:none`;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.appendChild(block);
  return gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
    .fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: D.ui, ease: 'h.reveal' })
    .fromTo(block, { scaleX: 1 }, { scaleX: 0, duration: D.ui, ease: 'h.move' }, D.ui * 0.5)
    .set(el, { clearProps: 'clipPath' })
    .add(() => block.remove());
}

/** Photos and video: the frame wipes open while the picture settles from a slight zoom (mask + counter-motion). */
export function imageReveal(fig, { scrub: sc = false, delay = 0 } = {}) {
  const media = fig.matches('img, video') ? fig : fig.querySelector('img, video');
  const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 90%', end: 'top 45%', scrub: sc ? 0.6 : false, once: !sc }, delay });
  tl.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: D.move, ease: sc ? 'none' : 'h.move' }, 0);
  if (media && media.tagName === 'IMG') tl.fromTo(media, { scale: 1.22, yPercent: -6 }, { scale: 1, yPercent: 0, duration: D.move * 1.2, ease: sc ? 'none' : 'h.reveal' }, 0);
  tl.set(fig, { clearProps: 'clipPath' });
  return tl;
}

/** Transparent cut-outs rise from a soft floor; the shadow lands after. */
export const cutoutRise = (img) => gsap.timeline({ scrollTrigger: { trigger: img, start: 'top 88%', once: true } })
  .fromTo(img, { yPercent: 14, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: D.move, ease: 'h.reveal' });

/**
 * Steps with plateaus. Each step's children cross-fade with overlap and the timeline carries labels s0..sn.
 * Chapters add their spatial tweens (map zoom, ring arcs, camera) on the same labels, so something is always moving.
 */
export function stepper(steps, { hold = 1, xf = 0.3 } = {}) {
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  const kids = steps.map((s) => [...s.children]);
  gsap.set(kids.flat(), { opacity: 0 });
  gsap.set(kids[0], { opacity: 1 });
  steps.forEach((_, i) => {
    if (i) {
      // sequential, not overlapped: the old text is gone before the new one reads, so no resting frame shows two texts at once
      tl.to(kids[i - 1], { yPercent: -30, opacity: 0, stagger: 0.02, duration: xf * 0.5, ease: 'h.exit' });
      tl.fromTo(kids[i], { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.04, duration: xf, ease: 'h.reveal' }, '>-0.02');
    }
    tl.addLabel('s' + i).to({}, { duration: hold });
  });
  return tl;
}

/** Which step is nearest the playhead (for aria / pointer-events / state classes). */
export function nearestStep(tl, count) {
  const t = tl.time();
  let best = 0, bd = Infinity;
  for (let i = 0; i < count; i++) { const d = Math.abs(tl.labels['s' + i] - t); if (d < bd) { bd = d; best = i; } }
  return best;
}

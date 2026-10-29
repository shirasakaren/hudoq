import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/** Headline line-masks, scrubbed word reveals, batched fade-ups and parallax slabs. */
export function initTextFx(reduced) {
  if (reduced) return;

  // headlines: slide each line up out of a mask
  gsap.utils.toArray('.display-xxl, .display-xl, .display-l, .display-m, .reel-caption').forEach((el) => {
    if (el.closest('.where-step') || el.closest('.rice-beat') || el.dataset.noSplit != null) return;
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'ln', aria: 'none',
      onSplit: (self) => gsap.from(self.lines, { yPercent: 112, duration: 1.3, ease: 'h.reveal', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }),
    });
  });

  // the Beat headline keeps its staggered indents, so its three lines animate directly
  gsap.from('#h-beat .line', { opacity: 0, yPercent: 30, clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'h.reveal', stagger: 0.12, scrollTrigger: { trigger: '#h-beat', start: 'top 85%', once: true } });

  // statements: words light up as you read
  gsap.utils.toArray('[data-split="scrub-words"]').forEach((el) => {
    SplitText.create(el, {
      type: 'words', autoSplit: true, aria: 'none',
      onSplit: (self) => {
        gsap.set(self.words, { opacity: 0.13 });
        return gsap.to(self.words, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 72%', end: 'bottom 52%', scrub: 0.6 } });
      },
    });
  });

  // generic fade-ups, batched
  const targets = '.kicker:not(.rice-kicker), .lede, .word-facts li, .word-note, .then-notes article, .tl li, .care-list li, .care-rule, .stat, .steps li, .foot-col, .moves li, .gallery-facts li, .legend-src, .lab-hint, .dark-hint, .pad-text > *, .now-pekayang > p';
  const els = gsap.utils.toArray(targets).filter((e) => !e.closest('.where-pin, .rice-pin, .legend-pin, .lab-pin, .suit-pin'));
  gsap.set(els, { opacity: 0, y: 36 });
  ScrollTrigger.batch(els, {
    start: 'top 90%', once: true,
    onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, ease: 'h.reveal', stagger: 0.08, overwrite: true }),
  });

  // parallax slabs
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    gsap.to(el, { y: parseFloat(el.dataset.parallax), ease: 'none', scrollTrigger: { trigger: el.closest('.chapter'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/** Hero intro: letters rise, tagline lines slide in. Returns a timeline to play after the loader. */
export function heroIntro(reduced) {
  const chars = document.querySelectorAll('.hero-char');
  const tag = document.querySelector('.hero-tag');
  const meta = document.querySelectorAll('.hero-meta, .hero-cue');
  if (reduced) return gsap.timeline();
  const split = SplitText.create(tag, { type: 'lines', mask: 'lines', aria: 'none' });
  gsap.set(chars, { yPercent: 118, rotate: 6 });
  gsap.set(split.lines, { yPercent: 115 });
  gsap.set(meta, { opacity: 0, y: 16 });
  return gsap.timeline({ paused: true, defaults: { ease: 'h.reveal' } })
    .to(chars, { yPercent: 0, rotate: 0, duration: 1.6, stagger: 0.07 }, 0.1)
    .to(split.lines, { yPercent: 0, duration: 1.3, stagger: 0.1 }, 0.7)
    .to(meta, { opacity: (i, el) => (el.classList.contains('hero-meta') ? 0.75 : 0.75), y: 0, duration: 1, stagger: 0.1 }, 1.1);
}



/** Hero: the wordmark comes apart as you scroll away, and its letters drift with the pointer at different depths. */
export function initHeroScroll(reduced) {
  if (reduced) return;
  const chars = gsap.utils.toArray('.hero-char');
  const trig = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  chars.forEach((c, i) => {
    const d = i - (chars.length - 1) / 2;
    gsap.to(c, { yPercent: -28 - Math.abs(d) * 14, xPercent: d * 16, rotate: d * 5, ease: 'none', scrollTrigger: trig });
  });
  gsap.to('.hero-tag, .hero-meta, .hero-cue', { opacity: 0, y: -40, ease: 'none', scrollTrigger: { ...trig, end: '55% top' } });
  gsap.to('.hero-glow', { scale: 1.5, opacity: 0.2, ease: 'none', scrollTrigger: trig });

  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const setters = chars.map((c, i) => ({ x: gsap.quickTo(c, 'x', { duration: 1.1, ease: 'h.reveal' }), y: gsap.quickTo(c, 'y', { duration: 1.1, ease: 'h.reveal' }), k: (i % 2 ? 1 : -1) * (14 + i * 4) }));
  addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    setters.forEach((s) => { s.x(nx * s.k); s.y(ny * s.k * 0.6); });
  }, { passive: true });
}

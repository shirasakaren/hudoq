import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger and WebGL stay in lock-step. */
export function initSmooth(reduced) {
  const lenis = new Lenis({ lerp: reduced ? 1 : 0.085, smoothWheel: !reduced, wheelMultiplier: 0.95, touchMultiplier: 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/** Smooth in-page links: <a href="#id"> and [data-scroll]. */
export function bindAnchors(lenis) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"], [data-scroll-top]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (a.hasAttribute('data-scroll-top') || id === '#top') { e.preventDefault(); lenis.scrollTo(0, { duration: 2.2 }); return; }
    const el = id && id.length > 1 ? document.querySelector(id) : null;
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4), offset: 0 });
    history.replaceState(null, '', id);
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); // move keyboard focus with the scroll
    el.focus({ preventScroll: true });
  });
}

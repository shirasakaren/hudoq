import './styles/base.css';
import './styles/sections.css';
import { gsap } from 'gsap';
import './js/motion.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Observer } from 'gsap/Observer';
import { audio } from './audio.js';
import { asset } from './js/url.js';
import { initLoader } from './js/loader.js';
import { initSmooth, bindAnchors } from './js/smooth.js';
import { initCursor, initMagnetic, initHoverRoll } from './js/cursor.js';
import { initGrain } from './js/grain.js';
import { initLazyVideos } from './js/media.js';
import { initTextFx, heroIntro, initHero } from './js/textfx.js';
import { initNav } from './js/nav.js';
import { initMap } from './js/map.js';
import { initProcession } from './js/procession.js';
import { initFilm } from './js/film.js';
import { initRice } from './js/rice.js';
import { initLegend } from './js/legend.js';
import { initFaces } from './js/faces.js';
import { initLab } from './js/lab.js';
import { initSuit } from './js/suit.js';
import { initBeat } from './js/beat.js';
import { initThen } from './js/then.js';
import { initNow } from './js/now.js';
import { initFinale } from './js/finale.js';
import { initSeams } from './js/seams.js';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, Observer);
document.documentElement.classList.add('js');

const reduced = document.documentElement.dataset.motion === 'reduced';
const mq = matchMedia('(max-width: 900px)');
const mobile = mq.matches;
const L = mobile ? 0.6 : 1; // phones get shorter pins (a different cut, not a shrunken one)
mq.addEventListener('change', () => location.reload());
const DEBUG = new URLSearchParams(location.search).has('debug');
const deepLink = location.hash;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  window.scrollTo(0, 0);
  if (deepLink) history.replaceState(null, '', location.pathname + location.search); // restored after the page is built, so pinned chapters land correctly
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // while the loader is up, nothing behind it may take focus
  const behind = [...document.querySelectorAll('.bar, .rail, main, footer')];
  behind.forEach((n) => n.setAttribute('inert', ''));
  const loader = initLoader();
  initGrain();
  const lenis = initSmooth(reduced);
  if (DEBUG) { window.__lenis = lenis; window.__audio = audio; }
  lenis.stop();
  bindAnchors(lenis);
  initCursor();

  // ── assets: fonts + the 3D mask
  const fontsReady = Promise.race([document.fonts.ready, wait(2500)]);
  let gl = null;
  const canvas = document.getElementById('gl');
  try {
    const { createGL } = await import('./js/gl.js');
    gl = await createGL({ canvas, reduced, onProgress: (p) => loader.set(0.1 + p * 0.75) });
    if (DEBUG) window.__gl = gl;
  } catch (err) {
    console.warn('WebGL mask unavailable, using the still image instead.', err);
    document.documentElement.classList.add('no-gl');
    const anchor = document.querySelector('.hero-anchor');
    if (anchor) anchor.innerHTML = '<img src="' + asset('/img/masks/4-1000.webp') + '" alt="" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 30px 40px rgba(0,0,0,.6))">';
  }
  loader.set(0.9);
  await fontsReady;
  loader.set(0.97);

  // ── build every chapter (page order, so pin spacing is computed correctly)
  initHoverRoll();
  initMagnetic();
  initLazyVideos(reduced);
  initHero(gl, reduced, mobile ? 0.72 : 1);
  initProcession(reduced, L);
  initMap(reduced, L);
  initFilm(reduced, L);
  initRice(reduced, L);
  initLegend(reduced, L);
  initFaces(lenis, reduced, mobile);
  initLab(gl, lenis, reduced, mobile ? 0.55 : 1);
  initSuit(lenis, reduced, gl, L);
  initBeat(reduced);
  initThen(reduced, L);
  initNow(gl, reduced);
  initFinale(gl, lenis, reduced, L);
  initSeams(reduced);
  // sound-reactive visuals: the rim light on the mask and the sound icon breathe with the mix
  const bars = [...document.querySelectorAll('#soundBtn .bars rect')];
  let lo = 0;
  gsap.ticker.add(() => {
    if (!audio.enabled) { if (gl) gl.level = null; bars.forEach((r) => { r.style.animation = ''; r.style.transform = ''; }); return; }
    const l = audio.level();
    lo += (l.lo - lo) * (l.lo > lo ? 0.5 : 0.08);
    if (gl) gl.level = { lo, hi: l.hi };
    if (l.bins) bars.forEach((r, i) => { const v = l.bins[2 + i * 5] / 255; r.style.animation = 'none'; r.style.transform = `scaleY(${0.25 + v * 0.9})`; });
  });
  initTextFx(reduced);
  initNav(lenis);
  const intro = heroIntro(reduced);
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  // ── gate: choose sound or silence, then the match-cut into the hero
  const choice = await loader.ready();
  if (choice.sound) await audio.enable();
  behind.forEach((n) => n.removeAttribute('inert'));
  const anchor = document.querySelector('.hero-anchor');
  const exitTl = loader.exit({
    gl, anchor, reduced,
    onMatch: () => { if (choice.sound) requestAnimationFrame(() => audio.gong(98, 0.9)); },
  });
  if (reduced) gl?.show();
  gl?.intro();
  gsap.delayedCall(reduced ? 0.2 : 1.3, () => intro.play());   // the wordmark begins before the loader has finished leaving
  gsap.delayedCall(reduced ? 0.4 : 2.4, () => {
    lenis.start(); ScrollTrigger.refresh();
    const target = deepLink && deepLink.length > 1 ? document.querySelector(deepLink) : null;
    if (target) { lenis.scrollTo(target, { immediate: true, force: true }); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); history.replaceState(null, '', deepLink); }
    else { const main = document.getElementById('main'); main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
  });
  await exitTl;

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

boot();

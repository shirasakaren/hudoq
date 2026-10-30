import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';
import { stepper, nearestStep } from './reveal.js';

/** Chapter 04: a descent. A sword falls, the whirlpool tightens, the scene sinks under the river, carved faces rise. */
export function initLegend(reduced, L = 1) {
  const section = document.getElementById('legend');
  const pin = section.querySelector('.legend-pin');
  const pages = [...section.querySelectorAll('.legend-page')];
  const whirl = section.querySelector('.whirl');
  const wp = section.querySelector('.whirl-path');
  const sword = section.querySelector('.legend-sword');
  const depth = section.querySelector('.legend-depth');
  const video = section.querySelector('.legend-video');
  const faces = [...section.querySelectorAll('.legend-faces img')];
  const black = section.querySelector('.legend-black');
  const kicker = section.querySelector('.legend-kicker');

  // a logarithmic spiral, three turns, drawn from the centre outward
  const pts = [];
  for (let th = 0; th < 5.6 * Math.PI; th += 0.08) { const r = 10 * Math.exp(0.21 * th); pts.push(`${(r * Math.cos(th)).toFixed(1)} ${(r * Math.sin(th)).toFixed(1)}`); }
  wp.setAttribute('d', 'M' + pts.join('L'));

  if (reduced) { section.classList.add('is-static'); return; }

  gsap.set(wp, { drawSVG: '0% 12%' });
  const tl = stepper(pages, { hold: 1, xf: 0.5 });
  const T = (l, o = 0) => `${l}+=${o}`;
  tl.to(wp, { drawSVG: '0% 38%', duration: 1.2 }, 's0')
    // i — the sword falls to the centre and the first ripple answers
    .fromTo(sword, { y: '-60vh', rotate: -8, opacity: 0 }, { y: '12vh', rotate: 0, opacity: 1, duration: 0.9, ease: 'h.move' }, 's1-=0.5')
    .to(sword, { opacity: 0, duration: 0.3, ease: 'none' }, '>-0.05')
    .fromTo(whirl, { scale: 1 }, { scale: 1.18, duration: 0.5, ease: 'h.reveal' }, '<-0.1')
    .to(wp, { drawSVG: '0% 55%', duration: 0.8 }, '<')
    // ii — the descent: the river closes over, the video sinks and dims
    .to(depth, { yPercent: -100, duration: 1.1, ease: 'h.move' }, 's2-=0.45')
    .to(video, { scale: 1.4, opacity: 0.12, duration: 1.1, ease: 'h.move' }, '<')
    .to(wp, { drawSVG: '0% 78%', duration: 1 }, '<')
    // iii — they marry: the whirlpool settles
    .to(whirl, { scale: 1, duration: 1, ease: 'h.reveal' }, 's3-=0.3')
    // iv — the true faces rise out of the depth
    .fromTo(faces, { yPercent: 40, scale: 0.85, autoAlpha: 0, filter: 'blur(14px)' }, { yPercent: 0, scale: 1, autoAlpha: 0.9, filter: 'blur(0px)', duration: 1.1, stagger: 0.14, ease: 'h.reveal' }, 's4-=0.35')
    // v — carved: the faces turn to wood
    .to(faces, { filter: 'grayscale(1) sepia(.55) contrast(1.1)', duration: 0.8, ease: 'none' }, 's5-=0.2')
    // vi — back to the surface
    .to(depth, { yPercent: -200, duration: 1.1, ease: 'h.move' }, 's6-=0.45')
    .to(video, { scale: 1, opacity: 0.45, duration: 1.1, ease: 'h.move' }, '<')
    .to(faces, { autoAlpha: 0.25, yPercent: 10, duration: 0.8 }, '<')
    .to(wp, { drawSVG: '0% 100%', duration: 1 }, '<')
    .to(black, { opacity: 1, duration: 0.5, ease: 'none' }, '>+0.15')   // hand-off: down to black, into the dark room
    .to([kicker, pages], { autoAlpha: 0, duration: 0.5 }, '<');
  tl.to(whirl, { rotation: 540, ease: 'none', duration: tl.duration() }, 0);

  let last = -1;
  ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + Math.round(innerHeight * 5.2 * L), pin, scrub: 0.8, anticipatePin: 1,
    animation: tl, invalidateOnRefresh: true,
  });
  tl.eventCallback('onUpdate', () => {
    const i = nearestStep(tl, pages.length);
    if (i !== last) { last = i; if (i > 0) audio.pluck(i - 1, -1, 0.5); }
  });
}

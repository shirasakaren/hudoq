import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';
import { stepper, nearestStep } from './reveal.js';

const STAGES = ['Clear', 'Plant', 'Dance', 'Grow', 'Harvest'];
const CORE = ['Plant', 'Plant', 'Dance', 'Dance', 'Harvest'];
const NS = 'http://www.w3.org/2000/svg';
const R = 168, GAP = 7; // degrees of gap between arcs

function arcPath(a0, a1) {
  const r0 = (a0 * Math.PI) / 180, r1 = (a1 * Math.PI) / 180;
  const x0 = 200 + R * Math.cos(r0), y0 = 200 + R * Math.sin(r0), x1 = 200 + R * Math.cos(r1), y1 = 200 + R * Math.sin(r1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Chapter 03: the rice year. Five arcs draw as you read; the photo wipes up; "Not a word" is a held silence. */
export function initRice(reduced, L = 1) {
  const section = document.getElementById('why');
  const beats = [...section.querySelectorAll('.rice-beat')];
  const photos = [...section.querySelectorAll('.rice-photo')];
  const coreT = section.querySelector('.ring-core-t');
  const arcsG = section.querySelector('.ring-arcs');
  const nodesG = section.querySelector('.ring-nodes');

  // five arcs (faint track + bright draw) with a gap between them, and a label at each arc's middle
  const seg = 360 / STAGES.length;
  const tracks = [], draws = [];
  STAGES.forEach((name, i) => {
    const a0 = -90 + i * seg + GAP / 2, a1 = -90 + (i + 1) * seg - GAP / 2;
    const d = arcPath(a0, a1);
    const t = document.createElementNS(NS, 'path'); t.setAttribute('d', d); t.setAttribute('class', 'arc-track');
    const g = document.createElementNS(NS, 'path'); g.setAttribute('d', d); g.setAttribute('class', 'arc-draw');
    arcsG.append(t, g); tracks.push(t); draws.push(g);
    const mid = ((a0 + a1) / 2) * (Math.PI / 180), lr = R + 38;
    const text = document.createElementNS(NS, 'text'); text.textContent = name; text.setAttribute('class', 'arc-label');
    text.setAttribute('x', 200 + lr * Math.cos(mid)); text.setAttribute('y', 200 + lr * Math.sin(mid) + 4);
    text.setAttribute('text-anchor', Math.abs(Math.cos(mid)) < 0.25 ? 'middle' : Math.cos(mid) > 0 ? 'start' : 'end');
    nodesG.appendChild(text);
  });
  const labels = [...nodesG.children];

  // photos 2–5 load when the chapter is near (they're stacked, so lazy-loading alone would fetch them all)
  photos.slice(1).forEach((p) => { p.dataset.src = p.getAttribute('src'); p.dataset.srcset = p.getAttribute('srcset'); p.removeAttribute('src'); p.removeAttribute('srcset'); });
  const loadPhotos = () => photos.slice(1).forEach((p) => { if (p.dataset.src) { p.srcset = p.dataset.srcset; p.src = p.dataset.src; delete p.dataset.src; } });
  ScrollTrigger.create({ trigger: section, start: 'top 250%', once: true, onEnter: loadPhotos });
  if (reduced) loadPhotos();

  let cur = -1;
  function setBeat(i) {
    if (i === cur) return; cur = i;
    beats.forEach((b, j) => { b.classList.toggle('is-active', j === i); b.setAttribute('aria-hidden', j === i ? 'false' : 'true'); });
    photos.forEach((p, j) => p.classList.toggle('is-on', j <= i)); // later photos stack above earlier ones, so each wipes over the last
    photos.forEach((p, j) => p.classList.toggle('is-top', j === i));
    labels.forEach((l, j) => l.classList.toggle('is-active', j <= [1, 1, 2, 2, 4][i] && j >= 1));
    section.classList.toggle('is-last', i === beats.length - 1);
    const silent = i === 3; // "Not a word."
    section.classList.toggle('is-silent', silent);
    audio.duck(silent ? 0.06 : 1, silent ? 0.7 : 2);
    if (coreT.textContent !== CORE[i]) gsap.timeline().to(coreT, { yPercent: -100, autoAlpha: 0, duration: 0.25, ease: 'h.exit' }).add(() => { coreT.textContent = CORE[i]; }).fromTo(coreT, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'h.reveal' });
  }
  setBeat(0);

  if (reduced) {
    section.classList.add('is-static');
    beats.forEach((b) => gsap.set([...b.children], { autoAlpha: 1 }));
    gsap.set(draws, { opacity: 1 });
    return;
  }

  gsap.set(draws, { drawSVG: '0% 0%' });
  const tl = stepper(beats, { hold: 1, xf: 0.5 });
  // arcs draw on their own plateaus; the silent beat holds longer
  tl.to(draws[0], { drawSVG: '0% 100%', duration: 0.5 }, 's0-=0.05')
    .to(draws[1], { drawSVG: '0% 100%', duration: 0.9 }, 's0+=0.2')
    .to(draws[2], { drawSVG: '0% 100%', duration: 0.9 }, 's2-=0.2')
    .to({}, { duration: 0.8 }, 's3')                   // extra plateau: the silence
    .to(draws[3], { drawSVG: '0% 100%', duration: 0.8 }, 's4-=0.3')
    .to(draws[4], { drawSVG: '0% 100%', duration: 0.8 }, '>-0.1');

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + Math.round(innerHeight * 3.4 * L), pin: '.rice-pin', scrub: 0.8, anticipatePin: 1,
    animation: tl, invalidateOnRefresh: true,
    onUpdate: () => setBeat(nearestStep(tl, beats.length)),
    onLeave: () => audio.duck(1, 1.5), onLeaveBack: () => audio.duck(1, 1.5),
  });
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import map from '../data/map.json';
import { stepper, nearestStep } from './reveal.js';

gsap.registerPlugin(MotionPathPlugin);
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.appendChild(n); return n; };

/** Chapter 02: a journey, not a viewer. The camera, the outline and the river are all scrubbed; a light travels downstream. */
export function initMap(reduced, L = 1) {
  const section = document.getElementById('where');
  const svg = document.getElementById('mapSvg');
  const layer = document.getElementById('mapLayer');
  const steps = [...section.querySelectorAll('.where-step')];
  const km = document.getElementById('whereKm');

  el('path', { d: map.island, fill: '#0f1f17', stroke: 'rgba(220,229,214,.45)', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, layer);
  const provs = el('g', { fill: 'none' }, layer);
  for (const d of Object.values(map.provinces)) el('path', { d, fill: 'none', stroke: 'rgba(220,229,214,.14)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, provs);
  const kFill = el('path', { d: map.provinces['KALIMANTAN TIMUR'], fill: '#c8412b', opacity: 0, 'stroke': 'none' }, layer);
  const kStroke = el('path', { d: map.provinces['KALIMANTAN TIMUR'], fill: 'none', stroke: 'var(--ember)', 'stroke-width': 2.2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, layer);

  // the river is authored in whichever direction the source data runs: make it flow source → sea
  const probe = el('path', { d: map.mahakam }, layer);
  const p0 = probe.getPointAtLength(0), sea = map.places.samarinda;
  const startsAtSea = Math.hypot(p0.x - sea[0], p0.y - sea[1]) < 80;
  let d = map.mahakam;
  if (startsAtSea) { // rebuild the polyline reversed
    const n = 500, len = probe.getTotalLength(), pts = [];
    for (let i = n; i >= 0; i--) { const q = probe.getPointAtLength((len * i) / n); pts.push(`${q.x.toFixed(1)} ${q.y.toFixed(1)}`); }
    d = 'M' + pts.join('L');
  }
  probe.remove();
  const rivers = ['rgba(217,164,65,.28)', '#d9a441'].map((stroke, k) => el('path', { d, fill: 'none', stroke, 'stroke-width': k ? 3.2 : 11, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, layer));
  const bigLabel = el('text', { x: 360, y: 760, class: 'map-label-big' }, layer); bigLabel.textContent = 'BORNEO';

  const places = [['longbagun', 'Mahakam Ulu', 2], ['melak', 'West Kutai', 2], ['samarinda', 'Samarinda', 3]];
  const pg = el('g', {}, layer);
  const placeEls = places.map(([k, name, step]) => {
    const [x, y] = map.places[k];
    const g = el('g', { class: 'map-place', opacity: 0 }, pg);
    const pulse = el('circle', { cx: x, cy: y, r: 8, class: 'pulse' }, g);
    const dot = el('circle', { cx: x, cy: y, r: 5, fill: 'var(--ochre)' }, g);
    const t = el('text', { x: x + 14, y: y + 5, 'text-anchor': 'start' }, g); t.textContent = name;
    pulse.style.animationDelay = `${-Math.random() * 2}s`;
    return { g, step, pulse, dot, t, x, y };
  });
  // the travelling light
  const boat = el('g', { opacity: 0 }, layer);
  const boatGlow = el('circle', { r: 16, fill: 'rgba(255,214,120,.35)' }, boat);
  const boatDot = el('circle', { r: 6, fill: '#fff3c9' }, boat);

  const full = { x: 0, y: 0, w: map.w, h: map.h };
  const kb = kStroke.getBBox(); const pad = 60;
  const views = [
    full,
    { x: kb.x - pad, y: kb.y - pad, w: kb.width + pad * 2, h: kb.height + pad * 2 },
    (() => { const [x, y] = map.places.longbagun; return { x: x - 150, y: y - 170, w: 460, h: 420 }; })(),
    (() => { const [x, y] = map.places.samarinda; return { x: x - 330, y: y - 190, w: 460, h: 420 }; })(),
  ];
  const vb = { ...full };
  const applyVB = () => {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const k = vb.w / 1000; // keep labels, dots and the light a constant size on screen
    placeEls.forEach((p) => { p.t.style.fontSize = `${15 * k}px`; p.t.setAttribute('x', p.x + 14 * k); p.t.setAttribute('y', p.y + 5 * k); p.dot.setAttribute('r', 5 * k); p.pulse.setAttribute('r', 8 * k); });
    boatGlow.setAttribute('r', 16 * k); boatDot.setAttribute('r', 6 * k);
  };
  applyVB();

  const len = rivers[1].getTotalLength();
  const setState = (i) => { steps.forEach((s, j) => s.classList.toggle('is-active', j === i)); };
  setState(0);

  if (reduced) {
    section.classList.add('is-static');
    Object.assign(vb, views[1]); applyVB(); gsap.set(kFill, { opacity: 0.5 }); gsap.set(bigLabel, { opacity: 0 }); gsap.set(placeEls.map((p) => p.g), { opacity: 1 });
    steps.forEach((s) => gsap.set([...s.children], { opacity: 1 }));
    return;
  }

  gsap.set(rivers, { drawSVG: '0% 0%' }); gsap.set(kStroke, { drawSVG: '0% 0%' });
  const kmWrap = section.querySelector('.where-km'); gsap.set(kmWrap, { opacity: 0 });
  const tl = stepper(steps, { hold: 0.9 });
  tl.to(bigLabel, { opacity: 0, duration: 0.4 }, 's1-=0.5')
    .to(vb, { ...views[1], duration: 1.1, ease: 'h.move', onUpdate: applyVB }, 's1-=0.45')
    .fromTo(kFill, { opacity: 0 }, { opacity: 0.5, duration: 0.6 }, '<0.2')
    .fromTo(kStroke, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.9 }, '<')
    .fromTo(rivers, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.1 }, '<0.3')
    .to(vb, { ...views[2], duration: 1.1, ease: 'h.move', onUpdate: applyVB }, 's2-=0.45')
    .to(placeEls.filter((p) => p.step === 2).map((p) => p.g), { opacity: 1, duration: 0.4, stagger: 0.12 }, '<0.5')
    .set(boat, { opacity: 1 }, 's3-=0.9')
    .to(kmWrap, { opacity: 1, duration: 0.3 }, 's3-=0.9')
    .to(placeEls.filter((p) => p.step === 2).map((p) => p.g), { opacity: 0.35, duration: 0.4 }, 's3-=0.9')
    .to(vb, { ...views[3], duration: 1.5, ease: 'none', onUpdate: applyVB }, 's3-=0.9')
    .fromTo(boat, { motionPath: { path: rivers[1], align: rivers[1], alignOrigin: [0.5, 0.5], start: 0, end: 0 } },
      { motionPath: { path: rivers[1], align: rivers[1], alignOrigin: [0.5, 0.5], start: 0, end: 1 }, duration: 1.5, ease: 'none',
        onUpdate() { km.textContent = String(Math.round(this.progress() * 980)).padStart(3, '0'); } }, '<')
    .to(placeEls.filter((p) => p.step === 3).map((p) => p.g), { opacity: 1, duration: 0.4 }, '>-0.4');

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + Math.round(innerHeight * 3.4 * L), pin: '.where-pin', scrub: 0.8, anticipatePin: 1,
    animation: tl, invalidateOnRefresh: true,
  });
  tl.eventCallback('onUpdate', () => setState(nearestStep(tl, steps.length)));
}

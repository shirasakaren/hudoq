import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import map from '../data/map.json';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.appendChild(n); return n; };

/** Chapter 02: Borneo → East Kalimantan → the Mahakam. The map is real geodata, drawn on scroll. */
export function initMap(reduced) {
  const section = document.getElementById('where');
  const svg = document.getElementById('mapSvg');
  const layer = document.getElementById('mapLayer');
  const steps = [...section.querySelectorAll('.where-step')];
  const dots = [...section.querySelectorAll('.where-dots i')];

  const island = el('path', { d: map.island, fill: '#0f1f17', stroke: 'rgba(220,229,214,.45)', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, layer);
  const provs = el('g', { fill: 'none' }, layer);
  let kaltim;
  for (const [name, d] of Object.entries(map.provinces)) {
    const isKt = name === 'KALIMANTAN TIMUR';
    const p = el('path', { d, fill: 'none', stroke: 'rgba(220,229,214,.16)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, provs);
    if (isKt) kaltim = p;
  }
  // East Kalimantan: hatched fill that fades in (the tumpal red of the masks)
  const kFill = el('path', { d: map.provinces['KALIMANTAN TIMUR'], fill: '#c8412b', opacity: 0, stroke: 'var(--ember)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, layer);
  const rivers = ['rgba(217,164,65,.28)', '#d9a441'].map((stroke, k) => el('path', { d: map.mahakam, fill: 'none', stroke, 'stroke-width': k ? 3.2 : 11, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, layer));
  const len = rivers[0].getTotalLength();
  rivers.forEach((r) => { r.style.strokeDasharray = len; r.style.strokeDashoffset = len; });
  const river = rivers;
  const bigLabel = el('text', { x: 360, y: 760, class: 'map-label-big', opacity: 1 }, layer); bigLabel.textContent = 'BORNEO';

  const places = [
    ['longbagun', 'Mahakam Ulu', 'start', 2],
    ['melak', 'West Kutai', 'start', 2],
    ['samarinda', 'Samarinda', 'start', 3],
  ];
  const pg = el('g', {}, layer);
  const placeEls = places.map(([k, name, anchor, step]) => {
    const [x, y] = map.places[k];
    const g = el('g', { class: 'map-place', opacity: 0 }, pg);
    const pulse = el('circle', { cx: x, cy: y, r: 8, class: 'pulse' }, g);
    const dot = el('circle', { cx: x, cy: y, r: 5, fill: 'var(--ochre)' }, g);
    const t = el('text', { x: x + 14, y: y + 5, 'text-anchor': anchor }, g); t.textContent = name;
    pulse.style.animationDelay = `${-Math.random() * 2}s`;
    return { g, step, pulse, dot, t, x, y };
  });

  // viewBox targets
  const full = { x: 0, y: 0, w: map.w, h: map.h };
  const kb = kaltim.getBBox();
  const pad = 60;
  const views = [
    full,
    { x: kb.x - pad, y: kb.y - pad, w: kb.width + pad * 2, h: kb.height + pad * 2 },
    (() => { const [x, y] = map.places.longbagun; return { x: x - 150, y: y - 170, w: 460, h: 420 }; })(),
    (() => { const [x, y] = map.places.samarinda; return { x: x - 330, y: y - 190, w: 460, h: 420 }; })(),
  ];
  const vb = { ...full };
  const applyVB = () => {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const k = vb.w / 1000; // keep labels and dots a constant size on screen as the map zooms
    placeEls.forEach((p) => { p.t.style.fontSize = `${15 * k}px`; p.t.setAttribute('x', p.x + 14 * k); p.t.setAttribute('y', p.y + 5 * k); p.dot.setAttribute('r', 5 * k); p.pulse.setAttribute('r', 8 * k); });
  };
  applyVB();

  let cur = -1;
  function setStep(i) {
    if (i === cur) return; cur = i;
    steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    dots.forEach((d, j) => d.classList.toggle('is-active', j === i));
    gsap.to(vb, { ...views[i], duration: reduced ? 0 : 1.6, ease: 'expo.inOut', onUpdate: applyVB });
    gsap.to(kFill, { opacity: i >= 1 ? 0.5 : 0, duration: 1.2 });
    gsap.to(bigLabel, { opacity: i === 0 ? 1 : 0, duration: 0.8 });
    gsap.to(rivers, { strokeDashoffset: i >= 1 ? 0 : len, duration: reduced ? 0 : i >= 1 ? 3 : 1, ease: 'power2.inOut' });
    placeEls.forEach((p) => gsap.to(p.g, { opacity: (p.step === 3 ? i === 3 : i >= 2) ? 1 : 0, duration: 0.8 }));
  }
  setStep(0);

  if (reduced) { section.classList.add('is-static'); setStep(1); return; }

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: '+=360%', pin: '.where-pin', scrub: true, anticipatePin: 1,
    onUpdate: (self) => setStep(Math.min(3, Math.floor(self.progress * 4))),
  });
}

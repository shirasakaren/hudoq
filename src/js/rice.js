import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const STAGES = ['Clear', 'Plant', 'Dance', 'Grow', 'Harvest'];
const BEAT_NODE = [1, 1, 2, 2, 4];
const BEAT_CORE = ['Plant', 'Plant', 'Dance', 'Dance', 'Harvest'];

/** Chapter 03: the rice year as a ring that draws itself while five beats tell the story. */
export function initRice(reduced) {
  const section = document.getElementById('why');
  const beats = [...section.querySelectorAll('.rice-beat')];
  const photos = [...section.querySelectorAll('.rice-photo')];
  const draw = section.querySelector('.ring-draw');
  const nodesG = section.querySelector('.ring-nodes');
  const coreT = section.querySelector('.ring-core-t');
  const prog = section.querySelector('.rice-progress');
  const R = 168, C = 2 * Math.PI * R;
  draw.style.strokeDasharray = C; draw.style.strokeDashoffset = C;

  const NS = 'http://www.w3.org/2000/svg';
  const nodes = STAGES.map((name, i) => {
    const a = (-90 + i * 72) * (Math.PI / 180);
    const x = 200 + R * Math.cos(a), y = 200 + R * Math.sin(a);
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'ring-node');
    const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 9);
    const t = document.createElementNS(NS, 'text'); t.textContent = name;
    const lx = 200 + (R + 36) * Math.cos(a), ly = 200 + (R + 36) * Math.sin(a);
    t.setAttribute('x', lx); t.setAttribute('y', ly + 4); t.setAttribute('text-anchor', Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end');
    g.append(c, t); nodesG.appendChild(g); return g;
  });

  let cur = -1;
  function setBeat(i) {
    if (i === cur) return;
    const prev = cur; cur = i;
    beats.forEach((b, j) => {
      if (j === i) {
        b.classList.add('is-active');
        gsap.fromTo(b.children, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.09, overwrite: true });
      } else if (j === prev) {
        gsap.to(b.children, { y: -24, opacity: 0, duration: 0.4, ease: 'power2.in', overwrite: true, onComplete: () => b.classList.remove('is-active') });
      } else b.classList.remove('is-active');
    });
    photos.forEach((p, j) => p.classList.toggle('is-on', j === i));
    nodes.forEach((n, j) => { n.classList.toggle('is-active', j <= BEAT_NODE[i] && j >= 1 && j <= BEAT_NODE[i]); n.classList.toggle('is-warn', i === 1 && j === 1); });
    gsap.to(coreT, { opacity: 0, y: -10, duration: 0.2, onComplete: () => { coreT.textContent = BEAT_CORE[i]; gsap.to(coreT, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }); } });
  }
  setBeat(0);
  if (reduced) { section.classList.add('is-static'); return; }

  ScrollTrigger.create({
    trigger: section, start: 'top top', end: '+=480%', pin: '.rice-pin', scrub: true, anticipatePin: 1,
    onUpdate: (self) => {
      const p = self.progress;
      setBeat(Math.min(beats.length - 1, Math.floor(p * beats.length)));
      draw.style.strokeDashoffset = C * (1 - Math.min(1, p * 1.05));
      prog.style.setProperty('--p', p.toFixed(3));
    },
  });
}

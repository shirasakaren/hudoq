import { gsap } from 'gsap';
import { D } from './motion.js';

const LINES = ['Gathering the leaves', 'Carving the face', 'Tuning the gong', 'Finding the river', 'Almost there'];

/**
 * "Carved, then worn."
 * While loading, the mask is carved (the strokes draw) in step with real progress.
 * On entry that drawing travels to where the 3D mask lives, the page opens outward from its eyes,
 * and the 3D mask burns in on the same frame.
 */
export function initLoader() {
  const root = document.getElementById('loader');
  const num = document.getElementById('loaderNum');
  const line = document.getElementById('loaderLine');
  const rect = document.getElementById('loaderFillRect');
  const actions = root.querySelector('.loader-actions');
  const silent = root.querySelector('.loader-silent');
  const svg = root.querySelector('.loader-mask');
  let seen = false;
  try { seen = sessionStorage.getItem('hudoq-seen') === '1'; } catch (_) {}

  // mirror the half-mask template into left/right groups so each path can be drawn on
  const half = svg.querySelector('#lm-half');
  const lines = svg.querySelector('.lm-lines');
  const left = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const right = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  right.setAttribute('transform', 'translate(320 0) scale(-1 1)');
  [...half.children].forEach((n) => { left.appendChild(n.cloneNode(true)); right.appendChild(n.cloneNode(true)); });
  lines.prepend(right); lines.prepend(left);
  lines.querySelectorAll('use').forEach((u) => u.remove());
  const paths = [...lines.querySelectorAll('path, circle')];
  paths.forEach((p) => { const len = p.getTotalLength ? p.getTotalLength() : 300; p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });

  const st = { p: 0, shown: seen ? 0.6 : 0 };
  let lineI = -1;
  // the drawing is tied to real progress, not a fixed timer
  const draw = gsap.timeline({ paused: true }).to(paths, { strokeDashoffset: 0, ease: 'none', duration: 1, stagger: { each: 0.06 } });

  const setLine = (text) => {
    const span = document.createElement('span'); span.textContent = text;
    const old = line.firstElementChild;
    line.appendChild(span);
    gsap.fromTo(span, { yPercent: 100 }, { yPercent: 0, duration: D.ui, ease: 'h.reveal' });
    if (old) gsap.to(old, { yPercent: -100, duration: D.exit, ease: 'h.exit', onComplete: () => old.remove() });
  };
  line.textContent = ''; setLine(LINES[0]); lineI = 0;

  function render() {
    num.textContent = String(Math.round(st.shown * 100)).padStart(3, '0');
    rect.setAttribute('y', 360 - 360 * st.shown);
    draw.progress(Math.min(1, st.shown * 1.05));
    const li = Math.min(LINES.length - 1, Math.floor(st.shown * LINES.length));
    if (li !== lineI) { lineI = li; setLine(LINES[li]); }
  }
  const tick = () => { st.shown += (st.p - st.shown) * 0.1; if (Math.abs(st.p - st.shown) < 0.001) st.shown = st.p; render(); };
  gsap.ticker.add(tick);

  return {
    set(p) { st.p = Math.max(st.p, Math.min(1, p)); },
    /** resolves with { sound:boolean } once the visitor chooses */
    ready() {
      return new Promise((resolve) => {
        const finish = () => {
          st.p = 1; st.shown = 1; render();
          setLine('The forest is ready');
          actions.hidden = false; silent.hidden = false;
          gsap.from([...actions.children, silent], { y: 24, autoAlpha: 0, stagger: 0.1, duration: D.reveal, ease: 'h.reveal' });
          const a = root.querySelector('#enterSound'), b = root.querySelector('#enterSilent');
          a.addEventListener('click', () => resolve({ sound: true }), { once: true });
          b.addEventListener('click', () => resolve({ sound: false }), { once: true });
          a.focus({ preventScroll: true });
        };
        const wait = () => (st.shown >= 0.995 ? finish() : requestAnimationFrame(wait));
        st.p = 1; wait();
      });
    },
    /**
     * The match-cut. Returns a timeline; `onMatch` fires on the frame the 3D mask takes over.
     */
    exit({ gl, anchor, onMatch, reduced = false } = {}) {
      try { sessionStorage.setItem('hudoq-seen', '1'); } catch (_) {}
      const done = () => { gsap.ticker.remove(tick); root.remove(); document.body.classList.remove('is-loading'); };
      if (reduced || !anchor) {
        return gsap.timeline({ onComplete: done }).add(() => onMatch?.(), 0).to(root, { autoAlpha: 0, duration: 0.4, ease: 'none' });
      }
      const a = svg.getBoundingClientRect(), b = anchor.getBoundingClientRect();
      const sc = Math.min(b.width / a.width, b.height / a.height) * 0.82;
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height * 0.45 - (a.top + a.height / 2);
      const cx = b.left + b.width / 2, cy = b.top + b.height * 0.42; // the eyes
      root.style.setProperty('--cx', cx + 'px'); root.style.setProperty('--cy', cy + 'px');
      return gsap.timeline({ onComplete: done })
        .to([actions, silent, line, '.loader-meter'], { y: -14, autoAlpha: 0, duration: D.exit, ease: 'h.exit', stagger: 0.04 }, 0)
        .to(rect, { attr: { y: 0 }, duration: 0.3, ease: 'h.reveal' }, 0.05)                    // the fill completes: the eyes glint
        .to(svg, { x: dx, y: dy, scale: sc, duration: D.move * 0.85, ease: 'h.move' }, 0.2)     // the drawing travels to where the mask will be
        .to(root, { '--r': '160vmax', duration: 1.5, ease: 'h.move' }, 0.55)                    // the page opens outward from its eyes
        .add(() => { gl?.dissolveIn(0.9); onMatch?.(); }, 1.05)                                  // the 3D mask burns in on the same beat
        .to(svg, { autoAlpha: 0, duration: 0.35, ease: 'none' }, 1.2);
    },
  };
}

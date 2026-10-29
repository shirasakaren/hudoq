import { gsap } from 'gsap';

const LINES = ['Gathering the leaves', 'Carving the face', 'Tuning the gong', 'Finding the river', 'Almost there'];

/** Loader: the mask carves itself while real assets load, then asks how to enter (sound / silence). */
export function initLoader() {
  const root = document.getElementById('loader');
  const num = document.getElementById('loaderNum');
  const line = document.getElementById('loaderLine');
  const rect = document.getElementById('loaderFillRect');
  const actions = root.querySelector('.loader-actions');
  const svg = root.querySelector('.loader-mask');

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
  paths.forEach((p) => {
    const len = p.getTotalLength ? p.getTotalLength() : 300;
    p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.dataset.len = len;
  });

  const st = { p: 0, shown: 0 };
  let lineI = 0;
  const draw = gsap.to(paths, { strokeDashoffset: 0, duration: 2.2, ease: 'h.move', stagger: { each: 0.08, from: 'start' } });

  function render() {
    const v = Math.round(st.shown * 100);
    num.textContent = v;
    rect.setAttribute('y', 360 - 360 * st.shown);
    const li = Math.min(LINES.length - 1, Math.floor(st.shown * LINES.length));
    if (li !== lineI) { lineI = li; line.textContent = LINES[li]; }
  }
  const tick = () => { st.shown += (st.p - st.shown) * 0.12; if (Math.abs(st.p - st.shown) < 0.001) st.shown = st.p; render(); };
  gsap.ticker.add(tick);

  return {
    set(p) { st.p = Math.max(st.p, Math.min(1, p)); },
    /** resolves with { sound:boolean } once the visitor chooses */
    ready() {
      return new Promise((resolve) => {
        const finish = () => {
          st.p = 1; st.shown = 1; render();
          line.textContent = 'The forest is ready';
          actions.hidden = false;
          gsap.from(actions.children, { y: 24, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'h.reveal' });
          const a = root.querySelector('#enterSound'), b = root.querySelector('#enterSilent');
          a.addEventListener('click', () => resolve({ sound: true }), { once: true });
          b.addEventListener('click', () => resolve({ sound: false }), { once: true });
          a.focus({ preventScroll: true });
        };
        const wait = () => (st.shown >= 0.995 && draw.progress() > 0.98 ? finish() : requestAnimationFrame(wait));
        st.p = 1; wait();
      });
    },
    exit() {
      return new Promise((resolve) => {
        gsap.timeline({ onComplete: () => { gsap.ticker.remove(tick); root.remove(); document.body.classList.remove('is-loading'); resolve(); } })
          .to(root.querySelectorAll('.loader-actions, .loader-count, .loader-line'), { opacity: 0, y: -20, duration: 0.5, stagger: 0.05, ease: 'h.exit' })
          .to(svg, { scale: 7, opacity: 0, duration: 1.1, ease: 'h.exit' }, 0.1)
          .to(root, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'h.move' }, 0.45);
      });
    },
  };
}

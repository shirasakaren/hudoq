import { gsap } from 'gsap';

/** Custom cursor (fine pointers only): dot + ring, with named states via [data-cursor="label"]. */
export function initCursor() {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.querySelector('.cursor');
  if (!fine || !root) return;
  const label = root.querySelector('.cursor-label');
  const xTo = gsap.quickTo(root, 'x', { duration: 0.28, ease: 'power3' });
  const yTo = gsap.quickTo(root, 'y', { duration: 0.28, ease: 'power3' });
  const dot = root.querySelector('.cursor-dot');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.05 }), dy = gsap.quickTo(dot, 'y', { duration: 0.05 });
  const ring = root.querySelector('.cursor-ring');
  let shown = false, ox = 0, oy = 0, lx = 0, ly = 0;
  // the ring stretches along its direction of travel (kept on an inner transform so it never fights the hover scale)
  gsap.ticker.add(() => {
    const x = gsap.getProperty(root, 'x'), y = gsap.getProperty(root, 'y');
    const vx = x - lx, vy = y - ly; lx = x; ly = y;
    const v = Math.min(Math.hypot(vx, vy) / 40, 0.28);
    ring.style.setProperty('--sq', `rotate(${Math.atan2(vy, vx)}rad) scale(${1 + v}, ${1 - v * 0.6})`);
  });
  addEventListener('pointermove', (e) => {
    if (!shown) { shown = true; root.classList.add('is-on'); gsap.set(root, { x: e.clientX, y: e.clientY }); }
    xTo(e.clientX); yTo(e.clientY);
    dx(e.clientX - gsap.getProperty(root, 'x')); dy(e.clientY - gsap.getProperty(root, 'y'));
    ox = e.clientX; oy = e.clientY;
  }, { passive: true });
  document.addEventListener('pointerleave', () => root.classList.remove('is-on'));
  document.addEventListener('pointerenter', () => shown && root.classList.add('is-on'));
  const interactive = 'a, button, [role="button"], input, summary, [data-cursor]';
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(interactive);
    if (!t) return;
    const txt = t.dataset.cursor;
    root.classList.toggle('is-hidden', txt === 'lantern');
    if (txt === 'lantern') return;
    root.classList.add('is-hover');
    if (txt) { label.textContent = txt; root.classList.add('has-label'); }
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest(interactive);
    if (!t) return;
    root.classList.remove('is-hover', 'has-label', 'is-hidden');
  });
}

/** Magnetic pull on [data-magnetic]. */
export function initMagnetic() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'h.reveal' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'h.reveal' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.36);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/** Text roll on buttons and header controls: the label slides up and an identical one takes its place. */
export function initHoverRoll() {
  document.querySelectorAll('.btn > span, .icon-btn > .mono:not(.sound-label), .menu-btn > .mono').forEach((el) => {
    const txt = el.textContent;
    el.textContent = '';
    const wrap = document.createElement('span'); wrap.className = 'roll'; wrap.setAttribute('aria-hidden', 'false');
    const a = document.createElement('span'); a.textContent = txt;
    const b = document.createElement('span'); b.textContent = txt; b.setAttribute('aria-hidden', 'true');
    wrap.append(a, b); el.appendChild(wrap);
  });
}

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
  let shown = false, ox = 0, oy = 0;
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
    root.classList.add('is-hover');
    if (txt) { label.textContent = txt; root.classList.add('has-label'); }
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest(interactive);
    if (!t) return;
    root.classList.remove('is-hover', 'has-label');
  });
}

/** Magnetic pull on [data-magnetic]. */
export function initMagnetic() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.36);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

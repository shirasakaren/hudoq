import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Observer } from 'gsap/Observer';
import { masks } from '../data/masks.js';
import { audio } from '../audio.js';

// where each hidden mask sits in the dark room: x%, y% (of 150svh), width (vmin), rotation
const SPOTS = [
  [74, 14, 17, 8], [90, 36, 13, -10], [58, 30, 15, 4], [34, 62, 14, -6], [14, 86, 13, 12],
  [48, 78, 16, -3], [80, 66, 15, 7], [64, 92, 12, -12], [24, 40, 11, 9], [92, 88, 11, -5], [8, 58, 10, 6],
];

export function initFaces(lenis, reduced, mobile = false) {
  initDark(reduced);
  initGallery(lenis, reduced, mobile);
}

/* ───────── The dark room: your light is the only light ───────── */
function initDark(reduced) {
  const room = document.getElementById('dark');
  const list = document.getElementById('darkMasks');
  const countEl = document.getElementById('darkCount');
  const done = room.querySelector('.dark-done');
  const em = room.querySelector('.display-xl em');
  const found = document.createElement('ul');
  found.className = 'dark-found'; found.setAttribute('aria-hidden', 'true');
  list.after(found);
  const items = masks.map((m, i) => {
    const [x, y, w, r] = SPOTS[i];
    const li = document.createElement('li');
    li.style.cssText = `--x:${x}%;--y:${y}%;--w:${w}vmin;--r:${r}deg`;
    li.innerHTML = `<img src="${m.small}" alt="" width="${m.w}" height="${m.h}" loading="lazy" decoding="async"><i class="glint"></i>`;
    list.appendChild(li);
    return { li, found: false, i, cx: 0, cy: 0, w: 0 };
  });
  const coarse = matchMedia('(hover: none)').matches;
  let px = -999, py = -999, active = false, count = 0, hasPointer = false;

  room.addEventListener('pointermove', (e) => { hasPointer = true; const r = room.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; });
  room.addEventListener('pointerleave', () => { hasPointer = false; });
  ScrollTrigger.create({ trigger: room, start: 'top bottom', end: 'bottom top', onToggle: (s) => { active = s.isActive; } });
  const measure = () => { const r = room.getBoundingClientRect(); items.forEach((it) => { const b = it.li.getBoundingClientRect(); it.cx = b.left - r.left + b.width / 2; it.cy = b.top - r.top + b.height / 2; it.w = b.width; }); };
  ScrollTrigger.addEventListener('refresh', measure); addEventListener('resize', measure);

  if (reduced) {
    items.forEach((it) => { found.appendChild(it.li); it.li.classList.add('is-lit'); });
    countEl.textContent = '11'; done.style.opacity = 1; done.textContent = 'Eleven faces. No two alike.';
    return;
  }

  function foundOne(it) {
    it.found = true; count++;
    found.appendChild(it.li);
    gsap.fromTo(countEl, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'h.reveal' });
    countEl.textContent = count;
    gsap.fromTo(it.li.querySelector('.glint'), { scale: 0, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.7, ease: 'h.reveal' });
    audio.pluck(it.i, 0, 0.8);
    if (count === items.length) ignite(it);
  }

  // all eleven: the room lights from the last find outward, a gong sounds, the line changes
  function ignite(last) {
    audio.gong(98, 1);
    gsap.to(items.map((x) => x.li), { opacity: 1, scale: 1, duration: 1.1, ease: 'h.reveal', stagger: { each: 0.07, from: last.i } });
    room.classList.add('is-ignited');
    gsap.timeline().to(em, { yPercent: -110, autoAlpha: 0, duration: 0.45, ease: 'h.exit' })
      .add(() => { em.textContent = 'they’ve seen you.'; })
      .fromTo(em, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'h.reveal' });
    done.textContent = 'Eleven faces. No two alike.';
    gsap.to(done, { opacity: 1, y: -10, duration: 1.4, ease: 'h.reveal', delay: 0.5 });
  }

  gsap.ticker.add((time) => {
    if (!active) return;
    const r = room.getBoundingClientRect();
    if (!hasPointer) {
      // an invitation only: the light wanders by itself, and finds nothing
      px = r.width * (0.5 + 0.34 * Math.sin(time * 0.45)); py = -r.top + innerHeight * 0.5 + Math.sin(time * 0.7) * innerHeight * 0.28;
    }
    // the lantern flickers a little
    const lr = 30 + Math.sin(time * 7.3) * 0.6 + Math.sin(time * 13.1) * 0.4;
    room.style.setProperty('--mx', px + 'px'); room.style.setProperty('--my', py + 'px'); room.style.setProperty('--lr', lr + 'vmin');
    if (!hasPointer) return;
    const radius = Math.min(innerWidth, innerHeight) * (lr / 100) * 0.42;
    for (const it of items) {
      if (it.found) continue;
      if (Math.hypot(it.cx - px, it.cy - py) < radius + it.w * 0.15) foundOne(it);
    }
  });
  measure();
  if (coarse) room.querySelector('.dark-hint-t').textContent = 'Drag your light';
}

/* ───────── The gallery: eleven carved faces ───────── */
function initGallery(lenis, reduced, mobile) {
  const section = document.getElementById('gallery');
  const track = document.getElementById('galleryTrack');
  const head = section.querySelector('.gallery-head');
  track.appendChild(head); // the heading is the first thing on the strip, so it scrolls away with the cards
  masks.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'mcard'; b.type = 'button';
    b.style.setProperty('--ratio', Math.max(0.62, Math.min(1.15, m.ratio * 0.95)));
    b.style.setProperty('--tint', m.tint);
    b.dataset.cursor = 'inspect';
    b.innerHTML = `<span class="mcard-n mono">${String(m.n).padStart(2, '0')}</span><img src="${m.small}" alt="Carved Hudoq mask: ${m.caption}" width="${m.w}" height="${m.h}" loading="lazy" decoding="async"><span class="mcard-t">${m.caption}</span>`;
    track.appendChild(b);
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      b.style.setProperty('--ry', nx * 16 + 'deg'); b.style.setProperty('--rx', -ny * 12 + 'deg');
      b.style.setProperty('--tx', nx * 10 + 'px'); b.style.setProperty('--ty', ny * 8 + 'px');
    });
    b.addEventListener('pointerleave', () => ['--ry', '--rx', '--tx', '--ty'].forEach((v) => b.style.removeProperty(v)));
    b.addEventListener('click', () => openInspect(i, b));
    b.tabIndex = i === 0 ? 0 : -1; // roving tabindex: one stop for the strip, arrows move inside it
  });

  if (reduced) { section.classList.add('is-static'); head.style.cssText = 'position:static;width:auto'; return; }

  // phones: no horizontal pin — the strip is a native swipe with snap, plus a counter
  if (mobile) {
    section.classList.add('is-swipe');
    const cards = [...track.querySelectorAll('.mcard')];
    const count = document.createElement('p'); count.className = 'gallery-count mono'; count.setAttribute('aria-hidden', 'true'); count.textContent = '01 / 11';
    section.appendChild(count);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.6) count.textContent = `${String(cards.indexOf(e.target) + 1).padStart(2, '0')} / 11`; }), { root: track, threshold: [0.6] });
    cards.forEach((c) => io.observe(c));
    return;
  }

  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  let vel = 0, shown = 0;
  const st = ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + dist() * 1.1, pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
    animation: gsap.to(track, { x: () => -dist(), ease: 'none' }),
    onUpdate: (self) => { vel = gsap.utils.clamp(-8, 8, self.getVelocity() / -260); },
  });
  // the strip leans into the scroll: cards turn on Y, pictures slide a little against their frames
  gsap.ticker.add(() => {
    shown += (vel - shown) * 0.12; vel *= 0.9;
    track.style.setProperty('--vel', shown.toFixed(3));
  });

  // drag the strip like film (maps to page scroll so everything stays in sync)
  Observer.create({
    target: track, type: 'pointer', dragMinimum: 4,
    onDrag: (self) => { if (self.event.pointerType === 'mouse') lenis.scrollTo(lenis.scroll - self.deltaX * 1.1, { immediate: true, force: true }); },
  });
  track.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      const cards = [...track.querySelectorAll('.mcard')];
      const i = cards.indexOf(document.activeElement); if (i < 0) return;
      const to = e.key === 'Home' ? 0 : e.key === 'End' ? cards.length - 1 : i + (e.key === 'ArrowRight' ? 1 : -1);
      const n = cards[Math.max(0, Math.min(cards.length - 1, to))];
      cards.forEach((c) => { c.tabIndex = -1; }); n.tabIndex = 0;
      n.focus({ preventScroll: true });
      const p = (n.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)) / dist();
      lenis.scrollTo(st.start + (st.end - st.start) * Math.max(0, Math.min(1, p)), { duration: 0.8 });
      e.preventDefault();
    }
  });
}

/* ───────── Inspect dialog ───────── */
let dialog;
function openInspect(index, opener) {
  let i = index;
  dialog = document.createElement('div');
  dialog.className = 'inspect'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', 'Inspect mask');
  dialog.innerHTML = `
    <div class="inspect-card">
      <button class="btn btn-ghost inspect-close" aria-label="Close"><span>Close ✕</span></button>
      <div class="inspect-img"><img alt=""></div>
      <div class="inspect-meta">
        <span class="mono kicker"><span class="in-n"></span> of 11</span>
        <h3 class="in-t"></h3>
        <p class="in-p">Move your pointer over the mask to tilt it. Use ← → to move between faces.</p>
        <div class="inspect-nav">
          <button class="btn btn-ghost in-prev"><span>← Prev</span></button>
          <button class="btn btn-solid in-next"><span>Next →</span></button>
        </div>
        <p class="mono" style="opacity:.4">Photo: Art of the Ancestors</p>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  const img = dialog.querySelector('.inspect-img img');
  const imgBox = dialog.querySelector('.inspect-img');
  const set = (n) => {
    i = (n + masks.length) % masks.length; const m = masks[i];
    img.src = m.large; img.alt = `Carved Hudoq mask: ${m.caption}`;
    dialog.querySelector('.in-n').textContent = String(m.n).padStart(2, '0');
    const t = dialog.querySelector('.in-t'); t.textContent = m.caption;
    gsap.fromTo(img, { opacity: 0, y: 24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'h.reveal' });
    gsap.fromTo(t, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'h.reveal' });
    audio.pluck(i, 0, 0.7);
  };
  const close = () => {
    gsap.to(dialog, { opacity: 0, duration: 0.3, onComplete: () => { dialog.remove(); document.removeEventListener('keydown', onKey); window.__lenis?.start(); opener?.focus({ preventScroll: true }); } });
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') set(i + 1);
    else if (e.key === 'ArrowLeft') set(i - 1);
    else if (e.key === 'Tab') { // focus trap
      const f = [...dialog.querySelectorAll('button')]; const first = f[0], last = f.at(-1);
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  };
  document.addEventListener('keydown', onKey);
  dialog.querySelector('.inspect-close').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.querySelector('.in-prev').addEventListener('click', () => set(i - 1));
  dialog.querySelector('.in-next').addEventListener('click', () => set(i + 1));
  imgBox.addEventListener('pointermove', (e) => {
    const r = imgBox.getBoundingClientRect(); const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    img.style.setProperty('--ry', nx * 22 + 'deg'); img.style.setProperty('--rx', -ny * 16 + 'deg');
  });
  window.__lenis?.stop();
  gsap.from(dialog, { opacity: 0, duration: 0.4 });
  set(i);
  dialog.querySelector('.inspect-close').focus({ preventScroll: true });
}

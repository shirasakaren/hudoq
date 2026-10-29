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

export function initFaces(lenis, reduced) {
  initDark(reduced);
  initGallery(lenis, reduced);
}

/* ───────── The dark room: your cursor is the lantern ───────── */
function initDark(reduced) {
  const room = document.getElementById('dark');
  const list = document.getElementById('darkMasks');
  const countEl = document.getElementById('darkCount');
  const done = room.querySelector('.dark-done');
  const items = masks.map((m, i) => {
    const [x, y, w, r] = SPOTS[i];
    const li = document.createElement('li');
    li.style.cssText = `--x:${x}%;--y:${y}%;--w:${w}vmin;--r:${r}deg`;
    li.innerHTML = `<img src="${m.small}" alt="" width="${m.w}" height="${m.h}" loading="lazy" decoding="async">`;
    list.appendChild(li);
    return { li, found: false, i };
  });
  const coarse = matchMedia('(hover: none)').matches;
  let px = -999, py = -999, active = false, count = 0, t0 = 0;
  const lit = items.map(() => 0);

  room.addEventListener('pointermove', (e) => { const r = room.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; });
  room.addEventListener('pointerleave', () => { if (!coarse) { px = py = -999; } });
  ScrollTrigger.create({ trigger: room, start: 'top bottom', end: 'bottom top', onToggle: (s) => { active = s.isActive; } });

  if (reduced) { items.forEach((it) => { it.li.classList.add('is-found'); }); countEl.textContent = '11'; done.style.opacity = 1; done.textContent = 'Eleven faces. No two alike.'; return; }

  function foundOne(it) {
    it.found = true; count++; countEl.textContent = count;
    audio.pluck(it.i, 0, 0.8);
    gsap.fromTo(it.li, { scale: 1 }, { scale: 1.08, duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.out' });
    if (count === items.length) {
      audio.gong(98, 1);
      items.forEach((x) => x.li.classList.add('is-found'));
      done.textContent = 'Eleven faces. No two alike.';
      gsap.to(done, { opacity: 1, y: -10, duration: 1.4, ease: 'expo.out' });
    }
  }

  gsap.ticker.add((time) => {
    if (!active) return;
    const r = room.getBoundingClientRect();
    if (coarse || (px < -500 && py < -500)) {
      // touch / no pointer yet: a lantern that wanders on its own and follows the scroll
      t0 = time;
      px = r.width * (0.5 + 0.38 * Math.sin(time * 0.45)); py = -r.top + innerHeight * 0.5 + Math.sin(time * 0.7) * innerHeight * 0.3 + r.height * 0.1 * Math.cos(time * 0.3);
      if (!coarse) { px = -999; py = -999; }
    }
    room.style.setProperty('--mx', px + 'px'); room.style.setProperty('--my', py + 'px');
    const rad = Math.max(150, Math.min(innerWidth, innerHeight) * 0.27);
    items.forEach((it, k) => {
      if (it.found && count === items.length) return;
      const b = it.li.getBoundingClientRect();
      const cx = b.left - r.left + b.width / 2, cy = b.top - r.top + b.height / 2;
      const d = Math.hypot(cx - px, cy - py);
      const target = it.found ? 0.9 : Math.max(0.09, Math.min(1, 1 - (d - b.width * 0.2) / rad));
      lit[k] += (target - lit[k]) * 0.18;
      it.li.style.setProperty('--lit', lit[k].toFixed(3));
      if (!it.found && lit[k] > 0.62) foundOne(it);
    });
  });
}

/* ───────── The gallery: eleven carved faces ───────── */
function initGallery(lenis, reduced) {
  const section = document.getElementById('gallery');
  const track = document.getElementById('galleryTrack');
  masks.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'mcard'; b.type = 'button';
    b.style.setProperty('--ratio', Math.max(0.62, Math.min(1.15, m.ratio * 0.95)));
    b.style.setProperty('--tint', m.tint);
    b.setAttribute('aria-label', `Mask ${m.n}: ${m.caption}. Open to inspect.`);
    b.dataset.cursor = 'inspect';
    b.innerHTML = `<span class="mcard-n mono">${String(m.n).padStart(2, '0')}</span><img src="${m.small}" alt="Carved Hudoq mask: ${m.caption}" width="${m.w}" height="${m.h}" loading="lazy" decoding="async"><span class="mcard-t">${m.caption}</span>`;
    track.appendChild(b);
    // tilt toward the pointer
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      b.style.setProperty('--ry', nx * 16 + 'deg'); b.style.setProperty('--rx', -ny * 12 + 'deg');
      b.style.setProperty('--tx', nx * 10 + 'px'); b.style.setProperty('--ty', ny * 8 + 'px');
    });
    b.addEventListener('pointerleave', () => ['--ry', '--rx', '--tx', '--ty'].forEach((v) => b.style.removeProperty(v)));
    b.addEventListener('click', () => openInspect(i, b));
  });

  if (reduced) { section.classList.add('is-static'); return; }

  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const imgs = gsap.utils.toArray('.mcard img');
  const skew = gsap.quickSetter ? null : null;
  const st = ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => '+=' + dist() * 1.1, pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
    animation: gsap.to(track, { x: () => -dist(), ease: 'none' }),
    onUpdate: (self) => {
      const v = gsap.utils.clamp(-7, 7, self.getVelocity() / -180);
      gsap.to(imgs, { skewX: v, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
    },
  });

  // drag the track like a film strip (maps to page scroll so everything stays in sync)
  Observer.create({
    target: track, type: 'pointer', dragMinimum: 4,
    onDrag: (self) => { if (self.event.pointerType === 'mouse') lenis.scrollTo(lenis.scroll - self.deltaX * 1.1, { immediate: true, force: true }); },
  });
  // keyboard: arrows on a focused card nudge along
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const cards = [...track.querySelectorAll('.mcard')];
      const i = cards.indexOf(document.activeElement); if (i < 0) return;
      const n = cards[Math.max(0, Math.min(cards.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
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
    gsap.fromTo(img, { opacity: 0, y: 24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' });
    gsap.fromTo(t, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' });
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

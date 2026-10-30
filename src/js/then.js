import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { asset } from './url.js';
import { audio } from '../audio.js';
import { D } from './motion.js';

const REELS = [
  { type: 'video', src: asset('/video/archive-1948.mp4'), poster: asset('/video/archive-1948.jpg'), gray: 1, ar: '4 / 3', arw: 1.333, cap: '<b>1948.</b> From “Het Land van de Hoedo”, a Dutch-era film. A gong sounds; masks step out of the forest.' },
  { type: 'video', src: asset('/video/archive-1933.mp4'), poster: asset('/video/archive-1933.jpg'), gray: 0.45, ar: '16 / 9', arw: 1.778, cap: '<b>c. 1933</b>, the uploader says. Colour added later. Leaf cloaks, tall headdresses, a crowd on the veranda.' },
  { type: 'photo', ar: '3 / 2', arw: 1.5, cap: '<b>Undated.</b> Leaf-clad dancers stand in front of a wooden house. Photographer unknown.' },
];

/** Chapter 09: an archive projector (grain, weave, scratches, cue marks, a burn between reels) — and the film frame that grows into colour. */
export function initThen(reduced, L = 1) {
  const section = document.getElementById('then');
  const root = document.getElementById('projector');
  const video = document.getElementById('reelVideo');
  const photo = root.querySelector('.reel-photo');
  const tabs = [...root.querySelectorAll('.reel-tab')];
  const cap = document.getElementById('reelCaption');
  const range = document.getElementById('reelRange');
  const timeEl = document.getElementById('reelTime');
  const cue = document.getElementById('reelCue');
  const grain = document.getElementById('filmGrain');
  const frame = root.querySelector('.gate-frame');
  const burn = root.querySelector('.burn');
  const cueDot = root.querySelector('.cue-dot');
  const scratches = [...root.querySelectorAll('.film-scratch')];
  let cur = 0, inView = false, scrubbing = false;

  function swap(i) {
    cur = i; const r = REELS[i];
    tabs.forEach((t, j) => { t.classList.toggle('is-active', j === i); t.setAttribute('aria-selected', j === i); });
    frame.style.setProperty('--gray', r.gray ?? 1); frame.style.setProperty('--ar', r.ar); frame.style.setProperty('--arw', r.arw);
    cap.innerHTML = r.cap;
    gsap.fromTo(cap, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: D.ui, ease: 'h.reveal' });
    if (r.type === 'photo') {
      video.pause(); video.hidden = true; photo.hidden = false; range.disabled = true; cue.textContent = '● STILL'; timeEl.textContent = '—';
    } else {
      photo.hidden = true; video.hidden = false; range.disabled = false; cue.textContent = '● REC';
      video.poster = r.poster; video.dataset.src = r.src;
      if (inView) { video.src = r.src; video.load(); if (!reduced) video.play().catch(() => {}); } else video.removeAttribute('src');
    }
  }
  // switching reels: a film burn eats the frame, the cut happens under it, the burn clears
  function show(i) {
    if (reduced || !burn || i === cur) { swap(i); return; }
    audio.tick(220, 1);
    gsap.timeline()
      .set(burn, { opacity: 1 }).fromTo(burn, { '--b': 0 }, { '--b': 1.4, duration: 0.45, ease: 'steps(6)' })
      .add(() => swap(i))
      .to(burn, { opacity: 0, duration: 0.3, ease: 'none' });
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));

  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let nextCue = 8;
  video.addEventListener('timeupdate', () => {
    if (scrubbing || !video.duration) return;
    range.value = Math.round((video.currentTime / video.duration) * 1000);
    timeEl.textContent = `${mmss(video.currentTime)} / ${mmss(video.duration)}`;
    // the projectionist's cue mark: a dot flashes top-right every 8 s of playback
    if (video.currentTime >= nextCue) { nextCue += 8; if (!reduced) gsap.fromTo(cueDot, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'steps(2)' }); }
    if (video.currentTime < 1) nextCue = 8;
  });
  range.addEventListener('input', () => {
    scrubbing = true; video.pause();
    if (video.duration) { video.currentTime = (range.value / 1000) * video.duration; timeEl.textContent = `${mmss(video.currentTime)} / ${mmss(video.duration)}`; }
  });
  range.addEventListener('change', () => { scrubbing = false; if (inView && !reduced && !video.hidden) video.play().catch(() => {}); });

  // film grain: tiny noise canvas redrawn ~12×/s while visible; random scratches every few seconds
  const gctx = grain.getContext('2d'); grain.width = 240; grain.height = 135;
  const img = gctx.createImageData(240, 135);
  let lastG = 0, nextScratch = 3;
  gsap.ticker.add((t) => {
    if (!inView || reduced) return;
    if (t - lastG >= 0.08) {
      lastG = t;
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      gctx.putImageData(img, 0, 0);
    }
    if (t > nextScratch) {
      nextScratch = t + 3 + Math.random() * 3;
      const s = scratches[Math.floor(Math.random() * scratches.length)];
      gsap.set(s, { left: 10 + Math.random() * 80 + '%' }); gsap.fromTo(s, { opacity: 0.65 }, { opacity: 0, duration: 0.12, ease: 'steps(2)' });
    }
  });

  ScrollTrigger.create({
    trigger: root, start: 'top 85%', end: 'bottom 10%',
    onToggle: (s) => { inView = s.isActive; if (s.isActive && !video.hidden && !video.src) { video.src = video.dataset.src; video.load(); } if (reduced) return; if (s.isActive && !video.hidden && !scrubbing) video.play().catch(() => {}); else video.pause(); },
  });
  swap(0);

  if (reduced) return;

  // contact strips: two rows of stills slide against each other as you scroll
  gsap.utils.toArray('.strip').forEach((el) => {
    const tr = el.firstElementChild, dir = +el.dataset.dir;
    const dist = () => Math.max(0, tr.scrollWidth - innerWidth);
    gsap.fromTo(tr, { x: () => (dir < 0 ? 0 : -dist()) }, { x: () => (dir < 0 ? -dist() : 0), ease: 'none', scrollTrigger: { trigger: '.strips', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
  });

  // ── projector cut: a film leader counts 3·2·1 on the way into this chapter (once per visit)
  const leader = document.querySelector('.leader'), ldN = leader.querySelector('.ld-n'), ldRing = leader.querySelector('.ld-ring');
  ScrollTrigger.create({
    trigger: section, start: 'top 62%', once: true,
    onEnter: () => {
      const tl = gsap.timeline();
      tl.set(leader, { visibility: 'visible', opacity: 1 });
      [3, 2, 1].forEach((n, i) => {
        tl.add(() => { ldN.textContent = n; audio.tick(1800, 0.4); }, i * 0.3)
          .fromTo(ldRing, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.3, ease: 'none' }, i * 0.3);
      });
      tl.to(leader, { opacity: 0, duration: 0.25, ease: 'none' }, 0.95).set(leader, { visibility: 'hidden' });
    },
  });

  // ── return to colour: the film gate grows to fill the screen and becomes the festival (the Now hero sits beneath the same frame)
  const cut = document.querySelector('.colour-cut'), cutVideo = cut.querySelector('video');
  const nowVideo = document.querySelector('.now-hero video');
  const gate = root.querySelector('.gate-frame');
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  const rectInset = () => { const r = gate.getBoundingClientRect(); return `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 6px)`; };
  // opacity only inside the scrub: visibility is decided separately, from the scroll range, so a fast scroll can never strand the layer on screen
  tl.fromTo(cut, { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.14)               // the film holds for a beat, then colour fades in inside the gate
    .fromTo(cut, { clipPath: () => rectInset(), filter: 'grayscale(1) sepia(.25) contrast(1.15)' },
      { clipPath: 'inset(0px 0px 0px 0px round 0px)', filter: 'grayscale(0) sepia(0) contrast(1)', ease: 'h.move', duration: 0.86 }, 0.14)
    .to('.reel-tabs, .reel-caption, .reel-scrub, .gate-hud', { opacity: 0, duration: 0.2, pointerEvents: 'none' }, 0.1);
  const st = ScrollTrigger.create({
    trigger: root, start: 'center center', end: () => '+=' + Math.round(innerHeight * 1.2 * L), pin: root, scrub: 0.6, anticipatePin: 1,
    animation: tl, invalidateOnRefresh: true,
  });
  // the layer is visible exactly while the scroll position is between the projector pin and the top of the Now hero (it hands over on the same frame)
  const live = ScrollTrigger.create({
    trigger: root, start: 'center center', endTrigger: '.now-hero', end: 'top top',
    onToggle: (s) => {
      gsap.set(cut, { visibility: s.isActive ? 'visible' : 'hidden' });
      if (s.isActive) { if (!cutVideo.src) { cutVideo.src = cutVideo.dataset.src; cutVideo.load(); } cutVideo.play().catch(() => {}); }
      else { try { nowVideo.currentTime = cutVideo.currentTime; } catch (_) {} cutVideo.pause(); }
    },
  });
  gsap.ticker.add(() => { if (!live.isActive && cut.style.visibility !== 'hidden') cut.style.visibility = 'hidden'; });
}

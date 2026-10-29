import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const REELS = [
  { type: 'video', src: '/video/archive-1948.mp4', poster: '/video/archive-1948.jpg', gray: 1, ar: '4 / 3', cap: '<b>1948.</b> From “Het Land van de Hoedo”, a Dutch-era film. A gong sounds; masks step out of the forest.' },
  { type: 'video', src: '/video/archive-1933.mp4', poster: '/video/archive-1933.jpg', gray: 0.45, ar: '16 / 9', cap: '<b>c. 1933</b>, the uploader says. Colour added later. Leaf cloaks, tall headdresses, a crowd on the veranda.' },
  { type: 'photo', ar: '3 / 2', cap: '<b>Undated.</b> Leaf-clad dancers stand in front of a wooden house. Photographer unknown.' },
];

/** Chapter 09: an archive projector — grain, scratches, gate weave, a scrubbable reel. */
export function initThen(reduced) {
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
  let cur = 0, inView = false, scrubbing = false;

  function show(i) {
    cur = i; const r = REELS[i];
    tabs.forEach((t, j) => { t.classList.toggle('is-active', j === i); t.setAttribute('aria-selected', j === i); });
    frame.style.setProperty('--gray', r.gray ?? 1); frame.style.setProperty('--ar', r.ar);
    gsap.fromTo(cap, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' });
    cap.innerHTML = r.cap;
    gsap.fromTo(frame, { filter: 'brightness(2.4) contrast(1.4)' }, { filter: 'brightness(1) contrast(1)', duration: 0.9, ease: 'power2.out' });
    if (r.type === 'photo') {
      video.pause(); video.hidden = true; photo.hidden = false; range.disabled = true; cue.textContent = '● STILL'; timeEl.textContent = '—';
    } else {
      photo.hidden = true; video.hidden = false; range.disabled = false; cue.textContent = '● REC';
      video.poster = r.poster; video.dataset.src = r.src;
      if (inView) { video.src = r.src; video.load(); if (!reduced) video.play().catch(() => {}); } else video.removeAttribute('src');
    }
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));

  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  video.addEventListener('timeupdate', () => {
    if (scrubbing || !video.duration) return;
    range.value = Math.round((video.currentTime / video.duration) * 1000);
    timeEl.textContent = `${mmss(video.currentTime)} / ${mmss(video.duration)}`;
  });
  range.addEventListener('input', () => {
    scrubbing = true; video.pause();
    if (video.duration) { video.currentTime = (range.value / 1000) * video.duration; timeEl.textContent = `${mmss(video.currentTime)} / ${mmss(video.duration)}`; }
  });
  range.addEventListener('change', () => { scrubbing = false; if (inView && !reduced && !video.hidden) video.play().catch(() => {}); });

  // film grain: tiny noise canvas redrawn ~12×/s, only while visible
  const gctx = grain.getContext('2d'); grain.width = 240; grain.height = 135;
  const img = gctx.createImageData(240, 135);
  let lastG = 0;
  gsap.ticker.add((t) => {
    if (!inView || reduced || t - lastG < 0.08) return; lastG = t;
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gctx.putImageData(img, 0, 0);
  });

  ScrollTrigger.create({
    trigger: root, start: 'top 85%', end: 'bottom 10%',
    onToggle: (s) => { inView = s.isActive; if (s.isActive && !video.hidden && !video.src) { video.src = video.dataset.src; video.load(); } if (reduced) return; if (s.isActive && !video.hidden && !scrubbing) video.play().catch(() => {}); else video.pause(); },
  });
  show(0);
}

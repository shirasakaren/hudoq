import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';
import { masks } from '../data/masks.js';
import { BEAT as INTERVAL } from './motion.js';

const PAD_MASKS = [4, 2, 9, 5, 11]; // mask numbers around the gong
const WIN_PERFECT = 0.1, WIN_GOOD = 0.2;
// one clock for visuals and sound: the audio clock when sound is on, so rings and clicks stay phase-locked
const clock = () => (audio.enabled && audio.ctx ? audio.ctx.currentTime : performance.now() / 1000);

/** Chapter 08: the headline lands on the 88 BPM grid; the rhythm game is a ring around the gong that fills as you keep time. */
export function initBeat(reduced) {
  const section = document.getElementById('dance');
  const wrap = document.getElementById('padWrap');
  const pad = document.getElementById('pad');
  const gong = document.getElementById('padGong');
  const ring = document.getElementById('padMasks');
  const meter = wrap.querySelector('.pad-meter');
  const mFill = meter.querySelector('.pm-fill');
  const status = document.getElementById('padStatus');
  const C = 2 * Math.PI * 92;
  mFill.style.strokeDasharray = C; mFill.style.strokeDashoffset = C;

  // ── the headline lands on the beat: each word stomps in on a beat, with a tiny shake and a drum on the frame of impact
  const lines = gsap.utils.toArray('#h-beat .line');
  if (!reduced) {
    gsap.set(lines, { yPercent: 110 });
    const tl = gsap.timeline({ paused: true });
    lines.forEach((ln, i) => {
      tl.to(ln, { yPercent: 0, duration: INTERVAL * 0.45, ease: 'h.stomp' }, i * INTERVAL)
        .to('.beat-wrap', { y: 5, duration: 0.05, yoyo: true, repeat: 1, ease: 'none' }, i * INTERVAL + INTERVAL * 0.45)
        .call(() => audio.drum(96, 0.8), null, i * INTERVAL + INTERVAL * 0.45);
    });
    tl.from('.moves li', { x: 24, autoAlpha: 0, stagger: INTERVAL / 2, duration: 0.5, ease: 'h.reveal' }, 3 * INTERVAL);
    ScrollTrigger.create({ trigger: '#h-beat', start: 'top 72%', once: true, onEnter: () => tl.play() });
  }

  // ── masks on a ring around the gong
  const btns = PAD_MASKS.map((n, i) => {
    const m = masks[n - 1];
    const a = (-90 + i * 72) * (Math.PI / 180);
    const b = document.createElement('button');
    b.className = 'pad-mask'; b.type = 'button'; b.setAttribute('aria-label', `Play note ${i + 1}`);
    b.dataset.angle = String(-90 + i * 72);
    b.style.cssText = `--x:${50 + 38 * Math.cos(a)}%;--y:${50 + 38 * Math.sin(a)}%;--rot:${(i - 2) * 6}deg`;
    b.innerHTML = `<img src="${m.small}" alt="" width="${m.w}" height="${m.h}" loading="lazy" decoding="async">`;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); hitMask(i, b); });
    b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hitMask(i, b); } });
    ring.appendChild(b); return b;
  });

  let happy = 0, running = false, t0 = 0, lastBeatIdx = -1, streak = 0, celebrated = false, lastTapT = clock(), onScreen = false;
  const setMeter = () => {
    gsap.to(mFill, { strokeDashoffset: C * (1 - happy / 100), duration: 0.35, ease: 'h.reveal', overwrite: 'auto' });
    meter.setAttribute('aria-valuenow', Math.round(happy));
  };
  const say = (t) => { status.textContent = t; };

  function shock(scale = 1.25) {
    const el = Object.assign(document.createElement('i'), { className: 'shock' });
    pad.appendChild(el);
    gsap.fromTo(el, { scale: 0.5, opacity: 0.9 }, { scale, opacity: 0, duration: 0.5, ease: 'h.reveal', onComplete: () => el.remove() });
  }
  function hitMask(i, b) {
    audio.pluck(i, 0, 0.9);
    b.classList.add('is-hit'); setTimeout(() => b.classList.remove('is-hit'), 130);
  }
  const offsetToBeat = (now) => Math.abs(now - (t0 + Math.round((now - t0) / INTERVAL) * INTERVAL));

  function hitGong() {
    const now = clock();
    lastTapT = now;
    gong.classList.add('is-hit'); setTimeout(() => gong.classList.remove('is-hit'), 110);
    audio.drum(96, 1); if (audio.enabled) audio.gong(98, 0.35);
    shock();
    if (!running) { running = true; t0 = now + INTERVAL; say('Here we go. Tap on every pulse.'); return; }
    const off = offsetToBeat(now);
    if (off <= WIN_PERFECT) {
      happy = Math.min(100, happy + 12); streak++; say(streak > 3 ? `Perfect. ×${streak}` : 'Perfect.');
      gsap.fromTo('.pad-gong-disc', { filter: 'brightness(1.5)' }, { filter: 'brightness(1)', duration: 0.18, ease: 'none' });
      // the mask nearest the top bobs
      gsap.fromTo(btns[Math.floor(Math.random() * btns.length)], { y: -6 }, { y: 0, duration: 0.4, ease: 'h.stomp' });
    } else if (off <= WIN_GOOD) { happy = Math.min(100, happy + 6); streak++; say('Good.'); }
    else { happy = Math.max(0, happy - 7); streak = 0; say('Off the beat. Listen for the pulse.'); }
    setMeter();
    if (happy >= 100 && !celebrated) celebrate();
  }

  // payoff: the masks circle the gong (literally "Circle.") and stomp on beats 1 and 3
  function celebrate() {
    celebrated = true; say('You kept the beat.');
    audio.gong(82, 1); audio.pluck(4, 1, 1); setTimeout(() => audio.pluck(2, 1, 1), 160); setTimeout(() => audio.pluck(0, 2, 1), 320);
    if (!reduced) {
      const t = gsap.timeline();
      t.to(ring, { rotation: 360, duration: INTERVAL * 4, ease: 'none', transformOrigin: '50% 50%' }, 0)
        .to(btns, { rotation: -360, duration: INTERVAL * 4, ease: 'none' }, 0)
        .fromTo(btns, { scale: 1 }, { scale: 1.22, duration: 0.12, ease: 'h.stomp', yoyo: true, repeat: 1 }, 0)
        .fromTo(btns, { scale: 1 }, { scale: 1.22, duration: 0.12, ease: 'h.stomp', yoyo: true, repeat: 1 }, INTERVAL * 2)
        .set(ring, { rotation: 0 }).set(btns, { rotation: (i) => (i - 2) * 6 });
    }
    setTimeout(() => { celebrated = false; }, 6000);
  }

  gong.addEventListener('pointerdown', (e) => { e.preventDefault(); hitGong(); });
  gong.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hitGong(); } });
  addEventListener('keydown', (e) => { if (!onScreen) return; const n = '12345'.indexOf(e.key); if (n >= 0) hitMask(n, btns[n]); });

  // the metronome only ticks while the pad is visible
  ScrollTrigger.create({ trigger: wrap, start: 'top 85%', end: 'bottom 15%', onToggle: (s) => { onScreen = s.isActive; if (!s.isActive) running = false; } });
  gsap.ticker.add(() => {
    if (!onScreen || reduced) return;
    const now = clock();
    if (!running) {
      const idx = Math.floor(now / INTERVAL);
      if (idx !== lastBeatIdx) { lastBeatIdx = idx; pulse(false); }
      return;
    }
    const idx = Math.floor((now - t0) / INTERVAL);
    if (idx !== lastBeatIdx) {
      lastBeatIdx = idx; pulse(true);
      if (happy > 0) { happy = Math.max(0, happy - 0.9); setMeter(); }
      if (idx > 10 && now - lastTapT > INTERVAL * 8) { running = false; say('The gong waits. Tap to start again.'); }
    }
  });
  function pulse(loud) {
    pad.classList.remove('is-beat'); void pad.offsetWidth; pad.classList.add('is-beat');
    if (loud && audio.enabled) audio.tick(380, 0.8);
  }
}

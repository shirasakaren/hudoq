import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';
import { masks } from '../data/masks.js';

const BPM = 88, INTERVAL = 60 / BPM;
const PAD_MASKS = [4, 2, 9, 5, 11]; // mask numbers around the gong
const WIN_PERFECT = 0.1, WIN_GOOD = 0.2;

/** Chapter 08: keep the rice spirit happy by tapping the gong on the beat. */
export function initBeat(reduced) {
  const wrap = document.getElementById('padWrap');
  const pad = document.getElementById('pad');
  const gong = document.getElementById('padGong');
  const ring = document.getElementById('padMasks');
  const meter = wrap.querySelector('.meter');
  const status = document.getElementById('padStatus');
  const fill = meter.querySelector('i');

  // masks on a ring
  const btns = PAD_MASKS.map((n, i) => {
    const m = masks[n - 1];
    const a = (-90 + i * 72) * (Math.PI / 180);
    const b = document.createElement('button');
    b.className = 'pad-mask'; b.type = 'button'; b.setAttribute('aria-label', `Play note ${i + 1}`);
    b.style.cssText = `--x:${50 + 38 * Math.cos(a)}%;--y:${50 + 38 * Math.sin(a)}%;--rot:${(i - 2) * 6}deg`;
    b.innerHTML = `<img src="${m.small}" alt="" width="${m.w}" height="${m.h}" loading="lazy" decoding="async">`;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); hitMask(i, b); });
    b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hitMask(i, b); } });
    ring.appendChild(b); return b;
  });

  let happy = 0, running = false, t0 = 0, lastBeatIdx = -1, streak = 0, celebrated = false;
  const setMeter = () => { fill.style.setProperty('--m', happy.toFixed(0)); fill.parentElement.style.setProperty('--m', happy.toFixed(0)); meter.setAttribute('aria-valuenow', Math.round(happy)); };
  const say = (t) => { status.textContent = t; };

  function hitMask(i, b) {
    audio.pluck(i, 0, 0.9);
    b.classList.add('is-hit'); setTimeout(() => b.classList.remove('is-hit'), 130);
  }

  function offsetToBeat(now) {
    const k = Math.round((now - t0) / INTERVAL);
    return Math.abs(now - (t0 + k * INTERVAL));
  }

  function hitGong() {
    const now = performance.now() / 1000;
    gong.classList.add('is-hit'); setTimeout(() => gong.classList.remove('is-hit'), 110);
    audio.drum(96, 1); if (audio.enabled) audio.gong(98, 0.35);
    if (!running) { running = true; t0 = now + INTERVAL; say('Here we go. Tap on every pulse.'); return; }
    const off = offsetToBeat(now);
    if (off <= WIN_PERFECT) { happy = Math.min(100, happy + 12); streak++; say(streak > 3 ? `Perfect. ×${streak}` : 'Perfect.'); }
    else if (off <= WIN_GOOD) { happy = Math.min(100, happy + 6); streak++; say('Good.'); }
    else { happy = Math.max(0, happy - 7); streak = 0; say('Off the beat. Listen for the pulse.'); }
    setMeter();
    if (happy >= 100 && !celebrated) {
      celebrated = true; say('The rice spirit stays in the field.');
      audio.gong(82, 1); audio.pluck(4, 1, 1); setTimeout(() => audio.pluck(2, 1, 1), 160); setTimeout(() => audio.pluck(0, 2, 1), 320);
      btns.forEach((b, i) => gsap.fromTo(b, { rotate: -12 }, { rotate: 0, duration: 1.4, ease: 'elastic.out(1, .35)', delay: i * 0.06 }));
      gsap.fromTo(pad, { scale: 1 }, { scale: 1.04, yoyo: true, repeat: 3, duration: 0.18 });
      setTimeout(() => { celebrated = false; }, 6000);
    }
  }
  gong.addEventListener('pointerdown', (e) => { e.preventDefault(); hitGong(); });
  gong.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hitGong(); } });
  // number keys play the masks while the pad is on screen
  let onScreen = false;
  addEventListener('keydown', (e) => {
    if (!onScreen) return;
    const n = '12345'.indexOf(e.key);
    if (n >= 0) hitMask(n, btns[n]);
  });

  // the metronome only ticks while the pad is visible
  ScrollTrigger.create({ trigger: wrap, start: 'top 85%', end: 'bottom 15%', onToggle: (s) => { onScreen = s.isActive; if (!s.isActive) { running = false; happy = Math.max(0, happy); } } });
  gsap.ticker.add(() => {
    if (!onScreen || reduced) return;
    const now = performance.now() / 1000;
    if (!running) {
      // idle pulse so the invitation is visible before the first tap
      const idx = Math.floor(now / INTERVAL);
      if (idx !== lastBeatIdx) { lastBeatIdx = idx; pulse(false); }
      return;
    }
    const idx = Math.floor((now - t0) / INTERVAL);
    if (idx !== lastBeatIdx) {
      lastBeatIdx = idx; pulse(true);
      if (happy > 0) { happy = Math.max(0, happy - 0.9); setMeter(); }
      if (idx > 10 && now - lastTap() > INTERVAL * 8) { running = false; say('The rice spirit waits. Tap to start again.'); }
    }
  });
  let lastTapT = performance.now() / 1000; gong.addEventListener('pointerdown', () => { lastTapT = performance.now() / 1000; });
  const lastTap = () => lastTapT;
  function pulse(loud) {
    pad.classList.remove('is-beat'); void pad.offsetWidth; pad.classList.add('is-beat');
    if (loud && audio.enabled) audio.tick(380, 0.8);
  }
  setMeter();
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';

/** Chapter rail, full-screen menu, header label, progress bar, sound + motion toggles. */
export function initNav(lenis) {
  const chapters = [...document.querySelectorAll('section.chapter[data-chapter]')].filter((s) => s.id !== 'finale');
  const rail = document.getElementById('rail');
  const menu = document.getElementById('menu');
  const menuList = document.getElementById('menuList');
  const menuBtn = document.getElementById('menuBtn');
  const bn = document.querySelector('.bar-chapter-n'), bt = document.querySelector('.bar-chapter-t');

  chapters.forEach((s) => {
    const a = document.createElement('a');
    a.href = `#${s.id}`; a.innerHTML = `<span>${s.dataset.chapter} · ${s.dataset.title}</span><i></i>`;
    a.setAttribute('aria-label', `${s.dataset.chapter} ${s.dataset.title}`);
    rail.appendChild(a);
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${s.id}"><small>${s.dataset.chapter}</small>${s.dataset.title}</a>`;
    menuList.appendChild(li);
  });
  const links = [...rail.querySelectorAll('a')];
  const SCENES = { top: 'hero', what: 'word', where: 'river', why: 'rice', legend: 'legend', faces: 'dark', mask: 'lab', suit: 'lab', dance: 'beat', then: 'then', now: 'now', care: 'care' };
  let sceneName = 'hero';
  audio.onChange((on) => { if (on) { audio._scene = null; audio.scene(sceneName); } });

  chapters.forEach((s, i) => {
    ScrollTrigger.create({
      trigger: s, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => {
        if (!self.isActive) return;
        const label = document.querySelector('.bar-chapter');
        gsap.fromTo(label, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 0.85, duration: 0.6, ease: 'h.reveal', overwrite: 'auto' });
        bn.textContent = s.dataset.chapter; bt.textContent = s.dataset.title;
        sceneName = SCENES[s.id] || 'hero'; audio.scene(sceneName);
        links.forEach((l, j) => { l.classList.toggle('is-active', j === i); if (j === i) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
      },
    });
  });

  // header: hides while reading downward, returns on scroll-up or after a short idle
  const bar = document.querySelector('.bar');
  let idle = 0;
  lenis.on('scroll', ({ direction, scroll }) => {
    if (open) return;
    const hide = direction > 0 && scroll > 240 && !bar.contains(document.activeElement);
    gsap.to(bar, { yPercent: hide ? -110 : 0, duration: hide ? 0.45 : 0.6, ease: hide ? 'h.exit' : 'h.reveal', overwrite: 'auto' });
    clearTimeout(idle); idle = setTimeout(() => gsap.to(bar, { yPercent: 0, duration: 0.6, ease: 'h.reveal', overwrite: 'auto' }), 1400);
  });

  bar.addEventListener('focusin', () => gsap.to(bar, { yPercent: 0, duration: 0.4, ease: 'h.reveal', overwrite: 'auto' }));
  // the finale has its own header label (no rail entry)
  const fin = document.getElementById('finale');
  if (fin) ScrollTrigger.create({ trigger: fin, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { if (s.isActive) { bn.textContent = '—'; bt.textContent = 'Finale'; } } });

  // sound-bed breathing
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => audio.breathe(self.progress) });

  // menu
  let open = false;
  const items = () => menuList.querySelectorAll('li');
  function setMenu(v) {
    if (v === open) return;
    open = v;
    menuBtn.setAttribute('aria-expanded', v);
    if (v) {
      menu.hidden = false; lenis.stop();
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'h.move' });
      gsap.fromTo(items(), { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'h.reveal', stagger: 0.04, delay: 0.25 });
      menu.querySelector('a').focus({ preventScroll: true });
    } else {
      gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.7, ease: 'h.move', onComplete: () => { menu.hidden = true; lenis.start(); } });
    }
  }
  menuBtn.addEventListener('click', () => setMenu(!open));
  menuList.addEventListener('click', (e) => { if (e.target.closest('a')) { lenis.start(); setMenu(false); } });
  addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { setMenu(false); menuBtn.focus(); return; }
    if (e.key === 'Tab') { // keep focus inside the open menu
      const f = [...menu.querySelectorAll('a'), menuBtn];
      const i = f.indexOf(document.activeElement);
      const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
      f[n].focus(); e.preventDefault();
    }
  });

  // sound toggle
  const soundBtn = document.getElementById('soundBtn');
  const label = soundBtn.querySelector('.sound-label');
  const sync = (on) => { soundBtn.setAttribute('aria-pressed', on); soundBtn.setAttribute('aria-label', on ? 'Sound on. Click to mute.' : 'Sound off. Click to turn on.'); label.textContent = on ? 'Sound on' : 'Sound off'; };
  audio.onChange(sync); sync(audio.enabled);
  soundBtn.addEventListener('click', () => { audio.toggle(); });

  // motion toggle (persists, reloads so every module picks it up)
  const motionBtn = document.getElementById('motionBtn');
  const reduced = document.documentElement.dataset.motion === 'reduced';
  motionBtn.setAttribute('aria-pressed', reduced);
  motionBtn.addEventListener('click', () => {
    try { localStorage.setItem('hudoq-motion', reduced ? 'full' : 'reduced'); } catch (_) {}
    location.reload();
  });
}

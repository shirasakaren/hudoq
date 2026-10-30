import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';
import { D } from './motion.js';
import { imageReveal, lineRise } from './reveal.js';

/** Chapter 10 details: odometer numbers, timeline years, bento reveals, finale spin. */
export function initNow(gl, reduced) {
  // odometer: each digit is a column 0–9 that rolls into place (more tactile than a count-up tween)
  document.querySelectorAll('[data-odo]').forEach((el) => {
    const final = el.textContent.trim();
    if (reduced) return;
    el.innerHTML = `<span class="sr-only">${final}</span>` + [...final].map((ch) => (/\d/.test(ch) ? `<span class="odo" aria-hidden="true"><span>${'0123456789'.split('').join('<br>')}</span></span>` : `<span aria-hidden="true">${ch}</span>`)).join('');
    const digits = [...final.replace(/\D/g, '')].map(Number);
    gsap.set(el.querySelectorAll('.odo > span'), { yPercent: 0 });
    gsap.to(el.querySelectorAll('.odo > span'), {
      yPercent: (i) => -10 * digits[i], duration: 1.8, ease: 'h.move', stagger: { each: 0.08, from: 'end' },
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  // the suit's single number counts up
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = end + suffix; return; }
    const o = { v: 0 }; el.textContent = '0' + suffix;
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'h.reveal', onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } }) });
  });

  if (!reduced) {
    // timeline: big outlined years fill when they arrive
    gsap.utils.toArray('.tl b').forEach((b) => {
      gsap.fromTo(b, { color: 'rgba(217,164,65,0)' }, { color: 'rgba(217,164,65,1)', ease: 'none', scrollTrigger: { trigger: b, start: 'top 85%', end: 'top 45%', scrub: true } });
    });
    // bento: frames wipe open in DOM order
    gsap.utils.toArray('.bento figure').forEach((f, i) => { if (!f.classList.contains('bento-e')) imageReveal(f, { delay: (i % 3) * 0.08 }); });
  }

}

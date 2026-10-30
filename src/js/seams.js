import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';

/**
 * The seam map. Each chapter hand-off is its own device (not one repeated zig-zag):
 *   fringe curtain  — leaf strips tipped like the tumpal triangle, closing then parting, used at three act breaks
 *   overlap stack   — the next chapter slides over the last (paper over ink)
 * Others are bespoke: the loader match-cut, "through the O", the legend's descent to black, the projector leader,
 * the return to colour, the finale's ember dissolve.
 */
export function initSeams(reduced) {
  if (reduced) return;

  // one shared curtain: 14 strips, each ending in a point
  const curtain = document.createElement('div');
  curtain.className = 'curtain'; curtain.setAttribute('aria-hidden', 'true');
  curtain.innerHTML = '<i></i>'.repeat(8);
  document.body.appendChild(curtain);
  const strips = [...curtain.children];

  // timed (about a second), not scrubbed: it can never be left half-closed across the text
  const fringe = (toId, color, { from = 'center', tempo = false } = {}) => {
    const sec = document.getElementById(toId);
    if (!sec) return;
    const each = tempo ? 60 / 88 / 4 : 0.05;
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'h.move' } })
      .set(curtain, { visibility: 'visible', '--curtain': color })
      .fromTo(strips, { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1.08, duration: 0.45, stagger: { each, from } })
      .add(() => audio.swell(0.9), '>-0.1')
      .set(strips, { transformOrigin: '50% 100%' })
      .to(strips, { scaleY: 0, duration: 0.45, stagger: { each, from: 'edges' } }, '+=0.04')
      .set(curtain, { visibility: 'hidden' });
    ScrollTrigger.create({
      trigger: sec, start: 'top 78%',
      onEnter: () => tl.restart(), onEnterBack: () => { if (!tl.isActive()) tl.restart(); },
    });
  };

  fringe('where', '#070d0a');                     // into the forest
  fringe('suit', '#2a211b');                      // the lab to the costume
  fringe('dance', '#230b08', { tempo: true });    // the suit to the beat, on tempo
  fringe('finale', '#0e0b09');                    // the care to the finale

  // Now → Care: the paper chapter slides up over the ink one, its top corners squaring off as it lands
  const care = document.getElementById('care'), now = document.getElementById('now');
  if (care && now) {
    const dim = Object.assign(document.createElement('i'), { className: 'stack-dim' });
    dim.setAttribute('aria-hidden', 'true'); now.appendChild(dim);
    care.style.position = 'relative'; care.style.zIndex = 2;
    gsap.timeline({ scrollTrigger: { trigger: care, start: 'top bottom', end: 'top top', scrub: 0.5 } })
      .fromTo(care, { borderTopLeftRadius: '2.4rem', borderTopRightRadius: '2.4rem' }, { borderTopLeftRadius: '0rem', borderTopRightRadius: '0rem', ease: 'none' }, 0)
      .fromTo(dim, { opacity: 0 }, { opacity: 0.6, ease: 'none' }, 0);
  }
}

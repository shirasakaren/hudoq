import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { audio } from '../audio.js';

/** Finale: "The spirit leaves." The mask turns to face you, then burns to embers while "Still theirs." holds alone. */
export function initFinale(gl, lenis, reduced, L = 1) {
  const section = document.getElementById('finale');
  const again = document.getElementById('danceAgain');
  const word = document.querySelector('.foot-word');
  const grid = document.querySelector('.foot-grid');

  again.addEventListener('click', () => lenis.scrollTo(0, { duration: reduced ? 0.01 : 2.6, easing: (t) => 1 - Math.pow(1 - t, 4) }));

  if (!reduced && gl) {
    const st = gl.state, U = gl.uniforms;
    let gonged = false;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.fromTo(st, { extraYaw: 0.6, extraPitch: 0.15 }, { extraYaw: 0, extraPitch: 0, duration: 0.25 }, 0)
      .fromTo(st.lab, { rim: 0 }, { rim: 1.1, duration: 0.15 }, 0)
      .to(st.lab, { rim: 0.5, duration: 0.1 }, 0.15)
      .fromTo(U.uDissolve, { value: 0 }, { value: 1, duration: 0.55 }, 0.35)
      .to('.finale-title .still', { opacity: 0.4, duration: 0.1 }, 0.9)
      .to({}, { duration: 0.1 }, 0.9);
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: () => '+=' + Math.round(innerHeight * 1.4 * L), pin: true, scrub: 0.6, anticipatePin: 1,
      animation: tl, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        st.emberMode = p > 0.34 && p < 0.96 ? 'burn' : 'ambient';
        gl.setWind(Math.max(0, (p - 0.35) / 0.55) * 3);
        if (p > 0.36 && !gonged) { gonged = true; audio.gong(110, 0.4); }
        if (p < 0.3) gonged = false;
      },
      onLeaveBack: () => { st.emberMode = 'ambient'; gl.setWind(0); },
    });
  }

  // footer: the outlined word fills from the bottom like the loader did; the grid slides up under the finale
  if (!reduced) {
    gsap.to(word, { backgroundPosition: '0 100%', ease: 'none', scrollTrigger: { trigger: word, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
    gsap.fromTo(grid, { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'top 30%', scrub: true } });
  } else gsap.set(word, { backgroundPosition: '0 100%' });
}

/** Videos load and play only when near the viewport, and pause when they leave. */
export function initLazyVideos(reduced) {
  const vids = document.querySelectorAll('video[data-lazy-video]');
  if (reduced) return; // reduced motion: posters only
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; if (v.dataset.start) v.addEventListener('loadedmetadata', () => { v.currentTime = +v.dataset.start; }, { once: true }); }
        const p = v.play(); if (p) p.catch(() => {});
      } else if (v.src) v.pause();
    });
  }, { rootMargin: '25% 0px' });
  vids.forEach((v) => io.observe(v));
}

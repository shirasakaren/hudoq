/** Videos load and play only when near the viewport, and pause when they leave. */
export function initLazyVideos(reduced) {
  const vids = document.querySelectorAll('video[data-lazy-video]');
  if (reduced) return; // reduced motion: posters only
  const phone = matchMedia('(max-width: 900px)').matches;
  const playing = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; if (v.dataset.start) v.addEventListener('loadedmetadata', () => { v.currentTime = +v.dataset.start; }, { once: true }); }
        if (phone) { playing.forEach((o) => { if (o !== v) o.pause(); }); playing.clear(); playing.add(v); } // phones decode one video at a time
        const p = v.play(); if (p) p.catch(() => {});
      } else if (v.src) { v.pause(); playing.delete(v); }
    });
  }, { rootMargin: phone ? '0px' : '25% 0px' });
  vids.forEach((v) => io.observe(v));
}

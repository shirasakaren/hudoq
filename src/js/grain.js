/** Page-wide film grain: one small noise tile generated at runtime (no asset), jittered with CSS. */
export function initGrain() {
  const el = document.querySelector('.grain');
  if (!el) return;
  const c = document.createElement('canvas');
  c.width = c.height = 220;
  const g = c.getContext('2d');
  const img = g.createImageData(220, 220);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  el.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
}

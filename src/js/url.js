// Public assets live at the site base (/ in dev, /hudoq/ on GitHub Pages).
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const asset = (p) => (p.startsWith('/') ? base + p : p);

// Builds SVG path data for the Borneo map from public GeoJSON (Natural Earth + Indonesian province boundaries).
// Usage: node scripts/map.mjs <geo-dir>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const dir = process.argv[2];
const land = JSON.parse(readFileSync(`${dir}/ne_10m_land.geojson`));
const prov = JSON.parse(readFileSync(`${dir}/indonesia-prov.geojson`));
const riv = JSON.parse(readFileSync(`${dir}/ne_10m_rivers_lake_centerlines.geojson`));

const BOX = { w: 108.9, e: 119.4, s: -4.3, n: 7.5 }; // Borneo
const W = 1000;
const kx = Math.cos(1.5 * Math.PI / 180);            // mild equirectangular correction
const H = Math.round(W * ((BOX.n - BOX.s) / ((BOX.e - BOX.w) * kx)));
const px = ([lon, lat]) => [((lon - BOX.w) / (BOX.e - BOX.w)) * W, ((BOX.n - lat) / (BOX.n - BOX.s)) * H];

function dp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)];
  let dmax = 0, idx = 0;
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) return [...dp(pts.slice(0, idx + 1), eps).slice(0, -1), ...dp(pts.slice(idx), eps)];
  return [a, b];
}
const inBox = (ring) => ring.some(([x, y]) => x > BOX.w && x < BOX.e && y > BOX.s && y < BOX.n);
const path = (rings, eps, close = true) => rings.map((r) => {
  const pts = r.map(px);
  // closed rings degenerate in Douglas-Peucker (start == end), so simplify each half separately
  const mid = close ? Math.floor(pts.length / 2) : 0;
  const p = close ? [...dp(pts.slice(0, mid + 1), eps).slice(0, -1), ...dp(pts.slice(mid), eps)] : dp(pts, eps);
  return 'M' + p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + (close ? 'Z' : '');
}).join('');
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

// Borneo outline: the big polygon whose bbox sits inside BOX.
const island = [];
for (const f of land.features) for (const poly of polys(f.geometry)) {
  const ring = poly[0];
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  if (Math.min(...xs) > BOX.w - 0.5 && Math.max(...xs) < BOX.e + 0.5 && Math.min(...ys) > BOX.s - 0.5 && Math.max(...ys) < BOX.n + 0.5 && ring.length > 400) island.push(ring);
}
const kal = {};
for (const f of prov.features) {
  const name = f.properties.Propinsi;
  if (!/^KALIMANTAN/.test(name)) continue;
  kal[name] = path(polys(f.geometry).filter((p) => inBox(p[0])).map((p) => p[0]), 0.9);
}
const mahakam = riv.features.filter((f) => f.properties.name === 'Mahakam').flatMap((f) =>
  f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates]);
const pt = (lon, lat) => px([lon, lat]).map((v) => +v.toFixed(1));
const out = {
  w: W, h: H,
  island: path(island, 0.7),
  provinces: kal,
  mahakam: path(mahakam, 0.35, false),
  places: {
    samarinda: pt(117.15, -0.5), tenggarong: pt(116.98, -0.42), melak: pt(115.88, -0.2),
    longbagun: pt(114.55, 0.75), ikn: pt(116.7, -0.97), tanjungisuy: pt(116.35, -0.4),
  },
};
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/map.json', JSON.stringify(out));
console.log('map', W, H, 'island rings', island.length, 'prov', Object.keys(kal), 'mahakam segs', mahakam.length, JSON.stringify(out).length, 'bytes');

// Trims + web-encodes the background-removed PNGs from scripts/cutouts.py into public/img/cut and adds them to the manifest.
// Usage: node scripts/cutouts.mjs <dir-with-pngs>
import sharp from 'sharp';
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const dir = process.argv[2];
const keep = ['r4', 'r1', 'r2', 'c1', 'c5', 'b3', 'c4', 'b10', 'd2', 'd4', 'd7', 'd11', 'd6'];
const out = 'public/img/cut';
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile('src/data/media.json', 'utf8'));
for (const id of keep) {
  const f = (await readdir(dir)).find((n) => n.endsWith(`_${id}.png`));
  if (!f) { console.log('missing', id); continue; }
  const buf = await sharp(join(dir, f)).trim({ threshold: 8 }).resize({ height: 1300, withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 92, effort: 5 }).toBuffer({ resolveWithObject: true });
  await writeFile(join(out, `${id}.webp`), buf.data);
  manifest[`cut/${id}`] = { w: buf.info.width, h: buf.info.height, ratio: +(buf.info.width / buf.info.height).toFixed(4), sizes: [{ w: buf.info.width, h: buf.info.height, src: `/img/cut/${id}.webp` }] };
}
await writeFile('src/data/media.json', JSON.stringify(manifest, null, 1));
console.log('cutouts done');

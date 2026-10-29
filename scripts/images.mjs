// Builds web-ready images + a manifest (size, lqip, average colour) from media/.
// Usage: node scripts/images.mjs
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';

const SRC = 'media';
const OUT = 'public/img';
const manifest = {};

const jobs = [
  { dir: 'photo', out: 'photo', widths: [720, 1600], q: 78 },
  { dir: 'figure', out: 'figure', widths: [720, 1400], q: 80 },
  { dir: 'masks', out: 'masks', widths: [520, 1000], q: 86, alpha: true, byHeight: true },
  { dir: 'modern/Miss Supranational 2018', out: 'modern', widths: [720, 1080], q: 80, prefix: 'sup-' },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const job of jobs) {
  const inDir = join(SRC, job.dir);
  const outDir = join(OUT, job.out);
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(inDir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  // d8.jpeg and d8.webp share a stem; keep the larger by suffixing the extension
  const stems = files.map((f) => parse(f).name);
  for (const f of files) {
    const { name, ext } = parse(f);
    const dup = stems.filter((s) => s === name).length > 1;
    const id = (job.prefix || '') + slug(name) + (dup ? '-' + ext.slice(1).toLowerCase() : '');
    const img = sharp(join(inDir, f), { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    const key = `${job.out}/${id}`;
    const sizes = [];
    for (const w of job.widths) {
      const base = job.byHeight ? Math.round((w * meta.width) / meta.height) : w;
      const target = Math.min(base, meta.width);
      const file = `${id}-${w}.webp`;
      let p = sharp(join(inDir, f), { failOn: 'none' }).rotate();
      p = job.byHeight
        ? p.resize({ height: Math.min(w, meta.height), withoutEnlargement: true })
        : p.resize({ width: target, withoutEnlargement: true });
      const info = await p.webp({ quality: job.q, alphaQuality: 90, effort: 5 }).toFile(join(outDir, file));
      sizes.push({ w: info.width, h: info.height, src: `/img/${job.out}/${file}` });
    }
    const tiny = await sharp(join(inDir, f), { failOn: 'none' }).rotate().resize(16).blur(0.5).webp({ quality: 40 }).toBuffer();
    const stats = await sharp(join(inDir, f), { failOn: 'none' }).rotate().resize(8).removeAlpha().stats();
    const [r, g, b] = stats.channels.map((c) => Math.round(c.mean));
    manifest[key] = {
      w: sizes.at(-1).w,
      h: sizes.at(-1).h,
      ratio: +(sizes.at(-1).w / sizes.at(-1).h).toFixed(4),
      color: `rgb(${r},${g},${b})`,
      lqip: 'data:image/webp;base64,' + tiny.toString('base64'),
      sizes,
    };
  }
}
await mkdir('src/data', { recursive: true });
await writeFile('src/data/media.json', JSON.stringify(manifest, null, 1));
console.log(Object.keys(manifest).length, 'images processed');

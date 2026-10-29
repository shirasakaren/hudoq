// Deletes generated images in public/img that nothing references, and trims the manifest to match.
// (Run after scripts/images.mjs + scripts/cutouts.mjs. Uses: node scripts/prune-images.mjs)
import { readFileSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('src/data/media.json', 'utf8'));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const text = [readFileSync('index.html', 'utf8'), ...walk('src').filter((f) => /\.(js|css)$/.test(f)).map((f) => readFileSync(f, 'utf8'))].join('\n');

const keep = new Set();
for (const m of text.matchAll(/data-img="([^"]+)"/g)) keep.add(m[1]);
for (let i = 1; i <= 11; i++) keep.add(`masks/${i}`); // masks.js builds these dynamically
for (const [k, v] of Object.entries(manifest)) if (v.sizes.some((s) => text.includes(s.src))) keep.add(k);

const keepFiles = new Set();
for (const k of keep) for (const s of manifest[k]?.sizes ?? []) keepFiles.add('public' + s.src);
let removed = 0, freed = 0;
for (const f of walk('public/img')) {
  if (!keepFiles.has(f)) { freed += statSync(f).size; rmSync(f); removed++; }
}
for (const k of Object.keys(manifest)) if (!keep.has(k)) delete manifest[k];
writeFileSync('src/data/media.json', JSON.stringify(manifest, null, 1));
console.log(`kept ${keep.size} images, removed ${removed} files (${(freed / 1e6).toFixed(1)} MB)`);

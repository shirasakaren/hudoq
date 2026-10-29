import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Expands <img data-img="photo/b3"> into a complete tag (src, srcset, intrinsic size, blur-up placeholder)
// using the manifest written by scripts/images.mjs. Keeps the HTML readable and the output CLS-free.
function mediaImages() {
  let base = '/';
  const SITE = process.env.SITE_URL || 'https://shirasakaren.github.io/hudoq/';
  const load = () => JSON.parse(readFileSync(new URL('./src/data/media.json', import.meta.url), 'utf8'));
  return {
    name: 'hudoq-media-images',
    configResolved(cfg) { base = cfg.base.endsWith('/') ? cfg.base : cfg.base + '/'; },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const manifest = load();
        const B = base.replace(/\/$/, '');
        html = html.replace(/(url\()\/(fonts)/g, `$1${B}/$2`).replace(/(\s(?:href|src|poster|data-src|content)=")\/(video|fonts|models|img|og\.jpg)/g, `$1${B}/$2`).replace(/__SITE_URL__/g, SITE);
        return html.replace(/<img\b([^>]*?)\sdata-img="([^"]+)"([^>]*?)>/g, (m, pre, key, post) => {
          const e = manifest[key];
          if (!e) throw new Error(`media manifest has no "${key}"`);
          const sizes = e.sizes;
          const largest = sizes[sizes.length - 1];
          const uniq = [...new Map(sizes.map((s) => [s.w, s])).values()];
          const srcset = uniq.map((s) => `${B}${s.src} ${s.w}w`).join(', ');
          const style = e.lqip ? ` style="background:${e.color || '#222'} url(${e.lqip}) center/cover"` : '';
          const hasSizes = /\ssizes=/.test(pre + post);
          return `<img${pre}${post} src="${B}${largest.src}" srcset="${srcset}"${hasSizes ? '' : ' sizes="100vw"'} width="${largest.w}" height="${largest.h}"${style} decoding="async">`;
        });
      },
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [mediaImages()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: { main: new URL('./index.html', import.meta.url).pathname, notFound: new URL('./404.html', import.meta.url).pathname },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap')) return 'gsap';
        },
      },
    },
  },
});

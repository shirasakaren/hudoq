# Hudoq — a Dayak mask dance of Borneo

A one-page, scroll-driven, interactive story about **Hudoq**, the Dayak mask ritual of East Kalimantan.
Short words, real facts, a real 3D mask, archive film and a synthesised soundscape.

**Chapters:** Intro ("Through the O") · The word · The river (map journey) · The rice · The legend (a descent) · The faces (lantern room + gallery) · The mask (3D light study) · The suit · The beat (rhythm game) · Then (archive projector → return to colour) · Now · The care · Finale (the spirit leaves).

## Live site & deploy

Pushes to `main` build and publish automatically (`.github/workflows/deploy.yml`):
the workflow builds with `BASE_PATH=/hudoq/`, publishes `dist/` to the `gh-pages` branch, and also uploads a Pages artifact for the "GitHub Actions" source.
**One-time setup:** repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → `gh-pages` / `(root)`** (or choose "GitHub Actions" — both paths are wired).
Live at **https://shirasakaren.github.io/hudoq/**.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/
npm run preview
```

Node 20+. The media in `media/` is stored with Git LFS (3D model, one video); the site only needs the optimised copies already committed in `public/`.

## How it is built

| Piece | Tech |
|---|---|
| Bundler | Vite |
| Motion | GSAP (ScrollTrigger, SplitText, DrawSVG, MotionPath, CustomEase, Observer) + Lenis smooth scroll. One motion grammar (`src/js/motion.js`): `h.reveal` arrives, `h.move` travels, `h.exit` leaves, `h.stomp` lands on the beat |
| 3D | three.js — one fixed canvas; the mask follows `[data-mask-anchor]` elements, so it travels with the page. A shader patch gives it a gong-reactive rim light and an ember dissolve (loader match-cut, finale); leaves are animated entirely on the GPU |
| Sound | WebAudio, synthesised in the browser (rainforest bed with per-chapter scenes, gong, drum, plucked string). Off until the visitor chooses; never recordings of Hudoq music. |
| Type | Fraunces (display), Instrument Sans (text), JetBrains Mono (labels) — all SIL OFL, self-hosted |
| Map | Real geodata (Natural Earth + Indonesian province boundaries) turned into SVG by `scripts/map.mjs` |

### Accessibility & performance
Semantic landmarks, skip link, visible focus, keyboard control for every interaction (gallery arrows, 3D mask arrows, gong on Space/Enter, number keys for masks),
`prefers-reduced-motion` **and** a manual Motion toggle (swaps pinned scenes for static layouts), muted lazy video, blur-up image placeholders,
meshopt-compressed 2 MB mask, adaptive pixel-ratio on slow GPUs. Nothing autoplays sound.

## Asset pipeline (`scripts/`)

| Script | Does |
|---|---|
| `images.mjs` | `media/` photos & masks → responsive WebP + `src/data/media.json` (size, blur-up, colour) |
| `cutouts.py` + `cutouts.mjs` | Background removal (BiRefNet via `rembg`) → trimmed WebP cut-outs |
| `video.sh` | Web-encodes clips (muted, faststart H.264, posters), cuts documentary b-roll |
| `map.mjs` | GeoJSON → SVG paths for the Borneo map |
| `prune-images.mjs` | Removes generated images nothing references |

The 3D mask (`public/models/hudoq-mask.glb`) was converted from the FBX with FBX2glTF, then simplified (~65k tris), WebP-textured (2048²) and meshopt-compressed with glTF-Transform.

## Content & credits

Facts were checked against primary and secondary sources (Nieuwenhuis' 1890s field notes, Yanti 2019, Max et al. 2025, ANTARA, WWF-Indonesia, Art of the Ancestors, UNESCO's lists). Where tellings differ, the page says so. Hudoq is **not** on UNESCO's lists; it is on Indonesia's national intangible heritage list (2013).
This is an outsider's summary: the communities who dance Hudoq should lead. Full credits are in the page footer. If you own a photograph and want credit or removal, open an issue.

The 3D mask was generated with Meshy AI from a photograph — a likeness, not a museum scan.

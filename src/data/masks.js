import media from './media.json';
import { asset } from '../js/url.js';

// Short, purely visual captions (no cultural claims) — what you can actually see in each carved mask.
const CAPTIONS = [
  ['Long snout, hanging earrings', '#4a2a1c'],
  ['Mirror eyes, ring earrings', '#3d2a22'],
  ['Bare wood, wing ears', '#3b3022'],
  ['Beak, wings, red zigzags', '#4a2420'],
  ['Feather crown, hair beard', '#2f2a2a'],
  ['Curling arms, ringed dots', '#3a2a1e'],
  ['Woven cap, round eyes', '#412b1d'],
  ['Dark face, long curling horns', '#2a2224'],
  ['Chalk-white, green lines', '#2c3426'],
  ['A very long beak', '#33291f'],
  ['Mirror eyes, hooked ears', '#40291e'],
];

export const masks = CAPTIONS.map(([caption, tint], i) => {
  const m = media[`masks/${i + 1}`];
  return {
    n: i + 1, caption, tint, ratio: m.ratio,
    small: asset(m.sizes[0].src), large: asset(m.sizes[m.sizes.length - 1].src),
    w: m.sizes[0].w, h: m.sizes[0].h,
  };
});

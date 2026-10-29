// The only place eases and durations are defined. Import this first.
//   ARRIVE  (text, images, UI)         h.reveal  — fast start, very long settle
//   TRAVEL  (camera, curtains, map)    h.move    — slow start, long settle
//   LEAVE   (exits, ~0.5× the entrance) h.exit
//   STOMP   (the Beat)                 h.stomp   — hard landing, 3% rebound
//   scrubbed tweens use ease:'none'.
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);
CustomEase.create('h.reveal', '0.16,1,0.3,1');
CustomEase.create('h.move', '0.7,0,0.12,1');
CustomEase.create('h.exit', '0.55,0,0.75,0.2');
CustomEase.create('h.stomp', 'M0,0 C0.25,0 0.3,1.08 0.5,1.03 0.7,0.99 0.85,1 1,1');

export const D = { tap: 0.25, exit: 0.45, ui: 0.6, reveal: 1.1, move: 1.4, scene: 1.8 };
export const S = { char: 0.018, word: 0.035, line: 0.085, item: 0.07, cap: 0.5 };
/** Forge-style cap: a staggered group never takes longer than S.cap seconds. */
export const stag = (n, per = S.item) => Math.min(per, S.cap / Math.max(1, n - 1));
export const scrub = { tight: 0.5, soft: 0.8 };
export const BPM = 88, BEAT = 60 / BPM;

gsap.defaults({ ease: 'h.reveal', duration: D.reveal });

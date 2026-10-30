// Procedural sound for the site. Nothing is downloaded: the rainforest bed, gong, drum and
// plucked-string voices are all synthesised with WebAudio, and the context only starts after a click.

const PENTA = [0, 2, 5, 7, 9]; // a gentle pentatonic, in semitones

class HudoqAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.master = null;
    this._birdTimer = 0;
    this._listeners = new Set();
    // no sound in a hidden tab
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else if (this.enabled) this.ctx.resume();
    });
  }

  onChange(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  _emit() { this._listeners.forEach((fn) => fn(this.enabled)); }

  _noise(seconds = 4, color = 'pink') {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'pink') {
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      } else if (color === 'brown') {
        last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5;
      } else d[i] = w;
    }
    return buf;
  }

  _init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // analyser: lets visuals breathe with the sound (rim light, sound icon, embers)
    this.an = ctx.createAnalyser(); this.an.fftSize = 256; this.an.smoothingTimeConstant = 0.55;
    comp.connect(this.an); this._bins = new Uint8Array(this.an.frequencyBinCount);

    // soft room: a short feedback delay used as cheap reverb for the gong and plucks
    this.verb = ctx.createGain(); this.verb.gain.value = 0.35;
    const dl = ctx.createDelay(1); dl.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.verb.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(this.master);

    // ambient bed: wind/rain (pink noise) + insects (band-passed noise with a fast tremolo)
    const wind = ctx.createBufferSource(); wind.buffer = this._noise(6, 'pink'); wind.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 520; wf.Q.value = 0.4;
    const wg = ctx.createGain(); wg.gain.value = 0.22;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 260;
    lfo.connect(lg).connect(wf.frequency); lfo.start();
    wind.connect(wf).connect(wg).connect(this.master); wind.start();
    this.windFilter = wf; this.windGain = wg;

    const bug = ctx.createBufferSource(); bug.buffer = this._noise(3, 'white'); bug.loop = true;
    const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 5200; bf.Q.value = 14;
    const bgain = ctx.createGain(); bgain.gain.value = 0.012;
    const trem = ctx.createOscillator(); trem.frequency.value = 38;
    const tg = ctx.createGain(); tg.gain.value = 0.012;
    trem.connect(tg).connect(bgain.gain); trem.start();
    bug.connect(bf).connect(bgain).connect(this.master); bug.start();
    this.bugGain = bgain;

    // low drone: two detuned sines, very quiet — the "floor" of the forest
    this.drones = [55, 55.4, 82.5].map((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.015 : 0.03;
      o.connect(g).connect(this.master); o.start(); return o;
    });

    // chapter beds, silent until a scene asks for them: water (river), crowd (now), projector (then)
    const water = ctx.createBufferSource(); water.buffer = this._noise(5, 'brown'); water.loop = true;
    const wbp = ctx.createBiquadFilter(); wbp.type = 'bandpass'; wbp.frequency.value = 380; wbp.Q.value = 0.7;
    this.waterGain = ctx.createGain(); this.waterGain.gain.value = 0;
    const wl = ctx.createOscillator(); wl.frequency.value = 0.13; const wlg = ctx.createGain(); wlg.gain.value = 0.04; wl.connect(wlg).connect(this.waterGain.gain); wl.start();
    water.connect(wbp).connect(this.waterGain).connect(this.master); water.start();
    const crowd = ctx.createBufferSource(); crowd.buffer = this._noise(5, 'pink'); crowd.loop = true;
    const cbp = ctx.createBiquadFilter(); cbp.type = 'bandpass'; cbp.frequency.value = 1100; cbp.Q.value = 0.5;
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0;
    crowd.connect(cbp).connect(this.crowdGain).connect(this.master); crowd.start();
    const proj = ctx.createBufferSource(); proj.buffer = this._noise(2, 'white'); proj.loop = true;
    const pbp = ctx.createBiquadFilter(); pbp.type = 'bandpass'; pbp.frequency.value = 1200; pbp.Q.value = 1.2;
    this.projGain = ctx.createGain(); this.projGain.gain.value = 0;
    const am = ctx.createOscillator(); am.type = 'square'; am.frequency.value = 22; const amg = ctx.createGain(); amg.gain.value = 0.5; am.connect(amg).connect(this.projGain.gain); am.start();
    proj.connect(pbp).connect(this.projGain).connect(this.master); proj.start();
  }

  async enable() {
    this._init();
    if (!this.ctx) return;
    await this.ctx.resume();
    this.enabled = true;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.9, t, 0.6);
    this._scheduleBird();
    this._emit();
  }

  disable() {
    if (!this.ctx) { this.enabled = false; this._emit(); return; }
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, 0.25);
    clearTimeout(this._birdTimer);
    this.enabled = false;
    setTimeout(() => { if (!this.enabled && this.ctx) this.ctx.suspend(); }, 700); // fully stop the context once the fade has finished
    this._emit();
  }

  toggle() { return this.enabled ? this.disable() : this.enable(); }

  /** Chapters have places, and places have air: each scene ramps the beds over ~1.5 s. */
  scene(name) {
    if (!this.enabled || !this.ctx || this._scene === name) return;
    this._scene = name;
    const D = { wind: 0.22, bug: 0.012, water: 0, crowd: 0, proj: 0, drone: 55 };
    const S = {
      hero: {}, word: { wind: 0.12 },
      river: { wind: 0.16, water: 0.12 },
      rice: { bug: 0.024, wind: 0.14 },
      legend: { drone: 41.2, wind: 0.1, water: 0.09 },
      dark: { wind: 0.04, bug: 0.014 },
      lab: { wind: 0.1 },
      beat: { wind: 0.12 },
      then: { wind: 0.05, proj: 0.045 },
      now: { wind: 0.1, crowd: 0.07 },
      care: { wind: 0.14 },
    };
    const v = { ...D, ...(S[name] || {}) };
    const t = this.ctx.currentTime, k = 0.5;
    this.windGain.gain.setTargetAtTime(v.wind, t, k); this.bugGain.gain.setTargetAtTime(v.bug, t, k);
    this.waterGain.gain.setTargetAtTime(v.water, t, k); this.crowdGain.gain.setTargetAtTime(v.crowd, t, k); this.projGain.gain.setTargetAtTime(v.proj, t, k);
    this.drones.forEach((o, i) => o.frequency.setTargetAtTime([v.drone, v.drone * 1.007, v.drone * 1.5][i], t, 0.8));
    this.verb.gain.setTargetAtTime(name === 'legend' ? 0.5 : 0.35, t, k);
  }

  /** Low/high band energy (0..1) for visuals; also fires onHit when the low band spikes (a gong or drum). */
  level() {
    if (!this._ready() || !this.an) return { lo: 0, hi: 0 };
    this.an.getByteFrequencyData(this._bins);
    let lo = 0, hi = 0;
    for (let i = 1; i < 8; i++) lo += this._bins[i];
    for (let i = 30; i < 60; i++) hi += this._bins[i];
    return { lo: lo / 1785, hi: hi / 7650, bins: this._bins };
  }

  /** Hold the whole mix down (a deliberate silence) and bring it back. */
  duck(to = 1, secs = 1) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.9 * to, t, Math.max(0.05, secs / 3));
  }

  /** Scroll position → wind brightness, so the bed breathes with the story (0..1). */
  breathe(p) {
    if (!this.enabled) return;
    this.windFilter.frequency.setTargetAtTime(380 + p * 900, this.ctx.currentTime, 0.4);
  }

  _scheduleBird() {
    clearTimeout(this._birdTimer);
    this._birdTimer = setTimeout(() => {
      if (this.enabled && document.visibilityState === 'visible') this.bird();
      this._scheduleBird();
    }, 2500 + Math.random() * 6000);
  }

  bird() {
    const ctx = this.ctx, t0 = ctx.currentTime + 0.02;
    const notes = 2 + Math.floor(Math.random() * 4);
    const base = 1800 + Math.random() * 1600;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = Math.random() * 1.6 - 0.8;
    for (let i = 0; i < notes; i++) {
      const t = t0 + i * (0.09 + Math.random() * 0.05);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(base * (1 + Math.random() * 0.2), t);
      o.frequency.exponentialRampToValueAtTime(base * (1.35 + Math.random() * 0.5), t + 0.07);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.028, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g); (pan ? g.connect(pan).connect(this.master) : g.connect(this.master)); g.connect(this.verb);
      o.start(t); o.stop(t + 0.12);
    }
  }

  _ready() { return this.enabled && this.ctx; }

  /** Big resonant gong: inharmonic partials with long, slightly detuned decays. */
  gong(pitch = 98, vel = 1) {
    if (!this._ready()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [1, 1.51, 2.04, 2.77, 3.58, 4.9].forEach((r, i) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = pitch * r * (1 + (Math.random() - 0.5) * 0.004);
      const g = ctx.createGain(); const peak = (0.2 / (i + 1)) * vel;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5 - i * 0.5);
      o.connect(g); g.connect(this.master); g.connect(this.verb);
      o.start(t); o.stop(t + 5.2);
    });
  }

  /** Hand drum: pitched body + a skin slap. */
  drum(pitch = 130, vel = 1) {
    if (!this._ready()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(pitch * 1.9, t); o.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + 0.18);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.9 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.35);
    const n = ctx.createBufferSource(); n.buffer = this._noise(0.1, 'white');
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 0.8;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.35 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.connect(nf).connect(ng).connect(this.master); n.start(t);
  }

  /** Plucked string (sampe-ish): a triangle with a fast filter sweep, pentatonic by index. */
  pluck(index = 0, octave = 0, vel = 1) {
    if (!this._ready()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const semi = PENTA[((index % 5) + 5) % 5] + 12 * (octave + Math.floor(index / 5));
    const f = 196 * Math.pow(2, semi / 12);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.003;
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass';
    flt.frequency.setValueAtTime(f * 7, t); flt.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    const g2 = ctx.createGain(); g2.gain.value = 0.3;
    o.connect(flt); o2.connect(g2).connect(flt); flt.connect(g); g.connect(this.master); g.connect(this.verb);
    o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
  }

  /** Tiny UI tick for hovers and toggles. */
  tick(f = 720, vel = 1) {
    if (!this._ready()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.05);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.05 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.1);
  }

  /** Low whoosh for big transitions. */
  swell(seconds = 1.6) {
    if (!this._ready()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = this._noise(2, 'pink');
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(1800, t + seconds * 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + seconds * 0.6); g.gain.linearRampToValueAtTime(0, t + seconds);
    n.connect(f).connect(g).connect(this.master); n.start(t); n.stop(t + seconds + 0.1);
  }
}

export const audio = new HudoqAudio();

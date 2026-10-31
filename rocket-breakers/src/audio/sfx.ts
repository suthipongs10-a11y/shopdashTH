// Prototype sound effects synthesised with Web Audio (labelled prototype audio —
// final sounds need original/licensed sources). Unlocked on the first user gesture.
type Cue = "shot" | "beam" | "plasma" | "hit" | "deflect" | "boom" | "big_boom" | "joint" | "sever" | "tractor" | "lock" | "secured" | "hurt" | "shield" | "dash" | "overdrive" | "ui" | "warn";

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<Cue, number>();
  volume = 0.7;

  unlock(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = (seed / 0x7fffffff) * 2 - 1; }
  }

  suspend(): void { void this.ctx?.suspend(); }

  play(cue: Cue): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.volume <= 0 || ctx.state !== "running") return;
    const minGap: Partial<Record<Cue, number>> = { shot: 0.07, hit: 0.05, beam: 0.1, deflect: 0.08, shield: 0.1 };
    const now = ctx.currentTime;
    if ((minGap[cue] ?? 0) > 0 && now - (this.last.get(cue) ?? -1) < minGap[cue]!) return;
    this.last.set(cue, now);
    this.master.gain.value = this.volume * 0.5;
    switch (cue) {
      case "shot": this.tone("square", 880, 660, 0.04, 0.05); break;
      case "beam": this.tone("sawtooth", 1400, 900, 0.07, 0.05); break;
      case "plasma": this.tone("sine", 300, 700, 0.18, 0.18); break;
      case "hit": this.burst(0.03, 3000, 0.08); break;
      case "deflect": this.tone("triangle", 2200, 1800, 0.05, 0.06); break;
      case "boom": this.burst(0.25, 900, 0.35); break;
      case "big_boom": this.burst(0.9, 500, 0.6); this.tone("sine", 90, 40, 0.8, 0.4); break;
      case "joint": this.tone("triangle", 1200, 400, 0.25, 0.25); break;
      case "sever": this.tone("square", 220, 880, 0.3, 0.2); this.burst(0.2, 2000, 0.2); break;
      case "tractor": this.tone("sine", 420, 520, 0.3, 0.12); break;
      case "lock": this.tone("sine", 660, 990, 0.12, 0.15); break;
      case "secured": [523, 659, 784, 1046].forEach((f, i) => this.tone("triangle", f, f, 0.12, 0.18, i * 0.08)); break;
      case "hurt": this.tone("sawtooth", 160, 60, 0.2, 0.3); break;
      case "shield": this.tone("sine", 900, 500, 0.08, 0.12); break;
      case "dash": this.burst(0.12, 6000, 0.12); break;
      case "overdrive": [392, 523, 784].forEach((f, i) => this.tone("square", f, f * 1.01, 0.15, 0.12, i * 0.06)); break;
      case "ui": this.tone("sine", 700, 700, 0.05, 0.1); break;
      case "warn": this.tone("square", 520, 520, 0.08, 0.06); break;
    }
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, cutoff: number, gain: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(100, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const sfx = new Sfx();

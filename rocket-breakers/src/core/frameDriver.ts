// Fixed 60 Hz simulation clock decoupled from display refresh. Integer fixed-point
// accumulation keeps the tick sequence identical at 30/60/120/144 Hz and with jitter.
export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;
const UNIT = 1_000_000;

export class FrameDriver {
  accumulator = 0;
  maxTicksPerFrame = 8;
  paused = false;
  totalTicks = 0;

  // Ticks to simulate for a frame of `delta` seconds. Overlong frames drop the
  // excess (slow-down) instead of spiralling.
  advance(delta: number): number {
    if (this.paused || !(delta > 0)) return 0;
    this.accumulator += Math.round(delta * TICK_HZ * UNIT);
    let n = Math.floor(this.accumulator / UNIT);
    if (n > this.maxTicksPerFrame) {
      n = this.maxTicksPerFrame;
      this.accumulator = n * UNIT;
    }
    this.accumulator -= n * UNIT;
    this.totalTicks += n;
    return n;
  }

  alpha(): number { return this.accumulator / UNIT; }
}

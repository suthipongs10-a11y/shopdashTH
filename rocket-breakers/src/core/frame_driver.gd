## Fixed 60 Hz simulation clock decoupled from render frame rate.
## Uses integer fixed-point accumulation so the tick sequence does not drift
## with float rounding at 30/60/144 Hz or jittery frame times.
class_name FrameDriver
extends RefCounted

const TICK_HZ := 60
const TICK_SEC := 1.0 / TICK_HZ
const UNIT := 1_000_000  # one tick in accumulator units

var accumulator := 0
var max_ticks_per_frame := 8
var paused := false
var total_ticks := 0


## Returns how many simulation ticks to run for this render frame. When a frame
## is too long the excess time is dropped (slow-down) instead of spiralling.
func advance(delta: float) -> int:
	if paused or delta <= 0.0:
		return 0
	accumulator += int(round(delta * TICK_HZ * UNIT))
	var n := accumulator / UNIT
	if n > max_ticks_per_frame:
		n = max_ticks_per_frame
		accumulator = n * UNIT
	accumulator -= n * UNIT
	total_ticks += n
	return n


## Interpolation fraction between the previous and current tick for rendering.
func alpha() -> float:
	return float(accumulator) / UNIT

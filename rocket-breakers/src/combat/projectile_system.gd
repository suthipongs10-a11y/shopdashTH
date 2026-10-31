## Pooled friendly projectiles with swept-circle collision so fast shots never
## tunnel through targets between ticks. Fixed capacity; no per-frame allocation.
class_name ProjectileSystem
extends RefCounted

const CAPACITY := 300  # TECHNICAL player bullet budget

var pos: PackedVector2Array
var prev_pos: PackedVector2Array
var vel: PackedVector2Array
var radius: PackedFloat32Array
var damage: PackedFloat32Array
var alive: PackedByteArray
var ids: PackedInt64Array
var next_id := 1
var active_count := 0


func _init() -> void:
	pos.resize(CAPACITY)
	prev_pos.resize(CAPACITY)
	vel.resize(CAPACITY)
	radius.resize(CAPACITY)
	damage.resize(CAPACITY)
	alive.resize(CAPACITY)
	ids.resize(CAPACITY)


## Returns the slot index, or -1 when the pool is full (caller skips the volley).
func spawn(at: Vector2, velocity: Vector2, r: float, dmg: float) -> int:
	for i in CAPACITY:
		if alive[i] == 0:
			alive[i] = 1
			pos[i] = at
			prev_pos[i] = at
			vel[i] = velocity
			radius[i] = r
			damage[i] = dmg
			ids[i] = next_id
			next_id += 1
			active_count += 1
			return i
	return -1


func kill(i: int) -> void:
	if alive[i] == 1:
		alive[i] = 0
		active_count -= 1


func move(dt: float, world: Rect2) -> void:
	var grown := world.grow(64)
	for i in CAPACITY:
		if alive[i] == 0:
			continue
		prev_pos[i] = pos[i]
		pos[i] += vel[i] * dt
		if not grown.has_point(pos[i]):
			kill(i)


## True when segment a->b passes within r of point c.
static func segment_hits_circle(a: Vector2, b: Vector2, c: Vector2, r: float) -> bool:
	var ab := b - a
	var len_sq := ab.length_squared()
	var t := 0.0 if len_sq == 0.0 else clampf((c - a).dot(ab) / len_sq, 0.0, 1.0)
	return (a + ab * t).distance_squared_to(c) <= r * r


## Distance along the ray a->b to the first entry into circle (c, r), or -1.
static func ray_circle_entry(a: Vector2, b: Vector2, c: Vector2, r: float) -> float:
	var d := b - a
	var length := d.length()
	if length == 0.0:
		return -1.0
	d /= length
	var f := a - c
	var bq := f.dot(d)
	var cq := f.length_squared() - r * r
	var disc := bq * bq - cq
	if disc < 0.0:
		return -1.0
	var t := -bq - sqrt(disc)
	if t < 0.0:
		t = 0.0 if cq <= 0.0 else -1.0
	return t if t >= 0.0 and t <= length else -1.0

class_name StreaksFx
extends Node2D
## Radial light streaks that shoot outward with a slight spiral. Created through Fx.streaks().

var color := Color.WHITE
var count := 18
var radius := 420.0
var life := 0.45
var spiral := 0.5

var _t := 0.0
var _angles := PackedFloat32Array()
var _lengths := PackedFloat32Array()


func _ready() -> void:
	material = Fx.additive()
	for i in count:
		_angles.append(TAU * float(i) / float(count) + randf_range(-0.15, 0.15))
		_lengths.append(randf_range(0.55, 1.0))


func _process(delta: float) -> void:
	_t += delta / life
	if _t >= 1.0:
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var head := 1.0 - pow(1.0 - _t, 2.0)
	var tail := clampf(_t * 1.4 - 0.3, 0.0, 1.0)
	var fade := 1.0 - _t
	for i in count:
		var reach := radius * _lengths[i]
		var pts := PackedVector2Array()
		var steps := 8
		for s in steps + 1:
			var u := lerpf(tail, head, float(s) / float(steps))
			var r := reach * u
			var a := _angles[i] + spiral * u
			pts.append(Vector2(cos(a) * r, sin(a) * r * GameData.Y_SQUASH))
		draw_polyline(pts, Color(color, 0.45 * fade), 9.0 * fade + 2.0)
		draw_polyline(pts, Color(1.0, 1.0, 1.0, fade), 3.0 * fade + 1.0)

class_name Telegraph
extends Node2D
## Red warning area on the ground before a boss attack lands. Fills up over `time`, then calls
## on_done(position) and disappears. If the caster dies first the callable goes invalid and
## nothing happens.

var radius := 120.0
var time := 1.0
var color := Color(1.0, 0.16, 0.1)
var on_done: Callable

var _t := 0.0


func _process(delta: float) -> void:
	_t += delta
	if _t >= time:
		if on_done.is_valid():
			on_done.call(global_position)
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var u := _t / time
	var blink := 0.5 + 0.5 * sin(_t * 30.0) if u > 0.75 else 1.0
	draw_colored_polygon(GameData.ellipse_points(radius, 48), Color(color, 0.16))
	draw_colored_polygon(GameData.ellipse_points(radius * u, 48), Color(color, 0.32 * blink))
	draw_polyline(GameData.ellipse_outline(radius, 48), Color(color, 0.95), 3.0)

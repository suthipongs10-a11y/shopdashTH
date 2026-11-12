class_name RingFx
extends Node2D
## Expanding, fading ground ring (shockwave). Created through Fx.ring().

var color := Color.WHITE
var radius := 100.0
var life := 0.35
var width := 6.0

var _t := 0.0


func _process(delta: float) -> void:
	_t += delta / life
	if _t >= 1.0:
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var eased := 1.0 - pow(1.0 - _t, 3.0)
	var r := radius * (0.2 + 0.8 * eased)
	var fade := 1.0 - _t
	var outline := GameData.ellipse_outline(r, 48)
	draw_colored_polygon(GameData.ellipse_points(r, 48), Color(color, 0.16 * fade))
	draw_polyline(outline, Color(color, 0.45 * fade), width * 2.4 * fade + 3.0)
	draw_polyline(outline, Color(color.lightened(0.6), fade), width * fade + 1.5)

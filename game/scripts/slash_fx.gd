class_name SlashFx
extends Node2D
## Short-lived glowing sword crescent in front of the player.

const LIFE := 0.2

## Aim direction on the ground plane.
var aim := Vector2.RIGHT
var reach := 100.0
var color := Color(0.6, 0.85, 1.0)

var _left := LIFE


func _process(delta: float) -> void:
	_left -= delta
	if _left <= 0.0:
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var t := _left / LIFE
	# The swing sweeps across the cone while it fades.
	var sweep := aim.angle() + (0.5 - t) * 0.9
	draw_set_transform(Vector2(0.0, -28.0))
	Fx.draw_crescent(self, reach, 44.0 * t + 8.0, sweep, 1.2, Color(color.darkened(0.25), t * 0.5))
	Fx.draw_crescent(self, reach * 0.97, 32.0 * t + 6.0, sweep, 1.15, Color(color, t * 0.95))
	Fx.draw_crescent(self, reach * 0.94, 13.0 * t + 3.0, sweep, 1.0, Color(1.0, 1.0, 1.0, t))

class_name SlashFx
extends Node2D
## Short-lived sword arc drawn in front of the player.

const LIFE := 0.16

## Aim direction on the ground plane.
var aim := Vector2.RIGHT
var reach := 100.0

var _left := LIFE


func _process(delta: float) -> void:
	_left -= delta
	if _left <= 0.0:
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var t := _left / LIFE
	# Draw on the squashed ground plane so the arc matches the hit cone.
	draw_set_transform(Vector2(0.0, -26.0), 0.0, Vector2(1.0, GameData.Y_SQUASH))
	var a := aim.angle()
	var white := Color(1.0, 1.0, 1.0, t)
	draw_arc(Vector2.ZERO, reach * 0.85, a - 1.05, a + 1.05, 18, white, 12.0 * t + 2.0)
	draw_arc(Vector2.ZERO, reach * 0.65, a - 0.8, a + 0.8, 14, Color(0.6, 0.85, 1.0, t * 0.7), 6.0)

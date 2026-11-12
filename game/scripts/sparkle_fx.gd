class_name SparkleFx
extends Node2D
## Four-point star glint that flares and shrinks. Created through Fx.sparkle().

var color := Color.WHITE
var size := 40.0
var life := 0.22

var _t := 0.0


func _ready() -> void:
	material = Fx.additive()
	rotation = randf_range(-0.3, 0.3)


func _process(delta: float) -> void:
	_t += delta / life
	if _t >= 1.0:
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var grow := sin(_t * PI)
	var long := size * grow
	var thin := size * 0.09 * grow + 1.0
	var c := Color(color, 1.0 - _t * 0.5)
	for axis in [Vector2.RIGHT, Vector2.UP]:
		var side: Vector2 = axis.orthogonal() * thin
		draw_colored_polygon(PackedVector2Array([
			axis * long, side, -axis * long, -side,
		]), c)
	draw_circle(Vector2.ZERO, thin * 1.8, Color(1.0, 1.0, 1.0, 1.0 - _t))

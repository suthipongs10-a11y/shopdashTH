class_name SlashFx
extends Node2D
## Sword crescent in front of the player. Plays art/fx/slash.png when present (the art's
## crescent bulges toward the right; it is rotated to the aim), otherwise draws one.

const LIFE := 0.2

static var _flip := false

## Aim direction on the ground plane.
var aim := Vector2.RIGHT
var reach := 100.0
var color := Color(0.6, 0.85, 1.0)

var _left := LIFE
var _painted := false


func _ready() -> void:
	var screen_dir := GameData.to_screen(aim).normalized()
	var fx := FxSprite.play(self, "slash", screen_dir * reach * 0.45 + Vector2(0.0, -40.0),
		reach * 1.7, 0.26)
	if fx != null:
		_painted = true
		fx.rotation = screen_dir.angle()
		_flip = not _flip
		fx.flip_v = _flip
		fx.grow_from = 0.85
		fx.grow_to = 1.1


func _process(delta: float) -> void:
	_left -= delta
	if _left <= 0.0 and (not _painted or get_child_count() == 0):
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	if _painted or _left <= 0.0:
		return
	var t := _left / LIFE
	# The swing sweeps across the cone while it fades.
	var sweep := aim.angle() + (0.5 - t) * 0.9
	draw_set_transform(Vector2(0.0, -28.0))
	Fx.draw_crescent(self, reach, 44.0 * t + 8.0, sweep, 1.2, Color(color.darkened(0.25), t * 0.5))
	Fx.draw_crescent(self, reach * 0.97, 32.0 * t + 6.0, sweep, 1.15, Color(color, t * 0.95))
	Fx.draw_crescent(self, reach * 0.94, 13.0 * t + 3.0, sweep, 1.0, Color(1.0, 1.0, 1.0, t))

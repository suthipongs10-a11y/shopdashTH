class_name CrestFx
extends Node2D
## Golden heraldic crest that rises above the warden for the Sacred Banner ultimate.
## Uses art/fx/crest.png when present (additive), otherwise draws a glowing shield.

const LIFE := 1.8
const RISE := 0.6
const HEIGHT := 190.0

var color := Color(1.0, 0.8, 0.35)
## Seconds to wait (ultimate intro) before the crest appears.
var delay := 0.0

var _t := 0.0
var _sprite: FxSprite
var _begun := false


func _begin() -> void:
	_sprite = FxSprite.play(self, "crest", Vector2.ZERO, HEIGHT, LIFE)
	if _sprite != null:
		_sprite.fade_in = 0.2
		_sprite.fade_out = 0.5
	Vfx.beam(global_position, 110.0, color, 1.0)
	Vfx.ring(global_position, 20.0, 240.0, color, 0.7, 10.0)
	Vfx.burst(global_position, 200.0, 26, color, 260.0, 14.0, 0.8)


func _process(delta: float) -> void:
	if delay > 0.0:
		delay -= delta
		return
	if not _begun:
		_begun = true
		_begin()
	_t += delta
	if _t >= LIFE:
		queue_free()
		return
	var k := clampf(_t / RISE, 0.0, 1.0)
	var y := -130.0 - 110.0 * (1.0 - pow(1.0 - k, 3.0))
	if _sprite != null:
		_sprite.position = Vector2(0.0, y)
	queue_redraw()


func _draw() -> void:
	if _sprite != null or delay > 0.0:
		return
	var k := clampf(_t / RISE, 0.0, 1.0)
	var a := clampf(_t / 0.2, 0.0, 1.0) * clampf((LIFE - _t) / 0.5, 0.0, 1.0)
	var c := Vector2(0.0, -130.0 - 110.0 * (1.0 - pow(1.0 - k, 3.0)))
	var w := HEIGHT * 0.36
	var h := HEIGHT * 0.5
	var shield := PackedVector2Array([
		c + Vector2(-w, -h), c + Vector2(w, -h), c + Vector2(w, h * 0.1),
		c + Vector2(0.0, h), c + Vector2(-w, h * 0.1),
	])
	draw_circle(c, h * 1.4, Color(color, 0.16 * a))
	draw_colored_polygon(shield, Color(color, 0.85 * a))
	var inner := PackedVector2Array()
	for p in shield:
		inner.append(c + (p - c) * 0.78)
	draw_colored_polygon(inner, Color(0.35, 0.18, 0.05, 0.85 * a))
	# A simple cross emblem in the middle.
	var emblem := Color(1.0, 0.9, 0.5, a)
	draw_rect(Rect2(c + Vector2(-w * 0.12, -h * 0.6), Vector2(w * 0.24, h * 1.1)), emblem)
	draw_rect(Rect2(c + Vector2(-w * 0.5, -h * 0.25), Vector2(w, h * 0.22)), emblem)
	var outline := shield.duplicate()
	outline.append(shield[0])
	draw_polyline(outline, Color(1.0, 0.95, 0.7, a), 4.0)

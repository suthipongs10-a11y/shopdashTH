class_name CastBar
extends Node2D
## Chant bar over the caster's head plus a rune circle growing under their feet.

const FONT := preload("res://fonts/Kanit-Medium.ttf")
const WIDTH := 150.0

var anchor: Node2D
var title := ""
var color := Color(1.0, 0.8, 0.3)
var total := 1.0
## Draw the rune circle; off when a painted circle is shown instead.
var draw_circle := true

var _t := 0.0


func _ready() -> void:
	z_index = 22


func _process(delta: float) -> void:
	_t += delta
	if _t >= total or not is_instance_valid(anchor):
		queue_free()
		return
	global_position = anchor.global_position
	queue_redraw()


func _draw() -> void:
	var k := clampf(_t / total, 0.0, 1.0)
	if draw_circle:
		_draw_rune_circle(k)
	_draw_bar(k)


func _draw_rune_circle(k: float) -> void:
	# Rune circle on the ground, drawn squashed to lie flat.
	var r := 70.0 + 110.0 * k
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, GameData.Y_SQUASH))
	draw_arc(Vector2.ZERO, r, 0.0, TAU, 64, Color(color, 0.85), 3.0)
	draw_arc(Vector2.ZERO, r * 0.8, 0.0, TAU, 64, Color(color, 0.6), 2.0)
	for i in 16:
		var a := _t * 2.4 + TAU * i / 16.0
		draw_line(Vector2.from_angle(a) * r * 0.82, Vector2.from_angle(a + 0.18) * r * 0.98,
			Color(color, 0.8), 2.0)
	for i in 2:
		var pts := PackedVector2Array()
		for j in 4:
			pts.append(Vector2.from_angle(-_t * 1.5 + TAU * j / 3.0 + (PI if i == 1 else 0.0)) * r * 0.8)
		draw_polyline(pts, Color(color, 0.7), 2.0)
	draw_set_transform(Vector2.ZERO)


func _draw_bar(k: float) -> void:
	# Bar and skill name over the head.
	var top := Vector2(-WIDTH * 0.5, -178.0)
	draw_rect(Rect2(top - Vector2(2, 2), Vector2(WIDTH + 4, 12)), Color(0, 0, 0, 0.7))
	draw_rect(Rect2(top, Vector2(WIDTH * k, 8)), color)
	var label := "%s  %.1f" % [title, maxf(0.0, total - _t)]
	var w := FONT.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x
	draw_string_outline(FONT, top + Vector2(WIDTH * 0.5 - w * 0.5, -8.0), label,
		HORIZONTAL_ALIGNMENT_LEFT, -1, 16, 5, Color(0.1, 0.05, 0.0))
	draw_string(FONT, top + Vector2(WIDTH * 0.5 - w * 0.5, -8.0), label,
		HORIZONTAL_ALIGNMENT_LEFT, -1, 16, color.lightened(0.5))

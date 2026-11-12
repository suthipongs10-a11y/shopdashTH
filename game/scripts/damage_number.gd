class_name DamageNumber
extends Label
## Floating combat text. Rises, fades, then frees itself.

const MAX_ALIVE := 140

static var _alive := 0


static func spawn(
		parent: Node, at: Vector2, amount: int, crit: bool, color: Color = Color.WHITE
) -> void:
	var text_color := Color(1.0, 0.85, 0.2) if crit else color
	spawn_text(parent, at, GameData.format_int(amount), 36 if crit else 24, text_color)


static func spawn_text(
		parent: Node, at: Vector2, content: String, font_size: int, color: Color
) -> void:
	if parent == null or _alive >= MAX_ALIVE:
		return
	var n := DamageNumber.new()
	n.text = content
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.add_theme_font_size_override("font_size", font_size)
	n.add_theme_color_override("font_color", color)
	n.add_theme_color_override("font_outline_color", Color(0.1, 0.03, 0.0))
	n.add_theme_constant_override("outline_size", 7)
	n.position = at + Vector2(randf_range(-22.0, 22.0), randf_range(-10.0, 10.0))
	parent.add_child(n)


func _ready() -> void:
	_alive += 1
	var box := get_minimum_size()
	position -= box * 0.5
	pivot_offset = box * 0.5
	scale = Vector2(1.5, 1.5)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(self, "position:y", position.y - 70.0, 0.75) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(self, "scale", Vector2.ONE, 0.15)
	tw.tween_property(self, "modulate:a", 0.0, 0.3).set_delay(0.45)
	tw.chain().tween_callback(queue_free)


func _exit_tree() -> void:
	_alive -= 1

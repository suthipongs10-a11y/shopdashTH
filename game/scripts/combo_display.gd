class_name ComboDisplay
extends Control
## Right-aligned combo readout: tier name, hit count, total damage and a timeout bar.


func _ready() -> void:
	size = Vector2(320.0, 130.0)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	if Combo.hits < 2:
		return
	var font := get_theme_default_font()
	var w := size.x
	var color: Color = Combo.tier_color()
	var outline := Color(0.1, 0.03, 0.0)
	var right := HORIZONTAL_ALIGNMENT_RIGHT
	if Combo.tier >= 0:
		var title: String = Combo.tier_name() + "!"
		draw_string_outline(font, Vector2(0.0, 26.0), title, right, w, 24, 8, outline)
		draw_string(font, Vector2(0.0, 26.0), title, right, w, 24, color)
	var hits_text := "%s HITS" % GameData.format_int(Combo.hits)
	draw_string_outline(font, Vector2(0.0, 78.0), hits_text, right, w, 50, 10, outline)
	draw_string(font, Vector2(0.0, 78.0), hits_text, right, w, 50, color)
	var total_text := "%s DMG" % GameData.format_int(Combo.total_damage)
	draw_string_outline(font, Vector2(0.0, 104.0), total_text, right, w, 17, 6, outline)
	draw_string(font, Vector2(0.0, 104.0), total_text, right, w, 17, Color.WHITE)
	var bar_w := 180.0
	draw_rect(Rect2(w - bar_w, 114.0, bar_w, 5.0), Color(0, 0, 0, 0.6))
	var fill: float = bar_w * Combo.time_ratio()
	draw_rect(Rect2(w - fill, 114.0, fill, 5.0), color)

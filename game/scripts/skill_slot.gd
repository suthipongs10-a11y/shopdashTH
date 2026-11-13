class_name SkillSlot
extends Control
## One hotbar slot: key label, skill name, cooldown overlay and countdown.

var skill_id := ""
var player: Player

var _icon: Texture2D


func _ready() -> void:
	custom_minimum_size = Vector2(76.0, 76.0)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var path := "res://art/ui/skills/%s.png" % skill_id
	if ResourceLoader.exists(path):
		_icon = load(path)


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	if not is_instance_valid(player):
		return
	var data: Dictionary = GameData.SKILLS[skill_id]
	var font := get_theme_default_font()
	var gold := Color(0.85, 0.68, 0.3)
	var rect := Rect2(Vector2.ZERO, size)
	var icon_color: Color = data["color"]
	draw_rect(rect, Color(0.06, 0.07, 0.13, 0.92))
	if _icon != null:
		draw_texture_rect(_icon, rect.grow(-3.0), false)
	else:
		draw_rect(rect.grow(-6.0), icon_color.darkened(0.35))
		draw_string(font, Vector2(2.0, size.y - 10.0), String(data["short"]),
			HORIZONTAL_ALIGNMENT_CENTER, size.x - 4.0, 13, Color.WHITE)
	# Key hint in a small dark tab so it reads on top of the painted icon.
	var key_w := font.get_string_size(String(data["key"]), HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
	draw_rect(Rect2(2.0, 2.0, key_w + 10.0, 20.0), Color(0.05, 0.05, 0.1, 0.8))
	draw_string(font, Vector2(6.0, 17.0), String(data["key"]),
		HORIZONTAL_ALIGNMENT_LEFT, -1.0, 13, gold)

	var cd_total := float(data["cd"]) * pow(0.88, player.mod("cdr"))
	var cd_left := float(player.cooldowns[skill_id])
	if cd_left > 0.0 and cd_total >= 1.0:
		var h := size.y * clampf(cd_left / cd_total, 0.0, 1.0)
		draw_rect(Rect2(0.0, size.y - h, size.x, h), Color(0, 0, 0, 0.7))
		draw_string(font, Vector2(0.0, size.y * 0.5 + 9.0), "%.1f" % cd_left,
			HORIZONTAL_ALIGNMENT_CENTER, size.x, 24, Color.WHITE)
	elif player.sp < float(data["sp"]):
		# Not enough SP.
		draw_rect(rect, Color(0.1, 0.15, 0.5, 0.5))
	draw_rect(rect, gold, false, 2.0)

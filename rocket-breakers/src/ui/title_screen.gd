## Title: start the flight sandbox, switch language (persisted in the save).
extends Control

var app: Node
var _status: Label


func _init(owner_app: Node) -> void:
	app = owner_app


func _ready() -> void:
	size = SafeArea.LOGICAL
	var bg := ColorRect.new()
	bg.color = Palette.BG_DEEP
	bg.size = SafeArea.LOGICAL
	bg.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(bg)
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(560, 0)
	box.position = Vector2(80, 360)
	box.add_theme_constant_override("separation", 26)
	add_child(box)
	var title := Label.new()
	title.text = "ROCKET BREAKERS"
	title.auto_translate_mode = AUTO_TRANSLATE_MODE_DISABLED
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", ThemeFactory.font(true))
	title.add_theme_font_size_override("font_size", 58)
	title.add_theme_color_override("font_color", Palette.PLAYER_ORANGE)
	box.add_child(title)
	box.add_child(_label("ui.title.tagline", 30, Palette.UI_TEXT))
	box.add_child(Control.new())
	var start := Button.new()
	start.text = "ui.title.start_sandbox"
	start.custom_minimum_size = Vector2(0, 96)
	start.add_theme_font_size_override("font_size", 32)
	start.pressed.connect(func(): app.show_sandbox())
	box.add_child(start)
	var lang := Button.new()
	lang.text = "ui.title.language"
	lang.custom_minimum_size = Vector2(0, 84)
	lang.add_theme_font_size_override("font_size", 28)
	lang.pressed.connect(_toggle_language)
	box.add_child(lang)
	_status = _label(_status_key(), 22, Palette.UI_TEXT_DIM)
	box.add_child(_status)
	box.add_child(_label("ui.title.build_note", 22, Palette.PLACEHOLDER_TAG))


func _label(key: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = key
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _status_key() -> String:
	match app.load_status:
		SaveRepository.Status.OK: return "ui.title.save_ok"
		SaveRepository.Status.RECOVERED: return "ui.title.save_recovered"
		SaveRepository.Status.FUTURE: return "ui.title.save_future"
		SaveRepository.Status.CORRUPT: return "ui.title.save_corrupt"
	return "ui.title.save_new"


func _toggle_language() -> void:
	var cur := str(app.profile["settings"].get("language", "th"))
	app.set_language("en" if cur == "th" else "th")

class_name Hud
extends CanvasLayer
## In-game HUD, built in code: player panel, target bar, hotbar, combo readout, banner.

const PANEL_BG := Color(0.06, 0.07, 0.13, 0.9)
const GOLD := Color(0.85, 0.68, 0.3)
const TARGET_TIMEOUT := 4.0

## Set by main.gd before the HUD enters the tree.
var player: Player

var _root: Control
var _name_label: Label
var _hp_bar: ProgressBar
var _hp_label: Label
var _sp_bar: ProgressBar
var _sp_label: Label
var _xp_bar: ProgressBar
var _stats_label: Label
var _target_panel: PanelContainer
var _target_label: Label
var _target_bar: ProgressBar
var _hotbar: HBoxContainer
var _combo: ComboDisplay
var _banner: Label
var _hint: Label

var _target: Monster
var _target_left := 0.0
var _banner_tween: Tween


func _ready() -> void:
	_root = Control.new()
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)
	_build_player_panel()
	_build_target_panel()
	_build_hotbar()

	_combo = ComboDisplay.new()
	_root.add_child(_combo)

	_banner = _make_label(44, Color.WHITE)
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.add_theme_color_override("font_outline_color", Color(0.1, 0.03, 0.0))
	_banner.add_theme_constant_override("outline_size", 10)
	_banner.modulate.a = 0.0
	_root.add_child(_banner)

	_hint = _make_label(14, Color(1, 1, 1, 0.75))
	_hint.text = "WASD เดิน  ·  คลิกซ้าย/Space ฟัน  ·  Q E R สกิล  ·  F ท่าไม้ตาย  ·  เมาส์เล็งทิศ"
	_root.add_child(_hint)

	player.target_hit.connect(_on_target_hit)


func _process(delta: float) -> void:
	if not is_instance_valid(player):
		return
	_name_label.text = "%s   Lv.%d" % [player.char_name, player.level]
	_hp_bar.max_value = player.max_hp
	_hp_bar.value = player.hp
	_hp_label.text = "HP  %d / %d" % [ceili(player.hp), roundi(player.max_hp)]
	_sp_bar.max_value = player.max_sp
	_sp_bar.value = player.sp
	_sp_label.text = "SP  %d / %d" % [floori(player.sp), roundi(player.max_sp)]
	_xp_bar.max_value = GameData.xp_to_next(player.level)
	_xp_bar.value = player.xp
	_stats_label.text = "ATK %d   DEF %d   ทอง %s" % [
		roundi(player.attack_power), roundi(player.defense), GameData.format_int(player.gold),
	]

	_target_left -= delta
	var show_target := _target_left > 0.0 and is_instance_valid(_target) \
		and _target.state != Monster.State.DEAD
	_target_panel.visible = show_target
	if show_target:
		_target_label.text = "%s   Lv.%d      %s / %s" % [
			_target.display_name, _target.level,
			GameData.format_int(_target.hp), GameData.format_int(_target.max_hp),
		]
		_target_bar.max_value = _target.max_hp
		_target_bar.value = _target.hp

	# Manual layout so everything follows the window size.
	var view := get_viewport().get_visible_rect().size
	_target_panel.position = Vector2((view.x - _target_panel.size.x) * 0.5, 14.0)
	_hotbar.position = Vector2((view.x - _hotbar.size.x) * 0.5, view.y - _hotbar.size.y - 18.0)
	_combo.position = Vector2(view.x - _combo.size.x - 28.0, view.y * 0.3)
	_banner.position = Vector2(0.0, view.y * 0.2)
	_banner.size = Vector2(view.x, 70.0)
	_hint.position = Vector2(16.0, view.y - 30.0)


func show_banner(text: String, color: Color = Color.WHITE) -> void:
	_banner.text = text
	_banner.add_theme_color_override("font_color", color)
	_banner.modulate.a = 1.0
	if _banner_tween != null and _banner_tween.is_valid():
		_banner_tween.kill()
	_banner_tween = create_tween()
	_banner_tween.tween_interval(1.3)
	_banner_tween.tween_property(_banner, "modulate:a", 0.0, 0.5)


func _on_target_hit(monster: Monster) -> void:
	_target = monster
	_target_left = TARGET_TIMEOUT


func _build_player_panel() -> void:
	var panel := _make_panel()
	panel.position = Vector2(16.0, 16.0)
	_root.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	panel.add_child(box)

	_name_label = _make_label(18, GOLD)
	box.add_child(_name_label)
	_hp_bar = _make_bar(Color(0.82, 0.18, 0.2), Vector2(250.0, 20.0))
	box.add_child(_hp_bar)
	_hp_label = _make_bar_label(_hp_bar)
	_sp_bar = _make_bar(Color(0.2, 0.45, 0.9), Vector2(250.0, 20.0))
	box.add_child(_sp_bar)
	_sp_label = _make_bar_label(_sp_bar)
	_xp_bar = _make_bar(Color(0.95, 0.8, 0.25), Vector2(250.0, 6.0))
	box.add_child(_xp_bar)
	_stats_label = _make_label(13, Color(1, 1, 1, 0.85))
	box.add_child(_stats_label)


func _build_target_panel() -> void:
	_target_panel = _make_panel()
	_target_panel.visible = false
	_root.add_child(_target_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	_target_panel.add_child(box)
	_target_label = _make_label(15, Color.WHITE)
	_target_label.custom_minimum_size = Vector2(380.0, 0.0)
	_target_label.clip_text = true
	_target_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(_target_label)
	_target_bar = _make_bar(Color(0.85, 0.2, 0.15), Vector2(380.0, 12.0))
	box.add_child(_target_bar)


func _build_hotbar() -> void:
	_hotbar = HBoxContainer.new()
	_hotbar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hotbar.add_theme_constant_override("separation", 8)
	_root.add_child(_hotbar)
	for id in GameData.SKILL_ORDER:
		var slot := SkillSlot.new()
		slot.skill_id = id
		slot.player = player
		_hotbar.add_child(slot)


func _make_panel() -> PanelContainer:
	var style := StyleBoxFlat.new()
	style.bg_color = PANEL_BG
	style.border_color = GOLD
	style.set_border_width_all(2)
	style.set_corner_radius_all(8)
	style.set_content_margin_all(12.0)
	var panel := PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override("panel", style)
	return panel


func _make_label(font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	return label


func _make_bar(color: Color, min_size: Vector2) -> ProgressBar:
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.65)
	bg.set_corner_radius_all(4)
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(4)
	var bar := ProgressBar.new()
	bar.show_percentage = false
	bar.custom_minimum_size = min_size
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_theme_stylebox_override("background", bg)
	bar.add_theme_stylebox_override("fill", fill)
	return bar


## Centered text drawn over a bar.
func _make_bar_label(bar: ProgressBar) -> Label:
	var label := _make_label(12, Color.WHITE)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	bar.add_child(label)
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	return label

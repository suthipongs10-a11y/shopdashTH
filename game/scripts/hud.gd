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

## Crown Defense widgets (null in the old training/horde modes).
var _director: WaveDirector
var _crown: Crown
var _wave_panel: PanelContainer
var _wave_label: Label
var _crown_bar: ProgressBar
var _crown_label: Label
var _count_label: Label
var _boss: Boss
var _boss_panel: PanelContainer
var _boss_label: Label
var _boss_bar: ProgressBar
var _results: Control
var _build_panel: PanelContainer
var _build_title: Label
var _build_buttons: Array[Button] = []
var _slot: BuildSlot

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

	_hint = _make_label(13, Color(1, 1, 1, 0.85))
	_hint.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	_hint.add_theme_constant_override("outline_size", 4)
	_hint.text = "WASD เดิน  ·  เมาส์เล็งทิศ  ·  คลิกซ้าย/Space ฟัน  ·  Shift/คลิกขวา หลบ\n" \
		+ "Q E R 1 สกิล  ·  F 2 ท่าไม้ตาย  ·  3 เทพมังกรทอง (ร่าย)  ·  Enter เริ่มเวฟทันที"
	_root.add_child(_hint)

	player.target_hit.connect(_on_target_hit)
	if player.input is TouchInput:
		# Touch buttons show the skills; the keyboard hints and hotbar would only crowd the screen.
		_hint.visible = false
		_hotbar.visible = false


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

	_update_crown_widgets()
	_update_build_panel()
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
	var top := 14.0
	if _wave_panel != null:
		_wave_panel.position = Vector2((view.x - _wave_panel.size.x) * 0.5, 10.0)
		top = _wave_panel.position.y + _wave_panel.size.y + 8.0
		if _boss_panel.visible:
			_boss_panel.position = Vector2((view.x - _boss_panel.size.x) * 0.5, top)
			top += _boss_panel.size.y + 8.0
		# Just under the top panels, so it never covers the hero or the shrine.
		_count_label.position = Vector2(0.0, top)
		_count_label.size = Vector2(view.x, 0.0)
		if _count_label.visible:
			top += _count_label.get_combined_minimum_size().y + 6.0
	_target_panel.position = Vector2((view.x - _target_panel.size.x) * 0.5, top)
	if _build_panel != null:
		var above := _hotbar.position.y if _hotbar.visible else view.y - 20.0
		_build_panel.position = Vector2((view.x - _build_panel.size.x) * 0.5,
			above - _build_panel.size.y - 12.0)
	_hotbar.position = Vector2((view.x - _hotbar.size.x) * 0.5, view.y - _hotbar.size.y - 18.0)
	_combo.position = Vector2(view.x - _combo.size.x - 28.0, view.y * 0.3)
	# Below the player, so it never covers the skill tallies above their head.
	_banner.position = Vector2(0.0, view.y * 0.66)
	_banner.size = Vector2(view.x, 70.0)
	_hint.position = Vector2(16.0, view.y - 56.0)


## Crown Defense: wave number, shrine HP, countdown and the boss bar.
func setup_crown(director: WaveDirector, crown: Crown) -> void:
	_director = director
	_crown = crown
	_wave_panel = _make_panel()
	_root.add_child(_wave_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	_wave_panel.add_child(box)
	_wave_label = _make_label(22, GOLD)
	_wave_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(_wave_label)
	_crown_bar = _make_bar(Color(1.0, 0.78, 0.28), Vector2(400.0, 24.0))
	box.add_child(_crown_bar)
	_crown_label = _make_bar_label(_crown_bar, 17)
	_crown_label.add_theme_color_override("font_outline_color", Color(0.2, 0.08, 0.0))
	_crown_label.add_theme_constant_override("outline_size", 5)
	_count_label = _make_label(26, Color(1.0, 0.9, 0.6))
	_count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_count_label.add_theme_color_override("font_outline_color", Color(0.15, 0.05, 0.0))
	_count_label.add_theme_constant_override("outline_size", 8)
	_root.add_child(_count_label)
	_boss_panel = _make_panel()
	_boss_panel.visible = false
	_root.add_child(_boss_panel)
	var bbox := VBoxContainer.new()
	_boss_panel.add_child(bbox)
	_boss_label = _make_label(18, Color(1.0, 0.55, 0.45))
	_boss_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bbox.add_child(_boss_label)
	_boss_bar = _make_bar(Color(0.85, 0.15, 0.1), Vector2(560.0, 18.0))
	bbox.add_child(_boss_bar)
	_make_build_panel()


func _make_build_panel() -> void:
	_build_panel = _make_panel()
	_build_panel.visible = false
	_root.add_child(_build_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	_build_panel.add_child(box)
	_build_title = _make_label(17, GOLD)
	_build_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(_build_title)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	box.add_child(row)
	for i in 4:
		var b := Button.new()
		b.custom_minimum_size = Vector2(150.0, 78.0)
		b.focus_mode = Control.FOCUS_NONE
		b.add_theme_font_size_override("font_size", 14)
		b.pressed.connect(_on_build_button.bind(i))
		var icon_path := "res://art/ui/towers/%s.png" % GameData.TOWER_ORDER[i]
		if ResourceLoader.exists(icon_path):
			b.icon = load(icon_path)
			b.add_theme_constant_override("icon_max_width", 44)
		row.add_child(b)
		_build_buttons.append(b)


## Shows build choices for the slot the warden stands on (or upgrade/sell for a built one).
func _update_build_panel() -> void:
	if _build_panel == null or not is_instance_valid(player):
		return
	var slot := _director.slot_near(player.global_position) if not player.dead else null
	if slot != _slot:
		if is_instance_valid(_slot):
			_slot.selected = false
		_slot = slot
		if slot != null:
			slot.selected = true
	_build_panel.visible = slot != null and _director.phase != WaveDirector.Phase.OVER
	if not _build_panel.visible:
		return
	for i in 4:
		if Input.is_action_just_pressed("build_%d" % (i + 1)):
			_on_build_button(i)
	if slot.is_empty():
		_build_title.text = "ฐานสร้างป้อม   ·   ทอง %d" % player.gold
		for i in 4:
			var kind: String = GameData.TOWER_ORDER[i]
			var t: Dictionary = GameData.TOWERS[kind]
			var icon_path := "res://art/ui/towers/%s.png" % kind
			if _build_buttons[i].icon == null and ResourceLoader.exists(icon_path):
				_build_buttons[i].icon = load(icon_path)
			var cost := WaveDirector.build_cost(kind, 1)
			_set_button(i, "[%s] %s\n%d ทอง\n%s" % [t["key"], t["name"], cost, t["desc"]],
				player.gold >= cost)
		return
	var tower := slot.tower
	var data: Dictionary = GameData.TOWERS[tower.kind]
	_build_title.text = "%s  Lv.%d   ·   ทอง %d" % [data["name"], tower.level, player.gold]
	if tower.level < 3:
		var cost := WaveDirector.build_cost(tower.kind, tower.level + 1)
		_set_button(0, "[Z] อัปเกรดเป็น Lv.%d\n%d ทอง" % [tower.level + 1, cost], player.gold >= cost)
	else:
		_set_button(0, "เลเวลสูงสุดแล้ว", false)
	_set_button(1, "[X] ขาย\n+%d ทอง" % WaveDirector.sell_value(tower), true)
	_build_buttons[2].visible = false
	_build_buttons[3].visible = false
	for b in _build_buttons:
		b.icon = null


func _set_button(i: int, label: String, enabled: bool) -> void:
	var b := _build_buttons[i]
	b.visible = true
	b.text = label
	b.disabled = not enabled


func _on_build_button(i: int) -> void:
	if not is_instance_valid(_slot) or _director.phase == WaveDirector.Phase.OVER:
		return
	if _slot.is_empty():
		var kind: String = GameData.TOWER_ORDER[i]
		if _director.build(_slot, kind):
			show_banner("สร้าง%s!" % GameData.TOWERS[kind]["name"], Color(1.0, 0.85, 0.4))
	elif i == 0:
		if _director.upgrade(_slot):
			show_banner("อัปเกรดเป็น Lv.%d" % _slot.tower.level, Color(1.0, 0.85, 0.4))
	elif i == 1:
		_director.sell(_slot)


func track_boss(boss: Boss) -> void:
	_boss = boss


func _update_crown_widgets() -> void:
	if _director == null:
		return
	_wave_label.text = "เวฟ %d / %d     ทอง %d" % [maxi(1, _director.wave), WaveDirector.WAVES,
		player.gold]
	if is_instance_valid(_crown):
		_crown_bar.max_value = _crown.max_hp
		_crown_bar.value = _crown.hp
		_crown_label.text = "ศาลมงกุฎ  %s / %s" % [
			GameData.format_int(ceili(_crown.hp)), GameData.format_int(roundi(_crown.max_hp))]
	var prep := _director.phase == WaveDirector.Phase.PREP
	_count_label.visible = prep
	if prep:
		var next := _director.wave + 1
		var boss_note := "  บอส!" if next in WaveDirector.BOSS_WAVES else ""
		var tip := "เดินไปที่ฐานหินเพื่อสร้างป้อม" if next == 1 else "Enter = เริ่มทันที"
		_count_label.text = "เวฟ %d%s มาใน %d\n%s" % [next, boss_note, ceili(_director.countdown), tip]
	var boss_alive := is_instance_valid(_boss) and _boss.state != Monster.State.DEAD
	_boss_panel.visible = boss_alive
	if boss_alive:
		var mood := "  (คลั่ง!)" if _boss.enraged else ""
		_boss_label.text = "%s%s   %s / %s" % [_boss.display_name, mood,
			GameData.format_int(_boss.hp), GameData.format_int(_boss.max_hp)]
		_boss_bar.max_value = _boss.max_hp
		_boss_bar.value = _boss.hp


## End-of-run panel with a replay button.
func show_results(won: bool, lines: Array[String]) -> void:
	if _results != null:
		return
	var panel := _make_panel()
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_root.add_child(panel)
	_results = panel
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	panel.add_child(box)
	var title := _make_label(40, Color(1.0, 0.85, 0.35) if won else Color(1.0, 0.4, 0.35))
	title.text = "ปกป้องมงกุฎสำเร็จ!" if won else "ศาลมงกุฎพังทลาย..."
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	for line in lines:
		var l := _make_label(20, Color.WHITE)
		l.text = line
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		box.add_child(l)
	var again := Button.new()
	again.text = "เล่นอีกครั้ง"
	again.add_theme_font_size_override("font_size", 24)
	again.custom_minimum_size = Vector2(260.0, 56.0)
	again.pressed.connect(func() -> void:
		Engine.time_scale = 1.0
		get_tree().paused = false
		get_tree().reload_current_scene())
	box.add_child(again)
	await get_tree().process_frame
	var view := get_viewport().get_visible_rect().size
	panel.position = (view - panel.size) * 0.5


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
func _make_bar_label(bar: ProgressBar, font_size: int = 12) -> Label:
	var label := _make_label(font_size, Color.WHITE)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	bar.add_child(label)
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	return label

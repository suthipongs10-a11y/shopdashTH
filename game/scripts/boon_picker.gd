class_name BoonPicker
extends CanvasLayer
## Level-up screen for Crown Defense: the game pauses and three blessings are offered.
## Click/tap a card or press 1, 2, 3. With auto_pick (dev autopilot) one is chosen by itself.

signal picked(id: String)

const GOLD := Color(1.0, 0.8, 0.35)

var player: Player
var auto_pick := false

var _ids: Array[String] = []
var _buttons: Array[Button] = []


func _ready() -> void:
	layer = 30
	process_mode = Node.PROCESS_MODE_ALWAYS
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.01, 0.05, 0.72)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var box := VBoxContainer.new()
	box.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	box.add_theme_constant_override("separation", 22)
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	add_child(box)
	var title := Label.new()
	title.text = "เลเวลอัป!  เลือกพร 1 อย่าง"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 40)
	title.add_theme_color_override("font_color", GOLD)
	title.add_theme_color_override("font_outline_color", Color(0.2, 0.08, 0.0))
	title.add_theme_constant_override("outline_size", 10)
	box.add_child(title)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 24)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_child(row)
	_ids = _roll()
	for i in _ids.size():
		var b := _card(_ids[i], i)
		row.add_child(b)
		_buttons.append(b)
	get_tree().paused = true
	if auto_pick:
		get_tree().create_timer(0.6, true).timeout.connect(func() -> void:
			_choose(randi() % _ids.size()))
	# Centre the box once its size is known.
	await get_tree().process_frame
	var view := get_viewport().get_visible_rect().size
	box.position = (view - box.size) * 0.5


func _unhandled_input(event: InputEvent) -> void:
	var key := event as InputEventKey
	if key != null and key.pressed and not key.echo:
		var i := [KEY_1, KEY_2, KEY_3].find(key.physical_keycode)
		if i >= 0 and i < _ids.size():
			_choose(i)


## Three different blessings that can still be taken.
func _roll() -> Array[String]:
	var pool: Array[String] = []
	for id: String in GameData.BOONS:
		if player.mod(id) < int(GameData.BOONS[id]["max"]):
			pool.append(id)
	pool.shuffle()
	var out: Array[String] = []
	for id in pool.slice(0, 3):
		out.append(id)
	return out


func _card(id: String, index: int) -> Button:
	var data: Dictionary = GameData.BOONS[id]
	var b := Button.new()
	b.custom_minimum_size = Vector2(250.0, 230.0)
	b.focus_mode = Control.FOCUS_NONE
	for state in ["normal", "hover", "pressed"]:
		var st := StyleBoxFlat.new()
		st.bg_color = Color(0.09, 0.08, 0.16, 0.96) if state == "normal" else Color(0.2, 0.15, 0.08)
		st.border_color = GOLD
		st.set_border_width_all(3 if state == "normal" else 5)
		st.set_corner_radius_all(14)
		b.add_theme_stylebox_override(state, st)
	b.pressed.connect(_choose.bind(index))
	var col := VBoxContainer.new()
	col.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 16)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 12)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(col)
	var taken := player.mod(id)
	col.add_child(_text("[%d]" % (index + 1), 16, Color(1, 1, 1, 0.5)))
	col.add_child(_text(String(data["name"]), 26, GOLD))
	var tier := "ใหม่!" if taken == 0 else "ระดับ %d → %d" % [taken, taken + 1]
	col.add_child(_text(tier, 15, Color(0.6, 0.9, 1.0)))
	col.add_child(_text(String(data["desc"]), 19, Color.WHITE))
	return b


func _text(content: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = content
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(218.0, 0.0)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _choose(index: int) -> void:
	if _ids.is_empty():
		return
	var id := _ids[index]
	_ids.clear()
	get_tree().paused = false
	picked.emit(id)
	queue_free()

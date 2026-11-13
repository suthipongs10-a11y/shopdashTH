class_name TouchControls
extends CanvasLayer
## On-screen controls for phones and tablets: a virtual joystick on the left half and skill
## buttons on the right. Multi-touch: walk with one thumb while pressing skills with the other.
## Buttons press the same input actions as the keyboard, so the game logic is unchanged.

const JOY_RADIUS := 90.0
const KNOB_RADIUS := 38.0
const GOLD := Color(1.0, 0.8, 0.35)

var player: Player
## Ground-plane movement from the joystick, length 0..1.
var move := Vector2.ZERO

var _canvas: Node2D
var _joy_index := -1
var _joy_center := Vector2.ZERO
var _joy_knob := Vector2.ZERO
## action -> touch index holding it.
var _held := {}
## [action, skill id or "", centre, radius] laid out each frame from the screen size.
var _buttons: Array = []
var _icons := {}


func _ready() -> void:
	layer = 12
	_canvas = Node2D.new()
	_canvas.draw.connect(_draw_controls)
	add_child(_canvas)
	for id: String in GameData.SKILL_ORDER:
		var path := "res://art/ui/skills/%s.png" % id
		if ResourceLoader.exists(path):
			_icons[id] = load(path)


func _process(_delta: float) -> void:
	_layout()
	_canvas.queue_redraw()


func _layout() -> void:
	var view := get_viewport().get_visible_rect().size
	var base := Vector2(view.x - 120.0, view.y - 120.0)
	_buttons = [["attack", "attack", base, 62.0]]
	# Skills on an arc around the attack button, ultimates on the outer ring.
	var inner := ["skill_q", "skill_e", "skill_r", "skill_1"]
	var outer := ["skill_f", "skill_2", "skill_3"]
	for i in inner.size():
		var a := deg_to_rad(180.0 + 30.0 * i)
		_buttons.append([inner[i], _skill_for(inner[i]), base + Vector2.from_angle(a) * 150.0,
			36.0])
	for i in outer.size():
		var a := deg_to_rad(196.0 + 32.0 * i)
		_buttons.append([outer[i], _skill_for(outer[i]), base + Vector2.from_angle(a) * 255.0,
			40.0])
	_buttons.append(["dodge", "", base + Vector2(50.0, -250.0), 36.0])


static func _skill_for(action: String) -> String:
	return GameData.SKILL_ORDER[GameData.SKILL_ACTIONS.find(action) + 1]


func _input(event: InputEvent) -> void:
	var touch := event as InputEventScreenTouch
	if touch != null:
		if touch.pressed:
			_press(touch.index, touch.position)
		else:
			_release(touch.index)
		return
	var drag := event as InputEventScreenDrag
	if drag != null and drag.index == _joy_index:
		_set_knob(drag.position)


func _press(index: int, at: Vector2) -> void:
	for b: Array in _buttons:
		if at.distance_to(b[2]) <= float(b[3]) * 1.15:
			Input.action_press(String(b[0]))
			_held[String(b[0])] = index
			get_viewport().set_input_as_handled()
			return
	var view := get_viewport().get_visible_rect().size
	if at.x < view.x * 0.5 and _joy_index < 0:
		_joy_index = index
		_joy_center = at
		_set_knob(at)
		get_viewport().set_input_as_handled()


func _release(index: int) -> void:
	if index == _joy_index:
		_joy_index = -1
		move = Vector2.ZERO
	for action: String in _held.keys():
		if int(_held[action]) == index:
			Input.action_release(action)
			_held.erase(action)


func _set_knob(at: Vector2) -> void:
	var offset := (at - _joy_center).limit_length(JOY_RADIUS)
	_joy_knob = _joy_center + offset
	var v := offset / JOY_RADIUS
	# Screen up/down maps to the ground plane's depth axis.
	move = Vector2(v.x, v.y) if v.length() > 0.15 else Vector2.ZERO


func _draw_controls() -> void:
	var font := ThemeDB.fallback_font
	if _joy_index >= 0:
		_canvas.draw_circle(_joy_center, JOY_RADIUS, Color(0, 0, 0, 0.25))
		_canvas.draw_arc(_joy_center, JOY_RADIUS, 0.0, TAU, 48, Color(1, 1, 1, 0.35), 3.0)
		_canvas.draw_circle(_joy_knob, KNOB_RADIUS, Color(1.0, 0.85, 0.5, 0.55))
	else:
		var view := get_viewport().get_visible_rect().size
		var hint := Vector2(150.0, view.y - 150.0)
		_canvas.draw_arc(hint, JOY_RADIUS, 0.0, TAU, 48, Color(1, 1, 1, 0.18), 3.0)
		_canvas.draw_string(font, hint + Vector2(-60.0, 6.0), "แตะค้างเพื่อเดิน",
			HORIZONTAL_ALIGNMENT_CENTER, 120.0, 16, Color(1, 1, 1, 0.45))
	for b: Array in _buttons:
		_draw_button(String(b[0]), String(b[1]), b[2], float(b[3]), font)


func _draw_button(action: String, id: String, at: Vector2, r: float, font: Font) -> void:
	var held := _held.has(action)
	_canvas.draw_circle(at, r, Color(0.06, 0.06, 0.12, 0.75 if held else 0.55))
	if _icons.has(id):
		var tex: Texture2D = _icons[id]
		var s := r * 1.35
		_canvas.draw_texture_rect(tex, Rect2(at - Vector2(s, s) * 0.5, Vector2(s, s)), false,
			Color(1, 1, 1, 0.9))
	var label := "หลบ" if action == "dodge" else (
		String(GameData.SKILLS[id]["short"]) if id != "" else "")
	if not _icons.has(id):
		_canvas.draw_string(font, at + Vector2(-r, 6.0), label, HORIZONTAL_ALIGNMENT_CENTER,
			r * 2.0, 15, Color.WHITE)
	_canvas.draw_arc(at, r, 0.0, TAU, 40, GOLD if not held else Color.WHITE, 3.0)
	if not is_instance_valid(player):
		return
	var left := player.dodge_cooldown if action == "dodge" else (
		float(player.cooldowns.get(id, 0.0)) if id != "" else 0.0)
	if left > 0.05:
		_canvas.draw_circle(at, r - 2.0, Color(0, 0, 0, 0.55))
		_canvas.draw_string(font, at + Vector2(-r, 7.0), "%.0f" % ceilf(left),
			HORIZONTAL_ALIGNMENT_CENTER, r * 2.0, 20, Color.WHITE)
	elif id != "" and player.sp < float(GameData.SKILLS[id]["sp"]):
		_canvas.draw_circle(at, r - 2.0, Color(0.1, 0.15, 0.5, 0.5))

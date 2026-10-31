## Combat HUD drawn in one Control. Thumb buttons are drawn here but their touches
## are routed by CombatScreen.hit_test so a button press can never move the ship,
## and a second finger can press Dash while the first keeps dragging.
extends Control

const TOP_PANEL_H := 132.0
const BUTTON_PAD := 12.0

var screen: Node  # CombatScreen
var insets := {"top": 0.0, "bottom": 0.0, "left": 0.0, "right": 0.0}
var font: Font
var bold: Font
## action -> {center: Vector2, radius: float, key: String}
var buttons: Dictionary = {}
var _flash := {}  # action -> seconds of press highlight


func _ready() -> void:
	size = SafeArea.LOGICAL
	mouse_filter = MOUSE_FILTER_IGNORE
	font = ThemeFactory.font()
	bold = ThemeFactory.font(true)
	layout(SafeArea.logical_insets(), "right")


func layout(new_insets: Dictionary, handedness: String) -> void:
	insets = new_insets
	var by: float = 1280.0 - float(insets["bottom"]) - 96.0
	var mirror := handedness == "left"
	var x := func(v: float) -> float: return 720.0 - v if mirror else v
	buttons = {
		"dash": {"center": Vector2(x.call(612.0), by), "radius": 78.0, "key": "ui.hud.dash"},
		"overdrive": {"center": Vector2(x.call(452.0), by + 24.0), "radius": 60.0, "key": "ui.hud.overdrive"},
		"ability": {"center": Vector2(x.call(108.0), by + 24.0), "radius": 60.0, "key": "ui.hud.ability"},
		"pause": {"center": Vector2(x.call(668.0), float(insets["top"]) + 40.0), "radius": 36.0, "key": "ui.hud.pause"},
	}


## Returns the action under a logical-space point, or "".
func hit_test(p: Vector2) -> String:
	for action in buttons:
		var b: Dictionary = buttons[action]
		if p.distance_to(b["center"]) <= b["radius"] + BUTTON_PAD:
			return action
	return ""


func flash(action: String) -> void:
	_flash[action] = 0.15


func _process(delta: float) -> void:
	for k in _flash.keys():
		_flash[k] -= delta
		if _flash[k] <= 0.0:
			_flash.erase(k)
	queue_redraw()


func _draw() -> void:
	if screen == null:
		return
	var sim: SandboxSim = screen.sim
	var top: float = insets["top"]
	draw_rect(Rect2(0, 0, 720, top + TOP_PANEL_H), Palette.UI_PANEL)
	draw_line(Vector2(0, top + TOP_PANEL_H), Vector2(720, top + TOP_PANEL_H), Palette.UI_EDGE, 2.0)
	var h := sim.assembly.hull
	_bar(Vector2(20, top + 14), 300, tr("ui.hud.hp"), sim.hp / h.hp, Palette.HP)
	_bar(Vector2(20, top + 52), 300, tr("ui.hud.shield"), sim.shield / maxf(h.shield, 1.0), Palette.SHIELD)
	_bar(Vector2(340, top + 14), 280, tr("ui.hud.energy"), sim.weapons.energy / sim.weapons.energy_capacity, Palette.PLAYER_CYAN)
	_bar(Vector2(340, top + 52), 280, tr("ui.hud.overdrive"), sim.overdrive_charge / 100.0,
		Palette.PLAYER_ORANGE if sim.overdrive_left <= 0.0 else Palette.FRIENDLY_GOLD)
	var hx := 20.0
	for m in sim.weapons.mounts:
		var label := "%s %s" % [tr("weapons.%s.name" % m.weapon.id), tr("ui.hud.overheated") if m.locked else ""]
		_bar(Vector2(hx, top + 90), 300, label, m.heat / WeaponScheduler.HEAT_MAX, Palette.HEAT, 12.0)
		hx += 320.0
	draw_string(font, Vector2(20, top + TOP_PANEL_H + 30), "%s: %d" % [tr("ui.hud.targets"), sim.kills],
		HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Palette.UI_TEXT_DIM)
	draw_string(font, Vector2(20, top + TOP_PANEL_H + 56), tr("ui.hud.sandbox"),
		HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Palette.PLACEHOLDER_TAG)
	draw_string(font, Vector2(20, top + TOP_PANEL_H + 80), "FPS %d · tick %d · shots %d" % [
		Engine.get_frames_per_second(), sim.tick_count, sim.shots.active_count],
		HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Palette.UI_TEXT_DIM)
	_draw_buttons(sim)


func _bar(at: Vector2, width: float, label: String, frac: float, color: Color, height: float = 14.0) -> void:
	draw_string(font, at + Vector2(0, 12), label, HORIZONTAL_ALIGNMENT_LEFT, width, 16, Palette.UI_TEXT_DIM)
	var r := Rect2(at + Vector2(0, 18), Vector2(width, height))
	draw_rect(r, Color(1, 1, 1, 0.08))
	draw_rect(Rect2(r.position, Vector2(width * clampf(frac, 0.0, 1.0), height)), color)


func _draw_buttons(sim: SandboxSim) -> void:
	for action in buttons:
		var b: Dictionary = buttons[action]
		var c: Vector2 = b["center"]
		var r: float = b["radius"]
		var is_ready := true
		var fill := 1.0
		match action:
			"dash":
				fill = 1.0 - sim.motion.dash_cooldown / PlayerMotion.DASH_COOLDOWN_SEC
				is_ready = sim.motion.dash_cooldown <= 0.0
			"overdrive":
				fill = sim.overdrive_charge / 100.0
				is_ready = sim.overdrive_charge >= 100.0 and sim.overdrive_left <= 0.0
			"ability":
				is_ready = false
				fill = 0.0
		var edge := Palette.PLAYER_CYAN if is_ready else Palette.UI_EDGE
		if _flash.has(action):
			edge = Palette.FRIENDLY_GOLD
		draw_circle(c, r, Palette.UI_PANEL)
		if action != "pause" and fill < 1.0:
			draw_arc(c, r - 5.0, -PI / 2, -PI / 2 + TAU * clampf(fill, 0.0, 1.0), 48, Palette.PLAYER_ORANGE, 6.0)
		draw_arc(c, r, 0, TAU, 48, edge, 3.0)
		var text := tr(b["key"])
		if action == "ability":
			text = tr("ui.hud.no_ability")
		elif action == "pause":
			text = "II"
		var size := 22 if r > 50.0 else 18
		draw_string(bold, c + Vector2(-r, size * 0.35), text, HORIZONTAL_ALIGNMENT_CENTER, r * 2.0, size,
			Palette.UI_TEXT if is_ready or action == "pause" else Palette.UI_TEXT_DIM)

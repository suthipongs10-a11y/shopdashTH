## M0 flight sandbox screen. Owns the fixed-step driver, turns device input into
## per-tick sim input, and renders interpolated sim state with placeholder art.
## Visual-only effects (stars, sparks) use render time and never feed back into the sim.
extends Node2D

const HudScript := preload("res://src/ui/hud.gd")
const DRAG_GAIN := 1.0
const DRAG_RESPONSE_PX := 36.0  # finger lead at which input reaches full speed
const MAX_SPARKS := 160

var app: Node
var sim := SandboxSim.new()
var driver := FrameDriver.new()
var hud: Control
var paused := false
var drag_index := -1
var drag_target := Vector2.ZERO
var pending := {"dash": false, "overdrive": false}
var render_time := 0.0
var font: Font
var _pause_layer: CanvasLayer
var _sparks: Array[Dictionary] = []
var _stars: Array = []  # [layer][i] -> Vector3(x, y, size)
var _fx_rng := RandomNumberGenerator.new()


func _init(owner_app: Node) -> void:
	app = owner_app


func _ready() -> void:
	InputBindings.ensure_defaults()
	sim.setup(app.catalog)
	font = ThemeFactory.font()
	_fx_rng.seed = 7
	for layer in 3:
		var pts := []
		for i in 40 + layer * 20:
			pts.append(Vector3(_fx_rng.randf() * 720.0, _fx_rng.randf() * 1280.0, 0.8 + layer * 0.7))
		_stars.append(pts)
	var hud_layer := CanvasLayer.new()
	add_child(hud_layer)
	hud = HudScript.new()
	hud.screen = self
	hud_layer.add_child(hud)
	hud.layout(SafeArea.logical_insets(), str(app.profile["settings"].get("handedness", "right")))
	_build_pause_overlay()


func _process(delta: float) -> void:
	if not paused:
		render_time += delta
	var ticks := driver.advance(delta)
	for i in ticks:
		sim.tick(_collect_input())
		pending["dash"] = false
		pending["overdrive"] = false
	for e in sim.visual_events:
		_spawn_fx(e)
	sim.visual_events.clear()
	_update_sparks(0.0 if paused else delta)
	queue_redraw()


func _collect_input() -> Dictionary:
	var move := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if move == Vector2.ZERO and drag_index >= 0:
		move = ((drag_target - sim.motion.pos) / DRAG_RESPONSE_PX).limit_length(1.0)
	return {"move": move, "dash": pending["dash"], "overdrive": pending["overdrive"], "fire": true}


func _input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		set_paused(not paused)
		get_viewport().set_input_as_handled()
		return
	if paused:
		return
	if event.is_action_pressed("dash"):
		_trigger("dash")
	elif event.is_action_pressed("overdrive"):
		_trigger("overdrive")
	elif event is InputEventScreenTouch:
		handle_touch(event.index, event.position, event.pressed)
	elif event is InputEventScreenDrag:
		handle_drag(event.index, event.relative)


## Touch routing: a press on a HUD button triggers that action only; any other
## press becomes the (single) movement drag. Public for tests.
func handle_touch(index: int, at: Vector2, pressed: bool) -> void:
	if pressed:
		var action: String = hud.hit_test(at)
		if not action.is_empty():
			_trigger(action)
			return
		if drag_index < 0:
			drag_index = index
			drag_target = sim.motion.pos
	elif index == drag_index:
		drag_index = -1


func handle_drag(index: int, relative: Vector2) -> void:
	if index != drag_index:
		return
	var b := SandboxSim.PLAYER_BOUNDS
	drag_target = (drag_target + relative * DRAG_GAIN).clamp(b.position, b.end)


func _trigger(action: String) -> void:
	hud.flash(action)
	match action:
		"dash", "overdrive":
			pending[action] = true
		"pause":
			set_paused(true)


func set_paused(value: bool) -> void:
	paused = value
	driver.paused = value
	drag_index = -1
	pending["dash"] = false
	pending["overdrive"] = false
	if _pause_layer != null:
		_pause_layer.visible = value


func pause_for_background() -> void:
	set_paused(true)


func _build_pause_overlay() -> void:
	_pause_layer = CanvasLayer.new()
	_pause_layer.layer = 10
	_pause_layer.visible = false
	add_child(_pause_layer)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.6)
	dim.size = Vector2(720, 1280)
	_pause_layer.add_child(dim)
	var panel := Panel.new()
	panel.position = Vector2(110, 440)
	panel.size = Vector2(500, 380)
	_pause_layer.add_child(panel)
	var box := VBoxContainer.new()
	box.position = Vector2(150, 480)
	box.size = Vector2(420, 300)
	box.add_theme_constant_override("separation", 24)
	_pause_layer.add_child(box)
	var title := Label.new()
	title.text = "ui.pause.title"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 40)
	box.add_child(title)
	var resume := Button.new()
	resume.text = "ui.pause.resume"
	resume.custom_minimum_size = Vector2(0, 90)
	resume.add_theme_font_size_override("font_size", 32)
	resume.pressed.connect(func(): set_paused(false))
	box.add_child(resume)
	var quit := Button.new()
	quit.text = "ui.pause.quit"
	quit.custom_minimum_size = Vector2(0, 90)
	quit.add_theme_font_size_override("font_size", 32)
	quit.pressed.connect(func(): app.show_title())
	box.add_child(quit)


# --- visual-only effects -----------------------------------------------------

func _spawn_fx(e: Dictionary) -> void:
	var count := 0
	var color := Palette.FRIENDLY_GOLD
	match e["type"]:
		"hit":
			count = 5
		"kill":
			count = 18
			color = Palette.PLAYER_ORANGE
		"muzzle":
			count = 1
			color = Palette.PLAYER_CYAN if e.get("family") == "beam" else Palette.FRIENDLY_GOLD
		"overdrive":
			count = 24
			color = Palette.FRIENDLY_GOLD
	for i in count:
		if _sparks.size() >= MAX_SPARKS:
			_sparks.pop_front()
		var ang := _fx_rng.randf() * TAU
		var spd := _fx_rng.randf_range(60.0, 260.0)
		var life := _fx_rng.randf_range(0.15, 0.4)
		_sparks.append({"p": e["pos"], "v": Vector2.from_angle(ang) * spd, "life": life, "max": life, "c": color})


func _update_sparks(dt: float) -> void:
	for s in _sparks:
		s["p"] += s["v"] * dt
		s["v"] *= 0.9
		s["life"] -= dt
	_sparks = _sparks.filter(func(s): return s["life"] > 0.0)


func _draw() -> void:
	var a := driver.alpha()
	draw_rect(Rect2(0, 0, 720, 1280), Palette.BG_DEEP)
	draw_circle(Vector2(560, fposmod(300 + render_time * 8.0, 1600) - 160), 220, Color(Palette.BG_TEAL, 0.35))
	for layer in _stars.size():
		var speed := 20.0 + layer * 35.0
		for s in _stars[layer]:
			var y := fposmod(s.y + render_time * speed, 1280.0)
			draw_circle(Vector2(s.x, y), s.z, Color(Palette.STAR, 0.25 + layer * 0.2))
	for t in sim.targets:
		if t["alive"]:
			_draw_target(t, (t["prev_pos"] as Vector2).lerp(t["pos"], a))
	for b in sim.beams:
		draw_line(b["from"], b["to"], Color(Palette.PLAYER_CYAN, 0.8), 6.0)
		draw_line(b["from"], b["to"], Color.WHITE, 2.0)
	var shots := sim.shots
	for i in ProjectileSystem.CAPACITY:
		if shots.alive[i] == 1:
			var p := shots.prev_pos[i].lerp(shots.pos[i], a)
			draw_line(p + Vector2(0, 10), p - Vector2(0, 6), Palette.FRIENDLY_GOLD, 4.0)
			draw_circle(p - Vector2(0, 6), 2.0, Color.WHITE)
	_draw_ship(sim.motion.prev_pos.lerp(sim.motion.pos, a))
	for s in _sparks:
		draw_circle(s["p"], 2.5 * (s["life"] / s["max"]) + 0.5, Color(s["c"], s["life"] / s["max"]))


func _draw_target(t: Dictionary, p: Vector2) -> void:
	var r := SandboxSim.TARGET_RADIUS
	var pts := PackedVector2Array()
	for i in 8:
		pts.append(p + Vector2.from_angle(PI / 8 + i * TAU / 8) * r)
	draw_colored_polygon(pts, Color.WHITE if t["flash"] > 0.0 else Palette.HOSTILE_GRAPHITE)
	pts.append(pts[0])
	draw_polyline(pts, Palette.HOSTILE_RED, 3.0)
	draw_circle(p, 7, Palette.HOSTILE_MAGENTA)
	var frac: float = t["hp"] / SandboxSim.TARGET_HP
	draw_rect(Rect2(p + Vector2(-r, -r - 12), Vector2(r * 2 * frac, 5)), Palette.HOSTILE_RED)
	draw_string(font, p + Vector2(-60, r + 22), "placeholder", HORIZONTAL_ALIGNMENT_CENTER, 120, 14, Palette.PLACEHOLDER_TAG)


func _draw_ship(p: Vector2) -> void:
	var m := sim.motion
	if m.is_dashing():
		for k in 3:
			_ship_hull(p - m.dash_dir * (14.0 + k * 14.0), Color(Palette.PLAYER_CYAN, 0.25 - k * 0.07))
	var flame := 18.0 + sin(render_time * 40.0) * 4.0
	for ex in [-10.0, 10.0]:
		draw_colored_polygon(PackedVector2Array([p + Vector2(ex - 5, 34), p + Vector2(ex + 5, 34), p + Vector2(ex, 34 + flame)]),
			Color(Palette.PLAYER_CYAN, 0.85))
	_ship_hull(p, Palette.PLAYER_IVORY)
	for it in sim.assembly.items:
		var heat := 0.0
		for mount in sim.weapons.mounts:
			if mount.weapon == it["weapon"]:
				heat = mount.heat / WeaponScheduler.HEAT_MAX
		for c in it["cells"]:
			var cp := p + Defs.cell_to_local(c)
			var col := Palette.PLAYER_CHARCOAL.lerp(Palette.HEAT, heat * 0.8)
			draw_rect(Rect2(cp - Vector2(8, 9), Vector2(16, 18)), col)
			draw_rect(Rect2(cp - Vector2(8, 9), Vector2(16, 18)), Palette.PLAYER_ORANGE, false, 1.5)
	draw_circle(p, 12, Color(Palette.PLAYER_CYAN, 0.35))
	draw_circle(p, 6, Palette.PLAYER_CYAN)
	if m.is_invulnerable():
		draw_arc(p, 46, 0, TAU, 40, Color(Palette.PLAYER_CYAN, 0.9), 2.0)
	draw_string(font, p + Vector2(-60, 66), "placeholder", HORIZONTAL_ALIGNMENT_CENTER, 120, 14, Palette.PLACEHOLDER_TAG)


func _ship_hull(p: Vector2, color: Color) -> void:
	var hull := PackedVector2Array([
		Vector2(0, -62), Vector2(10, -30), Vector2(14, -6), Vector2(40, 14), Vector2(40, 24),
		Vector2(14, 22), Vector2(12, 36), Vector2(-12, 36), Vector2(-14, 22), Vector2(-40, 24),
		Vector2(-40, 14), Vector2(-14, -6), Vector2(-10, -30),
	])
	for i in hull.size():
		hull[i] += p
	draw_colored_polygon(hull, color)
	if color.a >= 1.0:
		hull.append(hull[0])
		draw_polyline(hull, Palette.PLAYER_CHARCOAL, 2.0)
		draw_line(p + Vector2(-40, 19), p + Vector2(-26, 17), Palette.PLAYER_ORANGE, 4.0)
		draw_line(p + Vector2(40, 19), p + Vector2(26, 17), Palette.PLAYER_ORANGE, 4.0)

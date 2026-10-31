extends TestCase

const CombatScreenScript := preload("res://src/ui/combat_screen.gd")


func _screen() -> Node2D:
	var fake := GDScript.new()
	fake.source_code = "extends Node\nvar catalog\nvar profile\nfunc show_title():\n\tpass\n"
	fake.reload()
	var app: Node = fake.new()
	app.catalog = Catalog.load_from()
	app.profile = SaveRepository.default_profile()
	tree.root.add_child(app)
	var s: Node2D = CombatScreenScript.new(app)
	app.add_child(s)
	s.hud.layout({"top": 0.0, "bottom": 0.0, "left": 0.0, "right": 0.0}, "right")
	return s


func test_button_touch_never_starts_movement_drag() -> void:
	var s := _screen()
	var dash_at: Vector2 = s.hud.buttons["dash"]["center"]
	s.handle_touch(0, dash_at, true)
	eq(s.drag_index, -1, "dash press does not start a drag")
	check(s.pending["dash"], "dash queued")
	s.handle_touch(0, dash_at, false)
	s.get_parent().queue_free()


func test_second_finger_can_dash_while_first_drags() -> void:
	var s := _screen()
	s.handle_touch(0, Vector2(360, 600), true)
	eq(s.drag_index, 0, "flight-area touch starts drag")
	var start: Vector2 = s.drag_target
	s.handle_drag(0, Vector2(100, 0))
	near(s.drag_target.x, start.x + 100.0, 0.001, "relative drag moves target")
	s.handle_drag(1, Vector2(300, 0))
	near(s.drag_target.x, start.x + 100.0, 0.001, "other finger ignored for movement")
	s.handle_touch(1, s.hud.buttons["dash"]["center"], true)
	check(s.pending["dash"], "dash from second finger")
	eq(s.drag_index, 0, "drag continues")
	s.handle_touch(0, Vector2.ZERO, false)
	eq(s.drag_index, -1, "drag released")
	s.get_parent().queue_free()


func test_pause_freezes_simulation_and_clears_input() -> void:
	var s := _screen()
	s._process(0.1)
	var ticks: int = s.sim.tick_count
	check(ticks > 0, "sim advances when running")
	s.handle_touch(0, s.hud.buttons["pause"]["center"], true)
	check(s.paused, "pause button pauses")
	s._process(0.5)
	eq(s.sim.tick_count, ticks, "no ticks while paused")
	s.pause_for_background()
	s._process(0.5)
	eq(s.sim.tick_count, ticks, "background pause holds")
	s.set_paused(false)
	s._process(1.0 / 60.0)
	eq(s.sim.tick_count, ticks + 1, "resumes without catch-up burst")
	s.get_parent().queue_free()

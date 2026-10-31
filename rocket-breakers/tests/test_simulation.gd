extends TestCase


static func scripted_input(tick: int) -> Dictionary:
	return {
		"move": Vector2(sin(tick * 0.05), cos(tick * 0.031) * 0.6),
		"dash": tick % 200 == 50,
		"overdrive": tick % 120 == 0,
		"fire": true,
	}


func _run_with_frames(frame_dt: Callable, ticks: int) -> int:
	var sim := SandboxSim.new()
	sim.setup(Catalog.load_from())
	var driver := FrameDriver.new()
	var frame := 0
	while sim.tick_count < ticks:
		var n := driver.advance(frame_dt.call(frame))
		for i in n:
			if sim.tick_count < ticks:
				sim.tick(scripted_input(sim.tick_count))
		frame += 1
	return sim.state_hash()


func test_same_state_at_30_60_144_hz_and_jitter() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 99
	var jitter := []
	for i in 4000:
		jitter.append(rng.randf_range(0.004, 0.045))
	var h60 := _run_with_frames(func(_f): return 1.0 / 60.0, 900)
	eq(_run_with_frames(func(_f): return 1.0 / 30.0, 900), h60, "30 Hz render matches 60 Hz")
	eq(_run_with_frames(func(_f): return 1.0 / 144.0, 900), h60, "144 Hz render matches 60 Hz")
	eq(_run_with_frames(func(f): return jitter[f], 900), h60, "jittery frames match 60 Hz")


func test_frame_driver_tick_counts() -> void:
	var d := FrameDriver.new()
	var total := 0
	for i in 144:
		total += d.advance(1.0 / 144.0)
	eq(total, 60, "144 frames of 1/144s = 60 ticks")
	eq(d.advance(1.0 / 30.0), 2, "30 Hz frame = 2 ticks")
	eq(d.advance(5.0), FrameDriver.new().max_ticks_per_frame, "long frame capped")
	d.paused = true
	eq(d.advance(1.0), 0, "paused driver does not advance")


func test_projectile_speed_is_per_second_not_per_frame() -> void:
	var p := ProjectileSystem.new()
	var i := p.spawn(Vector2(360, 1200), Vector2.UP * 900.0, 3.0, 8.0)
	for k in 60:
		p.move(FrameDriver.TICK_SEC, Rect2(0, 0, 720, 1280))
	near(p.pos[i].y, 300.0, 0.01, "900 px/s for one second")


func test_swept_collision_catches_fast_shots() -> void:
	# 100 px per tick would skip a 26 px target with point-only checks.
	check(ProjectileSystem.segment_hits_circle(Vector2(0, 100), Vector2(0, 0), Vector2(0, 50), 26.0), "swept hit")
	check(not ProjectileSystem.segment_hits_circle(Vector2(60, 100), Vector2(60, 0), Vector2(0, 50), 26.0), "clean miss")
	near(ProjectileSystem.ray_circle_entry(Vector2(0, 600), Vector2(0, 0), Vector2(0, 200), 26.0), 374.0, 0.01, "beam entry distance")


func test_sandbox_shooting_destroys_targets_and_charges_overdrive() -> void:
	var sim := SandboxSim.new()
	sim.setup(Catalog.load_from())
	sim.motion.pos = Vector2(sim.targets[1]["base"].x, 700)
	for i in 60 * 8:
		var dx: float = sim.targets[1]["pos"].x - sim.motion.pos.x
		sim.tick({"move": Vector2(clampf(dx / 30.0, -1, 1), 0), "fire": true})
	check(sim.kills >= 1, "starter guns destroy a target")
	near(sim.overdrive_charge, minf(sim.kills * SandboxSim.KILL_CHARGE, 100.0), 0.001, "kill charge")
	check(sim.shots.active_count <= ProjectileSystem.CAPACITY, "bullet budget respected")

extends TestCase

const DT := FrameDriver.TICK_SEC


func _motion() -> PlayerMotion:
	var m := PlayerMotion.new()
	m.base_speed = 360.0
	m.mass_cap = 28.0
	m.fitted_mass = 7.0
	m.bounds = Rect2(0, 0, 720, 1280)
	m.pos = Vector2(360, 640)
	return m


func test_effective_speed_formula_and_clamp() -> void:
	var m := _motion()
	near(m.effective_speed(), 337.5, 0.001, "fitted mass 7/28")
	m.towing = true
	m.cargo_mass = 20.0
	near(m.effective_speed(), 360.0 * 0.5875, 0.001, "towing max cargo")
	m.fitted_mass = 28.0
	near(m.effective_speed(), 360.0 * 0.55, 0.001, "hard minimum 55% base")


func test_acceleration_deceleration_and_diagonal() -> void:
	var m := _motion()
	m.step(Vector2.RIGHT, false, DT)
	near(m.vel.x, 1800.0 * DT, 0.001, "one tick of acceleration")
	for i in 60:
		m.step(Vector2.RIGHT, false, DT)
	near(m.vel.x, m.effective_speed(), 0.001, "reaches effective speed")
	m.step(Vector2.ZERO, false, DT)
	near(m.vel.x, m.effective_speed() - 2200.0 * DT, 0.001, "one tick of deceleration")
	var d := _motion()
	for i in 120:
		d.step(Vector2(1, 1), false, DT)
	check(d.vel.length() <= d.effective_speed() + 0.001, "diagonal clamped to speed")


func test_assembly_half_width_clamps_to_screen() -> void:
	var m := _motion()
	m.half_width = 33.0
	for i in 300:
		m.step(Vector2.LEFT, false, DT)
	near(m.pos.x, 33.0, 0.001, "whole assembly stays on screen")
	eq(m.vel.x, 0.0, "velocity zeroed at wall")


func test_dash_invulnerability_and_cooldown() -> void:
	var m := _motion()
	m.step(Vector2.RIGHT, true, DT)
	check(m.is_dashing() and m.is_invulnerable(), "dash starts")
	for i in 9:
		m.step(Vector2.ZERO, false, DT)
	check(m.is_invulnerable(), "still invulnerable at 10 ticks (0.167s)")
	m.step(Vector2.ZERO, false, DT)
	check(not m.is_invulnerable(), "invulnerability ends after 0.18s")
	check(not m.try_dash(), "cooldown blocks second dash")
	for i in 140:
		m.step(Vector2.ZERO, false, DT)
	check(m.try_dash(), "dash ready after 2.5s")


func _w001_scheduler() -> WeaponScheduler:
	var s := WeaponScheduler.new()
	s.add_mount(Catalog.load_from().weapon("W001"), Vector2.ZERO)
	return s


func test_fire_rate_matches_catalog_and_overdrive() -> void:
	var s := _w001_scheduler()
	var shots := 0
	for i in 60:
		shots += s.tick(DT, true, false).size()
	eq(shots, 8, "W001 8 shots/sec")
	var o := _w001_scheduler()
	shots = 0
	for i in 60:
		shots += o.tick(DT, true, true).size()
	eq(shots, 12, "Overdrive fire rate x1.5")


func test_no_energy_or_blocked_muzzle_spends_nothing() -> void:
	var s := _w001_scheduler()
	s.energy = 0.0
	s.energy_regen = 0.0
	eq(s.tick(DT, true, false).size(), 0, "no shot without energy")
	eq(s.mounts[0].heat, 0.0, "no heat without shot")
	var b := _w001_scheduler()
	b.mounts[0].blocked = true
	eq(b.tick(DT, true, false).size(), 0, "blocked muzzle suppresses shot")
	eq(b.energy, 100.0, "blocked shot spends no energy")


func test_heat_lock_and_recovery() -> void:
	var s := _w001_scheduler()
	s.energy_regen = 1000.0
	var t := 0
	while not s.mounts[0].locked and t < 60 * 60:
		s.tick(DT, true, false)
		t += 1
	check(s.mounts[0].locked, "continuous fire eventually overheats")
	var locked_ticks := 0
	var shots_while_locked := 0
	while s.mounts[0].locked:
		shots_while_locked += s.tick(DT, true, false).size()
		locked_ticks += 1
	eq(shots_while_locked, 0, "no shots while heat-locked")
	check(locked_ticks * DT >= WeaponScheduler.HEAT_MIN_LOCK_SEC, "minimum lock duration")
	check(s.mounts[0].heat <= WeaponScheduler.HEAT_UNLOCK, "unlocks at <=55 heat")

## M0 flight sandbox world: player assembly, starter guns, training targets.
## Deterministic fixed-tick simulation; rendering reads state, never mutates it.
## Tick order follows TECHNICAL: input → spawn → movement → weapons →
## projectile movement/swept collision → damage → transitions → objectives → visual events.
class_name SandboxSim
extends RefCounted

const WORLD := Rect2(0, 0, 720, 1280)
const PLAYER_BOUNDS := Rect2(0, 110, 720, 930)  # keeps ship above bottom thumb controls
const TARGET_COUNT := 3
const TARGET_HP := 60.0
const TARGET_RADIUS := 26.0
const TARGET_RESPAWN_SEC := 2.0
const KILL_CHARGE := 5.0  # Overdrive charge per kill (AGENTS: 1–5 depending on enemy)
const OVERDRIVE_SEC := 5.0
const KINETIC_RADIUS := 3.0
const BEAM_VISUAL_SEC := 0.08

var catalog: Catalog
var assembly: Assembly
var motion := PlayerMotion.new()
var weapons := WeaponScheduler.new()
var shots := ProjectileSystem.new()
var tick_count := 0
var hp := 100.0
var shield := 25.0
var overdrive_charge := 0.0
var overdrive_left := 0.0
var targets: Array[Dictionary] = []
var kills := 0
## Transient visual events for the renderer: {type, pos, ...}. Cleared by the consumer.
var visual_events: Array[Dictionary] = []
## Active pulse-beam visuals: {from, to, ttl}
var beams: Array[Dictionary] = []
var _mount_items := {}  # Mount -> assembly item


func setup(cat: Catalog, hull_id: String = "H01") -> void:
	catalog = cat
	var h := cat.hull(hull_id)
	assembly = Assembly.from_starter(h, cat)
	hp = h.hp
	shield = h.shield
	motion.base_speed = h.base_speed
	motion.mass_cap = h.mass_cap
	motion.fitted_mass = assembly.fitted_mass()
	motion.half_width = assembly.half_width()
	motion.bounds = PLAYER_BOUNDS
	motion.pos = Vector2(WORLD.size.x * 0.5, 900)
	motion.prev_pos = motion.pos
	weapons.energy_capacity = h.reactor_capacity
	weapons.energy = h.reactor_capacity
	weapons.energy_regen = h.energy_regen
	for it in assembly.items:
		var m := weapons.add_mount(it["weapon"], assembly.muzzle_local(it))
		_mount_items[m] = it
	for i in TARGET_COUNT:
		targets.append({"id": i, "base": Vector2(180 + i * 180, 260 + (i % 2) * 90), "pos": Vector2.ZERO,
			"prev_pos": Vector2.ZERO, "hp": TARGET_HP, "alive": true, "respawn": 0.0, "flash": 0.0})
	_move_targets(0.0)
	for t in targets:
		t["prev_pos"] = t["pos"]


## input: {move: Vector2, dash: bool, overdrive: bool, fire: bool}
func tick(input: Dictionary) -> void:
	var dt := FrameDriver.TICK_SEC
	tick_count += 1
	# spawn
	for t in targets:
		if not t["alive"]:
			t["respawn"] -= dt
			if t["respawn"] <= 0.0:
				t["alive"] = true
				t["hp"] = TARGET_HP
	# movement
	motion.step(input.get("move", Vector2.ZERO), input.get("dash", false), dt)
	_move_targets(dt)
	if input.get("overdrive", false) and overdrive_charge >= 100.0 and overdrive_left <= 0.0:
		overdrive_charge = 0.0
		overdrive_left = OVERDRIVE_SEC
		visual_events.append({"type": "overdrive", "pos": motion.pos})
	var od := overdrive_left > 0.0
	overdrive_left = maxf(overdrive_left - dt, 0.0)
	# weapons
	for m in weapons.tick(dt, input.get("fire", true), od):
		_fire(m)
	# projectile movement + swept collision + damage
	shots.move(dt, WORLD)
	for i in ProjectileSystem.CAPACITY:
		if shots.alive[i] == 0:
			continue
		for t in targets:
			if t["alive"] and ProjectileSystem.segment_hits_circle(shots.prev_pos[i], shots.pos[i], t["pos"], TARGET_RADIUS + shots.radius[i]):
				_damage_target(t, shots.damage[i], shots.pos[i])
				shots.kill(i)
				break
	# visual timers
	for b in beams:
		b["ttl"] -= dt
	beams = beams.filter(func(b): return b["ttl"] > 0.0)
	for t in targets:
		t["flash"] = maxf(t["flash"] - dt, 0.0)


func _fire(m: WeaponScheduler.Mount) -> void:
	var muzzle := motion.pos + m.local_muzzle
	var w := m.weapon
	visual_events.append({"type": "muzzle", "pos": muzzle, "family": w.family})
	match w.attack_model:
		"pulse_beam":
			var reach := float(w.special_params.get("range", 600))
			var end := muzzle + Vector2.UP * reach
			var best_t: Dictionary = {}
			var best_d := INF
			for t in targets:
				if not t["alive"]:
					continue
				var d := ProjectileSystem.ray_circle_entry(muzzle, end, t["pos"], TARGET_RADIUS)
				if d >= 0.0 and d < best_d:
					best_d = d
					best_t = t
			if not best_t.is_empty():
				end = muzzle + Vector2.UP * best_d
				_damage_target(best_t, w.damage, end)
			beams.append({"from": muzzle, "to": end, "ttl": float(w.special_params.get("pulse_duration", BEAM_VISUAL_SEC))})
		_:
			var speed := float(w.special_params.get("speed", 800))
			for k in w.projectiles_per_trigger:
				shots.spawn(muzzle, Vector2.UP * speed, KINETIC_RADIUS, w.damage)


func _damage_target(t: Dictionary, dmg: float, at: Vector2) -> void:
	t["hp"] -= dmg
	t["flash"] = 0.08
	visual_events.append({"type": "hit", "pos": at})
	if t["hp"] <= 0.0 and t["alive"]:
		t["alive"] = false
		t["respawn"] = TARGET_RESPAWN_SEC
		kills += 1
		overdrive_charge = minf(overdrive_charge + KILL_CHARGE, 100.0)
		visual_events.append({"type": "kill", "pos": t["pos"]})


func _move_targets(_dt: float) -> void:
	var phase := tick_count * FrameDriver.TICK_SEC
	for t in targets:
		t["prev_pos"] = t["pos"]
		t["pos"] = t["base"] + Vector2(sin(phase * 0.9 + t["id"] * 2.1) * 70.0, sin(phase * 0.6 + t["id"]) * 20.0)


## Stable digest of gameplay state, used to prove frame-rate independence.
func state_hash() -> int:
	var parts: Array = [tick_count, snappedf(motion.pos.x, 0.001), snappedf(motion.pos.y, 0.001),
		snappedf(motion.vel.x, 0.001), snappedf(motion.vel.y, 0.001), snappedf(weapons.energy, 0.001),
		shots.active_count, shots.next_id, kills, snappedf(overdrive_charge, 0.001)]
	for m in weapons.mounts:
		parts.append(snappedf(m.heat, 0.001))
	for t in targets:
		parts.append(snappedf(t["hp"], 0.001))
	return str(parts).hash()

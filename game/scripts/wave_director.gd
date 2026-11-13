class_name WaveDirector
extends Node2D
## Crown Defense: runs the waves. Each wave spawns monsters at the gates on a schedule; they
## march on the Crown Shrine. A wave ends when everything it spawned is dead. Bosses come on
## BOSS_WAVES. Clearing the last wave wins; losing the shrine loses.
## Lives in the ground-effect layer and draws the gates and the lanes to the shrine.

signal monster_killed(monster: Monster)
signal wave_started(number: int)
signal wave_cleared(number: int)
signal boss_spawned(boss: Boss)
signal finished(won: bool)
signal built(slot: BuildSlot)

enum Phase { PREP, WAVE, OVER }

const WAVES := 10
const BOSS_WAVES := [5, 10]
const FIRST_PREP := 14.0
const PREP_TIME := 8.0
## Gates around the edge of the map (the shrine stands in the middle).
const GATES := [
	Vector2(260.0, 1200.0), Vector2(3340.0, 1200.0), Vector2(1800.0, 300.0),
	Vector2(1800.0, 2100.0),
]

var world: Node2D
var player: Player
var crown: Crown
var fx_layer: Node
var ground_layer: Node

var phase := Phase.PREP
var wave := 0
## Seconds until the next wave (during PREP).
var countdown := FIRST_PREP
var kills := 0
var elapsed := 0.0
var slots: Array[BuildSlot] = []

var _queue: Array = []
var _wave_t := 0.0
var _alive := 0
var _gates_open := 2


func _ready() -> void:
	z_index = -5
	_make_slots()
	var arch: Texture2D = null
	if ResourceLoader.exists("res://art/props/gate.png"):
		arch = load("res://art/props/gate.png")
	for i in GATES.size():
		var portal := FxSprite.play(self, "swirl", GATES[i], 230.0, 1.0e6, true,
			Color(0.75, 0.25, 0.9))
		if portal != null:
			portal.spin = -1.2
		if arch != null:
			# The painted arch stands just behind the spawn swirl.
			var s := Sprite2D.new()
			s.texture = arch
			var k := 240.0 / arch.get_height()
			s.scale = Vector2(k, k)
			s.position = GATES[i] + Vector2(0.0, -120.0 - 40.0)
			add_child(s)


func _process(delta: float) -> void:
	if phase == Phase.OVER:
		return
	elapsed += delta
	if phase == Phase.PREP:
		countdown -= delta
		if countdown <= 0.0 or (wave > 0 and Input.is_action_just_pressed("ready")):
			_start_wave()
		queue_redraw()
		return
	_wave_t += delta
	while not _queue.is_empty() and float(_queue[0][2]) <= _wave_t:
		var entry: Array = _queue.pop_front()
		_spawn(String(entry[0]), int(entry[1]))
	if _queue.is_empty() and _alive <= 0:
		_clear_wave()
	if randf() < delta * 8.0:
		var g: Vector2 = GATES[randi() % _gates_open]
		Vfx.glow(g + Vector2(randf_range(-60, 60), randf_range(-20, 20)), 10.0, randf_range(6, 12),
			Color(0.8, 0.3, 1.0), 0.8, Vector3(0, 0, randf_range(40, 90)))


## Two slots beside each lane: one near the shrine, one further out.
func _make_slots() -> void:
	var center := crown.global_position
	for i in GATES.size():
		var gate: Vector2 = GATES[i]
		var lane := GameData.to_ground(gate - center).normalized()
		var side := lane.orthogonal()
		for step: Array in [[330.0, 1.0], [620.0, -1.0]]:
			var ground := lane * float(step[0]) + side * 135.0 * float(step[1])
			var slot := BuildSlot.new()
			slot.player = player
			slot.position = center + GameData.to_screen(ground)
			add_child(slot)
			slots.append(slot)


## The empty or built slot the warden stands on, if any.
func slot_near(at: Vector2) -> BuildSlot:
	for slot in slots:
		if GameData.ground_dist(at, slot.global_position) <= BuildSlot.USE_RANGE:
			return slot
	return null


static func build_cost(kind: String, level: int) -> int:
	return int(GameData.TOWERS[kind]["cost"][level - 1])


## Builds a tower on an empty slot. Returns false when the warden cannot afford it.
func build(slot: BuildSlot, kind: String) -> bool:
	var cost := build_cost(kind, 1)
	if not slot.is_empty() or player.gold < cost:
		return false
	player.gold -= cost
	var t := Tower.new()
	t.kind = kind
	t.player = player
	t.top_fx = fx_layer
	t.ground_fx = ground_layer
	t.position = slot.global_position
	world.add_child(t)
	slot.tower = t
	Vfx.smoke(t.position, 10.0, 40.0, 100.0, Color(0.8, 0.72, 0.6), 0.6, 0.3)
	Vfx.burst(t.position, 50.0, 26, GameData.TOWERS[kind]["color"], 320.0, 10.0, 0.6)
	built.emit(slot)
	return true


func upgrade(slot: BuildSlot) -> bool:
	if slot.is_empty() or slot.tower.level >= 3:
		return false
	var cost := build_cost(slot.tower.kind, slot.tower.level + 1)
	if player.gold < cost:
		return false
	player.gold -= cost
	slot.tower.upgrade()
	return true


## Refund of half of everything spent on the tower.
static func sell_value(t: Tower) -> int:
	var spent := 0
	for lv in t.level:
		spent += build_cost(t.kind, lv + 1)
	return int(spent * 0.5)


func sell(slot: BuildSlot) -> void:
	if slot.is_empty():
		return
	player.gold += sell_value(slot.tower)
	Vfx.smoke(slot.global_position, 10.0, 40.0, 100.0, Color(0.8, 0.72, 0.6), 0.6, 0.3)
	slot.tower.queue_free()
	slot.tower = null


func lose() -> void:
	if phase == Phase.OVER:
		return
	phase = Phase.OVER
	finished.emit(false)


func _start_wave() -> void:
	wave += 1
	phase = Phase.WAVE
	_wave_t = 0.0
	_gates_open = _gates_for(wave)
	_queue = _plan(wave)
	_queue.sort_custom(func(a: Array, b: Array) -> bool: return float(a[2]) < float(b[2]))
	wave_started.emit(wave)


static func _gates_for(n: int) -> int:
	return 2 if n < 4 else (3 if n < 8 else 4)


## [kind, gate, seconds after the wave starts] for every monster of wave n.
func _plan(n: int) -> Array:
	var plan := []
	var span := 6.0 + n * 0.6
	var imps := 8 + 4 * n
	var golems := int(n / 2.0) + 1
	for i in imps:
		# Imps come in small packs, so each gate gets a few at a time.
		var pack := int(i / 3.0)
		plan.append(["imp", pack % _gates_open, fmod(pack * 1.7, span) + randf() * 0.6])
	for i in golems:
		plan.append(["golem", i % _gates_open, randf() * span])
	# From wave 3, soul imps sprint past the warden at the shrine.
	for i in maxi(0, n - 2):
		plan.append(["wisp", randi() % _gates_open, randf() * span])
	if n in BOSS_WAVES:
		plan.append(["boss", 1, 3.0])
	return plan


func _spawn(kind: String, gate: int) -> void:
	var m: Monster = Boss.new() if kind == "boss" else Monster.new()
	var lvl := wave
	if kind == "boss":
		lvl = 1 if wave <= 5 else 3
	m.setup(kind, lvl, player)
	if kind != "boss":
		m.scale_for_wave(wave)
	m.objective = crown
	m.fx_layer = fx_layer
	m.ground_layer = ground_layer
	var jitter := Vector2(randf_range(-70.0, 70.0), randf_range(-45.0, 45.0))
	m.position = GATES[gate] + jitter
	m.died.connect(_on_died)
	world.add_child(m)
	_alive += 1
	Vfx.ring(m.position, 10.0, 90.0, Color(0.8, 0.3, 1.0), 0.4, 5.0)
	if m is Boss:
		boss_spawned.emit(m)


func _clear_wave() -> void:
	wave_cleared.emit(wave)
	if wave >= WAVES:
		phase = Phase.OVER
		finished.emit(true)
		return
	phase = Phase.PREP
	countdown = PREP_TIME
	crown.heal(0.2)
	# Bounty for holding the wave, and walls are patched up for the next one.
	player.gold += 40 + 10 * wave
	for slot in slots:
		if not slot.is_empty():
			slot.tower.repair()


func _on_died(m: Monster) -> void:
	_alive -= 1
	kills += 1
	monster_killed.emit(m)


func _draw() -> void:
	# Faint lanes from each open gate to the shrine, so players read where the threat comes from.
	var gates := _gates_open if phase != Phase.PREP else _gates_for(wave + 1)
	for i in GATES.size():
		var from: Vector2 = GATES[i]
		var active := i < gates
		var color := Color(0.85, 0.3, 1.0, 0.22) if active else Color(0.4, 0.4, 0.45, 0.08)
		var to := crown.global_position if crown != null else GameData.MAP_SIZE * 0.5
		var steps := int(from.distance_to(to) / 60.0)
		for k in steps:
			if k % 2 == 0:
				var a := from.lerp(to, float(k) / steps)
				var b := from.lerp(to, float(k + 1) / steps)
				draw_line(a, b, color, 6.0)

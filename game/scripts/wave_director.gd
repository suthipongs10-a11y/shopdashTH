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

enum Phase { PREP, WAVE, OVER }

const WAVES := 10
const BOSS_WAVES := [5, 10]
const FIRST_PREP := 6.0
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

var _queue: Array = []
var _wave_t := 0.0
var _alive := 0
var _gates_open := 2


func _ready() -> void:
	z_index = -5
	for i in GATES.size():
		var portal := FxSprite.play(self, "swirl", GATES[i], 230.0, 1.0e6, true,
			Color(0.75, 0.25, 0.9))
		if portal != null:
			portal.spin = -1.2


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

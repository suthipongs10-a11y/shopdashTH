class_name Spawner
extends Node
## Keeps the field populated: spawns packs of monsters around (but not on top of) the player.

signal monster_killed(monster: Monster)

const MAX_MONSTERS := 70
const SPAWN_INTERVAL := 0.8
const MIN_PLAYER_DIST := 520.0
const MAX_PLAYER_DIST := 1100.0

var world: Node2D
var player: Player
var fx_layer: Node
var ground_layer: Node

var _timer := 0.5


func _process(delta: float) -> void:
	_timer -= delta
	if _timer > 0.0:
		return
	_timer = SPAWN_INTERVAL
	if get_tree().get_nodes_in_group("monsters").size() < MAX_MONSTERS:
		spawn_pack()


func prefill(packs: int) -> void:
	for i in packs:
		spawn_pack()


func spawn_pack() -> void:
	var kind := "imp" if randf() < 0.6 else "golem"
	var count := randi_range(6, 10) if kind == "imp" else randi_range(3, 5)
	var center := _pick_point()
	var margin := Vector2(60.0, 60.0)
	for i in count:
		var m := Monster.new()
		m.setup(kind, player.level, player)
		m.fx_layer = fx_layer
		m.ground_layer = ground_layer
		var jitter := Vector2(randf_range(-90.0, 90.0), randf_range(-60.0, 60.0))
		m.position = (center + jitter).clamp(margin, GameData.MAP_SIZE - margin)
		m.died.connect(_on_monster_died)
		world.add_child(m)


func _pick_point() -> Vector2:
	var margin := Vector2(120.0, 120.0)
	var point := GameData.MAP_SIZE * 0.5
	for _attempt in 12:
		var reach := randf_range(MIN_PLAYER_DIST, MAX_PLAYER_DIST)
		var offset := Vector2.from_angle(randf() * TAU) * reach
		point = player.global_position + GameData.to_screen(offset)
		point = point.clamp(margin, GameData.MAP_SIZE - margin)
		if GameData.ground_dist(point, player.global_position) >= MIN_PLAYER_DIST:
			return point
	return point


func _on_monster_died(monster: Monster) -> void:
	monster_killed.emit(monster)

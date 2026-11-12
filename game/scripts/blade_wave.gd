class_name BladeWave
extends Node2D
## Piercing projectile: travels in a line and hits each monster once.

const SPEED := 640.0
const LIFE := 0.75
const RADIUS := 48.0

var player: Player
## Travel direction on the ground plane.
var dir := Vector2.RIGHT
var mult := 1.0

var _left := LIFE
var _already_hit := {}


func _physics_process(delta: float) -> void:
	_left -= delta
	if _left <= 0.0 or not is_instance_valid(player):
		queue_free()
		return
	position += GameData.to_screen(dir * SPEED) * delta
	for node in get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null or _already_hit.has(m.get_instance_id()):
			continue
		if GameData.ground_dist(global_position, m.global_position) <= RADIUS + m.body_radius:
			_already_hit[m.get_instance_id()] = true
			player.strike(m, mult, dir * 160.0)
	queue_redraw()


func _draw() -> void:
	var fade := clampf(_left / 0.2, 0.0, 1.0)
	draw_set_transform(Vector2(0.0, -26.0), 0.0, Vector2(1.0, GameData.Y_SQUASH))
	var a := dir.angle()
	draw_arc(Vector2.ZERO, RADIUS, a - 1.2, a + 1.2, 16, Color(0.55, 0.85, 1.0, fade), 10.0)
	draw_arc(Vector2.ZERO, RADIUS * 0.7, a - 0.9, a + 0.9, 12, Color(1.0, 1.0, 1.0, fade * 0.8), 5.0)

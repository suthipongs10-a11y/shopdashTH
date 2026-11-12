class_name BladeWave
extends Node2D
## Piercing projectile: a glowing crescent that travels in a line and hits each monster once.

const SPEED := 680.0
const LIFE := 0.75
const RADIUS := 56.0

var player: Player
## Travel direction on the ground plane.
var dir := Vector2.RIGHT
var mult := 1.0
var color := Color(0.45, 0.75, 1.0)
var tally: SkillTally

var _left := LIFE
var _already_hit := {}
var _trail := 0.0


func _physics_process(delta: float) -> void:
	_left -= delta
	if _left <= 0.0 or not is_instance_valid(player):
		queue_free()
		return
	position += GameData.to_screen(dir * SPEED) * delta
	_trail -= delta
	if _trail <= 0.0:
		_trail = 0.04
		Fx.flash(get_parent(), position + Vector2(0.0, -28.0), Color(color, 0.5), 46.0, 0.25)
	for node in get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null or _already_hit.has(m.get_instance_id()):
			continue
		if GameData.ground_dist(global_position, m.global_position) <= RADIUS + m.body_radius:
			_already_hit[m.get_instance_id()] = true
			player.strike(m, mult, dir * 160.0, 0.0, tally if is_instance_valid(tally) else null)
	queue_redraw()


func _draw() -> void:
	var fade := clampf(_left / 0.2, 0.0, 1.0)
	draw_set_transform(Vector2(0.0, -28.0))
	var a := dir.angle()
	Fx.draw_crescent(self, RADIUS + 4.0, 40.0, a, 1.3, Color(color.darkened(0.3), fade * 0.5))
	Fx.draw_crescent(self, RADIUS, 30.0, a, 1.25, Color(color, fade * 0.95))
	Fx.draw_crescent(self, RADIUS * 0.95, 12.0, a, 1.1, Color(1.0, 1.0, 1.0, fade))

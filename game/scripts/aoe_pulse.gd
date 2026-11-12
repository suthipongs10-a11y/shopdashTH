class_name AoePulse
extends Node2D
## Generic ground area effect: optional delay (telegraph), then N damage ticks.
## Used for the shield bash impact, the guardian ring and the judgment ultimate.

var player: Player
## If set, the effect follows this node (e.g. an aura around the player).
var follow: Node2D
var radius := 120.0
var mult := 1.0
var ticks := 1
var interval := 0.3
var delay := 0.0
## Outward knockback speed on the ground plane.
var knock := 0.0
var stun := 0.0
var shake := 0.0
var color := Color(1.0, 0.9, 0.5)

var _timer := 0.0
var _pulse := 1.0


func _process(delta: float) -> void:
	if is_instance_valid(follow):
		global_position = follow.global_position
	queue_redraw()
	if delay > 0.0:
		delay -= delta
		return
	_timer -= delta
	if ticks > 0 and _timer <= 0.0:
		ticks -= 1
		_timer = interval
		_pulse = 0.0
		_fire()
	_pulse = minf(1.0, _pulse + delta / 0.3)
	if ticks <= 0 and _pulse >= 1.0:
		queue_free()


func _fire() -> void:
	if not is_instance_valid(player):
		return
	for node in get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null:
			continue
		var offset := GameData.to_ground(m.global_position - global_position)
		if offset.length() > radius + m.body_radius:
			continue
		var push := Vector2.ZERO
		if knock > 0.0:
			push = (offset.normalized() if offset.length() > 1.0 else Vector2.RIGHT) * knock
		player.strike(m, mult, push, stun)
	if shake > 0.0:
		player.shake(shake)


func _draw() -> void:
	if delay > 0.0:
		# Telegraph: where the blast is about to land.
		draw_colored_polygon(GameData.ellipse_points(radius), Color(color, 0.12))
		draw_polyline(GameData.ellipse_outline(radius), Color(color, 0.7), 2.0)
		return
	if ticks > 0:
		draw_colored_polygon(GameData.ellipse_points(radius), Color(color, 0.1))
		draw_polyline(GameData.ellipse_outline(radius), Color(color, 0.45), 2.0)
	if _pulse < 1.0:
		var r := radius * (0.25 + 0.75 * _pulse)
		draw_colored_polygon(GameData.ellipse_points(r), Color(color, 0.3 * (1.0 - _pulse)))
		draw_polyline(GameData.ellipse_outline(r), Color(color, 1.0 - _pulse), 5.0)

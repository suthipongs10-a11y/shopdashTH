class_name LightBolt
extends Node2D
## Archer tower projectile: a short streak of light that homes on its target.

const SPEED := 1500.0

var target: Monster
var damage := 100
var color := Color(1.0, 0.85, 0.45)
var top_fx: Node

var _last := Vector2.ZERO


func _ready() -> void:
	material = Fx.additive()
	_last = global_position


func _process(delta: float) -> void:
	if not is_instance_valid(target) or target.state == Monster.State.DEAD:
		queue_free()
		return
	var aim := target.global_position + Vector2(0.0, -target.visual_height() * 0.5)
	var to := aim - global_position
	_last = global_position
	if to.length() <= SPEED * delta:
		target.take_damage(damage)
		if top_fx != null:
			DamageNumber.spawn(top_fx, target.global_position + Vector2(0.0, -target.visual_height() - 22.0),
				damage, false, target.get_instance_id())
		Vfx.burst(target.global_position, target.visual_height() * 0.5, 6, color, 220.0, 8.0, 0.3)
		queue_free()
		return
	global_position += to.normalized() * SPEED * delta
	queue_redraw()


func _draw() -> void:
	var back := (_last - global_position) * 2.5
	draw_line(back, Vector2.ZERO, Color(color, 0.6), 6.0)
	draw_line(back * 0.6, Vector2.ZERO, Color(1, 1, 1, 0.9), 2.5)
	draw_circle(Vector2.ZERO, 5.0, Color(1, 1, 0.9))

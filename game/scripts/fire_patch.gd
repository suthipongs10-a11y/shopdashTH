class_name FirePatch
extends Node2D
## Burning ground left by a golem's slam. Hurts the player while they stand in it.
## Uses art/fx/fire.png (looping) and art/fx/smoke.png when present, particles otherwise.

const TICK := 0.5

var player: Player
var top_fx: Node
var radius := 70.0
var life := 4.0
## Damage per tick before the player's defence.
var damage := 50

var _t := 0.0
var _tick := TICK
var _flames: CPUParticles2D


func _ready() -> void:
	var painted := 0
	for i in 3:
		var spot := GameData.to_screen(Vector2.from_angle(TAU * i / 3.0 + randf()) * radius * 0.45)
		var f := FxSprite.play(self, "fire", spot + Vector2(0.0, -30.0), 80.0, life)
		if f == null:
			break
		f.loop = true
		f.fade_in = 0.2
		f.fade_out = 0.5
		f.flip_h = randf() < 0.5
		painted += 1
	if painted == 0:
		_flames = CPUParticles2D.new()
		_flames.material = Fx.additive()
		_flames.texture = Fx.glow_texture()
		_flames.amount = 26
		_flames.lifetime = 0.7
		_flames.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
		_flames.emission_sphere_radius = radius * 0.8
		_flames.scale = Vector2(1.0, GameData.Y_SQUASH)
		_flames.direction = Vector2.UP
		_flames.spread = 12.0
		_flames.gravity = Vector2(0.0, -180.0)
		_flames.initial_velocity_min = 20.0
		_flames.initial_velocity_max = 60.0
		_flames.scale_amount_min = 0.2
		_flames.scale_amount_max = 0.45
		var ramp := Gradient.new()
		ramp.set_color(0, Color(1.0, 0.85, 0.3, 0.9))
		ramp.set_color(1, Color(1.0, 0.25, 0.05, 0.0))
		_flames.color_ramp = ramp
		add_child(_flames)


func _process(delta: float) -> void:
	_t += delta
	if _t >= life:
		_puff()
		queue_free()
		return
	_tick -= delta
	if _tick <= 0.0:
		_tick = TICK
		var standing := is_instance_valid(player) and not player.dead
		if standing and GameData.ground_dist(global_position, player.global_position) <= radius:
			player.take_damage(damage)
	queue_redraw()


func _puff() -> void:
	var at := global_position + Vector2(0.0, -20.0)
	var smoke := FxSprite.play(top_fx, "smoke", at, 130.0)
	if smoke == null:
		Fx.burst(top_fx, at, Color(0.45, 0.42, 0.4, 0.6), 6, 60.0, 0.9, 60.0, Vector2(0.0, -40.0),
			false)


func _draw() -> void:
	var a := clampf(_t / 0.2, 0.0, 1.0) * clampf((life - _t) / 0.6, 0.0, 1.0)
	var flicker := 0.85 + 0.15 * sin(_t * 17.0)
	draw_colored_polygon(GameData.ellipse_points(radius * 1.1, 28), Color(0.25, 0.05, 0.0, 0.35 * a))
	var glow := Color(1.0, 0.4, 0.05, 0.35 * a * flicker)
	draw_colored_polygon(GameData.ellipse_points(radius, 28), glow)
	draw_colored_polygon(GameData.ellipse_points(radius * 0.55, 20), Color(1.0, 0.75, 0.2, 0.4 * a))

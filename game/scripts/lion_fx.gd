class_name LionFx
extends Node2D
## Golden lion spirit for the warden's ultimate. With art (EggPact's fx_ereb_lion: a flaming
## lion leaping, facing right) it bounds from behind the caster towards the aim, roars at
## ROAR_AT (when the damage starts) and fades out ahead. Without art, a flame-mane placeholder
## rises over the caster instead.

const ART := "res://art/fx/lion_spirit.png"
const ROAR_AT := 0.5
const LIFE := 1.25
const HEIGHT := 300.0
## On-screen height of the painted lion.
const ART_HEIGHT := 230.0

var color := Color(1.0, 0.72, 0.22)
## Seconds to wait (ultimate intro) before the spirit appears.
var delay := 0.0
## Screen-space direction of the leap.
var dir := Vector2.RIGHT

var _t := 0.0
var _sprite: Sprite2D
var _glow: Sprite2D
var _roared := false
var _trail := 0.0


func _ready() -> void:
	add_to_group("big_fx")
	z_index = -1
	material = Fx.additive()
	if ResourceLoader.exists(ART):
		var tex: Texture2D = load(ART)
		# Painted body with normal blending, plus an additive copy on top for the glow.
		_sprite = Sprite2D.new()
		_sprite.texture = tex
		_sprite.visible = false
		_sprite.flip_h = dir.x < 0.0
		add_child(_sprite)
		_glow = Sprite2D.new()
		_glow.texture = tex
		_glow.material = Fx.additive()
		_glow.flip_h = _sprite.flip_h
		_sprite.add_child(_glow)


func _process(delta: float) -> void:
	if delay > 0.0:
		delay -= delta
		if delay <= 0.0:
			Vfx.beam(global_position, 90.0, color, 0.8)
			Vfx.ring(global_position, 20.0, 260.0, color, 0.7, 10.0)
			if _sprite != null:
				_sprite.visible = true
		return
	_t += delta
	if _t >= LIFE:
		queue_free()
		return
	if not _roared and _t >= ROAR_AT:
		_roared = true
		var at := _sprite.position if _sprite != null else Vector2(0.0, -HEIGHT * 0.55)
		Fx.flash(get_parent(), global_position + at, Color.WHITE, HEIGHT * 0.6, 0.3)
		Fx.streaks(get_parent(), global_position + at, color, 380.0, 18, 0.45, 0.9)
	if _sprite != null:
		_leap(delta)
	queue_redraw()


## Bounding arc from behind the caster to well past them along dir.
func _leap(delta: float) -> void:
	var u := _t / LIFE
	var start := -dir * 170.0 + Vector2(0.0, -70.0)
	var finish := dir * 320.0 + Vector2(0.0, -110.0)
	var pos := start.lerp(finish, 1.0 - pow(1.0 - u, 1.6)) + Vector2(0.0, -sin(u * PI) * 70.0)
	_sprite.position = pos
	var tex_h := float(_sprite.texture.get_height())
	var k := ART_HEIGHT / tex_h * (0.75 + 0.35 * minf(1.0, u * 2.0)) * (1.0 + _roar_bump() * 0.15)
	_sprite.scale = Vector2(k, k)
	_sprite.rotation = dir.y * 0.25
	var a := _alpha()
	_sprite.modulate = Color(1.0, 1.0, 1.0, a)
	_glow.modulate = Color(1.0, 0.9, 0.6, (0.12 + 0.3 * _roar_bump()) * a)
	# Embers and flame shed from the mane as it bounds.
	_trail -= delta
	if _trail <= 0.0:
		_trail = 0.03
		var ground := global_position + Vector2(pos.x, 0.0)
		Vfx.glow(ground, -pos.y + randf_range(-30, 30), randf_range(10, 22), color, 0.4,
			Vector3(-dir.x * 120.0, 0.0, randf_range(20, 80)), 0.0, Vfx.Kind.FLAME)


## 0 -> 1 while rising.
func _rise() -> float:
	return clampf(_t / ROAR_AT, 0.0, 1.0)


func _roar_bump() -> float:
	var x := (_t - ROAR_AT) / 0.25
	return 0.0 if x < 0.0 or x > 1.0 else sin(x * PI)


func _alpha() -> float:
	return clampf(_t / 0.12, 0.0, 1.0) * clampf((LIFE - _t) / 0.4, 0.0, 1.0)


func _draw() -> void:
	if _sprite != null or delay > 0.0:
		return
	# Placeholder: a ring of flame tongues (the mane) around a bright core, with two eyes.
	var k := _rise()
	var a := _alpha()
	var bump := _roar_bump()
	var center := Vector2(0.0, -HEIGHT * 0.55 - 50.0 * k)
	var r := HEIGHT * 0.32 * (0.6 + 0.4 * k) * (1.0 + bump * 0.15)
	draw_circle(center, r * 1.25, Color(color, 0.18 * a))
	var tongues := 18
	for i in tongues:
		var ang := TAU * float(i) / float(tongues) + sin(_t * 6.0 + i) * 0.06
		var dir := Vector2.from_angle(ang)
		var side := dir.orthogonal()
		var length := r * (0.9 + 0.35 * sin(_t * 9.0 + i * 1.7))
		var base := center + dir * r * 0.55
		draw_colored_polygon(PackedVector2Array([
			base + side * r * 0.2, base + dir * length, base - side * r * 0.2,
		]), Color(color.lerp(Color(1.0, 0.4, 0.1), float(i % 3) * 0.3), 0.75 * a))
	draw_circle(center, r * 0.62, Color(1.0, 0.9, 0.55, 0.85 * a))
	draw_circle(center, r * 0.42, Color(1.0, 1.0, 0.9, 0.9 * a))
	for side_x in [-1.0, 1.0]:
		var eye: Vector2 = center + Vector2(side_x * r * 0.2, -r * 0.08)
		draw_colored_polygon(PackedVector2Array([
			eye + Vector2(-r * 0.09, 0.0), eye + Vector2(0.0, -r * 0.04),
			eye + Vector2(r * 0.09, 0.0), eye + Vector2(0.0, r * 0.03),
		]), Color(1.0, 0.45, 0.1, a))

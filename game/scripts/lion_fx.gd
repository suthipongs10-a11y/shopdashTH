class_name LionFx
extends Node2D
## Golden lion spirit for the warden's ultimate. Rises behind the caster, roars at ROAR_AT
## (when the damage starts), then fades. Uses art/fx/lion_spirit.png if present (drawn with
## additive blending, so a black background disappears); otherwise a flame-mane placeholder.

const ART := "res://art/fx/lion_spirit.png"
const ROAR_AT := 0.5
const LIFE := 1.7
const HEIGHT := 300.0

var color := Color(1.0, 0.72, 0.22)
## Seconds to wait (ultimate intro) before the spirit starts to rise.
var delay := 0.0

var _t := 0.0
var _sprite: Sprite2D
var _roared := false


func _ready() -> void:
	z_index = -1
	material = Fx.additive()
	if ResourceLoader.exists(ART):
		_sprite = Sprite2D.new()
		_sprite.texture = load(ART)
		_sprite.material = Fx.additive()
		_sprite.visible = false
		add_child(_sprite)


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
		Fx.flash(get_parent(), global_position + Vector2(0.0, -HEIGHT * 0.55), Color.WHITE,
			HEIGHT * 0.6, 0.3)
	if _sprite != null:
		var k := _rise()
		var tex_h := float(_sprite.texture.get_height())
		_sprite.scale = Vector2.ONE * (HEIGHT / tex_h) * (0.55 + 0.45 * k) * (1.0 + _roar_bump() * 0.12)
		_sprite.position = Vector2(0.0, -HEIGHT * 0.5 - 60.0 * k)
		_sprite.modulate = Color(1.0, 1.0, 1.0, _alpha())
	queue_redraw()


## 0 -> 1 while rising.
func _rise() -> float:
	return clampf(_t / ROAR_AT, 0.0, 1.0)


func _roar_bump() -> float:
	var x := (_t - ROAR_AT) / 0.25
	return 0.0 if x < 0.0 or x > 1.0 else sin(x * PI)


func _alpha() -> float:
	return clampf(_t / 0.15, 0.0, 1.0) * clampf((LIFE - _t) / 0.5, 0.0, 1.0)


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

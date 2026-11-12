class_name Fx
extends RefCounted
## Shared helpers for glow-style effects: additive blending, soft glow sprites,
## light beams and one-shot spark bursts.

static var _glow_tex: GradientTexture2D
static var _beam_tex: GradientTexture2D
static var _fade_ramp: Gradient
static var _add_mat: CanvasItemMaterial


static func additive() -> CanvasItemMaterial:
	if _add_mat == null:
		_add_mat = CanvasItemMaterial.new()
		_add_mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	return _add_mat


## Soft round glow, white in the middle fading to transparent.
static func glow_texture() -> Texture2D:
	if _glow_tex == null:
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(1, 1, 1, 0))
		g.add_point(0.35, Color(1, 1, 1, 0.4))
		_glow_tex = GradientTexture2D.new()
		_glow_tex.gradient = g
		_glow_tex.fill = GradientTexture2D.FILL_RADIAL
		_glow_tex.fill_from = Vector2(0.5, 0.5)
		_glow_tex.fill_to = Vector2(1.0, 0.5)
		_glow_tex.width = 128
		_glow_tex.height = 128
	return _glow_tex


## Vertical light beam: bright core, soft sides.
static func beam_texture() -> Texture2D:
	if _beam_tex == null:
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 0))
		g.set_color(1, Color(1, 1, 1, 0))
		g.add_point(0.5, Color(1, 1, 1, 1))
		_beam_tex = GradientTexture2D.new()
		_beam_tex.gradient = g
		_beam_tex.fill = GradientTexture2D.FILL_LINEAR
		_beam_tex.fill_from = Vector2(0.0, 0.5)
		_beam_tex.fill_to = Vector2(1.0, 0.5)
		_beam_tex.width = 64
		_beam_tex.height = 8
	return _beam_tex


static func _ramp() -> Gradient:
	if _fade_ramp == null:
		_fade_ramp = Gradient.new()
		_fade_ramp.set_color(0, Color(1, 1, 1, 1))
		_fade_ramp.set_color(1, Color(1, 1, 1, 0))
	return _fade_ramp


## Glow that swells and fades. With on_ground it is squashed to lie on the floor.
static func flash(
		parent: Node, at: Vector2, color: Color, radius: float,
		life: float = 0.25, on_ground: bool = false
) -> void:
	var s := Sprite2D.new()
	s.texture = glow_texture()
	s.material = additive()
	s.modulate = color
	s.position = at
	var k := radius * 2.0 / 128.0
	var full := Vector2(k, k * (GameData.Y_SQUASH if on_ground else 1.0))
	s.scale = full * 0.35
	parent.add_child(s)
	var tw := s.create_tween()
	tw.set_parallel(true)
	tw.tween_property(s, "scale", full, life).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(s, "modulate:a", 0.0, life).set_ease(Tween.EASE_IN)
	tw.chain().tween_callback(s.queue_free)


## Pillar of light rising from a ground point.
static func pillar(
		parent: Node, at: Vector2, color: Color, width: float, height: float, life: float = 0.4
) -> void:
	var s := Sprite2D.new()
	s.texture = beam_texture()
	s.material = additive()
	s.modulate = color
	s.position = at + Vector2(0.0, -height * 0.5)
	s.scale = Vector2(width / 64.0, height / 8.0)
	parent.add_child(s)
	var tw := s.create_tween()
	tw.set_parallel(true)
	tw.tween_property(s, "scale:x", width * 0.25 / 64.0, life).set_ease(Tween.EASE_IN)
	tw.tween_property(s, "modulate:a", 0.0, life).set_ease(Tween.EASE_IN)
	tw.chain().tween_callback(s.queue_free)


## One-shot burst of glowing sparks.
static func burst(
		parent: Node, at: Vector2, color: Color, amount: int = 8, speed: float = 220.0,
		life: float = 0.35, size: float = 10.0, gravity: Vector2 = Vector2(0.0, 500.0),
		glow: bool = true
) -> void:
	var p := CPUParticles2D.new()
	if glow:
		p.material = additive()
	p.texture = glow_texture()
	p.position = at
	p.one_shot = true
	p.explosiveness = 1.0
	p.amount = amount
	p.lifetime = life
	p.direction = Vector2.UP
	p.spread = 180.0
	p.initial_velocity_min = speed * 0.35
	p.initial_velocity_max = speed
	p.gravity = gravity
	p.scale_amount_min = size * 0.5 / 128.0
	p.scale_amount_max = size / 128.0
	p.color = color
	p.color_ramp = _ramp()
	p.emitting = true
	parent.add_child(p)
	p.finished.connect(p.queue_free)


## Four-point star glint.
static func sparkle(
		parent: Node, at: Vector2, color: Color, size: float, life: float = 0.22
) -> void:
	var s := SparkleFx.new()
	s.color = color
	s.size = size
	s.life = life
	s.position = at
	parent.add_child(s)


## Radial light streaks bursting outward from a point.
static func streaks(
		parent: Node, at: Vector2, color: Color, radius: float, count: int = 18,
		life: float = 0.45, spiral: float = 0.5
) -> void:
	var s := StreaksFx.new()
	s.color = color
	s.radius = radius
	s.count = count
	s.life = life
	s.spiral = spiral
	s.position = at
	parent.add_child(s)


## Expanding shockwave ring on the ground.
static func ring(
		parent: Node, at: Vector2, color: Color, radius: float, life: float = 0.35,
		width: float = 6.0
) -> void:
	var r := RingFx.new()
	r.color = color
	r.radius = radius
	r.life = life
	r.width = width
	r.position = at
	parent.add_child(r)


## Draws a sword-swing crescent on the squashed ground plane, as quads (always convex).
static func draw_crescent(
		ci: CanvasItem, radius: float, thickness: float, angle: float, half_width: float,
		color: Color
) -> void:
	var steps := 14
	for i in steps:
		var t0 := -1.0 + 2.0 * float(i) / float(steps)
		var t1 := -1.0 + 2.0 * float(i + 1) / float(steps)
		var d0 := Vector2.from_angle(angle + t0 * half_width)
		var d1 := Vector2.from_angle(angle + t1 * half_width)
		var in0 := radius - thickness * (1.0 - t0 * t0) - 1.0
		var in1 := radius - thickness * (1.0 - t1 * t1) - 1.0
		ci.draw_colored_polygon(PackedVector2Array([
			GameData.to_screen(d0 * radius), GameData.to_screen(d1 * radius),
			GameData.to_screen(d1 * in1), GameData.to_screen(d0 * in0),
		]), color)

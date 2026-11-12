class_name DragonFx
extends Node2D
## Golden Dragon God, drawn entirely from glow particles in the EggPact style.
## A serpentine body follows the head's path: it coils around the caster, spirals up over
## their head, pauses with a roar, then dives onto the enemies and explodes.

signal impact(at: Vector2)

enum Phase { COIL, RISE, ROAR, DIVE, FADE }

const SEGMENTS := 26
## Screen distance between body segments; the body is laid along the head's recent path.
const SEG_LEN := 17.0
const HISTORY := 240
const COIL_TIME := 1.6
const RISE_TIME := 0.7
const ROAR_TIME := 0.35
const DIVE_TIME := 0.32
const FADE_TIME := 0.6
const COIL_RADIUS := 150.0
const SKY := 230.0
## Head drawing scale.
const HEAD := 1.6

var caster: Node2D
var palette: Dictionary = Vfx.pal("dragon")
## Ground point the dragon dives onto; chosen when the dive starts.
var target := Vector2.ZERO
## Picks the dive target; set by the caster.
var choose_target: Callable

var _phase := Phase.COIL
var _t := 0.0
var _angle := 0.0
## Head positions on the ground plane plus height: Vector3(x, y, z), newest last.
var _hist: Array[Vector3] = []
var _dive_from := Vector3.ZERO
var _dot: Texture2D
## Normal-blend layer over the body glow: gives the head a solid, readable silhouette.
var _solid: Node2D
## Additive layer over the solid head: makes it glow instead of looking flat.
var _shine: Node2D


func _ready() -> void:
	add_to_group("dragon")
	material = Fx.additive()
	z_index = 21
	_dot = Vfx.dot_texture()
	_solid = Node2D.new()
	# Drawn over the body glow so the head stays readable.
	_solid.show_behind_parent = false
	_solid.draw.connect(_draw_solid_head)
	add_child(_solid)
	_shine = Node2D.new()
	_shine.material = Fx.additive()
	_shine.draw.connect(_draw_head_shine)
	add_child(_shine)
	_angle = randf() * TAU
	_hist.append(_head_position())


func _process(delta: float) -> void:
	_t += delta
	match _phase:
		Phase.COIL:
			if _t >= COIL_TIME:
				_next(Phase.RISE)
		Phase.RISE:
			if _t >= RISE_TIME:
				_next(Phase.ROAR)
				_roar()
		Phase.ROAR:
			if _t >= ROAR_TIME:
				_next(Phase.DIVE)
				_dive_from = _hist[-1]
				target = choose_target.call() if choose_target.is_valid() else _center()
		Phase.DIVE:
			if _t >= DIVE_TIME:
				_next(Phase.FADE)
				impact.emit(target)
		Phase.FADE:
			if _t >= FADE_TIME:
				queue_free()
				return
	if _phase != Phase.FADE:
		_hist.append(_head_position())
	else:
		# The body keeps pouring into the impact point.
		_hist.append(Vector3(target.x, target.y, 0.0))
	if _hist.size() > HISTORY:
		_hist.pop_front()
	_trail()
	queue_redraw()
	_solid.queue_redraw()
	_shine.queue_redraw()


func _next(p: Phase) -> void:
	_phase = p
	_t = 0.0


func _center() -> Vector2:
	return caster.global_position if is_instance_valid(caster) else global_position


## Where the head is now, on the ground plane (x, y) plus height (z).
func _head_position() -> Vector3:
	var c := _center()
	match _phase:
		Phase.COIL:
			# One and a quarter laps around the caster, bobbing and slowly climbing.
			var u := _t / COIL_TIME
			_angle += get_process_delta_time() * TAU * 1.25 / COIL_TIME
			var ring := GameData.to_screen(Vector2.from_angle(_angle) * COIL_RADIUS)
			return Vector3(c.x + ring.x, c.y + ring.y, 60.0 + 40.0 * u + 22.0 * sin(_t * 7.0))
		Phase.RISE:
			# Tightening spiral up over the caster's head.
			var u := _t / RISE_TIME
			var e := u * u * (3.0 - 2.0 * u)
			_angle += get_process_delta_time() * TAU * 1.6 / RISE_TIME
			var r := lerpf(COIL_RADIUS, 36.0, e)
			var ring := GameData.to_screen(Vector2.from_angle(_angle) * r)
			return Vector3(c.x + ring.x, c.y + ring.y, lerpf(100.0, SKY, e))
		Phase.ROAR:
			_angle += get_process_delta_time() * 6.0
			var ring := GameData.to_screen(Vector2.from_angle(_angle) * 30.0)
			return Vector3(c.x + ring.x, c.y + ring.y, SKY + 10.0 * sin(_t * 30.0))
		Phase.DIVE:
			var u := _t / DIVE_TIME
			var e := u * u
			return Vector3(lerpf(_dive_from.x, target.x, e), lerpf(_dive_from.y, target.y, e),
				lerpf(_dive_from.z, 0.0, e))
	return Vector3(target.x, target.y, 0.0)


func _roar() -> void:
	var head := _hist[-1]
	var at := Vector2(head.x, head.y)
	Juice.flash(0.25, palette["aura"])
	if is_instance_valid(caster) and caster.has_method("shake"):
		caster.shake(9.0)
	Vfx.twinkle(at, head.z, 150.0, palette["hot"], 0.5)
	Vfx.burst(at, head.z, 40, palette["aura"], 520.0, 20.0, 0.6)
	Vfx.ring(Vector2(at.x, at.y), 20.0, 260.0, palette["aura"], 0.6, 10.0)
	Fx.streaks(get_parent(), Vector2(head.x, head.y - head.z), palette["aura"], 420.0, 22, 0.5, 1.2)


## Embers shed by the body, and a bright wake behind the head.
func _trail() -> void:
	if _hist.is_empty() or _phase == Phase.FADE:
		return
	var head := _hist[-1]
	Vfx.glow(Vector2(head.x, head.y), head.z, 30.0, palette["aura"], 0.3)
	# Mane of fire streaming off the head.
	Vfx.glow(Vector2(head.x + randf_range(-14, 14), head.y), head.z + randf_range(-6, 10),
		randf_range(18, 28), palette["aura"], randf_range(0.25, 0.45),
		Vector3(0, 0, randf_range(60, 140)), 0.0, Vfx.Kind.FLAME)
	var recent := mini(_hist.size(), 70)
	for i in 3:
		var p := _hist[_hist.size() - 1 - randi() % recent]
		Vfx.glow(Vector2(p.x + randf_range(-10, 10), p.y), p.z + randf_range(-10, 10),
			randf_range(4, 9), palette["core"] if randf() < 0.4 else palette["aura"],
			randf_range(0.4, 0.8), Vector3(randf_range(-20, 20), 0.0, randf_range(10, 50)))


func _screen(p: Vector3) -> Vector2:
	return Vector2(p.x, p.y - p.z) - global_position


## Body points laid along the recent path, one every SEG_LEN screen pixels from the head.
func _body_points() -> PackedVector2Array:
	var pts := PackedVector2Array()
	var prev := _screen(_hist[-1])
	pts.append(prev)
	var carry := 0.0
	var i := _hist.size() - 2
	while i >= 0 and pts.size() < SEGMENTS:
		var p := _screen(_hist[i])
		var d := prev.distance_to(p)
		while d > 0.0 and carry + d >= SEG_LEN and pts.size() < SEGMENTS:
			var t := (SEG_LEN - carry) / d
			prev = prev.lerp(p, t)
			pts.append(prev)
			d = prev.distance_to(p)
			carry = 0.0
		carry += d
		prev = p
		i -= 1
	return pts


func _draw() -> void:
	if _hist.size() < 2:
		return
	var fade := 1.0
	if _phase == Phase.FADE:
		fade = 1.0 - _t / FADE_TIME
	var aura: Color = palette["aura"]
	var core: Color = palette["core"]
	var pts := _body_points()
	if pts.size() < 2:
		return
	var n := float(pts.size())
	# Thick neck tapering to a thin tail.
	var widths := PackedFloat32Array()
	for i in pts.size():
		widths.append(6.0 + 40.0 * pow(1.0 - float(i) / n, 0.8))
	for i in pts.size() - 1:
		var w := widths[i]
		draw_line(pts[i], pts[i + 1], Color(aura, 0.5 * fade), w * 1.5)
		draw_line(pts[i], pts[i + 1], Color(aura, 0.85 * fade), w * 0.9)
		draw_line(pts[i], pts[i + 1], Color(core, 0.9 * fade), w * 0.35)
	for i in pts.size():
		_dot_at(pts[i], widths[i] * 1.2, Color(aura, 0.35 * fade))
	# Dorsal fins every other segment, belly scales as bright ticks.
	for i in range(1, pts.size() - 1):
		var along := (pts[i - 1] - pts[i + 1]).normalized()
		var up := along.orthogonal()
		if up.y > 0.0:
			up = -up
		var w := widths[i]
		if i % 2 == 1:
			draw_colored_polygon(PackedVector2Array([
				pts[i] + up * w * 0.4 + along * w * 0.35, pts[i] + up * w * 1.15 - along * w * 0.35,
				pts[i] + up * w * 0.4 - along * w * 0.45,
			]), Color(core, 0.85 * fade))
	_draw_head(pts, fade)


## Head frame: origin at the head point, x along the travel direction, y to the side.
func _head_frame() -> Transform2D:
	var pts := _body_points()
	if pts.size() < 2:
		return Transform2D()
	var along := (pts[0] - pts[1]).normalized()
	return Transform2D(along * HEAD, along.orthogonal() * HEAD, pts[0])


func _fade() -> float:
	return 1.0 - _t / FADE_TIME if _phase == Phase.FADE else 1.0


## Additive part of the head: glow, flame mane, burning eyes, whiskers.
func _draw_head(pts: PackedVector2Array, fade: float) -> void:
	var aura: Color = palette["aura"]
	_dot_at(pts[0], 100.0, Color(aura, 0.4 * fade))
	draw_set_transform_matrix(_head_frame())
	for k in 7:
		var a := (float(k) / 6.0 - 0.5) * 2.2
		var dir := Vector2.LEFT.rotated(a)
		var length := 44.0 + 16.0 * sin(_t * 18.0 + k)
		draw_colored_polygon(PackedVector2Array([
			Vector2(-14, 0) + dir.orthogonal() * 9.0, Vector2(-14, 0) + dir * length,
			Vector2(-14, 0) - dir.orthogonal() * 9.0,
		]), Color(aura.lerp(Color(1.0, 0.45, 0.1), 0.4), 0.7 * fade))
	for s: float in [-1.0, 1.0]:
		var whisker := PackedVector2Array()
		for j in 8:
			var u := j / 7.0
			whisker.append(Vector2(54.0 - 80.0 * u, s * (8.0 + 34.0 * u + 10.0 * sin(u * 5.0 + _t * 8.0))))
		draw_polyline(whisker, Color(aura, 0.8 * fade), 2.5)
	_dot_at(Vector2(60, 0), 16.0, Color(1, 1, 1, 0.8 * fade))
	draw_set_transform_matrix(Transform2D())


## Solid part of the head (normal blending), drawn over the body glow.
func _draw_solid_head() -> void:
	if _hist.size() < 2:
		return
	var fade := _fade()
	var gold := Color(0.95, 0.68, 0.16, fade)
	var light := Color(1.0, 0.9, 0.55, fade)
	var shade := Color(0.78, 0.42, 0.08, fade)
	var ink := Color(0.42, 0.18, 0.02, fade)
	_solid.draw_set_transform_matrix(_head_frame())
	# Horns: thick blades sweeping back past the skull.
	for s: float in [-1.0, 1.0]:
		var horn := PackedVector2Array([
			Vector2(-2, s * 10.0), Vector2(-40, s * 30.0), Vector2(-80, s * 50.0),
			Vector2(-44, s * 40.0), Vector2(-16, s * 26.0),
		])
		_solid.draw_colored_polygon(horn, light)
		_outline(horn, ink, 2.0)
	var skull := PackedVector2Array([
		Vector2(-24, -20), Vector2(4, -23), Vector2(24, -15), Vector2(52, -9), Vector2(62, -2),
		Vector2(62, 2), Vector2(52, 9), Vector2(24, 15), Vector2(4, 23), Vector2(-24, 20),
		Vector2(-32, 0),
	])
	_solid.draw_colored_polygon(skull, gold)
	# Cheek shadows give the head some volume.
	for s: float in [-1.0, 1.0]:
		_solid.draw_colored_polygon(PackedVector2Array([
			Vector2(-22, s * 18.0), Vector2(6, s * 21.0), Vector2(26, s * 13.0), Vector2(4, s * 12.0),
		]), shade)
	# Brow ridge and snout highlight.
	_solid.draw_colored_polygon(PackedVector2Array([
		Vector2(-10, -8), Vector2(22, -6), Vector2(54, -2), Vector2(54, 2), Vector2(22, 6),
		Vector2(-10, 8),
	]), light)
	_outline(skull, ink, 3.0)
	# Open lower jaw with teeth.
	var jaw := PackedVector2Array([Vector2(14, 12), Vector2(58, 18), Vector2(20, 26)])
	_solid.draw_colored_polygon(jaw, shade)
	_outline(jaw, ink, 2.0)
	for k in 3:
		var x := 26.0 + k * 9.0
		_solid.draw_colored_polygon(PackedVector2Array([
			Vector2(x, 9 + k), Vector2(x + 4, 9 + k), Vector2(x + 2, 15 + k),
		]), Color(1, 1, 1, fade))
	for s: float in [-1.0, 1.0]:
		# Nostril and almond eye with a slit pupil.
		_solid.draw_line(Vector2(52, s * 3.0), Vector2(57, s * 4.0), ink, 2.0)
		var eye := PackedVector2Array([
			Vector2(8, s * 9.0), Vector2(16, s * 13.0), Vector2(26, s * 10.0), Vector2(16, s * 8.0),
		])
		_solid.draw_colored_polygon(eye, Color(1.0, 0.95, 0.7, fade))
		_solid.draw_line(Vector2(16, s * 8.5), Vector2(17, s * 12.5), ink, 2.0)
	_solid.draw_set_transform_matrix(Transform2D())


## Soft light over the head and burning eyes, additive.
func _draw_head_shine() -> void:
	if _hist.size() < 2:
		return
	var fade := _fade()
	var aura: Color = palette["aura"]
	_shine.draw_set_transform_matrix(_head_frame())
	_shine.draw_texture_rect(_dot, Rect2(Vector2(-36, -34), Vector2(104, 68)), false,
		Color(aura, 0.35 * fade))
	for s: float in [-1.0, 1.0]:
		var e := Vector2(17, s * 10.5)
		_shine.draw_texture_rect(_dot, Rect2(e - Vector2(12, 12), Vector2(24, 24)), false,
			Color(1.0, 0.5, 0.15, fade))
	_shine.draw_set_transform_matrix(Transform2D())


func _outline(poly: PackedVector2Array, color: Color, width: float) -> void:
	var ring := poly.duplicate()
	ring.append(poly[0])
	_solid.draw_polyline(ring, color, width)


func _dot_at(pos: Vector2, radius: float, c: Color) -> void:
	draw_texture_rect(_dot, Rect2(pos - Vector2(radius, radius), Vector2(radius, radius) * 2.0),
		false, c)

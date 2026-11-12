class_name Vfx
extends Node2D
## Particle system modelled on the EggPact battle effects: one soft glow dot drawn with
## additive blending, stacked until the centres burn white. Particles live on the ground
## plane (x, y) with a height z, so they can rise, fall and cast nothing on the floor.
##
## Two layers: this node draws additive particles; a child draws normal-blend ones (smoke).
## Call the static helpers (Vfx.burst, Vfx.ring, Vfx.slash ...) from anywhere.

enum Kind { GLOW, FLAME, TWINKLE, SMOKE, RING, SLASH, STREAK, BEAM }

const MAX_PARTICLES := 1400

## Skill and element palettes, as in EggPact: aura (main), core (inner), hot (white-hot),
## rune (ground marks), cut (cut-in banner).
const PAL := {
	"steel": {"aura": Color("7ab8ff"), "core": Color("d8ecff"), "hot": Color("ffffff"),
		"rune": Color("9cc8ff"), "cut": Color("2a5fb0")},
	"holy": {"aura": Color("ffd54a"), "core": Color("fff6c8"), "hot": Color("ffffff"),
		"rune": Color("ffe58a"), "cut": Color("c99a10")},
	"fire": {"aura": Color("ff8a2a"), "core": Color("ffe1a0"), "hot": Color("fff4d6"),
		"rune": Color("ffb35a"), "cut": Color("d9481c")},
	"aegis": {"aura": Color("6fd2ff"), "core": Color("d2efff"), "hot": Color("ffffff"),
		"rune": Color("7cd0ff"), "cut": Color("1f6fd0")},
	"dark": {"aura": Color("b061ff"), "core": Color("ead0ff"), "hot": Color("ffffff"),
		"rune": Color("c890ff"), "cut": Color("6a2bb8")},
}

static var instance: Vfx

## Seconds of slow motion left (particles run at a quarter speed during hit-stop).
var slow := 0.0

var _parts: Array[VfxParticle] = []
var _normal: Node2D
var _dot: Texture2D


class VfxParticle:
	extends RefCounted
	var kind := Kind.GLOW
	var x := 0.0
	var y := 0.0
	var z := 0.0
	var vx := 0.0
	var vy := 0.0
	var vz := 0.0
	var t := 0.0
	var life := 1.0
	var size := 10.0
	## Size at the end of life; NAN keeps it constant.
	var size2 := NAN
	var color := Color.WHITE
	var grav := 0.0
	var drag := 0.0
	var rot := 0.0
	var vr := 0.0
	var width := 6.0
	var alpha := 1.0


static func pal(name: String) -> Dictionary:
	return PAL.get(name, PAL["steel"])


func _ready() -> void:
	instance = self
	z_index = 20
	material = Fx.additive()
	_dot = _make_dot()
	_normal = Node2D.new()
	_normal.z_index = -1
	_normal.draw.connect(_draw_normal)
	add_child(_normal)


func _exit_tree() -> void:
	if instance == self:
		instance = null


## Soft radial dot: bright centre, long soft falloff (EggPact's "dot").
static func _make_dot() -> Texture2D:
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	g.add_point(0.18, Color(1, 1, 1, 0.95))
	g.add_point(0.5, Color(1, 1, 1, 0.33))
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = 64
	tex.height = 64
	return tex


func add(p: VfxParticle) -> void:
	if _parts.size() >= MAX_PARTICLES:
		_parts.pop_front()
	_parts.append(p)


func _process(delta: float) -> void:
	slow = maxf(0.0, slow - delta)
	var dt := delta * (0.25 if slow > 0.0 else 1.0)
	var i := _parts.size() - 1
	while i >= 0:
		var p := _parts[i]
		p.t += dt
		if p.t >= p.life:
			_parts.remove_at(i)
			i -= 1
			continue
		var dr := exp(-p.drag * dt)
		p.vx *= dr
		p.vy *= dr
		p.vz *= dr
		p.vz -= p.grav * dt
		p.x += p.vx * dt
		p.y += p.vy * dt
		p.z += p.vz * dt
		p.rot += p.vr * dt
		i -= 1
	queue_redraw()
	_normal.queue_redraw()


func _size_of(p: VfxParticle, u: float) -> float:
	return p.size if is_nan(p.size2) else lerpf(p.size, p.size2, u)


func _draw() -> void:
	for p in _parts:
		if p.kind == Kind.SMOKE:
			continue
		var u := p.t / p.life
		var a := (1.0 - u) * p.alpha
		var sz := _size_of(p, u)
		var pos := Vector2(p.x, p.y - p.z)
		match p.kind:
			Kind.GLOW:
				_dot_at(pos, sz, Color(p.color, a))
				if sz > 10.0:
					_dot_at(pos, sz * 0.35, Color(1, 1, 1, a * 0.7))
			Kind.FLAME:
				var s := sz * (1.0 - u * 0.5)
				var c := Color("ffe1a0") if u < 0.3 else p.color
				draw_texture_rect(_dot, Rect2(pos - Vector2(s * 0.5, s * 0.85), Vector2(s, s * 1.7)),
					false, Color(c, a))
			Kind.TWINKLE:
				var k := sin(u * PI)
				draw_line(pos - Vector2(sz, 0), pos + Vector2(sz, 0), Color(p.color, k), 1.8)
				draw_line(pos - Vector2(0, sz), pos + Vector2(0, sz), Color(p.color, k), 1.8)
				_dot_at(pos, sz * 0.5, Color(p.color, k * 0.6))
			Kind.RING:
				var r := lerpf(p.size, p.size2, 1.0 - pow(1.0 - u, 3.0))
				var w := maxf(0.6, p.width * (1.0 - u))
				draw_set_transform(pos, 0.0, Vector2(1.0, GameData.Y_SQUASH))
				draw_arc(Vector2.ZERO, maxf(0.5, r), 0.0, TAU, 56, Color(p.color, a), w)
				draw_set_transform(Vector2.ZERO)
			Kind.SLASH:
				# An elliptical arc that sweeps open quickly, then thins out.
				var sweep := 1.8 * (1.0 - pow(1.0 - minf(1.0, u * 2.5), 3.0))
				var w := p.width * (1.0 - u * 0.6)
				draw_set_transform(pos, 0.0, Vector2(1.0, 0.55))
				draw_arc(Vector2.ZERO, p.size, p.rot, p.rot + sweep, 24, Color(p.color, a), w)
				draw_set_transform(Vector2.ZERO)
			Kind.STREAK:
				var tail := pos - Vector2(p.vx, p.vy - p.vz) * 0.04
				draw_line(pos, tail, Color(p.color, a), p.size)
			Kind.BEAM:
				var w := p.size * (1.0 - u * 0.6)
				draw_texture_rect(_dot, Rect2(pos.x - w, pos.y - 700.0, w * 2.0, 700.0), false,
					Color(p.color, a * 0.8))
				draw_texture_rect(_dot, Rect2(pos.x - w * 0.35, pos.y - 700.0, w * 0.7, 700.0), false,
					Color(1, 1, 1, a * 0.9))


func _draw_normal() -> void:
	for p in _parts:
		if p.kind != Kind.SMOKE:
			continue
		var u := p.t / p.life
		var sz := _size_of(p, u)
		var pos := Vector2(p.x, p.y - p.z)
		_normal.draw_texture_rect(_dot, Rect2(pos - Vector2(sz, sz * 0.7), Vector2(sz * 2.0, sz * 1.4)),
			false, Color(p.color, (1.0 - u) * p.alpha))


func _dot_at(pos: Vector2, radius: float, c: Color) -> void:
	draw_texture_rect(_dot, Rect2(pos - Vector2(radius, radius), Vector2(radius, radius) * 2.0),
		false, c)


# ---------------------------------------------------------------- spawn helpers
## All positions are the point on the ground; z is the height above it.

static func glow(
		at: Vector2, z: float, size: float, color: Color, life: float = 0.4,
		vel: Vector3 = Vector3.ZERO, size2: float = 0.0, kind: Kind = Kind.GLOW
) -> void:
	if instance == null:
		return
	var p := VfxParticle.new()
	p.x = at.x
	p.y = at.y
	p.z = z
	p.vx = vel.x
	p.vy = vel.y
	p.vz = vel.z
	p.kind = kind
	p.size = size
	p.size2 = size2
	p.color = color
	p.life = life
	instance.add(p)


static func burst(
		at: Vector2, z: float, n: int, color: Color, speed: float, size: float, life: float,
		kind: Kind = Kind.GLOW, grav: float = 0.0
) -> void:
	if instance == null:
		return
	for i in n:
		var a := randf() * TAU
		var s := speed * randf_range(0.3, 1.0)
		var p := VfxParticle.new()
		p.kind = kind
		p.x = at.x
		p.y = at.y
		p.z = z
		p.vx = cos(a) * s
		p.vy = sin(a) * s * GameData.Y_SQUASH
		p.vz = randf_range(-0.2, 0.6) * s
		p.size = size * randf_range(0.6, 1.2)
		p.size2 = 0.0
		p.life = life * randf_range(0.6, 1.1)
		p.color = color
		p.drag = 2.5
		p.grav = grav
		instance.add(p)


static func ring(
		at: Vector2, r0: float, r1: float, color: Color, life: float, width: float = 6.0
) -> void:
	if instance == null:
		return
	var p := VfxParticle.new()
	p.kind = Kind.RING
	p.x = at.x
	p.y = at.y
	p.size = r0
	p.size2 = r1
	p.color = color
	p.life = life
	p.width = width
	instance.add(p)


## Two-layer sword arc (aura wide + hot thin) with sparks, like EggPact's slashFx.
## dir is a screen-space direction.
static func slash(at: Vector2, z: float, dir: Vector2, palette: Dictionary, s: float = 1.0) -> void:
	if instance == null:
		return
	var base := dir.angle()
	for layer in [[70.0, 16.0, 0.28, -0.9, palette["aura"]], [58.0, 6.0, 0.22, -0.7, palette["hot"]]]:
		var p := VfxParticle.new()
		p.kind = Kind.SLASH
		p.x = at.x
		p.y = at.y
		p.z = z
		p.size = float(layer[0]) * s
		p.width = float(layer[1]) * s
		p.life = float(layer[2])
		p.rot = base + float(layer[3])
		p.color = layer[4]
		instance.add(p)
	burst(at, z, 16, palette["aura"], 420.0 * s, 16.0, 0.4)
	burst(at, z, 8, palette["hot"], 300.0, 10.0, 0.3)
	ring(at, 10.0, 70.0 * s, palette["core"], 0.3, 5.0)


## Fiery impact: two rings, two bursts, rising flames and a puff of smoke.
static func explode(at: Vector2, palette: Dictionary, big: bool) -> void:
	if instance == null:
		return
	ring(at, 10.0, 160.0 if big else 90.0, palette["aura"], 0.45, 10.0 if big else 7.0)
	ring(at, 6.0, 110.0 if big else 60.0, palette["hot"], 0.3, 4.0)
	burst(at, 30.0, 44 if big else 22, palette["aura"], 520.0 if big else 360.0,
		30.0 if big else 20.0, 0.6)
	burst(at, 30.0, 20 if big else 10, palette["hot"], 300.0, 14.0, 0.4)
	for i in (12 if big else 6):
		flame(at + Vector2(randf_range(-30, 30), randf_range(-12, 12)), palette["aura"],
			randf_range(16, 28), randf_range(80, 180), randf_range(0.5, 0.9))
	smoke(at, 40.0, 60.0, 120.0, Color(0.23, 0.19, 0.16), 1.2, 0.3)


static func flame(at: Vector2, color: Color, size: float, rise: float, life: float) -> void:
	if instance == null:
		return
	var p := VfxParticle.new()
	p.kind = Kind.FLAME
	p.x = at.x
	p.y = at.y
	p.z = 10.0
	p.vz = rise
	p.size = size
	p.color = color
	p.life = life
	p.drag = 1.0
	instance.add(p)


static func smoke(
		at: Vector2, z: float, size: float, size2: float, color: Color, life: float, alpha: float
) -> void:
	if instance == null:
		return
	var p := VfxParticle.new()
	p.kind = Kind.SMOKE
	p.x = at.x
	p.y = at.y
	p.z = z
	p.vz = 40.0
	p.size = size
	p.size2 = size2
	p.color = color
	p.life = life
	p.alpha = alpha
	instance.add(p)


static func twinkle(at: Vector2, z: float, size: float, color: Color, life: float = 0.5) -> void:
	if instance == null:
		return
	var p := VfxParticle.new()
	p.kind = Kind.TWINKLE
	p.x = at.x
	p.y = at.y
	p.z = z
	p.size = size
	p.color = color
	p.life = life
	instance.add(p)


## Vertical column of light from the sky down to the ground point.
static func beam(at: Vector2, width: float, color: Color, life: float) -> void:
	if instance == null:
		return
	var p := VfxParticle.new()
	p.kind = Kind.BEAM
	p.x = at.x
	p.y = at.y
	p.size = width
	p.color = color
	p.life = life
	instance.add(p)


## Light streaks converging on a point (charging up a skill).
static func charge(
		at: Vector2, z: float, palette: Dictionary, n: int = 3, reach: float = 120.0
) -> void:
	if instance == null:
		return
	for i in n:
		var a := randf() * TAU
		var r := randf_range(reach * 0.5, reach)
		var p := VfxParticle.new()
		p.kind = Kind.STREAK
		p.x = at.x + cos(a) * r
		p.y = at.y
		p.z = z + sin(a) * r * 0.6
		p.vx = -cos(a) * r * 4.0
		p.vz = -sin(a) * r * 0.6 * 4.0
		p.life = 0.25
		p.size = 3.0
		p.color = palette["core"]
		instance.add(p)
	glow(at, z, 30.0, palette["aura"], 0.12)

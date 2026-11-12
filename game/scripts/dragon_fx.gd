class_name DragonFx
extends Node2D
## Golden Dragon God, painted with EggPact's dragon art:
##   ORBIT  while the warden chants, a golden dragon (dragon_fly) flies circles around them,
##          passing behind them on the far side of the circle;
##   RISE   on release a coiling dragon of light (dragon_coil) shoots up out of the warden;
##   ROAR   the winged dragon god (dragon_wings) spreads its wings over their head, god rays
##          turning behind it;
##   DIVE   it streaks down onto the enemies (dragon_fly again, nose first) and explodes.
## The caster starts it with the cast and calls release() when the chant ends.

signal impact(at: Vector2)

enum Phase { ORBIT, RISE, ROAR, DIVE, FADE }

const ORBIT_RADIUS := 150.0
## Height of the flying dragon above the ground while it circles.
const ORBIT_LIFT := 70.0
## On-screen height of the painted dragons.
const FLY_HEIGHT := 118.0
const WINGS_HEIGHT := 250.0
const COIL_HEIGHT := 360.0
## Where the winged dragon hangs, above the caster's feet.
const SKY := 250.0
const RISE_TIME := 0.45
const ROAR_TIME := 0.65
const DIVE_TIME := 0.28
const FADE_TIME := 0.5
## z_index (absolute) when the flier passes behind the caster. The caster sits at
## Juice.FOCUS_Z during the cast spotlight.
const BEHIND_Z := Juice.FOCUS_Z - 1
const FRONT_Z := 22

var caster: Node2D
var palette: Dictionary = Vfx.pal("dragon")
## Picks the dive target; set by the caster.
var choose_target: Callable
## Ground point the dragon dives onto; chosen when the dive starts.
var target := Vector2.ZERO

var _phase := Phase.ORBIT
var _t := 0.0
var _angle := 0.0
var _released := false
var _trail_left := 0.0
var _home := Vector2.ZERO
var _dive_from := Vector2.ZERO
var _fly: Sprite2D
var _coil: Sprite2D
var _wings: Sprite2D
var _rays: Sprite2D


func _ready() -> void:
	add_to_group("dragon")
	add_to_group("big_fx")
	_angle = randf() * TAU
	_home = _caster_pos()
	var aura: Color = palette["aura"]
	_fly = _painted("dragon_fly", FLY_HEIGHT, 0.35)
	_coil = _glow_sprite("dragon_coil", COIL_HEIGHT, aura.lerp(Color.WHITE, 0.25))
	if _coil != null:
		# Anchored at the bottom so it grows upward out of the caster.
		_coil.offset = Vector2(0.0, -_coil.texture.get_height() * 0.5)
	_rays = _glow_sprite("godrays", WINGS_HEIGHT * 1.9, aura)
	_wings = _painted("dragon_wings", WINGS_HEIGHT, 0.3)
	for s: Sprite2D in [_fly, _coil, _rays, _wings]:
		if s != null:
			s.visible = false


## The chant is over: the dragon rises and dives.
func release() -> void:
	_released = true


func _process(delta: float) -> void:
	_t += delta
	if _phase == Phase.ORBIT or _phase == Phase.RISE:
		if not is_instance_valid(caster) or bool(caster.get("dead")):
			queue_free()
			return
		_home = _caster_pos()
	match _phase:
		Phase.ORBIT:
			_tick_orbit(delta)
			if _released:
				_enter(Phase.RISE)
		Phase.RISE:
			_tick_rise()
			if _t >= RISE_TIME:
				_enter(Phase.ROAR)
		Phase.ROAR:
			_tick_roar()
			if _t >= ROAR_TIME:
				_enter(Phase.DIVE)
		Phase.DIVE:
			_tick_dive(delta)
			if _t >= DIVE_TIME:
				_enter(Phase.FADE)
		Phase.FADE:
			_tick_fade()
			if _t >= FADE_TIME:
				queue_free()


func _enter(next: Phase) -> void:
	_phase = next
	_t = 0.0
	var aura: Color = palette["aura"]
	match next:
		Phase.RISE:
			if _coil != null:
				_coil.visible = true
				_coil.position = _home
			Vfx.burst(_home, 40.0, 30, aura, 380.0, 14.0, 0.6)
			Vfx.ring(_home, 20.0, 200.0, aura, 0.5, 10.0)
			Juice.flash(0.15, aura)
		Phase.ROAR:
			var sky := _home + Vector2(0.0, -SKY)
			if _wings != null:
				_wings.visible = true
				_wings.position = sky
			if _rays != null:
				_rays.visible = true
				_rays.position = sky
			Juice.flash(0.28, aura)
			Fx.streaks(get_parent(), sky, aura, 460.0, 22, 0.55, 1.2)
			Vfx.burst(sky, 0.0, 40, aura, 520.0, 18.0, 0.7)
			Vfx.burst(sky, 0.0, 20, palette["hot"], 320.0, 12.0, 0.5)
			if caster != null and caster.has_method("shake"):
				caster.shake(10.0)
		Phase.DIVE:
			target = choose_target.call() if choose_target.is_valid() else _home
			_dive_from = _home + Vector2(0.0, -SKY)
			if _wings != null:
				_wings.visible = false
			if _fly != null:
				_fly.visible = true
				_fly.z_as_relative = false
				_fly.z_index = FRONT_Z
				var dir := (target - _dive_from).normalized()
				_fly.rotation = dir.angle()
				_fly.flip_h = false
				_fly.flip_v = dir.x < 0.0
				_fly.scale = _fly.get_meta("base_scale") * 1.25
				_sync_glow(_fly)
				var trail := FxSprite.play(get_parent(), "trail", _dive_from.lerp(target, 0.5),
					FLY_HEIGHT * 0.9, DIVE_TIME + 0.35, false, aura)
				if trail != null:
					trail.rotation = dir.angle()
					var span := _dive_from.distance_to(target) / trail.texture.get_width()
					trail._base_scale = Vector2(span * 1.1, trail._base_scale.y)
					trail.grow_from = 1.0
					trail.grow_to = 1.0
					trail.fade_out = 0.3
		Phase.FADE:
			impact.emit(target)
			# The dragon god's spirit flares over the blast.
			var ghost := FxSprite.play(get_parent(), "dragon_wings", target + Vector2(0.0, -150.0),
				WINGS_HEIGHT, 0.6)
			if ghost != null:
				ghost.material = Fx.additive()
				ghost.modulate = Color(aura.lerp(Color.WHITE, 0.3), 1.0)
				ghost.grow_from = 0.9
				ghost.grow_to = 1.6
				ghost.fade_in = 0.0
				ghost.fade_out = 0.5


func _tick_orbit(delta: float) -> void:
	if _fly == null:
		return
	var appear := clampf(_t / 0.3, 0.0, 1.0)
	_angle += delta * TAU * 0.75 * (0.6 + 0.4 * appear)
	var ground := Vector2.from_angle(_angle) * ORBIT_RADIUS
	var bob := sin(_t * 5.0) * 8.0
	_fly.visible = true
	_fly.position = _home + GameData.to_screen(ground) + Vector2(0.0, -ORBIT_LIFT - bob)
	# Heading along the circle; the art faces right, so mirror when flying left.
	var heading := GameData.to_screen(Vector2.from_angle(_angle + PI * 0.5))
	_fly.flip_h = heading.x < 0.0
	_fly.flip_v = false
	var tilt := clampf(heading.y / maxf(absf(heading.x), 0.2), -0.5, 0.5)
	_fly.rotation = -tilt if _fly.flip_h else tilt
	var depth := sin(_angle)
	_fly.scale = _fly.get_meta("base_scale") * (0.88 + 0.14 * depth) * (0.4 + 0.6 * appear)
	_fly.modulate.a = appear * (0.85 + 0.15 * depth)
	_fly.z_index = FRONT_Z if depth >= 0.0 else BEHIND_Z
	_sync_glow(_fly)
	_sparkle_trail(_fly.position, delta)


func _tick_rise() -> void:
	var u := _t / RISE_TIME
	# The flier swoops into the rising coil.
	if _fly != null:
		_fly.modulate.a = maxf(0.0, 1.0 - u * 3.0)
		_fly.position = _fly.position.lerp(_home + Vector2(0.0, -60.0), 0.25)
	if _coil != null:
		_coil.position = _home
		var grow := 1.0 - pow(1.0 - u, 3.0)
		var base: Vector2 = _coil.get_meta("base_scale")
		_coil.scale = Vector2(base.x * (0.7 + 0.3 * grow), base.y * grow)
		_coil.modulate.a = 1.0
	if _rays != null:
		_rays.visible = true
		_rays.position = _home + Vector2(0.0, -SKY)
		_rays.modulate.a = u * 0.6
		_rays.rotation += 0.01


func _tick_roar() -> void:
	var u := _t / ROAR_TIME
	var sky := _home + Vector2(0.0, -SKY)
	if _coil != null:
		_coil.modulate.a = maxf(0.0, 1.0 - u * 2.5)
	if _wings != null:
		# Pops in with a little overshoot, then breathes while the god rays turn.
		var pop := minf(_t / 0.22, 1.0)
		var k := 0.3 + 0.7 * pop + sin(pop * PI) * 0.18
		var base: Vector2 = _wings.get_meta("base_scale")
		_wings.scale = base * k * (1.0 + 0.03 * sin(_t * 18.0))
		_wings.position = sky + Vector2(0.0, -10.0 * u)
		_wings.modulate.a = 1.0
		var glow := _wings.get_child(0) as Sprite2D
		glow.modulate.a = 0.25 + 0.45 * (1.0 - pop) + 0.15 * sin(_t * 14.0)
	if _rays != null:
		_rays.position = sky
		_rays.rotation += 0.012
		_rays.modulate.a = 0.6 + 0.3 * sin(_t * 10.0)
	if randf() < 0.6:
		Vfx.glow(sky + Vector2(randf_range(-160, 160), randf_range(-60, 60)), 0.0,
			randf_range(5, 10), palette["core"], randf_range(0.4, 0.8), Vector3(0, 0, 60))


func _tick_dive(delta: float) -> void:
	var u := _t / DIVE_TIME
	var e := u * u
	if _fly != null:
		_fly.position = _dive_from.lerp(target + Vector2(0.0, -40.0), e)
		_fly.modulate.a = 1.0
		_sparkle_trail(_fly.position, delta)
	if _rays != null:
		_rays.modulate.a = maxf(0.0, _rays.modulate.a - delta * 4.0)


func _tick_fade() -> void:
	var u := _t / FADE_TIME
	if _fly != null:
		_fly.modulate.a = maxf(0.0, 1.0 - u * 4.0)
	if _rays != null:
		_rays.visible = false


func _sparkle_trail(at: Vector2, delta: float) -> void:
	_trail_left -= delta
	if _trail_left > 0.0:
		return
	_trail_left = 0.025
	var tint: Color = palette["core"] if randf() < 0.4 else palette["aura"]
	Vfx.glow(at + Vector2(randf_range(-20, 20), randf_range(-10, 10)), 0.0, randf_range(6, 12),
		tint, randf_range(0.35, 0.7), Vector3(randf_range(-20, 20), 0.0, randf_range(10, 40)))


## The glow copy is a child sprite; flips are not inherited, so copy them.
func _sync_glow(s: Sprite2D) -> void:
	var g := s.get_child(0) as Sprite2D
	g.flip_h = s.flip_h
	g.flip_v = s.flip_v


func _caster_pos() -> Vector2:
	return caster.global_position if is_instance_valid(caster) else _home


## Painted RGBA art drawn normally, with an additive copy on top so it glows.
func _painted(fx_name: String, height: float, glow: float) -> Sprite2D:
	var path := FxSprite.DIR + fx_name + ".png"
	if not ResourceLoader.exists(path):
		return null
	var tex: Texture2D = load(path)
	var s := Sprite2D.new()
	s.texture = tex
	var k := height / tex.get_height()
	s.set_meta("base_scale", Vector2(k, k))
	s.scale = Vector2(k, k)
	s.z_as_relative = false
	s.z_index = FRONT_Z
	var g := Sprite2D.new()
	g.texture = tex
	g.material = Fx.additive()
	g.modulate = Color(1, 1, 1, glow)
	s.add_child(g)
	add_child(s)
	return s


## White-on-black art drawn additively and tinted.
func _glow_sprite(fx_name: String, height: float, tint: Color) -> Sprite2D:
	var path := FxSprite.DIR + fx_name + ".png"
	if not ResourceLoader.exists(path):
		return null
	var tex: Texture2D = load(path)
	var s := Sprite2D.new()
	s.texture = tex
	s.material = Fx.additive()
	s.modulate = Color(tint, 1.0)
	var k := height / tex.get_height()
	s.set_meta("base_scale", Vector2(k, k))
	s.scale = Vector2(k, k)
	s.z_as_relative = false
	s.z_index = FRONT_Z - 1
	add_child(s)
	return s

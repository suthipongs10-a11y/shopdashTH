class_name AoePulse
extends Node2D
## Generic ground area effect: optional delay (telegraph), then N damage ticks.
## Lives in the ground-effect layer; anything that rises above the ground (pillars,
## sparks) is spawned into top_fx so it draws over characters.
## Painted art in art/fx/ (ring, explosion, cross, pillar) is used when present;
## otherwise the procedural effects in Fx stand in.

enum Style { SHOCK, CIRCLE, WHIRL, ROAR, CROSS, BANNER, DRAGON }

var player: Player
var top_fx: Node
## If set, the effect follows this node (e.g. an aura around the player).
var follow: Node2D
var style: Style = Style.SHOCK
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
var palette: Dictionary = Vfx.pal("holy")
var tally: SkillTally

var _timer := 0.0
var _age := 0.0
var _total_delay := 0.0
var _fade := 1.0
## Painted rune ring under circle-type skills (replaces the drawn magic circle).
var _ring: FxSprite


func _ready() -> void:
	_total_delay = delay
	if style in [Style.CIRCLE, Style.ROAR, Style.CROSS, Style.BANNER]:
		var life := delay + interval * float(ticks) + 0.4
		_ring = FxSprite.play(self, "ring", Vector2.ZERO, radius * 2.1, life, true)
		if _ring != null:
			_ring.hold_frame = 0
			_ring.grow_from = 0.4
			_ring.grow_to = 1.0
			_ring.fade_out = 0.35


func _process(delta: float) -> void:
	if is_instance_valid(follow):
		global_position = follow.global_position
	_age += delta
	queue_redraw()
	if delay > 0.0:
		delay -= delta
		return
	_timer -= delta
	if ticks > 0 and _timer <= 0.0:
		ticks -= 1
		_timer = interval
		_fire()
	if ticks <= 0:
		_fade -= delta / 0.35
		if _fade <= 0.0:
			queue_free()


func _fire() -> void:
	if not is_instance_valid(player):
		return
	var bursts := 0
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
		# Every target gets its own impact, capped so huge packs stay readable.
		if bursts < 8:
			bursts += 1
			_impact_on(m, offset)
		player.strike(m, mult, push, stun, tally if is_instance_valid(tally) else null)
	if bursts > 0 and style in [Style.ROAR, Style.BANNER, Style.CROSS, Style.DRAGON]:
		Juice.hitstop(0.08 if style == Style.DRAGON else 0.06)
	if shake > 0.0:
		player.shake(shake)
	_fire_visuals()


## Per-target impact, EggPact style: melee skills slash, magic skills explode.
func _impact_on(m: Monster, offset: Vector2) -> void:
	var at := m.global_position
	match style:
		Style.WHIRL:
			var tangent := GameData.to_screen(offset.orthogonal()).normalized()
			Vfx.slash(at, m.visual_height() * 0.45, tangent, palette, 0.9)
		Style.SHOCK:
			Vfx.burst(at, 40.0, 8, palette["aura"], 320.0, 12.0, 0.4)
		Style.CROSS:
			Vfx.explode(at, palette, false)
		Style.ROAR, Style.BANNER, Style.DRAGON:
			Vfx.explode(at, palette, true)
			if style != Style.ROAR:
				Vfx.beam(at, 34.0, palette["aura"], 0.45)
		_:
			Vfx.burst(at, 40.0, 6, palette["aura"], 260.0, 10.0, 0.35)


func _fire_visuals() -> void:
	var here := global_position
	match style:
		Style.SHOCK:
			Vfx.ring(here, 10.0, radius * 1.15, palette["aura"], 0.4, 10.0)
			Vfx.ring(here, 6.0, radius * 0.8, palette["hot"], 0.3, 4.0)
			Vfx.burst(here, 30.0, 26, palette["aura"], 420.0, 18.0, 0.5)
			Vfx.smoke(here, 20.0, 50.0, 110.0, Color(0.85, 0.78, 0.65), 0.9, 0.25)
		Style.CIRCLE:
			Vfx.ring(here, radius * 0.4, radius, palette["aura"], 0.4, 5.0)
			Vfx.burst(here, 20.0, 10, palette["core"], 160.0, 10.0, 0.6)
		Style.WHIRL:
			Vfx.ring(here, radius * 0.5, radius * 1.05, palette["core"], 0.25, 4.0)
			for i in 3:
				var a := randf() * TAU
				Vfx.slash(here + GameData.to_screen(Vector2.from_angle(a) * radius * 0.5), 46.0,
					Vector2.from_angle(a + PI * 0.5), palette, 1.2)
		Style.ROAR:
			Juice.flash(0.22, palette["aura"])
			_painted_ring(here, radius * 2.6, 0.5)
			Vfx.ring(here, 20.0, radius * 1.2, palette["aura"], 0.5, 14.0)
			Vfx.ring(here, 10.0, radius * 0.8, palette["hot"], 0.35, 6.0)
			Vfx.burst(here, 60.0, 50, palette["aura"], 620.0, 30.0, 0.7)
			Vfx.burst(here, 60.0, 24, palette["hot"], 380.0, 16.0, 0.45)
			for i in 14:
				Vfx.flame(here + GameData.to_screen(Vector2.from_angle(TAU * i / 14.0) * radius * 0.6),
					palette["aura"], randf_range(22, 36), randf_range(120, 240), randf_range(0.5, 0.9))
			Fx.streaks(top_fx, here + Vector2(0.0, -40.0), palette["aura"], radius * 2.4, 24, 0.5, 1.1)
		Style.CROSS:
			Juice.flash(0.1, palette["aura"])
			var cross := FxSprite.play(top_fx, "cross", here + Vector2(0.0, -90.0), radius * 2.6, 0.5)
			if cross != null:
				cross.grow_from = 0.5
				cross.grow_to = 1.15
			else:
				Vfx.twinkle(here, 90.0, radius * 1.5, palette["core"], 0.5)
				Vfx.twinkle(here, 90.0, radius * 0.9, Color.WHITE, 0.35)
			Vfx.beam(here, 50.0, palette["aura"], 0.5)
			Vfx.ring(here, 10.0, radius * 1.1, palette["aura"], 0.45, 8.0)
			Vfx.burst(here, 40.0, 24, palette["aura"], 360.0, 16.0, 0.55)
		Style.DRAGON:
			Juice.flash(0.35, palette["aura"])
			Vfx.ring(here, 20.0, radius * 1.3, palette["aura"], 0.6, 16.0)
			Vfx.ring(here, 10.0, radius * 0.9, palette["hot"], 0.4, 8.0)
			Vfx.burst(here, 40.0, 60, palette["aura"], 700.0, 30.0, 0.7)
			Vfx.burst(here, 40.0, 30, palette["hot"], 420.0, 16.0, 0.5)
			Vfx.beam(here, 120.0, palette["aura"], 0.6)
			for i in 18:
				Vfx.flame(here + GameData.to_screen(Vector2.from_angle(TAU * i / 18.0) * radius * 0.55),
					palette["aura"], randf_range(24, 40), randf_range(140, 280), randf_range(0.5, 0.9))
			Vfx.smoke(here, 30.0, 80.0, 200.0, Color(0.3, 0.24, 0.16), 1.4, 0.35)
			Fx.streaks(top_fx, here + Vector2(0.0, -40.0), palette["aura"], radius * 2.6, 26, 0.55, 1.3)
		Style.BANNER:
			Juice.flash(0.2, palette["aura"])
			_painted_ring(here, radius * 2.4, 0.5)
			Vfx.ring(here, 20.0, radius * 1.15, palette["aura"], 0.5, 12.0)
			Vfx.burst(here, 60.0, 40, palette["aura"], 560.0, 24.0, 0.6)
			# Gold and blue spiral streaks, like the reference clip's big finisher.
			Fx.streaks(top_fx, here + Vector2(0.0, -40.0), palette["aura"], radius * 2.6, 20, 0.55, 1.4)
			Fx.streaks(top_fx, here + Vector2(0.0, -40.0), Color(0.55, 0.75, 1.0), radius * 2.2, 10,
				0.55, -1.2)
			for i in 3:
				var spot := here + GameData.to_screen(Vector2.from_angle(randf() * TAU)
					* randf_range(0.3, 0.95) * radius)
				Vfx.beam(spot, 36.0, palette["aura"], 0.4)
				Vfx.ring(spot, 6.0, 70.0, palette["hot"], 0.3, 4.0)


## Expanding painted ring on the ground. Returns false when there is no ring art.
func _painted_ring(at: Vector2, size: float, life: float) -> bool:
	var r := FxSprite.play(get_parent(), "ring", at, size, life, true)
	if r == null:
		return false
	r.hold_frame = 0
	r.grow_from = 0.3
	r.grow_to = 1.0
	return true


## Painted explosion. Returns false when there is no explosion art.
func _explode(at: Vector2, size: float) -> bool:
	var e := FxSprite.play(top_fx, "explosion", at, size)
	if e == null:
		return false
	e.rotation = randf_range(-0.3, 0.3)
	return true


func _draw() -> void:
	var charging := delay > 0.0
	var grow := 1.0
	if charging and _total_delay > 0.0:
		grow = 1.0 - delay / _total_delay
	var alpha := _fade * (0.55 if charging else 0.9)
	var spin := _age * (2.4 if style in [Style.ROAR, Style.BANNER] else 0.9)
	match style:
		Style.SHOCK:
			pass
		Style.CIRCLE, Style.ROAR, Style.CROSS, Style.BANNER:
			if _ring == null:
				_draw_magic_circle(radius * (0.4 + 0.6 * grow), spin, alpha)
		Style.WHIRL:
			_draw_whirl(alpha)


## Rune circle lying on the ground: two rings, a rotating star and tick marks.
func _draw_magic_circle(r: float, spin: float, alpha: float) -> void:
	var line := Color(color.lightened(0.45), alpha)
	var halo := Color(color, alpha * 0.4)
	var outer := GameData.ellipse_outline(r, 48)
	# Darken the ground under the circle so the runes read on bright terrain.
	draw_colored_polygon(GameData.ellipse_points(r, 48), Color(0.25, 0.08, 0.0, 0.3 * alpha))
	draw_colored_polygon(GameData.ellipse_points(r, 48), Color(color, 0.2 * alpha))
	draw_polyline(outer, halo, 12.0)
	draw_polyline(outer, line, 4.0)
	draw_polyline(GameData.ellipse_outline(r * 0.86, 48), line, 2.0)
	draw_polyline(GameData.ellipse_outline(r * 0.42, 32), line, 2.0)
	# Two overlapping triangles (hexagram), rotating.
	for tri in 2:
		var pts := PackedVector2Array()
		for i in 4:
			var a := spin + TAU * float(i) / 3.0 + (PI if tri == 1 else 0.0)
			pts.append(GameData.to_screen(Vector2.from_angle(a) * r * 0.86))
		draw_polyline(pts, halo, 7.0)
		draw_polyline(pts, line, 2.5)
	for i in 12:
		var a := -spin * 0.5 + TAU * float(i) / 12.0
		var d := Vector2.from_angle(a)
		draw_line(GameData.to_screen(d * r * 0.9), GameData.to_screen(d * r), line, 2.0)


## Spinning blade rings around the caster: three crescents at body height plus a faint
## ground ring, each with a fading after-image.
func _draw_whirl(alpha: float) -> void:
	var lift := Vector2(0.0, -46.0)
	draw_set_transform(Vector2.ZERO)
	draw_polyline(GameData.ellipse_outline(radius, 48), Color(color, 0.35 * alpha), 3.0)
	var spin := _age * 15.0
	for blade in 3:
		var base := spin + TAU * float(blade) / 3.0
		for trail in 4:
			var a := base - float(trail) * 0.22
			var fade := alpha * (1.0 - float(trail) * 0.24)
			draw_set_transform(lift)
			Fx.draw_crescent(self, radius * 0.92, 26.0 - trail * 4.0, a, 0.75,
				Color(color, 0.55 * fade))
			Fx.draw_crescent(self, radius * 0.9, 9.0, a, 0.6, Color(1.0, 1.0, 1.0, 0.9 * fade))
	draw_set_transform(Vector2.ZERO)

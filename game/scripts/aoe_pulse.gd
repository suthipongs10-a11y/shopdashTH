class_name AoePulse
extends Node2D
## Generic ground area effect: optional delay (telegraph), then N damage ticks.
## Lives in the ground-effect layer; anything that rises above the ground (pillars,
## sparks) is spawned into top_fx so it draws over characters.
## Painted art in art/fx/ (ring, explosion, cross, pillar) is used when present;
## otherwise the procedural effects in Fx stand in.

enum Style { SHOCK, CIRCLE, WHIRL, ROAR, CROSS, BANNER }

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
		player.strike(m, mult, push, stun, tally if is_instance_valid(tally) else null)
	if shake > 0.0:
		player.shake(shake)
	_fire_visuals()


func _fire_visuals() -> void:
	var here := global_position
	var white := Color(1.0, 1.0, 1.0)
	var body := here + Vector2(0.0, -40.0)
	match style:
		Style.SHOCK:
			if not _painted_ring(here, radius * 2.2, 0.35):
				Fx.ring(get_parent(), here, color, radius, 0.35, 10.0)
			Fx.flash(get_parent(), here, color, radius * 0.9, 0.3, true)
			if not _explode(body, radius * 1.8):
				Fx.burst(top_fx, body, color, 16, 380.0, 0.4, 14.0)
				Fx.sparkle(top_fx, body, white, 120.0, 0.25)
			Fx.streaks(top_fx, body, color, radius * 2.2, 12, 0.3, 0.2)
		Style.CIRCLE:
			Fx.ring(get_parent(), here, color, radius, 0.4, 5.0)
			Fx.burst(top_fx, here + Vector2(0.0, -20.0), color, 10, 160.0, 0.6, 12.0,
				Vector2(0.0, -260.0))
		Style.WHIRL:
			Fx.burst(top_fx, body, white, 5, 260.0, 0.25, 9.0)
		Style.ROAR:
			Fx.flash(get_parent(), here, color, radius * 1.3, 0.5, true)
			_painted_ring(here, radius * 2.6, 0.5)
			Fx.ring(get_parent(), here, white, radius * 0.7, 0.35, 6.0)
			if not _explode(body, radius * 1.6):
				Fx.flash(top_fx, body, white, radius * 0.9, 0.3)
				Fx.burst(top_fx, body, color, 26, 560.0, 0.6, 16.0)
			Fx.streaks(top_fx, body, color, radius * 2.4, 24, 0.5, 1.1)
		Style.CROSS:
			var cross := FxSprite.play(top_fx, "cross", here + Vector2(0.0, -90.0), radius * 2.6, 0.5)
			if cross != null:
				cross.grow_from = 0.5
				cross.grow_to = 1.15
			else:
				Fx.sparkle(top_fx, here + Vector2(0.0, -90.0), Color(1.0, 0.9, 0.55), radius * 1.8,
					0.45)
				Fx.sparkle(top_fx, here + Vector2(0.0, -90.0), white, radius * 1.1, 0.35)
			if FxSprite.play(top_fx, "pillar", here + Vector2(0.0, -200.0), 420.0, 0.45) == null:
				Fx.pillar(top_fx, here, color, radius * 0.7, 420.0, 0.45)
			Fx.flash(get_parent(), here, color, radius * 1.2, 0.4, true)
			Fx.burst(top_fx, body, color, 14, 320.0, 0.5, 12.0, Vector2(0.0, -200.0))
		Style.BANNER:
			Fx.flash(get_parent(), here, color, radius * 1.3, 0.5, true)
			_painted_ring(here, radius * 2.4, 0.5)
			if not _explode(body, radius * 1.5):
				Fx.flash(top_fx, body, white, radius * 0.8, 0.3)
				Fx.burst(top_fx, body, color, 22, 520.0, 0.6, 15.0)
			# Gold and blue spiral streaks, like the reference clip's big finisher.
			Fx.streaks(top_fx, body, color, radius * 2.6, 20, 0.55, 1.4)
			Fx.streaks(top_fx, body, Color(0.55, 0.75, 1.0), radius * 2.2, 10, 0.55, -1.2)
			# Lances of light landing around the blast.
			for i in 3:
				var spot := here + GameData.to_screen(Vector2.from_angle(randf() * TAU)
					* randf_range(0.3, 0.95) * radius)
				if FxSprite.play(top_fx, "pillar", spot + Vector2(0.0, -160.0), 320.0, 0.35) == null:
					Fx.pillar(top_fx, spot, color, 46.0, 320.0, 0.35)


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

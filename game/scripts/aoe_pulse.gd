class_name AoePulse
extends Node2D
## Generic ground area effect: optional delay (telegraph), then N damage ticks.
## Lives in the ground-effect layer; anything that rises above the ground (pillars,
## sparks) is spawned into top_fx so it draws over characters.

enum Style { SHOCK, CIRCLE, JUDGMENT }

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


func _ready() -> void:
	_total_delay = delay


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
		player.strike(m, mult, push, stun, tally)
	if shake > 0.0:
		player.shake(shake)
	_fire_visuals()


func _fire_visuals() -> void:
	var here := global_position
	var white := Color(1.0, 1.0, 1.0)
	match style:
		Style.SHOCK:
			Fx.ring(get_parent(), here, color, radius, 0.35, 10.0)
			Fx.flash(get_parent(), here, color, radius * 0.9, 0.3, true)
			Fx.burst(top_fx, here + Vector2(0.0, -10.0), color, 16, 380.0, 0.4, 14.0)
			Fx.streaks(top_fx, here + Vector2(0.0, -20.0), color, radius * 2.2, 12, 0.3, 0.2)
			Fx.sparkle(top_fx, here + Vector2(0.0, -40.0), white, 120.0, 0.25)
		Style.CIRCLE:
			Fx.ring(get_parent(), here, color, radius, 0.4, 5.0)
			Fx.burst(top_fx, here + Vector2(0.0, -20.0), color, 10, 160.0, 0.6, 12.0,
				Vector2(0.0, -260.0))
		Style.JUDGMENT:
			Fx.pillar(top_fx, here, color, radius * 1.5, 620.0, 0.45)
			Fx.pillar(top_fx, here, white, radius * 0.6, 620.0, 0.3)
			Fx.flash(top_fx, here + Vector2(0.0, -30.0), white, radius * 1.3, 0.3)
			Fx.flash(get_parent(), here, color, radius * 1.5, 0.5, true)
			Fx.ring(get_parent(), here, color, radius * 1.15, 0.45, 12.0)
			Fx.burst(top_fx, here + Vector2(0.0, -20.0), color, 26, 520.0, 0.6, 16.0)
			Fx.streaks(top_fx, here + Vector2(0.0, -30.0), color, radius * 3.2, 22, 0.5, 0.9)
			Fx.sparkle(top_fx, here + Vector2(0.0, -60.0), white, 220.0, 0.3)


func _draw() -> void:
	var charging := delay > 0.0
	var grow := 1.0
	if charging and _total_delay > 0.0:
		grow = 1.0 - delay / _total_delay
	var alpha := _fade * (0.55 if charging else 0.9)
	var spin := _age * (2.4 if style == Style.JUDGMENT else 0.9)
	match style:
		Style.SHOCK:
			pass
		Style.CIRCLE, Style.JUDGMENT:
			_draw_magic_circle(radius * (0.4 + 0.6 * grow), spin, alpha)


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

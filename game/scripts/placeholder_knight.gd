class_name PlaceholderKnight
extends RefCounted
## Stand-in knight until real sprite sheets exist: bobbing body, swinging legs and cape.


static func draw(
		c: Node2D, face: Vector2, moving: bool, walk_t: float, aim: Vector2, swing: float
) -> void:
	var steel := Color(0.72, 0.78, 0.9)
	var steel_dark := Color(0.4, 0.45, 0.6)
	var gold_trim := Color(0.98, 0.8, 0.32)
	var cape := Color(0.85, 0.2, 0.25)
	var screen_face := GameData.to_screen(face).normalized()
	var side := 1.0 if screen_face.x >= 0.0 else -1.0
	var away := screen_face.y < -0.35
	var stride := sin(walk_t)
	var bob := -absf(stride) * 3.0 if moving else sin(Time.get_ticks_msec() * 0.004) * 1.2
	var up := Vector2(0.0, bob)

	# Cape sways opposite to the stride.
	var sway := -side * (5.0 + stride * 4.0) if moving else -side * 2.0
	var cape_pts := PackedVector2Array([
		up + Vector2(-15.0, -58.0), up + Vector2(15.0, -58.0),
		Vector2(20.0 + sway, -10.0), Vector2(-20.0 + sway, -10.0),
	])
	if not away:
		c.draw_colored_polygon(cape_pts, cape)
	# Legs alternate.
	c.draw_rect(Rect2(-11.0, -24.0 + maxf(0.0, stride) * -6.0, 9.0, 24.0), steel_dark)
	c.draw_rect(Rect2(2.0, -24.0 + maxf(0.0, -stride) * -6.0, 9.0, 24.0), steel_dark)
	# Torso, belt
	c.draw_rect(Rect2(up + Vector2(-15.0, -58.0), Vector2(30.0, 36.0)), steel)
	c.draw_rect(Rect2(up + Vector2(-15.0, -30.0), Vector2(30.0, 5.0)), gold_trim)
	# Helmet, face, plume
	c.draw_circle(up + Vector2(0.0, -70.0), 14.0, steel)
	if not away:
		c.draw_circle(up + Vector2(screen_face.x * 4.0, -67.0), 8.0, Color(0.99, 0.84, 0.7))
	c.draw_rect(Rect2(up + Vector2(-3.0, -92.0), Vector2(6.0, 10.0)), cape)
	if away:
		c.draw_colored_polygon(cape_pts, cape)
	# Shield on the off-hand side
	var shield_at := up + Vector2(-side * 19.0, -40.0)
	c.draw_circle(shield_at, 15.0, gold_trim)
	c.draw_circle(shield_at, 11.0, Color(0.25, 0.42, 0.85))
	# Sword: rests along the facing, sweeps across the aim while swinging.
	var hand := up + Vector2(side * 17.0, -42.0)
	var blade_dir := screen_face
	var blade := 46.0
	if swing > 0.0:
		blade = 74.0
		var sweep := aim.angle() + (0.5 - swing / 0.2) * 1.6
		blade_dir = GameData.to_screen(Vector2.from_angle(sweep)).normalized()
	c.draw_line(hand, hand + blade_dir * blade, Color(0.95, 0.97, 1.0), 5.0)
	c.draw_line(hand - blade_dir * 6.0, hand + blade_dir * 8.0, gold_trim, 7.0)

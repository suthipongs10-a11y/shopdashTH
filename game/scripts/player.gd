class_name Player
extends CharacterBody2D
## The Warden (sword & shield). Movement, stats, basic attack and four skills.
## Uses sprite sheets from ART_DIR when present, otherwise placeholder art drawn in _draw().
## Origin is at the feet.

signal target_hit(monster: Monster)
signal leveled_up(new_level: int)
signal died
signal respawned

const ART_DIR := "res://art/characters/warden"
const MOVE_SPEED := 270.0
const ATTACK_REACH := 112.0
const ATTACK_CONE_DEG := 140.0
const DASH_SPEED := 950.0
const DASH_TIME := 0.16
const JUDGMENT_RANGE := 340.0
const RESPAWN_DELAY := 3.0
## Max hit-spark effects per physics frame, so huge packs do not flood the scene.
const HIT_FX_PER_FRAME := 10

var char_name := "ผู้พิทักษ์"
var level := 1
var xp := 0
var gold := 0
var max_hp := 1.0
var hp := 1.0
var max_sp := 1.0
var sp := 1.0
var attack_power := 1.0
var defense := 0.0
var crit_chance := 0.15
var crit_mult := 1.6
var dead := false
## Aim direction on the ground plane (towards the mouse).
var aim := Vector2.RIGHT
## Seconds left per skill id.
var cooldowns := {}
## Command source; swapped for touch controls or the dev autopilot.
var input: PlayerInput = PlayerInput.new()

## Set by main.gd before the player enters the tree.
var ground_fx: Node2D
var top_fx: Node2D

var _camera: Camera2D
var _sheet: SheetSprite
var _name_label: Label
## Ground-plane direction the body faces: movement direction, or aim right after attacking.
var _face := Vector2.DOWN
var _moving := false
var _walk_t := 0.0
var _dust_left := 0.0
var _aim_face_left := 0.0
var _dash_left := 0.0
var _dash_dir := Vector2.ZERO
var _respawn_left := 0.0
var _hurt_flash := 0.0
var _swing := 0.0
var _shake := 0.0
var _hit_fx_budget := HIT_FX_PER_FRAME
var _bash_tally: SkillTally


func _ready() -> void:
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	# Layer 1 = player. Mask 0: the player walks through monsters.
	collision_layer = 1
	collision_mask = 0
	var shape := CircleShape2D.new()
	shape.radius = 16.0
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col)

	_sheet = SheetSprite.new()
	_sheet.load_dir(ART_DIR)
	add_child(_sheet)

	_name_label = Label.new()
	_name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_name_label.size = Vector2(240.0, 22.0)
	_name_label.position = Vector2(-120.0, -128.0)
	_name_label.add_theme_font_size_override("font_size", 14)
	_name_label.add_theme_color_override("font_color", Color(0.75, 1.0, 0.8))
	_name_label.add_theme_color_override("font_outline_color", Color(0.05, 0.1, 0.05))
	_name_label.add_theme_constant_override("outline_size", 5)
	add_child(_name_label)

	_camera = Camera2D.new()
	_camera.position_smoothing_enabled = true
	_camera.position_smoothing_speed = 8.0
	_camera.limit_left = 0
	_camera.limit_top = 0
	_camera.limit_right = int(GameData.MAP_SIZE.x)
	_camera.limit_bottom = int(GameData.MAP_SIZE.y)
	add_child(_camera)
	_camera.make_current()

	for id in GameData.SKILL_ORDER:
		cooldowns[id] = 0.0
	_recalc_stats()
	hp = max_hp
	sp = max_sp


func _recalc_stats() -> void:
	max_hp = 8400.0 + 1600.0 * (level - 1)
	max_sp = 90.0 + 12.0 * (level - 1)
	attack_power = 800.0 + 180.0 * (level - 1)
	defense = 15.0 + 4.0 * (level - 1)
	_name_label.text = "%s  Lv.%d" % [char_name, level]


func _physics_process(delta: float) -> void:
	_hit_fx_budget = HIT_FX_PER_FRAME
	_hurt_flash = maxf(0.0, _hurt_flash - delta)
	_swing = maxf(0.0, _swing - delta)
	_aim_face_left = maxf(0.0, _aim_face_left - delta)
	_shake = move_toward(_shake, 0.0, 40.0 * delta)
	_camera.offset = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * _shake
	if dead:
		modulate = Color(0.5, 0.5, 0.5, 0.5)
		_respawn_left -= delta
		if _respawn_left <= 0.0:
			_respawn()
		return
	modulate = Color(1.0, 0.55, 0.55) if _hurt_flash > 0.0 else Color.WHITE

	for id in cooldowns:
		cooldowns[id] = maxf(0.0, cooldowns[id] - delta)
	hp = minf(max_hp, hp + max_hp * 0.008 * delta)
	sp = minf(max_sp, sp + max_sp * 0.03 * delta)

	var to_aim := input.aim_vector(self)
	if to_aim.length() > 4.0:
		aim = to_aim.normalized()

	if _dash_left > 0.0:
		_dash_left -= delta
		_moving = true
		_face = _dash_dir
		velocity = GameData.to_screen(_dash_dir * DASH_SPEED)
		move_and_slide()
		Fx.flash(top_fx, global_position + Vector2(0.0, -40.0), Color(1.0, 0.8, 0.35, 0.6), 44.0, 0.2)
		if _dash_left <= 0.0:
			_bash_impact()
	else:
		var move := input.move_vector(self)
		_moving = move.length() > 0.05
		velocity = GameData.to_screen(move * MOVE_SPEED)
		move_and_slide()
		if _moving:
			_face = move.normalized()
		_handle_actions()
		if _aim_face_left > 0.0:
			_face = aim

	var margin := Vector2(40.0, 40.0)
	global_position = global_position.clamp(margin, GameData.MAP_SIZE - margin)
	_animate(delta)
	queue_redraw()


func _animate(delta: float) -> void:
	if _moving:
		_walk_t += delta * 11.0
		_dust_left -= delta
		if _dust_left <= 0.0:
			_dust_left = 0.2
			Fx.burst(ground_fx, global_position, Color(1.0, 0.92, 0.8, 0.5), 3, 45.0, 0.45, 26.0,
				Vector2(0.0, -40.0), false)
	else:
		_walk_t = 0.0
	if _sheet.has_art():
		_sheet.set_facing(GameData.to_screen(_face))
		_sheet.play("walk" if _moving else "idle")


func _handle_actions() -> void:
	if input.is_pressed("attack"):
		_try_use("attack")
	if input.is_pressed("skill_wave"):
		_try_use("wave")
	if input.is_pressed("skill_bash"):
		_try_use("bash")
	if input.is_pressed("skill_ring"):
		_try_use("ring")
	if input.is_pressed("skill_judgment"):
		_try_use("judgment")


func _try_use(id: String) -> void:
	var data: Dictionary = GameData.SKILLS[id]
	var cost := float(data["sp"])
	if float(cooldowns[id]) > 0.0 or sp < cost or _dash_left > 0.0:
		return
	sp -= cost
	cooldowns[id] = float(data["cd"])
	_aim_face_left = 0.35
	_face = aim
	_sheet.play_once("attack")
	var mult := float(data["mult"])
	var color: Color = data["color"]
	var tally: SkillTally = null
	if id != "attack":
		tally = SkillTally.new()
		tally.anchor = self
		tally.color = Color(1.0, 0.5, 0.65) if id == "judgment" else Color(1.0, 0.85, 0.3)
		top_fx.add_child(tally)
	match id:
		"attack":
			_do_attack(mult)
		"wave":
			_do_wave(mult, color, tally)
		"bash":
			_dash_left = DASH_TIME
			_dash_dir = aim
			_bash_tally = tally
		"ring":
			_do_ring(mult, color, tally)
		"judgment":
			_do_judgment(mult, color, tally)


## Basic attack: a cone in front of the player.
func _do_attack(mult: float) -> void:
	_swing = 0.2
	var fx := SlashFx.new()
	fx.aim = aim
	fx.reach = ATTACK_REACH
	fx.position = global_position
	top_fx.add_child(fx)
	var half_cone := deg_to_rad(ATTACK_CONE_DEG * 0.5)
	for node in get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null:
			continue
		var offset := GameData.to_ground(m.global_position - global_position)
		if offset.length() > ATTACK_REACH + m.body_radius:
			continue
		if offset.length() > m.body_radius and absf(aim.angle_to(offset)) > half_cone:
			continue
		strike(m, mult, aim * 120.0)


## Q: piercing projectile.
func _do_wave(mult: float, color: Color, tally: SkillTally) -> void:
	_swing = 0.2
	var wave := BladeWave.new()
	wave.player = self
	wave.tally = tally
	wave.dir = aim
	wave.mult = mult
	wave.color = color
	wave.position = global_position
	top_fx.add_child(wave)
	Fx.flash(top_fx, global_position + Vector2(0.0, -30.0), color, 70.0, 0.2)


## E: called when the dash ends. Knocks back and stuns everything nearby.
func _bash_impact() -> void:
	var data: Dictionary = GameData.SKILLS["bash"]
	var pulse := _new_pulse(AoePulse.Style.SHOCK, 140.0, float(data["mult"]), data["color"])
	pulse.knock = 320.0
	pulse.stun = 1.0
	pulse.shake = 7.0
	pulse.tally = _bash_tally
	pulse.position = global_position
	ground_fx.add_child(pulse)


## R: rune circle that follows the player and ticks five times.
func _do_ring(mult: float, color: Color, tally: SkillTally) -> void:
	var pulse := _new_pulse(AoePulse.Style.CIRCLE, 185.0, mult, color)
	pulse.tally = tally
	pulse.follow = self
	pulse.ticks = 5
	pulse.interval = 0.5
	pulse.position = global_position
	ground_fx.add_child(pulse)
	Fx.pillar(top_fx, global_position, color, 120.0, 420.0, 0.5)


## F: delayed triple blast at the aim point (clamped to JUDGMENT_RANGE).
func _do_judgment(mult: float, color: Color, tally: SkillTally) -> void:
	var offset := input.aim_vector(self).limit_length(JUDGMENT_RANGE)
	var pulse := _new_pulse(AoePulse.Style.JUDGMENT, 230.0, mult, color)
	pulse.tally = tally
	pulse.ticks = 3
	pulse.interval = 0.24
	pulse.delay = 0.6
	pulse.knock = 80.0
	pulse.shake = 11.0
	pulse.position = global_position + GameData.to_screen(offset)
	ground_fx.add_child(pulse)


func _new_pulse(style: AoePulse.Style, radius: float, mult: float, color: Color) -> AoePulse:
	var pulse := AoePulse.new()
	pulse.player = self
	pulse.top_fx = top_fx
	pulse.style = style
	pulse.radius = radius
	pulse.mult = mult
	pulse.color = color
	return pulse


## Applies one hit to a monster using the shared damage formula:
## ATK x skill mult x (1 - DEF/(DEF+K)) x crit x combo bonus, with +/-10% variance.
func strike(
		m: Monster, mult: float, knock: Vector2 = Vector2.ZERO, stun: float = 0.0,
		tally: SkillTally = null
) -> void:
	if m.state == Monster.State.DEAD:
		return
	var is_crit := randf() < crit_chance
	var amount := attack_power * mult * randf_range(0.9, 1.1)
	amount *= 1.0 - m.defense / (m.defense + GameData.DEF_K)
	if is_crit:
		amount *= crit_mult
	amount *= 1.0 + Combo.damage_bonus()
	var dmg := maxi(1, roundi(amount))
	var body := m.global_position + Vector2(0.0, -m.body_radius * 1.2)
	m.take_damage(dmg, knock, stun)
	var head := m.global_position + Vector2(0.0, -m.body_radius * 2.6 - 18.0)
	DamageNumber.spawn(top_fx, head, dmg, is_crit, m.get_instance_id())
	Combo.register_hit(dmg)
	if tally != null and is_instance_valid(tally):
		tally.add(dmg)
	if _hit_fx_budget > 0:
		_hit_fx_budget -= 1
		var spark := Color(1.0, 0.75, 0.3) if is_crit else Color(1.0, 0.95, 0.75)
		var jitter := Vector2(randf_range(-10.0, 10.0), randf_range(-10.0, 10.0))
		Fx.flash(top_fx, body, spark, 52.0 if is_crit else 32.0, 0.16)
		Fx.burst(top_fx, body, spark, 7 if is_crit else 4, 300.0, 0.28, 11.0)
		if is_crit or randf() < 0.35:
			Fx.sparkle(top_fx, body + jitter, Color(1.0, 0.95, 0.8), 70.0 if is_crit else 42.0)
	if is_crit:
		shake(3.0)
	target_hit.emit(m)


func take_damage(raw: int) -> void:
	# The shield-bash dash grants invulnerability.
	if dead or _dash_left > 0.0:
		return
	var reduced := float(raw) * (1.0 - defense / (defense + GameData.DEF_K))
	var dmg := maxi(1, roundi(reduced))
	hp -= float(dmg)
	_hurt_flash = 0.15
	DamageNumber.spawn_hurt(top_fx, global_position + Vector2(0.0, -110.0), dmg)
	if hp <= 0.0:
		_die()


func gain_rewards(xp_amount: int, gold_amount: int) -> void:
	gold += gold_amount
	xp += xp_amount
	while xp >= GameData.xp_to_next(level):
		xp -= GameData.xp_to_next(level)
		level += 1
		_recalc_stats()
		hp = max_hp
		sp = max_sp
		var gold_light := Color(1.0, 0.85, 0.4)
		Fx.pillar(top_fx, global_position, gold_light, 150.0, 560.0, 0.8)
		Fx.ring(ground_fx, global_position, gold_light, 200.0, 0.6, 8.0)
		Fx.burst(top_fx, global_position + Vector2(0.0, -40.0), gold_light, 24, 260.0, 0.9, 14.0,
			Vector2(0.0, -200.0))
		leveled_up.emit(level)


func shake(amount: float) -> void:
	_shake = maxf(_shake, amount)


func _die() -> void:
	dead = true
	hp = 0.0
	_dash_left = 0.0
	_respawn_left = RESPAWN_DELAY
	velocity = Vector2.ZERO
	Combo.reset()
	died.emit()


func _respawn() -> void:
	dead = false
	hp = max_hp
	sp = max_sp
	global_position = GameData.MAP_SIZE * 0.5
	modulate = Color.WHITE
	respawned.emit()


func _draw() -> void:
	draw_colored_polygon(GameData.ellipse_points(26.0, 20), Color(0, 0, 0, 0.3))
	if _sheet.has_art():
		return
	_draw_placeholder()


## Stand-in knight until real sprite sheets exist: bobbing body, swinging legs and cape.
func _draw_placeholder() -> void:
	var steel := Color(0.72, 0.78, 0.9)
	var steel_dark := Color(0.4, 0.45, 0.6)
	var gold_trim := Color(0.98, 0.8, 0.32)
	var cape := Color(0.85, 0.2, 0.25)
	var screen_face := GameData.to_screen(_face).normalized()
	var side := 1.0 if screen_face.x >= 0.0 else -1.0
	var away := screen_face.y < -0.35
	var stride := sin(_walk_t)
	var bob := -absf(stride) * 3.0 if _moving else sin(Time.get_ticks_msec() * 0.004) * 1.2
	var up := Vector2(0.0, bob)

	# Cape sways opposite to the stride.
	var sway := -side * (5.0 + stride * 4.0) if _moving else -side * 2.0
	var cape_pts := PackedVector2Array([
		up + Vector2(-15.0, -58.0), up + Vector2(15.0, -58.0),
		Vector2(20.0 + sway, -10.0), Vector2(-20.0 + sway, -10.0),
	])
	if not away:
		draw_colored_polygon(cape_pts, cape)
	# Legs alternate.
	draw_rect(Rect2(-11.0, -24.0 + maxf(0.0, stride) * -6.0, 9.0, 24.0), steel_dark)
	draw_rect(Rect2(2.0, -24.0 + maxf(0.0, -stride) * -6.0, 9.0, 24.0), steel_dark)
	# Torso, belt
	draw_rect(Rect2(up + Vector2(-15.0, -58.0), Vector2(30.0, 36.0)), steel)
	draw_rect(Rect2(up + Vector2(-15.0, -30.0), Vector2(30.0, 5.0)), gold_trim)
	# Helmet, face, plume
	draw_circle(up + Vector2(0.0, -70.0), 14.0, steel)
	if not away:
		draw_circle(up + Vector2(screen_face.x * 4.0, -67.0), 8.0, Color(0.99, 0.84, 0.7))
	draw_rect(Rect2(up + Vector2(-3.0, -92.0), Vector2(6.0, 10.0)), cape)
	if away:
		draw_colored_polygon(cape_pts, cape)
	# Shield on the off-hand side
	var shield_at := up + Vector2(-side * 19.0, -40.0)
	draw_circle(shield_at, 15.0, gold_trim)
	draw_circle(shield_at, 11.0, Color(0.25, 0.42, 0.85))
	# Sword: rests along the facing, sweeps across the aim while swinging.
	var hand := up + Vector2(side * 17.0, -42.0)
	var blade_dir := screen_face
	var blade := 46.0
	if _swing > 0.0:
		blade = 74.0
		var sweep := aim.angle() + (0.5 - _swing / 0.2) * 1.6
		blade_dir = GameData.to_screen(Vector2.from_angle(sweep)).normalized()
	draw_line(hand, hand + blade_dir * blade, Color(0.95, 0.97, 1.0), 5.0)
	draw_line(hand - blade_dir * 6.0, hand + blade_dir * 8.0, gold_trim, 7.0)

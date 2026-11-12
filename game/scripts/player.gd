class_name Player
extends CharacterBody2D
## The Warden (sword & shield). Movement, stats, basic attack and four skills.
## Placeholder art is drawn in _draw(); origin is at the feet.

signal target_hit(monster: Monster)
signal leveled_up(new_level: int)
signal died
signal respawned

const MOVE_SPEED := 270.0
const ATTACK_REACH := 105.0
const ATTACK_CONE_DEG := 130.0
const DASH_SPEED := 900.0
const DASH_TIME := 0.16
const JUDGMENT_RANGE := 340.0
const RESPAWN_DELAY := 3.0

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

## Set by main.gd before the player enters the tree.
var ground_fx: Node2D
var top_fx: Node2D

var _camera: Camera2D
var _dash_left := 0.0
var _dash_dir := Vector2.ZERO
var _respawn_left := 0.0
var _hurt_flash := 0.0
var _swing := 0.0
var _shake := 0.0


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
	max_hp = 420.0 + 80.0 * (level - 1)
	max_sp = 90.0 + 12.0 * (level - 1)
	attack_power = 40.0 + 9.0 * (level - 1)
	defense = 15.0 + 4.0 * (level - 1)


func _physics_process(delta: float) -> void:
	_hurt_flash = maxf(0.0, _hurt_flash - delta)
	_swing = maxf(0.0, _swing - delta)
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

	var to_mouse := GameData.to_ground(get_global_mouse_position() - global_position)
	if to_mouse.length() > 4.0:
		aim = to_mouse.normalized()

	if _dash_left > 0.0:
		_dash_left -= delta
		velocity = GameData.to_screen(_dash_dir * DASH_SPEED)
		move_and_slide()
		if _dash_left <= 0.0:
			_bash_impact()
	else:
		var input := Input.get_vector("move_left", "move_right", "move_up", "move_down")
		velocity = GameData.to_screen(input * MOVE_SPEED)
		move_and_slide()
		_handle_actions()
	var margin := Vector2(40.0, 40.0)
	global_position = global_position.clamp(margin, GameData.MAP_SIZE - margin)
	queue_redraw()


func _handle_actions() -> void:
	if Input.is_action_pressed("attack"):
		_try_use("attack")
	if Input.is_action_pressed("skill_wave"):
		_try_use("wave")
	if Input.is_action_pressed("skill_bash"):
		_try_use("bash")
	if Input.is_action_pressed("skill_ring"):
		_try_use("ring")
	if Input.is_action_pressed("skill_judgment"):
		_try_use("judgment")


func _try_use(id: String) -> void:
	var data: Dictionary = GameData.SKILLS[id]
	var cost := float(data["sp"])
	if float(cooldowns[id]) > 0.0 or sp < cost or _dash_left > 0.0:
		return
	sp -= cost
	cooldowns[id] = float(data["cd"])
	var mult := float(data["mult"])
	match id:
		"attack":
			_do_attack(mult)
		"wave":
			_do_wave(mult)
		"bash":
			_dash_left = DASH_TIME
			_dash_dir = aim
		"ring":
			_do_ring(mult, data["color"])
		"judgment":
			_do_judgment(mult, data["color"])


## Basic attack: a cone in front of the player.
func _do_attack(mult: float) -> void:
	_swing = 0.18
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
func _do_wave(mult: float) -> void:
	_swing = 0.18
	var wave := BladeWave.new()
	wave.player = self
	wave.dir = aim
	wave.mult = mult
	wave.position = global_position
	top_fx.add_child(wave)


## E: called when the dash ends. Knocks back and stuns everything nearby.
func _bash_impact() -> void:
	var data: Dictionary = GameData.SKILLS["bash"]
	var pulse := AoePulse.new()
	pulse.player = self
	pulse.radius = 130.0
	pulse.mult = float(data["mult"])
	pulse.knock = 320.0
	pulse.stun = 1.0
	pulse.shake = 6.0
	pulse.color = data["color"]
	pulse.position = global_position
	ground_fx.add_child(pulse)


## R: aura that follows the player and ticks five times.
func _do_ring(mult: float, color: Color) -> void:
	var pulse := AoePulse.new()
	pulse.player = self
	pulse.follow = self
	pulse.radius = 175.0
	pulse.mult = mult
	pulse.ticks = 5
	pulse.interval = 0.5
	pulse.color = color
	pulse.position = global_position
	ground_fx.add_child(pulse)


## F: delayed triple blast at the mouse position (clamped to JUDGMENT_RANGE).
func _do_judgment(mult: float, color: Color) -> void:
	var to_mouse := GameData.to_ground(get_global_mouse_position() - global_position)
	var offset := to_mouse.limit_length(JUDGMENT_RANGE)
	var pulse := AoePulse.new()
	pulse.player = self
	pulse.radius = 220.0
	pulse.mult = mult
	pulse.ticks = 3
	pulse.interval = 0.22
	pulse.delay = 0.6
	pulse.knock = 80.0
	pulse.shake = 10.0
	pulse.color = color
	pulse.position = global_position + GameData.to_screen(offset)
	ground_fx.add_child(pulse)


## Applies one hit to a monster using the shared damage formula:
## ATK x skill mult x (1 - DEF/(DEF+K)) x crit x combo bonus, with +/-10% variance.
func strike(m: Monster, mult: float, knock: Vector2 = Vector2.ZERO, stun: float = 0.0) -> void:
	if m.state == Monster.State.DEAD:
		return
	var is_crit := randf() < crit_chance
	var amount := attack_power * mult * randf_range(0.9, 1.1)
	amount *= 1.0 - m.defense / (m.defense + GameData.DEF_K)
	if is_crit:
		amount *= crit_mult
	amount *= 1.0 + Combo.damage_bonus()
	var dmg := maxi(1, roundi(amount))
	var at := m.global_position + Vector2(0.0, -m.body_radius * 2.2)
	m.take_damage(dmg, knock, stun)
	DamageNumber.spawn(top_fx, at, dmg, is_crit)
	Combo.register_hit(dmg)
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
	var at := global_position + Vector2(0.0, -80.0)
	DamageNumber.spawn(top_fx, at, dmg, false, Color(1.0, 0.35, 0.3))
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
	var steel := Color(0.62, 0.68, 0.8)
	var steel_dark := Color(0.32, 0.36, 0.48)
	var gold_trim := Color(0.93, 0.75, 0.3)
	var screen_aim := GameData.to_screen(aim).normalized()
	var side := 1.0 if screen_aim.x >= 0.0 else -1.0

	draw_colored_polygon(GameData.ellipse_points(26.0, 20), Color(0, 0, 0, 0.4))
	# Cape
	draw_colored_polygon(PackedVector2Array([
		Vector2(-15.0, -58.0), Vector2(15.0, -58.0), Vector2(22.0, -8.0), Vector2(-22.0, -8.0),
	]), Color(0.62, 0.1, 0.14))
	# Legs, torso, belt
	draw_rect(Rect2(-11.0, -24.0, 9.0, 24.0), steel_dark)
	draw_rect(Rect2(2.0, -24.0, 9.0, 24.0), steel_dark)
	draw_rect(Rect2(-15.0, -58.0, 30.0, 36.0), steel)
	draw_rect(Rect2(-15.0, -30.0, 30.0, 5.0), gold_trim)
	# Helmet and face
	draw_circle(Vector2(0.0, -70.0), 14.0, steel)
	draw_circle(Vector2(side * 3.0, -67.0), 8.0, Color(0.96, 0.8, 0.66))
	draw_rect(Rect2(-3.0, -92.0, 6.0, 10.0), Color(0.8, 0.15, 0.15))
	# Shield on the off-hand side
	var shield_at := Vector2(-side * 19.0, -40.0)
	draw_circle(shield_at, 15.0, gold_trim)
	draw_circle(shield_at, 11.0, Color(0.2, 0.3, 0.6))
	# Sword points at the aim direction and extends while swinging
	var hand := Vector2(side * 17.0, -42.0)
	var blade := 72.0 if _swing > 0.0 else 46.0
	draw_line(hand, hand + screen_aim * blade, Color(0.92, 0.95, 1.0), 5.0)
	draw_line(hand - screen_aim * 6.0, hand + screen_aim * 8.0, gold_trim, 7.0)

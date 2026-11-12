class_name Monster
extends CharacterBody2D
## Field monster: wander -> chase -> wind-up -> strike. Placeholder art is drawn in _draw().

signal died(monster: Monster)

enum State { WANDER, CHASE, WINDUP, DEAD }

var kind := ""
var display_name := ""
var level := 1
var max_hp := 1
var hp := 1
var attack_power := 1
var defense := 0.0
var move_speed := 60.0
var body_radius := 20.0
var aggro_range := 400.0
var attack_range := 30.0
var windup_time := 0.5
var attack_cooldown := 1.5
var xp_reward := 0
var gold_reward := 0
var body_color := Color.WHITE
var body_shape := "round"
var state: State = State.WANDER

var fx_layer: Node

var _player: Player
var _sheet: SheetSprite
var _punch := 0.0
var _face := Vector2.DOWN
var _moving := false
var _wander_dir := Vector2.ZERO
var _wander_time := 0.0
var _windup_left := 0.0
var _cooldown_left := 0.0
var _stun_left := 0.0
## Knockback velocity on the ground plane.
var _knock := Vector2.ZERO
var _flash := 0.0


func setup(kind_id: String, monster_level: int, player: Player) -> void:
	var d: Dictionary = GameData.MONSTERS[kind_id]
	kind = kind_id
	level = monster_level
	_player = player
	display_name = String(d["name"])
	body_shape = String(d["shape"])
	max_hp = int(d["hp"]) + int(d["hp_per_level"]) * (level - 1)
	hp = max_hp
	attack_power = int(d["atk"]) + int(d["atk_per_level"]) * (level - 1)
	defense = float(d["def"])
	move_speed = float(d["speed"])
	body_radius = float(d["radius"])
	aggro_range = float(d["aggro"])
	attack_range = float(d["range"])
	windup_time = float(d["windup"])
	attack_cooldown = float(d["cooldown"])
	xp_reward = int(d["xp"])
	gold_reward = int(d["gold"])
	body_color = d["color"]


func _ready() -> void:
	add_to_group("monsters")
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	# Layer 2 = monsters. They push each other apart but never block the player.
	collision_layer = 2
	collision_mask = 2
	var shape := CircleShape2D.new()
	shape.radius = body_radius * 0.75
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col)
	_sheet = SheetSprite.new()
	_sheet.load_dir("res://art/monsters/%s" % kind)
	add_child(_sheet)


func _physics_process(delta: float) -> void:
	if state == State.DEAD:
		return
	_flash = maxf(0.0, _flash - delta)
	_punch = maxf(0.0, _punch - delta)
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	_knock = _knock.move_toward(Vector2.ZERO, 900.0 * delta)
	var move := Vector2.ZERO
	if _stun_left > 0.0:
		_stun_left -= delta
	else:
		move = _think(delta)
	velocity = GameData.to_screen(move + _knock)
	move_and_slide()
	_moving = move.length() > 1.0
	if _moving:
		_face = move.normalized()
	if _sheet.has_art():
		_sheet.set_facing(GameData.to_screen(_face))
		_sheet.play("walk" if _moving else "idle")
	queue_redraw()


## Returns the desired ground-plane velocity for this frame.
func _think(delta: float) -> Vector2:
	var player_alive := is_instance_valid(_player) and not _player.dead
	var dist := INF
	if player_alive:
		dist = GameData.ground_dist(global_position, _player.global_position)
	var reach := attack_range + body_radius
	match state:
		State.WANDER:
			if dist <= aggro_range:
				state = State.CHASE
				return Vector2.ZERO
			_wander_time -= delta
			if _wander_time <= 0.0:
				_wander_time = randf_range(1.0, 3.0)
				_wander_dir = Vector2.ZERO if randf() < 0.4 else Vector2.from_angle(randf() * TAU)
			return _wander_dir * move_speed * 0.4
		State.CHASE:
			if not player_alive or dist > aggro_range * 1.6:
				state = State.WANDER
				return Vector2.ZERO
			if dist <= reach:
				if _cooldown_left <= 0.0:
					state = State.WINDUP
					_windup_left = windup_time
				return Vector2.ZERO
			var to_player := GameData.to_ground(_player.global_position - global_position)
			return to_player.normalized() * move_speed
		State.WINDUP:
			_windup_left -= delta
			if _windup_left <= 0.0:
				# The player can dodge by stepping out of reach during the wind-up.
				if player_alive and dist <= reach * 1.35:
					_player.take_damage(attack_power)
				_sheet.play_once("attack")
				_cooldown_left = attack_cooldown
				state = State.CHASE
			return Vector2.ZERO
	return Vector2.ZERO


## knock is a ground-plane velocity impulse; stun is in seconds.
func take_damage(amount: int, knock: Vector2 = Vector2.ZERO, stun: float = 0.0) -> void:
	if state == State.DEAD:
		return
	hp = maxi(0, hp - amount)
	_flash = 0.1
	_punch = 0.14
	_knock += knock
	if stun > 0.0:
		_stun_left = maxf(_stun_left, stun)
		if state == State.WINDUP:
			state = State.CHASE
	if state == State.WANDER:
		state = State.CHASE
	if hp == 0:
		_die()


func _die() -> void:
	state = State.DEAD
	remove_from_group("monsters")
	collision_layer = 0
	collision_mask = 0
	died.emit(self)
	queue_redraw()
	if fx_layer != null:
		var at := global_position + Vector2(0.0, -body_radius)
		Fx.flash(fx_layer, at, body_color.lightened(0.4), body_radius * 3.0, 0.3)
		Fx.burst(fx_layer, at, body_color.lightened(0.3), 10, 240.0, 0.5, 18.0)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(self, "modulate:a", 0.0, 0.35)
	tw.tween_property(self, "scale", Vector2(1.25, 0.6), 0.35)
	tw.chain().tween_callback(queue_free)


func _draw() -> void:
	var r := body_radius
	draw_colored_polygon(GameData.ellipse_points(r * 1.1, 20), Color(0, 0, 0, 0.3))
	if _sheet.has_art():
		_sheet.modulate = Color(3.0, 3.0, 3.0) if _flash > 0.0 else Color.WHITE
		_draw_hp_bar(r)
		return
	# Squash-and-stretch when hit, plus a small hop while walking.
	var p := _punch / 0.14
	var hop := -absf(sin(Time.get_ticks_msec() * 0.012 + float(get_instance_id() % 7))) * 4.0
	var lift := Vector2(0.0, hop if _moving else 0.0)
	draw_set_transform(lift, 0.0, Vector2(1.0 + 0.22 * p, 1.0 - 0.18 * p))
	var c := body_color
	if _flash > 0.0:
		c = Color.WHITE
	elif state == State.WINDUP:
		c = body_color.lerp(Color(1.0, 0.9, 0.3), 0.6)
	var eye := Color(1.0, 0.85, 0.2)
	if body_shape == "block":
		# Rock golem: stacked slabs with glowing cracks.
		draw_rect(Rect2(-r * 0.9, -r * 1.5, r * 1.8, r * 1.5), c)
		draw_rect(Rect2(-r * 0.65, -r * 2.2, r * 1.3, r * 0.8), c.lightened(0.12))
		draw_line(Vector2(-r * 0.5, -r * 1.2), Vector2(r * 0.1, -r * 0.5), Color(1.0, 0.5, 0.1), 3.0)
		draw_line(Vector2(r * 0.1, -r * 0.5), Vector2(r * 0.5, -r * 0.9), Color(1.0, 0.5, 0.1), 3.0)
		draw_circle(Vector2(-r * 0.28, -r * 1.85), r * 0.12, eye)
		draw_circle(Vector2(r * 0.28, -r * 1.85), r * 0.12, eye)
	else:
		# Imp: round body with two horns.
		var center := Vector2(0.0, -r * 1.0)
		draw_circle(center, r, c)
		draw_circle(center + Vector2(0.0, -r * 0.2), r * 0.7, c.lightened(0.15))
		draw_colored_polygon(PackedVector2Array([
			center + Vector2(-r * 0.8, -r * 0.5), center + Vector2(-r * 0.35, -r * 0.85),
			center + Vector2(-r * 0.9, -r * 1.6),
		]), c.darkened(0.3))
		draw_colored_polygon(PackedVector2Array([
			center + Vector2(r * 0.8, -r * 0.5), center + Vector2(r * 0.35, -r * 0.85),
			center + Vector2(r * 0.9, -r * 1.6),
		]), c.darkened(0.3))
		draw_circle(center + Vector2(-r * 0.32, -r * 0.2), r * 0.16, eye)
		draw_circle(center + Vector2(r * 0.32, -r * 0.2), r * 0.16, eye)
	draw_set_transform(Vector2.ZERO)
	_draw_hp_bar(r)


func _draw_hp_bar(r: float) -> void:
	if hp < max_hp and state != State.DEAD:
		var w := r * 2.2
		var top := Vector2(-w * 0.5, -r * 2.75)
		draw_rect(Rect2(top, Vector2(w, 5.0)), Color(0, 0, 0, 0.7))
		draw_rect(Rect2(top, Vector2(w * float(hp) / float(max_hp), 5.0)), Color(0.9, 0.2, 0.15))

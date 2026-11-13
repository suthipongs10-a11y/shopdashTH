class_name Boss
extends Monster
## Crown Defense boss. Marches on the shrine like other monsters but fights with telegraphed
## attacks the player can dodge:
##   SLAM    a red circle in front of it, then a crushing blow with heavy knockback;
##   METEOR  red circles drop around the player, then fire rains on them.
## Below half HP it enrages: faster, shorter warnings, more meteors.

signal enraged_now

const SLAM_RADIUS := 200.0
const METEOR_RADIUS := 115.0

var enraged := false

var _pattern_left := 2.5
var _busy_left := 0.0


func _think(delta: float) -> Vector2:
	if not enraged and hp < max_hp * 0.5:
		_enrage()
	if _busy_left > 0.0:
		_busy_left -= delta
		return Vector2.ZERO
	var player_ok := is_instance_valid(_player) and not _player.dead
	var dist := INF
	if player_ok:
		dist = GameData.ground_dist(global_position, _player.global_position)
	_pattern_left -= delta
	if _pattern_left <= 0.0 and dist < 850.0:
		_pattern_left = 1.6 if enraged else 2.6
		if dist < 300.0:
			_slam(_player.global_position)
		else:
			_meteors()
		return Vector2.ZERO
	var target: Node2D = _player if dist < 650.0 else objective
	if not is_instance_valid(target):
		return Vector2.ZERO
	var gap := GameData.ground_dist(global_position, target.global_position)
	if target is Crown and gap < Crown.RADIUS + body_radius + 120.0:
		if _pattern_left <= 0.6:
			_pattern_left = 2.6
			_slam(target.global_position)
		return Vector2.ZERO
	if target is Player and gap < 150.0:
		return Vector2.ZERO
	var speed := move_speed * (1.35 if enraged else 1.0)
	return GameData.to_ground(target.global_position - global_position).normalized() * speed


func _warn_time(base: float) -> float:
	return base * (0.65 if enraged else 1.0)


func _slam(toward: Vector2) -> void:
	var dir := GameData.to_ground(toward - global_position).normalized()
	_face = dir
	var at := global_position + GameData.to_screen(dir * 110.0)
	var t := Telegraph.new()
	t.radius = SLAM_RADIUS
	t.time = _warn_time(0.95)
	t.on_done = _slam_hit
	t.position = at
	ground_layer.add_child(t)
	_busy_left = t.time + 0.35
	_sheet.squash = Vector2(0.9, 1.12)
	get_tree().create_timer(maxf(0.0, t.time - 0.35)).timeout.connect(_swing_anim)


func _swing_anim() -> void:
	if state != State.DEAD:
		_sheet.play_once("attack")


func _slam_hit(at: Vector2) -> void:
	if state == State.DEAD:
		return
	Vfx.explode(at, palette, true)
	var ring := FxSprite.play(ground_layer, "shock_ring", at, SLAM_RADIUS * 2.4, 0.45, true,
		palette["aura"])
	if ring != null:
		ring.grow_from = 0.3
		ring.grow_to = 1.1
	Vfx.smoke(at, 10.0, 80.0, 180.0, Color(0.35, 0.28, 0.22), 1.1, 0.3)
	Juice.hitstop(0.06)
	if is_instance_valid(_player):
		_player.shake(18.0)
		if not _player.dead and GameData.ground_dist(at, _player.global_position) <= SLAM_RADIUS:
			var away := GameData.to_ground(_player.global_position - at).normalized()
			_player.take_damage(roundi(attack_power * 1.5), away * 900.0)
	for node in get_tree().get_nodes_in_group("crown"):
		var crown := node as Crown
		if GameData.ground_dist(at, crown.global_position) <= SLAM_RADIUS + Crown.RADIUS:
			crown.take_damage(attack_power * 1.5)


func _meteors() -> void:
	var count := 5 if enraged else 3
	for i in count:
		var offset := Vector2.from_angle(randf() * TAU) * randf_range(0.0, 170.0)
		if i == 0:
			offset = Vector2.ZERO
		var t := Telegraph.new()
		t.radius = METEOR_RADIUS
		t.time = _warn_time(1.15) + i * 0.12
		t.on_done = _meteor_hit
		t.position = _player.global_position + GameData.to_screen(offset)
		ground_layer.add_child(t)
	_busy_left = 0.6
	_sheet.play_once("attack")
	Vfx.burst(global_position, visual_height(), 24, palette["aura"], 300.0, 14.0, 0.6)


func _meteor_hit(at: Vector2) -> void:
	if state == State.DEAD:
		return
	Vfx.beam(at, 60.0, palette["aura"], 0.35)
	Vfx.explode(at, palette, false)
	var patch := FirePatch.new()
	patch.player = _player
	patch.top_fx = fx_layer
	patch.damage = int(attack_power * 0.12)
	patch.position = at
	ground_layer.add_child(patch)
	if is_instance_valid(_player):
		_player.shake(8.0)
		if not _player.dead and GameData.ground_dist(at, _player.global_position) <= METEOR_RADIUS:
			var away := GameData.to_ground(_player.global_position - at).normalized()
			_player.take_damage(roundi(attack_power * 1.1), away * 500.0)


func _enrage() -> void:
	enraged = true
	tint = Color(1.25, 0.6, 0.5)
	_sheet.self_modulate = tint
	Vfx.ring(global_position, 30.0, 320.0, palette["aura"], 0.7, 14.0)
	Vfx.burst(global_position, visual_height() * 0.6, 50, palette["aura"], 500.0, 18.0, 0.8)
	Juice.flash(0.25, palette["aura"])
	if is_instance_valid(_player):
		_player.shake(20.0)
	enraged_now.emit()

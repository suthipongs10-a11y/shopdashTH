class_name BotInput
extends PlayerInput
## Dev autopilot (run with `-- --autopilot`): walks to the nearest monster and uses every skill.
## Only for automated testing and capturing footage.
## With `-- --autopilot --demo` it instead keeps some distance and shows one skill at a time
## on a fixed schedule, so each move reads clearly in footage.

## Seconds since start -> action, for --demo.
const DEMO := [
	[1.0, "skill_f"], [5.0, "skill_1"], [8.0, "skill_e"], [10.5, "skill_1"],
	[13.0, "skill_3"], [19.5, "skill_2"], [24.0, "skill_r"], [27.0, "skill_q"],
]

var demo := false
var _target: Monster
var _player: Player


func _nearest(player: Player) -> Monster:
	var best: Monster = null
	var best_dist := INF
	for node in player.get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null:
			continue
		var d := GameData.ground_dist(player.global_position, m.global_position)
		if d < best_dist:
			best_dist = d
			best = m
	return best


func move_vector(player: Player) -> Vector2:
	_player = player
	_target = _nearest(player)
	if _target == null:
		return Vector2.ZERO
	var offset := GameData.to_ground(_target.global_position - player.global_position)
	var keep := 190.0 if demo else 70.0
	return offset.normalized() if offset.length() > keep else Vector2.ZERO


func aim_vector(player: Player) -> Vector2:
	if not is_instance_valid(_target):
		return Vector2.RIGHT * 100.0
	return GameData.to_ground(_target.global_position - player.global_position)


func is_pressed(action: String) -> bool:
	if not is_instance_valid(_target) or _player == null:
		return false
	if demo:
		return _demo_pressed(action)
	return _auto_pressed(action)


func _demo_pressed(action: String) -> bool:
	var now := Engine.get_physics_frames() / float(Engine.physics_ticks_per_second)
	for step: Array in DEMO:
		if action == step[1] and now >= float(step[0]) and now < float(step[0]) + 0.4:
			return true
	return false


func _auto_pressed(action: String) -> bool:
	if action in ["dodge", "ready", "toggle_mode"]:
		return false
	# Let the dragon finish its show before anything else is cast.
	if not _player.get_tree().get_nodes_in_group("dragon").is_empty():
		return action == "attack"
	# One big effect at a time, so each ultimate reads clearly in footage.
	if not _player.get_tree().get_nodes_in_group("big_fx").is_empty():
		return action in ["attack", "skill_q", "skill_e", "skill_r"]
	# Big skills first: when one is ready and affordable, press only that, so footage
	# shows every ultimate; while one is nearly affordable, hold the small skills.
	var ults := {"dragon": "skill_3", "lion": "skill_f", "banner": "skill_2"}
	for ult in ults:
		var cost := float(GameData.SKILLS[ult]["sp"])
		if float(_player.cooldowns[ult]) > 0.0:
			continue
		if _player.sp >= cost:
			return action == ults[ult] or action == "attack"
		if _player.sp > cost * 0.5:
			return action == "attack"
	return true

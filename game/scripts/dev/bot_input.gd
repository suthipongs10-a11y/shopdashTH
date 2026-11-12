class_name BotInput
extends PlayerInput
## Dev autopilot (run with `-- --autopilot`): walks to the nearest monster and uses every skill.
## Only for automated testing and capturing footage.

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
	return offset.normalized() if offset.length() > 70.0 else Vector2.ZERO


func aim_vector(player: Player) -> Vector2:
	if not is_instance_valid(_target):
		return Vector2.RIGHT * 100.0
	return GameData.to_ground(_target.global_position - player.global_position)


func is_pressed(action: String) -> bool:
	if not is_instance_valid(_target) or _player == null:
		return false
	# Hold the small skills only while an ultimate is ready and nearly affordable,
	# so footage shows both ultimates without starving everything else.
	for ult in ["lion", "banner"]:
		var cost := float(GameData.SKILLS[ult]["sp"])
		var ready := float(_player.cooldowns[ult]) <= 0.0
		if ready and _player.sp < cost and _player.sp > cost * 0.5:
			return action in ["attack", "skill_f", "skill_2"]
	return true

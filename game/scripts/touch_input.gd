class_name TouchInput
extends PlayerInput
## Player commands from TouchControls: the joystick moves, skills aim at the nearest monster
## (or straight ahead when nothing is near).

const AUTO_AIM_RANGE := 700.0

var controls: TouchControls


func move_vector(_player: Player) -> Vector2:
	return controls.move if controls != null else Vector2.ZERO


func aim_vector(player: Player) -> Vector2:
	var best := Vector2.ZERO
	var best_dist := AUTO_AIM_RANGE
	for node in player.get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null:
			continue
		var offset := GameData.to_ground(m.global_position - player.global_position)
		if offset.length() < best_dist:
			best_dist = offset.length()
			best = offset
	if best != Vector2.ZERO:
		return best
	return player.aim * 100.0

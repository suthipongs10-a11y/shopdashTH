class_name PlayerInput
extends RefCounted
## Where the player's commands come from. This default reads keyboard + mouse.
## Other sources (touch joystick, the dev autopilot) subclass it.


## Movement on the ground plane, length 0..1.
func move_vector(_player: Player) -> Vector2:
	return Input.get_vector("move_left", "move_right", "move_up", "move_down")


## Ground-plane vector from the player to the aim point (not normalized).
func aim_vector(player: Player) -> Vector2:
	return GameData.to_ground(player.get_global_mouse_position() - player.global_position)


func is_pressed(action: String) -> bool:
	return Input.is_action_pressed(action)

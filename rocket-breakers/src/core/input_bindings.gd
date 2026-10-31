## Default keyboard/gamepad bindings registered at boot so they stay remappable
## from code/settings without hand-editing project.godot.
class_name InputBindings
extends RefCounted

const KEYS := {
	"move_up": [KEY_W, KEY_UP],
	"move_down": [KEY_S, KEY_DOWN],
	"move_left": [KEY_A, KEY_LEFT],
	"move_right": [KEY_D, KEY_RIGHT],
	"dash": [KEY_SPACE],
	"ability": [KEY_Q],
	"overdrive": [KEY_R],
	"tractor": [KEY_E],
	"tactical": [KEY_TAB],
	"pause": [KEY_ESCAPE],
}
const PAD_BUTTONS := {
	"dash": [JOY_BUTTON_A],
	"ability": [JOY_BUTTON_X],
	"overdrive": [JOY_BUTTON_Y],
	"tractor": [JOY_BUTTON_RIGHT_SHOULDER],
	"pause": [JOY_BUTTON_START],
}
const STICK_DEADZONE := 0.2


static func ensure_defaults() -> void:
	for action in KEYS:
		if not InputMap.has_action(action):
			InputMap.add_action(action, STICK_DEADZONE)
			for key in KEYS[action]:
				var ev := InputEventKey.new()
				ev.physical_keycode = key
				InputMap.action_add_event(action, ev)
			for b in PAD_BUTTONS.get(action, []):
				var jb := InputEventJoypadButton.new()
				jb.button_index = b
				InputMap.action_add_event(action, jb)
	var axes := {
		"move_left": [JOY_AXIS_LEFT_X, -1.0], "move_right": [JOY_AXIS_LEFT_X, 1.0],
		"move_up": [JOY_AXIS_LEFT_Y, -1.0], "move_down": [JOY_AXIS_LEFT_Y, 1.0],
	}
	for action in axes:
		var already := false
		for ev in InputMap.action_get_events(action):
			if ev is InputEventJoypadMotion:
				already = true
		if not already:
			var m := InputEventJoypadMotion.new()
			m.axis = axes[action][0]
			m.axis_value = axes[action][1]
			InputMap.action_add_event(action, m)

## Converts the device safe area (notch / home indicator) into logical 720×1280
## insets, accounting for the letterbox added by the "keep" stretch aspect.
class_name SafeArea
extends RefCounted

const LOGICAL := Vector2(720, 1280)


static func logical_insets() -> Dictionary:
	var win := Vector2(DisplayServer.window_get_size())
	var safe := Rect2(DisplayServer.get_display_safe_area())
	if win.x <= 0 or win.y <= 0 or safe.size.x <= 0 or safe.size.y <= 0:
		return {"top": 0.0, "bottom": 0.0, "left": 0.0, "right": 0.0}
	return insets_for(win, safe)


static func insets_for(win: Vector2, safe: Rect2) -> Dictionary:
	var scale := minf(win.x / LOGICAL.x, win.y / LOGICAL.y)
	var offset := (win - LOGICAL * scale) * 0.5
	return {
		"top": maxf(0.0, (safe.position.y - offset.y) / scale),
		"bottom": maxf(0.0, ((win.y - safe.end.y) - offset.y) / scale),
		"left": maxf(0.0, (safe.position.x - offset.x) / scale),
		"right": maxf(0.0, ((win.x - safe.end.x) - offset.x) / scale),
	}

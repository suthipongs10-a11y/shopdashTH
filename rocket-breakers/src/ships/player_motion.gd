## Arcade player movement (SYSTEMS §1) and dash (AGENTS §11). Pure state +
## step function: no nodes, so it runs identically in tests and in game.
class_name PlayerMotion
extends RefCounted

const ACCEL := 1800.0
const DECEL := 2200.0
const DASH_BURST_SEC := 0.25
const DASH_INVULN_SEC := 0.18
const DASH_COOLDOWN_SEC := 2.5
## Burst speed multiplier over base speed — not specified in SYSTEMS; see DECISIONS.
const DASH_SPEED_MULT := 2.2
const RECENT_MOVE_SEC := 0.3
const MAX_HALF_WIDTH := 94.0

var pos := Vector2.ZERO
var prev_pos := Vector2.ZERO
var vel := Vector2.ZERO
var base_speed := 360.0
var mass_cap := 28.0
var fitted_mass := 0.0
var towing := false
var cargo_mass := 0.0
var half_width := 29.0
var bounds := Rect2(0, 0, 720, 1280)  # allowed area for the ship centre before half-width

var dash_left := 0.0
var dash_cooldown := 0.0
var invuln_left := 0.0
var dash_dir := Vector2.UP
var last_move_dir := Vector2.UP
var last_move_age := 999.0


func tow_penalty() -> float:
	if not towing:
		return 0.0
	return 0.20 + 0.15 * clampf(cargo_mass / 20.0, 0.0, 1.0)


## Single formula from SYSTEMS §1; the clamp is the final limit.
func effective_speed() -> float:
	var f := 1.0 - 0.25 * fitted_mass / mass_cap - tow_penalty()
	return base_speed * clampf(f, 0.55, 1.0)


func is_dashing() -> bool:
	return dash_left > 0.0


func is_invulnerable() -> bool:
	return invuln_left > 0.0


func try_dash() -> bool:
	if dash_cooldown > 0.0 or is_dashing():
		return false
	dash_dir = last_move_dir if last_move_age <= RECENT_MOVE_SEC else Vector2.UP
	dash_left = DASH_BURST_SEC
	invuln_left = DASH_INVULN_SEC
	dash_cooldown = DASH_COOLDOWN_SEC
	return true


func step(move_input: Vector2, dash_pressed: bool, dt: float) -> void:
	prev_pos = pos
	var input := move_input.limit_length(1.0)
	if input.length() > 0.2:
		last_move_dir = input.normalized()
		last_move_age = 0.0
	else:
		last_move_age += dt
	if dash_pressed:
		try_dash()
	if is_dashing():
		vel = dash_dir * base_speed * DASH_SPEED_MULT
		dash_left = maxf(dash_left - dt, 0.0)
		if not is_dashing():
			vel = dash_dir * effective_speed()
	else:
		var target := input * effective_speed()
		var rate := ACCEL if input.length() > 0.01 else DECEL
		vel = vel.move_toward(target, rate * dt)
	invuln_left = maxf(invuln_left - dt, 0.0)
	dash_cooldown = maxf(dash_cooldown - dt, 0.0)
	pos += vel * dt
	_clamp_to_bounds()


## Clamps the whole assembly (half-width), not only the core.
func _clamp_to_bounds() -> void:
	var hw := minf(half_width, MAX_HALF_WIDTH)
	var min_x := bounds.position.x + hw
	var max_x := bounds.end.x - hw
	var clamped := Vector2(clampf(pos.x, min_x, max_x), clampf(pos.y, bounds.position.y, bounds.end.y))
	if clamped.x != pos.x:
		vel.x = 0.0
	if clamped.y != pos.y:
		vel.y = 0.0
	pos = clamped

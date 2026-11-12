class_name BladeWave
extends Node2D
## Piercing projectile: a glowing crescent with a particle trail (EggPact projectile style).
## Hits each monster once and bursts on every hit.

const SPEED := 680.0
const LIFE := 0.75
const RADIUS := 56.0
const HEIGHT := 40.0

var player: Player
## Travel direction on the ground plane.
var dir := Vector2.RIGHT
var mult := 1.0
var palette: Dictionary = Vfx.pal("steel")
var tally: SkillTally

var _left := LIFE
var _already_hit := {}
var _painted := false
var _t := 0.0


func _ready() -> void:
	var screen_dir := GameData.to_screen(dir).normalized()
	var fx := FxSprite.play(self, "slash", Vector2(0.0, -HEIGHT), RADIUS * 2.6, LIFE, false,
		palette["core"])
	if fx != null:
		_painted = true
		fx.hold_frame = 2
		fx.rotation = screen_dir.angle()
		fx.fade_out = 0.2
	material = Fx.additive()


func _physics_process(delta: float) -> void:
	_left -= delta
	_t += delta
	if _left <= 0.0 or not is_instance_valid(player):
		queue_free()
		return
	position += GameData.to_screen(dir * SPEED) * delta
	# Trail: a soft glow every frame plus a little swirl of core colour.
	Vfx.glow(global_position + Vector2(randf_range(-4, 4), 0.0), HEIGHT + randf_range(-4, 4), 26.0,
		palette["aura"], 0.35, Vector3(0, 0, randf_range(-10, 20)))
	var sw := Vector2(cos(_t * 20.0), sin(_t * 20.0)) * 14.0
	Vfx.glow(global_position + Vector2(sw.x, 0.0), HEIGHT + sw.y, 8.0, palette["core"], 0.3)
	for node in get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null or _already_hit.has(m.get_instance_id()):
			continue
		if GameData.ground_dist(global_position, m.global_position) <= RADIUS + m.body_radius:
			_already_hit[m.get_instance_id()] = true
			Vfx.explode(m.global_position, palette, false)
			player.strike(m, mult, dir * 160.0, 0.0, tally if is_instance_valid(tally) else null)
	queue_redraw()


func _draw() -> void:
	if _painted:
		return
	var fade := clampf(_left / 0.2, 0.0, 1.0)
	draw_set_transform(Vector2(0.0, -HEIGHT))
	var a := dir.angle()
	Fx.draw_crescent(self, RADIUS + 6.0, 36.0, a, 1.3, Color(palette["aura"], fade * 0.55))
	Fx.draw_crescent(self, RADIUS, 22.0, a, 1.2, Color(palette["core"], fade * 0.85))
	Fx.draw_crescent(self, RADIUS * 0.96, 8.0, a, 1.05, Color(palette["hot"], fade))

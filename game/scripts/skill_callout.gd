class_name SkillCallout
extends Node2D
## Skill name that pops up over the caster's head when a skill is used.

const FONT := preload("res://fonts/Kanit-Medium.ttf")
const SIZE := 22

var anchor: Node2D
var text := ""
var color := Color.WHITE

var _t := 0.0


static func spawn(parent: Node, caster: Node2D, skill_name: String, tint: Color) -> void:
	var c := SkillCallout.new()
	c.anchor = caster
	c.text = skill_name
	c.color = tint
	parent.add_child(c)


func _ready() -> void:
	z_index = 6


func _process(delta: float) -> void:
	_t += delta
	if _t > 1.1:
		queue_free()
		return
	if is_instance_valid(anchor):
		global_position = anchor.global_position + Vector2(0.0, -150.0 - 18.0 * minf(_t / 0.3, 1.0))
	modulate.a = clampf((1.1 - _t) / 0.3, 0.0, 1.0)
	scale = Vector2.ONE * (1.0 + 0.35 * maxf(0.0, 1.0 - _t / 0.12))
	queue_redraw()


func _draw() -> void:
	var w := FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, SIZE).x
	var at := Vector2(-w * 0.5, 0.0)
	draw_string_outline(FONT, at, text, HORIZONTAL_ALIGNMENT_LEFT, -1, SIZE, 7,
		Color(0.08, 0.04, 0.12))
	draw_string(FONT, at, text, HORIZONTAL_ALIGNMENT_LEFT, -1, SIZE, color.lightened(0.55))

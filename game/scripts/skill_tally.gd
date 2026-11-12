class_name SkillTally
extends Node2D
## Running total for one skill cast: "12 HITS" over the summed damage, floating above the caster.
## Appears from the second hit and fades out shortly after the last one.

const FONT := preload("res://fonts/Jersey10-Regular.ttf")
const HOLD := 0.9
const FADE := 0.35

static var _active: Array[SkillTally] = []

var anchor: Node2D
var color := Color(1.0, 0.85, 0.35)

var _hits := 0
var _total := 0
var _since_hit := 0.0
var _pop := 0.0


func _ready() -> void:
	z_index = 5
	_active.append(self)
	visible = false


func _exit_tree() -> void:
	_active.erase(self)


func add(damage: int) -> void:
	_hits += 1
	_total += damage
	_since_hit = 0.0
	_pop = 1.0
	if _hits >= 2:
		visible = true


func _process(delta: float) -> void:
	_since_hit += delta
	_pop = maxf(0.0, _pop - delta * 6.0)
	if _since_hit > HOLD + FADE or (_hits < 2 and _since_hit > HOLD):
		queue_free()
		return
	if is_instance_valid(anchor):
		var slot := maxi(0, _active.find(self))
		global_position = anchor.global_position + Vector2(0.0, -175.0 - 62.0 * float(slot))
	modulate.a = 1.0 - clampf((_since_hit - HOLD) / FADE, 0.0, 1.0)
	scale = Vector2.ONE * (1.0 + 0.18 * _pop)
	queue_redraw()


func _draw() -> void:
	if _hits < 2:
		return
	var outline := Color(0.15, 0.02, 0.05)
	var hits := "%d HITS" % _hits
	var total := GameData.format_int(_total)
	var hs := FONT.get_string_size(hits, HORIZONTAL_ALIGNMENT_LEFT, -1, 24)
	var ts := FONT.get_string_size(total, HORIZONTAL_ALIGNMENT_LEFT, -1, 50)
	var hp := Vector2(-hs.x * 0.5, -ts.y * 0.55)
	var tp := Vector2(-ts.x * 0.5, ts.y * 0.35)
	draw_string_outline(FONT, hp, hits, HORIZONTAL_ALIGNMENT_LEFT, -1, 24, 6, outline)
	draw_string(FONT, hp, hits, HORIZONTAL_ALIGNMENT_LEFT, -1, 24, color.lightened(0.25))
	draw_string_outline(FONT, tp, total, HORIZONTAL_ALIGNMENT_LEFT, -1, 50, 10, outline)
	draw_string(FONT, tp, total, HORIZONTAL_ALIGNMENT_LEFT, -1, 50, color)

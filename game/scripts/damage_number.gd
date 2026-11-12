class_name DamageNumber
extends Node2D
## Floating combat text in a chunky bitmap-style font.
## Normal hits: white. Critical hits: yellow digits on a red spiky star burst.
## Hits on the same target in quick succession stack upward into a column.

enum Kind { NORMAL, CRIT, HURT, INFO }

const MAX_ALIVE := 220
const STACK_WINDOW_MS := 450
const STACK_STEP := 26.0
const STACK_MAX := 7
const FONT := preload("res://fonts/Jersey10-Regular.ttf")

static var _alive := 0
## stack key -> [index, last_spawn_ms]
static var _stacks := {}

var text := ""
var kind: Kind = Kind.NORMAL
var font_size := 30
var color := Color.WHITE

var _burst := PackedVector2Array()
var _text_size := Vector2.ZERO


static func spawn(
		parent: Node, at: Vector2, amount: int, crit: bool, stack_key: int = 0
) -> void:
	var k := Kind.CRIT if crit else Kind.NORMAL
	_spawn(parent, at, GameData.format_int(amount), k, 46 if crit else 36, Color.WHITE, stack_key)


static func spawn_hurt(parent: Node, at: Vector2, amount: int) -> void:
	_spawn(parent, at, GameData.format_int(amount), Kind.HURT, 32, Color(1.0, 0.3, 0.25), 0)


static func spawn_text(
		parent: Node, at: Vector2, content: String, size: int, text_color: Color
) -> void:
	_spawn(parent, at, content, Kind.INFO, size, text_color, 0)


static func _spawn(
		parent: Node, at: Vector2, content: String, k: Kind, size: int, text_color: Color,
		stack_key: int
) -> void:
	if parent == null or _alive >= MAX_ALIVE:
		return
	var n := DamageNumber.new()
	n.text = content
	n.kind = k
	n.font_size = size
	n.color = text_color
	var offset := Vector2(randf_range(-8.0, 8.0), 0.0)
	if stack_key != 0:
		offset.y = -STACK_STEP * float(_next_stack_index(stack_key))
	n.position = at + offset
	parent.add_child(n)


static func _next_stack_index(key: int) -> int:
	var now := Time.get_ticks_msec()
	var idx := 0
	if _stacks.has(key):
		var entry: Array = _stacks[key]
		if now - int(entry[1]) < STACK_WINDOW_MS:
			idx = (int(entry[0]) + 1) % STACK_MAX
	_stacks[key] = [idx, now]
	if _stacks.size() > 400:
		_stacks.clear()
	return idx


func _ready() -> void:
	_alive += 1
	z_index = 2 if kind == Kind.CRIT else 0
	_text_size = FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size)
	if kind == Kind.CRIT:
		_burst = _make_burst()
		rotation = randf_range(-0.08, 0.08)
	var pop := 2.4 if kind == Kind.CRIT else 1.6
	scale = Vector2(pop, pop)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(self, "scale", Vector2.ONE, 0.14) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var rise := 46.0 if kind == Kind.INFO else 34.0
	var life := 1.0 if kind == Kind.CRIT else 0.8
	tw.tween_property(self, "position:y", position.y - rise, life) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(self, "modulate:a", 0.0, 0.25).set_delay(life - 0.25)
	tw.chain().tween_callback(queue_free)


func _exit_tree() -> void:
	_alive -= 1


## Irregular spiky star sized to fit behind the text.
func _make_burst() -> PackedVector2Array:
	var pts := PackedVector2Array()
	var spikes := 16
	var rx := _text_size.x * 0.5 + 18.0
	var ry := _text_size.y * 0.5 + 12.0
	for i in spikes * 2:
		var a := TAU * float(i) / float(spikes * 2) + randf_range(-0.06, 0.06)
		var outer := i % 2 == 0
		var k := randf_range(1.15, 1.45) if outer else randf_range(0.72, 0.82)
		pts.append(Vector2(cos(a) * rx * k, sin(a) * ry * k))
	return pts


func _draw() -> void:
	var origin := Vector2(-_text_size.x * 0.5, _text_size.y * 0.3)
	var outline := Color(0.12, 0.02, 0.0)
	match kind:
		Kind.CRIT:
			var ring := _burst.duplicate()
			ring.append(_burst[0])
			draw_colored_polygon(_burst, Color(0.86, 0.1, 0.06, 0.92))
			draw_polyline(ring, Color(0.45, 0.0, 0.0), 2.5)
			draw_string_outline(FONT, origin, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, 8,
				outline)
			draw_string(FONT, origin, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size,
				Color(1.0, 0.92, 0.2))
		_:
			draw_string_outline(FONT, origin, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, 7,
				outline)
			draw_string(FONT, origin, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, color)

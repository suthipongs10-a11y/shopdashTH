class_name AegisFx
extends Node2D
## Translucent bubble shield around the warden with small golden shields orbiting it.
## Ripples when hit, pops when it ends. Uses art/fx/bubble.png and art/fx/guard.png when
## present, otherwise draws both.

const RADIUS := 78.0
const CENTER := Vector2(0.0, -58.0)

var follow: Node2D
var color := Color(0.7, 0.88, 1.0)

var _age := 0.0
var _ripple := 0.0
var _popping := -1.0
var _bubble: FxSprite
var _guards: Array[FxSprite] = []


func _ready() -> void:
	z_index = 1
	_bubble = FxSprite.play(self, "bubble", CENTER, RADIUS * 2.3, 9999.0)
	if _bubble != null:
		_bubble.fade_out = 0.0
	for i in 3:
		var g := FxSprite.play(self, "guard", CENTER, 46.0, 9999.0)
		if g == null:
			break
		g.fade_out = 0.0
		_guards.append(g)


func ripple() -> void:
	_ripple = 1.0


## Burst and disappear.
func pop() -> void:
	if _popping >= 0.0:
		return
	_popping = 0.0
	if FxSprite.play(get_parent(), "explosion", global_position + CENTER, RADIUS * 3.2) == null:
		Fx.flash(get_parent(), global_position + CENTER, Color(1.0, 1.0, 1.0), RADIUS * 1.6, 0.3)
	Fx.burst(get_parent(), global_position + CENTER, color, 18, 420.0, 0.45, 13.0)


func _process(delta: float) -> void:
	if is_instance_valid(follow):
		global_position = follow.global_position
	_age += delta
	_ripple = maxf(0.0, _ripple - delta * 4.0)
	if _popping >= 0.0:
		_popping += delta / 0.25
		if _popping >= 1.0:
			queue_free()
			return
	queue_redraw()


func _draw() -> void:
	var appear := clampf(_age / 0.18, 0.0, 1.0)
	var grow := 1.0 + (_popping * 0.5 if _popping >= 0.0 else 0.0) + _ripple * 0.06
	var fade := 1.0 - maxf(_popping, 0.0)
	var r := RADIUS * (0.6 + 0.4 * appear) * grow
	var pulse := 0.5 + 0.5 * sin(_age * 5.0)
	if _bubble != null:
		_bubble.scale = _bubble._base_scale * (r / RADIUS)
		_bubble.modulate = Color(1.0, 1.0, 1.0, (0.85 + 0.15 * _ripple) * fade)
	for i in _guards.size():
		# Orbit on a tilted ring; shields behind the bubble are dimmer.
		var a := _age * 1.8 + TAU * float(i) / float(_guards.size())
		_guards[i].position = CENTER + Vector2(cos(a) * r * 1.05, sin(a) * r * 0.35)
		_guards[i].modulate = Color(1.0, 1.0, 1.0, (0.55 + 0.45 * sin(a)) * fade)
	if _bubble != null:
		return
	# Body of the bubble.
	draw_circle(CENTER, r, Color(color, (0.12 + 0.12 * _ripple) * fade))
	# Rim: a few concentric strokes fading inward.
	for i in 4:
		var k := 1.0 - float(i) * 0.035
		draw_arc(CENTER, r * k, 0.0, TAU, 64, Color(color, (0.55 - i * 0.12) * fade), 3.0)
	draw_arc(CENTER, r, 0.0, TAU, 64, Color(1.0, 1.0, 1.0, (0.5 + 0.4 * _ripple) * fade), 2.0)
	# Highlight streak on the upper left, like light on glass.
	draw_arc(CENTER, r * 0.82, PI * 1.08, PI * 1.42, 18, Color(1.0, 1.0, 1.0, 0.7 * fade), 5.0)
	draw_arc(CENTER, r * 0.7, PI * 1.15, PI * 1.3, 10, Color(1.0, 1.0, 1.0, 0.45 * fade), 3.0)
	# Gold runes orbiting the rim.
	for i in 6:
		var a := _age * 1.6 + TAU * float(i) / 6.0
		var p := CENTER + Vector2(cos(a), sin(a) * 0.45) * r * 0.95
		var s := 5.0 + 2.0 * pulse
		draw_colored_polygon(PackedVector2Array([
			p + Vector2(0.0, -s), p + Vector2(s * 0.6, 0.0), p + Vector2(0.0, s), p + Vector2(-s * 0.6, 0.0),
		]), Color(1.0, 0.85, 0.4, 0.9 * fade))

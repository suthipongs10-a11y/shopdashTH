class_name BuildSlot
extends Node2D
## A stone platform where a tower can be built. Glows when the warden can afford a tower.
## Uses art/props/build_slot.png when present.

const RADIUS := 46.0
const USE_RANGE := 95.0
const ART := "res://art/props/build_slot.png"

var tower: Tower
var player: Player
## True while this is the slot the build panel is showing.
var selected := false

var _t := randf() * TAU
var _art: Texture2D


func _ready() -> void:
	if ResourceLoader.exists(ART):
		_art = load(ART)


func is_empty() -> bool:
	return not is_instance_valid(tower)


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	var gold := Color(1.0, 0.8, 0.35)
	if _art != null:
		var w := RADIUS * 2.6
		var h := w * _art.get_height() / _art.get_width()
		draw_texture_rect(_art, Rect2(Vector2(-w * 0.5, -h * 0.55), Vector2(w, h)), false)
	else:
		draw_colored_polygon(GameData.ellipse_points(RADIUS, 6), Color(0.35, 0.32, 0.31))
		draw_colored_polygon(GameData.ellipse_points(RADIUS * 0.8, 6), Color(0.45, 0.41, 0.39))
	var affordable := is_instance_valid(player) and player.gold >= _cheapest()
	if is_empty() and affordable:
		var pulse := 0.5 + 0.5 * sin(_t * 4.0)
		draw_polyline(GameData.ellipse_outline(RADIUS * (1.05 + 0.08 * pulse), 32),
			Color(gold, 0.35 + 0.4 * pulse), 3.0)
	if selected:
		draw_polyline(GameData.ellipse_outline(RADIUS * 1.3, 32), Color(1, 1, 1, 0.9), 3.0)


static func _cheapest() -> int:
	var best := 99999
	for kind: String in GameData.TOWERS:
		best = mini(best, int(GameData.TOWERS[kind]["cost"][0]))
	return best

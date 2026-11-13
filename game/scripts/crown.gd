class_name Crown
extends Node2D
## The Crown Shrine the player defends: a stone dais with a floating golden crown.
## Monsters walk to it and hit it; when its HP reaches 0 the run is lost.

signal destroyed

const RADIUS := 70.0
const BASE_HP := 55000.0

var max_hp := BASE_HP
var hp := BASE_HP
## Damage numbers and sparks go here.
var top_fx: Node

var _flash := 0.0
var _t := 0.0
## Painted shrine (art/props/crown_base.png + crown_top.png), else drawn in code.
var _base_tex: Texture2D
var _top_tex: Texture2D
var _hurt_text_left := 0.0


func _ready() -> void:
	add_to_group("crown")
	if ResourceLoader.exists("res://art/props/crown_base.png"):
		_base_tex = load("res://art/props/crown_base.png")
	if ResourceLoader.exists("res://art/props/crown_top.png"):
		_top_tex = load("res://art/props/crown_top.png")
	var halo := FxSprite.play(self, "sigil", Vector2.ZERO, 300.0, 1.0e6, true,
		Color(1.0, 0.78, 0.3) * 0.55)
	if halo != null:
		halo.spin = 0.25
		halo.fade_in = 0.5
		halo.show_behind_parent = true


func take_damage(amount: float) -> void:
	if hp <= 0.0:
		return
	hp = maxf(0.0, hp - amount)
	_flash = 0.12
	_hurt_text_left -= 1.0
	if top_fx != null and _hurt_text_left <= 0.0:
		_hurt_text_left = 3.0
		DamageNumber.spawn_hurt(top_fx, global_position + Vector2(randf_range(-30, 30), -150.0),
			roundi(amount))
	Vfx.burst(global_position, 90.0, 4, Color(1.0, 0.8, 0.35), 200.0, 8.0, 0.35)
	if hp <= 0.0:
		Vfx.explode(global_position, Vfx.pal("holy"), true)
		Juice.flash(0.4, Color(1.0, 0.85, 0.4))
		destroyed.emit()


func heal(fraction: float) -> void:
	hp = minf(max_hp, hp + max_hp * fraction)
	Vfx.ring(global_position, 20.0, 160.0, Color(0.5, 1.0, 0.6), 0.6, 8.0)
	Vfx.burst(global_position, 100.0, 20, Color(0.6, 1.0, 0.7), 220.0, 10.0, 0.7)


func _process(delta: float) -> void:
	_t += delta
	_flash = maxf(0.0, _flash - delta)
	if randf() < delta * 6.0:
		Vfx.glow(global_position + Vector2(randf_range(-40, 40), randf_range(-8, 8)), 60.0,
			randf_range(4, 8), Color(1.0, 0.85, 0.4), randf_range(0.8, 1.4),
			Vector3(0, 0, randf_range(30, 60)))
	queue_redraw()


func _draw() -> void:
	draw_colored_polygon(GameData.ellipse_points(RADIUS * 1.15, 32), Color(0, 0, 0, 0.35))
	if _base_tex != null:
		_draw_painted()
		_draw_hp_bar()
		return
	var stone := Color(0.42, 0.38, 0.36)
	if _flash > 0.0:
		stone = stone.lerp(Color(1, 0.4, 0.3), 0.6)
	# Dais: a short cylinder of stone, then a lighter top face.
	var w := 62.0
	var h := 34.0
	draw_colored_polygon(PackedVector2Array([
		Vector2(-w, 0), Vector2(w, 0), Vector2(w, -h), Vector2(-w, -h)]), stone.darkened(0.25))
	var bottom := GameData.ellipse_points(w, 32)
	for i in bottom.size():
		bottom[i].y = maxf(bottom[i].y, 0.0)
	draw_colored_polygon(bottom, stone.darkened(0.25))
	var top := GameData.ellipse_points(w, 32)
	for i in top.size():
		top[i].y -= h
	draw_colored_polygon(top, stone.lightened(0.15))
	var rune := GameData.ellipse_outline(w * 0.8, 32)
	for i in rune.size():
		rune[i].y -= h
	draw_polyline(rune, Color(1.0, 0.8, 0.35, 0.8), 2.0)
	# Floating crown.
	var bob := sin(_t * 2.2) * 6.0
	var c := Vector2(0.0, -112.0 + bob)
	var gold := Color(1.0, 0.8, 0.3)
	var band := PackedVector2Array([
		c + Vector2(-34, 10), c + Vector2(34, 10), c + Vector2(34, -4), c + Vector2(-34, -4)])
	var spikes := PackedVector2Array([c + Vector2(-34, -4)])
	for i in 5:
		var x := -34.0 + 17.0 * i
		spikes.append(c + Vector2(x + 8.5, -30.0 if i % 2 == 0 else -22.0))
		spikes.append(c + Vector2(x + 17.0, -4.0))
	draw_colored_polygon(spikes, gold)
	draw_colored_polygon(band, gold.darkened(0.15))
	draw_polyline(band + PackedVector2Array([band[0]]), Color(0.45, 0.28, 0.05), 2.0)
	for i in 3:
		var gem_color: Color = [Color(0.9, 0.2, 0.25), Color(0.3, 0.6, 1.0), Color(0.3, 0.9, 0.5)][i]
		draw_circle(c + Vector2(-17.0 + 17.0 * i, 3.0), 4.5, gem_color)
	for i in 5:
		draw_circle(c + Vector2(-25.5 + 17.0 * i, -30.0 if i % 2 == 0 else -22.0), 3.0,
			Color(1.0, 0.95, 0.8))
	_draw_hp_bar()


func _draw_painted() -> void:
	var tint := Color(1.6, 0.8, 0.7) if _flash > 0.0 else Color.WHITE
	var w := 190.0
	var h := w * _base_tex.get_height() / _base_tex.get_width()
	draw_texture_rect(_base_tex, Rect2(Vector2(-w * 0.5, -h + 30.0), Vector2(w, h)), false, tint)
	if _top_tex != null:
		var tw := 92.0
		var th := tw * _top_tex.get_height() / _top_tex.get_width()
		var y := -h - 30.0 + sin(_t * 2.2) * 6.0
		draw_texture_rect(_top_tex, Rect2(Vector2(-tw * 0.5, y - th * 0.5), Vector2(tw, th)), false)


func _draw_hp_bar() -> void:
	var bw := 140.0
	var at := Vector2(-bw * 0.5, -170.0)
	draw_rect(Rect2(at, Vector2(bw, 8.0)), Color(0, 0, 0, 0.7))
	draw_rect(Rect2(at, Vector2(bw * hp / max_hp, 8.0)), Color(1.0, 0.8, 0.3))

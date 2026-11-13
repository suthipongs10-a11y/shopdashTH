class_name Tower
extends Node2D
## A defence built on a BuildSlot. Four kinds (GameData.TOWERS), three levels each:
##   archer  shoots bolts of light at the nearest monsters
##   pillar  bursts with holy light around itself every few seconds
##   wall    has HP; monsters close to it must break it first, and its thorns hurt them
##   font    heals the warden and the shrine when they are near
## Uses art/towers/<kind>_<level>.png when present, else draws itself.

signal destroyed(tower: Tower)

const RADIUS := 40.0
const ART_DIR := "res://art/towers/"
const HEIGHTS := {"archer": 150.0, "pillar": 170.0, "wall": 90.0, "font": 95.0}

var kind := "archer"
var level := 1
var player: Player
var top_fx: Node
var ground_fx: Node
var max_hp := 1.0
var hp := 1.0

var _cool := 0.6
var _flash := 0.0
var _t := 0.0
var _sprite: Sprite2D


func _ready() -> void:
	add_to_group("towers")
	if kind == "wall":
		add_to_group("walls")
	_apply_level()


func data(key: String) -> Variant:
	return GameData.TOWERS[kind][key][level - 1]


func upgrade() -> void:
	level = mini(3, level + 1)
	_apply_level()
	Vfx.ring(global_position, 10.0, 120.0, GameData.TOWERS[kind]["color"], 0.5, 8.0)
	Vfx.burst(global_position, 60.0, 24, GameData.TOWERS[kind]["color"], 260.0, 10.0, 0.6)


## Height of the drawn tower, for effects that start at its top.
func top() -> Vector2:
	return global_position + Vector2(0.0, -float(HEIGHTS[kind]) * (0.85 + 0.1 * level))


func _apply_level() -> void:
	if kind == "wall":
		var ratio := hp / max_hp if max_hp > 1.0 else 1.0
		max_hp = float(data("hp"))
		hp = max_hp * ratio
	var path := "%s%s_%d.png" % [ART_DIR, kind, level]
	if ResourceLoader.exists(path):
		if _sprite == null:
			_sprite = Sprite2D.new()
			_sprite.centered = false
			add_child(_sprite)
		_sprite.texture = load(path)
		var h: float = float(HEIGHTS[kind]) * (1.0 + 0.12 * (level - 1)) * 1.25
		var k: float = h / _sprite.texture.get_height()
		_sprite.scale = Vector2(k, k)
		_sprite.position = Vector2(-_sprite.texture.get_width() * k * 0.5, -h + 10.0)
	queue_redraw()


func take_damage(amount: float, attacker: Monster = null) -> void:
	if kind != "wall" or hp <= 0.0:
		return
	hp -= amount
	_flash = 0.12
	if attacker != null and is_instance_valid(attacker):
		attacker.take_damage(int(data("thorns")))
	if hp <= 0.0:
		Vfx.smoke(global_position, 10.0, 60.0, 140.0, Color(0.5, 0.42, 0.35), 0.9, 0.3)
		Vfx.burst(global_position, 40.0, 20, Color(0.8, 0.6, 0.4), 300.0, 10.0, 0.6)
		destroyed.emit(self)
		queue_free()


func repair() -> void:
	if kind == "wall":
		hp = max_hp


func _process(delta: float) -> void:
	_t += delta
	_flash = maxf(0.0, _flash - delta)
	_cool -= delta
	match kind:
		"archer":
			if _cool <= 0.0:
				_shoot()
		"pillar":
			if _cool <= 0.0:
				_burst()
		"font":
			if _cool <= 0.0:
				_heal()
	if _sprite != null:
		_sprite.modulate = Color(1.6, 0.8, 0.8) if _flash > 0.0 else Color.WHITE
	queue_redraw()


func _targets(reach: float, count: int) -> Array[Monster]:
	var found: Array[Monster] = []
	var dists: Array[float] = []
	for node in get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null:
			continue
		var d := GameData.ground_dist(global_position, m.global_position)
		if d <= reach:
			found.append(m)
			dists.append(d)
	# Nearest first.
	var order := range(found.size())
	order.sort_custom(func(a: int, b: int) -> bool: return dists[a] < dists[b])
	var out: Array[Monster] = []
	for i in order.slice(0, count):
		out.append(found[i])
	return out


func _shoot() -> void:
	var targets := _targets(float(data("range")), int(data("shots")))
	if targets.is_empty():
		_cool = 0.15
		return
	_cool = float(data("rate"))
	for m in targets:
		var bolt := LightBolt.new()
		bolt.target = m
		bolt.damage = int(data("damage"))
		bolt.top_fx = top_fx
		bolt.color = GameData.TOWERS[kind]["color"]
		bolt.position = top()
		top_fx.add_child(bolt)
	Vfx.glow(global_position, HEIGHTS[kind], 26.0, GameData.TOWERS[kind]["color"], 0.15)


func _burst() -> void:
	var reach := float(data("range"))
	var targets := _targets(reach, 99)
	if targets.is_empty():
		_cool = 0.2
		return
	_cool = float(data("rate"))
	var color: Color = GameData.TOWERS[kind]["color"]
	var column := FxSprite.play(top_fx, "light_column", global_position + Vector2(0.0, -200.0), 380.0,
		0.45, false, color)
	if column != null:
		column.grow_from = 1.2
		column.grow_to = 0.8
	var ring := FxSprite.play(ground_fx, "shock_ring", global_position, reach * 2.3, 0.4, true, color)
	if ring != null:
		ring.grow_from = 0.3
		ring.grow_to = 1.0
	Vfx.burst(global_position, 40.0, 18, color, 360.0, 10.0, 0.5)
	for m in targets:
		var away := GameData.to_ground(m.global_position - global_position).normalized()
		_hit(m, int(data("damage")), away * 140.0)


func _heal() -> void:
	_cool = 0.5
	var reach := float(data("range"))
	var color: Color = GameData.TOWERS[kind]["color"]
	if is_instance_valid(player) and not player.dead:
		if GameData.ground_dist(global_position, player.global_position) <= reach \
				and player.hp < player.max_hp:
			player.hp = minf(player.max_hp, player.hp + player.max_hp * float(data("heal")) * 0.5)
			Vfx.glow(player.global_position + Vector2(randf_range(-20, 20), 0.0), 40.0, 10.0, color,
				0.6, Vector3(0, 0, 80))
	for node in get_tree().get_nodes_in_group("crown"):
		var crown := node as Crown
		if GameData.ground_dist(global_position, crown.global_position) <= reach + Crown.RADIUS:
			if crown.hp < crown.max_hp and crown.hp > 0.0:
				crown.hp = minf(crown.max_hp, crown.hp + crown.max_hp * float(data("crown_heal")) * 0.5)


func _hit(m: Monster, dmg: int, knock: Vector2) -> void:
	m.take_damage(dmg, knock)
	if top_fx != null:
		DamageNumber.spawn(top_fx, m.global_position + Vector2(0.0, -m.visual_height() - 22.0), dmg,
			false, m.get_instance_id())


func _draw() -> void:
	draw_colored_polygon(GameData.ellipse_points(RADIUS * 1.1, 24), Color(0, 0, 0, 0.3))
	var color: Color = GameData.TOWERS[kind]["color"]
	if kind == "font" or kind == "pillar":
		var r := float(data("range"))
		var a := 0.06 + 0.03 * sin(_t * 3.0)
		draw_polyline(GameData.ellipse_outline(r, 64), Color(color, a * 3.0), 2.0)
	if kind == "wall" and hp < max_hp:
		var w := 80.0
		var at := Vector2(-w * 0.5, -float(HEIGHTS[kind]) - 26.0)
		draw_rect(Rect2(at, Vector2(w, 6.0)), Color(0, 0, 0, 0.7))
		draw_rect(Rect2(at, Vector2(w * hp / max_hp, 6.0)), Color(0.9, 0.7, 0.3))
	if _sprite != null:
		return
	_draw_placeholder(color)


## Simple shapes until the painted towers arrive.
func _draw_placeholder(color: Color) -> void:
	var s := 1.0 + 0.12 * (level - 1)
	var stone := Color(0.5, 0.46, 0.44) if _flash <= 0.0 else Color(1.0, 0.5, 0.4)
	match kind:
		"archer":
			var h := 120.0 * s
			draw_colored_polygon(PackedVector2Array([Vector2(-30 * s, 0), Vector2(30 * s, 0),
				Vector2(22 * s, -h), Vector2(-22 * s, -h)]), stone)
			for i in 3:
				draw_rect(Rect2(Vector2(-26 * s + i * 19 * s, -h - 14 * s), Vector2(14 * s, 14 * s)),
					stone.lightened(0.1))
			draw_circle(Vector2(0, -h - 26 * s), 9 * s + sin(_t * 4.0), color)
		"pillar":
			var h := 140.0 * s
			draw_colored_polygon(PackedVector2Array([Vector2(-18 * s, 0), Vector2(18 * s, 0),
				Vector2(10 * s, -h), Vector2(0, -h - 20 * s), Vector2(-10 * s, -h)]), stone.lightened(0.15))
			draw_circle(Vector2(0, -h - 34 * s), 12 * s + 2.0 * sin(_t * 3.0), color)
		"wall":
			for i in 7:
				var x := (-3 + i) * 12.0 * s
				var tip := -70.0 * s - (6.0 if i % 2 == 0 else 0.0)
				draw_colored_polygon(PackedVector2Array([Vector2(x - 6, 0), Vector2(x + 6, 0),
					Vector2(x + 3, tip + 10), Vector2(x, tip), Vector2(x - 3, tip + 10)]),
					Color(0.55, 0.38, 0.22) if _flash <= 0.0 else Color(1.0, 0.5, 0.4))
			draw_rect(Rect2(-44 * s, -36 * s, 88 * s, 8 * s), Color(0.4, 0.27, 0.15))
		"font":
			draw_colored_polygon(GameData.ellipse_points(38 * s, 24), stone)
			var water := GameData.ellipse_points(30 * s, 24)
			for i in water.size():
				water[i].y -= 18 * s
			draw_colored_polygon(water, Color(color, 0.85))
			draw_circle(Vector2(0, -40 * s + 4.0 * sin(_t * 3.0)), 6 * s, Color(0.85, 1.0, 0.95))
	for i in level:
		draw_circle(Vector2((i - (level - 1) * 0.5) * 12.0, 14.0), 4.0, Color(1.0, 0.85, 0.3))

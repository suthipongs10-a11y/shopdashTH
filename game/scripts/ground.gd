class_name Ground
extends Node2D
## Procedural placeholder for the volcanic field: diamond tiles with random lava cells.
## Drawn once; replace with painted map layers when real art exists.

const TILE_W := 128.0
const TILE_H := 64.0


func _draw() -> void:
	var size := GameData.MAP_SIZE
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.13, 0.05, 0.04))
	var rng := RandomNumberGenerator.new()
	rng.seed = 20261112
	var rows := int(size.y / (TILE_H * 0.5)) + 2
	var cols := int(size.x / TILE_W) + 2
	var rock_a := Color(0.27, 0.12, 0.10)
	var rock_b := Color(0.35, 0.17, 0.13)
	for j in rows:
		for i in cols:
			var c := Vector2(i * TILE_W + (TILE_W * 0.5 if j % 2 == 1 else 0.0), j * TILE_H * 0.5)
			var roll := rng.randf()
			var tint := rng.randf()
			var col: Color
			if roll < 0.06:
				col = Color(0.95, 0.42, 0.08).lerp(Color(1.0, 0.65, 0.15), tint)
			elif roll < 0.14:
				col = Color(0.45, 0.15, 0.08)
			else:
				col = rock_a.lerp(rock_b, tint)
			draw_colored_polygon(PackedVector2Array([
				c + Vector2(0.0, -TILE_H * 0.5 + 2.0), c + Vector2(TILE_W * 0.5 - 4.0, 0.0),
				c + Vector2(0.0, TILE_H * 0.5 - 2.0), c + Vector2(-TILE_W * 0.5 + 4.0, 0.0),
			]), col)
	draw_rect(Rect2(Vector2.ZERO, size), Color(1.0, 0.5, 0.15, 0.6), false, 6.0)

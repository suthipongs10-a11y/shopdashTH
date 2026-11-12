class_name Ground
extends Node2D
## Field ground. Uses the painted map at MAP_ART when present, otherwise a procedural shader.
## The painting is tiled with mirroring so a 1536 px image covers the whole field without
## being stretched blurry; mirrored copies always meet at matching edges.

const MAP_ART := "res://art/maps/volcano/ground.png"
const SHADER := preload("res://shaders/ground.gdshader")
## Screen pixels per painting pixel.
const ART_SCALE := 1.35


func _ready() -> void:
	var size := GameData.MAP_SIZE
	if ResourceLoader.exists(MAP_ART):
		var sprite := Sprite2D.new()
		sprite.texture = load(MAP_ART)
		sprite.centered = false
		sprite.texture_repeat = CanvasItem.TEXTURE_REPEAT_MIRROR
		sprite.region_enabled = true
		sprite.region_rect = Rect2(Vector2.ZERO, size / ART_SCALE)
		sprite.scale = Vector2(ART_SCALE, ART_SCALE)
		add_child(sprite)
		return
	var mat := ShaderMaterial.new()
	mat.shader = SHADER
	mat.set_shader_parameter("map_size", size)
	mat.set_shader_parameter("squash", GameData.Y_SQUASH)
	var rect := ColorRect.new()
	rect.size = size
	rect.material = mat
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(rect)

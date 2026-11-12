class_name Ground
extends Node2D
## Field ground. Uses a painted map if one exists at MAP_ART, otherwise a procedural shader.

const MAP_ART := "res://art/maps/volcano/ground.png"
const SHADER := preload("res://shaders/ground.gdshader")


func _ready() -> void:
	var size := GameData.MAP_SIZE
	if ResourceLoader.exists(MAP_ART):
		var tex: Texture2D = load(MAP_ART)
		var sprite := Sprite2D.new()
		sprite.texture = tex
		sprite.centered = false
		sprite.scale = size / tex.get_size()
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

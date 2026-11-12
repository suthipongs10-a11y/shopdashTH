class_name DimRect
extends Node2D
## World-space darkening drawn above characters but below anything raised to
## Juice.FOCUS_Z (the skill caster) and the effect layers.

var amount := 0.0


func _ready() -> void:
	z_index = Juice.FOCUS_Z - 1


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	if amount < 0.01:
		return
	var cam := get_viewport().get_camera_2d()
	var center := cam.get_screen_center_position() if cam != null else Vector2.ZERO
	var half := get_viewport_rect().size
	draw_rect(Rect2(center - half, half * 2.0), Color(0.03, 0.02, 0.06, amount))

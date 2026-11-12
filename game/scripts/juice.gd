class_name Juice
extends CanvasLayer
## Screen-level game feel, after EggPact: hit-stop, coloured screen flash, a world dim that
## leaves the skill's caster lit, camera zoom, the ultimate cut-in banner and a vignette.
## One instance, created by main.gd; call the static helpers from anywhere.

const KANIT := preload("res://fonts/Kanit-Medium.ttf")
const FOCUS_Z := 16

static var instance: Juice

## Set by main.gd.
var camera: Camera2D
var dim_rect: DimRect

var _flash: ColorRect
var _flash_a := 0.0
var _dim_target := 0.0
var _zoom_target := 1.0
var _focus: Array[Node2D] = []
## Unscaled game time in seconds; hit-stop is timed on this, not the wall clock, so it
## behaves the same in real play, fixed-step runs and recordings.
var _clock := 0.0
var _stop_until := 0.0
var _stop_ready_at := 0.0
var _cut: Control
var _cut_strip: Polygon2D
var _cut_label: Label
var _cut_pic: TextureRect
var _cut_tween: Tween
var _cut_color := Color(0.85, 0.3, 0.1)


func _ready() -> void:
	instance = self
	layer = 5
	var vignette := TextureRect.new()
	vignette.texture = _vignette_texture()
	vignette.stretch_mode = TextureRect.STRETCH_SCALE
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(vignette)
	_flash = ColorRect.new()
	_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_flash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_flash.color = Color(1, 1, 1, 0)
	add_child(_flash)
	_build_cutin()


func _exit_tree() -> void:
	if instance == self:
		instance = null
	Engine.time_scale = 1.0


func _process(_delta: float) -> void:
	# Real (unscaled) time so effects keep fading during hit-stop.
	var dt := minf(0.05, get_process_delta_time() / maxf(Engine.time_scale, 0.01))
	_clock += dt
	if _stop_until > 0.0 and _clock >= _stop_until:
		_stop_until = 0.0
		Engine.time_scale = 1.0
	_flash_a = maxf(0.0, _flash_a - dt * 2.2)
	_flash.color.a = _flash_a
	if dim_rect != null:
		dim_rect.amount = lerpf(dim_rect.amount, _dim_target, 1.0 - exp(-dt * 8.0))
		if dim_rect.amount < 0.02 and _dim_target == 0.0:
			_release_focus()
	if camera != null:
		var z := lerpf(camera.zoom.x, _zoom_target, 1.0 - exp(-dt * 6.0))
		camera.zoom = Vector2(z, z)


## Freeze the action briefly on impact. Ignored if another stop just ended, so constant
## multi-hits cannot turn into permanent slow motion.
static func hitstop(seconds: float) -> void:
	if instance == null:
		return
	var now := instance._clock
	if now < instance._stop_ready_at:
		return
	instance._stop_until = now + seconds
	instance._stop_ready_at = instance._stop_until + 0.12
	Engine.time_scale = 0.06
	if Vfx.instance != null:
		Vfx.instance.slow = seconds


static func flash(amount: float, color: Color = Color.WHITE) -> void:
	if instance == null:
		return
	instance._flash_a = maxf(instance._flash_a, amount)
	instance._flash.color = Color(color, instance._flash_a)


## Darken the world except the given nodes, and zoom the camera.
static func spotlight(focus: Array[Node2D], dim: float, zoom: float) -> void:
	if instance == null:
		return
	instance._release_focus()
	instance._focus = focus
	for n in focus:
		n.z_index = FOCUS_Z
	instance._dim_target = dim
	instance._zoom_target = zoom


static func spotlight_end() -> void:
	if instance == null:
		return
	instance._dim_target = 0.0
	instance._zoom_target = 1.0


func _release_focus() -> void:
	for n in _focus:
		if is_instance_valid(n):
			n.z_index = 0
	_focus.clear()


## Slanted colour strip with the skill name sweeping across the screen.
static func cutin(skill_name: String, color: Color, portrait: Texture2D = null) -> void:
	if instance == null:
		return
	var j := instance
	j._cut_label.text = skill_name
	j._cut_color = color
	j._cut_pic.texture = portrait
	j._cut_pic.visible = portrait != null
	j._layout_cutin()
	if j._cut_tween != null and j._cut_tween.is_valid():
		j._cut_tween.kill()
	j._cut.visible = true
	j._cut.modulate.a = 0.0
	var view := j._cut.get_viewport_rect().size
	j._cut.position.x = -view.x * 0.3
	j._cut_tween = j.create_tween()
	j._cut_tween.set_ignore_time_scale(true)
	j._cut_tween.set_parallel(true)
	j._cut_tween.tween_property(j._cut, "modulate:a", 1.0, 0.12)
	j._cut_tween.tween_property(j._cut, "position:x", 0.0, 0.16) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	j._cut_tween.chain().tween_interval(0.62)
	j._cut_tween.chain().set_parallel(true)
	j._cut_tween.tween_property(j._cut, "modulate:a", 0.0, 0.25)
	j._cut_tween.tween_property(j._cut, "position:x", view.x * 0.25, 0.25) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	j._cut_tween.chain().tween_callback(func() -> void: j._cut.visible = false)


func _build_cutin() -> void:
	_cut = Control.new()
	_cut.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_cut.visible = false
	add_child(_cut)
	_cut_strip = Polygon2D.new()
	_cut.add_child(_cut_strip)
	_cut_pic = TextureRect.new()
	_cut_pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_cut_pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_cut_pic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_cut.add_child(_cut_pic)
	_cut_label = Label.new()
	_cut_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_cut_label.add_theme_font_override("font", KANIT)
	_cut_label.add_theme_font_size_override("font_size", 46)
	_cut_label.add_theme_color_override("font_color", Color.WHITE)
	_cut_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.45))
	_cut_label.add_theme_constant_override("outline_size", 8)
	_cut_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_cut.add_child(_cut_label)


func _layout_cutin() -> void:
	var view := _cut.get_viewport_rect().size
	var cy := view.y * 0.44
	var h := 120.0
	var skew := 70.0
	# Slanted band across the screen: solid in the middle, fading out at both ends.
	var top_l := Vector2(-80.0, cy - h * 0.5 + skew)
	var top_m := Vector2(view.x * 0.5, cy - h * 0.5)
	var top_r := Vector2(view.x + 80.0, cy - h * 0.5 - skew)
	var bot_r := Vector2(view.x + 80.0, cy + h * 0.5 - skew)
	var bot_m := Vector2(view.x * 0.5, cy + h * 0.5)
	var bot_l := Vector2(-80.0, cy + h * 0.5 + skew)
	_cut_strip.polygon = PackedVector2Array([top_l, top_m, top_r, bot_r, bot_m, bot_l])
	var c := _cut_color
	var edge := Color(c.darkened(0.6), 0.0)
	var mid := Color(c, 0.94)
	_cut_strip.vertex_colors = PackedColorArray([edge, mid, edge, edge, mid, edge])
	_cut_strip.color = Color.WHITE
	# Portrait inside the band, overflowing it a little like EggPact's cut-in.
	var pic := h * 2.0
	_cut_pic.position = Vector2(view.x * 0.34 - pic * 0.5, cy - pic * 0.62)
	_cut_pic.size = Vector2(pic, pic)
	_cut_label.position = Vector2(view.x * 0.42, cy - 40.0)
	_cut_label.size = Vector2(view.x * 0.55, 80.0)


static func _vignette_texture() -> Texture2D:
	var g := Gradient.new()
	g.set_color(0, Color(0, 0, 0, 0))
	g.set_color(1, Color(0.03, 0.04, 0.08, 0.5))
	g.add_point(0.55, Color(0, 0, 0, 0))
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.05, 0.5)
	tex.width = 256
	tex.height = 256
	return tex

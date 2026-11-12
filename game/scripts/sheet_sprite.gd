class_name SheetSprite
extends Sprite2D
## Plays character animations from sprite-sheet PNGs dropped into an art folder.
## One PNG per animation (idle.png, walk.png, attack.png): rows = directions, columns = frames.
## Optional sheet.cfg overrides the defaults. See ART_GUIDE.md for the exact format.

const ANIM_NAMES: Array[String] = ["idle", "walk", "attack"]
const DEFAULT_FPS := {"idle": 6.0, "walk": 10.0, "attack": 14.0}
## Default on-screen height of one cell, in pixels.
const DEFAULT_CELL_SCREEN_HEIGHT := 150.0
const FLASH_SHADER := preload("res://shaders/flash.gdshader")

## Height of the drawn body on screen, in pixels (0 until art is loaded).
var screen_height := 0.0

## name -> {tex, rows, cols, cell: Vector2, fps}
var _anims := {}
var _current := ""
## Animation that plays once and then returns to _current.
var _once := ""
var _time := 0.0
var _facing := Vector2.DOWN
var _feet_from_bottom := -1.0
var _flash_mat: ShaderMaterial
## While set, show this animation's frame instead of playing (e.g. the slash pose while spinning).
var _hold_anim := ""
var _hold_frame := 0


## Loads every animation found in dir (e.g. "res://art/characters/warden").
## Returns false if the folder has no usable sheets, so callers keep their placeholder art.
func load_dir(dir: String) -> bool:
	var cfg := ConfigFile.new()
	var has_cfg := cfg.load(dir + "/sheet.cfg") == OK
	var directions := int(cfg.get_value("sheet", "directions", 8)) if has_cfg else 8
	var sheet_scale := -1.0
	var cell_w := -1.0
	var cell_h := -1.0
	var body_height := -1.0
	if has_cfg:
		body_height = float(cfg.get_value("sheet", "body_height", -1.0))
		sheet_scale = float(cfg.get_value("sheet", "scale", -1.0))
		cell_w = float(cfg.get_value("sheet", "cell_width", -1.0))
		cell_h = float(cfg.get_value("sheet", "cell_height", -1.0))
		_feet_from_bottom = float(cfg.get_value("sheet", "feet_from_bottom", -1.0))
	for anim in ANIM_NAMES:
		var path := "%s/%s.png" % [dir, anim]
		if not ResourceLoader.exists(path):
			continue
		var tex: Texture2D = load(path)
		var h := cell_h if cell_h > 0.0 else float(tex.get_height()) / float(directions)
		var w := cell_w if cell_w > 0.0 else h
		var fps := float(DEFAULT_FPS[anim])
		if has_cfg:
			fps = float(cfg.get_value("fps", anim, fps))
		_anims[anim] = {
			"tex": tex, "cell": Vector2(w, h), "fps": fps,
			"rows": maxi(1, roundi(tex.get_height() / h)),
			"cols": maxi(1, int(tex.get_width() / w)),
		}
	if _anims.is_empty():
		return false
	var first: Dictionary = _anims[_anims.keys()[0]]
	var cell: Vector2 = first["cell"]
	if sheet_scale <= 0.0:
		sheet_scale = DEFAULT_CELL_SCREEN_HEIGHT / cell.y
	if _feet_from_bottom < 0.0:
		_feet_from_bottom = cell.y * 0.1
	scale = Vector2(sheet_scale, sheet_scale)
	if body_height <= 0.0:
		body_height = cell.y * 0.75
	screen_height = body_height * sheet_scale
	_flash_mat = ShaderMaterial.new()
	_flash_mat.shader = FLASH_SHADER
	material = _flash_mat
	centered = false
	region_enabled = true
	play("idle")
	return true


func has_art() -> bool:
	return not _anims.is_empty()


## 0 = normal colours, 1 = solid white.
func set_flash(amount: float) -> void:
	if _flash_mat != null:
		_flash_mat.set_shader_parameter("flash", amount)


## Freeze on one frame of an animation until release(). Facing still updates.
func hold(anim: String, frame: int) -> void:
	if _anims.has(anim):
		_hold_anim = anim
		_hold_frame = frame


func release() -> void:
	_hold_anim = ""


func play(anim: String) -> void:
	var resolved := _resolve(anim)
	if resolved != _current:
		_current = resolved
		if _once == "":
			_time = 0.0


func play_once(anim: String) -> void:
	if not _anims.has(anim):
		return
	_once = anim
	_time = 0.0


## Screen-space direction the character should face.
func set_facing(screen_dir: Vector2) -> void:
	if screen_dir.length() > 0.01:
		_facing = screen_dir


func _resolve(anim: String) -> String:
	if _anims.has(anim):
		return anim
	if _anims.has("idle"):
		return "idle"
	return String(_anims.keys()[0])


func _process(delta: float) -> void:
	if _anims.is_empty():
		return
	_time += delta
	var anim_name := _once if _once != "" else _current
	var a: Dictionary = _anims[anim_name]
	var cols := int(a["cols"])
	var frame := int(_time * float(a["fps"]))
	if _once != "" and frame >= cols:
		_once = ""
		_time = 0.0
		a = _anims[_current]
		cols = int(a["cols"])
		frame = 0
	frame = frame % cols
	if _hold_anim != "":
		a = _anims[_hold_anim]
		frame = mini(_hold_frame, int(a["cols"]) - 1)

	var picked := _pick_row(int(a["rows"]))
	var cell: Vector2 = a["cell"]
	texture = a["tex"]
	flip_h = picked[1]
	region_rect = Rect2(frame * cell.x, int(picked[0]) * cell.y, cell.x, cell.y)
	offset = Vector2(-cell.x * 0.5, -(cell.y - _feet_from_bottom))


## Returns [row, flip_h] for the current facing, depending on how many direction rows exist.
## 8 rows: S, SW, W, NW, N, NE, E, SE.   5 rows: S, SW, W, NW, N (east side mirrored).
## 4 rows: S, W, E, N.   1 row: faces right, mirrored when facing left.
func _pick_row(rows: int) -> Array:
	# Angle measured clockwise on screen starting from "down" (south).
	var angle := fposmod(atan2(-_facing.x, _facing.y), TAU)
	var idx8 := roundi(angle / (TAU / 8.0)) % 8
	if rows >= 8:
		return [idx8, false]
	if rows >= 5:
		return [idx8, false] if idx8 <= 4 else [8 - idx8, true]
	if rows >= 4:
		var idx4 := roundi(angle / (TAU / 4.0)) % 4
		return [[0, 1, 3, 2][idx4], false]
	return [0, _facing.x < 0.0]

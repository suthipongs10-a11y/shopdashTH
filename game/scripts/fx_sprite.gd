class_name FxSprite
extends Sprite2D
## Plays a painted effect from art/fx/<name>.png.
## The importer writes art/fx/<name>.cfg with the frame layout ([fx] frames, fps, blend).
## Images on black are drawn additively (black disappears); others use normal blending.
## Effects whose art is missing are skipped: play() returns null and callers fall back to
## the procedural effects in Fx / Vfx.
## White-on-black art (as in EggPact) is tinted per skill with the tint argument.

const DIR := "res://art/fx/"

## name -> {tex, frames, fps, cell: Vector2, add: bool} or {} when the art is missing.
static var _cache := {}

var follow: Node2D
var follow_offset := Vector2.ZERO
var life := 0.5
var loop := false
## Scale multipliers over the life of the effect.
var grow_from := 1.0
var grow_to := 1.0
var fade_in := 0.05
var fade_out := 0.2
var spin := 0.0
## Show only this frame (e.g. a still crescent used as a projectile). -1 = animate.
var hold_frame := -1

var _info: Dictionary
## Ground effects live in a holder squashed onto the floor, so the sprite itself can spin
## flat on the ground without the ellipse tilting.
var _holder: Node2D
var _t := 0.0
var _base_scale := Vector2.ONE


static func has_art(fx_name: String) -> bool:
	return not _load(fx_name).is_empty()


static func _load(fx_name: String) -> Dictionary:
	if _cache.has(fx_name):
		return _cache[fx_name]
	var info := {}
	var path := DIR + fx_name + ".png"
	if ResourceLoader.exists(path):
		var tex: Texture2D = load(path)
		var cfg := ConfigFile.new()
		var frames := 1
		var fps := 12.0
		var add := true
		if cfg.load(DIR + fx_name + ".cfg") == OK:
			frames = int(cfg.get_value("fx", "frames", 1))
			fps = float(cfg.get_value("fx", "fps", 12.0))
			add = String(cfg.get_value("fx", "blend", "add")) == "add"
		info = {
			"tex": tex, "frames": frames, "fps": fps, "add": add,
			"cell": Vector2(tex.get_width() / float(frames), tex.get_height()),
		}
	_cache[fx_name] = info
	return info


## Spawns the effect. height: on-screen height in pixels. ground: squash it to lie on the floor.
static func play(
		parent: Node, fx_name: String, at: Vector2, height: float, duration: float = -1.0,
		ground: bool = false, tint: Color = Color.WHITE
) -> FxSprite:
	var info := _load(fx_name)
	if info.is_empty() or parent == null:
		return null
	var s := FxSprite.new()
	s._info = info
	s.texture = info["tex"]
	s.region_enabled = true
	var cell: Vector2 = info["cell"]
	s.region_rect = Rect2(Vector2.ZERO, cell)
	var k := height / cell.y
	s._base_scale = Vector2(k, k)
	s.scale = s._base_scale
	s.modulate = Color(tint, 1.0)
	if info["add"]:
		s.material = Fx.additive()
	var frames := int(info["frames"])
	s.life = duration if duration > 0.0 else maxf(0.15, frames / float(info["fps"]))
	if ground:
		s._holder = Node2D.new()
		s._holder.position = at
		s._holder.scale = Vector2(1.0, GameData.Y_SQUASH)
		parent.add_child(s._holder)
		s._holder.add_child(s)
	else:
		s.position = at
		parent.add_child(s)
	return s


func _process(delta: float) -> void:
	_t += delta
	if _t >= life:
		if _holder != null:
			_holder.queue_free()
		else:
			queue_free()
		return
	if is_instance_valid(follow):
		var target := follow.global_position + follow_offset
		if _holder != null:
			_holder.global_position = target
		else:
			global_position = target
	var frames := int(_info["frames"])
	var frame := int(_t * float(_info["fps"]))
	frame = frame % frames if loop else mini(frame, frames - 1)
	if hold_frame >= 0:
		frame = mini(hold_frame, frames - 1)
	var cell: Vector2 = _info["cell"]
	region_rect = Rect2(Vector2(frame * cell.x, 0.0), cell)
	var u := _t / life
	scale = _base_scale * lerpf(grow_from, grow_to, 1.0 - pow(1.0 - u, 2.0))
	rotation += spin * delta
	var a := 1.0
	if fade_in > 0.0:
		a = minf(a, _t / fade_in)
	if fade_out > 0.0:
		a = minf(a, (life - _t) / fade_out)
	modulate.a = clampf(a, 0.0, 1.0)

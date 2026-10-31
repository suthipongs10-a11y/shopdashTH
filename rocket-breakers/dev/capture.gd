## Dev-only visual capture (not a gameplay test):
##   xvfb-run -s "-screen 0 720x1280x24" godot --path . --rendering-method gl_compatibility \
##     --rendering-driver opengl3 -s res://dev/capture.gd -- <out_dir>
## Boots the real main scene, opens the sandbox, flies with scripted input and
## saves PNG screenshots of title, sandbox and pause screens.
extends SceneTree

var out_dir := "user://captures"
var frame := 0
var main: Node


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	DirAccess.make_dir_recursive_absolute(out_dir)
	root.size = Vector2i(720, 1280)
	main = load("res://src/app/main.tscn").instantiate()
	root.add_child(main)


func _process(_delta: float) -> bool:
	frame += 1
	match frame:
		20:
			_shot("01_title")
			main.show_sandbox()
		21:
			Input.action_press("move_left")
		70:
			Input.action_release("move_left")
			Input.action_press("move_up")
		110:
			Input.action_release("move_up")
			Input.action_press("move_right")
		150:
			Input.action_release("move_right")
			_press_dash()
		153:
			_shot("02_sandbox_dash")
		400:
			_shot("03_sandbox_combat")
		401:
			main.get_child(0).set_paused(true)
		410:
			_shot("04_pause")
			main.set_language("en")
		420:
			_shot("05_pause_en")
			main.set_language("th")
			quit(0)
	return false


func _press_dash() -> void:
	var ev := InputEventAction.new()
	ev.action = "dash"
	ev.pressed = true
	Input.parse_input_event(ev)


func _shot(name: String) -> void:
	var img := root.get_texture().get_image()
	img.save_png("%s/%s.png" % [out_dir, name])
	print("captured ", name, " ", img.get_size())

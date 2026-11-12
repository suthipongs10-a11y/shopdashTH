extends Node2D
## Entry scene. Builds the whole field in code so the project has no hand-edited scenes yet:
## ground -> ground effects -> y-sorted world (player, monsters) -> top effects -> HUD.

var _player: Player
var _hud: Hud
var _top_fx: Node2D
var _spawner: Spawner


func _ready() -> void:
	_setup_input()

	var ground := Ground.new()
	ground.z_index = -10
	add_child(ground)

	var ground_fx := Node2D.new()
	ground_fx.name = "GroundFx"
	add_child(ground_fx)

	var world := Node2D.new()
	world.name = "World"
	world.y_sort_enabled = true
	add_child(world)

	_top_fx = Node2D.new()
	_top_fx.name = "TopFx"
	_top_fx.z_index = 20
	add_child(_top_fx)

	# EggPact-style particles, the world dim used by ultimates, and screen-level juice.
	var vfx := Vfx.new()
	vfx.name = "Vfx"
	add_child(vfx)
	var dim := DimRect.new()
	dim.name = "Dim"
	add_child(dim)

	_player = Player.new()
	_player.name = "Player"
	_player.ground_fx = ground_fx
	_player.top_fx = _top_fx
	_player.position = GameData.MAP_SIZE * 0.5
	if "--autopilot" in OS.get_cmdline_user_args():
		_player.input = BotInput.new()
	world.add_child(_player)

	var spawner := Spawner.new()
	spawner.name = "Spawner"
	spawner.world = world
	spawner.player = _player
	spawner.fx_layer = _top_fx
	spawner.ground_layer = ground_fx
	add_child(spawner)
	spawner.monster_killed.connect(_on_monster_killed)
	_spawner = spawner
	# Training (two unkillable dummies) by default; "-- --horde" starts with roaming packs.
	spawner.set_training(not ("--horde" in OS.get_cmdline_user_args()))

	var juice := Juice.new()
	juice.name = "Juice"
	juice.camera = _player.get_camera()
	juice.dim_rect = dim
	add_child(juice)

	_hud = Hud.new()
	_hud.name = "Hud"
	_hud.layer = 10
	_hud.player = _player
	add_child(_hud)

	_player.leveled_up.connect(_on_leveled_up)
	_player.died.connect(_on_player_died)


## Input actions are registered in code (physical keys, so they work on a Thai keyboard layout).
func _setup_input() -> void:
	_add_keys("move_left", [KEY_A, KEY_LEFT])
	_add_keys("move_right", [KEY_D, KEY_RIGHT])
	_add_keys("move_up", [KEY_W, KEY_UP])
	_add_keys("move_down", [KEY_S, KEY_DOWN])
	_add_keys("attack", [KEY_SPACE])
	_add_keys("skill_q", [KEY_Q])
	_add_keys("skill_e", [KEY_E])
	_add_keys("skill_r", [KEY_R])
	_add_keys("skill_f", [KEY_F])
	_add_keys("skill_1", [KEY_1])
	_add_keys("skill_2", [KEY_2])
	_add_keys("skill_3", [KEY_3])
	_add_keys("toggle_mode", [KEY_T])
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("attack", click)


func _add_keys(action: String, keys: Array) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for key in keys:
		var event := InputEventKey.new()
		event.physical_keycode = key
		InputMap.action_add_event(action, event)


func _on_monster_killed(monster: Monster) -> void:
	var bonus: float = 1.0 + Combo.reward_bonus()
	var xp_gain := roundi(monster.xp_reward * bonus)
	var gold_gain := roundi(monster.gold_reward * bonus)
	_player.gain_rewards(xp_gain, gold_gain)
	var at := monster.global_position + Vector2(0.0, -monster.body_radius * 3.2)
	DamageNumber.spawn_text(_top_fx, at, "+%d EXP" % xp_gain, 20, Color(0.7, 0.95, 1.0))


func _process(_delta: float) -> void:
	if Input.is_action_just_pressed("toggle_mode"):
		_spawner.set_training(not _spawner.training)
		var label := "โหมดฝึกซ้อม" if _spawner.training else "โหมดล่ามอนสเตอร์"
		_hud.show_banner(label, Color(0.7, 0.95, 1.0))


func _on_leveled_up(new_level: int) -> void:
	_hud.show_banner("LEVEL UP!  Lv.%d" % new_level, Color(1.0, 0.85, 0.3))


func _on_player_died() -> void:
	_hud.show_banner("คุณล้มลง... กำลังฟื้นคืนชีพ", Color(1.0, 0.4, 0.35))


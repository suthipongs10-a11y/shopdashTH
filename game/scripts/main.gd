extends Node2D
## Entry scene. Builds the whole field in code so the project has no hand-edited scenes yet:
## ground -> ground effects -> y-sorted world (player, monsters) -> top effects -> HUD.

var _player: Player
var _hud: Hud
var _top_fx: Node2D
var _spawner: Spawner
## Crown Defense (the default mode). "-- --training" / "-- --horde" start the old sandbox.
var _crown_mode := true
var _crown: Crown
var _director: WaveDirector
var _ground_fx: Node2D
var _pending_boons := 0
var _picker: BoonPicker
var _min_hp := 1.0
var _min_crown := 1.0


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
	_player.position = GameData.MAP_SIZE * 0.5 + Vector2(0.0, 150.0)
	if "--autopilot" in OS.get_cmdline_user_args():
		var bot := BotInput.new()
		bot.demo = "--demo" in OS.get_cmdline_user_args()
		_player.input = bot
	world.add_child(_player)
	# Phones and tablets get on-screen controls ("-- --touch" forces them on a PC).
	if DisplayServer.is_touchscreen_available() or "--touch" in OS.get_cmdline_user_args():
		if not (_player.input is BotInput):
			var controls := TouchControls.new()
			controls.player = _player
			add_child(controls)
			var touch := TouchInput.new()
			touch.controls = controls
			_player.input = touch
			# A tap is also reported as a mouse click; only the attack button should attack.
			for event in InputMap.action_get_events("attack"):
				if event is InputEventMouseButton:
					InputMap.action_erase_event("attack", event)

	_ground_fx = ground_fx
	var args := OS.get_cmdline_user_args()
	_crown_mode = not ("--training" in args or "--horde" in args)
	if _crown_mode:
		_setup_crown(world, ground_fx)
	else:
		var spawner := Spawner.new()
		spawner.name = "Spawner"
		spawner.world = world
		spawner.player = _player
		spawner.fx_layer = _top_fx
		spawner.ground_layer = ground_fx
		add_child(spawner)
		spawner.monster_killed.connect(_on_monster_killed)
		_spawner = spawner
		# Training (two unkillable dummies) or "-- --horde" for roaming packs.
		spawner.set_training(not ("--horde" in args))

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
	if _crown_mode:
		_hud.setup_crown(_director, _crown)
		_hud.show_banner("ปกป้องศาลมงกุฎ! มอนสเตอร์จะมาจากประตูสีม่วง", Color(1.0, 0.85, 0.4))


func _setup_crown(world: Node2D, ground_fx: Node2D) -> void:
	_crown = Crown.new()
	_crown.name = "Crown"
	_crown.top_fx = _top_fx
	_crown.position = GameData.MAP_SIZE * 0.5
	world.add_child(_crown)
	_director = WaveDirector.new()
	_director.name = "Waves"
	_director.world = world
	_director.player = _player
	_director.crown = _crown
	_director.fx_layer = _top_fx
	_director.ground_layer = ground_fx
	ground_fx.add_child(_director)
	_director.monster_killed.connect(_on_monster_killed)
	_director.wave_started.connect(_on_wave_started)
	_director.wave_cleared.connect(_on_wave_cleared)
	_director.boss_spawned.connect(_on_boss_spawned)
	_director.finished.connect(_on_finished)
	_crown.destroyed.connect(_director.lose)
	# Dev: "-- --wave=5" starts at wave 5 with a matching level, for testing bosses.
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--wave="):
			var start := clampi(int(arg.trim_prefix("--wave=")), 1, WaveDirector.WAVES)
			_director.wave = start - 1
			_director.countdown = 2.0
			while _player.level < start + 1:
				_player.gain_rewards(GameData.xp_to_next(_player.level), 0)


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
	_add_keys("dodge", [KEY_SHIFT])
	_add_keys("ready", [KEY_ENTER, KEY_KP_ENTER])
	var right := InputEventMouseButton.new()
	right.button_index = MOUSE_BUTTON_RIGHT
	InputMap.action_add_event("dodge", right)
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
	var bonus: float = (1.0 + Combo.reward_bonus()) * (2.5 if _crown_mode else 1.0)
	var xp_gain := roundi(monster.xp_reward * bonus)
	var gold_gain := roundi(monster.gold_reward * bonus)
	_player.gain_rewards(xp_gain, gold_gain)
	var at := monster.global_position + Vector2(0.0, -monster.body_radius * 3.2)
	DamageNumber.spawn_text(_top_fx, at, "+%d EXP" % xp_gain, 20, Color(0.7, 0.95, 1.0))


func _process(_delta: float) -> void:
	if _crown_mode:
		_min_hp = minf(_min_hp, _player.hp / _player.max_hp)
		_min_crown = minf(_min_crown, _crown.hp / _crown.max_hp)
	if Input.is_action_just_pressed("toggle_mode") and _spawner != null:
		_spawner.set_training(not _spawner.training)
		var label := "โหมดฝึกซ้อม" if _spawner.training else "โหมดล่ามอนสเตอร์"
		_hud.show_banner(label, Color(0.7, 0.95, 1.0))


func _on_leveled_up(new_level: int) -> void:
	_hud.show_banner("LEVEL UP!  Lv.%d" % new_level, Color(1.0, 0.85, 0.3))
	if _crown_mode:
		_pending_boons += 1
		_open_picker.call_deferred()


func _open_picker() -> void:
	if _pending_boons <= 0 or is_instance_valid(_picker) or not is_instance_valid(_director):
		return
	if _director.phase == WaveDirector.Phase.OVER:
		return
	_picker = BoonPicker.new()
	_picker.player = _player
	_picker.auto_pick = _player.input is BotInput
	_picker.picked.connect(_on_boon_picked)
	add_child(_picker)


func _on_boon_picked(id: String) -> void:
	_log("boon %s" % id)
	_pending_boons -= 1
	_player.add_boon(id)
	if id == "crown":
		_crown.max_hp *= 1.15
		_crown.heal(0.3)
	_hud.show_banner(String(GameData.BOONS[id]["name"]), Color(0.7, 0.95, 1.0))
	_open_picker.call_deferred()


func _on_wave_started(number: int) -> void:
	_log("wave %d start" % number)
	var boss := number in WaveDirector.BOSS_WAVES
	_hud.show_banner("เวฟ %d%s" % [number, "  บอสมาแล้ว!" if boss else ""],
		Color(1.0, 0.5, 0.4) if boss else Color(1.0, 0.85, 0.4))


func _on_wave_cleared(number: int) -> void:
	if number < WaveDirector.WAVES:
		_hud.show_banner("ผ่านเวฟ %d!  ศาลฟื้น 20%%" % number, Color(0.6, 1.0, 0.7))


func _on_boss_spawned(boss: Boss) -> void:
	_hud.track_boss(boss)
	boss.enraged_now.connect(func() -> void:
		_hud.show_banner("%s คลั่งแล้ว!" % boss.display_name, Color(1.0, 0.4, 0.3)))
	_player.shake(14.0)


func _on_finished(won: bool) -> void:
	_log("finished won=%s" % won)
	var minutes := int(_director.elapsed / 60.0)
	var seconds := int(_director.elapsed) % 60
	var lines: Array[String] = [
		"ผ่าน %d / %d เวฟ" % [_director.wave if won else _director.wave - 1, WaveDirector.WAVES],
		"กำจัดมอนสเตอร์ %d ตัว" % _director.kills,
		"เลเวล %d   เวลา %d:%02d" % [_player.level, minutes, seconds],
	]
	_hud.show_results(won, lines)


func _on_player_died() -> void:
	_hud.show_banner("คุณล้มลง... กำลังฟื้นคืนชีพ", Color(1.0, 0.4, 0.35))


## Progress lines for automated balance runs ("-- --autopilot").
func _log(text: String) -> void:
	if is_instance_valid(_director) and _player.input is BotInput:
		print("[%5.1fs] %s | lv %d | crown %d%% (min %d%%) | lowest hp %d%%" % [
			_director.elapsed, text, _player.level, roundi(100.0 * _crown.hp / _crown.max_hp),
			roundi(100.0 * _min_crown), roundi(100.0 * _min_hp)])
		_min_hp = 1.0

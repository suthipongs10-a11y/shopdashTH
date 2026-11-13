class_name Player
extends CharacterBody2D
## The Warden (sword & shield). Movement, stats, basic attack and four skills.
## Uses sprite sheets from ART_DIR when present, otherwise placeholder art drawn in _draw().
## Origin is at the feet.

signal target_hit(monster: Monster)
signal leveled_up(new_level: int)
signal died
signal respawned

const ART_DIR := "res://art/characters/warden"
const MOVE_SPEED := 270.0
## Ground-plane acceleration (px/s^2): a quick but weighted start and stop.
const ACCEL := 2600.0
const DECEL := 3400.0
const ATTACK_REACH := 112.0
const ATTACK_CONE_DEG := 140.0
const AEGIS_TIME := 4.0
## Share of incoming damage blocked while the aegis bubble is up.
const AEGIS_BLOCK := 0.7
const WHIRL_TIME := 1.6
const WHIRL_TICKS := 8
const WHIRL_MOVE := 0.7
const CROSS_RANGE := 320.0
## Length of the ultimate intro (dim, zoom, cut-in, charge) before the skill lands.
const ULT_CHARGE := 0.9
## Holy Cross leap: time in the air and peak height on screen.
const LEAP_TIME := 0.42
const LEAP_HEIGHT := 150.0
const RESPAWN_DELAY := 3.0
## Shift / right mouse: a quick dash with a moment of invulnerability.
const DODGE_TIME := 0.2
const DODGE_SPEED := 760.0
const DODGE_IFRAMES := 0.32
const DODGE_COOLDOWN := 0.9
## Max hit-spark effects per physics frame, so huge packs do not flood the scene.
const HIT_FX_PER_FRAME := 10

var char_name := "ผู้พิทักษ์"
var level := 1
var xp := 0
var gold := 0
var max_hp := 1.0
var hp := 1.0
var max_sp := 1.0
var sp := 1.0
var attack_power := 1.0
var defense := 0.0
var crit_chance := 0.15
var crit_mult := 1.6
var dead := false
## Aim direction on the ground plane (towards the mouse).
var aim := Vector2.RIGHT
## Seconds left per skill id.
var cooldowns := {}
## Command source; swapped for touch controls or the dev autopilot.
var input: PlayerInput = PlayerInput.new()
## Crown Defense blessings taken: boon id -> times taken (see GameData.BOONS).
var mods := {}
## Cooldown left on the dodge dash (read by the touch button).
var dodge_cooldown := 0.0

## Set by main.gd before the player enters the tree.
var ground_fx: Node2D
var top_fx: Node2D

var _camera: Camera2D
var _sheet: SheetSprite
var _name_label: Label
## Ground-plane direction the body faces: movement direction, or aim right after attacking.
var _face := Vector2.DOWN
var _moving := false
var _walk_t := 0.0
## Walking velocity on the ground plane (without knockback), eased by ACCEL / DECEL.
var _walk_vel := Vector2.ZERO
var _aim_face_left := 0.0
var _aegis_left := 0.0
var _aegis_fx: AegisFx
var _aegis_tally: SkillTally
var _spin_left := 0.0
var _spin_angle := 0.0
var _respawn_left := 0.0
## Knockback from hits, ground-plane velocity that decays.
var _knock := Vector2.ZERO
var _dodge_left := 0.0
var _dodge_dir := Vector2.ZERO
var _iframes := 0.0
var _hurt_flash := 0.0
var _swing := 0.0
var _shake := 0.0
var _hit_fx_budget := HIT_FX_PER_FRAME
## Ultimate charge-up in progress: seconds left and its palette.
var _charge_left := 0.0
var _charge_pal: Dictionary = {}
var _ember_left := 0.0
## Chanting a cast-time skill: seconds left and what to release when it finishes.
var _cast_left := 0.0
var _cast_id := ""
var _cast_mult := 1.0
var _cast_pal: Dictionary = {}
var _cast_tally: SkillTally
var _cast_fx: DragonFx
var _leap_left := 0.0
var _leap_from := Vector2.ZERO
var _leap_to := Vector2.ZERO
var _leap_mult := 1.0
var _leap_pal: Dictionary = {}
var _leap_tally: SkillTally
## Pose held while an ultimate charges ("" = none); _charge_done runs when the charge ends.
var _charge_pose := ""
var _charge_done: Callable
var _charge_tally: SkillTally
## Seconds before a held pose is let go.
var _pose_left := 0.0
var _ghost_left := 0.0


func _ready() -> void:
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	# Layer 1 = player. Mask 0: the player walks through monsters.
	collision_layer = 1
	collision_mask = 0
	var shape := CircleShape2D.new()
	shape.radius = 16.0
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col)

	_sheet = SheetSprite.new()
	_sheet.load_dir(ART_DIR)
	add_child(_sheet)
	_sheet.stepped.connect(_on_step)

	_name_label = Label.new()
	_name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_name_label.size = Vector2(240.0, 22.0)
	_name_label.position = Vector2(-120.0, -146.0)
	_name_label.add_theme_font_size_override("font_size", 14)
	_name_label.add_theme_color_override("font_color", Color(0.75, 1.0, 0.8))
	_name_label.add_theme_color_override("font_outline_color", Color(0.05, 0.1, 0.05))
	_name_label.add_theme_constant_override("outline_size", 5)
	add_child(_name_label)

	_camera = Camera2D.new()
	_camera.position_smoothing_enabled = true
	_camera.position_smoothing_speed = 8.0
	_camera.limit_left = 0
	_camera.limit_top = 0
	_camera.limit_right = int(GameData.MAP_SIZE.x)
	_camera.limit_bottom = int(GameData.MAP_SIZE.y)
	add_child(_camera)
	_camera.make_current()

	for id in GameData.SKILL_ORDER:
		cooldowns[id] = 0.0
	_recalc_stats()
	hp = max_hp
	sp = max_sp


func get_camera() -> Camera2D:
	return _camera


func _recalc_stats() -> void:
	var hp_ratio := hp / max_hp if max_hp > 0.0 else 1.0
	max_hp = (8400.0 + 1600.0 * (level - 1)) * (1.0 + 0.25 * mod("hp"))
	# Generous SP so skills can be chained like the reference clip; potions come with items.
	max_sp = 300.0 + 20.0 * (level - 1)
	attack_power = (800.0 + 180.0 * (level - 1)) * (1.0 + 0.2 * mod("atk"))
	crit_chance = 0.15 + 0.08 * mod("crit")
	hp = max_hp * hp_ratio
	defense = 15.0 + 4.0 * (level - 1)
	_name_label.text = "%s  Lv.%d" % [char_name, level]


func _physics_process(delta: float) -> void:
	_hit_fx_budget = HIT_FX_PER_FRAME
	_hurt_flash = maxf(0.0, _hurt_flash - delta)
	_swing = maxf(0.0, _swing - delta)
	_aim_face_left = maxf(0.0, _aim_face_left - delta)
	_shake = move_toward(_shake, 0.0, 40.0 * delta)
	_camera.offset = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * _shake
	if dead:
		modulate = Color(0.5, 0.5, 0.5, 0.5)
		_respawn_left -= delta
		if _respawn_left <= 0.0:
			_respawn()
		return
	modulate = Color(1.0, 0.55, 0.55) if _hurt_flash > 0.0 else Color.WHITE
	_sheet.set_flash(0.0)

	for id in cooldowns:
		cooldowns[id] = maxf(0.0, cooldowns[id] - delta)
	hp = minf(max_hp, hp + max_hp * 0.008 * delta)
	sp = minf(max_sp, sp + max_sp * 0.06 * (1.0 + 0.4 * mod("sp")) * delta)
	_knock = _knock.move_toward(Vector2.ZERO, 1800.0 * delta)
	_iframes = maxf(0.0, _iframes - delta)
	dodge_cooldown = maxf(0.0, dodge_cooldown - delta)

	var to_aim := input.aim_vector(self)
	if to_aim.length() > 4.0:
		aim = to_aim.normalized()

	_tick_aegis(delta)
	_tick_juice(delta)
	var move := input.move_vector(self)
	if _cast_left > 0.0:
		move = Vector2.ZERO
		_tick_cast(delta)
	if _leap_left > 0.0:
		move = Vector2.ZERO
		_tick_leap(delta)
	if _pose_left > 0.0:
		_pose_left -= delta
		if _pose_left <= 0.0 and _spin_left <= 0.0 and _cast_left <= 0.0 and _leap_left <= 0.0:
			_sheet.release()
	var speed := MOVE_SPEED * (1.0 + 0.12 * mod("speed")) * (WHIRL_MOVE if _spin_left > 0.0 else 1.0)
	var want := move * speed
	var rate := ACCEL if want.length() >= _walk_vel.length() else DECEL
	_walk_vel = _walk_vel.move_toward(want, rate * delta)
	_moving = _walk_vel.length() > 25.0
	var ground_vel := _walk_vel + _knock
	if _dodge_left > 0.0:
		_dodge_left -= delta
		ground_vel = _dodge_dir * DODGE_SPEED
		_ghost_left -= delta
		if _ghost_left <= 0.0:
			_ghost_left = 0.04
			_sheet.ghost(Color(0.7, 0.85, 1.0), 0.2, 0.5)
	elif _can_dodge() and input.is_pressed("dodge"):
		_start_dodge(move)
	velocity = GameData.to_screen(ground_vel)
	move_and_slide()
	if move.length() > 0.05:
		_face = move.normalized()
	if _spin_left > 0.0:
		# Spin: sweep the facing through every direction while holding the slash pose.
		_spin_left -= delta
		_spin_angle += delta * 16.0
		_face = Vector2.from_angle(_spin_angle)
		_ghost_left -= delta
		if _ghost_left <= 0.0:
			_ghost_left = 0.06
			_sheet.ghost(Vfx.pal("steel")["aura"], 0.22)
		if _spin_left <= 0.0:
			_sheet.release()
	elif _cast_left <= 0.0 and _leap_left <= 0.0 and _charge_left <= 0.0:
		_handle_actions()
		if _aim_face_left > 0.0:
			_face = aim

	var margin := Vector2(40.0, 40.0)
	global_position = global_position.clamp(margin, GameData.MAP_SIZE - margin)
	_animate(delta)
	queue_redraw()


func _animate(delta: float) -> void:
	if _moving:
		_walk_t += delta * 11.0
	else:
		_walk_t = 0.0
	if _sheet.has_art():
		_sheet.set_facing(GameData.to_screen(_face))
		_sheet.play("walk" if _moving else "idle")
		_sheet.set_move_speed(_walk_vel.length())
		# A slight lean into sideways movement, pivoting on the feet.
		var lean := clampf(_walk_vel.x / MOVE_SPEED, -1.0, 1.0) * 0.045
		_sheet.rotation = lerpf(_sheet.rotation, lean, 1.0 - exp(-delta * 10.0))


## A foot landed: a small puff of dust where it hit the ground.
func _on_step() -> void:
	var side := GameData.to_screen(_face.orthogonal()).normalized() * randf_range(-10.0, 10.0)
	Vfx.smoke(global_position + side, 2.0, 8.0, 24.0, Color(0.85, 0.75, 0.6), 0.45, 0.3)


func _handle_actions() -> void:
	if input.is_pressed("attack"):
		_try_use("attack")
	for i in GameData.SKILL_ACTIONS.size():
		if input.is_pressed(GameData.SKILL_ACTIONS[i]):
			_try_use(GameData.SKILL_ORDER[i + 1])


func _try_use(id: String) -> void:
	var data: Dictionary = GameData.SKILLS[id]
	var cost := float(data["sp"])
	if (float(cooldowns[id]) > 0.0 or sp < cost or _spin_left > 0.0 or _cast_left > 0.0
			or _leap_left > 0.0):
		return
	sp -= cost
	cooldowns[id] = float(data["cd"]) * pow(0.88, mod("cdr"))
	_aim_face_left = 0.35
	_face = aim
	_sheet.play_once("attack")
	var mult := float(data["mult"])
	var palette := Vfx.pal(String(data.get("pal", "steel")))
	var tally: SkillTally = null
	if id != "attack":
		tally = SkillTally.new()
		tally.anchor = self
		var big := id in ["lion", "banner"]
		tally.color = Color(1.0, 0.5, 0.65) if big else Color(1.0, 0.85, 0.3)
		top_fx.add_child(tally)
		SkillCallout.spawn(top_fx, self, String(data["name"]), palette["aura"])
	match id:
		"attack":
			_do_attack(mult, palette)
		"wave":
			_do_wave(mult, palette, tally)
		"aegis":
			_do_aegis(mult, palette, tally)
		"whirl":
			_do_whirl(mult, palette, tally)
		"lion":
			_ultimate_intro(String(data["name"]), palette)
			_do_lion(mult, palette, tally)
		"cross":
			_do_cross(mult, palette, tally)
		"banner":
			_ultimate_intro(String(data["name"]), palette)
			_do_banner(mult, palette, tally)
		"dragon":
			_begin_cast(id, mult, palette, tally)


## Starts chanting a cast-time skill: rooted in place, cast bar, rune circle, dim + cut-in.
func _begin_cast(id: String, mult: float, palette: Dictionary, tally: SkillTally) -> void:
	var data: Dictionary = GameData.SKILLS[id]
	_cast_id = id
	_cast_left = float(data.get("cast", 1.0)) * pow(0.7, mod("dragon"))
	_cast_mult = mult
	_cast_pal = palette
	_cast_tally = tally
	_pose("cast", 0, "attack", 0, 99.0)
	var bar := CastBar.new()
	bar.anchor = self
	bar.title = String(data["name"])
	bar.color = palette["aura"]
	bar.total = _cast_left
	# EggPact's rune circle under the feet when available; the bar draws its own otherwise.
	var aura: Color = palette["aura"]
	var circle := FxSprite.play(ground_fx, "sigil", global_position, 400.0, _cast_left + 0.3, true,
		aura.lerp(Color.WHITE, 0.25))
	if circle == null:
		circle = FxSprite.play(ground_fx, "ring", global_position, 380.0, _cast_left + 0.3, true,
			aura.lerp(Color.WHITE, 0.35))
	if circle != null:
		circle.follow = self
		circle.grow_from = 0.35
		circle.grow_to = 1.0
		circle.spin = 1.2
		circle.fade_out = 0.3
		bar.draw_circle = false
	top_fx.add_child(bar)
	if id == "dragon":
		# The dragon circles the warden through the chant, then rises and dives on release().
		var dragon := DragonFx.new()
		dragon.caster = self
		dragon.palette = palette
		dragon.choose_target = _dragon_target
		dragon.impact.connect(_dragon_impact.bind(mult, palette))
		top_fx.add_child(dragon)
		_cast_fx = dragon
	_converge(_cast_left, palette)
	Juice.spotlight([self] as Array[Node2D], 0.55, 1.1)
	Juice.cutin(String(data["name"]), palette["cut"], _sheet.portrait())


func _tick_cast(delta: float) -> void:
	_cast_left -= delta
	_sheet.glow_amount = 1.0
	_sheet.glow_color = _cast_pal["aura"]
	if _sheet.has_anim("cast"):
		_sheet.hold("cast", int(Time.get_ticks_msec() / 160.0) % 4)
	Vfx.charge(global_position, 80.0, _cast_pal, 3, 170.0)
	if randf() < 0.5:
		var spot := GameData.to_screen(Vector2.from_angle(randf() * TAU) * randf_range(60, 170))
		Vfx.glow(global_position + spot, 4.0, randf_range(6, 12), _cast_pal["core"],
			randf_range(0.5, 0.9), Vector3(0, 0, randf_range(60, 140)))
	if _cast_left <= 0.0:
		_release_cast()


func _release_cast() -> void:
	_sheet.release()
	_sheet.play_once("attack")
	match _cast_id:
		"dragon":
			if is_instance_valid(_cast_fx):
				_cast_fx.release()
			Juice.flash(0.2, _cast_pal["aura"])
			Vfx.ring(global_position, 20.0, 220.0, _cast_pal["aura"], 0.6, 10.0)
			Vfx.burst(global_position, 80.0, 30, _cast_pal["aura"], 360.0, 16.0, 0.6)


## Where the dragon dives: the middle of the enemies around the warden, else ahead of them.
func _dragon_target() -> Vector2:
	var sum := Vector2.ZERO
	var n := 0
	for node in get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m != null and GameData.ground_dist(global_position, m.global_position) <= 620.0:
			sum += m.global_position
			n += 1
	if n == 0:
		return global_position + GameData.to_screen(aim * 260.0)
	return sum / float(n)


func _dragon_impact(at: Vector2, mult: float, palette: Dictionary) -> void:
	Juice.spotlight_end()
	# The cast-time tally has usually faded by now; start a fresh one for the impact.
	var tally := _live_tally(_cast_tally)
	var pulse := _new_pulse(AoePulse.Style.DRAGON, 300.0, mult, palette["aura"])
	pulse.palette = palette
	pulse.ticks = 3
	pulse.interval = 0.18
	pulse.knock = 300.0
	pulse.shake = 16.0
	pulse.tally = tally
	pulse.position = at
	ground_fx.add_child(pulse)


## Glow, embers and the ultimate charge-up.
func _tick_juice(delta: float) -> void:
	var holy := Vfx.pal("holy")
	var body := global_position
	var pulse := 0.5 + 0.5 * sin(Time.get_ticks_msec() * 0.004)
	if _charge_left > 0.0:
		_charge_left -= delta
		_sheet.glow_amount = 1.0
		_sheet.glow_color = _charge_pal["aura"]
		Vfx.charge(body, 70.0, _charge_pal, 2, 140.0)
		if randf() < 0.7:
			Vfx.flame(body + Vector2(randf_range(-60, 60), randf_range(-8, 8)), _charge_pal["aura"],
				randf_range(18, 30), randf_range(120, 260), randf_range(0.4, 0.7))
		_sheet.squash = Vector2(1.0 + sin(Time.get_ticks_msec() * 0.04) * 0.015, 0.97)
		if _charge_pose != "":
			_pose(_charge_pose, int(Time.get_ticks_msec() / 160.0) % 4 if _charge_pose == "cast" else 0,
				"attack", 0, 9.0)
		if _charge_left <= 0.0:
			Juice.spotlight_end()
			_charge_pose = ""
			_pose_left = 0.01
			if _charge_done.is_valid():
				var done := _charge_done
				_charge_done = Callable()
				done.call()
	else:
		_sheet.glow_amount = 0.3 + 0.2 * pulse
		_sheet.glow_color = holy["aura"]
	# Embers drifting up around the warden, as on EggPact's high-star monsters.
	_ember_left -= delta
	while _ember_left <= 0.0:
		_ember_left += 0.12
		var at := body + Vector2(randf_range(-30, 30), randf_range(-5, 5))
		var tint: Color = holy["core"] if randf() < 0.3 else holy["aura"]
		Vfx.glow(at, randf_range(10, 90), randf_range(4, 8), tint, randf_range(0.6, 1.1),
			Vector3(randf_range(-10, 10), 0.0, randf_range(30, 70)))


## EggPact's ultimate intro: dim the world, zoom in on the caster, sweep the cut-in banner.
func _ultimate_intro(skill_name: String, palette: Dictionary) -> void:
	Juice.spotlight([self] as Array[Node2D], 0.62, 1.14)
	Juice.cutin(skill_name, palette["cut"], _sheet.portrait())
	_charge_left = ULT_CHARGE
	_charge_pal = palette
	_converge(ULT_CHARGE, palette)


## Ring of inward arrows closing on the warden while a big skill charges.
func _converge(seconds: float, palette: Dictionary) -> void:
	var aura: Color = palette["aura"]
	var ring := FxSprite.play(ground_fx, "converge", global_position, 420.0, seconds, true,
		aura.lerp(Color.WHITE, 0.35))
	if ring != null:
		ring.follow = self
		ring.grow_from = 1.3
		ring.grow_to = 0.35
		ring.spin = -2.5
		ring.fade_in = 0.15


## Basic attack: a cone in front of the player. Lunges a little, leaves an afterimage and
## slashes every target hit (EggPact's melee hit).
func _do_attack(mult: float, palette: Dictionary) -> void:
	_swing = 0.2
	_sheet.squash = Vector2(1.15, 0.9)
	_sheet.hop = -10.0
	_sheet.ghost(palette["aura"], 0.18)
	var screen_dir := GameData.to_screen(aim).normalized()
	var half_cone := deg_to_rad(ATTACK_CONE_DEG * 0.5)
	var hits := 0
	for node in get_tree().get_nodes_in_group("monsters"):
		var m := node as Monster
		if m == null:
			continue
		var offset := GameData.to_ground(m.global_position - global_position)
		if offset.length() > ATTACK_REACH + m.body_radius:
			continue
		if offset.length() > m.body_radius and absf(aim.angle_to(offset)) > half_cone:
			continue
		if hits < 3:
			Vfx.slash(m.global_position, m.visual_height() * 0.45, screen_dir, palette,
				1.3 if m.kind == "golem" else 1.0)
		hits += 1
		strike(m, mult, aim * 120.0)
	if hits > 0:
		Juice.hitstop(0.05)
	else:
		Vfx.slash(global_position + screen_dir * ATTACK_REACH * 0.6, 50.0, screen_dir, palette, 0.8)


## Q: three piercing blade waves in a fan.
func _do_wave(mult: float, palette: Dictionary, tally: SkillTally) -> void:
	_swing = 0.2
	_sheet.ghost(palette["aura"], 0.2)
	var blades := 3 + 2 * mod("wave")
	for i in blades:
		var spread := (i - (blades - 1) * 0.5) * 0.28
		var wave := BladeWave.new()
		wave.player = self
		wave.tally = tally
		wave.dir = aim.rotated(spread)
		wave.mult = mult
		wave.palette = palette
		wave.position = global_position
		top_fx.add_child(wave)
	Vfx.charge(global_position, 60.0, palette, 6, 90.0)
	Vfx.ring(global_position, 10.0, 90.0, palette["core"], 0.3, 5.0)


## E: raise a bubble shield. Blocks most damage, shoves enemies away on cast,
## and bursts outward when it ends.
func _do_aegis(mult: float, palette: Dictionary, tally: SkillTally) -> void:
	_aegis_left = AEGIS_TIME
	_aegis_tally = tally
	if is_instance_valid(_aegis_fx):
		_aegis_fx.queue_free()
	_aegis_fx = AegisFx.new()
	_aegis_fx.color = palette["aura"]
	_aegis_fx.follow = self
	top_fx.add_child(_aegis_fx)
	_pose("guard", 1, "idle", 0, 0.45)
	Juice.flash(0.15, palette["aura"])
	Vfx.twinkle(global_position, 70.0, 110.0, Color(1.0, 0.9, 0.6), 0.5)
	Vfx.ring(global_position, 20.0, 150.0, palette["aura"], 0.45, 9.0)
	Vfx.ring(global_position, 10.0, 100.0, palette["hot"], 0.3, 4.0)
	Vfx.burst(global_position, 60.0, 24, palette["aura"], 380.0, 14.0, 0.5)
	for i in 8:
		var a := TAU * i / 8.0
		Vfx.twinkle(global_position + GameData.to_screen(Vector2.from_angle(a) * 80.0),
			randf_range(30, 110), randf_range(8, 14), palette["core"], randf_range(0.4, 0.8))
	var pulse := _new_pulse(AoePulse.Style.SHOCK, 130.0, mult * 0.5, palette["aura"])
	pulse.palette = palette
	pulse.knock = 360.0
	pulse.stun = 0.6
	pulse.shake = 5.0
	pulse.tally = tally
	pulse.position = global_position
	ground_fx.add_child(pulse)


func _tick_aegis(delta: float) -> void:
	if _aegis_left <= 0.0:
		return
	_aegis_left -= delta
	if _aegis_left > 0.0:
		return
	if is_instance_valid(_aegis_fx):
		_aegis_fx.pop()
	var data: Dictionary = GameData.SKILLS["aegis"]
	var palette := Vfx.pal("aegis")
	Vfx.explode(global_position, palette, true)
	Juice.flash(0.12, palette["aura"])
	var pulse := _new_pulse(AoePulse.Style.SHOCK, 190.0 + 50.0 * mod("aegis"),
		float(data["mult"]) * (1.0 + 0.8 * mod("aegis")), palette["aura"])
	pulse.palette = palette
	pulse.knock = 300.0
	pulse.shake = 8.0
	# The cast tally fades after a second without hits, so the burst usually gets a fresh one.
	if not is_instance_valid(_aegis_tally):
		_aegis_tally = SkillTally.new()
		_aegis_tally.anchor = self
		_aegis_tally.color = Color(1.0, 0.85, 0.3)
		top_fx.add_child(_aegis_tally)
	pulse.tally = _aegis_tally
	pulse.position = global_position
	ground_fx.add_child(pulse)


## R: spin in place (still able to walk slowly), slashing everything around.
func _do_whirl(mult: float, palette: Dictionary, tally: SkillTally) -> void:
	var whirl_time := WHIRL_TIME * (1.0 + 0.5 * mod("whirl"))
	_spin_left = whirl_time
	_spin_angle = aim.angle()
	_sheet.hold("attack", 2)
	var pulse := _new_pulse(AoePulse.Style.WHIRL, 165.0, mult, palette["aura"])
	pulse.palette = palette
	pulse.follow = self
	pulse.ticks = roundi(WHIRL_TICKS * whirl_time / WHIRL_TIME)
	pulse.interval = WHIRL_TIME / float(WHIRL_TICKS)
	pulse.knock = 60.0
	pulse.tally = tally
	pulse.position = global_position
	ground_fx.add_child(pulse)


## F: after the intro charge, a golden lion spirit rises and roars: three blasts around.
func _do_lion(mult: float, palette: Dictionary, tally: SkillTally) -> void:
	# Brace behind the shield through the intro, then bash: light bursts forward out of the
	# shield and the golden lion leaps out of it.
	var ground_dir := aim
	_charge_pose = "bash"
	_charge_tally = tally
	# Do not bind the tally: it may be freed before the charge ends.
	_charge_done = _lion_bash.bind(ground_dir, mult, palette)


func _lion_bash(ground_dir: Vector2, mult: float, palette: Dictionary) -> void:
	var tally := _live_tally(_charge_tally)
	_face = ground_dir
	_shield_bash(ground_dir, palette)
	var lion := LionFx.new()
	lion.color = palette["aura"]
	lion.dir = GameData.to_screen(ground_dir).normalized()
	lion.from_back = -40.0
	lion.position = global_position
	top_fx.add_child(lion)
	var pulse := _new_pulse(AoePulse.Style.ROAR, 280.0, mult, palette["aura"])
	pulse.palette = palette
	pulse.ticks = 3 + 2 * mod("lion")
	pulse.interval = 0.26
	pulse.delay = LionFx.ROAR_AT * 0.6
	pulse.knock = 300.0
	pulse.shake = 12.0
	pulse.tally = tally
	pulse.position = global_position + GameData.to_screen(ground_dir * 170.0)
	ground_fx.add_child(pulse)


## Shield bash pose, a short lunge and a cone of light blasting forward out of the shield.
func _shield_bash(ground_dir: Vector2, palette: Dictionary) -> void:
	_pose("bash", 2, "attack", 2, 0.4)
	if _sheet.has_anim("bash"):
		_sheet.release()
		_sheet.play_once("bash")
	_sheet.squash = Vector2(1.2, 0.86)
	_sheet.ghost(palette["aura"], 0.25, 0.6)
	var d := GameData.to_screen(ground_dir).normalized()
	global_position += d * 26.0
	var front := global_position + d * 50.0
	Juice.flash(0.2, palette["aura"])
	Juice.hitstop(0.06)
	shake(12.0)
	var aura: Color = palette["aura"]
	var burst := FxSprite.play(top_fx, "gold_burst", front + Vector2(0.0, -55.0), 170.0, 0.35,
		false, aura)
	if burst != null:
		burst.grow_from = 0.4
		burst.grow_to = 1.3
		burst.spin = 3.0
	var wave := FxSprite.play(ground_fx, "shock_ring", front + d * 60.0, 260.0, 0.45, true, aura)
	if wave != null:
		wave.grow_from = 0.3
		wave.grow_to = 1.2
	# The cone: fast streaks and glowing motes fanning out along the bash.
	for i in 46:
		var spread := randf_range(-0.55, 0.55)
		var speed := randf_range(450.0, 1100.0)
		var v := GameData.to_screen(ground_dir.rotated(spread) * speed)
		var tint: Color = palette["core"] if randf() < 0.35 else aura
		Vfx.glow(front, randf_range(30, 80), randf_range(4, 9), tint, randf_range(0.25, 0.5),
			Vector3(v.x, v.y, randf_range(-60, 160)), 0.0,
			Vfx.Kind.STREAK if i % 2 == 0 else Vfx.Kind.GLOW)
	Vfx.burst(front, 50.0, 16, palette["hot"], 300.0, 12.0, 0.4)
	Vfx.smoke(global_position, 10.0, 30.0, 90.0, Color(0.85, 0.75, 0.6), 0.6, 0.3)


## 1: leap at the aim point with the sword raised and slam it into the ground; the holy
## cross of light erupts where the warden lands.
func _do_cross(mult: float, palette: Dictionary, tally: SkillTally) -> void:
	var offset := input.aim_vector(self).limit_length(CROSS_RANGE)
	var margin := Vector2(40.0, 40.0)
	_leap_from = global_position
	_leap_to = (global_position + GameData.to_screen(offset)).clamp(margin,
		GameData.MAP_SIZE - margin)
	_leap_left = LEAP_TIME
	_leap_mult = mult
	_leap_pal = palette
	_leap_tally = tally
	if offset.length() > 4.0:
		_face = offset.normalized()
	_pose("slam", 1, "attack", 0, LEAP_TIME + 0.1)
	_sheet.squash = Vector2(1.25, 0.78)
	Vfx.smoke(global_position, 6.0, 30.0, 80.0, Color(0.85, 0.75, 0.6), 0.6, 0.3)
	Vfx.ring(global_position, 10.0, 70.0, palette["aura"], 0.3, 5.0)


func _tick_leap(delta: float) -> void:
	_leap_left -= delta
	var u := clampf(1.0 - _leap_left / LEAP_TIME, 0.0, 1.0)
	global_position = _leap_from.lerp(_leap_to, u * u * (3.0 - 2.0 * u))
	_sheet.hop = -sin(u * PI) * LEAP_HEIGHT
	_ghost_left -= delta
	if _ghost_left <= 0.0:
		_ghost_left = 0.05
		_sheet.ghost(_leap_pal["aura"], 0.2, 0.45)
	if _leap_left <= 0.0:
		_land_slam()


func _land_slam() -> void:
	_sheet.hop = 0.0
	_sheet.squash = Vector2(1.3, 0.74)
	_pose("slam", 2, "attack", 2, 0.35)
	var palette := _leap_pal
	var aura: Color = palette["aura"]
	shake(14.0)
	Juice.hitstop(0.07)
	var crack := FxSprite.play(ground_fx, "shock_ring", global_position, 300.0, 0.4, true, aura)
	if crack != null:
		crack.grow_from = 0.2
		crack.grow_to = 1.1
	Vfx.smoke(global_position, 10.0, 60.0, 140.0, Color(0.85, 0.75, 0.6), 0.8, 0.3)
	Vfx.burst(global_position, 10.0, 30, aura, 520.0, 14.0, 0.5)
	var pulse := _new_pulse(AoePulse.Style.CROSS, 170.0 * (1.0 + 0.25 * mod("spears")),
		_leap_mult, aura)
	pulse.spears = 4 + 4 * mod("spears")
	pulse.palette = palette
	pulse.ticks = 2
	pulse.interval = 0.22
	pulse.knock = 160.0
	pulse.stun = 0.4
	pulse.shake = 6.0
	pulse.tally = _live_tally(_leap_tally)
	pulse.position = global_position
	ground_fx.add_child(pulse)


## 2: second ultimate. After the intro charge a golden crest rises, then five radiant
## blasts with lances of light raining on everything nearby.
func _do_banner(mult: float, palette: Dictionary, tally: SkillTally) -> void:
	_charge_pose = "cast"
	var crest := CrestFx.new()
	crest.color = palette["aura"]
	crest.delay = ULT_CHARGE
	crest.position = global_position
	top_fx.add_child(crest)
	var pulse := _new_pulse(AoePulse.Style.BANNER, 330.0, mult, palette["aura"])
	pulse.palette = palette
	pulse.ticks = 5
	pulse.interval = 0.22
	pulse.delay = ULT_CHARGE + CrestFx.RISE
	pulse.knock = 120.0
	pulse.shake = 14.0
	pulse.tally = tally
	pulse.position = global_position
	ground_fx.add_child(pulse)


func _new_pulse(style: AoePulse.Style, radius: float, mult: float, color: Color) -> AoePulse:
	var pulse := AoePulse.new()
	pulse.player = self
	pulse.top_fx = top_fx
	pulse.style = style
	pulse.radius = radius
	pulse.mult = mult
	pulse.color = color
	return pulse


## Applies one hit to a monster using the shared damage formula:
## ATK x skill mult x (1 - DEF/(DEF+K)) x crit x combo bonus, with +/-10% variance.
func strike(
		m: Monster, mult: float, knock: Vector2 = Vector2.ZERO, stun: float = 0.0,
		tally: SkillTally = null
) -> void:
	if m.state == Monster.State.DEAD:
		return
	var is_crit := randf() < crit_chance
	var amount := attack_power * mult * randf_range(0.9, 1.1)
	amount *= 1.0 - m.defense / (m.defense + GameData.DEF_K)
	if is_crit:
		amount *= crit_mult
	amount *= 1.0 + Combo.damage_bonus()
	var dmg := maxi(1, roundi(amount))
	var body := m.global_position + Vector2(0.0, -m.visual_height() * 0.45)
	m.take_damage(dmg, knock, stun)
	var head := m.global_position + Vector2(0.0, -m.visual_height() - 22.0)
	DamageNumber.spawn(top_fx, head, dmg, is_crit, m.get_instance_id())
	Combo.register_hit(dmg)
	if mod("leech") > 0:
		hp = minf(max_hp, hp + dmg * 0.015 * mod("leech"))
	if tally != null and is_instance_valid(tally):
		tally.add(dmg)
	if _hit_fx_budget > 0:
		_hit_fx_budget -= 1
		_hit_effect(body, is_crit)
	if is_crit:
		shake(3.0)
	target_hit.emit(m)


func _hit_effect(at: Vector2, is_crit: bool) -> void:
	var jitter := Vector2(randf_range(-12.0, 12.0), randf_range(-12.0, 12.0))
	var fx := FxSprite.play(top_fx, "hit", at + jitter, 120.0 if is_crit else 70.0, 0.2, false,
		Color(1.0, 0.92, 0.6) if is_crit else Vfx.pal("steel")["core"])
	if fx != null:
		fx.rotation = randf() * TAU
		fx.grow_from = 0.5
		fx.grow_to = 1.1
		fx.fade_out = 0.14
		return
	# "at" is a screen point on the body; Vfx works on the ground point plus a height.
	var ground := at + Vector2(0.0, 50.0)
	var steel := Vfx.pal("steel")
	Vfx.glow(ground, 50.0, 46.0 if is_crit else 30.0, steel["aura"], 0.16)
	Vfx.burst(ground, 50.0, 7 if is_crit else 4, steel["hot"], 300.0, 9.0, 0.3)
	if is_crit:
		Vfx.twinkle(ground + jitter, 50.0, 40.0, Color(1.0, 0.92, 0.6), 0.35)


## knock: ground-plane velocity pushing the warden away from the blow.
func take_damage(raw: int, knock: Vector2 = Vector2.ZERO) -> void:
	if dead:
		return
	if _iframes > 0.0:
		DamageNumber.spawn_text(top_fx, global_position + Vector2(0.0, -120.0), "หลบ!", 22,
			Color(0.7, 0.9, 1.0))
		return
	if _leap_left <= 0.0 and _cast_left <= 0.0:
		_knock += knock
		if knock.length() > 500.0:
			_sheet.squash = Vector2(1.25, 0.8)
			_sheet.ghost(Color(1.0, 0.3, 0.25), 0.2, 0.5)
	var reduced := float(raw) * (1.0 - defense / (defense + GameData.DEF_K))
	if _aegis_left > 0.0:
		reduced *= 1.0 - AEGIS_BLOCK
		if is_instance_valid(_aegis_fx):
			_aegis_fx.ripple()
	var dmg := maxi(1, roundi(reduced))
	hp -= float(dmg)
	_hurt_flash = 0.15
	DamageNumber.spawn_hurt(top_fx, global_position + Vector2(0.0, -110.0), dmg)
	if hp <= 0.0:
		_die()


func gain_rewards(xp_amount: int, gold_amount: int) -> void:
	gold += gold_amount
	xp += xp_amount
	while xp >= GameData.xp_to_next(level):
		xp -= GameData.xp_to_next(level)
		level += 1
		_recalc_stats()
		hp = max_hp
		sp = max_sp
		var holy := Vfx.pal("holy")
		var ray := FxSprite.play(top_fx, "pillar", global_position + Vector2(0.0, -200.0), 460.0, 1.1,
			false, holy["aura"])
		if ray == null:
			Vfx.beam(global_position, 80.0, holy["aura"], 1.2)
		Vfx.ring(global_position, 10.0, 200.0, holy["aura"], 0.8, 9.0)
		Vfx.burst(global_position, 80.0, 30, holy["aura"], 300.0, 14.0, 0.9)
		Juice.flash(0.15, holy["aura"])
		leveled_up.emit(level)


func shake(amount: float) -> void:
	_shake = maxf(_shake, amount)


func mod(id: String) -> int:
	return int(mods.get(id, 0))


## Takes a level-up blessing and applies its stat changes.
func add_boon(id: String) -> void:
	mods[id] = mod(id) + 1
	var was_max := max_hp
	_recalc_stats()
	if max_hp > was_max:
		hp += max_hp - was_max


func _can_dodge() -> bool:
	return (dodge_cooldown <= 0.0 and _cast_left <= 0.0 and _leap_left <= 0.0
		and _charge_left <= 0.0 and _spin_left <= 0.0)


func _start_dodge(move: Vector2) -> void:
	_dodge_dir = move.normalized() if move.length() > 0.1 else aim
	_dodge_left = DODGE_TIME
	_iframes = DODGE_IFRAMES
	dodge_cooldown = DODGE_COOLDOWN
	_knock = Vector2.ZERO
	_face = _dodge_dir
	_sheet.squash = Vector2(1.2, 0.85)
	Vfx.smoke(global_position, 6.0, 20.0, 60.0, Color(0.85, 0.75, 0.6), 0.45, 0.3)


## The skill's damage tally if it is still on screen, else a fresh one (tallies fade out
## after a second without hits, so delayed blasts often need a new one).
func _live_tally(tally: Variant) -> SkillTally:
	if is_instance_valid(tally):
		return tally
	var fresh := SkillTally.new()
	fresh.anchor = self
	fresh.color = Color(1.0, 0.85, 0.3)
	top_fx.add_child(fresh)
	return fresh


## Holds a frame of a pose animation for some seconds; when the warden has no such sheet
## yet, holds the fallback frame instead (e.g. the sword-raised attack frame).
func _pose(anim: String, frame: int, fallback: String, fallback_frame: int, seconds: float) -> void:
	if _sheet.has_anim(anim):
		_sheet.hold(anim, frame)
	elif fallback != "idle":
		_sheet.hold(fallback, fallback_frame)
	else:
		_sheet.release()
	_pose_left = seconds


func _die() -> void:
	dead = true
	hp = 0.0
	_spin_left = 0.0
	_cast_left = 0.0
	if is_instance_valid(_cast_fx):
		_cast_fx.queue_free()
	_aegis_left = 0.0
	_leap_left = 0.0
	_charge_left = 0.0
	_charge_pose = ""
	_charge_done = Callable()
	_sheet.release()
	if is_instance_valid(_aegis_fx):
		_aegis_fx.queue_free()
	_respawn_left = RESPAWN_DELAY
	velocity = Vector2.ZERO
	Combo.reset()
	died.emit()


func _respawn() -> void:
	dead = false
	hp = max_hp
	sp = max_sp
	global_position = GameData.MAP_SIZE * 0.5 + Vector2(0.0, 150.0)
	modulate = Color.WHITE
	respawned.emit()


func _draw() -> void:
	# Soft wide shadow plus a darker core under the feet; both shrink when the body is in the air.
	var lift := clampf(-_sheet.hop / 160.0, 0.0, 0.6) if _sheet != null else 0.0
	draw_colored_polygon(GameData.ellipse_points(34.0 * (1.0 - lift * 0.5), 24),
		Color(0, 0, 0, 0.2 * (1.0 - lift)))
	draw_colored_polygon(GameData.ellipse_points(17.0 * (1.0 - lift * 0.5), 20),
		Color(0, 0, 0, 0.32 * (1.0 - lift)))
	if _sheet.has_art():
		return
	PlaceholderKnight.draw(self, _face, _moving, _walk_t, aim, _swing)

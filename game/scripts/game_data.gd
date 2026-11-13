class_name GameData
extends RefCounted
## Central data tables and shared math helpers.
## All numbers are starting values, to be tuned in playtests.

## Vertical squash that fakes the tilted camera. Gameplay distances are measured
## on the "ground plane"; the screen shows that plane squashed on the Y axis.
const Y_SQUASH := 0.62
## Armor constant: damage taken = raw * (1 - DEF / (DEF + DEF_K)).
const DEF_K := 400.0
const MAP_SIZE := Vector2(3600.0, 2400.0)

## Hotbar order. Index 0 is the basic attack; the rest follow SKILL_KEYS.
const SKILL_ORDER: Array[String] = [
	"attack", "wave", "aegis", "whirl", "lion", "cross", "banner", "dragon",
]
## Input action for each entry of SKILL_ORDER after the basic attack.
const SKILL_ACTIONS: Array[String] = [
	"skill_q", "skill_e", "skill_r", "skill_f", "skill_1", "skill_2", "skill_3",
]

const SKILLS := {
	"attack": {
		"name": "ฟันดาบ", "short": "ฟัน", "key": "คลิก",
		"mult": 1.0, "cd": 0.4, "sp": 0.0, "pal": "steel", "color": Color(0.75, 0.78, 0.85),
	},
	"wave": {
		"name": "คลื่นดาบสามสาย", "short": "คลื่นดาบ", "key": "Q",
		"mult": 1.6, "cd": 3.0, "sp": 12.0, "pal": "steel", "color": Color(0.45, 0.75, 1.0),
	},
	"aegis": {
		"name": "โล่ประกาศิต", "short": "กางโล่", "key": "E",
		"mult": 1.4, "cd": 12.0, "sp": 25.0, "pal": "aegis", "color": Color(0.7, 0.88, 1.0),
	},
	"whirl": {
		"name": "พายุดาบ", "short": "หมุนดาบ", "key": "R",
		"mult": 0.55, "cd": 8.0, "sp": 30.0, "pal": "steel", "color": Color(0.85, 0.95, 1.0),
	},
	"lion": {
		"name": "คำรามสิงห์ทอง", "short": "สิงห์ทอง", "key": "F",
		"mult": 2.6, "cd": 35.0, "sp": 60.0, "pal": "fire", "color": Color(1.0, 0.72, 0.22),
	},
	"cross": {
		"name": "กางเขนศักดิ์สิทธิ์", "short": "กางเขน", "key": "1",
		"mult": 1.7, "cd": 6.0, "sp": 22.0, "pal": "holy", "color": Color(1.0, 0.86, 0.45),
	},
	"banner": {
		"name": "ธงศักดิ์สิทธิ์", "short": "ธงทอง", "key": "2",
		"mult": 1.2, "cd": 45.0, "sp": 70.0, "pal": "holy", "color": Color(1.0, 0.8, 0.35),
	},
	"dragon": {
		"name": "เรียกเทพมังกรทอง", "short": "มังกรทอง", "key": "3",
		"mult": 3.2, "cd": 50.0, "sp": 90.0, "pal": "dragon", "color": Color(1.0, 0.77, 0.23),
		# Seconds of chanting before the dragon appears; the warden cannot move meanwhile.
		"cast": 1.6,
	},
}

const MONSTERS := {
	"golem": {
		"name": "โกเลมถ่านเพลิง", "shape": "block",
		"hp": 5200, "hp_per_level": 1200, "atk": 560, "atk_per_level": 120,
		"def": 60.0, "speed": 70.0, "radius": 34.0,
		"aggro": 620.0, "range": 34.0, "windup": 0.6, "cooldown": 1.6,
		"xp": 22, "gold": 6, "color": Color(0.62, 0.45, 0.42), "pal": "fire",
		# Chance that a slam leaves a burning patch on the ground.
		"fire_chance": 0.8,
		"poise": 0.6, "siege_mult": 0.7,
	},
	"imp": {
		"name": "อิมป์เถ้าธุลี", "shape": "round",
		"hp": 2200, "hp_per_level": 500, "atk": 320, "atk_per_level": 80,
		"def": 15.0, "speed": 150.0, "radius": 20.0,
		"aggro": 720.0, "range": 28.0, "windup": 0.35, "cooldown": 1.1,
		"xp": 10, "gold": 3, "color": Color(0.78, 0.36, 0.85), "pal": "dark",
	},
	# Crown Defense: fast spirits that ignore the warden and run straight for the shrine.
	"wisp": {
		"name": "อิมป์วิญญาณ", "shape": "round", "art": "imp", "size": 0.85,
		"tint": Color(0.55, 0.85, 1.4), "ignore_player": true,
		"hp": 1600, "hp_per_level": 400, "atk": 380, "atk_per_level": 90,
		"def": 10.0, "speed": 215.0, "radius": 18.0,
		"aggro": 0.0, "range": 26.0, "windup": 0.3, "cooldown": 0.9,
		"xp": 12, "gold": 4, "color": Color(0.5, 0.8, 1.0), "pal": "aegis",
	},
	# Crown Defense boss: the golem art drawn larger and darker (until it has its own sheets).
	"boss": {
		"name": "ยักษ์หินลาวา", "shape": "block", "art": "golem", "size": 1.75,
		"tint": Color(1.0, 0.72, 0.62),
		"hp": 90000, "hp_per_level": 30000, "atk": 900, "atk_per_level": 200,
		"def": 120.0, "speed": 62.0, "radius": 60.0,
		"aggro": 900.0, "range": 60.0, "windup": 0.9, "cooldown": 2.0,
		"xp": 600, "gold": 150, "color": Color(0.62, 0.35, 0.3), "pal": "fire",
		# Bosses barely budge and cannot be stunned.
		"poise": 0.1, "no_stun": true,
	},
}

## Crown Defense towers, built on stone slots with gold. Values per level 1..3.
## cost: gold to build (level 1) or to upgrade to that level.
const TOWERS := {
	"archer": {
		"name": "หอธนูแสง", "desc": "ยิงศัตรูตัวที่ใกล้ที่สุด", "key": "Z",
		"cost": [100, 120, 200], "damage": [420, 700, 1100], "rate": [0.75, 0.65, 0.55],
		"range": [420.0, 470.0, 520.0], "shots": [1, 1, 2],
		"color": Color(1.0, 0.85, 0.45),
	},
	"pillar": {
		"name": "เสาแสงศักดิ์สิทธิ์", "desc": "ระเบิดแสงเป็นวงรอบตัวเป็นระยะ", "key": "X",
		"cost": [150, 150, 240], "damage": [800, 1300, 2000], "rate": [2.6, 2.3, 2.0],
		"range": [180.0, 210.0, 240.0],
		"color": Color(1.0, 0.75, 0.3),
	},
	"wall": {
		"name": "กำแพงหนาม", "desc": "มอนต้องหยุดตีกำแพงก่อน โดนหนามสวนกลับ", "key": "C",
		"cost": [80, 100, 160], "hp": [6000, 12000, 20000], "thorns": [150, 260, 400],
		"range": [230.0, 250.0, 270.0],
		"color": Color(0.8, 0.65, 0.5),
	},
	"font": {
		"name": "น้ำพุรักษา", "desc": "ฟื้นเลือดเราและศาลมงกุฎที่อยู่ใกล้", "key": "V",
		"cost": [120, 120, 200], "heal": [0.04, 0.06, 0.09], "crown_heal": [0.003, 0.005, 0.008],
		"range": [230.0, 270.0, 310.0],
		"color": Color(0.5, 1.0, 0.75),
	},
}
const TOWER_ORDER := ["archer", "pillar", "wall", "font"]
const START_GOLD := 160

## Crown Defense: level-up blessings, pick 1 of 3. "max" is how many times one can be taken.
const BOONS := {
	"atk": {"name": "คมดาบศักดิ์สิทธิ์", "desc": "พลังโจมตี +20%", "max": 5},
	"hp": {"name": "เกราะหนาขึ้น", "desc": "เลือดสูงสุด +25%", "max": 4},
	"cdr": {"name": "จิตแน่วแน่", "desc": "คูลดาวน์ทุกสกิล -12%", "max": 4},
	"speed": {"name": "ฝีเท้าเทพ", "desc": "วิ่งเร็วขึ้น 12%", "max": 3},
	"crit": {"name": "ตาเหยี่ยว", "desc": "โอกาสคริติคอล +8%", "max": 4},
	"leech": {"name": "ดาบดูดเลือด", "desc": "ฟื้นเลือด 1.5% ของดาเมจที่ทำ", "max": 3},
	"sp": {"name": "ลมหายใจแสง", "desc": "SP ฟื้นเร็วขึ้น 40%", "max": 3},
	"wave": {"name": "คลื่นดาบห้าสาย", "desc": "Q ปล่อยคลื่นดาบเพิ่ม 2 สาย", "max": 2},
	"lion": {"name": "สิงโตคำรามคู่", "desc": "F ระเบิดด้านหน้าเพิ่ม 2 ครั้ง", "max": 2},
	"spears": {"name": "ฝนหอกแสง", "desc": "1 หอกแสงเพิ่ม 4 เล่ม วงกว้างขึ้น", "max": 2},
	"whirl": {"name": "พายุไม่สิ้นสุด", "desc": "R หมุนนานขึ้น 50%", "max": 2},
	"aegis": {"name": "เกราะแตกระเบิด", "desc": "E ตอนเกราะแตก ระเบิดแรงขึ้น 80%", "max": 2},
	"dragon": {"name": "เสียงเรียกมังกร", "desc": "3 ร่ายเร็วขึ้น 30%", "max": 2},
	"crown": {"name": "พรแห่งมงกุฎ", "desc": "ศาลมงกุฎฟื้น 30% เลือดสูงสุด +15%", "max": 99},
}


## Screen-space vector -> ground-plane vector.
static func to_ground(v: Vector2) -> Vector2:
	return Vector2(v.x, v.y / Y_SQUASH)


## Ground-plane vector -> screen-space vector.
static func to_screen(v: Vector2) -> Vector2:
	return Vector2(v.x, v.y * Y_SQUASH)


## Distance between two screen positions, measured on the ground plane.
static func ground_dist(a: Vector2, b: Vector2) -> float:
	return to_ground(b - a).length()


static func xp_to_next(level: int) -> int:
	return 40 + int(60.0 * pow(float(level), 1.6))


## 1234567 -> "1,234,567"
static func format_int(n: int) -> String:
	var digits := str(absi(n))
	var out := ""
	var count := 0
	for i in range(digits.length() - 1, -1, -1):
		out = digits[i] + out
		count += 1
		if count % 3 == 0 and i > 0:
			out = "," + out
	return ("-" if n < 0 else "") + out


## Outline of a ground circle as seen on screen (an ellipse).
static func ellipse_points(radius: float, segments: int = 40) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var r := maxf(radius, 4.0)
	for i in segments:
		var a := TAU * float(i) / float(segments)
		pts.append(Vector2(cos(a) * r, sin(a) * r * Y_SQUASH))
	return pts


## Same as ellipse_points but closed, for draw_polyline.
static func ellipse_outline(radius: float, segments: int = 40) -> PackedVector2Array:
	var pts := ellipse_points(radius, segments)
	pts.append(pts[0])
	return pts

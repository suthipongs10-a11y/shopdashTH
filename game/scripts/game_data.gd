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
const SKILL_ORDER: Array[String] = ["attack", "wave", "aegis", "whirl", "lion", "cross", "banner"]
## Input action for each entry of SKILL_ORDER after the basic attack.
const SKILL_ACTIONS: Array[String] = [
	"skill_q", "skill_e", "skill_r", "skill_f", "skill_1", "skill_2",
]

const SKILLS := {
	"attack": {
		"name": "ฟันดาบ", "short": "ฟัน", "key": "คลิก",
		"mult": 1.0, "cd": 0.4, "sp": 0.0, "color": Color(0.75, 0.78, 0.85),
	},
	"wave": {
		"name": "คลื่นดาบสามสาย", "short": "คลื่นดาบ", "key": "Q",
		"mult": 1.6, "cd": 3.0, "sp": 12.0, "color": Color(0.45, 0.75, 1.0),
	},
	"aegis": {
		"name": "โล่ประกาศิต", "short": "กางโล่", "key": "E",
		"mult": 1.4, "cd": 12.0, "sp": 25.0, "color": Color(0.7, 0.88, 1.0),
	},
	"whirl": {
		"name": "พายุดาบ", "short": "หมุนดาบ", "key": "R",
		"mult": 0.55, "cd": 8.0, "sp": 30.0, "color": Color(0.85, 0.95, 1.0),
	},
	"lion": {
		"name": "คำรามสิงห์ทอง", "short": "สิงห์ทอง", "key": "F",
		"mult": 2.6, "cd": 35.0, "sp": 60.0, "color": Color(1.0, 0.72, 0.22),
	},
	"cross": {
		"name": "กางเขนศักดิ์สิทธิ์", "short": "กางเขน", "key": "1",
		"mult": 1.7, "cd": 6.0, "sp": 22.0, "color": Color(1.0, 0.86, 0.45),
	},
	"banner": {
		"name": "ธงศักดิ์สิทธิ์", "short": "ธงทอง", "key": "2",
		"mult": 1.2, "cd": 45.0, "sp": 70.0, "color": Color(1.0, 0.8, 0.35),
	},
}

const MONSTERS := {
	"golem": {
		"name": "โกเลมถ่านเพลิง", "shape": "block",
		"hp": 5200, "hp_per_level": 1200, "atk": 560, "atk_per_level": 120,
		"def": 60.0, "speed": 70.0, "radius": 34.0,
		"aggro": 620.0, "range": 34.0, "windup": 0.6, "cooldown": 1.6,
		"xp": 22, "gold": 6, "color": Color(0.62, 0.45, 0.42),
		# Chance that a slam leaves a burning patch on the ground.
		"fire_chance": 0.8,
	},
	"imp": {
		"name": "อิมป์เถ้าธุลี", "shape": "round",
		"hp": 2200, "hp_per_level": 500, "atk": 320, "atk_per_level": 80,
		"def": 15.0, "speed": 150.0, "radius": 20.0,
		"aggro": 720.0, "range": 28.0, "windup": 0.35, "cooldown": 1.1,
		"xp": 10, "gold": 3, "color": Color(0.78, 0.36, 0.85),
	},
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

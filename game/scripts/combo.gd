extends Node
## Autoload "Combo": hit counter that resets after TIMEOUT seconds without a hit.
## Higher tiers raise EXP/gold rewards and add a small damage bonus.

signal tier_up(tier_index: int)

const TIMEOUT := 3.0
const TIERS: Array[Dictionary] = [
	{"hits": 10, "name": "FIERCE", "reward": 0.05, "damage": 0.03, "color": Color(1.0, 1.0, 1.0)},
	{"hits": 50, "name": "SAVAGE", "reward": 0.10, "damage": 0.06, "color": Color(0.5, 0.85, 1.0)},
	{"hits": 100, "name": "RUTHLESS", "reward": 0.20, "damage": 0.10, "color": Color(1.0, 0.65, 0.2)},
	{"hits": 250, "name": "MYTHIC", "reward": 0.35, "damage": 0.15, "color": Color(1.0, 0.35, 0.75)},
]

var hits := 0
var total_damage := 0
## Index into TIERS, -1 while below the first tier.
var tier := -1

var _time_left := 0.0


func _process(delta: float) -> void:
	if hits == 0:
		return
	_time_left -= delta
	if _time_left <= 0.0:
		reset()


func register_hit(damage: int) -> void:
	hits += 1
	total_damage += damage
	_time_left = TIMEOUT
	if tier + 1 < TIERS.size() and hits >= int(TIERS[tier + 1]["hits"]):
		tier += 1
		tier_up.emit(tier)


func reset() -> void:
	hits = 0
	total_damage = 0
	tier = -1
	_time_left = 0.0


func reward_bonus() -> float:
	return 0.0 if tier < 0 else float(TIERS[tier]["reward"])


func damage_bonus() -> float:
	return 0.0 if tier < 0 else float(TIERS[tier]["damage"])


func tier_name() -> String:
	return "" if tier < 0 else String(TIERS[tier]["name"])


func tier_color() -> Color:
	if tier < 0:
		return Color(0.85, 0.85, 0.85)
	return TIERS[tier]["color"]


func time_ratio() -> float:
	return clampf(_time_left / TIMEOUT, 0.0, 1.0)

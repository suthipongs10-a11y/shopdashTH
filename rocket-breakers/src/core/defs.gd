## Typed runtime definitions compiled from data/catalog.json.
## Definitions are immutable content data; runtime state lives elsewhere.
class_name Defs
extends RefCounted

const GRID_SIZE := 7
const GRID_ORIGIN := Vector2i(3, 3)
const TILE_PX := 22.0


static func names_from(d: Dictionary) -> Dictionary:
	var n: Dictionary = d.get("name", {})
	return {"th": str(n.get("th", "")), "en": str(n.get("en", ""))}


static func cells_from(raw: Array) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for c in raw:
		out.append(Vector2i(int(c[0]), int(c[1])))
	return out


## Grid cell -> local offset in logical px. Origin (3,3) is the hull centre and
## grid y increases toward the nose, which is negative screen y.
static func cell_to_local(cell: Vector2i) -> Vector2:
	return Vector2((cell.x - GRID_ORIGIN.x) * TILE_PX, -(cell.y - GRID_ORIGIN.y) * TILE_PX)


class HullDef:
	var id: String
	var names: Dictionary
	var hp: float
	var shield: float
	var base_speed: float
	var mass_cap: float
	var reactor_capacity: float
	var energy_regen: float
	var socket_mask: Array[Vector2i]
	var reactor_cell: Vector2i
	var cargo_capacity: int
	var asset_id: String
	var starter_loadout: Array[Dictionary] = []

	static func from_dict(d: Dictionary) -> HullDef:
		var h := HullDef.new()
		h.id = d["id"]
		h.names = Defs.names_from(d)
		h.hp = float(d["hp"])
		h.shield = float(d["shield"])
		h.base_speed = float(d["base_speed"])
		h.mass_cap = float(d["mass_cap"])
		h.reactor_capacity = float(d["reactor_capacity"])
		h.energy_regen = float(d["energy_regen"])
		h.socket_mask = Defs.cells_from(d["socket_mask"])
		h.reactor_cell = Vector2i(int(d["reactor_cell"][0]), int(d["reactor_cell"][1]))
		h.cargo_capacity = int(d.get("cargo_capacity", 2))
		h.asset_id = d["asset_id"]
		var loadout = d.get("starter_loadout")
		if loadout is Array:
			for item in loadout:
				h.starter_loadout.append({
					"weapon_id": str(item["weapon_id"]),
					"grid_origin": Vector2i(int(item["grid_origin"][0]), int(item["grid_origin"][1])),
				})
		return h


class WeaponDef:
	var id: String
	var names: Dictionary
	var family: String
	var attack_model: String
	var damage: float
	var trigger_rate: float
	var projectiles_per_trigger: int
	var energy_per_trigger: float
	var heat_per_trigger: float
	var mass: float
	var footprint: Array[Vector2i]
	var rotation_allowed: bool
	var firing_arc_deg: float
	var special_params: Dictionary
	var salvage_source: String
	var asset_id: String

	static func from_dict(d: Dictionary) -> WeaponDef:
		var w := WeaponDef.new()
		w.id = d["id"]
		w.names = Defs.names_from(d)
		w.family = d["family"]
		w.attack_model = d["attack_model"]
		w.damage = float(d["damage"])
		w.trigger_rate = float(d["trigger_rate"])
		w.projectiles_per_trigger = int(d["projectiles_per_trigger"])
		w.energy_per_trigger = float(d["energy_per_trigger"])
		w.heat_per_trigger = float(d["heat_per_trigger"])
		w.mass = float(d["mass"])
		w.footprint = Defs.cells_from(d["footprint"])
		w.rotation_allowed = bool(d["rotation_allowed"])
		w.firing_arc_deg = float(d["firing_arc_deg"])
		w.special_params = d.get("special_params", {})
		w.salvage_source = "" if d.get("salvage_source") == null else str(d["salvage_source"])
		w.asset_id = d["asset_id"]
		return w

	## Highest footprint cell relative to origin: the muzzle sits at its nose edge.
	func muzzle_cell_offset() -> Vector2i:
		var best := footprint[0]
		for c in footprint:
			if c.y > best.y:
				best = c
		return best

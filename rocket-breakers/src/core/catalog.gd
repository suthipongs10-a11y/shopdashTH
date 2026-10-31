## Loads data/catalog.json, validates every ID/reference and compiles typed defs.
## The JSON file stays the source of truth; nothing here renames IDs.
class_name Catalog
extends RefCounted

const DEFAULT_PATH := "res://data/catalog.json"
const SUPPORTED_SCHEMA := 1
const EXPECTED_COUNTS := {
	"sectors": 8, "missions": 48, "hulls": 12, "weapons": 36, "abilities": 12,
	"utilities": 12, "bosses": 16, "enemies": 24, "hazards": 8, "fusions": 8,
}

var raw: Dictionary = {}
var errors: PackedStringArray = []
## group -> { id -> raw row }
var index: Dictionary = {}
var hulls: Dictionary = {}    # id -> Defs.HullDef
var weapons: Dictionary = {}  # id -> Defs.WeaponDef


static func load_from(path: String = DEFAULT_PATH) -> Catalog:
	var c := Catalog.new()
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		c.errors.append("catalog not readable: %s" % path)
		return c
	var parsed = JSON.parse_string(text)
	if not parsed is Dictionary:
		c.errors.append("catalog is not a JSON object: %s" % path)
		return c
	c.raw = parsed
	c._validate()
	if c.errors.is_empty():
		c._compile()
	return c


func is_valid() -> bool:
	return errors.is_empty() and not raw.is_empty()


func row(group: String, id: String) -> Dictionary:
	return index.get(group, {}).get(id, {})


func hull(id: String) -> Defs.HullDef:
	return hulls.get(id)


func weapon(id: String) -> Defs.WeaponDef:
	return weapons.get(id)


func campaign_star_slots() -> int:
	var total := 0
	for m in raw.get("missions", []):
		total += (m["star_objectives"] as Array).size()
	return total


func _fail(msg: String) -> void:
	errors.append(msg)


func _validate() -> void:
	if int(raw.get("schema_version", -1)) != SUPPORTED_SCHEMA:
		_fail("unsupported catalog schema_version %s" % raw.get("schema_version"))
		return
	for group in EXPECTED_COUNTS:
		var rows = raw.get(group)
		if not rows is Array:
			_fail("missing group %s" % group)
			continue
		if rows.size() != EXPECTED_COUNTS[group]:
			_fail("%s count %d != %d" % [group, rows.size(), EXPECTED_COUNTS[group]])
		var ids := {}
		for r in rows:
			var id := str(r.get("id", ""))
			if id.is_empty() or ids.has(id):
				_fail("%s has empty or duplicate id '%s'" % [group, id])
			ids[id] = r
		index[group] = ids
	if not errors.is_empty():
		return
	if campaign_star_slots() != 144 or int(raw["counts"]["campaign_stars"]) != 144:
		_fail("campaign stars must total 144")
	_validate_missions()
	_validate_bosses()
	_validate_sectors()
	_validate_hulls()
	for a in raw["abilities"]:
		_ref("abilities.%s.unlock_source" % a["id"], "bosses", a["unlock_source"])
	for f in raw["fusions"]:
		_ref("fusions.%s.requires_utility" % f["id"], "utilities", f["requires_utility"])
	for w in raw["weapons"]:
		if float(w["damage"]) <= 0.0 or float(w["trigger_rate"]) <= 0.0:
			_fail("weapon %s needs positive damage and trigger_rate" % w["id"])
		if w.get("salvage_source") != null:
			_ref("weapons.%s.salvage_source" % w["id"], "bosses", w["salvage_source"])


func _ref(where: String, group: String, id) -> void:
	if id == null or not index[group].has(str(id)):
		_fail("%s -> unknown %s id '%s'" % [where, group, id])


func _validate_missions() -> void:
	for m in raw["missions"]:
		var mid: String = m["id"]
		_ref(mid + ".sector_id", "sectors", m["sector_id"])
		_ref(mid + ".hazard_id", "hazards", m["hazard_id"])
		if m["unlock_prev"] != null:
			_ref(mid + ".unlock_prev", "missions", m["unlock_prev"])
		if m["encounter_id"] != null:
			_ref(mid + ".encounter_id", "bosses", m["encounter_id"])
		for w in m["waves"]:
			if w.has("enemy_id"):
				_ref(mid + ".waves.enemy_id", "enemies", w["enemy_id"])
			if w.has("encounter_id"):
				_ref(mid + ".waves.encounter_id", "bosses", w["encounter_id"])
		if (m["star_objectives"] as Array).size() != 3:
			_fail("%s must have exactly 3 star objectives" % mid)
		for o in m["star_objectives"]:
			if o["key"] == "secure_signature":
				_ref(mid + ".secure_signature", "weapons", o.get("target_id"))
		if int(m["rewards"]["credits"]) <= 0 or int(m["rewards"]["scrap"]) <= 0:
			_fail("%s rewards must be positive" % mid)


func _validate_bosses() -> void:
	for b in raw["bosses"]:
		var bid: String = b["id"]
		_ref(bid + ".sector_id", "sectors", b["sector_id"])
		_ref(bid + ".signature_weapon_id", "weapons", b["signature_weapon_id"])
		var w := row("weapons", str(b["signature_weapon_id"]))
		if not w.is_empty() and str(w.get("salvage_source")) != bid:
			_fail("%s signature weapon does not point back to boss" % bid)
		if b["ability_unlock_id"] != null:
			var a := row("abilities", str(b["ability_unlock_id"]))
			if a.is_empty() or str(a["unlock_source"]) != bid:
				_fail("%s ability_unlock_id mismatch" % bid)


func _validate_sectors() -> void:
	for s in raw["sectors"]:
		var count := 0
		for m in raw["missions"]:
			if m["sector_id"] == s["id"]:
				count += 1
		if count != 6:
			_fail("sector %s has %d missions, expected 6" % [s["id"], count])
		var n := int(str(s["id"]).substr(1))
		if int(s["unlock_total_stars"]) > (n - 1) * 6:
			_fail("sector %s star gate could softlock clear-only progression" % s["id"])
		if s["requires_previous_final"] != null:
			_ref("sectors.%s.requires_previous_final" % s["id"], "missions", s["requires_previous_final"])


## Starter loadouts must be legal fits: on mask, no overlap, under mass cap,
## sustained energy draw <= 80% of regen (SYSTEMS §3).
func _validate_hulls() -> void:
	for h in raw["hulls"]:
		var mask := {}
		for c in h["socket_mask"]:
			mask[Vector2i(int(c[0]), int(c[1]))] = true
		if not mask.has(Vector2i(int(h["reactor_cell"][0]), int(h["reactor_cell"][1]))):
			_fail("hull %s reactor cell is outside its socket mask" % h["id"])
		var occupied := {}
		var mass := 0.0
		var energy := 0.0
		var loadout = h.get("starter_loadout")
		if not loadout is Array:
			continue
		for item in loadout:
			var w := row("weapons", str(item["weapon_id"]))
			if w.is_empty():
				_fail("hull %s starter weapon %s unknown" % [h["id"], item["weapon_id"]])
				continue
			for p in w["footprint"]:
				var cell := Vector2i(int(item["grid_origin"][0]) + int(p[0]), int(item["grid_origin"][1]) + int(p[1]))
				if not mask.has(cell) or occupied.has(cell):
					_fail("hull %s starter %s illegal cell %s" % [h["id"], w["id"], cell])
				occupied[cell] = true
			mass += float(w["mass"])
			energy += float(w["energy_per_trigger"]) * float(w["trigger_rate"])
		if mass > float(h["mass_cap"]):
			_fail("hull %s starter loadout over mass cap" % h["id"])
		if energy > float(h["energy_regen"]) * 0.8 + 1e-6:
			_fail("hull %s starter loadout exceeds 80%% energy regen" % h["id"])


func _compile() -> void:
	for h in raw["hulls"]:
		hulls[h["id"]] = Defs.HullDef.from_dict(h)
	for w in raw["weapons"]:
		weapons[w["id"]] = Defs.WeaponDef.from_dict(w)

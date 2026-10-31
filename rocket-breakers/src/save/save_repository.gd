## Local profile persistence (TECHNICAL "Save schema", AGENTS §12).
## File format: first line "RBSAVE <sha256-of-payload>", then the payload JSON text.
## The checksum detects corruption only; it is not anti-cheat.
## Never deletes player progress: unreadable files are copied aside, future-schema
## saves block writing instead of being replaced.
class_name SaveRepository
extends RefCounted

const CURRENT_SCHEMA := 1
const CONTENT_VERSION := "1.0"
const MAGIC := "RBSAVE"
const INT_FIELDS: PackedStringArray = ["credits", "scrap"]

enum Status { OK, NEW, RECOVERED, FUTURE, CORRUPT }

var dir: String
var slot: String
## Set when the on-disk save is from a newer schema; all writes are refused.
var write_blocked := false
var last_error := ""


func _init(save_dir: String = "user://saves", slot_name: String = "slot_0") -> void:
	dir = save_dir
	slot = slot_name


func main_path() -> String:
	return "%s/%s.json" % [dir, slot]


func backup_path(n: int) -> String:
	return "%s/%s.bak%d.json" % [dir, slot, n]


func tmp_path() -> String:
	return "%s/%s.tmp" % [dir, slot]


static func default_profile() -> Dictionary:
	return {
		"schema_version": CURRENT_SCHEMA,
		"profile_id": _uuid_v4(),
		"content_version": CONTENT_VERSION,
		"settings": default_settings(),
		"mission_records": {},
		"unlocked_hulls": ["H01"],
		"blueprint_fragments": {},
		"weapon_research": {},
		"credits": 0,
		"scrap": 0,
		"loadouts": [],
		"active_run": null,
		"applied_settlements": [],
		"pending_settlement": null,
	}


static func default_settings() -> Dictionary:
	return {
		"language": "th", "shake": 1.0, "flash": 1.0, "photosensitive": false,
		"auto_lock": false, "auto_tractor": false, "handedness": "right", "touch_mode": "relative",
	}


## Returns {status: Status, profile: Dictionary, source: String}.
func load_profile() -> Dictionary:
	write_blocked = false
	last_error = ""
	var candidates := [main_path(), backup_path(1), backup_path(2)]
	var any_file := false
	for i in candidates.size():
		var path: String = candidates[i]
		if not FileAccess.file_exists(path):
			continue
		any_file = true
		var parsed := parse_text(FileAccess.get_file_as_string(path))
		if parsed["error"] == "future_schema":
			write_blocked = true
			last_error = "save schema %s is newer than supported %d" % [parsed.get("schema"), CURRENT_SCHEMA]
			return {"status": Status.FUTURE, "profile": default_profile(), "source": path}
		if parsed["error"].is_empty():
			return {"status": Status.OK if i == 0 else Status.RECOVERED, "profile": parsed["profile"], "source": path}
		last_error = "%s: %s" % [path.get_file(), parsed["error"]]
		_preserve_corrupt(path)
	if any_file:
		return {"status": Status.CORRUPT, "profile": default_profile(), "source": ""}
	return {"status": Status.NEW, "profile": default_profile(), "source": ""}


## Atomic write: tmp → flush → rotate valid snapshots → rename tmp to main.
func save_profile(profile: Dictionary) -> bool:
	if write_blocked:
		last_error = "write blocked: on-disk save is from a newer version"
		return false
	var problems := validate_profile(profile)
	if not problems.is_empty():
		last_error = "refusing to write invalid profile: %s" % ", ".join(problems)
		return false
	DirAccess.make_dir_recursive_absolute(dir)
	var f := FileAccess.open(tmp_path(), FileAccess.WRITE)
	if f == null:
		last_error = "cannot open temp file (%s)" % FileAccess.get_open_error()
		return false
	f.store_string(serialize(profile))
	f.flush()
	f.close()
	if FileAccess.file_exists(main_path()):
		if parse_text(FileAccess.get_file_as_string(main_path()))["error"].is_empty():
			if FileAccess.file_exists(backup_path(1)):
				_replace(backup_path(1), backup_path(2))
			_replace(main_path(), backup_path(1))
		else:
			_preserve_corrupt(main_path())
			DirAccess.remove_absolute(main_path())
	return _replace(tmp_path(), main_path())


func export_text(profile: Dictionary) -> String:
	return serialize(profile)


## Validates imported text and writes it as the current save (old one rotates to backup).
func import_text(text: String) -> Dictionary:
	var parsed := parse_text(text)
	if not parsed["error"].is_empty():
		return {"ok": false, "error": parsed["error"]}
	if not save_profile(parsed["profile"]):
		return {"ok": false, "error": last_error}
	return {"ok": true, "profile": parsed["profile"]}


static func serialize(profile: Dictionary) -> String:
	var payload := JSON.stringify(profile, "  ", true)
	return "%s %s\n%s" % [MAGIC, payload.sha256_text(), payload]


## Returns {error: String ("" when valid), profile, schema}.
static func parse_text(text: String) -> Dictionary:
	var nl := text.find("\n")
	if nl < 0:
		return {"error": "missing header"}
	var header := text.substr(0, nl).split(" ")
	var payload := text.substr(nl + 1)
	if header.size() != 2 or header[0] != MAGIC:
		return {"error": "bad header"}
	if payload.sha256_text() != header[1]:
		return {"error": "checksum mismatch"}
	var data = JSON.parse_string(payload)
	if not data is Dictionary:
		return {"error": "payload is not an object"}
	var schema := int(data.get("schema_version", -1))
	if schema > CURRENT_SCHEMA:
		return {"error": "future_schema", "schema": schema}
	if schema < 0:
		return {"error": "missing schema_version"}
	var profile := migrate(data)
	var problems := validate_profile(profile)
	if not problems.is_empty():
		return {"error": "invalid: %s" % ", ".join(problems)}
	return {"error": "", "profile": profile, "schema": schema}


## Applies migrations in order. Unknown keys are preserved untouched.
static func migrate(data: Dictionary) -> Dictionary:
	var p := data.duplicate(true)
	var v := int(p.get("schema_version", 0))
	while v < CURRENT_SCHEMA:
		match v:
			0:
				_migrate_0_to_1(p)
		v += 1
		p["schema_version"] = v
	for k in INT_FIELDS:
		if p.get(k) is float:
			p[k] = int(p[k])
	var settings: Dictionary = p.get("settings", {})
	var defaults := default_settings()
	for k in defaults:
		if not settings.has(k):
			settings[k] = defaults[k]
	p["settings"] = settings
	return p


## Schema 0 = pre-release profile without settlement journal / loadouts.
static func _migrate_0_to_1(p: Dictionary) -> void:
	var d := default_profile()
	for k in ["settings", "mission_records", "unlocked_hulls", "blueprint_fragments", "weapon_research",
			"loadouts", "applied_settlements"]:
		if not p.has(k):
			p[k] = d[k]
	for k in ["active_run", "pending_settlement"]:
		if not p.has(k):
			p[k] = null
	if not p.has("profile_id"):
		p["profile_id"] = d["profile_id"]
	if not p.has("content_version"):
		p["content_version"] = CONTENT_VERSION


static func validate_profile(p: Dictionary) -> PackedStringArray:
	var problems: PackedStringArray = []
	if int(p.get("schema_version", -1)) != CURRENT_SCHEMA:
		problems.append("schema_version")
	if str(p.get("profile_id", "")).is_empty():
		problems.append("profile_id")
	for k in INT_FIELDS:
		var v = p.get(k)
		if not (v is int or v is float) or v < 0:
			problems.append(k)
	if not p.get("settings") is Dictionary:
		problems.append("settings")
	var records = p.get("mission_records")
	if not records is Dictionary:
		problems.append("mission_records")
	else:
		for mid in records:
			var stars = records[mid].get("stars") if records[mid] is Dictionary else null
			if not stars is Array or stars.size() != 3:
				problems.append("mission_records.%s.stars" % mid)
	var hulls = p.get("unlocked_hulls")
	if not hulls is Array or not hulls.has("H01"):
		problems.append("unlocked_hulls")
	for k in ["blueprint_fragments", "weapon_research"]:
		if not p.get(k) is Dictionary:
			problems.append(k)
	for k in ["loadouts", "applied_settlements"]:
		if not p.get(k) is Array:
			problems.append(k)
	return problems


func _replace(from: String, to: String) -> bool:
	if FileAccess.file_exists(to):
		DirAccess.remove_absolute(to)
	var err := DirAccess.rename_absolute(from, to)
	if err != OK:
		last_error = "rename %s -> %s failed (%d)" % [from.get_file(), to.get_file(), err]
		return false
	return true


func _preserve_corrupt(path: String) -> void:
	var dest := "%s.corrupt-%d" % [path, Time.get_unix_time_from_system()]
	if not FileAccess.file_exists(dest):
		DirAccess.copy_absolute(path, dest)


static func _uuid_v4() -> String:
	var b := Crypto.new().generate_random_bytes(16)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	var h := b.hex_encode()
	return "%s-%s-%s-%s-%s" % [h.substr(0, 8), h.substr(8, 4), h.substr(12, 4), h.substr(16, 4), h.substr(20, 12)]

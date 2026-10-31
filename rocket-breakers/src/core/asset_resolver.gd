## Maps logical asset_id -> manifest row. In development a missing or not yet
## integrated asset resolves to a visibly labelled placeholder; release builds fail.
class_name AssetResolver
extends RefCounted

const MANIFEST_PATH := "res://art/asset_manifest.csv"
const USABLE_STATUSES: PackedStringArray = ["integrated"]

var rows: Dictionary = {}  # asset_id -> Dictionary
var errors: PackedStringArray = []
var release_mode := false


static func load_from(path: String = MANIFEST_PATH) -> AssetResolver:
	var r := AssetResolver.new()
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		r.errors.append("manifest not readable: %s" % path)
		return r
	var header := f.get_csv_line()
	while not f.eof_reached():
		var line := f.get_csv_line()
		if line.size() < header.size():
			continue
		var row := {}
		for i in header.size():
			row[header[i]] = line[i]
		if r.rows.has(row["asset_id"]):
			r.errors.append("duplicate asset_id %s" % row["asset_id"])
		r.rows[row["asset_id"]] = row
	return r


## Returns {asset_id, status, path, placeholder: bool}. status mirrors the manifest
## ("planned", "requested", ...) or "unknown" when the id is not listed.
func resolve(asset_id: String) -> Dictionary:
	var row: Dictionary = rows.get(asset_id, {})
	var status: String = row.get("status", "unknown")
	var path: String = row.get("runtime_path", "")
	var usable := USABLE_STATUSES.has(status) and not path.is_empty()
	if not usable and release_mode:
		push_error("release build missing integrated asset: %s (%s)" % [asset_id, status])
	return {"asset_id": asset_id, "status": status, "path": path, "placeholder": not usable}

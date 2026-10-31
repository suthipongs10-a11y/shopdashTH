extends TestCase

var _dirs: Array[String] = []


func _repo() -> SaveRepository:
	var d := "user://test_saves_%d_%d" % [Time.get_ticks_usec(), randi()]
	_dirs.append(d)
	return SaveRepository.new(d)


func _cleanup() -> void:
	for d in _dirs:
		for f in DirAccess.get_files_at(d):
			DirAccess.remove_absolute(d + "/" + f)
		DirAccess.remove_absolute(d)


func _write(path: String, text: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(text)
	f.close()


func test_new_profile_round_trip_and_reload() -> void:
	var r := _repo()
	var first := r.load_profile()
	eq(first["status"], SaveRepository.Status.NEW, "fresh install")
	var p: Dictionary = first["profile"]
	p["credits"] = 500
	p["blueprint_fragments"]["W022"] = 1
	p["mission_records"]["P01-01"] = {"stars": [true, false, true], "best_score": 500, "difficulty_records": {}}
	p["settings"]["language"] = "en"
	check(r.save_profile(p), "save ok")
	var again := SaveRepository.new(r.dir).load_profile()
	eq(again["status"], SaveRepository.Status.OK, "reload ok")
	var q: Dictionary = again["profile"]
	eq(q["credits"], 500, "credits persisted as int")
	eq(q["blueprint_fragments"]["W022"], 1.0, "fragment persisted")
	eq(q["settings"]["language"], "en", "language persisted")
	eq(q["profile_id"], p["profile_id"], "profile id stable")
	_cleanup()


func test_rotating_backups_keep_previous_two_snapshots() -> void:
	var r := _repo()
	var p := SaveRepository.default_profile()
	for credits in [10, 20, 30]:
		p["credits"] = credits
		r.save_profile(p)
	eq(SaveRepository.parse_text(FileAccess.get_file_as_string(r.main_path()))["profile"]["credits"], 30, "main newest")
	eq(SaveRepository.parse_text(FileAccess.get_file_as_string(r.backup_path(1)))["profile"]["credits"], 20, "bak1 previous")
	eq(SaveRepository.parse_text(FileAccess.get_file_as_string(r.backup_path(2)))["profile"]["credits"], 10, "bak2 older")
	check(not FileAccess.file_exists(r.tmp_path()), "temp file renamed away")
	_cleanup()


func test_corrupt_main_recovers_from_backup_and_keeps_bad_file() -> void:
	var r := _repo()
	var p := SaveRepository.default_profile()
	p["credits"] = 111
	r.save_profile(p)
	p["credits"] = 222
	r.save_profile(p)
	_write(r.main_path(), "RBSAVE deadbeef\n{\"broken\":")
	var res := r.load_profile()
	eq(res["status"], SaveRepository.Status.RECOVERED, "recovered from backup")
	eq(res["profile"]["credits"], 111, "backup contents")
	var kept := false
	for f in DirAccess.get_files_at(r.dir):
		if f.contains(".corrupt-"):
			kept = true
	check(kept, "corrupt file copied aside, not deleted")
	_cleanup()


func test_interrupted_write_never_loses_progress() -> void:
	var r := _repo()
	var p := SaveRepository.default_profile()
	p["credits"] = 50
	r.save_profile(p)
	p["credits"] = 60
	r.save_profile(p)
	# Crash after rotation, before tmp -> main rename.
	DirAccess.rename_absolute(r.main_path(), r.tmp_path())
	var res := r.load_profile()
	eq(res["status"], SaveRepository.Status.RECOVERED, "falls back to last valid snapshot")
	eq(res["profile"]["credits"], 50, "previous snapshot intact")
	_cleanup()


func test_all_files_corrupt_starts_fresh_but_preserves_originals() -> void:
	var r := _repo()
	DirAccess.make_dir_recursive_absolute(r.dir)
	_write(r.main_path(), "garbage")
	_write(r.backup_path(1), "garbage too")
	var res := r.load_profile()
	eq(res["status"], SaveRepository.Status.CORRUPT, "corrupt status")
	check(FileAccess.file_exists(r.main_path()), "original main left in place")
	eq(res["profile"]["credits"], 0, "fresh profile offered")
	_cleanup()


func test_future_schema_is_rejected_and_never_overwritten() -> void:
	var r := _repo()
	DirAccess.make_dir_recursive_absolute(r.dir)
	var future := SaveRepository.default_profile()
	future["schema_version"] = 99
	future["credits"] = 9999
	var payload := JSON.stringify(future, "  ", true)
	var text := "RBSAVE %s\n%s" % [payload.sha256_text(), payload]
	_write(r.main_path(), text)
	var res := r.load_profile()
	eq(res["status"], SaveRepository.Status.FUTURE, "future save detected")
	check(r.write_blocked, "writes blocked")
	check(not r.save_profile(SaveRepository.default_profile()), "save refused")
	eq(FileAccess.get_file_as_string(r.main_path()), text, "future save untouched")
	_cleanup()


func test_schema0_migration_preserves_unknown_keys() -> void:
	var r := _repo()
	DirAccess.make_dir_recursive_absolute(r.dir)
	var old := {"schema_version": 0, "profile_id": "legacy-1", "credits": 5, "scrap": 2,
		"unlocked_hulls": ["H01"], "mission_records": {}, "archived_event_token": {"keep": true}}
	var payload := JSON.stringify(old, "  ", true)
	_write(r.main_path(), "RBSAVE %s\n%s" % [payload.sha256_text(), payload])
	var res := r.load_profile()
	eq(res["status"], SaveRepository.Status.OK, "old save loads")
	var p: Dictionary = res["profile"]
	eq(p["schema_version"], SaveRepository.CURRENT_SCHEMA, "migrated to current schema")
	eq(p["archived_event_token"], {"keep": true}, "unknown key preserved")
	eq(p["applied_settlements"], [], "settlement journal added")
	eq(p["credits"], 5, "credits kept")
	_cleanup()


func test_export_import_round_trip_and_bad_import_keeps_current() -> void:
	var r := _repo()
	var p := SaveRepository.default_profile()
	p["scrap"] = 42
	r.save_profile(p)
	var exported := r.export_text(p)
	var other := _repo()
	var ok := other.import_text(exported)
	check(ok["ok"], "import accepted")
	eq(other.load_profile()["profile"]["scrap"], 42, "imported progress")
	var bad := r.import_text("RBSAVE 00\n{}")
	check(not bad["ok"], "bad import rejected")
	eq(r.load_profile()["profile"]["scrap"], 42, "current save unchanged after bad import")
	var neg := SaveRepository.default_profile()
	neg["credits"] = -5
	check(not r.save_profile(neg), "invalid profile refused")
	_cleanup()

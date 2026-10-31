## Headless test runner:
##   godot --headless --path . --import          (once, registers class_name scripts)
##   godot --headless --path . -s res://tests/run_tests.gd
## Runs every func test_* in tests/test_*.gd after the first frame (so nodes added
## to the tree get _ready). Any engine/script error logged during a test fails it,
## because GDScript runtime errors abort the test silently otherwise.
extends SceneTree


class ErrorCounter extends Logger:
	var count := 0
	var last := ""

	func _log_error(function: String, file: String, line: int, code: String, rationale: String,
			_editor_notify: bool, _error_type: int, _script_backtraces: Array[ScriptBacktrace]) -> void:
		count += 1
		last = "%s (%s:%d %s)" % [rationale if not rationale.is_empty() else code, file, line, function]


var _started := false


func _process(_delta: float) -> bool:
	if _started:
		return false
	_started = true
	var errors := ErrorCounter.new()
	OS.add_logger(errors)
	var total := 0
	var failed := 0
	for f in DirAccess.get_files_at("res://tests"):
		if not (f.begins_with("test_") and f.ends_with(".gd")) or f == "test_case.gd":
			continue
		var script: GDScript = load("res://tests/" + f)
		for method in script.get_script_method_list():
			var name: String = method["name"]
			if not name.begins_with("test_"):
				continue
			var t: TestCase = script.new()
			t.tree = self
			t._current = "%s::%s" % [f.get_basename(), name]
			var before := errors.count
			t.call(name)
			if errors.count != before:
				t.failures.append("%s: engine/script error: %s" % [t._current, errors.last])
			total += 1
			if t.failures.is_empty():
				print("PASS  ", t._current)
			else:
				failed += 1
				for msg in t.failures:
					print("FAIL  ", msg)
	OS.remove_logger(errors)
	print("\n%d tests, %d passed, %d failed" % [total, total - failed, failed])
	quit(0 if failed == 0 and total > 0 else 1)
	return false

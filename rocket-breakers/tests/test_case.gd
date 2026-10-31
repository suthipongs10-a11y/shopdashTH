## Minimal assertion base for headless tests (no third-party framework needed).
class_name TestCase
extends RefCounted

var failures: PackedStringArray = []
var tree: SceneTree
var _current := ""


func check(cond: bool, msg: String) -> void:
	if not cond:
		failures.append("%s: %s" % [_current, msg])


func eq(actual, expected, msg: String) -> void:
	check(actual == expected, "%s (expected %s, got %s)" % [msg, expected, actual])


func near(actual: float, expected: float, tol: float, msg: String) -> void:
	check(absf(actual - expected) <= tol, "%s (expected %s ±%s, got %s)" % [msg, expected, tol, actual])

extends TestCase


func test_every_ui_key_has_thai_and_english() -> void:
	var c := Catalog.load_from()
	var loc := LocalizationService.new()
	loc.build(c)
	eq(loc.missing.size(), 0, "missing translations: %s" % ", ".join(loc.missing))
	# Known catalog gap: fusion names are English-only (docs/DECISIONS.md).
	eq(loc.needs_translation.size(), 8, "only the 8 fusion names lack Thai")
	for key in loc.needs_translation:
		check(key.begins_with("fusions."), "untranslated key outside fusions: " + key)
	eq(loc.text("weapons.W022.name", "th"), "หางพลาสมาแมงป่อง", "Thai catalog name")
	eq(loc.text("weapons.W022.name", "en"), "Scorpion Tail", "English catalog name")
	eq(loc.text("ui.hud.dash", "th"), "พุ่ง", "Thai UI string")


func test_asset_resolver_marks_unintegrated_assets_as_placeholder() -> void:
	var r := AssetResolver.load_from()
	eq(r.errors.size(), 0, "manifest errors")
	eq(r.rows.size(), 386, "manifest rows")
	var hull := r.resolve("hull_H01")
	eq(hull["status"], "planned", "hull status from manifest")
	check(hull["placeholder"], "planned asset resolves to placeholder")
	var unknown := r.resolve("does_not_exist")
	eq(unknown["status"], "unknown", "unknown asset status")
	check(unknown["placeholder"], "unknown asset is placeholder in dev")


func test_safe_area_insets_account_for_letterbox() -> void:
	# 1080x2340 phone (9:19.5) with 100px notch and 60px home indicator.
	var ins := SafeArea.insets_for(Vector2(1080, 2340), Rect2(0, 100, 1080, 2180))
	# scale 1.5, letterbox offset (2340-1920)/2 = 210 -> notch inside the bar.
	near(ins["top"], 0.0, 0.01, "notch fits inside letterbox")
	near(ins["bottom"], 0.0, 0.01, "home bar fits inside letterbox")
	var ins2 := SafeArea.insets_for(Vector2(720, 1280), Rect2(0, 48, 720, 1192))
	near(ins2["top"], 48.0, 0.01, "exact 9:16 top inset")
	near(ins2["bottom"], 40.0, 0.01, "exact 9:16 bottom inset")

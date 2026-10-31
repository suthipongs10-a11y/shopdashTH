extends TestCase


func test_catalog_loads_and_counts_match() -> void:
	var c := Catalog.load_from()
	check(c.is_valid(), "catalog valid: %s" % ", ".join(c.errors))
	for group in Catalog.EXPECTED_COUNTS:
		eq(c.raw[group].size(), Catalog.EXPECTED_COUNTS[group], "count %s" % group)
	eq(c.campaign_star_slots(), 144, "campaign star slots")


func test_m1_definitions_compile_with_catalog_values() -> void:
	var c := Catalog.load_from()
	var h := c.hull("H01")
	eq(h.base_speed, 360.0, "SPARROW base speed")
	eq(h.mass_cap, 28.0, "SPARROW mass cap")
	eq(h.starter_loadout.size(), 2, "starter loadout size")
	var w22 := c.weapon("W022")
	eq(w22.salvage_source, "B02", "W022 source boss")
	eq(w22.attack_model, "curved_plasma", "W022 attack model")
	eq(c.weapon("W008").footprint.size(), 2, "W008 footprint")


func test_starter_loadout_is_legal_and_sustainable() -> void:
	var c := Catalog.load_from()
	var a := Assembly.from_starter(c.hull("H01"), c)
	eq(a.items.size(), 2, "both starter weapons fitted")
	check(a.fitted_mass() <= a.hull.mass_cap, "under mass cap")
	var s := WeaponScheduler.new()
	for it in a.items:
		s.add_mount(it["weapon"], Vector2.ZERO)
	check(s.energy_per_sec() <= a.hull.energy_regen * 0.8, "sustained draw <= 80% regen")


func test_broken_references_are_reported() -> void:
	var c := Catalog.load_from()
	var raw: Dictionary = c.raw.duplicate(true)
	raw["bosses"][1]["signature_weapon_id"] = "W999"
	raw["missions"][0]["hazard_id"] = "HZ99"
	raw["weapons"][1]["id"] = raw["weapons"][0]["id"]
	var path := "user://test_broken_catalog.json"
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(JSON.stringify(raw))
	f.close()
	var broken := Catalog.load_from(path)
	check(not broken.is_valid(), "broken catalog rejected")
	var joined := "\n".join(broken.errors)
	check(joined.contains("duplicate"), "duplicate id reported")
	DirAccess.remove_absolute(path)


func test_illegal_fit_returns_error_and_keeps_layout() -> void:
	var c := Catalog.load_from()
	var a := Assembly.from_starter(c.hull("H01"), c)
	eq(a.place(c.weapon("W001"), Vector2i(2, 4)), "fit.error.overlap", "overlap rejected")
	eq(a.place(c.weapon("W001"), Vector2i(0, 0)), "fit.error.off_mask", "off-mask rejected")
	eq(a.items.size(), 2, "existing modules untouched")

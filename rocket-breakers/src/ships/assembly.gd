## Fitted ship layout on the 7×7 attachment grid. M0 covers placement legality,
## mass and geometry; structural support tree and power bus arrive with M1 fitting.
class_name Assembly
extends RefCounted

const HULL_VISUAL_HALF_WIDTH := 29.0  # SPARROW visible width ~58 (SYSTEMS §1)

var hull: Defs.HullDef
var items: Array[Dictionary] = []  # {weapon: WeaponDef, origin: Vector2i, cells: Array[Vector2i]}
var occupied := {}  # Vector2i -> weapon id


static func from_starter(h: Defs.HullDef, catalog: Catalog) -> Assembly:
	var a := Assembly.new()
	a.hull = h
	for entry in h.starter_loadout:
		var err := a.place(catalog.weapon(entry["weapon_id"]), entry["grid_origin"])
		if not err.is_empty():
			push_error("starter loadout %s: %s" % [h.id, err])
	return a


## Returns "" on success or a localisation-ready error key.
func place(w: Defs.WeaponDef, origin: Vector2i) -> String:
	if w == null:
		return "fit.error.unknown_module"
	var cells: Array[Vector2i] = []
	for p in w.footprint:
		var c := origin + p
		if not hull.socket_mask.has(c):
			return "fit.error.off_mask"
		if occupied.has(c):
			return "fit.error.overlap"
		cells.append(c)
	if fitted_mass() + w.mass > hull.mass_cap:
		return "fit.error.over_mass"
	for c in cells:
		occupied[c] = w.id
	items.append({"weapon": w, "origin": origin, "cells": cells})
	return ""


func fitted_mass() -> float:
	var m := 0.0
	for it in items:
		m += (it["weapon"] as Defs.WeaponDef).mass
	return m


func half_width() -> float:
	var hw := HULL_VISUAL_HALF_WIDTH
	for c in occupied:
		hw = maxf(hw, absf(Defs.cell_to_local(c).x) + Defs.TILE_PX * 0.5)
	return minf(hw, PlayerMotion.MAX_HALF_WIDTH)


## Muzzle sits on the nose-side edge of the weapon's frontmost cell.
func muzzle_local(it: Dictionary) -> Vector2:
	var w: Defs.WeaponDef = it["weapon"]
	var cell: Vector2i = it["origin"] + w.muzzle_cell_offset()
	return Defs.cell_to_local(cell) + Vector2(0, -Defs.TILE_PX * 0.5)

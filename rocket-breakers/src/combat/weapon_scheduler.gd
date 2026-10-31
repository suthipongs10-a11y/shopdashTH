## Shared reactor energy + per-module heat and fire cadence (SYSTEMS §3).
## Blocked or under-powered guns never spend energy or heat.
class_name WeaponScheduler
extends RefCounted

const HEAT_MAX := 100.0
const HEAT_UNLOCK := 55.0
const HEAT_MIN_LOCK_SEC := 0.8
const COOL_IDLE := 18.0
const COOL_FIRING := 10.0
const OD_FIRE_RATE := 1.5
const OD_ENERGY_REGEN := 2.0
const OD_HEAT := 0.75


class Mount:
	var weapon: Defs.WeaponDef
	var local_muzzle: Vector2
	var cooldown := 0.0
	var heat := 0.0
	var locked := false
	var lock_time := 0.0
	var blocked := false


var mounts: Array[Mount] = []
var energy := 100.0
var energy_capacity := 100.0
var energy_regen := 14.0


func add_mount(weapon: Defs.WeaponDef, local_muzzle: Vector2) -> Mount:
	var m := Mount.new()
	m.weapon = weapon
	m.local_muzzle = local_muzzle
	mounts.append(m)
	return m


## Mounts are processed in list order, so earlier (primary) guns get power first
## and later guns stagger when the reactor runs low.
func tick(dt: float, fire_held: bool, overdrive: bool) -> Array[Mount]:
	var fired: Array[Mount] = []
	for m in mounts:
		var firing_now := fire_held and not m.locked and not m.blocked
		m.cooldown -= dt
		if firing_now and m.cooldown <= 0.0:
			var interval := 1.0 / (m.weapon.trigger_rate * (OD_FIRE_RATE if overdrive else 1.0))
			if energy >= m.weapon.energy_per_trigger:
				energy -= m.weapon.energy_per_trigger
				m.heat += m.weapon.heat_per_trigger * (OD_HEAT if overdrive else 1.0)
				m.cooldown += interval
				fired.append(m)
				if m.heat >= HEAT_MAX:
					m.heat = HEAT_MAX
					m.locked = true
					m.lock_time = 0.0
			else:
				m.cooldown = 0.0
		if not firing_now:
			m.cooldown = maxf(m.cooldown, 0.0)
		m.heat = maxf(m.heat - (COOL_FIRING if firing_now else COOL_IDLE) * dt, 0.0)
		if m.locked:
			m.lock_time += dt
			if m.heat <= HEAT_UNLOCK and m.lock_time >= HEAT_MIN_LOCK_SEC:
				m.locked = false
	energy = minf(energy + energy_regen * (OD_ENERGY_REGEN if overdrive else 1.0) * dt, energy_capacity)
	return fired


## Sustained energy draw at base fire rate (catalog: trigger_rate × energy_per_trigger).
func energy_per_sec() -> float:
	var total := 0.0
	for m in mounts:
		total += m.weapon.trigger_rate * m.weapon.energy_per_trigger
	return total

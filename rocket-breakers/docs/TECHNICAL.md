# Implementation contracts

## Architecture

Pin one Godot 4 stable version after checking current official export support. GDScript typed; do not require experimental 3D features. Desktop/mobile native first; Web export is a separately tested target, not an automatic promise. 2D sprite rendering with layered parallax and GPU particles. Use a deterministic fixed-step simulation clock but do not claim bit-identical replays across architectures until tested. RNG seeds and state hashes support debugging; lockstep networking is out of scope.

Domain modules: `RunController`, `CombatWorld`, `AssemblyGraph`, `WeaponScheduler`, `ProjectileSystem`, `PartDamageResolver`, `SalvageController`, `TargetLockController`, `MissionDirector`, `ObjectiveTracker`, `ProgressionService`, `SaveRepository`, `AudioBus`, `FxPool`, `AssetResolver`, `LocalizationService`.

No domain module mutates another's persistence directly. Emit typed events with event_id, run_id, tick, source_id, target_id and payload version. Main order per tick: input → mission spawn → movement → weapons → projectile movement/swept collision → damage resolution → part transitions → pickups/tow → objectives → queued visual/audio events. A dead entity cannot also fire in the same post-damage tick. Resolve ties by stable entity IDs.

Use data-driven attack primitives: straight burst, fan, spiral, aimed volley, delayed mine, bounded homing, segmented beam, telegraphed sweep, chain arc, orbit drone, gravity field, contact tool. Boss behavior composes these with authored phases; no 16-way copy/paste script. Individual weapon special_params define distinct use of primitives.

Simulation uses kinematic bodies/areas or central broadphase with swept-circle/polygon tests for fast bullets. Uniform spatial grid for broadphase; collision broadphase limits checked candidates, not correctness. Never use current-frame position-only collision for rail shots. Pool bullets, debris, impact sprites, floating labels and audio voices; don't allocate/instantiate every frame.

## Data and IDs

`catalog.json` is specification schema 1 with definitions, not runtime save data. Importer validates every ID/reference and compiles engine Resources. Never rename an ID because its display name changes. All display text is localization-keyed; source catalog contains Thai/English names to seed dictionaries. Prices/damage and runtime state are separate. Schema changes have migration notes and tests.

Minimal WeaponDef: id, names, source, family, damage, trigger_rate, projectiles_per_trigger, energy_per_trigger, heat_per_trigger, mass, footprint cells, rotation_allowed, firing_arc_deg, attack_model, special_params, salvage_source, asset_id. AbilityDef: id, behavior, cooldown, duration, unlock_source. BossDef: id, sector_id, role, core_hp, armor, signature_weapon_id, ability_unlock_id nullable, expose_trigger, stolen_behavior, compensation_phase, phase_patterns, signature_module_integrity, joint_hp. MissionDef: id, sector_id, encounter_id nullable, unlock_prev, duration_target_sec, waves, star_objectives[3], rewards, hazard_id.

AssetResolver maps logical asset_id to manifest row and import Resource path, returns labeled placeholder only in development if missing. Release validation fails on missing required assets. Asset manifest may cover multiple frames via a frame_count row; importer checks actual count/registration. Never parse file names to infer damage or gameplay.

Save schema example:

```json
{"schema_version":1,"profile_id":"uuid","content_version":"1.0","settings":{},"mission_records":{"P01-01":{"stars":[true,false,true],"best_score":500,"difficulty_records":{}}},"unlocked_hulls":["H01"],"blueprint_fragments":{"W022":1},"weapon_research":{},"credits":500,"scrap":30,"loadouts":[],"active_run":null,"applied_settlements":[],"pending_settlement":null}
```

Full Save migration must preserve unknown archived content keys; retired IDs become tombstones with conversion rules, never silently vanish. Import validation checks bounds, referenced items and schema. Reject unsupported future saves without replacing current valid save. Atomic write tmp → sync → rename; keep previous two valid snapshots. Checksum helps detect corruption, not malicious edits. Autosave interval outside combat 15 sec plus transactions; in combat checkpoint at safe wave/dock boundaries with complete RNG, item ownership and objective state. On app background pause simulation and persist a checkpoint if safe; on restore show paused overlay.

## Budgets and profiling

Target reference phone class: Android with 4 GB RAM and midrange GPU; select and record actual tested device models during development. Target 60 FPS native, low mode30; do not assert performance without profiling. Frame budgets target sim ≤4ms, rendering ≤10ms at60. On representative hardware report p50/p95/p99 frame time over 5 minute stress run.

Default caps: hostile bullets600, player bullets300, active enemies60, visible boss segments16, gameplay loot24, debris100, floating text32, audio voices24, full-screen post passes2. These are design budgets, not gameplay truncation permissions. If bullets would exceed cap, schedule fewer volleys before spawn and retain announced patterns. Never silently erase already dangerous bullets. Visual-only particles scale independently; gameplay spawn/collisions identical at low/high presets.

Texture budget target ≤180 MiB resident mobile, total memory≤450 MiB provisional. Regional background chunks max1024² runtime tiles where feasible; atlas2048² with 2–4px extrusion, no mip bleed, platform compression selected after visual tests. Do not ship all sectors preloaded; async loading screens between destinations. Portrait logical720×1280, interpolate render scale0.75..1.5; test 9:16, 9:19.5, tablet letterbox and safe areas. UI anchors account for notches/home indicator. No stretch of gameplay coordinates changing speed/hitboxes by aspect ratio.

## Essential tests (behavior, not mirrored implementation)

1. Joint destroyed with integrity35% → intact; 34.99% → scrap; no duplicate on simultaneous core death/sever.
2. Stolen gun removal cancels its future boss attacks; compensation starts once even with HP phase crossing same tick.
3. Same part detached/fitted/dropped/reclaimed gives at most one research fragment and one XP reward.
4. Collision of one bullet with overlapping core/module applies one damage transaction.
5. Tow snap/reacquire doesn't reset lifetime/invulnerability; no double-owner instance after resume.
6. Invalid footprint, disconnected support, over-mass, blocked muzzle and unavailable blueprint yield actionable errors and no lost modules.
7. Mission stars earned on different successful runs merge; total144, difficulty never increases it; side stars on defeat not granted.
8. Progress route with one clear-star per mission reaches all sectors.
9. Settlement crash injected before/after each persistence step gives same final balance exactly once.
10. Old save migration, corruption backup restore, future-save reject and export/import round trip preserve progress.
11. Seeded choices resume unchanged; incompatible upgrades absent; fusion rollback/run-end cleanup preserves permanent inventory.
12. No reachable pattern requires damage on starter hull: authored pattern tests sample spawn geometry, and human playtest verifies actual routes.
13. Gameplay object states match at graphics low/high for identical input/seed; frame-rate changes do not alter projectile speed or cooldown.
14. Pausing/background/resume does not advance boss, cargo timer or fabricate free cooldown.
15. Controller/touch UI consumes input correctly; buttons do not move ship.

Use engine-native unit/integration harness appropriate to pinned version. Document how to run headless data validation and domain tests. Do not write screenshot-only tests that claim to verify salvage physics. Manual test evidence is required for touch feel, telegraph readability, audio and performance.

## Security, releases and optional services

Offline first, no secrets in client. Remote config/update adapter disabled until separately authorized. No personal data or telemetry enabled by default. Export local playtest metrics only on explicit user action. Optional future online leaderboards need server-side verification and privacy design, not a checksum pretending to be security.

Release gates: all data links resolve, no runtime errors, migration passes, crash recovery verified, language text doesn't overflow, asset/license ledger complete, touch and native input tested. Separate changelog records balance changes; content and save schema versions are distinct. Keep tooling and runtime dependencies pinned with license inventory. Mobile signing/store uploads need owner account workflow; do not claim store readiness from a desktop build.

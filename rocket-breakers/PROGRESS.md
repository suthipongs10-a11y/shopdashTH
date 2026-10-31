# Progress

Status: **M0 foundation implemented — exit gate partially met** (no native export build yet).

## Done (2026-10-31)
- Handoff ZIP 01–06 merged; `python3 tools/validate_bundle.py` → PASS (8/48/144/12/36/12/12/16/24/8/8, 386 manifest rows, 4 concept checksums).
- Godot 4.7.2 stable project (`project.godot`), portrait 720×1280 logical, letterbox + safe-area insets.
- Catalog importer/validator in GDScript (counts, IDs, cross-references, starter-loadout legality) → typed `HullDef`/`WeaponDef`.
- Localisation: th/en Translations from `data/i18n/ui.json` + catalog names; live language switch persisted in save.
- Asset resolver over `art/asset_manifest.csv`; everything resolves to labelled placeholder until `integrated`.
- Flight sandbox: SYSTEMS §1 movement (accel/decel, effective-speed formula, assembly-width clamp), dash, Overdrive, shared reactor energy + per-module heat lock, W001 straight shots (pooled, swept collision), W008 pulse beam (ray), training targets, sparks, parallax stars.
- Input: keyboard/gamepad bindings registered in code; relative touch drag; multi-touch HUD buttons that never move the ship; pause overlay; app-background pause.
- Save repository: atomic tmp→rename, two rotating valid backups, checksum, corrupt-copy preservation, future-schema write block, schema-0 migration, export/import.

## Verification
- `godot --headless --path . -s res://tests/run_tests.gd` → **31 tests, 31 passed** (catalog, localisation, assets, safe area, motion, dash, fire rate, energy/heat, determinism at 30/60/144 Hz + jitter, swept collision, save recovery/migration/future/import, touch routing, pause).
- Runner fails any test that logs an engine/script error (verified with a deliberate crash probe).
- Headless boot of `main.tscn` for 300 frames: no errors. Xvfb screenshots of title / sandbox / pause (TH+EN) rendered with the compatibility renderer; title shows "save loaded" on second launch.

## Known issues / not done
- **No native development export yet** (M0 exit item): export templates not installed in the cloud container. Run from the editor for now.
- Not tested on a real phone or with real touch hardware; desktop frame-rate measured only under Xvfb software GL.
- Starter guns heat-lock after ~17–20 s continuous fire with current SYSTEMS values (see DECISIONS).
- Fusion names lack Thai in catalog.
- All visuals are coded placeholders; no audio.
- Current milestone: M0 → M1.

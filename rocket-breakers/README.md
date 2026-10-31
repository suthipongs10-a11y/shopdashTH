# ROCKET BREAKERS — development build

Engine: **Godot 4.7.2 stable** (standard build, not .NET). Project root = this folder.
Design spec: `AGENTS.md` (+ `docs/`). Status: `PROGRESS.md`, next steps: `NEXT_ACTIONS.md`.

## วิธีเปิดเล่น (Windows / Mac / Linux)

1. ดาวน์โหลด Godot 4.7.2 stable จาก https://godotengine.org/download/archive/
2. เปิด Godot → Import → เลือกไฟล์ `rocket-breakers/project.godot`
3. กด ▶ (F5) — หน้าแรก → "สนามทดสอบการบิน"

Controls: WASD/arrows fly · Space dash · R Overdrive · Esc pause · mouse drag = touch drag
(relative). Guns auto-fire. Gamepad: left stick / A dash / Y Overdrive / Start pause.

## Headless checks (CI-friendly)

```bash
python3 tools/validate_bundle.py                      # design data integrity
godot --headless --path . --import                    # once after adding class_name scripts
godot --headless --path . -s res://tests/run_tests.gd # behaviour tests, exit 0 = pass
```

Optional screenshots (needs Xvfb; dev only, not gameplay evidence):

```bash
xvfb-run -a -s "-screen 0 720x1280x24" godot --path . --rendering-method gl_compatibility \
  --rendering-driver opengl3 -s res://dev/capture.gd -- /path/to/out
```

## Layout

| Path | Purpose |
|---|---|
| `src/core` | catalog importer/validator, typed defs, localisation, asset resolver, fixed-step clock, input bindings |
| `src/ships` | player movement/dash, attachment-grid assembly |
| `src/combat` | weapon scheduler (energy/heat), pooled projectiles, sandbox world |
| `src/save` | profile repository (atomic write, backups, checksum, migrations) |
| `src/ui`, `src/app` | screens, HUD, theme; `main.tscn` boot scene |
| `data/` | `catalog.json` (source of truth), `i18n/ui.json` |
| `assets/fonts` | Noto Sans Thai (OFL) |
| `art/` | concepts, manifest, ChatGPT request batches (`.gdignore`: not imported) |
| `tests/` | headless tests; `dev/` dev-only tools |

Saves live in Godot's `user://saves/` (Windows: `%APPDATA%\Godot\app_userdata\ROCKET BREAKERS`).

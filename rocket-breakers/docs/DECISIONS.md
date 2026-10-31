# Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-31 | Godot4 / typed GDScript /2D rendered sprites | Native-first mobile game with portable engine-neutral data |
| 2026-10-31 | Offline single player v1 | Prove salvage action before server/multiplayer scope |
| 2026-10-31 | 8 sectors ×6 missions ×3 stars | Fixed auditable campaign scope |
| 2026-10-31 | ChatGPT raster art, Claude implementation | Explicit owner workflow; no assumed automatic image bridge |
| 2026-10-31 | One fragment per encounter signature/attempt, fallback first clear | Avoid duplication and precision progression softlocks |

Append implementation decisions with consequences and whether baseline documentation/catalog changed. Do not silently contradict a core rule.
| 2026-10-31 | Pin Godot 4.7.2 stable (latest on godotengine.org at project creation), standard build | Official mirror download; SHA512-SUMS unreachable from the cloud container (GitHub blocked) — zip sha256 `cadd3204…5e35`; re-verify on owner machine. Baseline unchanged |
| 2026-10-31 | Godot project root = `rocket-breakers/`; `art/`, `docs/`, `tools/` carry `.gdignore` | `res://data/catalog.json` stays the single source of truth; concept boards are not imported as game textures |
| 2026-10-31 | Renderer `mobile`; stretch `canvas_items` + aspect `keep` (letterbox) | Gameplay coordinates never stretch with aspect; safe-area insets converted to logical px. Taller-phone extra space is unused for now — revisit in M6 |
| 2026-10-31 | Fixed 60 Hz sim driven by integer fixed-point accumulator in `_process`, max 8 ticks/frame (excess dropped) | Identical state hash at 30/60/144 Hz and jitter (tested); rendering interpolates prev→current |
| 2026-10-31 | Dash burst speed = 2.2 × base speed (≈200 px over 0.25 s) | SYSTEMS/AGENTS give duration/invuln/cooldown but no speed. Tuning value; catalog unchanged |
| 2026-10-31 | Touch routed by HUD hit-test, not Godot Buttons, during combat | Mouse emulation only follows the first finger; hit-test lets a second finger dash while the first drags and guarantees buttons never move the ship |
| 2026-10-31 | Save file = `RBSAVE <sha256>` header line + JSON payload; schema 0 defined as pre-release profile without settlement journal | Checksum over exact payload text (JSON number types change on parse). Migration framework exercised by tests |
| 2026-10-31 | Catalog gap: 8 fusion `name` fields are English-only strings | Seeded into both locales and listed as `needs_translation`; owner/catalog should add Thai names. Catalog unchanged |
| 2026-10-31 | UI font Noto Sans Thai (OFL-1.1) from `@fontsource/noto-sans-thai@5.1.1` | Godot's built-in font has no Thai glyphs |
| 2026-10-31 | Observation, not changed: starter guns heat-lock after ~17 s (W001) / ~20 s (W008) continuous fire | SYSTEMS cooling 10/s while firing < heat generated (16/s, 15/s). Flag for M1 playtest |

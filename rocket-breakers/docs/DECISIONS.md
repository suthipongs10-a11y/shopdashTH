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
| 2026-10-31 | **Supersedes the Godot rows above: engine = TypeScript + Vite + Canvas 2D web build** | Owner cannot use Godot and wants a game they can open directly. Web runs on any phone/PC browser with no install, is testable in the cloud container (Vitest + Chromium) and ships as one HTML file. Migration cost: the M0 GDScript (~1 day) was rewritten; formulas/contracts unchanged. Android later via a web wrapper (e.g. Capacitor) — needs its own compatibility gate. Deviation from AGENTS §14 "reuse a maintained engine": collision is our own swept-circle/rect code (deterministic, tested); rendering uses the browser canvas. |
| 2026-10-31 | Fixed 60 Hz sim with integer fixed-point accumulator (max 8 ticks/frame); world state hash identical at 30/60/144 Hz + jitter (tested) | Carried over from M0 |
| 2026-10-31 | Saves in localStorage: `RBSAVE <crc32>` header + JSON; tmp key → verify → rotate two valid backups → main; corrupt copies kept as `.corrupt` | Browser storage has no atomic rename; per-key writes are atomic and verified. CRC32 detects corruption only (not anti-cheat) |
| 2026-10-31 | Player module integrity = 40 per module | Not in catalog. Module hits pass 25% to core per SYSTEMS |
| 2026-10-31 | B02 tail-sweep beam = 8 damage per 0.1 s tick; boss bullets 8–10; contact 20 per 0.6 s | Catalog has no per-attack boss damage; tuning values |
| 2026-10-31 | B02 tail module modelled as a 3-circle chain; joint exposed only while venting (tail lifts behind the body), closed armour plate otherwise | Makes "shoot the joint, not the body" readable and fair from below |
| 2026-10-31 | After the signature is removed, B02 calls 3 scouts and runs a calmer aimed-volley "lull" until they are cleared and the part is docked/lost | Provides the "cleared micro-wave → safe dock" moment inside a boss fight |
| 2026-10-31 | `lateral_charge` implemented as the generic warned_charge toward the player's position (1 s lane stripe, 600 px/s × 0.45 s) | Catalog name only; horizontal-only charge could not threaten the player |
| 2026-10-31 | Scrap from kills drops as collectible motes (unbanked until settlement) | Gives PU07 Magnet a purpose (expansion 1.1) |
| 2026-10-31 | Power-ups implemented: PU01/02/05/06/07/08/09/12 + drop accumulator + authored early/rescue drops with time fallbacks. PU03/04/10/11 pending (need support emitters / fusion) | Expansion step 1–2 order |
| 2026-10-31 | Expansion VFX used as code-animated static cards from premultiplied-alpha 256 px copies in `assets/fx/`; originals untouched in `expansion_01/art/` | Spec: static keyframes, not flipbooks; status stays generated_unchecked |
| 2026-10-31 | Artifact viewer constraints: no `confirm()` (two-tap confirm instead), no downloads (save export as copyable text) | Host sandbox rules |
| 2026-10-31 | Player body radius 26 px for ship-vs-enemy contact (separate from the 12 px core hurtbox); moves into gaps narrower than the ship are refused | Owner saw the ship sitting on the boss; SYSTEMS §1 requires separation + 20 dmg / 0.6 s |
| 2026-10-31 | Tutorial callouts pause the sim and repeat every run until the first successful B02 steal | Owner found stealing/fitting confusing; pausing keeps the 2.5 s joint window fair while reading |
| 2026-10-31 | Art requests generated from data by `tools/build_art_pack.py` (394 assets / 41 batches, ≤12 per batch, priority order) | One reproducible pack instead of hand-written batches drifting from the catalog |
| 2026-10-31 | B02 drawn nose-up as delivered (BATCH_001); colliders re-laid to the art: core (0,-22) r58, pincers (±112,-112), legs (±128,12), rear legs (±104,92); tail joint at the rear socket (0,62); tail rotates 80° (hanging in front of the joint) ↔ -100° (curled over the back = vent) | Makes the art and the rules agree: the joint is visibly the tail socket, covered by the hanging tail normally and open toward the player only while venting. Supersedes the earlier side-joint layout |
| 2026-10-31 | Delivered art imported with `tools/import_art_batch.py`: originals in `art/source/<batch>/`, runtime WebP + sidecar JSON in `assets/sprites/`, manifest status → integrated | Non-generative crop/downscale only (ART_BIBLE); keeps provenance |

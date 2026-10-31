# BATCH_003 — import QA (Claude)

Delivered by ChatGPT via owner as RB_BATCH_003_PART_01..03. Originals kept unmodified here.

| Asset | Result | Notes |
|---|---|---|
| enemy_E01 Scrap Scout | integrated | Drawn rotated 180° (flies toward the player); collider radius 20 to match |
| enemy_E03 Shield Barge | integrated | Colliders re-sized to the art: core 84×68, front shield plate, rear-side joint |
| hull_H01_lean_left / lean_right | integrated | Same crop as hull_H01 → swap in place when moving sideways |
| hull_H01_damage_overlay | integrated | Same crop as hull_H01; fades in below 75% hull |
| boss_B02_damage_overlay | integrated | Same crop as boss_B02_core; fades in below 85% boss HP |
| enemy_E02 Needle Interceptor | approved | Not in SLICE-01 yet (M2) |
| enemy_E04 Fuel Hauler | approved | Not in SLICE-01 yet (M2) |
| utility_T001 Patch Plating | approved | Utilities are not fitted in the slice yet |
| utility_T006 Tow Winch | approved | Utilities are not fitted in the slice yet |

Checks: SHA-256 of all 10 match the delivery manifest; real alpha on dark/white/checker; overlay registration
tested by compositing the damage layers over the BATCH_001 hull/boss originals and ghosting the lean frames over
the neutral hull (all aligned). A few faint (alpha 7–16) edge pixels of lean_right / hull damage fall outside the
shared crop and are trimmed — not visible. Verified in Chromium, no console errors.

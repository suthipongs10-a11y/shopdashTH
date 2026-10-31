# BATCH_001 — import QA (Claude)

Delivered by ChatGPT via owner as RB_BATCH_001_PART_01..03. Originals kept unmodified in this folder.

| Asset | Result | Notes |
|---|---|---|
| hull_H01 | integrated | Bare hull, nose up, real alpha. Shown 100 px wide in game. |
| hull_H01_engine_glow | integrated | Registered to the hull via a shared crop; drawn additive, sits on the nozzles. |
| weapon_W001 | integrated | Compact single-cell turret; fitted to its 1-cell footprint. |
| weapon_W008 | integrated | Slim 2-cell pod. |
| weapon_W022 | integrated | Player version of the tail (cyan ownership light) — matches the boss tail identity. |
| boss_B02_core | integrated | Drawn nose-up as delivered. Gameplay colliders re-laid to the art (core, pincers, legs, rear legs); tail joint moved to the art's rear socket. |
| boss_B02_joint | integrated | Shown at the socket while the joint is open (vent), with the broken-ring icon on top. |
| boss_B02_armor | integrated | Shown over the socket while the joint is closed, with the closed-shield icon. |
| boss_B02_signature_mount | integrated | Rotates about the socket: hangs in front of the joint, curls over the back to vent. Also used for the loose/towed tail. |
| fx_tractor_mote | integrated | Additive motes travelling along the tow cable. |

Checks: SHA-256 of all 10 files match `delivery_manifest.json`; alpha verified on dark/white/checker; low-alpha
edge noise (alpha ≤ 6) removed in runtime copies; delivered canvas 1254² (requested 512²/1024²) handled by
cropping + premultiplied downscale (`tools/import_art_batch.py`). Sidecars with pivots/anchors in `assets/sprites/*.json`.
Collider alignment reviewed with an overlay in Chromium (e2e/capture-art.mjs).

Known limits: lean_left/right and damage overlay for H01 come in BATCH_003; the boss tail is one rigid piece
(no per-segment animation); the stolen-tail plasma projectile still uses the expansion fx_plasma texture.

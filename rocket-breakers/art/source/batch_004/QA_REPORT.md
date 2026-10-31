# BATCH_004 — import QA (Claude)

Delivered as RB_BATCH_004_PART_01..06 (keyframe option allowed by the request). Originals kept unmodified here.

| Asset | Result | Notes |
|---|---|---|
| bg_P01_far | integrated | Opaque. Delivered top/bottom rows did not match (MAE 0.48); the runtime copy is made vertically tileable by cross-fading an 8% band (non-generative). Seam checked by stacking two tiles — invisible. |
| bg_P01_mid | integrated | Transparent top/bottom; wrecks on the left/right edges; scrolls at 26 px/s |
| bg_P01_foreground | integrated | Transparent top/bottom; drawn at 80% opacity behind actors; scrolls at 52 px/s |
| fx_explosion_small | integrated (keyframes 000/006/011 of 12) | Cross-faded over 0.45 s with scale; smoke kept (normal blend) |
| fx_impact_spark | integrated (000/004/007 of 8) | Bullet hits; max 14 concurrent |
| fx_joint_break | integrated (000/004/007 of 8) | Joint/armour breaks |
| fx_detach_burst | integrated (000/004/007 of 8) | Signature sever |
| fx_shield_hit | integrated (000/004/007 of 8) | Delivered later in PART_06; checksums match. Plays on shield hits (max 4 concurrent). |

Checks: SHA-256 of all 18 delivered files match the manifest; real alpha on mid/foreground/effects; each effect's
keyframes share one crop so the pivot stays fixed. Missing in-between frames (29) are not faked — playback is a
cross-fade between delivered keyframes. Hostile bullets render above all background layers; verified in Chromium,
no console errors.

# BATCH_010 QA — Boss parts B01 Rivet Crab + B03 (10/10 delivered in 4 parts)

All SHA-256 match the delivery manifests; real alpha checked on dark and checker; nothing clipped (edge alpha ≤ 1).

| Asset | Runtime | Notes |
|---|---|---|
| boss_B01_core | 760×681 | crab, front-left socket for the grabbing claw (guide: socket ≈ (375,444) of 1254, Ø≈145) |
| boss_B01_damage_overlay | 760×681 | same canvas as core; alpha clipped to the core silhouette at import (was 2.6% outside the body) |
| boss_B01_armor | 134×180 | plate, pivot = joint centre |
| boss_B01_joint | 160×160 | glowing ring |
| boss_B01_signature_mount | 261×420 | detached grabbing claw (W021), socket end at the bottom |
| boss_B03_core | 662×760 | tracked hull, top socket for the ram head (guide ≈ (628,230), Ø≈190) |
| boss_B03_damage_overlay | 662×760 | clipped to core silhouette (0% outside) |
| boss_B03_armor / joint / signature_mount | 176×180 / 153×160 / 339×420 | ram head with flame nozzles |

Status: **approved** (not used until P01-03 / P02 bosses are built). Socket landmarks from the delivery's
`assembly_guide.json` are visual estimates; final positions get set against colliders in the browser when each
boss is implemented.

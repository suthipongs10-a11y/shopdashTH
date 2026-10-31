# BATCH_005 — import QA (Claude)

Delivered as RB_BATCH_005_PART_01..03 (12 HUD icons). Originals kept unmodified here. The delivery manifest was a
bare list without asset ids; ids were derived from the requested file names (importer updated).

| Asset | Used for |
|---|---|
| ui_dash | Dash button |
| ui_overdrive | Overdrive button + Overdrive bar |
| ui_tractor | Tractor button (switches to ui_cargo while towing = release) |
| ui_lock_joint | Boss joint status when open / opening soon (broken ring = weak point) |
| ui_locked_armor | Shield bar + joint status when closed (closed shield = armour) |
| ui_heat | Per-weapon heat bars |
| ui_energy | Energy bar |
| ui_cargo | Tractor button while towing, dock "stow in hold" button |
| ui_repair | Hull bar |
| ui_pause | Pause button |
| ui_play | Start mission, Resume |
| ui_settings | Settings buttons |

Checks: SHA-256 of all 12 match; real alpha on dark/white/checker; 32 px readability reviewed (cargo and
overdrive lose fine detail but keep their silhouettes). Cropped + premultiplied downscale to 128 px WebP.
Verified in Chromium (HUD, title, pause), no console errors. All 12 integrated.

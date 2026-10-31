# BATCH_006 QA — Menu icons (10/10 delivered in 3 parts)

Delivery: RB_BATCH_006_PART_01..03 (parts merged; per-part generation records kept as `p0N_*.json`).

| Asset | SHA-256 vs manifest | Alpha (dark/white/checker) | Edge clear | Runtime | Status |
|---|---|---|---|---|---|
| ui_star_full | match | clean | yes | 128×118 | integrated (map pips, briefing/results stars, title) |
| ui_star_empty | match | clean, hollow centre | yes | 128×118 | integrated (map pips, results "missed") |
| ui_credits | match | clean | yes | 128×125 | integrated (title, results) |
| ui_scrap | match | clean | yes | 128×110 | integrated (title, results) |
| ui_blueprint | match | clean | yes | 124×128 | integrated (blueprint fragment rows) |
| ui_galaxy | match | clean | yes | 128×91 | integrated (campaign button, sector map title) |
| ui_hangar | match | clean | yes (1 px alpha ≤1) | 128×105 | approved — hangar screen not built yet |
| ui_codex | match | clean | yes | 128×91 | approved — codex not built yet |
| ui_fusion_core | match | clean | yes | 127×128 | approved — fusion not built yet |
| ui_extraction | match | clean | yes | 128×128 | approved — expedition extraction not built yet |

Sources are 1254×1254 (requested 512×512); downscaled premultiplied to 128 px max (non-generative crop/resize only).
Verified in Chromium at 412×915 @2x: title, briefing, results, sector map — readable at 26–40 px, no console errors.

# Progress

Status: **M2 stage 1 — campaign map + P01-01 and P01-06 playable** (web build) + expansion 1.1 power-ups (8 of 12).
Play: https://claude.ai/artifact/KhZtTSBTb3Zq8piUboUu8S (private link).

## Done (2026-10-31)
- Engine switched from Godot to TypeScript/Vite/Canvas (owner request; see DECISIONS). Godot M0 code removed.
- M0 parity: catalog validator, th/en i18n, asset resolver, fixed 60 Hz clock, movement/dash, energy/heat scheduler,
  swept projectiles, multi-touch HUD routing, pause/background pause, crash-safe saves with export/import.
- M1 SLICE-01: E01 scouts, E03 shield barge (front shield, rear joint), B02 Scorpion Reclaimer (claw fan, tail sweep,
  tail vent, claw ring, lane charge; P1/P2/P3), separate core/armor/joint/module with collider priority, joint HP vs
  integrity, ≥35% intact detach, reckless fire scraps the tail, tractor (cone/range/dwell), spring tow cable with snap,
  cargo damage, safe dock fitting UI (grid, legal spots, before/after stats, stow/scrap), W022 curved homing plasma,
  boss permanently loses tail attacks, victory auto-secure, settlement journal (exactly-once), fragment 1/3, results.
- Expansion 1.1: PU01 Triple Shot, PU02 Laser Core, PU05 Shield/overshield, PU06 Repair, PU07 Magnet, PU08 Coolant,
  PU09 Overdrive Cell, PU12 Scrap Cache; seeded drop accumulator, 6-pickup cap with queue, authored early/rescue/low-HP
  drops, buff HUD chips, pickup text (max 2), hitstop on sever/elite break, explosion/shield/plasma VFX textures.

## Done (2026-10-31, after first owner playtest)
- Owner feedback: confusing joint shooting/fitting; ship could overlap the scorpion.
- Solid ship-vs-enemy bodies: pushed out of every part (core, claws, tail, barges, scouts), cannot squeeze through
  gaps narrower than the ship, dash cannot tunnel, 20 contact damage per 0.6 s (SYSTEMS §1).
- Salvage clarity: time-stopping tutorial callouts (joint open / tail severed / towing) with a highlight ring + arrow,
  shown each run until the first successful steal; green "stand here" firing lane under the joint; joint status
  (closed / opening soon / OPEN + seconds) on the boss bar; dock has Auto-fit, nose marker, colour legend, compact stats.
- Art: `tools/build_art_pack.py` generates the full ChatGPT request pack — 394 assets in 41 batches
  (`art/requests/chatgpt_pack/`), zipped with reference images for the owner.

## Done (2026-10-31, BATCH_001 art)
- First ChatGPT art batch integrated (10/10): SPARROW hull + engine glow, W001/W008/W022 modules, B02 core/joint/armor/
  tail, tractor mote. QA report: `art/source/batch_001/QA_REPORT.md`. Boss colliders re-laid to match the art.

## Done (2026-10-31, BATCH_002 art)
- 12 power-up icons integrated (world pickups + HUD buff chips). QA: `art/source/batch_002/QA_REPORT.md`.

## Done (2026-10-31, BATCH_003 art)
- Scout + shield barge art (colliders resized to match), SPARROW banking frames, hull and boss damage overlays.
  E02/E04/T001/T006 imported as approved (not used in the slice yet). QA: `art/source/batch_003/QA_REPORT.md`.

## Done (2026-10-31, BATCH_004 art)
- Graveyard Belt background (3 scrolling layers, far layer made tileable) and keyframe effects for explosions,
  bullet impacts, joint breaks and severs. fx_shield_hit arrived in PART_06 and is in. QA: `art/source/batch_004/QA_REPORT.md`.

## Done (2026-10-31, controls)
- Owner feedback "controls too slow": touch drag now follows the finger 1:1 with no lag (measured 262/262 px in
  Chromium), faster keyboard/gamepad response, speed ×1.4, drag-sensitivity slider in Settings.

## Done (2026-10-31, BATCH_005 art)
- 12 HUD icons in buttons, status bars, joint status and menu buttons. QA: `art/source/batch_005/QA_REPORT.md`.

## Verification
- `npm test` → **57 passed** (body contact, direct touch drag): catalog, i18n completeness (every key used in code exists in th+en), assets, movement,
  dash, fire rate/Overdrive, heat lock, fitting errors, salvage transitions, 35% vs 34.99%, sever+core-death,
  phase/sever same tick, tail attacks gone after theft, tow snap rules, dock no-loss, one-damage-per-bullet, shield,
  settlement worked examples 1–2 + defeat + crash injection, save recovery/migration/future/import/quota, determinism at
  30/60/144 Hz + jitter, power-up rules, and a **bot playthrough of the whole M1 gate** (invulnerable player).
- Chromium (Playwright, phone viewport): full run title → waves → boss → sever → tow → dock → fit → stolen plasma →
  victory → results; reload keeps 1 fragment / 800 credits / 1 clear; **0 console errors**.

## Known issues / not done
- **No human playtest yet** — feel, difficulty and touch comfort unverified; bot runs are invulnerable.
- Mission pacing is short (~40 s for a bot); spec targets 5–7 min boss missions → tune after playtests.
- Menu icons (stars, credits, scrap, blueprint, hangar, galaxy…) pending in BATCH_006.
- PU03/PU04/PU10/PU11, XP run upgrades, stars, hangar/fabrication, other 47 missions: not started (M2+).
- Hold swap UI (replace an installed module at the dock) not built; stow/scrap/fit only.
- No mid-run save/resume; Story/Veteran difficulty not implemented.
- Fusion names lack Thai in catalog.

## Done (2026-10-31, M2 stage 1)
- Campaign: sector map for P01 (6 nodes, sequential unlock, star pips), briefing (3 star objectives, enemies,
  reward), results with new / previous / missed stars, `mission_records` OR-merge, catalog-baseline rewards.
- `MissionDirector` drives missions from catalog waves (formations, entry sides, delays, encounter wave); each wave
  plays twice (mirrored second pass) — see DECISIONS.
- New enemies: E02 Needle Interceptor (aimed volley with aim line), E04 Fuel Hauler (shoot engine → intact research
  module to tow/fit; shoot tanks → fuel blast). Supply nodes for P01-01 Star B.
- Playable: P01-01 (all 3 stars earnable), P01-06 (B02 from catalog waves; Star B secure W022; Star C interrupt not yet).
  P01-02..05 shown as "coming soon".
- Tests: 72 (new: director, formations, E02/E04, stars, settlement merge, unlocks, P01-01 bot playthrough with 3 stars).
  Browser capture `e2e/capture-campaign.mjs`: map → briefing → combat → dock → results → map, no console errors.
- Fixed: results screen could open twice.

## Done (2026-10-31, BATCH_006 art)
- 10 menu icons delivered; stars/credits/scrap/blueprint/galaxy now on title, sector map, briefing and results.
  Hangar/codex/fusion core/extraction imported as approved. QA: `art/source/batch_006/QA_REPORT.md`.

## Done (2026-10-31, BATCH_007 art)
- Weapon icons (W001/W008/W022) on the HUD heat rows and the dock card; additive muzzle glows at each gun.
  QA: `art/source/batch_007/QA_REPORT.md`.

## Done (2026-10-31, BATCH_010 art)
- B01 Rivet Crab and B03 boss parts imported as approved (core, overlay clipped to body, armor, joint, signature).
  QA: `art/source/batch_010/QA_REPORT.md`.

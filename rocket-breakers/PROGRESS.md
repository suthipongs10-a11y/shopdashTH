# Progress

Status: **M2 stage 4 — P01-01, 03, 04, 05, 06 playable (P01-02 escort left)** + quick salvage (web build) + expansion 1.1 power-ups (8 of 12).
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

## Done (2026-10-31, M2 stage 2 — Rivet Crab)
- B01 Rivet Crab boss (BATCH_010 art, colliders laid to the art): claw sweep with sector warning, aimed rivets,
  side dash, mine fan; joint opens 2 s after each sweep; claw loss removes the sweep and switches to lane rivets.
- W021 Rivet Claw as a stolen weapon: catches small bullets and flings them back (cap 25), else claw strike.
- P01-03 playable: Star B secure W021, Star C avoid claw-sweep hits (new objective support).
- Tutorial callouts and hints worded per boss (tail vs claw); HUD boss name/joint cue generic.
- Auto-fit prefers clear firing lines; claw tools exempt from blocking; dock can free a hold slot.
- Tests: 77 (new: crab joint window, named-hit counting, sever → W021, claw grab, P01-03 bot run).
  Browser capture `e2e/capture-crab.mjs`, no console errors.

## Done (2026-10-31, BATCH_008 art)
- Enemies E05–E16 imported as approved (sector 2+). QA: `art/source/batch_008/QA_REPORT.md`.

## Done (2026-10-31, BATCH_009 art + M2 stage 3 — Salvage Hunt)
- Enemies E17–E24 imported (E21 integrated, others approved). QA: `art/source/batch_009/QA_REPORT.md`.
- E21 Loot Snatcher: hovers over a loose or towed part, 2 s pink tractor beam with progress ring, steals it
  (breaks the player's tow); shot down → drops the part; escapes → part dropped at the top edge (never erased).
- P01-04 playable: Star B bring home 2 intact parts, Star C no towed part destroyed. Salvage carriers = the
  mission's E04 haulers.
- Tests: 82 (new: snatch/escape/drop, steal from tow, P01-04 stars, P01-04 bot run). Capture `e2e/capture-snatcher.mjs`.

## Done (2026-10-31, owner feedback: quick salvage)
- Owner: fitting parts was too hard and not fun. New default: fly near a loose part, tap "ดึงเข้ายาน" once → it flies
  in and fits itself, usable at once; ship full → stowed; hold full → turns into armour. Old tow + dock flow kept as
  a Settings option. Tutorial/hints/how-to rewritten for the tap flow.
- Tests: 88 (new: one-tap fit, armour fallback, tap-only bot clears P01-01/03/04/06 and steals W021/W022 with no dock).
  Browser capture `e2e/capture-quick.mjs`: real tap on the button fits the stolen tail, no console errors.

## Done (2026-10-31, BATCH_033 art + M2 stage 4 — Wreck Tunnel)
- Hazards HZ01–HZ08 imported (HZ01 integrated, HZ02 used as the launcher stand-in). QA: `art/source/batch_033/QA_REPORT.md`.
- HZ01 Wreck Drift: drifting cover that blocks shots both ways, shoves the ship (never pins it), small hazard damage.
- Hazard nodes (wreck launchers) as P01-05 objective actors; HUD counter; briefing tip.
- P01-05 playable: Star B destroy 3 launchers, Star C no hazard hits.
- Tests: 93 (new: wreck cover, contact push + hazard count, node stop, P01-05 stars, P01-05 bot run).

## Done (2026-10-31, owner feedback: arsenal, drops, elites)
- 17 more guns from the catalog (W002–W020): scatter fan, rail lance, ricochet disc, gatling rotor, burst repeater,
  flak, prism splitter, sweep cutter, seeker missiles, cluster rack, torpedo drill, plasma globe, arc fork lightning,
  ion needle, frost shard, flame ribbon, gravity seed, wasp drones. Statuses: chill / ion / burn.
- Enemies drop weapons often; picking one up fits it at once (oldest module swapped out when full).
- Fixed: auto-fire wrecked the boss tail/claw before the joint opened (stray hits 25%, no splash, entry-safe).
- Elites with ring attacks and sure drops; campaign bosses ×1.4 HP.
- Tests: 118 (new: every weapon damages a target, gatling spool, rail pierce, arc chain, statuses, gravity, cluster split).

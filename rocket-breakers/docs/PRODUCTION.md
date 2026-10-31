# Production roadmap and acceptance gates

This is a large-scope game design with phased execution. Do not provide an arbitrary completion date before measuring the playable slice and art throughput. All 48 mission definitions and catalog records are design scope, not finished implementation.

## M0 — Project foundation

Pin engine/export version, document setup, import catalog, localize keys, create placeholder resolver and native development build. Deliver portrait flight sandbox, input mapping, safe areas and no-fire UI buttons. Validate catalog/asset IDs in headless workflow. Exit: stable fly/shoot at multiple frame rates; ability to reload a local save. Art may be labeled geometry.

## M1 — Salvage vertical slice (first implementation target)

One Graveyard environment, SPARROW, Needle Cannon W001, Pulse Laser W008, Scorpion Tail W022, Patch utility T001, Tractor utility T006, dash/Overdrive. One common scout, one shield barge, B02 Scorpion Reclaimer with two phases. Separate core/armor/joint/module; tow, safe dock, fit, fire stolen attack and extraction. Prototype mission `SLICE-01` is an internal test mission excluded from 48/144 campaign totals.

Exit: player starts a fresh save, breaks the correct joint, preserves module, tows under fire, fits without invalid layout, uses visibly stolen plasma-tail attack, boss permanently loses tail attack, completes mission, banks exactly1 fragment, reloads and sees progress. Reckless body fire destroys loot instead. No mouse-only precision dependence on mobile.

Playtest questions (hypotheses, not results): can ≥4/5 unfamiliar testers explain theft after one tutorial; does theft add enjoyment; can ≥3/5 intentionally steal on their second attempt; can all identify why a module was lost; are players interested in another boss part? Collect 5–10 real sessions before expanding. If theft is frustrating, tune joint exposure/tractor controls before producing 16 bosses. Don't invent results to pass a gate.

## M2 — Complete sector and progression

P01 six missions, mini B01, boss B02, three hulls (H01/H02/H04), eight baseline weapons, safe fitting, star objectives, rewards, fragments, fabrication, research rank, save recovery, Thai/English UI. Exit: 18 stars achievable, blueprint unlock after3 actual fragment entitlements, repeat run has no duplication exploit; touch accessibility works.

## M3 — Build depth

12 hulls, 20 baseline weapons, 12 utilities, 12 active ability framework/definitions (source-locked until bosses arrive), 8 fusions, threat director, mission role support, full enemy roster, hangar comparison and codex. Exit: each family has unique playable behavior, legal layouts stay within mass/energy/anchor rules, Starter can beat early challenges without grind. Do not claim unlock sources implemented until their boss milestones pass.

## M4 — Campaign production in paired-sector slices

Integrate P02/P03, then P04/P05, then P06/P07, then P08 with all encounter-specific signatures. For each sector deliver6 authored levels, foreground/background/hazards, mini/final boss, source-stolen behavior and star tests before starting the next pair. Assets requested in parallel only where reference direction approved. Exit:48 missions,144 stars,16 working source thefts,36 weapons.

## M5 — Endgame and polish

Expedition with leg banking, boss rematches, cosmetics, difficulty variants, full audio, complete art manifest, loading transitions, final tutorials/localization. Difficulty is authored, not just HP inflation. Exit: no unapproved placeholder; never describe all raster FX as done if only static concept images exist.

## M6 — Release candidate

Representative Android performance and device compatibility; Windows QA; offline and interruption tests; save migration/recovery; accessibility; import/export; license/provenance audit. Web demo export separately tested for storage/audio/input/renderer restrictions; iOS preparation separately stated. Signed store release, monetization and servers require later explicit owner workflow.

## Working cadence

For every coding session: read PROGRESS/NEXT_ACTIONS; select smallest gate-blocking work; implement; run meaningful checks; play relevant scenario; record evidence and remaining defects. Submit files and build paths, not just screenshots. If assets block polish, continue logic using labeled placeholders and produce precise image batch requests. Don't wait for all art to begin core coding.

## Scope boundaries

Version1 single-player offline. Defer multiplayer, guilds, trading, PvP, shared economy, online anti-cheat, battle pass, ads, gacha, paid power, user-generated levels, infinite procedural planets. Future server support must be an adapter, not mandatory upfront cloud infrastructure. Major feature additions must declare impact on milestones and asset count before adoption.

## Release acceptance checklist

- All catalog entries have implemented behaviors, data references and valid final asset IDs.
- Tutorial teaches target/joint/integrity/tow/fitting and distinguishes scrap from intact salvage.
- No lost permanent progress, duplicate settlement, free fragment loop or invalid unfit loss.
- All48 missions and each objective can be completed; exact144 stars; progression not grind-blocked.
- All12 hulls have useful tradeoffs; 36 weapons have distinct attack behaviors; all16 stolen boss weapons visually match their origins.
- Reduced-effects graphics preserves danger signals and collision state.
- Record real performance/device data and build limitations; no unsupported claims.
- Crash recovery, offline launch, app background, audio unlock and localization checked on target platforms.

# ROCKET BREAKERS — Agent Instructions & Master Game Design

Version: 1.0 • Design baseline: 31 October 2026 • Owner language: Thai

เอกสารนี้คือข้อกำหนดสำหรับ Claude หรือ coding agent ที่รับหน้าที่สร้างเกม ไม่ใช่ซอร์สเกมสำเร็จรูป ตัวเลขทั้งหมดเป็นค่าเริ่มต้นเพื่อทดสอบและปรับสมดุล ไม่ใช่ผลจาก playtest ชื่อเกมและชื่อเฉพาะเป็นชื่อทำงานที่ยังไม่ได้ตรวจเครื่องหมายการค้า

## 1. Mission and authority

สร้างเกมยิงยานแนวตั้ง 2.5D ระดับงานเชิงพาณิชย์ โดยมีจุดขาย: **ยิงข้อต่อศัตรูให้ชิ้นส่วนหลุด ลากออกจากสนามรบ แล้วเอาอาวุธและความสามารถนั้นมาติดยานเรา** ความชำนาญเกิดจากการเลือกเป้าหมาย การประกอบยาน การอ่านกระสุน และตัดสินใจเสี่ยงเก็บของ ไม่ใช่เพิ่มตัวเลขอย่างเดียว

Mandatory working rules:

1. Read this entire file, `docs/SYSTEMS.md`, `docs/TECHNICAL.md`, `docs/ART_BIBLE.md`, `docs/PRODUCTION.md`, and `data/catalog.json` before implementing the relevant system. This file defines product intent; SYSTEMS owns formulas/state rules; catalog owns IDs/content values; TECHNICAL owns code contracts. Resolve conflicts explicitly in `docs/DECISIONS.md`; never silently invent an alternative.
2. Deliver playable milestones. Do not attempt all 48 missions before the core salvage loop passes its acceptance gate. The full catalog defines version 1 scope, not the first sprint.
3. Claude owns code, integration, shaders, particle systems, procedural trails, physics, UI implementation, build/export and tests. ChatGPT is the designated creator of all final raster artwork, icons, backgrounds, sprites, flipbook source images and concept art. The owner passes image request packs between the two. Do not claim automatic access to ChatGPT image generation or an MCP bridge unless a real integration exists and has been tested.
4. Temporary geometric art is permitted for development and must be visibly marked `placeholder` in the asset manifest. Do not present placeholders as final art. Do not silently replace the art direction with pixel art, emoji, stock assets or another generator.
5. Reuse a maintained engine for collision/rendering. Keep simulation separate from visual effects. Never use visual glow extents as damage hitboxes.
6. Preserve saves with migrations. Never delete player progress on startup, content updates, failed validation or failed cloud sync.
7. Do not copy commercial game art, code, UI compositions, characters, sound recordings or branded weapon designs. An original design does not constitute legal clearance. Keep licenses and provenance; do not promise patent/trademark clearance.
8. No unsolicited live deployment, paid service, advertising, in-app purchase, analytics tracking or collection of personal data. Local code and local development exports are authorized by this brief.
9. Every completed milestone must include a playable build, reproduction instructions, verification results and an honest known-issues list. Never label screenshots as evidence of implemented gameplay.
10. Ask the owner only for choices that materially alter scope, cost or irreversible actions. Resolve routine implementation using this brief. Persist unfinished work in PROGRESS.md and NEXT_ACTIONS.md.

## 2. Product identity

| Property | Requirement |
|---|---|
| Working title | ROCKET BREAKERS / จรวดจอมยึด |
| Hook | Break it. Tow it. Make it yours. |
| Genre | Vertical modular shoot-em-up + salvage action + run builds |
| Audience | Players who enjoy dodging, mechanical experimentation and boss hunting |
| Art | Original premium 2.5D rendered sprites; no pixel art; chunky readable silhouettes |
| Screen | Portrait 9:16; logical 720×1280; responsive safe areas |
| Platforms | Native Android first, Windows development; web demo export after compatibility gate; iOS export preparation later |
| Session | 3–5 minute standard mission, 5–7 minute boss mission; 10–15 minute optional expedition |
| Primary language | Thai, with complete English localization support from the start |
| Version 1 | Offline single player with optional future server adapters; no required login |
| Core contents | 8 sectors / 8 planet destinations, 6 missions each, 48 missions, 144 campaign stars, 12 hulls, 36 weapons, 12 active abilities, 12 utilities, 16 elite/boss encounters |

Do not market this as an unprecedented invention or guarantee commercial success. Validate whether players enjoy selective dismantling more than simply destroying enemies.

## 3. Experience pillars

- **Visible ownership:** a stolen weapon retains recognizable shape, signature color and attack behavior from its source boss.
- **Readable intensity:** many shots are acceptable only when dangerous bullets, weak points and safe routes remain clear on a phone.
- **Meaningful builds:** weight, energy, slot shape, firing arc and coverage change play. Every loadout has a weakness.
- **Salvage creates stories:** a damaged ship towing a rare intact cannon through a dangerous wave is the emotional peak.
- **Fair mastery:** damage has a visible source, hitboxes are stable, attacks telegraph, failure teaches a response.
- **Respect time:** deterministic blueprint progress, no stamina, no forced ads, no paid random power or mandatory grind.

## 4. Player journey and screens

First launch → language/accessibility → short playable tutorial → first salvage → fit stolen gun → defeat damaged mini carrier → results → hangar → galaxy map.

Screens: title, profile/local save slots, tutorial, hangar hull selection, module grid/loadout, weapon comparison, ability selector, research/codex, galaxy map, sector mission map, mission briefing, combat HUD, tactical docking overlay, pause/settings, victory/defeat, expedition extraction, save recovery, credits/licenses.

The hangar must show DPS estimate, energy/sec, heat, mass, actual speed, armor, cargo load and firing arcs. It must explain invalid placements without technical jargon. Show real values from simulation definitions, not a second UI-only formula.

Combat top: HP, shield, mission progress, score, boss HP when relevant. Center: flight space, weak-point markers, towing cable. Bottom: selected subsystem/lock, dash, one active ability, Overdrive; avoid covering the ship with a finger. Retain at least 65% of vertical screen for action. No purchase buttons during combat.

## 5. Core loop and input

1. Choose unlocked hull, legal starting loadout and one active ability in hangar.
2. Choose mission; briefing shows star objectives, hazards, expected salvage and extraction rule.
3. Fly and auto-fire while selecting a target subsystem when precision matters.
4. Break a joint while preserving the attached module; use tractor/tow to recover it.
5. Clear a micro-wave, enter a 5-second protected docking opportunity, then fit, stow or scrap the part.
6. Select run upgrade at thresholds; combine weapon families using explicit recipes.
7. Defeat encounter, secure rewards, get stars and research progress; return or choose expedition next leg.

Touch: relative drag in lower/central flight area moves ship; tap a highlighted enemy subsystem locks aim; tractor button appears only when salvage is in range; dash/ability/Overdrive have distinct buttons. Offer optional auto-select nearest visible joint and auto-tractor for accessibility. UI button gestures consume events and never move the ship. Keep a persistent lock; no need to precisely tap during a dense pattern. Use protected docking overlay for drag/drop fitting.

Keyboard: WASD/arrows move; left click subsystem lock; E tractor/tow; Space dash; Q ability; R Overdrive; Tab tactical fitting only when docking allowed; Esc pause. Gamepad: left stick fly, shoulder cycle subsystems, triggers abilities/tractor. Remappable, with dead-zone settings.

Auto-fire tracks selected target only within weapon firing arc; rotation-limited turrets cannot aim through the hull or instantly turn backward. No target means fire forward. A target outside arc is marked with a visible arrow; movement/repositioning still matters.

## 6. Campaign, planets and stars

`data/catalog.json` contains the complete 48-mission list, 8 destination themes, per-mission objective keys, reward baselines and boss references. All destinations are fictional environments; a sector destination may be a moon, belt or artificial planet rather than a literal star.

| Sector | Destination | Main challenge | Mini / final boss |
|---|---|---|---|
| P01 | Graveyard Belt / เขตสุสานยาน | Salvage, basic joints, wreck cover | Rivet Crab / Scorpion Reclaimer |
| P02 | Cinder Foundry / ดาวโรงหลอม | Heat, molten lanes, chain reactions | Furnace Ram / Forge Centipede |
| P03 | Tempest Reach / ดาวพายุไอออน | Wind warnings, shields, lightning | Kite Sentinel / Storm Ray |
| P04 | Verdant Machine / ดาวจักรกลพฤกษา | Spores, regeneration, growth | Thorn Mantis / Root Cathedral |
| P05 | Frostglass / ดวงจันทร์ผลึกน้ำแข็ง | Inertia, frost, reflected beams | Prism Stag / Glacier Leviathan |
| P06 | Dune Extraction / ดาวเหมืองทะเลทราย | Sand occlusion, drills, moving cover | Bore Mole / Sand Bastion |
| P07 | Gravity Scar / ดาวรอยแยกแรงโน้มถ่วง | Marked gravity wells, curved trajectories | Orbit Warden / Singularity Serpent |
| P08 | Eclipse Citadel / ดาวป้อมคราส | Combined mechanics, changing armor | Mirror Admiral / Iron Devourer |

Each sector uses mission roles: 01 approach, 02 escort, 03 mini boss, 04 salvage hunt, 05 hazard gauntlet, 06 final boss. Author distinct routes/waves; mission role templates do not justify repeating one layout with recolors. Boss sector motifs and abilities must differ.

Every mission awards 3 independent permanent best-record stars:

- Star A: complete the mission / required extraction.
- Star B: complete mission-specific side objective displayed before launch (escort HP, intact capture, hazard disable, etc.).
- Star C: complete a stated mastery objective; objectives may involve subsystem precision, limited hull damage, dodges or breaking a telegraphed attack. Never silently change the criterion mid-mission.

Stars are boolean per mission, combined across successful runs; score rank is separate and grants no extra stars. B/C require A on that run, but previously earned stars never disappear. Campaign star total is exactly 144 regardless of difficulty.

Sector access: P01 open; P02 requires P01-06 clear + 6 total stars; then P03 12, P04 18, P05 24, P06 30, P07 36, P08 42, each also requiring previous final clear. Six clear-stars from each prior sector suffice, so completion alone cannot softlock progression. Missions unlock sequentially; replay is free. Milestone rewards at 18/36/54/72/90/108/126/144 stars grant cosmetics, hull access or research bundles, never block core story. No grind gate for repair.

Difficulty: Story assist / Standard / Veteran. Shared star pool; all accessible in Story. Difficulty medal and score rankings separated by difficulty and assists. Story allows slower enemy bullets and +HP; Standard is balance baseline; Veteran unlocks after sector clear, changes authored patterns and adds score only, not exclusive power. No live competitive leaderboard in v1.

## 7. Ship system

Twelve playable hulls are fully enumerated in catalog with base HP, shield, speed, mass capacity, energy regen and unique passive. Starting hull SPARROW must clear all content without unlocking another hull. Hull unlocks are variety, not strictly stronger replacements.

Hulls: SPARROW starter; KESTREL interceptor; BASTION armor; MAGPIE salvage; HIVE drones; CHIMERA mixed weapon; LANCER recoil fighter; MIRAGE decoys; ANCHOR gravity stability; BULWARK shielding; COMET heat specialist; RELIQUARY recovered-boss hybrid.

Attachment grid: fixed 7 columns × 7 rows, origin center (3,3), y increases toward nose. Hull-specific legal sockets are authored masks, not every cell is usable. Modules use polyomino footprints from catalog, quarter-turn placement only where allowed, and a connection anchor. Must connect through an active socket to a reactor bus; no floating pieces. No overlap or off-mask placement. Validate an acyclic structural support tree separate from energy links; removing a support marks child modules stowed, never deletes inventory. Preview affected modules before confirming.

Modules consume mass, energy and occupied cells. Legal fit requires total fitted mass ≤ hull cap and all slot/type conditions met; cargo/towed load can reduce effective speed but cannot allow illegal fitting. Weapons can be rotated only if their asset/collider/arcs support it; fixed-forward guns stay forward. Utilities do not consume weapon fire slots.

Damage: central core hurtbox plus exposed module colliders; same projectile causes at most one damage event to the ship assembly. Hits to a module damage its integrity, with 25% damage transmitted to core; core hit is 100%. On module integrity zero it disables/detaches into a recoverable owner-tagged item once per mission. Critical hull core never detaches. No changing hurtboxes per animation frame. Core indicator always visible. Destroyed-run borrowed modules do not delete permanent blueprints. See detailed state rules in SYSTEMS.

## 8. Weapons, abilities, utilities and synergy

36 weapons, 12 active abilities, 12 utilities and 8 fusion recipes appear in catalog. No weapon may be implemented as a label-only reskin: distinct projectile model or attack geometry, telegraph, impact and role are required. All damage and timing values come from data, versioned together.

Weapon families: kinetic, beam, missile, plasma, electric, thermal, cryo, gravity, drone and melee/tractor. 16 weapons are signature salvage from the 16 catalog bosses; 20 are baseline/research weapons. Weapon power budget is balanced against footprint, mass, heat, energy and exposure.

Loadout: one hull, legal installed modules, one active ability, dash and Overdrive. Research unlocks an ability permanently; equip one in hangar, not all at once. Ability runtime never bypasses collision or salvage state rules.

Run levels use XP thresholds 100/220/380/580/820/1100/1420/1780 (cumulative). At each threshold freeze/slow combat safely and present three deterministic seeded choices from compatible upgrades; never offer a dead choice. Eight upgrades/run; no infinite stat stacking. Maximum repeated upgrade ranks: 3. Example run upgrades: precise joints, faster tow, +projectile, lower heat, chain arc, shield on salvage. Numbers and exclusions are in SYSTEMS.

Fusion: two indicated family modules at run rank 3 plus a fusion core from a current-leg elite/cache or boss create a temporary evolved attack on a compatible host module. The catalyst module is disabled/stowed for that run; footprint and mass of the host remain, energy/heat costs are replaced by recipe values. Never duplicate the consumed catalyst or permanently destroy owned items. UI must show before/after. Fusion appearance is overlay + dedicated FX, not a fake stat popup.

## 9. Selective dismantling and theft — non-negotiable feature

Enemy assembly contains core, armor plate, module and joint as distinct entities. Every stealable module has a supported joint, health pool, integrity pool, immutable asset ID, provenance and boss skill mapping. A joint is not simply another name for boss HP.

Break armor window → expose marked joint → target/aim → reduce joint HP to zero → module detaches only if integrity is above capture threshold → tractor locks → tow through threats → secure at docking/extraction → fit temporary instance or bank salvage. Shoot module body recklessly and it becomes scrap instead. Exposed module can be deliberately destroyed to stop its attack even if this sacrifices loot.

Each boss has at least one signature detachable component and two distinct combat phases after removal. Theft must change what the enemy can do immediately. Enemy may compensate with a weaker alternate attack, never respawn the same stolen part. Removing an attack cannot bypass the remaining core fight or grant unbounded farming.

Intact detach threshold: ≥35% module integrity. Severed module pickup has 2 seconds invulnerability, 40 seconds lifetime, visible last-10-second timer; boss arenas pause the timer during phase transitions. Tractor acquisition range 150 logical px, hold 0.6 sec, cable maximum 240 px, one tow item at a time. Starting tractor is universal; accessibility auto-acquire uses the same eligibility checks. Tow speed penalty 20–35%, hard minimum 55% base speed; cable snap only after 0.75 sec over-length or a clearly telegraphed cable-cutter hazard. Ordinary bullets damage cargo rather than silently cutting the cable.

One intact secure event gives a usable run module and one blueprint fragment; three banked fragments unlock hangar fabrication of that signature weapon. First boss clear awards one fragment if none banked from that encounter, preventing a skill wall from blocking progression. Per boss per attempt, maximum one signature fragment regardless of detach/fit/drop cycles. A fragment from first-clear fallback cannot stack with intact salvage for the same signature that run. Boss archive records severed part and successful theft separately.

Normal campaign victory auto-secures stowed and towed eligible salvage after final danger clears; no secret exit timer. Expedition legs instead require choosing a visible extraction gate. Secured leg rewards are banked; continuing risks only unbanked current-leg salvage. Death preserves already banked rewards and prior stars; current-leg unbanked intact items become 25% scrap value. Permanent unlocked blueprint/hull is never removed. See transaction examples and acceptance tests in SYSTEMS/TECHNICAL.

## 10. Enemies and boss direction

Common enemies: scout swarms, interceptors, missile skiffs, shield barges, minelayers, healers, cargo carriers, cable cutters, salvage thieves, beam sentries, drill divers, gravity anchors. Give each a shape cue, attack telegraph and one counter. Most common enemy weapons yield scrap or baseline modules; signature blueprint weapons come from named encounters.

Bosses must be battles with readable parts, not giant HP bars. Every encounter definition includes: joint exposure trigger, stolen component, player's resulting weapon/ability, compensated phase, hazard and Star B/C criteria. Full records are in catalog. No attack may be unavoidable given a legal starting hull and no module upgrade.

IRON DEVOURER in P08 is the final segmented battleship worm shown in the initial concept. FORGE CENTIPEDE in P02 is a distinct industrial rail-crawler. Do not collapse them into the same boss or reuse names interchangeably.

## 11. Physics, hazards and feedback

Use arcade movement, not a full rigid-body simulation for every entity. Player acceleration/deceleration predictable; capped recoil moves the ship but never throws it across the screen. Space does not imply realistic Newtonian inertia at the cost of mobile control. Frost/gravity zones have visible bounds and warning before force takes effect. Move screen/environment separately from gameplay world coordinates.

Collision layers: core, modules, enemy parts, player bullets, hostile bullets, cargo, obstacles, loot, trigger zones. Player fire never hits own modules as damage, but geometrically blocked muzzle paths stop firing and show an obstruction indicator. Hostile bullets are never hidden behind large explosions; use a dedicated high-contrast render pass. Explosive scenery chain damage is capped per entity and one chain event cannot recurse indefinitely.

Dash grants 0.18 sec invulnerability and 0.25 sec burst with 2.5 sec cooldown; direction = recent movement or forward. Cannot teleport through arena walls. Overdrive at 100 charge lasts 5 sec, fire-rate ×1.5 and energy regen ×2, heat generation ×0.75, no invulnerability. Charge from kills, precision severing and capped grazing; no charge from self-damage, invulnerable bullets or reclaimed own items.

Feedback layers: muzzle flash, recoil, tracer, impact spark, localized flash, small debris, shockwave, floating score, short hitstop and controllable shake. Do not stack full-screen white flashes. Photosensitive mode disables strobe; shake/flash sliders can reach zero.

## 12. Economy, persistence and post-campaign

Credits = repair/fabrication experimentation currency, scrap = upgrade materials, fragments = signature research, stars = campaign records. There are no premium currencies in v1. Mission repair is free; player can always launch with starter loadout. Sell/refund crafted modules for 80% credits; permanent research is not sold. Do not use real-money random loot.

Weapon research ranks 1–5: each rank adds 4% base damage only; max +16%. All campaigns balanced at rank 1; variants and execution matter more than grind. Hull mastery unlocks cosmetic trim and alternative loadout presets, not mandatory HP. Progress rewards in catalog are initial tuning values.

After campaign: replay objectives, seeded expedition, boss rematch with selectable known parts, challenge runs and cosmetic achievement hunting. Daily seeds are computed offline from UTC date for consistency, with local display date; no false claims of a secure leaderboard. No PvP/co-op/server-authoritative economy until separate design and infrastructure authorization.

Save: local slots, autosave after secured rewards/hangar edits, rotating backup, checksum/corruption fallback, manual export/import, schema versions and migrations. Single-player local saves can be edited; checksums detect corruption and are not anti-cheat. Never promise unhackability.

## 13. Art and production responsibilities

All final images are authored by ChatGPT through owner-mediated batches. Claude outputs `art/requests/BATCH_###.md` with exact IDs, dimensions, reference paths, camera, per-layer alpha/blend, pivots, animation states and acceptance checks. ChatGPT returns original image files; code integration performs documented non-generative cropping/packing/alpha validation. Do not assume generated sprite sheets have exact registration: verify and repair alignment before integration.

Initial supplied concepts demonstrate salvage sequence, hull family, galaxy map and VFX direction. These are concept references, not production-ready atlases. Initial gameplay mockups from the conversation are mood references only and need not be downloaded for this starter pack.

`art/asset_manifest.csv` lists initial required production assets and status; `ART_BIBLE.md` owns resolution, camera, anchor, tint, transparency and FX rules. `art/requests/BATCH_001.md` is the first production request for the playable slice. No final asset is considered delivered just because a prompt is written.

Particles, procedural geometry, shaders, trails and screen effects are code-generated under Claude's ownership; ChatGPT supplies the raster textures/flipbook art they use. Audio composition/synthesis is a separate pipeline: this image workflow does not generate sound files. Prototype audio may be synthesized; final audio needs original/licensed sources and provenance.

## 14. Architecture and quality gates

Default implementation: Godot 4 stable at project creation, typed GDScript, data-driven Resources loaded from versioned JSON, 2D renderer with rendered sprite art, fixed 60 Hz simulation. Verify chosen engine/export documentation and pin exact version before coding. Do not switch engines without recording reason and migration cost. Optional native plugins require web fallback. Data files in this handoff are engine-neutral and must remain source-of-truth or have a documented importer.

Directories in implementation repo: `src/core`, `src/combat`, `src/ships`, `src/salvage`, `src/campaign`, `src/ui`, `src/save`, `src/audio`, `data`, `assets`, `tests`, `tools`, `docs`. This handoff is a specification package, so those source folders are not pre-populated.

Performance targets, simulation contracts, schemas, essential tests and acceptance gates are detailed in TECHNICAL/PRODUCTION. Minimum gate: shoot joint → intact detach → tow under fire → fit → use stolen attack → boss loses attack → save blueprint progress → reload intact.

## 15. Definition of done

A system is done only when usable with supported input, localized labels, save behavior, error paths, asset references, performance limits and observable verification. Content is done only when its actual behavior, hitboxes, telegraphs, attacks and unique mechanics exist in a playable build. A content registry entry alone is not a completed weapon or boss.

Before claiming version 1 complete: all 48 missions playable and beatable; 144 stars obtainable; 12 hulls, 36 weapons, 12 abilities, 12 utilities and all 16 encounter signatures functional; all final assets pass manifest QA; save migration tested; native target verified on representative phones; web status stated separately; no critical placeholder except explicitly owner-approved scope deferrals.

Start instructions: follow `CLAUDE_START.md`. Maintain decision log, progress and blocked asset batches. Do not stop at producing another design proposal; implement and test the currently authorized milestone.

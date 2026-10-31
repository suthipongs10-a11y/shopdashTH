# Systems, formulas and edge cases

All quantities below are initial tuning data, not measured balance. Logical units = pixels at 720×1280. Time = seconds, mass = arbitrary tons, energy = reactor units. Core simulation uses fixed ticks; rendering interpolates. Catalog rates mean shots/sec, never rounds/minute. Damage is per projectile before multipliers.

## 1. Movement and geometry

- Integrate velocity toward input × effective_speed with acceleration 1800 px/s², deceleration 2200; clamp diagonal input length to 1.
- `effective_speed = base_speed × clamp(1 - 0.25 × fitted_mass / mass_cap - tow_penalty, 0.55, 1.0)`; tow_penalty = 0 while not towing, otherwise `0.20 + 0.15 × clamp(cargo_mass/20,0,1)`. Use this single formula; the clamp is the final limit.
- Cargo stowed in an internal hold uses capacity units and does not add fitted_mass; its capacity is capped at 2 modules (MAGPIE 3). Towed load is external. A fitting swap cannot bypass mass cap.
- Core default radius 12, starter hull visible width about 58; modules use inset polygon colliders within occupied grid tiles. One grid tile = 22 logical px. Large layouts trade extra exposed colliders for greater firepower. Make module/core hurtboxes visible in accessibility overlay.
- Maximum assembled half-width 94 px; combat horizontal boundaries clamp whole assembly, not core only. Player/enemy body collision deals 20 damage per 0.6 sec contact cooldown, with separation; it never insta-kills solely because sprites overlap.
- Ship-module self-occlusion: before firing cast short muzzle clearance ray through own assembly; if blocked, suppress shot without energy/heat cost. Preview blocked arcs in fitting UI. No physics joints between every attached module.
- Recoil impulse capped at 80 px/s per tick, decays over 0.12 sec; no cumulative infinite acceleration. Recoil can interrupt tow acquisition but not silently cancel a secured part.

## 2. Damage, shields and statuses

`raw_hit = damage × rank_multiplier × run_multiplier × difficulty_source_multiplier`.
`rank_multiplier = 1 + 0.04 × (research_rank-1)`, rank 1..5.
`damage_after_armor = raw_hit × 100/(100+armor)`; clamp armor 0..200. No immunities: enemy resistances cap at 50%. Weak-point bonus +25% to joint only; precision aim never transfers this bonus to core.

Shields absorb before hull/module HP when collision is within shield arc; shield regenerates after 4 sec without damage at 8 units/sec (hull passive overrides). Apply projectile damage once, with projectile-ID + assembly-ID de-duplication. Piercing may hit distinct enemies/parts but cannot hit same part more than once per 0.1 sec unless weapon is a ticking beam; beams tick at explicit 0.1 sec intervals with damage/sec converted to damage/tick.

Player damage invulnerability 0.45 sec after a core/body hit; same window protects modules to avoid a chain of simultaneous unavoidable hits. Show a steady outline rather than strobing. Broken module owner-drop is invulnerable for 2 sec. Repair to 30% integrity when reclaimed at a safe dock, once per unique part instance per mission; later breaks become scrap to prevent infinite shields.

Statuses: burn = fixed 4 damage/sec, 3 sec, max 3 stacks; chill = −15% movement/turn, 2 sec, max 2; freeze = only nonboss after 3 chill applications, 0.6 sec, 4 sec immunity; ion = interrupts nonboss weapon charge for 0.4 sec, max once/3 sec per target; mark = +10% joint damage 4 sec, refresh not stack; gravity = bounded force, not a damage multiplier. Bosses resist slow to max 15% and never hard freeze. Friendly target statuses do not use enemy debuff durations accidentally.

## 3. Energy, heat and fire scheduling

Reactor capacity 100. Catalog energy is per trigger; burst counts use energy once for the whole scheduled burst unless specified otherwise. `energy/sec = trigger_rate × energy_per_trigger`. Only fire when sufficient energy; blocked guns do not spend resources. Stagger low-priority guns when depleted; player can set primary/secondary power priority. Starting loadout sustained consumption ≤ 80% reactor regeneration.

Per-module heat 0..100; heat_per_trigger in catalog. Cool 18/sec while not firing; 10/sec while firing. At 100 lock the gun until ≤55; minimum lock 0.8 sec. Show local glow and HUD heat, not surprise damage. Overdrive modifies fire rate/heat/energy regen but cannot ignore a heat lock. Thermal utility cooling bonuses multiply base cooling, never add to heat cap without data.

Boss-stolen attacks use a player-normalized version: boss-scale beam becomes a compact beam with the same visual identity and tactical shape. Never equip uncapped boss damage/range or copy boss HP onto a player module.

DPS estimate sums expected triggers × projectile count × per-projectile damage; burst/beam/DoT math uses special-model parameters. Include explanatory separate direct/splash/DoT estimates; do not multiply splash by an imaginary fixed enemy count. Chain bounce damage scales ×0.75 per hop. Explosions do max one hit per target per blast ID; environment chain max 5 links, max 120 total damage to a single entity per chain. No screen-wide cascade from one loot object.

## 4. Targeting, joints and boss parts

Boss core cannot receive more than 10% incidental spill damage from shots resolving against an attached module. Armor, joint, module and core each have an explicit collider priority so a visible target is the target actually hit. Fully shielded joints cannot be selected as a fake weak point; UI shows the unlock trigger (vent, dodge charge, remove plate, interrupt heal).

Component record:

```json
{"instance_id":"run123:B02:tail","template_id":"W022","source_encounter":"B02","slot":"tail","joint_hp":80,"joint_hp_max":80,"integrity":100,"integrity_max":100,"capture_min_fraction":0.35,"state":"attached","fragment_credited":false}
```

Joint HP and module integrity are independent. Hits to joint reduce joint HP; direct body hits reduce integrity. On joint 0 with integrity ≥35% detach intact; with integrity below threshold detach scrap. At integrity 0 while attached destroy module and remove its attack but grant scrap only. On core death auto-scrap still attached signature parts; first-clear research fallback still applies. No intact loot for simply blasting core.

Boss phases: P1 full kit; P2 at 60% core HP OR signature removed (whichever first); P3 at 25% for final bosses only. When signature removed, its attack action is canceled at next safe simulation event, its emitted bullets remain visible and expire normally, and a declared alternate pattern starts after ≥0.8 sec warning. Phase events use one-time flags. No attack duplication from concurrent HP and sever triggers.

## 5. Salvage state machine

Allowed main states:

`attached → exposed → detached_intact → acquiring → towed → secured_run → fitted_run | stowed_run → banked`

Alternative transitions: attached/exposed → destroyed_scrap; detached/acquiring/towed → damaged_scrap or expired; acquiring → detached_intact on cancel; towed → detached_intact on deliberate release/cable snap; fitted_run → owner_drop on first break → secured_run after reclaim; failed leg unbanked → salvage_loss settlement.

State changes require tick-ordered transaction IDs and are idempotent. Source encounter/part IDs persist through all transitions; no creating a new fragment entitlement when fitting, stowing, dropping or repairing. Model blueprint_progress and physical_instance separately. Save resume restores exactly one owner/container for each item; invalid duplicate ownership quarantines extra entries and reports recoverable error rather than rewarding duplicates.

Tractor acquisition uses aim cone 40°, range 150, 0.6 sec dwell. Taking damage does not automatically cancel; leaving range or activating dash cancels acquiring, with explicit indicator. Auto-tractor is optional and chooses locked part then nearest intact eligible item; never swaps tow cargo without confirmation. E/tractor tap when towing opens release confirmation if carrying a signature; accessibility may disable confirmation.

Tow cable = spring visual around a kinematic cargo follower; collision does not require an unstable rigid-body chain. Cargo takes 50% ordinary bullet damage, with its own integrity; it can be destroyed. Ordinary cargo cannot body-shield the player indefinitely: shots pierce cargo with 50% remaining damage. Cable cutter has 1 sec red slash warning and unique silhouette. Snap returns cargo as detached_intact with remaining lifetime; snap never grants new invulnerability repeatedly.

Safe dock opportunity after defined cleared wave: 5 sec invulnerable pause/overlay, no shots or timer progress. Player may take unlimited UI planning time in single player; 5 sec describes in-world docking animation, not a forced five-second reading deadline. Options: fit if valid, swap an installed module into hold, stow if capacity, or scrap. Cargo over capacity cannot disappear; offer replace/discard choices. No forced invalid build. Continue resumes with 1 sec danger-free grace.

Campaign ending is auto-secure after boss projectiles expire or are visibly dissipated. Fragment eligible once per signature per attempt, committed only in reward settlement. First-clear fallback checks banked/current-settlement fragment entitlement before granting. Failure before banking does not award the fragment. First successful clear grants fallback even if all steal attempts failed.

## 6. Star and reward transactions

Star evaluation only on successful settlement, using authored objective IDs. Record damage_taken_to_core after shields, rounded to full logical damage for damage thresholds; repairs do not undo recorded damage. Module damage does not count toward core-only mastery. Salvage objectives require secure/bank event, not detach. Objective counters persist in run state, with source IDs and assist flags.

`new_stars[i] = old_stars[i] OR earned_on_success[i]`. Difficulty is a record field not a new star pool. Total = sum 48 arrays of 3 booleans. Results shows newly earned, previously earned and missed separately. Never store total_stars independently without recomputing against mission records.

Reward baseline per sector index s=1..8, mission index m=1..6: credits `180 + 70s + 25m`, scrap `15 + 5s + 3m`. Boss bonus already part of mission reward record, not an extra untracked award. First clear doubles credit only, not scrap/fragment. Repeat clears grant 60% credits and 100% scrap; defeat grants min(earned combat credits ×0.25, baseline credits ×0.25) and 25% unbanked scrap, rounded down. All rates are explicit in results.

Transactions: `settlement_id = profile_id/run_id/leg_index`. Write pending result to journal, apply profile delta once, persist applied ID, then finalize run. Crash between steps replays idempotently. Retain recent settlement IDs with the last 100 completed runs plus compact high-water mark/unique run UUID tracking; never reuse run IDs. Selling/fabricating uses same atomic profile-write protocol.

Worked examples:

1. First B02 win, stole tail intact: +1 W022 fragment total, not +2; one borrowed W022 usable in current leg; permanent fabrication after total 3 fragments. Borrowed module disappears at run end, fragment remains.
2. First B02 win, destroyed tail: +1 fallback W022 fragment, no intact physical tail. Replay and intact salvage gives next fragment.
3. Detach, fit, drop, reclaim same tail: ≤1 fragment entitlement; no repeated XP or salvage credits for same instance.
4. Expedition leg 1 banked + leg 2 death: leg 1 unchanged; leg 2 uses defeat formula; no reset of campaign stars.
5. Victory crash before results: pending settlement restores reward exactly once on relaunch.

## 7. Abilities and upgrades

Dash and Overdrive from AGENTS apply to all hulls. Active ability slots =1. Each catalog ability lists duration, cooldown and source unlock. Invulnerability cannot be chained beyond 0.6 continuous seconds by stacking dash/ability effects; phase ability replaces dash's active immunity window, not extends it indefinitely. UI shows this interaction.

Run upgrade pool, each max rank 3 unless stated:

- UPG01 Precision: joint damage +10%/rank, no core bonus.
- UPG02 Tow winch: acquisition time −0.1 sec/rank, min 0.3; does not remove speed penalty.
- UPG03 Cooling: module cooling +10%/rank.
- UPG04 Capacitor: reactor regen +8%/rank.
- UPG05 Reinforce: max core HP +8%/rank, heal gained maximum once.
- UPG06 Escort drone: one additional drone (max rank 1), only compatible drone family loadout.
- UPG07 Focus: projectile spread −10%/rank for ballistic weapons only, no extra DPS multiplier.
- UPG08 Arc extension: +1 bounce/rank to chain weapons, global bounce cap 5.
- UPG09 Salvage shield: secure intact part grants 8 temporary shield/rank, max 24, one trigger/source part.
- UPG10 Graze capacitor: graze charge +10%/rank, subject to per-bullet cap.
- UPG11 Payload: missile blast radius +8%/rank, no hidden damage bonus.
- UPG12 Piercer: +1 enemy pierce/rank, max 3; subsequent damage ×0.7; exclude beams/explosions.
- UPG13 Tune module: select one currently fitted weapon to increase its run_rank by1 (starts1, max3), +6% damage per gained rank. This is separate from permanent research_rank. One pick increases one weapon one rank, and disappears at run end. Fusion requires two compatible weapons each at run_rank3; catalog family matching and T012 still required. Store offered target instance IDs so selling/swapping cannot redirect a pick to an invalid item. At least one tune-module choice is offered at XP picks2 and4 when a compatible weapon remains below3; later picks use seeded pool. Four tune picks can make two rank3 modules, leaving four other choices within the eight-pick cap.

XP from enemy/encounter source only once. Loot reclaim does not grant XP. Pick RNG seeded by run and pick ordinal; save offered choices before display, so reload does not reroll. If fewer than three compatible choices remain, show available and deterministic small heal option rather than generate invalid upgrade. Fusions don't permanently change blueprint records.

Ability unlocks require successful clear of the source encounter, independent of intact salvage. Signature weapon fragments still follow the three-fragment rule. Unlocking an ability doesn't auto-equip or overwrite the player's current choice. Research rank upgrade cost from r→r+1: credits `120*r`, scrap `20*r`, r1..4; fabrication begins at rank1. Unlock baseline weapon research on its catalog mission clear, no fragment requirement. H01/W001/W008/T001/T006 always available. The M2 test bench may expose eight baseline weapons in a developer-only sandbox; campaign unlock rules still apply and sandbox rewards cannot write to the real profile.

Fusion supply: sector2+ missions04/06 guarantee one fusion core cache after wave2, before the final combat/encounter; boss core may also drop one for expedition next leg. One maximum carried, no sale value and no permanent inventory; unused core expires at run end. This makes fusion usable during a mission rather than unlocked only after the last enemy dies. Tune module run damage multiplier is `1 + 0.06*(run_rank-1)` before other named run bonuses. Fusion host retains run_rank but replaces attack model using its recipe. Eight-pick XP thresholds may require elite/mission objective XP bonuses; ensure boss missions can reach at least four tune choices before final fight in eligible sectors, without spawning farmable infinite enemies. Never award XP from recycled cargo.

## 8. Threat, bullets and readability

Ordinary shots have visible spawn and ≥0.25 sec travel before possible player hit; heavy beams wind up ≥0.8 sec, boss sweeps ≥1.0 sec. Never spawn a bullet inside the player's hurtbox. Authored patterns must provide at least one reachable safe corridor ≥ assembly projected width +24 px for broad sweeps; dense precision patterns may target core but must not assume modules are intangible. Offer sacrificial module defense but never require it to survive a pattern.

Graze: bullet center inside core radius +20 but outside actual assembly collision; charge at most 0.25/unit per bullet over its lifetime; per-second graze charge cap 3, Overdrive charge cap100. No points from a bullet grazing multiple modules or while player invulnerable. Kill charge 1–5 depending enemy; precision sever +15 once/source. Chain XP and charge caps are distinct.

Threat director admits next scripted wave only when active threat budget permits, preserving required boss/escort order. Do not dynamically punish stronger player loadouts with hidden HP scaling. Standard enemy core HP multiplier `1+0.15*(sector-1)`; damage `1+0.08*(sector-1)`; boss HP is explicit catalog value and not multiplied again. Story enemy damage ×0.65, bullet speed ×0.8, player maxHP ×1.3; Veteran damage ×1.15 and authored pattern variant, HP unchanged.

## 9. Accessibility and fairness

Settings: contrast bullets, enemy outline, reduced particles, shake0, flash0, larger HUD, relative/absolute drag, handedness, auto-lock, auto-tractor, bullet-speed assist, subtitles and audio sliders. Auto-lock/tractor are convenience settings and do not disable campaign stars. Slower bullets/extra HP mark score as assisted, never remove earned stars. Normal input latency and consistent control take priority over camera spectacle.

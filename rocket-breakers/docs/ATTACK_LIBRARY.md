# Attack choreography and enemy behavior library

All values are Standard defaults; sector projectile speed grows by3% per sector, cap1.21×. Bullet radii are logical px and rendered with a bright rim. Shot colors belong to allegiance (hostile magenta/red, friendly cyan/gold); element adds secondary accents. Never use a boss sprite animation as the sole collision timer.

## Common attack primitives

| Primitive | Default timing / geometry | Counter |
|---|---|---|
| aimed_volley | aim sampled at start; warning0.4sec; 3shots0.12sec apart; speed230,radius5; next volley2sec | move after aim locks |
| fan | 5shots over60°, speed210,radius5; cycle2.5sec | move to a gap; no hidden homing |
| straight_burst | 3shots forward,0.1sec interval,speed250,radius4; cycle1.8sec | approach from side |
| spiral | emit1shot every0.16sec,rotate18° each; duration2sec; speed180; rest1.4sec | follow rotating wide gap |
| ring_gap | 16radial slots with3adjacent slots omitted toward safe heading; warning0.8sec; speed180 | read gap wedge |
| delayed_mine | mine drifts80px/s; warning circle; arms1.2sec; lifetime6sec; 6shot burst on trigger/expiry | shoot mine before armed or route around |
| bounded_homing | warning0.6sec; missile240px/s, max turn65°/sec for1.2sec then straight; destroyable | juke late, shoot missile |
| segmented_beam | telegraph1sec, active0.7sec, width14, range800; tick0.1sec | leave line; does not turn during active |
| telegraphed_sweep | warning1.2sec indicates arc and start; beam rotates25°/sec for1.2sec; width12 | move with/behind sweep |
| lob_pool | target ground area shown1sec; shell arrives0.6sec later; radius60, pool2sec | leave marked area |
| warned_charge | lane stripe1sec, actor moves600px/s for0.45sec; contact cooldown respected | sidestep; can bait hard cover |
| chain_arc | nodes mark0.8sec; arc only between visible nodes within180px; active0.25sec | cross before/after active |
| gravity_field | ring preview1sec; active2.5sec; radius120; force100px/s², capforce120 | leave border; no instant teleport |
| telegraphed_slash | cable-cutter warning1sec; strip width20, range200; active0.15sec | move cable/ship out of strip |
| heal_tether | visible green line0.8sec; heals8HP/sec,3sec; max one ally | interrupt healer; cannot heal severed joint |
| spawn_scout | bay opens1sec; spawn2scouts; minimum4sec cycle; cap6owned scouts | shoot bay to stop reinforcement |
| tractor_attempt | targets loose salvage, channel1.5sec visible; thief flees with item slowly | break tether or kill thief; item drops with existing provenance/timer |
| delayed_echo | preview ghost of first volley0.8sec before copy; echo50%damage, no recursion | dodge second known geometry |

Weapon-specific models not named above use special_params in catalog and the following rules: pulse_beam is instantaneous visible0.08sec with a swept ray; charge_rail uses a fixed charge line, not full-screen damage; ricochet uses a max bounce counter and loses25%damage each bounce; slow_orb retains a visible radius; claw_grab captures at most one small projectile with damage capped25; orbit_blades has per-target0.3sec contact cooldown; drill_contact has0.1sec tick with DPS conversion; flame_cone ticks0.1sec, applies burn on0.5sec per-target cooldown; reflect_guard only reflects flagged small bullets, never boss beams or mines. Player attack parameters override hostile defaults; do not reuse slow enemy rates on player guns accidentally.

## Enemy role contracts

Scout/Swarm: fixed path, low HP, no salvage signature. Interceptor: crosses screen twice, telegraphs before aimed volley. Shield barge: frontal shield50HP, rear joint30HP, core100base; killing joint disables shield, body remains. Cargo/fuel hauler: engine joint25HP, intact module integrity60; direct fuel damage creates environmental blast; intact capture gives baseline module selected from unlocked research pool. Fuel explosion never drops an intact signature weapon.

Minelayer: max4active mines per owner; owned mines expire visibly after owner death in2sec. Healer: can't heal core beyond max, no heal chain between healers and no regenerating a stolen part. Turret: stationary but destroyable base, authored boundary placement. Gravity anchor: force field canceled0.3sec after destruction with visible fade. Carrier: reinforcement cap and no XP from duplicate spawn IDs after save resume. Loot snatcher: cannot steal a currently fitted module or permanently erase a unique quest item; timer/provenance stays with stolen cargo.

E13/E23 beams always have1sec warning regardless of generic enemy default. E04/E11 have no damaging attack; still need collision avoidance and readable movement. Enemy body collision damage comes from SYSTEMS, not zero base_damage. All enemies leave screen bounds cleanly and remove owned orphaned target references.

## Boss scheduling

Each catalog boss attack list is an ordered loop. Compose primitive meanings (tail_sweep→telegraphed_sweep, claw_ring→ring_gap, rail_snipe/spinal_beam→segmented_beam, etc.) and document exact mapping in per-boss Resource. A code label without an authored mapping is unfinished content. Between attacks leave0.6sec recovery; never run two full-arena denial attacks simultaneously. At attack start lock its direction/target according to primitive. Phase transition2sec, clear harmful field hazards by visible dissolve, retain ordinary outgoing bullets until expiry unless explicitly dissolved during ending.

Every final boss presents a separate glowing charge-interrupt node for at least2windows of1.5sec before entering its fastest critical phase. Damage threshold20 per window, independent of salvage joint; interrupted attacks cancel their damaging emission and count Star C. If player kills earlier without2interrupts, mission still clears but C is unearned; replay remains possible. Don't shield core artificially until2interrupts solely to force objective.

Example B02 complete cycle:

1. Claw fan: two5shot fans with mirrored30° offsets; warning0.6sec; interval1.2sec.
2. Tail sweep: windup1.2sec, active1.2sec; turn25°/sec across60°; no aimed retarget after windup.
3. Tail vent: joint exposed2.5sec, integrity body still damageable; no new tail fire; small claw volley only.
4. If tail removed: cancel next tail events; recovery0.8sec; phase2 alternates ring_gap and lateral_charge with1sec warning. Joint stays gone.
5. At25% core: ring speed +10%, still same gap width; no reacquired tail. Two interrupt opportunities can occur in repeated claw charge cycle.

For B01 use claw_grab→side_dash→mine_fan; after claw removal mine_fan replaces grab. B04 uses stationary mortar loop before rail crawl, after loss mines only. B06 premarks lightning nodes, after wing theft replaces chain with sparse storm mines. B08 heal phase requires pipe targets and clear feedback when cut. B10 harpoon pull does not override dash or pull through obstacles. B12 rail can be baited into cover and heat vent opens after shot. B14 gravity force never exceeds cap even when fields overlap: combine then clamp. B16 segments have stable IDs and individual joint anchors; camera never zooms so far that core marker/hostile bullets disappear.

## Mission content authoring

The 48 catalog entries include deterministic wave seeds and distinct theme/role layouts. They are complete design seeds, not playtested final wave scripts. MissionDirector uses required_actors to spawn escort/supply/hazard objectives, not just the combat-wave list. Mission4 must supply at least3 salvage carriers and enough intact opportunities for2captures; they may appear as objective actors outside normal enemy waves. Escort has250HP, speed80, path checkpoints every30sec, visible arrival progress; if destroyed mission fails. Camera/layout must allow interception before damage.

P01-01 tutorial adds first guaranteed baseline engine-module salvage with reduced return fire; tutorial safe event does not farm fragments. Each role has authored choke points and broad lanes, but never close all exits. The seed fixes variations, not random objective availability.

Mission duration targets are pacing goals. If current waves finish too early, add themed interactions/wave choreography based on playtests; do not extend by forcing idle waits or inflating HP. Threat caps constrain active population; hold subsequent spawns until capacity, with visible progress so the player knows the remaining objective.

# ROCKET BREAKERS — Power-ups & spectacle expansion 1.1

Design date:2026-10-31. This additive specification is authorized by the owner's request for more effects, power-ups and diverse enemies. It extends the original 01–06 handoff and does not replace its save, salvage or physics rules. Claude should read this after AGENTS.md and SYSTEMS.md. All tuning is provisional, not playtested.

## Clarifying the intended game

เป้าหมายคือเกมยิงที่สนุกทันที: กระสุนหลากหลาย ระเบิดลุกลาม เก็บ Power Up แล้วรู้สึกเก่งขึ้น ศัตรูต่างพฤติกรรม บอสมีจุดอ่อน และยังมีระบบขโมยอาวุธเป็นเอกลักษณ์ การขโมยควรเป็นทางเลือกเพื่อของดี/รูปแบบการเล่นใหม่ ไม่บังคับให้ทุกฝูงศัตรูต้องหยุดเล็งข้อต่อ ผู้เล่นสายยิงกวาดยังผ่านด่านได้และพัฒนาผ่าน first-clear fragments ตามสเปกเดิม

Core action goal: roughly70% flying/shooting/dodging and30% selective targeting/salvage decision, to be adjusted by actual player feedback rather than a timer. Fitting occurs at safe docks. Do not pause for a build decision after every small enemy.

## What exists versus what is being made

The original design lists36weapons,24common enemies,16mini/bosses,12active abilities and13run-upgrade options. It does not mean all their artwork or code exists. The earlier four concept boards are visual references. This expansion supplies four separate static VFX source images and four additional concept boards/screens. There is no claim that the full art list or animation pipeline is complete.

The new Power Up objects are a distinct system from XP upgrade choices, permanent research, hull passives and stolen physical modules. Temporary pickups expire; unlocked research persists; XP choices persist to run end; physical salvage uses its existing state machine.

## 12 pickups and their behavior

The authoritative matching records are `data/powerups.json`. Use these exact IDs in saves and HUD. Duration is simulation time; pause/docking/background suspends it. Icon boards are references, not cut-and-ship production icons.

| ID | Power Up | Effect |
|---|---|---|
| PU01 | TRIPLE SHOT |8sec: primary compatible ballistic trigger gains2side shots at±12°, each40%of normal projectile damage; original center unchanged. Side shots cannot create more side shots. |
| PU02 | LASER CORE |10sec: equipped beam weapons get+15%damage,+15%range; energy/heat unchanged. Does not turn all weapons into beams. |
| PU03 | MISSILE SWARM |12sec: support rack fires2homing missiles every1.5sec,10damage each,45blast radius, turn cap90°/sec; one support rack total. |
| PU04 | CHAIN ARC |8sec: once/sec, primary impact adds arc10damage with2hops at×0.75; no arc recursion; selects enemy body/core, never automatically aims at valuable salvage joints. |
| PU05 | SHIELD |Restore25shield up to normal max; excess grants temporary overshield up to25 lasting10sec. Never extends invulnerability. |
| PU06 | REPAIR |Restore20core HP, then10integrity to most damaged fitted module; cannot resurrect a destroyed/detached module. No damage-stat rollback for star objectives. |
| PU07 | MAGNET |12sec: attract ordinary scrap/credits/XP within220px. Never auto-bank fragments, capture boss modules or pull hazardous mines. |
| PU08 | COOLANT |Immediately reduce each equipped gun heat by35; +20%cooling8sec. Cannot bypass minimum0.8sec overheat lock. |
| PU09 | OVERDRIVE CELL |Add25Overdrive charge to maximum100. Pickup doesn't auto-activate; active Overdrive duration not extended. |
| PU10 | DRONE WING |12sec:2temporary escort drones,6damage/shot, each1shot/sec; drones are support effect actors and do not occupy inventory or grant permanent blueprints. |
| PU11 | FUSION CORE |Use original fusion eligibility rules, max1carried, no sale value, expire at run end. Guaranteed eligible mission cache remains; not a random way to farm permanent fragments. |
| PU12 | SCRAP CACHE |Grant15unbanked scrap to current-leg reward ledger once/pickup instance. Must still settle/extract; no immediate permanent duplicate award. |

### Stacking and compatibility

Same pickup refreshes remaining duration to its configured duration, never adds indefinitely or increases intensity. Distinct timed buffs coexist; maximum offensive support emitters2 (missile rack + drone wing). All buff icons remain visible; overflow becomes a compact row, not hidden expiration. Side-shot multiplier and beam bonus multiply only relevant base shots; fusion/echo/chain descendants cannot recursively spawn their parent effects. Tag shot ancestry and proc eligibility explicitly.

Do not spawn PU01 when no equipped ballistic weapon supports extra projectiles, or PU02 with no beam. If the player's loadout changes after spawn and becomes incompatible, picking it gives10Overdrive charge with explicit `Converted +10` label. Never silently discard it. Core/shield pickups remain visible even if full; brief full-health/full-shield indicator is sufficient.

High-impact temporary buffs do not persist into next expedition leg; saved mid-leg resume restores exact remaining time and emitter cooldown. Physical modules/persistent research remain governed by the original spec.

### Drop design and fairness

No real-money random power-ups. Mission-authored containers guarantee at least one valid offensive pickup and one defensive/resource pickup in standard missions, with first available within first30sec. Boss arenas schedule a visible rescue pickup after a completed risky attack, not behind a wall of active bullets.

Ordinary enemies share a seeded drop accumulator, not independent unbounded luck: +0.04per eligible kill; threshold1generates one eligible pickup and subtracts1. Elite kill +0.25; cap one proc per enemy source ID. Mission-authored drops are independent and do not increment the accumulator. Maximum6live ordinary pickup objects; hold next planned drop in queue instead of erasing an existing pickup. Gameplay loot24cap from original spec includes these. Timer15sec, blink replaced by steady countdown ring in reduced-flash mode; last5sec shows readable fading ring. Signature salvage follows its separate40sec rule.

Use deterministic weighted selection of compatible PU01..10/12; PU11 only authored cache or boss/expedition rule. Weights: offensive total40%, survival40%, resources20%; near-critical core≤30%bias survival to60%but do not change enemy damage or fake a guaranteed save. Record applied drop RNG/state so reload does not reroll. One low-HP aid can happen per60sec, shown as ordinary drop, with no paid trigger.

## Effects that sell the action

Every weapon has firing, travel/area, impact and death-response layers. Static source images are not sufficient alone: Claude must combine them with particles, lifetime curves, rotation, scales, audio and code trails.

| Event | Required runtime layers | Constraint |
|---|---|---|
| Kinetic volley | short flash, streak, barrel recoil, metal hit sparks | friendly shots visually lighter than hostile danger |
| Missile swarm | smoke ribbons, acceleration, bounded turn, small blast | trails don't obscure incoming bullets |
| Laser | charge glint, narrow core, wider soft beam, endpoint sparks | damage width matches narrow visible core |
| Plasma | bright head, curved trail, ember splatter | trail is visual, no unexpected trailing collision |
| Ion chain | jagged line per edge, target spark, short glow | only visible arcs between actual affected targets |
| Shield hit | localized hex ripple and HP flash | shield circle not an opaque screen cover |
| Enemy destruction | flash, flame, smoke, metal shards, shockwave, score | high-contrast hostile bullets draw over smoke |
| Joint break | metal snap, ring sparks, detached-part drift | no fake screen-filling blast hiding cargo |
| Tractor | moving motes, spring cable, cargo outline, strain indicator | cable danger sign comes before snap |
| Power Up collection | icon burst, color ring, short text, buff HUD pop | maximum2pickup texts at once, combine duplicates |
| Overdrive | engine surge, weapon highlight, local color grade and audio swell | no mandatory full-screen white strobes |
| Boss part break | large localized burst, piece movement, attack cancellation cue | keep surviving core and safe corridor visible |

Default hitstop: ordinary kill0; elite break0.035sec; boss sever0.06sec, cooldown0.5sec. Pause simulation consistently for hitstop, including cargo timers. Shake max4logical px for ordinary explosion,8boss; player can set0. No more than2large overlapping explosion cards; additional blasts use smaller particles and audio priority. Damage, collision and proc counts must be identical across graphics modes.

## Enemy diversity to implement

The original24enemy catalog remains authoritative. The new board visualizes12roles: Scout, Interceptor, Shield Barge, Missile Frigate, Minelayer, Cable Cutter, Beam Sentry, Fuel Hauler, Root Healer, Gravity Anchor, Loot Snatcher, Drone Carrier. Map displayed captions to catalog IDs by role, not by creating another roster of12duplicate enemies.

Build wave variety using role combinations: scout swarm+shield anchor; mines+interceptor crossing; healer+armor carrier; cable cutter+salvage cargo; gravity anchor+slow artillery. First introduce each counter alone, then combine. At most one newly taught hazard and one new enemy role in a tutorial wave. Body shapes must predict behavior; recolor alone is not a new enemy.

The six-boss board visualizes existing B02/B06/B08/B10/B12/B16. It adds no new boss count. Each depicted amber joint must correspond to a real detachable signature module defined in catalog. Player-normalized module art is a separate production requirement; concept miniatures are not automatically the final sprite.

## Asset status and integration

`fx_explosion.png`, `fx_ion.png`, `fx_shield.png`, `fx_plasma.png` are single static source-keyframe candidates. Inspect actual alpha and downscaled edge readability; use the transparency report to decide material setup. They are not approved flipbooks, and a smoke/fire static card must not be sold as completed animation. Preserve originals, tune in engine, request temporal source frames only where needed.

The other four files are reference boards: powerups_board, enemies_board, gameplay_powerup, bosses_board. Their labels/backgrounds are intended presentation and are not sprite pixels. Request isolated icons/actors in subsequent batches using exact asset IDs and anchors. Do not auto-slice a decorated board into supposed final art.

`art_generation_prompts.json` records exact generation prompts used in this task. `art_manifest.json` tracks file provenance, kind and review state. Effects have transparent-background intent; report actual alpha rather than assume output meets intent. No production alpha fix may destroy glow by treating all black pixels as background.

`data/vfx_recipes.json` supplies18runtime assembly recipes using the four source textures plus procedural sparks/rings/cables. These are behavior specifications, not pre-rendered18animations. Low-effects mode reduces cosmetic particle counts; it does not reduce damage, pickup value or enemies. All recipe sources must resolve before enabling the corresponding renderer.

Known concept-board correction: the TRIPLE SHOT item drawing contains4small bullet motifs. Keep the three-projectile gameplay definition; request exactly3motifs for its isolated production icon. Do not alter mechanics to match incidental board decoration.

## Claude implementation sequence

1. Keep M1 salvage slice functional; add PU01/PU05/PU07/PU09 and one explosion first.
2. Implement shared buff manager and emitter/proc ancestry, then other pickups; add one-second debug duration mode for quick expiry tests.
3. Integrate VFX sources through asset resolver; add particles/trails and high-contrast hostile pass.
4. Add enemy role combinations without exceeding original threat budgets. Show the same action at low/high effects settings.
5. Playtest whether pickups feel strong and understandable without making precise stealing impossible. Reduce incidental splash near locked salvage modules if necessary through aim choices, never secretly invulnerable modules.

## Meaningful acceptance checks

- Collecting same timed buff refreshes duration, not infinite stacking; pause/save/reload preserves time.
- Incompatible offensive pickup converts exactly once; a loadout swap cannot farm charge.
- Chain/echo/side-shot procs never recursively create unbounded projectiles.
- Magnet leaves signature salvage/mines untouched; no fragment reward until valid settlement.
- Repair doesn't erase core damage recorded for stars. Shield doesn't create infinite invulnerability.
- Same pickup UUID settles once through a crash/reload; defeat/extraction correctly apply unbanked scrap.
- Eight pickup buffs at once do not hide the player or red bullets, and graphics preset does not change collisions.
- New source art gets accurate status; concept sheets never count as delivered production sprites.

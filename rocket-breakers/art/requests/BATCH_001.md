# BATCH_001 — Production starter assets for M1

Status: REQUEST READY; no production images below have been generated in this handoff.

Owner workflow: ส่งไฟล์นี้พร้อม `art/concepts/modular_ships.png` และ `art/concepts/salvage_sequence.png` ให้ ChatGPT เพื่อสร้างภาพทีละasset/ชุดที่กล้องและขนาดตรงกัน ภาพแรกตรวจทิศทางให้ตรงก่อนต่อstates ไม่ต้องให้ Claudeเดาว่าสามารถเรียกChatGPTเอง

## Shared prompt

Original ROCKET BREAKERS premium 2.5D spaceship sprite, strict top-down orthographic, nose up, consistent upper-left light, ivory/charcoal/orange player materials and cyan ownership light, crisp silhouette readable at small scale, no pixel art, no text/logos/watermarks, no floor, generous transparent padding, isolated production source. Use supplied concept as visual reference only. Keep detachable guns separated from base hull. Real alpha background, no checkerboard baked in. Match canvas, pivot, scale and socket specification; return original PNG.

## Eight source images

| # | Asset ID / filename | Canvas | Request / pivot |
|---|---|---|---|
| 1 | hull_H01 / rb_hull_h01_neutral_000.png |1024²| SPARROW bare central hull, no guns/engine plume; reactor center(512,560); ship nose near(512,170), visible hull fits x300..724,y170..850 |
| 2 | hull_H01_engine_glow / rb_hull_h01_engine_glow_000.png |1024²| separate cyan engine-light overlay matching image1; emitter(512,825); no ship body; transparent feathered glow |
| 3 | weapon_W001 / rb_weapon_w001_idle_000.png |512²| small single needle cannon, muzzle(256,85), attachment(256,400), entire object within80..432; no muzzle flash |
| 4 | weapon_W008 / rb_weapon_w008_idle_000.png |512²| slim pulse-laser barrel, cyan lens, muzzle(256,70), attachment(256,420); no beam |
| 5 | weapon_W022 / rb_weapon_w022_idle_000.png |512²| compact stolen mechanical scorpion tail cannon, violet emitter, charcoal plates; attachment(256,420), muzzle near(256,85); segments fit footprint1×2 after scaling; no huge full boss |
| 6 | boss_B02_core / rb_boss_b02_core_000.png |1024²| scorpion torso and legs only, graphite/red; no tail and no detachable claws baked into body; core(512,530), tail joint socket(512,210), claw sockets(280,590),(744,590) |
| 7 | boss_B02_joint / rb_boss_b02_joint_000.png |512²| separate circular hinge coupling that visibly links tail to core; mechanical outer metal and glowing amber inner ring; pivot(256,256); no surrounding body |
| 8 | fx_tractor_mote / rb_fx_tractor_mote_000.png |512²| one cyan soft energy streak/mote with bright core, useful as repeated moving cable particle; centered, no cable/ship/background, transparent edge |

Targets are production registration goals, not an assurance that image generation gives exact pixel positions. After return, Claude overlays requested anchors, normalizes crops/padding without changing artwork, writes sidecars and flags any mismatch requiring regenerated art. Do not ship source board captions as sprite pixels.

BATCH_002 after reference acceptance: separate boss claws/armor/damage overlays, E01/E03 isolated sprites, joint-break/impact raster frames. BATCH_003: P01 parallax layers and HUD icons. Effects can use labeled procedural textures during M1; don't block functional prototype until all flipbooks arrive.

## Acceptance

Check actual alpha and source dimensions, nose up, matching sockets, no baked weapons in bare hull, same W022 identity on boss and player normalized variant, 22px grid scale fit, crisp visibility at phone size. Save original and normalized copy; no overwriting original source. Set manifest approved only after visual inspection, then integrated after engine test. Failed coordinate alignment alone can be repaired by documented non-generative translation/scaling before asking for regeneration.

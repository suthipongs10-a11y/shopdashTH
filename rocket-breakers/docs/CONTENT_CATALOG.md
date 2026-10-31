# Complete content catalog

Generated from `data/catalog.json`; update JSON then regenerate this view. All values are initial design tuning. Runtime behavior rules are in SYSTEMS.md.

## 12 hulls

| ID | Name | HP / Shield | Speed / Mass / Regen | Unlock | Passive |
|---|---|---|---|---|---|
| H01 | SPARROW | 100/25 | 360/28/14 | First clear starter | เครดิตกู้ชิ้นส่วน +10%; ไม่มีโบนัสโจมตี |
| H02 | KESTREL | 80/20 | 430/22/13 | P01-03 | Dash cooldown -15%; ความเร็วสูงแต่แบกน้อย |
| H03 | BASTION | 150/15 | 290/42/15 | P02-06 | เกราะ core +20; พื้นที่ปืนหน้ากว้าง |
| H04 | MAGPIE | 100/30 | 340/34/14 | P01-06 | ช่องเก็บ3; tow speed penalty ×0.8 |
| H05 | HIVE | 90/35 | 325/30/17 | P04-03 | โดรนที่ติดตั้งกลับมาซ่อมเร็วขึ้น20%; max drone count +1 |
| H06 | CHIMERA | 110/25 | 330/38/17 | P03-06 | ติดอาวุธ3ตระกูลต่างกัน: พลังงานฟื้น +10% ไม่ซ้อน |
| H07 | LANCER | 95/20 | 385/28/15 | P06-03 | รับแรงถีบลด40%; ยิง charge หลัง dash +10% damage 1shot |
| H08 | MIRAGE | 80/45 | 390/25/15 | P03-03 | เมื่อ dash สร้าง decoy 1sec, cooldown6sec |
| H09 | ANCHOR | 130/25 | 300/40/16 | P07-03 | แรงเขต gravity ที่กระทำลด50%; ไม่ immune |
| H10 | BULWARK | 120/60 | 305/36/14 | P05-06 | โล่ฟื้นหลังไม่โดน3sec แทน4; หันโล่ช้าลง |
| H11 | COMET | 90/25 | 400/27/16 | P02-03 | cooling +20%; heat lock ยังคงทำงาน |
| H12 | RELIQUARY | 110/40 | 335/40/18 | P08-06 | อาวุธ signature1ชิ้นที่เลือกใช้พลังงานลด15% |

## 36 weapons

Damage is per projectile; values with `damage_per_second` in special parameters are DPS while active. Energy/heat per trigger, projectiles count per trigger.

| ID | Name / ชื่อ | Family / model | Damage × count @ triggers/sec | Energy / Heat / Mass | Behavior |
|---|---|---|---|---|---|
| W001 | Needle Cannon / ปืนเข็มเจาะ | kinetic / straight_burst | 8 × 1 @ 8 | 0.8/2/3 | {"speed": 900, "pierce": 0, "spread_deg": 0} |
| W002 | Scatter Fan / ปืนพัดกระจาย | kinetic / fan | 6 × 5 @ 2 | 3/9/5 | {"speed": 780, "spread_deg": 32} |
| W003 | Rail Lance / ปืนรางทะลวง | kinetic / charge_rail | 80 × 1 @ 0.7 | 9/28/7 | {"charge_sec": 0.5, "pierce": 3, "recoil": 70} |
| W004 | Ricochet Disc / จานชิ่งสะท้อน | kinetic / ricochet | 16 × 1 @ 2.5 | 2/5/4 | {"speed": 650, "bounces": 2, "walls_only": true} |
| W005 | Gatling Rotor / ปืนกลโรเตอร์ | kinetic / spool_gatling | 5 × 1 @ 14 | 0.45/1.5/5 | {"spool_sec": 1.2, "spread_deg": 8} |
| W006 | Burst Repeater / ปืนชุดสามนัด | kinetic / straight_burst | 10 × 3 @ 2 | 3/7/4 | {"burst_interval": 0.07, "speed": 850} |
| W007 | Flak Bloom / ปืนสะเก็ดอากาศ | kinetic / timed_flak | 20 × 1 @ 2 | 3/10/5 | {"fuse_sec": 0.5, "blast_radius": 65} |
| W008 | Pulse Laser / เลเซอร์จังหวะ | beam / pulse_beam | 15 × 1 @ 3 | 1.5/5/4 | {"range": 680, "pulse_duration": 0.08} |
| W009 | Prism Splitter / ปริซึมแยกแสง | beam / split_beam | 11 × 3 @ 2 | 4/8/6 | {"spread_deg": 20, "range": 550} |
| W010 | Sweep Cutter / เลเซอร์กวาด | beam / sweep_beam | 30 × 1 @ 1 | 7/14/6 | {"damage_semantics": "damage_per_second", "duration": 0.7, "sweep_deg": 45} |
| W011 | Seeker Pod / กระเปาะจรวดติดตาม | missile / bounded_homing | 30 × 1 @ 1.2 | 3/10/5 | {"turn_deg_sec": 100, "blast_radius": 45, "speed": 480} |
| W012 | Cluster Rack / แท่นจรวดแตกกลุ่ม | missile / cluster | 12 × 4 @ 1 | 5/12/7 | {"split_after_sec": 0.5, "blast_radius": 32, "speed": 450} |
| W013 | Torpedo Drill / ตอร์ปิโดเจาะ | missile / armor_piercer | 65 × 1 @ 0.7 | 6/18/7 | {"pierce": 2, "armor_ignore_fraction": 0.35, "speed": 500} |
| W014 | Plasma Globe / ลูกพลาสมา | plasma / slow_orb | 40 × 1 @ 1.2 | 4/11/5 | {"speed": 350, "blast_radius": 55} |
| W015 | Arc Fork / ง่ามสายฟ้า | electric / chain_arc | 18 × 1 @ 2 | 4/8/5 | {"hops": 3, "hop_range": 100, "hop_multiplier": 0.75} |
| W016 | Ion Needle / เข็มไอออน | electric / status_bolt | 12 × 1 @ 4 | 1.5/4/4 | {"status": "ion", "speed": 800} |
| W017 | Flame Ribbon / ริบบิ้นเพลิง | thermal / flame_cone | 20 × 1 @ 1 | 6/16/5 | {"damage_semantics": "damage_per_second", "duration": 0.8, "range": 220, "status": "burn"} |
| W018 | Frost Shard / เกล็ดเยือกแข็ง | cryo / status_bolt | 12 × 2 @ 3 | 3/6/4 | {"spread_deg": 12, "status": "chill", "speed": 650} |
| W019 | Gravity Seed / เมล็ดแรงโน้มถ่วง | gravity / gravity_field | 8 × 1 @ 0.6 | 8/16/7 | {"damage_semantics": "damage_per_second", "duration": 2, "radius": 100, "force": 90, "max_fields": 1} |
| W020 | Wasp Bay / รังโดรนต่อ | drone / orbit_drone | 7 × 2 @ 3 | 3/6/6 | {"drone_count": 2, "orbit_radius": 80, "projectiles_per_trigger_is_total": true} |
| W021 | Rivet Claw / ก้ามยิงหมุด | tractor / claw_grab | 35 × 1 @ 1.1 | 4/12/6 | {"range": 180, "hold_sec": 0.6, "boss_grab": false, "grabs_projectile": true} |
| W022 | Scorpion Tail / หางพลาสมาแมงป่อง | plasma / curved_plasma | 45 × 1 @ 1.1 | 5/14/7 | {"curve_deg": 25, "speed": 500, "blast_radius": 45} |
| W023 | Ram Furnace / หัวกระแทกเตาหลอม | thermal / charge_tool | 60 × 1 @ 0.8 | 6/18/7 | {"contact_range": 80, "status": "burn", "telegraph_sec": 0.3} |
| W024 | Magma Mortar / ครกแมกมา | thermal / lob_pool | 25 × 1 @ 0.8 | 6/17/8 | {"blast_radius": 65, "pool_dps": 6, "pool_sec": 2, "max_pools": 2} |
| W025 | Kite Mirror / ปีกเลเซอร์ว่าว | beam / reflect_guard | 18 × 1 @ 2 | 4/10/6 | {"reflection_window": 0.2, "reflectable": "small_bullets_only", "returned_damage_cap": 25, "cooldown_reflect": 2} |
| W026 | Storm Wing / ปีกพายุสายฟ้า | electric / chain_arc | 22 × 1 @ 1.8 | 5/12/7 | {"hops": 4, "hop_range": 110, "hop_multiplier": 0.75} |
| W027 | Thorn Scythe / เคียวหนาม | melee / sweep_tool | 42 × 1 @ 1.2 | 4/12/6 | {"range": 160, "sweep_deg": 100, "can_cut_mines": true} |
| W028 | Root Nursery / รังโดรนรากเหล็ก | drone / launch_tether_drone | 9 × 3 @ 3 | 5/10/8 | {"drone_count": 3, "tether_range": 240, "projectiles_per_trigger_is_total": true} |
| W029 | Prism Antler / เขาผลึกหักเห | beam / ricochet_beam | 30 × 1 @ 1.6 | 5/12/6 | {"bounces": 2, "range": 650, "marked_surfaces_only": true} |
| W030 | Glacier Harpoon / ฉมวกธารน้ำแข็ง | cryo / tether_harpoon | 48 × 1 @ 0.8 | 5/14/7 | {"status": "chill", "pull_nonboss_force": 120, "range": 420} |
| W031 | Bore Drill / สว่านเจาะแกน | melee / drill_contact | 45 × 1 @ 1 | 5/14/7 | {"damage_semantics": "damage_per_second", "duration": 0.7, "range": 120, "armor_ignore_fraction": 0.5} |
| W032 | Siege Rail / รางปืนล้อม | kinetic / charge_rail | 100 × 1 @ 0.5 | 10/32/9 | {"charge_sec": 0.9, "pierce": 4, "recoil": 80} |
| W033 | Orbit Ring / วงแหวนวงโคจร | drone / orbit_blades | 16 × 2 @ 2 | 4/10/7 | {"orbit_radius": 75, "intercept_bullets_per_sec": 2, "projectiles_per_trigger_is_total": true} |
| W034 | Singularity Jaw / เขี้ยวเอกฐาน | gravity / gravity_collapse | 50 × 1 @ 0.6 | 9/24/9 | {"radius": 110, "pull_sec": 0.8, "force": 110, "boss_force_multiplier": 0.15} |
| W035 | Mirror Wing / ปีกสะท้อนคราส | beam / delayed_echo | 24 × 1 @ 1.6 | 5/12/7 | {"echo_delay": 0.3, "echo_damage_fraction": 0.5, "copies": "own_shot_only", "no_recursive_echo": true} |
| W036 | Devourer Spinal Cannon / ปืนสันหลังผู้กลืนกิน | plasma / segmented_beam | 70 × 1 @ 0.6 | 10/26/10 | {"charge_sec": 0.7, "range": 800, "segments": 3, "joint_bonus": 0.2} |

## 16 encounters and stolen signatures

### B01 — Rivet Crab / ปูหมุดเหล็ก

- Sector/role: P01 / mini_boss; core HP 550; joint HP 78; module integrity 115.
- Steal: ก้ามหน้า → W021; ability unlock: A01.
- Expose: หลบก้ามหนีบแล้ว joint เปิด2sec.
- Yours: จับกระสุนเล็กแล้วเหวี่ยงคืนแบบdamage cap.
- After removal: ก้ามหาย → วิ่งข้างยิงหมุดสลับเส้น.
- Full-kit attacks: claw_sweep, aimed_rivets.

### B02 — Scorpion Reclaimer / แมงป่องผู้ทวงคืน

- Sector/role: P01 / boss; core HP 1200; joint HP 78; module integrity 115.
- Steal: หางพลาสมา → W022; ability unlock: A02.
- Expose: หลบ plasma sweep ครบแล้วjointฐานหางเปิด2.5sec.
- Yours: หางยิงพลาสมาโค้งเลือกข้อต่อศัตรู.
- After removal: หางหาย → ใช้ก้ามสร้างวงกระสุนเว้นช่องกว้าง.
- Full-kit attacks: tail_sweep, claw_fan.

### B03 — Furnace Ram / แกะเตาหลอม

- Sector/role: P02 / mini_boss; core HP 680; joint HP 96; module integrity 130.
- Steal: หัวกระแทก → W023; ability unlock: A03.
- Expose: ล่อ chargeชนแผ่นเหล็ก ฉนวนjointแตก.
- Yours: หัวชนพ่นไฟระยะสั้นพร้อมแรงถีบ.
- After removal: หัวหาย → พ่นไอร้อนข้างลำช้าลง.
- Full-kit attacks: warned_charge, vent_cone.

### B04 — Forge Centipede / ตะขาบโรงหลอม

- Sector/role: P02 / boss; core HP 1450; joint HP 96; module integrity 130.
- Steal: ครกแมกมาหลัง → W024; ability unlock: A04.
- Expose: ทำลายตัวล็อก2ด้านเผยjointป้อมครก.
- Yours: ยิงลูกแมกมาทิ้งพื้นที่เผา.
- After removal: ครกหาย → ปล้องเคลื่อนสลับและวางกับระเบิด.
- Full-kit attacks: mortar_lob, rail_crawl.

### B05 — Kite Sentinel / ว่าวพิทักษ์

- Sector/role: P03 / mini_boss; core HP 810; joint HP 114; module integrity 145.
- Steal: ปีกกระจก → W025; ability unlock: A05.
- Expose: รอม่านสะท้อนพักหลังยิง3ชุด.
- Yours: ปีกป้องกัน/สะท้อนกระสุนเล็กช่วงสั้น.
- After removal: ปีกหาย → หมุนยิงเข็มด้านเดียวตามช่องว่าง.
- Full-kit attacks: reflect_window, aimed_needle.

### B06 — Storm Ray / กระเบนจ้าวพายุ

- Sector/role: P03 / boss; core HP 1700; joint HP 114; module integrity 145.
- Steal: ปีกสายฟ้า → W026; ability unlock: A06.
- Expose: หยุดจ่ายไฟจากshield pylonแล้วjointเปิด.
- Yours: สายฟ้าชิ่งระหว่างศัตรู.
- After removal: ปีกหาย → ทิ้งทุ่นไฟฟ้าแทนสายฟ้ากวาด.
- Full-kit attacks: ion_sweep, chain_nodes.

### B07 — Thorn Mantis / ตั๊กแตนหนามเหล็ก

- Sector/role: P04 / mini_boss; core HP 940; joint HP 132; module integrity 160.
- Steal: แขนเคียว → W027; ability unlock: none.
- Expose: หลบslashสองครั้ง ทำjointแขนร้อนแดง.
- Yours: เคียวกวาดตัดทุ่นระเบิดระยะใกล้.
- After removal: แขนหาย → กระโดดถอยยิงหนามเว้นช่วง.
- Full-kit attacks: double_slash, thorn_fan.

### B08 — Root Cathedral / มหาวิหารรากเหล็ก

- Sector/role: P04 / boss; core HP 1950; joint HP 132; module integrity 160.
- Steal: รังโดรน → W028; ability unlock: A07.
- Expose: ยิงท่อเลี้ยง2เส้นหยุดซ่อมแล้วเผยjoint.
- Yours: ปล่อยโดรนสายโยงติดตามเล็ง.
- After removal: รังหาย → หยุดฮีลแต่ปล่อยรากปิดเส้นทางมีเตือน.
- Full-kit attacks: drone_cloud, regeneration.

### B09 — Prism Stag / กวางเขาผลึก

- Sector/role: P05 / mini_boss; core HP 1070; joint HP 150; module integrity 175.
- Steal: เขาปริซึม → W029; ability unlock: A08.
- Expose: รอ beamชนผลึกกลางคืนแสงเข้าข้อต่อ.
- Yours: ยิงbeamสะท้อนพื้นผิวที่ทำเครื่องหมาย.
- After removal: เขาหาย → กระสุนผลึกสามสายแทนbeam.
- Full-kit attacks: bounce_beam, shard_fan.

### B10 — Glacier Leviathan / เลวีอาธานน้ำแข็ง

- Sector/role: P05 / boss; core HP 2200; joint HP 150; module integrity 175.
- Steal: ฉมวกเยือกแข็ง → W030; ability unlock: A09.
- Expose: หลบฉมวกเสียบกำแพงให้jointเปิด.
- Yours: ฉมวกชะลอและดึงศัตรูเล็กเข้าหา.
- After removal: ฉมวกหาย → เส้นน้ำแข็งเลื่อนพร้อมsafe lane.
- Full-kit attacks: harpoon_pull, frost_breath.

### B11 — Bore Mole / ตุ่นสว่าน

- Sector/role: P06 / mini_boss; core HP 1200; joint HP 168; module integrity 190.
- Steal: หัวสว่าน → W031; ability unlock: none.
- Expose: ล่อให้เจาะก้อนแร่แข็งแล้วjointค้าง.
- Yours: สว่านระยะประชิดเจาะเกราะ.
- After removal: หัวหาย → ขุดถอยและขว้างเศษหิน.
- Full-kit attacks: drill_charge, burrow_marker.

### B12 — Sand Bastion / ป้อมทราย

- Sector/role: P06 / boss; core HP 2450; joint HP 168; module integrity 190.
- Steal: รางปืนล้อม → W032; ability unlock: A10.
- Expose: ทำลายแผงระบายหลังชาร์จ railเปิดjoint.
- Yours: ปืนรางแรงถีบสูง chargeชัด.
- After removal: ปืนหาย → ป้อมย่อยกระจายและหมุนเกราะ.
- Full-kit attacks: rail_snipe, shield_walls.

### B13 — Orbit Warden / ผู้คุมวงโคจร

- Sector/role: P07 / mini_boss; core HP 1330; joint HP 186; module integrity 205.
- Steal: วงแหวนใบมีด → W033; ability unlock: none.
- Expose: ทำลาย anchor satelliteลดวงโคจรเผยjoint.
- Yours: วงแหวนหมุนยิง/สกัดกระสุนจำกัด.
- After removal: วงแหวนหาย → ยิงดาวเทียมออกเป็นลูกตรง.
- Full-kit attacks: orbit_blades, gravity_pull.

### B14 — Singularity Serpent / อสรพิษเอกฐาน

- Sector/role: P07 / boss; core HP 2700; joint HP 186; module integrity 205.
- Steal: เขี้ยวแรงดึง → W034; ability unlock: A11.
- Expose: หลบ collapseแล้วช่องปากjointเปิด.
- Yours: สร้างหลุมดึงก่อนระเบิดวงแคบ.
- After removal: เขี้ยวหาย → สลับสนามแรงโน้มถ่วงที่มีเส้นขอบ.
- Full-kit attacks: singularity_pulse, curved_fan.

### B15 — Mirror Admiral / พลเรือเอกกระจก

- Sector/role: P08 / mini_boss; core HP 1460; joint HP 204; module integrity 220.
- Steal: ปีกสะท้อน → W035; ability unlock: A12.
- Expose: ทำลายdecoyถูกตัว3ครั้งเผยjointตัวจริง.
- Yours: ยิงechoของชุดยิงตัวเองหนึ่งครั้ง.
- After removal: ปีกหาย → decoyหายแต่ใช้จรวดแยกทิศ.
- Full-kit attacks: echo_volley, mirror_decoys.

### B16 — Iron Devourer / ผู้กลืนกินเหล็ก

- Sector/role: P08 / boss; core HP 2950; joint HP 204; module integrity 220.
- Steal: ปืนสันหลัง → W036; ability unlock: none.
- Expose: ยิงตัวล็อกเกราะ3จุดบนปล้องที่ทำเครื่องหมาย.
- Yours: ลำแสงสันหลังแบ่ง3ช่วง เน้นตัดjoint.
- After removal: ปืนหาย → ปล้องแตกแนวและยิงfanจากช่องข้าง.
- Full-kit attacks: spinal_beam, segmented_coil.

## 12 active abilities

| ID | Name | Effect | Cooldown / Duration | Unlock |
|---|---|---|---|---|
| A01 | Tractor Burst / คลื่นแม่เหล็ก | ดึง intact cargo ในรัศมี220เข้ามา100px; ไม่ auto secure; ไม่ดึง boss | 18/0.4 | B01 |
| A02 | Phase Slip / พุ่งเฟส | เคลื่อนผ่านกระสุน0.35sec; ไม่ผ่านกำแพง; ใช้ immunity cap ร่วม dash | 16/0.35 | B02 |
| A03 | Thermal Vent / ระบายความร้อน | ลด heat ของปืนที่ติดตั้ง40ทันที; ไม่เติม Overdrive | 18/0 | B03 |
| A04 | Shockwave / คลื่นกระแทก | ผลักศัตรูเล็กและทำลาย small bullets ในรัศมี160; ไม่ลบลำแสง | 22/0.3 | B04 |
| A05 | Decoy Beacon / สัญญาณลวง | สร้างเป้าเทียม2.5secรับ aimed attacks ที่เริ่มเล็งหลังใช้ | 20/2.5 | B05 |
| A06 | EMP Pulse / คลื่นEMP | หยุดการชาร์จปืนศัตรูเล็ก1sec; boss delay0.3secหนึ่งครั้งต่อใช้ | 24/1 | B06 |
| A07 | Repair Drones / โดรนซ่อม | ซ่อม core20 และ moduleที่เสียหายสุด15 ใน3sec; ถูกยิงไม่ยกเลิก | 30/3 | B08 |
| A08 | Prism Guard / ม่านปริซึม | โล่หน้า25หน่วย2sec; ไม่สะท้อน beam และไม่ invulnerable | 24/2 | B09 |
| A09 | Cryo Brake / เบรกเยือกแข็ง | หยุด inertia ตัวเองทันทีและ slow enemyใน120px 20% 1.5sec; boss15% | 16/1.5 | B10 |
| A10 | Siege Anchor / สมอตั้งยิง | ลด movementเหลือ60% 3sec; recoil0; rail chargeเร็ว20% | 22/3 | B12 |
| A11 | Gravity Well / บ่อแรงโน้มถ่วง | สร้าง field radius100 2sec ดึงศัตรูเล็กและเบน bulletsแบบ capped; no immunity | 26/2 | B14 |
| A12 | Echo Volley / ชุดยิงสะท้อน | บันทึกอาวุธprimaryแล้วจำลองหนึ่งชุดหลัง0.4sec ที่50%damage; no fusion recursion | 20/0.4 | B15 |

## 12 utilities

| ID | Name | Effect | Mass | Unlock |
|---|---|---|---|---|
| T001 | Patch Plating | core armor +10 | 3 | starter |
| T002 | Capacitor | reactor capacity +20 | 3 | P01-02 |
| T003 | Radiator | cooling ×1.15 | 3 | P02-02 |
| T004 | Shield Petal | shield +15; regen unchanged | 4 | P02-02 |
| T005 | Booster Fin | base_speed +6%; massยังนับ | 2 | P03-02 |
| T006 | Tow Winch | tow acquisition -0.15sec; min0.3 | 3 | starter |
| T007 | Cargo Cradle | cargo protection: damage taken×0.75 | 4 | P04-02 |
| T008 | Target Lens | joint lock acquisition +40px; damage unchanged | 2 | P04-02 |
| T009 | Repair Pod | safe dockซ่อมcore5หนึ่งครั้งต่อwave | 4 | P05-02 |
| T010 | Insulator | zone force and chill duration ×0.8 | 3 | P05-02 |
| T011 | Drone Relay | drone leash +40px; maxcount unchanged | 3 | P06-02 |
| T012 | Fusion Coupler | เปิดfusion recipe choiceเมื่อเงื่อนไขครบ; ไม่เพิ่มstat | 5 | P06-02 |

## 8 fusions

| ID | Name | Host + catalyst | Effect |
|---|---|---|---|
| F01 | Prism Storm | beam + electric | ลำแสงชิ่ง3เป้าหมาย แต่ละhop×0.75 |
| F02 | Event Horizon | missile + gravity | ดึง0.6secก่อนblast radius110; max1field |
| F03 | Ember Swarm | drone + thermal | โดรนพ่นไฟระยะ100 แทนกระสุน |
| F04 | Frostbreaker | kinetic + cryo | กระสุนชนศัตรูchillแล้วแตก3เกล็ด; no recursion |
| F05 | Solar Drill | melee + thermal | สว่านทิ้งburnโดยไม่เพิ่มrange |
| F06 | Thunder Petal | plasma + electric | orbแตกแล้วช็อต2เป้าหมาย; no self bounce |
| F07 | Orbit Siphon | drone + gravity | โดรนวนดึงศัตรูเล็ก; force cap80 |
| F08 | Echo Lance | beam + kinetic | beamแคบหลังrailหนึ่งเส้น damage50%; no recursion |

## 48 missions / 144 stars

Every row also requires successful mission clear for Star A and eligibility for B/C. Full waves/seeds/rewards/required actors are in JSON.

| ID | ชื่อด่าน | Role / Encounter | Star B | Star C | Credits / Scrap |
|---|---|---|---|---|---|
| P01-01 | เศษเหล็กแรกบิน | approach / - | ทำลายจุดส่งกำลังทั้ง3จุด | รับความเสียหาย core รวมไม่เกิน35 | 275/23 |
| P01-02 | คุ้มกันช่างกู้ซาก | escort / - | คุ้มกันเป้าหมายให้เหลือHPอย่างน้อย70% | กำจัดชุดซุ่มโจมตีที่ทำเครื่องหมายครบ3ชุดก่อนยิงถูกเป้าคุ้มกัน | 300/26 |
| P01-03 | ก้ามปูแห่งสุสาน | mini_boss / B01 | ยึดอาวุธมินิบอสอย่างสมบูรณ์และนำกลับ | ไม่โดนท่าโจมตีเอกลักษณ์ของมินิบอส | 325/29 |
| P01-04 | ล่าชิ้นส่วนกลางซาก | salvage_hunt / - | นำชิ้นส่วนสมบูรณ์กลับ2ชิ้น; มีcargo carrierอย่างน้อย3ลำ | ไม่มีชิ้นส่วนที่เริ่มลากแล้วถูกทำลาย | 350/32 |
| P01-05 | อุโมงค์เรือแตก | hazard_gauntlet / - | ปิดเครื่องกำเนิดอันตรายครบ3จุด | ไม่รับความเสียหายจากเขตอันตราย | 375/35 |
| P01-06 | หางพิฆาตผู้ทวงคืน | boss / B02 | ยึดอาวุธบอสอย่างสมบูรณ์และนำกลับ | ยิงจุด interrupt ระหว่างท่าชาร์จที่มีเตือนให้สำเร็จ2ครั้ง; จุดนี้แยกจากsignature joint | 400/38 |
| P02-01 | แนวเตาหลอม | approach / - | ทำลายจุดส่งกำลังทั้ง3จุด | รับความเสียหาย core รวมไม่เกิน35 | 345/28 |
| P02-02 | ขบวนขนแร่ | escort / - | คุ้มกันเป้าหมายให้เหลือHPอย่างน้อย70% | กำจัดชุดซุ่มโจมตีที่ทำเครื่องหมายครบ3ชุดก่อนยิงถูกเป้าคุ้มกัน | 370/31 |
| P02-03 | แกะเหล็กเตานรก | mini_boss / B03 | ยึดอาวุธมินิบอสอย่างสมบูรณ์และนำกลับ | ไม่โดนท่าโจมตีเอกลักษณ์ของมินิบอส | 395/34 |
| P02-04 | ยึดปืนหลอมโลหะ | salvage_hunt / - | นำชิ้นส่วนสมบูรณ์กลับ2ชิ้น; มีcargo carrierอย่างน้อย3ลำ | ไม่มีชิ้นส่วนที่เริ่มลากแล้วถูกทำลาย | 420/37 |
| P02-05 | สายพานลาวา | hazard_gauntlet / - | ปิดเครื่องกำเนิดอันตรายครบ3จุด | ไม่รับความเสียหายจากเขตอันตราย | 445/40 |
| P02-06 | ตะขาบโรงงานคลั่ง | boss / B04 | ยึดอาวุธบอสอย่างสมบูรณ์และนำกลับ | ยิงจุด interrupt ระหว่างท่าชาร์จที่มีเตือนให้สำเร็จ2ครั้ง; จุดนี้แยกจากsignature joint | 470/43 |
| P03-01 | ขอบพายุ | approach / - | ทำลายจุดส่งกำลังทั้ง3จุด | รับความเสียหาย core รวมไม่เกิน35 | 415/33 |
| P03-02 | นำเรือฝ่าฟ้าผ่า | escort / - | คุ้มกันเป้าหมายให้เหลือHPอย่างน้อย70% | กำจัดชุดซุ่มโจมตีที่ทำเครื่องหมายครบ3ชุดก่อนยิงถูกเป้าคุ้มกัน | 440/36 |
| P03-03 | ว่าวพิทักษ์ท้องฟ้า | mini_boss / B05 | ยึดอาวุธมินิบอสอย่างสมบูรณ์และนำกลับ | ไม่โดนท่าโจมตีเอกลักษณ์ของมินิบอส | 465/39 |
| P03-04 | ชิงแกนสายฟ้า | salvage_hunt / - | นำชิ้นส่วนสมบูรณ์กลับ2ชิ้น; มีcargo carrierอย่างน้อย3ลำ | ไม่มีชิ้นส่วนที่เริ่มลากแล้วถูกทำลาย | 490/42 |
| P03-05 | ทางลมย้อนศร | hazard_gauntlet / - | ปิดเครื่องกำเนิดอันตรายครบ3จุด | ไม่รับความเสียหายจากเขตอันตราย | 515/45 |
| P03-06 | กระเบนจ้าวพายุ | boss / B06 | ยึดอาวุธบอสอย่างสมบูรณ์และนำกลับ | ยิงจุด interrupt ระหว่างท่าชาร์จที่มีเตือนให้สำเร็จ2ครั้ง; จุดนี้แยกจากsignature joint | 540/48 |
| P04-01 | ป่ากลืนจักรกล | approach / - | ทำลายจุดส่งกำลังทั้ง3จุด | รับความเสียหาย core รวมไม่เกิน35 | 485/38 |
| P04-02 | คุ้มกันเครื่องถอนราก | escort / - | คุ้มกันเป้าหมายให้เหลือHPอย่างน้อย70% | กำจัดชุดซุ่มโจมตีที่ทำเครื่องหมายครบ3ชุดก่อนยิงถูกเป้าคุ้มกัน | 510/41 |
| P04-03 | ตั๊กแตนหนามเหล็ก | mini_boss / B07 | ยึดอาวุธมินิบอสอย่างสมบูรณ์และนำกลับ | ไม่โดนท่าโจมตีเอกลักษณ์ของมินิบอส | 535/44 |
| P04-04 | ชิงรังโดรนชีวกล | salvage_hunt / - | นำชิ้นส่วนสมบูรณ์กลับ2ชิ้น; มีcargo carrierอย่างน้อย3ลำ | ไม่มีชิ้นส่วนที่เริ่มลากแล้วถูกทำลาย | 560/47 |
| P04-05 | เถาวัลย์ปิดทาง | hazard_gauntlet / - | ปิดเครื่องกำเนิดอันตรายครบ3จุด | ไม่รับความเสียหายจากเขตอันตราย | 585/50 |
| P04-06 | มหาวิหารรากเหล็ก | boss / B08 | ยึดอาวุธบอสอย่างสมบูรณ์และนำกลับ | ยิงจุด interrupt ระหว่างท่าชาร์จที่มีเตือนให้สำเร็จ2ครั้ง; จุดนี้แยกจากsignature joint | 610/53 |
| P05-01 | ผิวน้ำแข็งร้าว | approach / - | ทำลายจุดส่งกำลังทั้ง3จุด | รับความเสียหาย core รวมไม่เกิน35 | 555/43 |
| P05-02 | ขนส่งเตาปฏิกรณ์ | escort / - | คุ้มกันเป้าหมายให้เหลือHPอย่างน้อย70% | กำจัดชุดซุ่มโจมตีที่ทำเครื่องหมายครบ3ชุดก่อนยิงถูกเป้าคุ้มกัน | 580/46 |
| P05-03 | เขาผลึกสะท้อน | mini_boss / B09 | ยึดอาวุธมินิบอสอย่างสมบูรณ์และนำกลับ | ไม่โดนท่าโจมตีเอกลักษณ์ของมินิบอส | 605/49 |
| P05-04 | ล่าหอกน้ำแข็ง | salvage_hunt / - | นำชิ้นส่วนสมบูรณ์กลับ2ชิ้น; มีcargo carrierอย่างน้อย3ลำ | ไม่มีชิ้นส่วนที่เริ่มลากแล้วถูกทำลาย | 630/52 |
| P05-05 | อุโมงค์แสงหักเห | hazard_gauntlet / - | ปิดเครื่องกำเนิดอันตรายครบ3จุด | ไม่รับความเสียหายจากเขตอันตราย | 655/55 |
| P05-06 | เลวีอาธานธารน้ำแข็ง | boss / B10 | ยึดอาวุธบอสอย่างสมบูรณ์และนำกลับ | ยิงจุด interrupt ระหว่างท่าชาร์จที่มีเตือนให้สำเร็จ2ครั้ง; จุดนี้แยกจากsignature joint | 680/58 |
| P06-01 | เหนือทะเลทรายแดง | approach / - | ทำลายจุดส่งกำลังทั้ง3จุด | รับความเสียหาย core รวมไม่เกิน35 | 625/48 |
| P06-02 | ขบวนเครื่องขุด | escort / - | คุ้มกันเป้าหมายให้เหลือHPอย่างน้อย70% | กำจัดชุดซุ่มโจมตีที่ทำเครื่องหมายครบ3ชุดก่อนยิงถูกเป้าคุ้มกัน | 650/51 |
| P06-03 | ตัวตุ่นเจาะเกราะ | mini_boss / B11 | ยึดอาวุธมินิบอสอย่างสมบูรณ์และนำกลับ | ไม่โดนท่าโจมตีเอกลักษณ์ของมินิบอส | 675/54 |
| P06-04 | ปล้นแท่นปืนเหมือง | salvage_hunt / - | นำชิ้นส่วนสมบูรณ์กลับ2ชิ้น; มีcargo carrierอย่างน้อย3ลำ | ไม่มีชิ้นส่วนที่เริ่มลากแล้วถูกทำลาย | 700/57 |
| P06-05 | พายุทรายหมุน | hazard_gauntlet / - | ปิดเครื่องกำเนิดอันตรายครบ3จุด | ไม่รับความเสียหายจากเขตอันตราย | 725/60 |
| P06-06 | ป้อมทรายเคลื่อนที่ | boss / B12 | ยึดอาวุธบอสอย่างสมบูรณ์และนำกลับ | ยิงจุด interrupt ระหว่างท่าชาร์จที่มีเตือนให้สำเร็จ2ครั้ง; จุดนี้แยกจากsignature joint | 750/63 |
| P07-01 | แรงดึงแรกสัมผัส | approach / - | ทำลายจุดส่งกำลังทั้ง3จุด | รับความเสียหาย core รวมไม่เกิน35 | 695/53 |
| P07-02 | ลากขนส่งข้ามรอยแยก | escort / - | คุ้มกันเป้าหมายให้เหลือHPอย่างน้อย70% | กำจัดชุดซุ่มโจมตีที่ทำเครื่องหมายครบ3ชุดก่อนยิงถูกเป้าคุ้มกัน | 720/56 |
| P07-03 | ผู้คุมวงโคจร | mini_boss / B13 | ยึดอาวุธมินิบอสอย่างสมบูรณ์และนำกลับ | ไม่โดนท่าโจมตีเอกลักษณ์ของมินิบอส | 745/59 |
| P07-04 | ยึดสมอแรงโน้มถ่วง | salvage_hunt / - | นำชิ้นส่วนสมบูรณ์กลับ2ชิ้น; มีcargo carrierอย่างน้อย3ลำ | ไม่มีชิ้นส่วนที่เริ่มลากแล้วถูกทำลาย | 770/62 |
| P07-05 | เส้นทางดาวแตก | hazard_gauntlet / - | ปิดเครื่องกำเนิดอันตรายครบ3จุด | ไม่รับความเสียหายจากเขตอันตราย | 795/65 |
| P07-06 | อสรพิษเอกฐาน | boss / B14 | ยึดอาวุธบอสอย่างสมบูรณ์และนำกลับ | ยิงจุด interrupt ระหว่างท่าชาร์จที่มีเตือนให้สำเร็จ2ครั้ง; จุดนี้แยกจากsignature joint | 820/68 |
| P08-01 | กำแพงชั้นนอก | approach / - | ทำลายจุดส่งกำลังทั้ง3จุด | รับความเสียหาย core รวมไม่เกิน35 | 765/58 |
| P08-02 | ส่งแกนสู่แนวหน้า | escort / - | คุ้มกันเป้าหมายให้เหลือHPอย่างน้อย70% | กำจัดชุดซุ่มโจมตีที่ทำเครื่องหมายครบ3ชุดก่อนยิงถูกเป้าคุ้มกัน | 790/61 |
| P08-03 | พลเรือเอกกระจก | mini_boss / B15 | ยึดอาวุธมินิบอสอย่างสมบูรณ์และนำกลับ | ไม่โดนท่าโจมตีเอกลักษณ์ของมินิบอส | 815/64 |
| P08-04 | ยึดอาวุธราชองครักษ์ | salvage_hunt / - | นำชิ้นส่วนสมบูรณ์กลับ2ชิ้น; มีcargo carrierอย่างน้อย3ลำ | ไม่มีชิ้นส่วนที่เริ่มลากแล้วถูกทำลาย | 840/67 |
| P08-05 | วงแหวนป้องกันคราส | hazard_gauntlet / - | ปิดเครื่องกำเนิดอันตรายครบ3จุด | ไม่รับความเสียหายจากเขตอันตราย | 865/70 |
| P08-06 | ผู้กลืนกินเหล็ก | boss / B16 | ยึดอาวุธบอสอย่างสมบูรณ์และนำกลับ | ยิงจุด interrupt ระหว่างท่าชาร์จที่มีเตือนให้สำเร็จ2ครั้ง; จุดนี้แยกจากsignature joint | 890/73 |

## 24 enemies

| ID | Name | Role | Attack | Counter |
|---|---|---|---|---|
| E01 | Scrap Scout | scout | straight_burst | read telegraph and approach firing-arc gap |
| E02 | Needle Interceptor | interceptor | aimed_volley | read telegraph and approach firing-arc gap |
| E03 | Shield Barge | shield | fan | flank exposed rear joint |
| E04 | Fuel Hauler | cargo | none | shoot engines for salvage or tank for explosion |
| E05 | Mine Skiff | minelayer | delayed_mine | read telegraph and approach firing-arc gap |
| E06 | Cable Cutter | cutter | telegraphed_slash | move cable outside red slash warning |
| E07 | Ash Bomber | bomber | lob_pool | read telegraph and approach firing-arc gap |
| E08 | Furnace Drone | thermal | flame_cone | read telegraph and approach firing-arc gap |
| E09 | Ion Skater | ion | status_bolt | read telegraph and approach firing-arc gap |
| E10 | Storm Pylon | turret | chain_arc | read telegraph and approach firing-arc gap |
| E11 | Root Healer | healer | heal_tether | interrupt repair tether first |
| E12 | Thorn Swarm | swarm | fan | read telegraph and approach firing-arc gap |
| E13 | Prism Sentry | beam | segmented_beam | read telegraph and approach firing-arc gap |
| E14 | Ice Diver | charger | warned_charge | read telegraph and approach firing-arc gap |
| E15 | Drill Diver | drill | contact_tool | read telegraph and approach firing-arc gap |
| E16 | Sand Mortar | artillery | lob_pool | read telegraph and approach firing-arc gap |
| E17 | Gravity Anchor | gravity | gravity_field | destroy anchor or leave marked field |
| E18 | Orbit Guard | orbiter | spiral | read telegraph and approach firing-arc gap |
| E19 | Mirror Decoy | decoy | delayed_echo | read telegraph and approach firing-arc gap |
| E20 | Citadel Guard | elite | aimed_volley | read telegraph and approach firing-arc gap |
| E21 | Loot Snatcher | salvage_thief | tractor_attempt | shoot tractor before tow completes; stolen player loot not deleted |
| E22 | Missile Frigate | missile | bounded_homing | read telegraph and approach firing-arc gap |
| E23 | Beam Cutter | beam | telegraphed_sweep | read telegraph and approach firing-arc gap |
| E24 | Armor Carrier | carrier | spawn_scout | read telegraph and approach firing-arc gap |

## 8 hazards

| ID | Name | Behavior |
|---|---|---|
| HZ01 | Wreck Drift | marked moving cover; slow collisions; no bullet camouflage |
| HZ02 | Molten Gates | 1.2sec orange lane warning before heat pulse; always2 lanes safe |
| HZ03 | Ion Front | wind field shown0.8sec early; force capped100px/s²; lightning1.2sec warning |
| HZ04 | Root Lattice | grow walls over1.5sec; no sealing player; roots destructible |
| HZ05 | Prism Ice | ice changes deceleration to1400; beams reflect only marked surfaces |
| HZ06 | Sand Veil | background fog only; enemy bullets/joints stay in high contrast render layer |
| HZ07 | Gravity Wells | bounded radial field; force max120px/s²; always reachable exit |
| HZ08 | Eclipse Gates | combine two known hazard types; telegraphs never overlap into unavoidable pattern |


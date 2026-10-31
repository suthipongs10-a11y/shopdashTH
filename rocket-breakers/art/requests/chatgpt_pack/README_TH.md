# แพ็กสั่งภาพ ROCKET BREAKERS สำหรับ ChatGPT

แพ็กนี้มีคำสั่งสร้างภาพ **ครบทุกภาพของเกมเวอร์ชัน 1** (394 ภาพ แบ่งเป็น 41 ชุด) สร้างอัตโนมัติจากข้อมูลเกมจริง
(`asset_manifest.csv`, `catalog.json`, `powerups.json`) ทุกภาพมีชื่อไฟล์ ขนาด จุดยึด และข้อกำหนดพื้นหลังโปร่งใสกำกับไว้

## วิธีใช้กับ ChatGPT

1. เปิดแชตใหม่ใน ChatGPT แล้วแนบไฟล์ `00_START_HERE_FOR_CHATGPT.md` ให้มันอ่านก่อน (กฎการสร้างภาพทั้งหมด)
2. ส่งทีละชุด เริ่มจาก `batches/BATCH_001.md` แนบภาพอ้างอิงที่ชุดนั้นระบุ (อยู่ในโฟลเดอร์ `references/`)
3. ให้ ChatGPT สร้างทีละภาพตามลำดับ และตั้งชื่อไฟล์ตามที่กำหนดเป๊ะ ๆ
4. ได้ภาพครบชุดแล้ว รวมเป็น ZIP ส่งกลับมาให้ Claude ผมจะตรวจ alpha ขนาด และจุดยึด ก่อนใส่เข้าเกม
   ถ้าภาพไหนผิด ผมจะส่งรายการแก้เฉพาะภาพนั้นกลับไป ไม่ต้องสร้างใหม่ทั้งชุด
5. ทำเรียงตามเลขชุด: ชุด 001–007 สำคัญที่สุด (ใช้ในด่านที่เล่นได้ตอนนี้) ที่เหลือคือเนื้อหาด่านถัดไป

## ลำดับความสำคัญ

- BATCH_001: M1 core: hero ship, starter guns, stolen tail, Scorpion boss (10)
- BATCH_002: Power-up icons (all 12) (12)
- BATCH_003: M1 enemies, ship states, utilities (10)
- BATCH_004: Graveyard Belt backgrounds + core effects (8)
- BATCH_005: HUD icons (12)
- BATCH_006: Menu icons (10)
- BATCH_007: Weapon HUD icons for the starter guns + stolen tail (6)
- BATCH_008: Enemies (E05–E16) (12)
- BATCH_009: Enemies (E17–E24) (8)
- BATCH_010: Boss parts (B01–B03) (10)
- BATCH_011: Boss parts (B04–B05) (10)
- BATCH_012: Boss parts (B06–B07) (10)
- BATCH_013: Boss parts (B08–B09) (10)
- BATCH_014: Boss parts (B10–B11) (10)
- BATCH_015: Boss parts (B12–B13) (10)
- BATCH_016: Boss parts (B14–B15) (10)
- BATCH_017: Boss parts (B16) (5)
- BATCH_018: Weapon modules (W002–W014) (12)
- BATCH_019: Weapon modules (W015–W027) (12)
- BATCH_020: Weapon modules (W028–W036) (9)
- BATCH_021: Hull family (H02–H03) (10)
- BATCH_022: Hull family (H04–H05) (10)
- BATCH_023: Hull family (H06–H07) (10)
- BATCH_024: Hull family (H08–H09) (10)
- BATCH_025: Hull family (H10–H11) (10)
- BATCH_026: Hull family (H12) (5)
- BATCH_027: Utility modules (T002–T012) (10)
- BATCH_028: Sector backgrounds (P02–P04) (9)
- BATCH_029: Sector backgrounds (P05–P07) (9)
- BATCH_030: Sector backgrounds (P08) (3)
- BATCH_031: Galaxy-map planets (P01–P08) (8)
- BATCH_032: Effects (10 textures) (10)
- BATCH_033: Hazards (HZ01–HZ08) (8)
- BATCH_034: Weapon HUD icons (W002–W014) (12)
- BATCH_035: Weapon HUD icons (W015–W027) (12)
- BATCH_036: Weapon HUD icons (W028–W036) (9)
- BATCH_037: Weapon emitter glows (W002–W014) (12)
- BATCH_038: Weapon emitter glows (W015–W027) (12)
- BATCH_039: Weapon emitter glows (W028–W036) (9)
- BATCH_040: Ability icons (A01–A12) (12)
- BATCH_041: Fusion icons (F01–F08) (8)

## ไฟล์ในแพ็ก

- `00_START_HERE_FOR_CHATGPT.md` — กฎสำหรับ ChatGPT (ส่งก่อนทุกครั้งที่เปิดแชตใหม่)
- `batches/BATCH_###.md` — คำสั่งรายชุด พร้อมพรอมต์ภาษาอังกฤษที่ก๊อปวางได้ทันที
- `ASSET_CHECKLIST.csv` — รายการภาพทั้งหมด ไว้ติ๊กว่าได้ภาพไหนแล้ว
- `references/` — ภาพอ้างอิงสไตล์ (ย่อขนาดแล้ว) ห้ามให้ ChatGPT ตัดภาพบอร์ดไปใช้เป็น sprite

## หมายเหตุ

- เอฟเฟกต์แบบหลายเฟรม (เช่น ระเบิด 12 เฟรม) ถ้า ChatGPT ทำต่อเนื่องไม่สวย ให้ส่งเฟรมแรก กลาง และท้ายมาก่อน โค้ดเกมจะเติมการเคลื่อนไหวให้
- ภาพที่ได้จะมีสถานะ "รอตรวจ" จนกว่าผมตรวจผ่านในเกมจริง
- ไอคอน "ยิงสามทาง" ต้องมีกระสุน 3 ลูก (บอร์ดตัวอย่างวาด 4 ลูก)
- แพ็กนี้ใช้แทน `art/requests/BATCH_001.md` และ `BATCH_002.md` ฉบับเก่า (เนื้อหาเดิมรวมอยู่ในชุด 001–002 ของแพ็กนี้แล้ว)
- สร้างแพ็กใหม่ได้ทุกเมื่อด้วย `python3 tools/build_art_pack.py --zip OUT.zip` (ข้อมูลเกมเปลี่ยน แพ็กจะอัปเดตตาม)

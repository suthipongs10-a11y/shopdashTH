# STATUS — RUNEGATE

- **Current phase:** 3 (Sprite Factory) — ยังไม่เริ่ม
- **Phase ที่ผ่าน DoD แล้ว:** 0, 1, 2
- **Last session:** 2026-08-29

---

## Done

### Phase 0 — Foundation ✅
- [x] Monorepo (npm workspaces): `data` / `sim` / `client` / `tools` + tsconfig + vitest
- [x] `CLAUDE.md` / `STATUS.md` / `DECISIONS.md` / `PARKING.md`
- [x] Schema ครบทุกระบบด้วย zod (schema = type = validator ชุดเดียว):
      `common` `skill` `hero` `enemy` `stage` `rune` `card` `economy` `drop`
- [x] คอนเทนต์ชุดแรก: ฮีโร่ 13 · ศัตรู 14 · สกิล 30 · การ์ด 14 · ด่าน 3 · รูน 6 เซ็ต · ตารางดรอป 2
- [x] ตัวตรวจการอ้างอิงข้ามไฟล์ (`npm run validate`) — ตรวจถึงขั้นว่าเส้นทางเดินพาดผ่านช่องที่เดินได้จริงไหม
- [x] โมเดลเศรษฐกิจ 90 วัน (`npm run economy`) → `packages/tools/out/economy-90d.csv`

### Phase 1 — Combat Sim Core ✅
- [x] `Rng` (mulberry32) deterministic + `PathTrack` (polyline + ระยะสะสม)
- [x] `Battle`: แต้มวางงอกตามเวลา, วาง/ถอน/คูลดาวน์วางใหม่, เพดานฮีโร่ในสนาม
- [x] การบล็อค (blockWeight/blockCount), ศัตรูบินบล็อคไม่ได้, ปล่อยเมื่อผู้บล็อคหาย
- [x] เล็งเป้า 8 แบบ (first/nearest/lowest_hp/flying_first/elite_first/...), stealth + reveal aura
- [x] สูตรดาเมจ ธาตุ×เผ่า×trait, คริ, glancing, true damage, splash, lifesteal
- [x] ระบบสถานะ (stun/slow/poison/bind/shield/atk_up/def_down/revealed) + stat modifier มีอายุ
- [x] สกิลแบบ data-driven: passive / interval / on_attack / on_deploy / ultimate (กดมือ)
- [x] เงื่อนไขจบด่าน + ดาว 1–3 + รายงานผลรายฮีโร่
- [x] `AutoPlayer` (AI ฮิวริสติก) + `runHeadless` สำหรับรันจำลอง
- [x] `balance-runner` พร้อมเกณฑ์ win-rate ต่อเลเวล

### Phase 2 — 3D Render + Billboard ✅
- [x] `StageScene`: สร้างฉากทั้งหมดจาก Stage JSON (พื้น/ที่สูง/ทางเดิน/ประตูฐาน/พอร์ทัล), กล้อง isometric หมุน+ซูม (เมาส์/นิ้ว/pinch)
- [x] Sprite factory แบบ procedural: 6 ชนิดร่าง × 8 อาวุธ × พาเลตต์ → atlas 96×128 × 12 เฟรม × 5 ทิศ, mirror เป็น 8 ทิศ
- [x] `loadAtlas()` สำหรับ atlas PNG จริงของ Phase 3 (manifest เดียวกัน — ไม่ต้องแก้โค้ด render)
- [x] `BattleView`: sprite billboard, แอนิเมชั่นตามสถานะ, หลอดเลือดยึดหัวยูนิตแม่นทุกชนิดร่าง, ตัวเลขดาเมจ/ฮีล, วงเอฟเฟกต์สกิล, ไฮไลต์ล่องหน/สตัน/ช้า
- [x] UI ไทยครบชุด: เลือกด่าน → จัดทีม → HUD ในด่าน (แต้มวาง/เลือดฐาน/เวฟ/เวลา/ความเร็ว 1-2-3x/พัก) → วางฮีโร่พร้อมเลือกทิศ → แผงฮีโร่ (ท่าไม้ตาย/ถอนกลับ) → หน้าสรุปผล + ดาว
- [x] บันทึกดาว/ทีม/เลเวลลง localStorage
- [x] คำแนะนำวิธีเล่นบนหน้าเลือกด่าน (สำหรับคนเปิดเกมครั้งแรกบนมือถือ)
- [x] `scripts/build-artifact.mjs` — แพ็คทั้งเกมเป็น HTML ไฟล์เดียว (636 KB, ไม่มี asset แนบ) เอาไปโฮสต์ที่ไหนก็ได้
- [x] **เปลี่ยนธีมเป็น RUNEGATE (แฟนตาซีสากล)** ตามที่ผู้ใช้ขอ — แก้เฉพาะชื่อ/คำบรรยาย/สี/ฉาก
      โดยตัวเลขบาลานซ์ไม่ขยับแม้แต่ช่องเดียว (ยืนยันด้วย balance runner ก่อน/หลัง) — วิธีทำอยู่ใน CLAUDE.md §10
- [x] **มอนสเตอร์ครบ 3 ระดับ (ดึงงานคอนเทนต์จาก Phase 7 มาก่อนตามที่ผู้ใช้ขอ)**
      33 ชนิด = ธรรมดา 21 · มินิบอส 7 · บอส MVP 5, การ์ดครบทุกตัว 33 ใบ, สกิลใหม่ 14 ท่า
- [x] เพิ่ม effect `summon` ใน sim — ปิด archetype "Elite/Boss เรียกลูกสมุน" ที่ blueprint §5.4 ระบุไว้ตั้งแต่ Phase 1
- [x] ด่านใหม่ `ch1_04` ห้องบัลลังก์ลิช (ล่า MVP) + ยกเครื่องเวฟของ ch1_01–03 ให้ไล่ระดับ ธรรมดา → มินิบอส → MVP
- [x] หน้า **สมุดมอนสเตอร์ (Bestiary)** ดูมอนทั้ง 33 ตัวพร้อมระดับ/เผ่า/ธาตุ/สถิติ/ลักษณะพิเศษ/ปรากฏในด่านไหน
- [x] ป้ายชื่อ + หลอดเลือดใหญ่ขึ้นสำหรับมินิบอส/MVP ในสนามรบ
- [x] ทดสอบจริงบน Chromium ทั้ง desktop (1280×800) และมือถือ (iPhone 13) — ไม่มี error, เล่นจบด่านได้

---

## DoD checklist

### Phase 0
- [x] schema ทุกระบบพร้อม validator + test
- [x] สเปรดชีตโมเดลเศรษฐกิจ 90 วัน (CSV) + เกณฑ์ตรวจอัตโนมัติ

### Phase 1
- [x] ข้อ 1 — sim headless ครบทุกกลไก (ตรวจด้วย 43 unit tests)
- [x] ข้อ 2 — `npm run test` ผ่านทั้งหมด (43/43)
- [x] ข้อ 3 — `npm run balance -- --runs 1000` รันครบไม่พัง (≈11 ms/ด่าน) และผ่านเกณฑ์ win-rate

### Phase 2
- [x] ข้อ 1 — ฉาก Three.js สร้างจาก JSON ล้วน
- [x] ข้อ 2 — กล้อง isometric หมุน/ซูมได้
- [x] ข้อ 3 — sprite billboard 8 ทิศ + atlas loader (มี path สำหรับ atlas จริง)
- [x] ข้อ 4 — เล่นด่านทดสอบได้จริง (ทดสอบด้วย Playwright จนถึงหน้าสรุปผล)
- [ ] ข้อ 5 — **60fps บนมือถือจริง: ยังไม่ได้วัด** (headless ใช้ SwiftShader = software GL วัดได้ ~48 ms/เฟรม ซึ่งไม่สะท้อนเครื่องจริง)
      งานที่เหลือ: วัดบนเครื่องจริง 1 รุ่น (Android กลางๆ) แล้วบันทึกผล — ถ้าไม่ถึงให้ลด draw call ของ tile ด้วย InstancedMesh

> Phase 2 ถือว่า "ผ่านเชิงฟังก์ชันครบ แต่ DoD ข้อ 5 ยังค้างการวัดบนเครื่องจริง"

---

## In progress / ถัดไป

- [ ] **Phase 3 — Sprite Factory**: pipeline AI→Aseprite→packer, ฮีโร่ 5 ตัว + มอน 8 ตัวครบแอนิเมชั่น, ล็อค style guide
  - โค้ดฝั่ง render พร้อมรับ atlas จริงแล้ว (`loadAtlas`) — เหลือแค่ผลิตไฟล์ + สลับ source
- [ ] วัด fps บนมือถือจริง (ปิด DoD ข้อ 5 ของ Phase 2)

---

## Blockers / Notes

- **สมดุลด่านเป็นฟังก์ชันขั้นบันได ไม่ใช่เส้นโค้ง** — TD ปกติจะ "ยันอยู่" หรือ "แตก" ไม่ค่อยมีตรงกลาง
  เกณฑ์ที่ใช้จึงเป็น "ด่านนี้ผ่านได้ตั้งแต่เลเวลเท่าไร": ch1_01 = Lv1 · ch1_02 = Lv8 · ch1_03 = Lv10–15
- **ค่าศัตรูรอบแรกอ่อนเกินไปมาก** — AI ชนะ 100% ทุกด่านแม้เลเวล 1 แก้โดยรันจำลองแล้วปรับ HP ×1.45 / ATK ×1.5 / DEF ×1.15 + ตัวคูณรายเวฟในด่านบอส
- **Gold sink รอบแรกตื้นเกินไป** (90 วันปิดเป้าหมายปลายเกมได้ 101%) — แก้ค่าอัพรูน base 120 → 380 เหลือ 41%
- ไม่มี Google Fonts ในแซนด์บ็อกซ์ (ถูก proxy บล็อก) — เกมจะ fallback เป็นฟอนต์ระบบ ไม่กระทบการทำงาน
- `three` ทำให้บันเดิล ~650 KB (gzip 167 KB) — ยอมรับได้ ยังไม่ต้อง code-split จนกว่าจะถึง Phase 9
- ไฟล์เดียวจบต้องประกาศ `<meta charset>` + `<meta name="viewport">` เอง — ขาด viewport เมื่อไรมือถือจะ boost ขนาดฟอนต์จนหน้าจอเละ

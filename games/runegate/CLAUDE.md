# CLAUDE.md — RUNEGATE (รูนเกต)

> **เอกสารนี้คือ source of truth เพียงชิ้นเดียวของเกม** — อ่านก่อนเริ่มทุกเซสชัน
> สูตรเกม: Tower Defense (Arknights) × ระบบรูน/สุ่มฮีโร่ (Summoners War) × การ์ด/ตีบวก (Ragnarok Online)
> ธีม: แฟนตาซีสากล — ปิดประตูมิติ (Runegate) ก่อนกองทัพอสูรจากอีกโลกจะทะลักเข้ามา
> **ธีมเป็นแค่ผิว** — ระบบทั้งหมดไม่ผูกกับธีม เปลี่ยนโลกใหม่ = แก้ชื่อ/คำบรรยาย/สีใน `content/*.json` เท่านั้น (§10)

---

## §0. กฎเหล็กสำหรับ Claude (อ่านก่อนทุกครั้ง)

1. **ทำทีละ Phase เท่านั้น** (§6) — ห้ามสร้างโค้ดของ Phase ถัดไปล่วงหน้า แม้จะ "ทำได้ง่าย"
2. **DoD คือสัญญา** — Phase เสร็จเมื่อผ่าน DoD ครบทุกข้อ ถ้าไม่ครบให้รายงานว่า "Phase X ยังไม่ผ่าน DoD ข้อ Y" ห้ามประกาศว่าเสร็จ
3. **อัปเดต `STATUS.md` ทุกครั้งก่อนจบเซสชัน** — Phase ปัจจุบัน, งานที่เสร็จ, งานค้าง, DoD ที่ผ่าน, ปัญหาที่พบ
4. **ไอเดียใหม่ที่ไม่อยู่ในแผน → เขียนลง `PARKING.md`** ห้าม implement (โรคประจำตัวของเกมใหญ่คือ scope บาน)
5. **การตัดสินใจที่เอกสารนี้ไม่ครอบคลุม → บันทึกลง `DECISIONS.md`** พร้อมเหตุผล 1–2 บรรทัด
6. **ก่อน commit ต้องรัน `npm run verify` ผ่าน** (validate + typecheck + test + balance)
7. **ภาษา:** UI/ข้อความ/คอนเทนต์ทั้งหมดเป็นภาษาไทย — โค้ด/ชื่อตัวแปร/commit message เป็นภาษาอังกฤษ (คอมเมนต์ในโค้ดเป็นไทยได้)
8. **ห้ามใส่ตัวเลขบาลานซ์ในโค้ด** — ทุกค่าต้องอยู่ใน `packages/data/content/*.json`

---

## §1. สถาปัตยกรรม (กฎที่สำคัญที่สุด)

| กฎ | เหตุผล |
|---|---|
| **Combat Sim แยกจาก Render เด็ดขาด** — `packages/sim` เป็น pure TypeScript ไม่มี DOM/Three.js เลย | รัน headless ได้ → ทดสอบสมดุลด้วยการจำลอง 1,000 ด่าน, เขียน unit test ได้, ตรวจผลฝั่ง server ได้ |
| **Deterministic:** fixed timestep 30 ticks/วินาที + PRNG มี seed (`Rng`) ทุกการสุ่ม | seed เดิม + คำสั่งเดิม = ผลลัพธ์เดิมเป๊ะ → replay/verify กันโกงได้ |
| **Server-authoritative ทุกอย่างที่มีมูลค่า** (สุ่มฮีโร่/ดรอป/อัพรูน/ตีบวก/เศรษฐกิจ) | กันโกง + ปรับเรทได้โดยไม่ต้องอัพเดตแอป — *ยังไม่สร้าง server (Phase 5)* |
| **Data-driven 100%** — ฮีโร่/สกิล/ศัตรู/ด่าน/เวฟ/รูน/การ์ด/ดรอป/เศรษฐกิจ อยู่ใน JSON + zod schema | เพิ่มคอนเทนต์ไม่ต้องแตะโค้ด |

### โครงสร้างโปรเจ็ค

```
games/runegate/
  packages/
    data/      content/*.json + src/schema/*.ts (zod)  ← schema คือสัญญาของทุกระบบ
    sim/       เอนจิ้นต่อสู้ pure TS (ไม่มี DOM)
    client/    Three.js + Vite + UI overlay (HTML/CSS)
    tools/     validate-content / balance-runner / economy-model
  CLAUDE.md  STATUS.md  DECISIONS.md  PARKING.md
```

### คำสั่ง

```bash
npm install            # ครั้งแรก
npm run dev            # เปิดเกมที่ localhost:5173
npm run build          # build client
npm run validate       # ตรวจคอนเทนต์ + การอ้างอิงข้ามไฟล์
npm run typecheck      # tsc ทั้ง workspace
npm run test           # vitest (data + sim)
npm run balance        # รันจำลองสมดุล (--runs 1000 --stage ch1_03 --levels 10,15,20)
npm run economy        # โมเดลเศรษฐกิจ 90 วัน → packages/tools/out/economy-90d.csv
npm run verify         # ทั้งหมดข้างบน — ต้องผ่านก่อน commit
```

---

## §2. Core Loop

**ในด่าน (3–6 นาที):** เลือกทีม ≤8 ตัว → แต้มวาง (Deploy Cost) งอกตามเวลา → วาง melee บนทางเดินเพื่อ **บล็อค** / ranged บนที่สูง → ศัตรูมาเป็นเวฟ → ถอนตัว/วางใหม่/กด Ultimate → เคลียร์ทุกเวฟโดยเลือดฐานไม่หมด → ได้ดาว 1–3

**นอกด่าน (Phase 4–6):** ดรอป/เควส → อัพฮีโร่ 5 ทาง (เลเวล/สกิล/ดาว/ปลุกพลัง/รูน+อุปกรณ์) → ผ่านด่านยากขึ้น → สุ่มฮีโร่ใหม่ → วนกลับ

---

## §3. สัญญาของ Sim (`packages/sim`)

### 3.1 หน่วยเวลา/พิกัด
- 1 tick = 1/30 วินาที (`TICKS_PER_SEC`, `TICK_DT` จาก `@runegate/data`)
- พิกัดเป็นหน่วย **ช่อง (tile)** — ยูนิตที่ยืนช่อง (x,y) อยู่ที่จุด (x+0.5, y+0.5)
- ศัตรูเดินตาม `PathTrack` (polyline จาก waypoint) ด้วยตัวแปร `dist` — `dist` มากกว่า = ใกล้ฐานมากกว่า (ใช้เป็นเกณฑ์ targetPriority `first`)

### 3.2 ผังช่องของด่าน (`Stage.tiles`)
| ตัวอักษร | ความหมาย | วางอะไรได้ |
|---|---|---|
| `R` | ทางเดินศัตรู | melee (เพื่อบล็อค) |
| `G` | พื้นราบนอกทาง | melee |
| `H` | ที่สูง | ranged เท่านั้น |
| `X` | สิ่งกีดขวาง | — |
| `S` / `E` | จุดเกิด / ประตูฐาน | — |
| `.` | ช่องว่าง | — |

เส้นทางต้องเป็นแนวตั้ง/นอนเท่านั้น (ห้ามทแยง) และต้องพาดผ่าน `R`/`S`/`E` เสมอ — `npm run validate` ตรวจให้

### 3.3 สูตรความเสียหาย (`damage.ts`)
```
raw       = ATK × ratio × (คริ ? critDmg : 1)
physical  = max(raw − DEF, raw × 5%)
magic     = max(raw × (1 − MRES), raw × 5%)
true      = raw
× ธาตุ (ได้เปรียบ 1.3 / เสียเปรียบ 0.7 + โอกาส glancing 15% ×0.7)
× trait ศัตรู (armored ลด physical 30% / magic_resist ลด magic 40%)
× anti_air (ถ้าเป้าบิน) × โบนัสเจาะเผ่า × โบนัสธาตุ (จากการ์ด — Phase 6)
```
**ธาตุ:** น้ำ > ไฟ > ลม > น้ำ | แสง ↔ มืด (ได้เปรียบทั้งสองทาง)
**เผ่า:** ไม่มีแพ้ทางในตัว — การ์ดเท่านั้นที่ให้โบนัสเจาะเผ่า (§8.2 ของ blueprint)

### 3.4 กติกาการบล็อค
- ศัตรูที่ **ไม่บิน** ถูกบล็อคเมื่อเดินเข้าช่องที่มีฮีโร่ melee ซึ่งยังมีช่องบล็อคว่าง (`blockWeight` ของศัตรูกิน slot)
- ศัตรูที่ถูกบล็อค: หยุดเดิน + ตีผู้บล็อค | ผู้บล็อคตาย/ถอน → ปล่อยทันที
- ฮีโร่ melee **ตีศัตรูบินไม่ได้**; ศัตรู stealth ตีไม่ได้จนกว่าจะถูกเปิด (reveal aura / ถูกบล็อค / สถานะ `revealed`)

### 3.5 คำสั่งผู้เล่น = log ที่ replay ได้
`Command` = `deploy | retreat | ultimate` พร้อม `tick` — เก็บไว้ส่งให้ server ตรวจผลด่านได้ใน Phase 5

### 3.6 ระดับของมอนสเตอร์ (`Enemy.tier`)
| tier | trait ที่ต้องมี | บทบาท |
|---|---|---|
| `normal` | — | กำลังพลหลัก มาเป็นเวฟ |
| `elite` | `elite` | มินิบอส โผล่กลางด่าน มีสกิลของตัวเอง เลือดหนากว่าหลายเท่า |
| `mvp` | `boss` | บอสประจำบท เรียกลูกสมุน/บัฟตัวเอง กิน 2–3 ช่องบล็อค |

`npm run validate` บังคับให้ tier กับ traits ตรงกันเสมอ และตรวจว่าลูกสมุนที่สกิลเรียกมีอยู่จริง
ในสนามรบ `elite`/`mvp` จะได้ป้ายชื่อเหนือหัว + หลอดเลือดใหญ่ขึ้นอัตโนมัติ (ไม่ต้องตั้งค่าเพิ่ม)

### 3.7 ดาว
1★ = ชนะ | 2★ = ชนะ + ผ่านเงื่อนไข `stars.two` | 3★ = 2★ + ผ่าน `stars.three` (สะสมกัน ไม่ข้ามขั้น)

---

## §4. สัญญาของ Render (`packages/client`)

- **Sprite billboard 8 ทิศ**: วาดจริง 5 ทิศ (หน้า/หน้าเฉียง/ข้าง/หลังเฉียง/หลัง) แล้ว mirror UV เป็น 8 ทิศ — สูตรเดียวกับ RO ประหยัดงานวาด 37%
- **Atlas manifest** (`ATLAS_MANIFEST`): เฟรม 96×128, 12 คอลัมน์ × 5 แถว, คลิป `idle(2) walk(4) attack(3) death(3)`
  - Phase 2 ใช้ `getAtlas(recipe)` วาด placeholder ด้วย canvas แบบ procedural
  - Phase 3 เปลี่ยนไปใช้ `loadAtlas(png, manifest)` โดย **ไม่ต้องแก้โค้ด render** — รูปแบบ manifest เหมือนกันทุกประการ
- กล้อง isometric 3/4 หมุน/ซูมได้ (จำกัดมุม) — ฉากทั้งหมด build จาก `Stage` JSON ไม่มีการ hardcode แผนที่
- UI ทั้งหมดเป็น HTML/CSS overlay (ไม่วาดใน canvas) — แก้เร็วกว่า 5 เท่า

---

## §5. เศรษฐกิจ & สมดุล

- ทุก faucet/sink อยู่ใน `content/economy.json` + `content/runes.json` (ปรับได้โดยไม่แตะโค้ด)
- **เกณฑ์สมดุลของด่าน:** `npm run balance` รัน AutoPlayer (AI ฮิวริสติก) แล้วเทียบเกณฑ์
  - ที่ "เลเวลอ้างอิง" ของด่าน → ต้องชนะ ≥ 80%
  - ที่เลเวล ⅓ ของเลเวลอ้างอิง → ต้องชนะ ≤ 35% (ไม่งั้นแปลว่าด่านง่ายเกิน)
- **เกณฑ์เศรษฐกิจ:** `npm run economy` — gold sink ต้องลึกพอ (90 วันได้ทอง ≤ 60% ของเป้าหมายปลายเกม) และ F2P ต้องสุ่มได้ ≥ 10 ครั้ง/สัปดาห์แรก
- ปรับสมดุลด้วย **การรันจำลอง** เสมอ ห้ามปรับด้วยความรู้สึก

---

## §6. แผน 10 เฟส (สถานะปัจจุบันอยู่ใน STATUS.md)

| เฟส | ชื่อ | Definition of Done |
|---|---|---|
| **0** | Foundation | monorepo + CLAUDE/STATUS/DECISIONS/PARKING + **schema ทุกระบบ** (hero/skill/enemy/stage/wave/rune/card/drop/economy) + โมเดลเศรษฐกิจ 90 วัน |
| **1** | Combat Sim Core | sim headless ครบ: path, wave, deploy cost, block, targeting, ดาเมจธาตุ×เผ่า, ultimate, ถอนตัว — **unit test ผ่าน + รัน 1,000 ด่านจำลองไม่พัง** |
| **2** | 3D Render + Billboard | ฉาก Three.js จาก JSON, กล้อง isometric, sprite billboard 8 ทิศ + atlas loader, **เล่นด่านทดสอบได้จริงบนมือถือ 60fps** |
| **3** | Sprite Factory | pipeline AI→Aseprite→packer, **ฮีโร่ 5 ตัว + มอน 8 ตัวครบแอนิเมชั่น**, style guide ล็อค |
| **4** | Hero Systems | ฮีโร่ 20 ตัว, เลเวล/สกิล/ดาว/Awaken, จัดทีม 8, UI ฮีโร่ครบชุด |
| **5** | Server + Gacha | auth+save, สุ่มฝั่ง server + pity + แสดงเรท, Energy, Mail, ตัวซ้ำ→Soul Powder — **ทดสอบสถิติสุ่ม 100k ครั้งตรงเรทประกาศ** |
| **6** | Progression Deep | รูนเต็มระบบ (ดรอป/ใส่/อัพ+15/ขาย), อุปกรณ์+การ์ด+ตีบวก, ทุก sink/faucet ผ่าน server |
| **7** | Content Build | ด่าน 90 + dungeon 5 + Endless Tower + World Boss + stage editor |
| **8** | Meta & Economy | เควส 3 ชั้น, achievement, login streak, Battle Pass, ร้านค้า, Monthly Card, IAP, analytics |
| **9** | Polish & FTUE | tutorial 15 นาทีแรก, VFX/SFX, optimize, ปรับสมดุลด้วย sim runs |
| **10** | Soft Launch | ปล่อยไทยก่อน → เก็บ D1/D7/funnel → แก้ → global |

**KPI เป้าหมาย (วัดตอน soft launch):** Tutorial completion ≥80% | D1 ≥35% | D7 ≥15% | D30 ≥8% | เซสชัน ≥15 นาที | จ่ายครั้งแรก ≥2%

---

## §7. ระบบที่ยังไม่สร้าง (มีแค่ schema — อย่าเผลอ implement ข้ามเฟส)

| ระบบ | schema พร้อมแล้วที่ | สร้างใน |
|---|---|---|
| รูน 6 เซ็ต + substat + อัพ +15 | `schema/rune.ts`, `content/runes.json` | Phase 6 |
| การ์ดมอนสเตอร์ (เรทดรอป 0.05–1%) | `schema/card.ts`, `content/cards.json` | Phase 6 |
| ตีบวก +0→+10 (ไม่มีของหายถาวร) | `schema/economy.ts` → `refine` | Phase 6 |
| สุ่มฮีโร่ + pity | `schema/economy.ts` → `gacha` | Phase 5 |
| ตารางดรอป | `schema/drop.ts`, `content/drops.json` | Phase 6 |
| Awakening (ปลุกพลัง) | `Hero.awakenName_th` | Phase 4 |
| โบนัสเจาะเผ่า/ธาตุจากการ์ด | `SquadEntry.raceBonus/elementBonus` (sim รับ input แล้ว) | Phase 6 |

---

## §8. ห้ามทำเด็ดขาด

1. ห้าม import DOM / Three.js เข้า `packages/sim`
2. ห้ามสุ่มด้วย `Math.random()` ใน sim — ต้องผ่าน `Rng` ที่มี seed เท่านั้น
3. ห้าม hardcode ตัวเลขบาลานซ์/ชื่อด่าน/สเปกฮีโร่ในโค้ด
4. ห้ามแก้ `orders`-style state ตรงๆ — เปลี่ยนสถานะยูนิตต้องผ่านเมธอดของ `Battle`
5. ห้ามข้าม Phase / ห้ามประกาศ Phase เสร็จโดย DoD ไม่ครบ
6. ห้ามเชื่อค่าจาก client (Phase 5 เป็นต้นไป) — server คำนวณเองเสมอ

---

## §9. Git convention

- Commit: `feat(p1): melee block system`, `fix(p2): hp bar anchor` — prefix `p{phase}`
- จบทุกงานย่อย = 1 commit ขั้นต่ำ | จบ Phase = tag `phase-{n}-done` หลังผ่าน DoD

---

## §10. วิธีเปลี่ยนธีมทั้งเกม (พิสูจน์แล้วว่าใช้เวลาไม่ถึงชั่วโมง)

ธีมคือ "ผิว" ล้วนๆ ไม่มีระบบไหนผูกกับมัน สิ่งที่ต้องแตะมีแค่ 3 ชั้น:

| ชั้น | ไฟล์ | แก้อะไร |
|---|---|---|
| คอนเทนต์ | `packages/data/content/*.json` | `id`, `name_th`, `awakenName_th`, `lore_th`, `desc_th`, `label_th`, `brief_th`, `sprite.body/weapon/palette` |
| ผิวหน้าจอ | `packages/client/src/styles.css`, `ui/menus.ts` | ชุดสี (`:root` tokens), ฟอนต์, ชื่อเกม, ข้อความ |
| ฉาก 3D | `packages/client/src/render/scene.ts` | `TILE_STYLE`, สีไฟ, สีเส้นทาง, `buildMarkers()` (ประตูฐาน + พอร์ทัล) |

**ห้ามแตะตัวเลข** — hp/atk/def/cost/aspd/range/สกิล/เวฟ/ดรอป ต้องคงเดิมเป๊ะ
วิธีตรวจว่าไม่หลุด: จด output ของ `npm run balance -- --runs 100` ไว้ก่อนเปลี่ยน แล้วรันซ้ำหลังเปลี่ยน
**ทุกช่องต้องตรงกันทุกตัวเลข** ถ้าไม่ตรงแปลว่าเผลอแก้บาลานซ์ไปด้วย

> ลำดับการเกิดของศัตรูถูกตัดสินด้วย "ลำดับในไฟล์ด่าน" ไม่ใช่ชื่อศัตรู (ดู `buildSpawnQueue`)
> จึงเปลี่ยนชื่อได้โดยผลจำลองไม่ขยับ

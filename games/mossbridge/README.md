# Mossbridge — MMORPG 2D (โปรเจ็คแยกจาก ShopDash)

เกม MMORPG สไตล์ chibi hand-painted โลก cozy fantasy ระบบเด่นคือ **ใส่หมวก/ของสวมหัวแล้วเห็นบนตัวละครจริง** (กลไกแบบ Ragnarok Online: paper-doll 3 ช่อง บน/กลาง/ล่าง)
ภาพทั้งหมดจะสร้างด้วย ChatGPT ตามสเปคในโฟลเดอร์นี้

> สำหรับ Claude ที่จะทำงานต่อ: อ่าน [`CLAUDE.md`](CLAUDE.md) ก่อน
>
> โฟลเดอร์นี้ไม่เกี่ยวกับระบบ ShopDash ใน repo เดียวกัน ไม่ถูก build/deploy ไปกับ ShopDash (`tsconfig.json` ที่ root exclude `games/` แล้ว)

## คำตอบสั้น: ทำได้ไหม ยากแค่ไหน

- **ระบบหมวกแบบ RO: ง่าย (2/5)** ทำเป็นต้นแบบใช้งานได้แล้ว → `prototype/headgear-lab/index.html`
  เคล็ดลับคือหัวและหมวกเป็น**ภาพนิ่งต่อทิศ** ไม่ต้องวาดต่อเฟรม หมวก 1 ใบใช้แค่ **2 ภาพ** (หน้า/หลัง) อีก 2 ทิศได้จากการกลับภาพ
- **ส่วนที่ยากจริง:** ทำให้ภาพจาก AI สม่ำเสมอ (4/5) และงานระบบ MMO (เซิร์ฟเวอร์ เซฟ กันโกง คอนเทนต์ 3–4/5)
- แก้เรื่องภาพด้วย: สเปคแคนวาส+จุดยึดตายตัว, prompt ชุดเดียวกันทุกครั้ง, เครื่องมือล้างภาพ, และแอนิเมชันแบบ cutout (ขยับชิ้นภาพด้วยโค้ด แทนให้ AI วาดทุกเฟรม)

อ่านรายละเอียด: [`docs/01-feasibility.md`](docs/01-feasibility.md)

## เอกสาร

| ไฟล์ | เนื้อหา |
|---|---|
| [`docs/01-feasibility.md`](docs/01-feasibility.md) | วิเคราะห์ความเป็นไปได้, RO ทำหมวกอย่างไร, ระดับความยาก, ประเมินภาพที่แนบมา, ความเสี่ยง |
| [`docs/02-art-style-guide.md`](docs/02-art-style-guide.md) | สไตล์กราฟิก: มุมกล้อง สัดส่วน แสง palette เส้นขอบ แผนที่ UI |
| [`docs/03-sprite-spec.md`](docs/03-sprite-spec.md) | สเปค sprite: เลเยอร์, ทิศ, ขนาดแคนวาส, pivot, ระบบผม/หมวก, metadata JSON, การตั้งชื่อไฟล์, QA |
| [`docs/04-chatgpt-prompts.md`](docs/04-chatgpt-prompts.md) | prompt สำเร็จรูปสั่ง ChatGPT ทุกประเภท + ขั้นตอนนำเข้า + backlog ภาพรอบแรก |
| [`docs/05-game-architecture.md`](docs/05-game-architecture.md) | สแตก (PixiJS + Colyseus + Postgres), network, ฐานข้อมูล, โครงโฟลเดอร์, milestone M0–M6 |
| [`docs/06-demo-notes.md`](docs/06-demo-notes.md) | เดโม v0.1: mesh deformation บนภาพวาดภาพเดียว, ท่าทาง, เอฟเฟกต์, ปัญหาที่รู้, ขั้นต่อไป |

## ลองใช้ตอนนี้

### 0) เดโมเล่นได้ (v0.1) — ตัวละครเดียว เดินแมพ ตีมอน ใช้สกิล
```bash
cd demo && python3 -m http.server 8000   # แล้วเปิด http://localhost:8000
```
คลิกพื้น = เดิน, คลิกมอน = ตีคอมโบ, 1–4 = สกิล, 5 = ยา · รายละเอียดเทคนิคและข้อจำกัด: [`docs/06-demo-notes.md`](docs/06-demo-notes.md)

### 1) Headgear Lab (ต้นแบบระบบหมวก)
เปิดไฟล์ `prototype/headgear-lab/index.html` ด้วยเบราว์เซอร์ได้ทันที ไม่ต้องติดตั้งอะไร
- คลิกแผนที่ = เดิน, ปุ่มทิศ = หมุนตัว, เลือกหมวก 3 ช่อง ทรงผม สีผม
- "ปรับตำแหน่ง (Fit)" = ขยับหมวกด้วยลูกศร แล้ว Export JSON
- "ใช้รูปของคุณ" = อัปโหลด PNG จาก ChatGPT มาลองใส่ตัวละครได้เลย

### 2) ชุดคำสั่งสร้างภาพสำหรับ ChatGPT
`Mossbridge_ChatGPT_Pack.zip` (ต้นฉบับอยู่ใน `chatgpt-pack/`): prompt 24 ภาพเรียงตามความสำคัญ + ภาพอ้างอิง + วิธีใช้ภาษาไทย (`00_README_TH.md`)

### 3) ล้างภาพจาก ChatGPT
```bash
pip install pillow numpy
python3 tools/sprite_clean.py art/reference/03_sprite_atlas_original.png -o art/samples \
  --names hero_se,hero_sw,hero_e,hero_nw,npc_bram,npc_minae,mob_sproutling,mob_mossback \
  --canvas 320x320 --anchor 160,300 --height 260,260,260,260,250,260,120,230 --merge-gap 4 --min-area 6000
```
ผลลัพธ์ตัวอย่างอยู่ใน `art/samples/` (ดูภาพรวมที่ `_preview.jpg`)

## โครงโฟลเดอร์

```
games/mossbridge/
  README.md
  docs/                     01–05 เอกสารออกแบบ
  art/reference/            ภาพที่แนบมา (concept, environment, sprite atlas)
  art/samples/              sprite ที่ล้าง+ตัดแล้วจาก atlas
  tools/sprite_clean.py     ล้างพื้น/ขอบ, ตัดชีต, จัดลงแคนวาส+pivot
  prototype/headgear-lab/   ต้นแบบระบบหมวก (HTML ไฟล์เดียว)
  demo/                     เดโมเล่นได้ v0.1 (PixiJS) + assets/
  tools/build_demo_assets.py  ตัดอาวุธออกจากภาพฮีโร่ + เตรียม asset ของเดโม
  (ต่อไป) shared/ client/ server/
```

## สถานะ

- **M0 เสร็จ** (2026-11-06): เอกสาร 5 ฉบับ, เครื่องมือล้างภาพ, Headgear Lab
- **เดโม v0.1** (2026-11-06): เดินแมพจากภาพ concept, คอมโบ 3 จังหวะ, 4 สกิล + เอฟเฟกต์, สไลม์ 7 ตัว + บอสหมูป่า 3 ท่าโจมตี — ใช้ภาพที่แนบมาเท่านั้น
- **ถัดไป M1:** สั่งภาพชุดแรกตาม `docs/04-chatgpt-prompts.md §11` (หัวโล้นแม่แบบ → ทรงผม 3 ทรง → ชุดลำตัว → หมวก 6 ใบ) แล้วเริ่มโปรเจ็ค PixiJS ใน `client/`

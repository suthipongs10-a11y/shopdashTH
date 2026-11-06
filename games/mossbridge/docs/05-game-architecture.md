# 05 — โครงสร้างเกม (Game Architecture)

## 1. สแตกที่เลือก (และเหตุผล)

| ชั้น | เทคโนโลยี | เหตุผล |
|---|---|---|
| Client | **PixiJS (TypeScript) + Vite** | เกม 2D บนเบราว์เซอร์ เล่นได้ทั้ง PC/มือถือ; **เปลี่ยนจาก Phaser (2026-11-06)** เพราะเดโมพิสูจน์แล้วว่าแอนิเมชันที่เนียนกับภาพ AI ต้องใช้ mesh deformation (`SimplePlane`) ซึ่ง PixiJS ทำได้ตรงและเบากว่า (ดู `06-demo-notes.md`) |
| Game server | **Node.js + Colyseus** | ห้อง (room) ต่อแผนที่, sync state อัตโนมัติ (schema delta), reconnect, matchmaking ในตัว — ประหยัดงาน network หลายเดือน |
| Database | **PostgreSQL** (ใช้ Supabase ได้ เพราะคุ้นอยู่แล้ว) | บัญชี ตัวละคร กระเป๋า; transaction สำหรับเทรด/ซื้อขาย |
| ข้อมูลเกม (ไอเท็ม มอน สกิล แผนที่) | ไฟล์ JSON ใน repo (`shared/data/`) + ตรวจด้วย zod ตอนเซิร์ฟเวอร์บูต | แก้บาลานซ์ = แก้ไฟล์ + commit มีประวัติ |
| ตัวแก้แผนที่ | **Tiled** (ฟรี) | ชั้นภาพวาดพื้น + ชั้นกริดชน + object (จุดเกิดมอน, ประตูวาร์ป, NPC) |
| Asset pipeline | `tools/sprite_clean.py` → texture atlas (free-tex-packer-cli) | ภาพ AI → สะอาด → atlas ไฟล์เดียวโหลดเร็ว |
| Deploy | Client: static hosting (Cloudflare Pages/Vercel) · Server: VPS (WebSocket ยาว ๆ ใช้ Vercel ไม่ได้) | เริ่มเครื่องเดียว ~5–10 USD/เดือน |

> โปรเจ็คเกมแยกขาดจาก ShopDash: มี package.json ของตัวเองใน `games/mossbridge/` และ `tsconfig.json` ที่ root ของ repo exclude `games/` แล้ว (build ของ ShopDash ไม่แตะไฟล์เกม)

## 2. ภาพรวมระบบ

```
 Browser (PixiJS client)                         VPS
┌──────────────────────────┐   WSS    ┌─────────────────────────────────┐
│ Scenes: Boot→Login→World │◀───────▶│ Colyseus                         │
│  PaperDoll renderer      │  state   │  LobbyRoom (เลือกตัวละคร)         │
│  Map (Tiled) + y-sort    │  delta   │  MapRoom "mossbridge" ×N instance │
│  UI: chat/hotbar/inv     │  +msgs   │   tick 20 Hz: move, AI มอน, ต่อสู้  │
│  Interp. 100 ms behind   │          │  ChatService (ทั่ว world/guild)   │
└──────────────────────────┘          └───────────────┬─────────────────┘
            ▲ static assets (CDN)                      │ SQL (pool)
            │                                          ▼
     atlas.png / map.json                    PostgreSQL (accounts, characters,
                                              inventory, audit_log)
```

หลักการ: **เซิร์ฟเวอร์ตัดสินทุกอย่าง (authoritative)** client แค่ "ขอ" และ "แสดงผล"
- ผู้เล่นคลิก → ส่ง `move {x, y}` → เซิร์ฟเวอร์หาเส้นทาง A* บนกริดชน → ขยับตำแหน่งทีละ tick ด้วยความเร็วของตัวละคร → state sync ให้ทุกคนในห้อง
- client แสดงตำแหน่งย้อนหลัง ~100 ms แล้ว interpolate (เห็นคนอื่นเดินลื่น) ส่วนตัวเองทำ prediction ตามเส้นทางที่เซิร์ฟเวอร์ตอบ

## 3. การแสดงหมวกในโหมดหลายคน (Look / View ID)

เซิร์ฟเวอร์ไม่ส่งชื่อไฟล์ ส่ง **ตัวเลข view** ที่สั้นที่สุด (แบบเดียวกับ view id ของ RO):

```ts
// shared/schema/Look.ts (Colyseus schema)
class Look extends Schema {
  @type("uint16") body = 1;        // ชุด/อาชีพ+เพศ
  @type("uint8")  hair = 1;        // ทรงผม
  @type("uint8")  hairColor = 0;   // index ใน palette
  @type("uint16") headTop = 0;     // 0 = ไม่ใส่
  @type("uint16") headMid = 0;
  @type("uint16") headLow = 0;
  @type("uint16") weapon = 0;
  @type("uint16") shield = 0;
}
```
เปลี่ยนหมวก 1 ใบ → ส่งแค่ field เดียว (2 byte) ไปให้ทุกคนที่เห็น client เปิด `shared/data/headgear.json` หา `viewId` → ได้ path ภาพ + `fit` + `hair` → PaperDoll วาดใหม่
**ตรรกะ PaperDoll ใน client ย้ายจาก `prototype/headgear-lab` (ฟังก์ชัน `drawChar`) ไปเป็นคลาส PixiJS Container ได้ตรง ๆ**

## 4. โครงโฟลเดอร์เป้าหมาย

```
games/mossbridge/
  docs/                     เอกสารชุดนี้
  art/                      reference / raw / samples
  tools/                    sprite_clean.py, (ต่อไป) build-atlas, validate-data
  prototype/headgear-lab/   ต้นแบบระบบหมวก (HTML ไฟล์เดียว)
  shared/                   (M1) TypeScript ใช้ร่วม client+server
    data/                   items.json, headgear.json, hair.json, mobs.json, skills.json, maps/*.json
    schema/                 Colyseus state classes
    rules/                  สูตรดาเมจ, EXP table (เซิร์ฟเวอร์ใช้คำนวณ, client ใช้แสดง)
  client/                   (M1) PixiJS + Vite
    src/scenes/             Boot, Login, CharSelect, World, UI
    src/render/PaperDoll.ts
    src/net/                Colyseus client, interpolation
    public/assets/          atlas + maps
  server/                   (M2) Colyseus
    src/rooms/MapRoom.ts
    src/systems/            movement(A*), combat, mobAI, drops, chat
    src/db/                 queries + migrations
```

## 5. ข้อมูลถาวร (PostgreSQL)

```sql
accounts      (id uuid pk, auth_user_id uuid unique, created_at, banned_until)
characters    (id uuid pk, account_id fk, name text unique, body smallint, hair smallint, hair_color smallint,
               job text, level int, exp bigint, zeny bigint,
               map text, x int, y int, hp int, sp int, stats jsonb, created_at, last_login)
inventory     (id bigserial pk, character_id fk, item_id int, qty int, refine smallint default 0,
               equipped_slot text null,  -- 'head_top' | 'head_mid' | 'head_low' | 'weapon' | ...
               bound boolean default false)
storage       (... เหมือน inventory แต่ผูก account)
audit_log     (id bigserial, character_id, action text, detail jsonb, at timestamptz)  -- เทรด, ดรอปของหายาก
```
- เซฟเมื่อ: ออกจากเกม, เปลี่ยนแผนที่, ทุก 60 วิ, และ **ทันทีเมื่อมีการเทรด/ซื้อของ** (transaction เดียว)
- `look` ของตัวละครคำนวณจาก `equipped_slot` ไม่เก็บซ้ำ

## 6. ข้อความเครือข่าย (C → S)

| message | payload | เซิร์ฟเวอร์ตรวจ |
|---|---|---|
| `move` | `{x, y}` | อยู่ในแผนที่, เดินถึงได้, ไม่ถี่เกิน 10/วิ |
| `attack` | `{targetId}` | ระยะ, cooldown, เป้ายังมีชีวิต |
| `skill` | `{skillId, targetId?, x?, y?}` | มีสกิล, SP พอ, cooldown |
| `equip` / `unequip` | `{inventoryId}` / `{slot}` | เป็นของตัวเอง, ใส่ช่องนั้นได้, จัดการ `occupies` |
| `pickup` | `{dropId}` | ระยะ, สิทธิ์เก็บ |
| `chat` | `{channel, text}` | ยาว ≤ 120, rate limit, กรองคำ |
| `npc` | `{npcId, option}` | ระยะ, สคริปต์ NPC |

## 7. กันโกงขั้นพื้นฐาน (ทำตั้งแต่แรก)

- ตำแหน่ง ดาเมจ ดรอป EXP คำนวณบนเซิร์ฟเวอร์เท่านั้น
- ทุก message มี rate limit ต่อ connection
- ของมีค่าเปลี่ยนมือผ่าน transaction + audit_log
- ไม่ส่งข้อมูลที่ผู้เล่นไม่ควรรู้ (HP มอนที่อยู่นอกจอ, ดรอปของคนอื่น)

## 8. Milestones (ทำทีละขั้น ผ่าน DoD ก่อนไปต่อ)

### M0 — Pipeline & Headgear Lab ✅ (เซสชันนี้)
- [x] วิเคราะห์ความเป็นไปได้ + art guide + sprite spec + prompt pack + architecture
- [x] `tools/sprite_clean.py` ล้างภาพ atlas ที่แนบมาได้ → `art/samples/`
- [x] Headgear Lab: 3 ช่องหมวก, hair mode full/capped/hidden, 4 ทิศ (2 วาด + 2 กลับด้าน), เดิน, fit editor, อัปโหลด PNG, export JSON

### M1 — Client เดินได้คนเดียว + ภาพจริงชุดแรก
- PixiJS + Vite ใน `client/`, ย้ายโค้ดจาก `demo/game.js` (mesh rig) + PaperDoll จาก lab มาเป็นโมดูล TypeScript
- แผนที่ทดสอบจาก Tiled (ภาพพื้น + กริดชน 32 px) คลิกเดินด้วย A*, y-sort, ชั้น overlay บังตัวละคร
- ภาพจริงชุดแรกตาม backlog `04 §11` ข้อ 1–5
- **DoD:** เดินรอบแผนที่ไม่ทะลุน้ำ/กำแพง, ใส่ถอดหมวก 6 ใบ × ทรงผม 3 ทรง ครบ 4 ทิศไม่มีผมทะลุ, 60 fps บนมือถือระดับกลาง

### M2 — หลายคนเห็นกัน
- Colyseus `MapRoom`, sync ตำแหน่ง+look, interpolation, แชท General, ประตูวาร์ประหว่าง 2 แผนที่
- **DoD:** เปิด 2 เบราว์เซอร์ เห็นกันเดินลื่น เปลี่ยนหมวกแล้วอีกฝั่งเห็นภายใน 200 ms, จำลอง 50 bot ในห้องเดียว CPU เซิร์ฟเวอร์ < 30%

### M3 — ต่อสู้และมอนสเตอร์
- สไลม์ต้นอ่อน + หมูป่ามอส (บอส), auto-attack แบบคลิกเป้า, HP/ตาย/เกิดใหม่, EXP/เลเวล, ดรอปของบนพื้น, hotbar 5 สกิล
- **DoD:** ยิง message ปลอม (ตีไกลเกิน/ถี่เกิน) ถูกปฏิเสธ, ดรอปตรงตาราง (ทดสอบ 10,000 ครั้ง)

### M4 — บัญชี ตัวละคร กระเป๋า
- Login, สร้างตัวละคร (เลือกทรงผม/สีผม), กระเป๋า, สวมใส่, เซฟ/โหลด
- **DoD:** ปิดเซิร์ฟเวอร์กลางคันแล้วเปิดใหม่ ของไม่หาย/ไม่งอก, ใส่หมวกแล้วรีล็อกอินยังใส่อยู่

### M5 — Vertical slice "Defend Mossbridge"
- เมือง + ทุ่ง 2 + ดันเจียน 1, NPC ร้านค้า (Elda), ช่างตีเหล็ก (Bram) ทำหมวกจากวัตถุดิบ, เควส, ปาร์ตี้ 4 คน, UI ตาม concept
- **DoD:** ผู้ทดสอบ 5 คนเล่นจบเควสหลักได้โดยไม่มีคนช่วยอธิบาย

### M6 — เปิดทดสอบปิด
- Deploy จริง, backup DB รายวัน, log/monitor, หน้าแจ้งปัญหา

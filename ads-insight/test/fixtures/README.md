# test/fixtures

Response จริงจาก Google Ads API ที่ **ลบข้อมูลส่วนตัวแล้ว** ใช้ทดสอบ logic วิเคราะห์

จำเป็นเพราะ test account ของ Google ไม่มีข้อมูล performance เลย (SPEC §4) — ถ้าไม่มี fixtures
จะทดสอบ derived metrics / pacing / guardrails ไม่ได้

## วิธีเก็บ

```bash
pnpm capture:fixtures                      # ลบข้อมูลส่วนตัวให้อัตโนมัติ
pnpm capture:fixtures --keep-search-terms  # เก็บคำค้นจริงไว้ (ตัดสินใจเอง)
```

รันบนเครื่องที่มี `.dev.vars` จริง — ใช้ ~7 API call · **อ่านอย่างเดียว**

สคริปต์แทนที่ให้ก่อนเขียนไฟล์: Customer ID และ id ทุกตัว (คงความสัมพันธ์ไว้ ให้ join กันได้),
ชื่อแคมเปญ/ad group, ข้อความแอด, คำค้น, URL, อีเมล, เบอร์โทร —
แล้ว**ตรวจซ้ำ** ว่าไม่มี Customer ID หรือชื่อบัญชีจริงหลงเหลือ ถ้าเจอจะไม่เขียนไฟล์นั้นเลย

ตัวเลข metrics ทั้งหมดถูกเก็บไว้ตามจริง เพราะนั่นคือสิ่งที่ fixtures มีไว้ทดสอบ

> สคริปต์เป็นด่านแรก **ตาคนคือด่านสุดท้าย** — เปิดอ่านก่อน commit ทุกครั้ง

## กติกาก่อน commit fixture
- ลบ/แทนที่: customer ID จริง, ชื่อบัญชี, ชื่อลูกค้า, เบอร์โทร, URL ของเว็บจริง, ข้อความแอดที่ระบุตัวตนได้
- เก็บ shape และชนิดข้อมูลไว้ให้ครบ (ตัวเลข metrics ปลอมได้ แต่ต้องสมจริง)
- ตั้งชื่อตาม resource ที่ query: `search-term-view.30d.json`, `campaign.metrics.json`
- ไฟล์ที่ยังไม่ได้ลบข้อมูลส่วนตัว ให้ตั้งชื่อลงท้าย `.raw.json` — `.gitignore` กันไว้แล้ว

---

## `synthetic/` — บัญชีสมมติที่ "มี traffic"

บัญชีจริงยังไม่เคยแสดงผลเลย metric ทุกตัวเป็น 0 → fixtures ด้านบนพิสูจน์ได้แค่ **โครงสร้าง**
ของ response ทดสอบ **การคำนวณ** ไม่ได้เลย (CTR, CPC, impression share, pacing, คำที่เผางบ)
test account ของ Google ก็ไม่มีข้อมูล performance เช่นกัน (SPEC §4) จึงไม่มีที่ให้ capture

`synthetic/` จึงเป็นไฟล์ที่ **เขียนขึ้นเอง** ไม่ใช่ข้อมูลจริง — ทุกไฟล์มี `_meta.synthetic: true`
และอยู่คนละโฟลเดอร์ เพื่อไม่ให้ใครหยิบไปอ้างเป็นข้อมูลของบัญชีจริง

```bash
pnpm fixtures:synthetic     # seed คงที่ → ผลลัพธ์เหมือนเดิมทุกครั้ง (regenerate แล้ว diff ต้องว่าง)
```

บัญชีที่จำลอง: Search อย่างเดียว, THB, Asia/Bangkok, เป้าหมาย **traffic** (D26) — 3 แคมเปญ
แบรนด์ / ทั่วไป / คู่แข่ง พร้อมปัญหาฝั่ง traffic ที่ตั้งใจใส่ไว้ให้หาเจอ:

| เคส | อยู่ที่ไหน |
|---|---|
| impression เยอะ คลิกแทบไม่มี (CTR 0.15%) | keyword `อินเทอร์เน็ตบ้าน` |
| CPC แพงกว่าค่าเฉลี่ยบัญชี ~4 เท่า | keyword `ย้ายค่ายเบอร์เดิม` |
| คลิกมาแล้วไม่เข้าหน้าเว็บ (page view 23%) | keyword `โปรเน็ต true` |
| คีย์เวิร์ดที่ไม่เคยแสดงเลย | keyword `ซิมเทพ รายปี` |
| คำค้นที่ควรเป็น negative | `เน็ตฟรี...`, `สมัครงาน ais`, `วิธียกเลิกโปรเน็ต` |
| แคมเปญที่ชนงบทุกวัน | `Search — ทั่วไป` (budget lost IS ~62%) |
| ช่วงที่คู่แข่งบิดสู้ | `Search — คู่แข่ง` ตั้งแต่ 2026-09-08 |

**กติกาที่ `test/unit/fixtures.test.ts` บังคับไว้** (แก้ตัวเลขมั่วแล้วเทสจะแดง):
- ctr = clicks / impressions · average_cpc = cost / clicks
- impression share 3 ตัวรวมกัน = 1 พอดี · conversions ≤ clicks
- **keyword / รายวัน / ราย ชั่วโมง ของแคมเปญเดียวกัน ต้องรวมได้เท่ากันเป๊ะ** — ของจริงก็ตรงกัน
- search terms ต้องคลิกน้อยกว่า keywords (Google แสดงเฉพาะคำที่ผ่าน privacy threshold)
- field ที่ค่าเป็น 0 ต้อง **ไม่มี key** เลย เหมือน proto3 JSON ที่ REST ส่งมาจริง

# scripts/ — สคริปต์ถาวรของโปรเจ็ค

สคริปต์ในโฟลเดอร์นี้ **commit เข้า repo เสมอ** — บทเรียนสำคัญ (2026-07-16): ธีม T1–T4
เคยถูก insert เข้า `theme_registry` ผ่านสคริปต์ `.tmp-*` ที่ไม่ได้ commit ทำให้ fresh install
พัง FK เงียบๆ (แก้แล้วใน migration 012) — สคริปต์ seed/ทดสอบที่ "ต้องรันซ้ำได้ในอนาคต"
ห้ามทิ้งไว้เป็น `.tmp-*` อีก

## กติกา

- `.tmp-*` = ของทิ้งจริงๆ เท่านั้น (สคริปต์ scratch ใช้ครั้งเดียวในเซสชัน) — ถูก gitignore
- สคริปต์ seed ร้านเดโม่ / e2e / เครื่องมือที่จะรันซ้ำ → เก็บที่นี่ ตั้งชื่อสื่อความหมาย
- สคริปต์ต้องอ่าน credentials จาก `.env.local` (dotenv) — ห้าม hardcode key ใดๆ ในไฟล์

## สคริปต์ปัจจุบัน

| ไฟล์ | หน้าที่ |
|---|---|
| `test-isolation.ts` | ทดสอบ RLS/tenant isolation (DoD Phase 2 — รัน: copy เป็น `.mts` + `npx tsx@latest`) |
| `seed-load.ts` | seed ออร์เดอร์จำนวนมากสำหรับทดสอบ performance แดชบอร์ด (Phase 5) |
| `setup-super-admin.mjs` | สร้าง/ตั้ง role super admin user |
| `setup-tenant-users.mjs` | สร้าง user แอดมินร้านผูก tenant |

## ⚠ สคริปต์ที่ต้องกู้จากเครื่องเจ้าของ (ยังอยู่นอก repo)

สคริปต์เหล่านี้ถูกอ้างใน STATUS.md ว่า "รันซ้ำได้" แต่เป็นไฟล์ `.tmp-*` ในเครื่องเจ้าของ
ถ้าเครื่องนั้นหาย = ร้านเดโม่ทั้ง 4 ที่หน้า landing ใช้โชว์ reproduce ไม่ได้:

| ไฟล์เดิม (เครื่องเจ้าของ) | หน้าที่ | ย้ายมาเป็น |
|---|---|---|
| `.tmp-t1-seed.mjs` | seed ร้านเดโม่ `simplewear` (เทมเพลต T1) | `scripts/seed-demo-t1.mjs` |
| `.tmp-t2-seed.mjs` | seed ร้านเดโม่ `wearstore` (T2) + อัปรูปเข้า R2 | `scripts/seed-demo-t2.mjs` |
| `.tmp-t3-seed.mjs` | seed ร้านเดโม่ `fashionhub` (T3) | `scripts/seed-demo-t3.mjs` |
| `.tmp-t4-seed.mjs` | seed ร้านเดโม่ `luxe` (T4) | `scripts/seed-demo-t4.mjs` |
| `.tmp-t2-reviews-seed.mjs` | seed รีวิว 236 แถวร้าน wearstore | `scripts/seed-demo-reviews.mjs` |
| `.tmp-labels-seed.mjs` | seed ร้านของเล่นเดโม่ (shop2 — variant labels) | `scripts/seed-demo-toys.mjs` |
| `.tmp-landing-shots.mjs` | ถ่าย screenshot ร้านเดโม่ทำรูปหน้า landing | `scripts/landing-shots.mjs` |
| `.tmp-landing-regression.mjs` | regression 19 ข้อของ landing + routing | `scripts/landing-regression.mjs` |

วิธีกู้ (ทำในเครื่องเจ้าของ):

```bash
# ตรวจว่าไฟล์ไหนยังอยู่
ls .tmp-*.mjs

# ย้ายเข้า scripts/ ตามตารางข้างบน แล้วตรวจว่าไม่มี secret ฝังในไฟล์ (ต้องอ่านจาก .env.local เท่านั้น)
git add scripts/ && git commit
```

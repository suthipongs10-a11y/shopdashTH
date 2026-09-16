# src/db

Schema และ migrations ของ D1

**ยังว่างโดยตั้งใจ** — ร่าง schema อยู่ใน [`docs/SPEC.md §10`](../../docs/SPEC.md) และจะถูกแปลงเป็น
migration จริงใน **M3 (Data Layer)** ไม่ใช่ตอนนี้

เหตุผลที่ไม่เขียน `schema.sql` ไว้ล่วงหน้า: ถ้ามีไฟล์ SQL วางไว้ก่อน M3 จะกลายเป็น "ของที่ดูเหมือน
ตัดสินใจแล้ว" ทั้งที่ยังไม่ได้ออกแบบ index / constraint จริง — M3 ต้องอ่าน §10 แล้วออกแบบเอง

## เมื่อถึง M3
1. `pnpm exec wrangler d1 create ads_insight` (ถ้ายังไม่ได้ทำใน M0) แล้วใส่ `database_id` ใน `wrangler.toml`
2. `pnpm exec wrangler d1 migrations create ads_insight <ชื่อ>` → ไฟล์จะไปอยู่ใน `migrations/`
3. `pnpm db:migrate` (local) → ทดสอบ → `pnpm db:migrate:remote` เมื่อผู้ใช้สั่ง

ทุกตารางต้องมี `org_id` และตารางที่ผูกบัญชีต้องมี `account_id` (SPEC §10, D10)

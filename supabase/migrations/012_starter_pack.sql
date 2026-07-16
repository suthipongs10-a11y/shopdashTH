-- 012: Starter Store — ร้านใหม่เกิดมาพร้อมข้อมูลตัวอย่างเต็มรูปแบบ (สินค้า/หมวด/เพจ)
-- ให้ลูกค้า trial เห็นร้านสวยทันทีหลัง signup แล้วค่อยแก้เป็นของตัวเอง (แก้ปัญหา empty state)
--
-- is_sample = แถวที่ระบบ seed ให้ตอน provisioning — ใช้เพื่อ:
--   (ก) แสดง badge "ตัวอย่าง" ในหลังร้าน + แบนเนอร์เตือนบนแดชบอร์ด
--   (ข) ปุ่ม "ลบข้อมูลตัวอย่างทั้งหมด" ลบเฉพาะของที่ระบบสร้าง ไม่แตะของจริงของร้าน
--   (ค) ไม่นับรวม limit สินค้าตามแพลน (§5.1) — ของตัวอย่างไม่ควรกินโควตาลูกค้า
--
-- ไม่มีตารางใหม่ → ไม่มี RLS ใหม่ (คอลัมน์ใช้ policy เดิมของตาราง)

alter table products add column if not exists is_sample boolean not null default false;
alter table categories add column if not exists is_sample boolean not null default false;
alter table pages add column if not exists is_sample boolean not null default false;

-- ธีมชุด Commerce Premium (T1-T4) — เดิมถูก insert ตรงเข้า DB ผ่านสคริปต์ seed ชั่วคราว
-- ที่ไม่ได้ commit → install ใหม่จะไม่มีแถวเหล่านี้ แล้ว provisioning ที่ตั้ง theme_code
-- ตามแพลนจะชน FK (stores.theme_code → theme_registry.code) — upsert ให้ครบที่นี่
-- (ค่า tier/feature_defaults ตรงกับ preset ใน themes/presets/*.ts)
insert into theme_registry (code, name_th, tier, feature_defaults) values
  ('t1-simple', 'ซิมเปิล (แนะนำสินค้า)', 1, '{"wishlist": false, "related_products": false}'::jsonb),
  ('t2-store',  'สโตร์ (Commerce)',      2, '{"wishlist": true,  "related_products": true}'::jsonb),
  ('t3-hub',    'ฮับ (Marketplace)',     2, '{"wishlist": true,  "related_products": true}'::jsonb),
  ('t4-luxe',   'ลุกซ์ (Luxury)',        3, '{"wishlist": true,  "related_products": true}'::jsonb)
on conflict (code) do nothing;

-- ให้ query "นับสินค้าจริง" (limit check) และ "หาของตัวอย่าง" (ปุ่มลบ) เร็วพอโดยไม่ต้อง index เพิ่ม
-- — ตารางเหล่านี้มี index (tenant_id, ...) อยู่แล้ว และแถว sample ต่อร้านมีจำนวนคงที่ (~สิบกว่าแถว)

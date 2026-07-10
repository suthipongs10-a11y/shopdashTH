-- ============================================================
-- 007_billing_v2.sql — Billing v2 (โมเดลรับจ้างทำเว็บ) + สรุปออร์เดอร์
--
-- (ก) แยก "ราคาปีแรก (รวมค่าจัดทำ)" ออกจาก "ค่าดูแลรายปี":
--     plans.price_renewal — null = ต่ออายุราคาเดียวกับปีแรก (พฤติกรรมเดิม)
-- (ข) feature ใหม่ theme_customize — ย้าย gating หน้า "ปรับแต่งธีม"
--     จากผูกกับธีม prem-01/02 มาเป็น flag ตามแพลน (P2 ขึ้นไปปรับสี/ฟอนต์ได้)
-- (ค) แพ็กเกจใหม่ 4 ตัว (เริ่มต้น/ร้านค้า/ธุรกิจ/พรีเมียม) แทนชุดเดิม
--     starter/pro/premium — ชุดเดิมปิดขาย (is_active=false)
--     ร้านที่ถือแพลนเดิมใช้ต่อได้ตามปกติ ไม่กระทบ
-- (ง) orders.public_token — token สำหรับ "ลิงก์สรุปออร์เดอร์" ของลูกค้า
--     (เลขออร์เดอร์รูปแบบ {SLUG}-{YYMMDD}-{run} เดาง่าย ห้ามใช้เดี่ยวๆ
--      เปิดข้อมูลที่อยู่/เบอร์ลูกค้า — ดู DECISIONS)
-- (จ) stores.order_cutoff_time + shipping_note_th — เวลาตัดรอบจัดส่ง
--     และหมายเหตุการจัดส่ง แสดงในหน้าสรุปออร์เดอร์
-- ============================================================

-- ---------- (ก) ราคาต่ออายุ ----------
alter table plans add column if not exists price_renewal int
  check (price_renewal is null or price_renewal >= 0);

comment on column plans.price_renewal is
  'ค่าดูแลรายปี (ปีถัดไป) — null = ใช้ price_yearly เท่าปีแรก';

-- ---------- (ข) theme_customize ให้ของเดิมที่เคยปรับแต่งได้ ----------
-- แพลน premium เดิม: ธีม tier 3 (prem-01/02) ปรับแต่งได้ → คงสิทธิ์ผ่าน flag
update plans
  set features = features || '{"theme_customize": true}'::jsonb
  where code = 'premium';

-- ธีม prem-01/02 ประกาศ "ปรับแต่งได้" ที่ตัวธีม → คงพฤติกรรมผ่าน feature_defaults
-- (resolveFeatures: plan → theme → override รายร้าน)
update theme_registry
  set feature_defaults = coalesce(feature_defaults, '{}'::jsonb)
      || '{"theme_customize": true}'::jsonb
  where code in ('prem-01', 'prem-02');

-- ---------- (ค) แพ็กเกจใหม่ 4 ตัว ----------
insert into plans
  (code, name_th, price_yearly, price_renewal, max_products, max_images_per_product,
   max_staff, allowed_theme_tier, features)
values
  ('p1-start', 'เริ่มต้น', 990, 590, 30, 3, 0, 1, '{
    "custom_domain": false,
    "slip_verify_api": false,
    "line_oa": false,
    "discount_codes": false,
    "analytics_dashboard": false,
    "staff_accounts": false,
    "theme_customize": false
  }'::jsonb),
  ('p2-shop', 'ร้านค้า', 3900, 1200, 300, 6, 0, 3, '{
    "custom_domain": true,
    "slip_verify_api": false,
    "line_oa": false,
    "discount_codes": true,
    "analytics_dashboard": false,
    "staff_accounts": false,
    "theme_customize": true
  }'::jsonb),
  ('p3-business', 'ธุรกิจ', 7900, 2400, -1, 10, 3, 3, '{
    "custom_domain": true,
    "slip_verify_api": false,
    "line_oa": true,
    "discount_codes": true,
    "analytics_dashboard": true,
    "staff_accounts": true,
    "theme_customize": true
  }'::jsonb),
  ('p4-premium', 'พรีเมียม', 15900, 4900, -1, 15, 5, 3, '{
    "custom_domain": true,
    "slip_verify_api": true,
    "line_oa": true,
    "discount_codes": true,
    "analytics_dashboard": true,
    "staff_accounts": true,
    "theme_customize": true
  }'::jsonb)
on conflict (code) do nothing;

-- ปิดขายชุดเดิม (ร้านที่ถืออยู่ไม่กระทบ — flag คำนวณจากแถวแพลนตรงๆ §5.2)
update plans set is_active = false where code in ('starter', 'pro', 'premium');

-- ---------- (ง) token ลิงก์สรุปออร์เดอร์ ----------
alter table orders add column if not exists public_token uuid not null default gen_random_uuid();

comment on column orders.public_token is
  'token ในลิงก์สรุปออร์เดอร์ — เลขออร์เดอร์+token ถูกต้องจึงเห็นข้อมูลจัดส่งเต็ม';

-- ---------- (จ) เวลาตัดรอบจัดส่ง + หมายเหตุจัดส่ง ----------
alter table stores add column if not exists order_cutoff_time text
  check (order_cutoff_time is null or order_cutoff_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
alter table stores add column if not exists shipping_note_th text;

comment on column stores.order_cutoff_time is
  'เวลาตัดรอบจัดส่งรายวัน (HH:MM เวลาไทย) — null = ไม่แสดงข้อความตัดรอบ';
comment on column stores.shipping_note_th is
  'หมายเหตุการจัดส่งของร้าน แสดงในหน้าสรุป/ชำระเงินของลูกค้า';

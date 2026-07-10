-- ============================================================
-- seed.sql — Phase 1 (task 1.2)
-- Seed: 3 plans (§5.1) + theme basic-01 + demo tenant/store/category.
-- Idempotent: ทุก insert มี on conflict do nothing — รันซ้ำได้
--
-- Demo tenant ใช้ fixed UUID เพื่อให้ getTenantContext() เวอร์ชัน
-- Phase 1 อ้างค่าคงที่ได้ (ดู DECISIONS.md)
-- ============================================================

-- ------------------------------------------------------------
-- Plans ชุดเดิม §5.1 — ปิดขายแล้ว (Billing v2 ใช้แพ็กเกจใหม่ใน 007)
-- ยังต้อง seed เพราะ demo/shop2 อ้างถึง และติดตั้งใหม่รัน migrations ก่อน seed
-- (ถ้า seed insert เป็น active จะไปเปิดขายแพลนเก่าทับ 007)
-- ------------------------------------------------------------
insert into plans
  (code, name_th, price_yearly, max_products, max_images_per_product, max_staff, allowed_theme_tier, features, is_active)
values
  ('starter', 'สตาร์ทเตอร์', 990, 50, 3, 0, 1, '{
    "custom_domain": false,
    "slip_verify_api": false,
    "line_oa": false,
    "discount_codes": false,
    "analytics_dashboard": false,
    "staff_accounts": false
  }'::jsonb, false),
  ('pro', 'โปร', 1990, 300, 6, 2, 2, '{
    "custom_domain": true,
    "slip_verify_api": false,
    "line_oa": true,
    "discount_codes": true,
    "analytics_dashboard": true,
    "staff_accounts": true
  }'::jsonb, false),
  ('premium', 'พรีเมียม', 3990, -1, 10, 5, 3, '{
    "custom_domain": true,
    "slip_verify_api": true,
    "line_oa": true,
    "discount_codes": true,
    "analytics_dashboard": true,
    "staff_accounts": true,
    "theme_customize": true
  }'::jsonb, false)
on conflict (code) do nothing;

-- ------------------------------------------------------------
-- Theme registry — Phase 1 มีธีมเดียว basic-01 (ที่เหลือ Phase 4)
-- ------------------------------------------------------------
insert into theme_registry (code, name_th, tier, feature_defaults)
values ('basic-01', 'มินิมอลขาว', 1, '{"wishlist": false, "related_products": false}'::jsonb)
on conflict (code) do nothing;

-- ------------------------------------------------------------
-- Demo tenant (Phase 1 ร้านเดียว hardcode — slug 'demo')
-- status 'active' + หมดอายุไกลๆ เพื่อไม่ให้ sweep ของ Phase 3 มาล็อกร้าน dev
-- ------------------------------------------------------------
insert into tenants (id, slug, plan_id, status, subscription_ends_at)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo',
  p.id,
  'active',
  now() + interval '10 years'
from plans p
where p.code = 'pro'
on conflict (id) do nothing;

insert into stores
  (id, tenant_id, name, promptpay_id, promptpay_account_name, address, phone, flat_shipping_fee, free_shipping_min)
values (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ร้านเดโม ShopDash',
  '0812345678',            -- placeholder — เปลี่ยนเป็น PromptPay จริงที่หน้า ตั้งค่าร้าน (1.10)
  'ร้านเดโม ShopDash',
  '123 ถนนตัวอย่าง แขวงทดสอบ เขตทดสอบ กรุงเทพฯ 10110',
  '0812345678',
  50,                      -- ค่าส่ง flat 50 บาท
  1000                     -- ส่งฟรีเมื่อยอด ≥ 1,000 บาท
)
on conflict (id) do nothing;

insert into categories (id, tenant_id, name, sort_order)
values (
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'สินค้าทั้งหมด',
  0
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- ร้านที่ 2 (Phase 2 — ทดสอบ tenant isolation, slug 'shop2')
-- ธีมเดียวกัน (basic-01) แต่ override สีหลัก → เห็นค่า token ต่างกันชัด
-- ⚠ ต้องรันไฟล์นี้ "ก่อน" 002_rls.sql (FORCE RLS บล็อก insert ของ postgres)
-- ------------------------------------------------------------
insert into tenants (id, slug, plan_id, status, subscription_ends_at)
select
  '00000000-0000-0000-0000-000000000011'::uuid,
  'shop2',
  p.id,
  'active',
  now() + interval '10 years'
from plans p
where p.code = 'starter'
on conflict (id) do nothing;

insert into stores
  (id, tenant_id, name, promptpay_id, promptpay_account_name, address, phone,
   flat_shipping_fee, free_shipping_min, theme_overrides)
values (
  '00000000-0000-0000-0000-000000000012'::uuid,
  '00000000-0000-0000-0000-000000000011'::uuid,
  'ร้านสอง เสื้อผ้าเด็ก',
  '0900000000',
  'ร้านสอง เสื้อผ้าเด็ก',
  '55 ถนนร้านสอง ตำบลทดสอบ อำเภอเมือง เชียงใหม่ 50000',
  '0900000000',
  40,
  null,
  '{"--color-primary": "#7c3aed", "--color-accent": "#f59e0b"}'::jsonb
)
on conflict (id) do nothing;

insert into categories (id, tenant_id, name, sort_order)
values (
  '00000000-0000-0000-0000-000000000013'::uuid,
  '00000000-0000-0000-0000-000000000011'::uuid,
  'สินค้าทั้งหมด',
  0
)
on conflict (id) do nothing;

insert into products (id, tenant_id, category_id, name, description_md, base_price, status, is_featured)
values (
  '00000000-0000-0000-0000-000000000014'::uuid,
  '00000000-0000-0000-0000-000000000011'::uuid,
  '00000000-0000-0000-0000-000000000013'::uuid,
  'ชุดเด็กลายการ์ตูน',
  'สินค้าตัวอย่างของร้านที่สอง — ใช้ทดสอบ tenant isolation',
  450,
  'published',
  true
)
on conflict (id) do nothing;

insert into product_variants (id, tenant_id, product_id, size, color, stock)
values
  ('00000000-0000-0000-0000-000000000015'::uuid,
   '00000000-0000-0000-0000-000000000011'::uuid,
   '00000000-0000-0000-0000-000000000014'::uuid,
   'S', 'ฟ้า', 5),
  ('00000000-0000-0000-0000-000000000016'::uuid,
   '00000000-0000-0000-0000-000000000011'::uuid,
   '00000000-0000-0000-0000-000000000014'::uuid,
   'M', 'ฟ้า', 8)
on conflict (id) do nothing;

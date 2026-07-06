-- ============================================================
-- seed.sql — Phase 1 (task 1.2)
-- Seed: 3 plans (§5.1) + theme basic-01 + demo tenant/store/category.
-- Idempotent: ทุก insert มี on conflict do nothing — รันซ้ำได้
--
-- Demo tenant ใช้ fixed UUID เพื่อให้ getTenantContext() เวอร์ชัน
-- Phase 1 อ้างค่าคงที่ได้ (ดู DECISIONS.md)
-- ============================================================

-- ------------------------------------------------------------
-- Plans (ค่าเริ่มต้นตามตาราง §5.1 — แก้ภายหลังได้จาก Super Admin UI)
-- ------------------------------------------------------------
insert into plans
  (code, name_th, price_yearly, max_products, max_images_per_product, max_staff, allowed_theme_tier, features)
values
  ('starter', 'สตาร์ทเตอร์', 990, 50, 3, 0, 1, '{
    "custom_domain": false,
    "slip_verify_api": false,
    "line_oa": false,
    "discount_codes": false,
    "analytics_dashboard": false,
    "staff_accounts": false
  }'::jsonb),
  ('pro', 'โปร', 1990, 300, 6, 2, 2, '{
    "custom_domain": true,
    "slip_verify_api": false,
    "line_oa": true,
    "discount_codes": true,
    "analytics_dashboard": true,
    "staff_accounts": true
  }'::jsonb),
  ('premium', 'พรีเมียม', 3990, -1, 10, 5, 3, '{
    "custom_domain": true,
    "slip_verify_api": true,
    "line_oa": true,
    "discount_codes": true,
    "analytics_dashboard": true,
    "staff_accounts": true
  }'::jsonb)
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

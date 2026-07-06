-- ============================================================
-- 001_init.sql — Phase 1 (task 1.2)
-- Full schema per CLAUDE.md §3.3–3.4 (all tables include tenant_id
-- from day one so Phase 2 needs no backfill migration).
--
-- NOTE: RLS is intentionally NOT enabled here — that is Phase 2
-- (migration 002_rls.sql) per §6. Do not add policies in this file.
--
-- NOTE: JWT helper functions live in schema `public` instead of
-- `auth` (spec §3.2) because new Supabase projects revoke CREATE on
-- the auth schema from the postgres role. See DECISIONS.md.
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (§3.2)
-- ------------------------------------------------------------

-- tenant_id from JWT app_metadata (set during provisioning, Phase 2+)
create or replace function public.app_tenant_id() returns uuid
language sql stable as $$
  select nullif(
    (current_setting('request.jwt.claims', true))::json -> 'app_metadata' ->> 'tenant_id',
    ''
  )::uuid
$$;

-- role from JWT app_metadata: 'store_owner' | 'store_staff' | 'super_admin'
create or replace function public.app_role() returns text
language sql stable as $$
  select (current_setting('request.jwt.claims', true))::json -> 'app_metadata' ->> 'role'
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable as $$
  select public.app_role() = 'super_admin'
$$;

-- generic updated_at trigger
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Platform-level tables (§3.3)
-- ------------------------------------------------------------

create table plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,               -- 'starter' | 'pro' | 'premium'
  name_th text not null,
  price_yearly int not null,               -- บาท
  max_products int not null,               -- -1 = unlimited
  max_images_per_product int not null,
  max_staff int not null,
  allowed_theme_tier int not null,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  plan_id uuid not null references plans(id),
  status text not null default 'trial'
    check (status in ('trial','active','grace','locked','archived')),
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  feature_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  plan_id uuid not null references plans(id),
  amount int not null,
  slip_r2_key text,
  approved_by uuid,
  approved_at timestamptz,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);
create index tenant_subscriptions_tenant_idx on tenant_subscriptions (tenant_id);

create table custom_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid unique not null references tenants(id),  -- 1 ร้าน 1 โดเมนใน v1.1
  domain text unique not null,
  verification_token text not null,        -- TXT: shopdash-verify={token}
  -- 'suspended' = plan downgrade keeps the row but disables routing (§7.2)
  status text not null default 'pending'
    check (status in ('pending','verifying','verified','active','error','suspended')),
  last_error_th text,
  checked_at timestamptz
);

create table theme_registry (
  code text primary key,
  name_th text not null,
  tier int not null,
  preview_r2_key text,
  feature_defaults jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);

create table provisioning_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid,
  step text not null,
  status text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index provisioning_logs_tenant_idx on provisioning_logs (tenant_id);

-- ------------------------------------------------------------
-- Tenant-level tables (§3.4) — every table has tenant_id
-- ------------------------------------------------------------

create table stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid unique not null references tenants(id),
  name text not null,
  logo_r2_key text,
  banner_r2_key text,
  -- เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก
  promptpay_id text
    check (promptpay_id is null or promptpay_id ~ '^[0-9]{10}$|^[0-9]{13}$'),
  promptpay_account_name text,
  address text,
  phone text,
  flat_shipping_fee int not null default 0 check (flat_shipping_fee >= 0),
  free_shipping_min int,                   -- null = ไม่มีส่งฟรี
  theme_code text not null default 'basic-01' references theme_registry(code),
  theme_overrides jsonb not null default '{}'::jsonb
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  sort_order int not null default 0,
  unique (tenant_id, name)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  category_id uuid references categories(id),
  name text not null,
  description_md text,
  base_price int not null check (base_price >= 0),  -- บาทเต็ม (§3.4)
  status text not null default 'draft'
    check (status in ('draft','published','hidden')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);
create index products_tenant_status_idx on products (tenant_id, status);
create index products_tenant_category_idx on products (tenant_id, category_id);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  product_id uuid not null references products(id) on delete cascade,
  r2_key text not null,
  sort_order int not null default 0
);
create index product_images_tenant_product_idx on product_images (tenant_id, product_id);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  product_id uuid not null references products(id) on delete cascade,
  size text,
  color text,
  sku text,
  price_override int check (price_override is null or price_override >= 0),
  stock int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 3,
  is_enabled boolean not null default true,
  -- nulls not distinct: สินค้าไม่มีมิติไซส์/สี ก็ห้ามมี variant ซ้ำ (PG15)
  unique nulls not distinct (tenant_id, product_id, size, color)
);
create index product_variants_tenant_product_idx on product_variants (tenant_id, product_id);

create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  phone text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (tenant_id, phone)                -- dedupe ด้วยเบอร์โทรภายใน tenant
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  order_number text not null,              -- {SLUGCAPS}-{YYMMDD}-{running} gen ฝั่งแอป (1.7)
  customer_id uuid not null references customers(id),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','slip_uploaded','confirmed','packing','shipped','cancelled')),
  subtotal int not null check (subtotal >= 0),
  shipping_fee int not null check (shipping_fee >= 0),
  discount int not null default 0 check (discount >= 0),
  total_amount int not null,
  discount_code_id uuid,                   -- ใช้จริง Phase 4
  ship_name text not null,
  ship_phone text not null,
  ship_address text not null,
  note text,
  carrier text
    check (carrier is null or carrier in ('thailand_post','kerry','flash','jnt','other')),
  tracking_number text,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_number),
  check (total_amount = subtotal + shipping_fee - discount)
);
create index orders_tenant_status_idx on orders (tenant_id, status);
create index orders_tenant_created_idx on orders (tenant_id, created_at desc);
create index orders_tenant_customer_idx on orders (tenant_id, customer_id);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function public.set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  order_id uuid not null references orders(id) on delete cascade,
  -- snapshot ชื่อ/ราคา ณ เวลาสั่ง — จงใจไม่มี FK ไป product_variants
  -- เพื่อให้ลบสินค้าได้โดยประวัติออร์เดอร์ไม่พัง (§3.4)
  variant_id uuid not null,
  product_name text not null,
  variant_label text,
  unit_price int not null check (unit_price >= 0),
  qty int not null check (qty > 0)
);
create index order_items_tenant_order_idx on order_items (tenant_id, order_id);

create table payment_slips (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  order_id uuid not null references orders(id),
  r2_key text not null,
  file_hash text not null,                 -- SHA-256 ของไฟล์
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reject_reason_th text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  auto_verify_result jsonb,                -- Phase 4: Slip Verify API
  created_at timestamptz not null default now(),
  unique (tenant_id, file_hash)            -- กันสลิปไฟล์เดิมซ้ำในร้านเดียวกัน (§7.3)
);
create index payment_slips_tenant_status_idx on payment_slips (tenant_id, status);
create index payment_slips_tenant_order_idx on payment_slips (tenant_id, order_id);

create table shipping_labels (               -- Future — Phase 1 สร้างแค่ตารางว่าง
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  order_id uuid not null references orders(id),
  carrier text,
  label_r2_key text,
  created_at timestamptz not null default now()
);
create index shipping_labels_tenant_idx on shipping_labels (tenant_id);

create table discount_codes (                -- ใช้จริง Phase 4
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  code text not null,
  type text not null check (type in ('percent','fixed')),
  value int not null check (value > 0),
  min_order int,
  max_uses int,
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  unique (tenant_id, code)
);

create table stock_movements (               -- audit ตัด/คืนสต๊อก
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants(id),
  variant_id uuid not null,
  order_id uuid,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index stock_movements_tenant_variant_idx on stock_movements (tenant_id, variant_id);

-- ------------------------------------------------------------
-- Grants — Postgres requires explicit table privileges independent
-- of RLS. This project's `anon`/`authenticated`/`service_role` did
-- not inherit default grants on tables created via the SQL Editor
-- (verified: service_role got "permission denied for table tenants").
-- Mirrors vanilla Supabase project defaults; RLS (Phase 2) is the
-- real access boundary once enabled. See DECISIONS.md.
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

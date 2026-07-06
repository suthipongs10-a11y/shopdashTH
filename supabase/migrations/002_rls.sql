-- ============================================================
-- 002_rls.sql — Phase 2 (task 2.1)
-- เปิด RLS (ENABLE + FORCE) ทุกตาราง + policies ตาม pattern §3.5
--
-- หมายเหตุสำคัญ:
-- 1. helper functions อยู่ schema public (ดู DECISIONS.md):
--    public.app_tenant_id() / public.app_role() / public.is_super_admin()
-- 2. service_role มี BYPASSRLS — Route Handlers ฝั่งเขียนทำงานได้ปกติ
-- 3. FORCE ทำให้ role postgres (เจ้าของตาราง/SQL Editor) โดน RLS ด้วย
--    → ต้องรัน seed.sql "ก่อน" ไฟล์นี้เสมอ (insert หลังจากนี้ใช้ service role)
-- ============================================================

-- ------------------------------------------------------------
-- ตารางระดับแพลตฟอร์ม (§3.3)
-- ------------------------------------------------------------

alter table plans enable row level security;
alter table plans force row level security;
create policy plans_public_read on plans for select
  using (is_active = true);
create policy plans_super_write on plans for all
  using (public.is_super_admin()) with check (public.is_super_admin());

alter table tenants enable row level security;
alter table tenants force row level security;
create policy tenants_super_all on tenants for all
  using (public.is_super_admin()) with check (public.is_super_admin());
-- ร้านอ่านข้อมูลตัวเองได้ (หน้า "แพลนของฉัน" Phase 3)
create policy tenants_read_self on tenants for select
  using (id = public.app_tenant_id());

alter table tenant_subscriptions enable row level security;
alter table tenant_subscriptions force row level security;
create policy tsub_super_all on tenant_subscriptions for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy tsub_tenant_read on tenant_subscriptions for select
  using (tenant_id = public.app_tenant_id());

alter table custom_domains enable row level security;
alter table custom_domains force row level security;
create policy cdom_super_all on custom_domains for all
  using (public.is_super_admin()) with check (public.is_super_admin());
-- ร้านจัดการโดเมนของตัวเอง (Phase 4)
create policy cdom_tenant_rw on custom_domains for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

alter table theme_registry enable row level security;
alter table theme_registry force row level security;
create policy theme_public_read on theme_registry for select
  using (is_active = true);
create policy theme_super_write on theme_registry for all
  using (public.is_super_admin()) with check (public.is_super_admin());

alter table provisioning_logs enable row level security;
alter table provisioning_logs force row level security;
create policy plog_super_all on provisioning_logs for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ------------------------------------------------------------
-- ตารางระดับ tenant (§3.4) — pattern §3.5
-- (1) super admin ทำได้หมด (2) tenant ตัวเอง rw
-- (3) anon อ่านได้เฉพาะตารางที่ storefront ต้องอ่าน
-- (4) ตารางอ่อนไหว: "ไม่มี" policy anon เลย — ปิดสนิท
-- ------------------------------------------------------------

-- stores: public อ่านได้ (ชื่อร้าน/ธีม/ค่าส่งโชว์หน้าร้าน)
alter table stores enable row level security;
alter table stores force row level security;
create policy stores_super on stores for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy stores_tenant_rw on stores for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());
create policy stores_public_read on stores for select to anon using (true);

-- categories: public อ่านได้
alter table categories enable row level security;
alter table categories force row level security;
create policy cat_super on categories for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy cat_tenant_rw on categories for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());
create policy cat_public_read on categories for select to anon using (true);

-- products: public อ่านเฉพาะ published
alter table products enable row level security;
alter table products force row level security;
create policy prod_super on products for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy prod_tenant_rw on products for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());
create policy prod_public_read on products for select to anon
  using (status = 'published');

-- product_images: public อ่านได้
alter table product_images enable row level security;
alter table product_images force row level security;
create policy pimg_super on product_images for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy pimg_tenant_rw on product_images for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());
create policy pimg_public_read on product_images for select to anon using (true);

-- product_variants: public อ่านเฉพาะที่เปิดขาย
alter table product_variants enable row level security;
alter table product_variants force row level security;
create policy pvar_super on product_variants for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy pvar_tenant_rw on product_variants for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());
create policy pvar_public_read on product_variants for select to anon
  using (is_enabled = true);

-- ---------- ตารางอ่อนไหว: ไม่มี policy anon (§3.5 ข้อ 4) ----------

alter table customers enable row level security;
alter table customers force row level security;
create policy cust_super on customers for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy cust_tenant_rw on customers for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

alter table orders enable row level security;
alter table orders force row level security;
create policy ord_super on orders for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy ord_tenant_rw on orders for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

alter table order_items enable row level security;
alter table order_items force row level security;
create policy oitem_super on order_items for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy oitem_tenant_rw on order_items for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

alter table payment_slips enable row level security;
alter table payment_slips force row level security;
create policy slip_super on payment_slips for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy slip_tenant_rw on payment_slips for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

alter table shipping_labels enable row level security;
alter table shipping_labels force row level security;
create policy slabel_super on shipping_labels for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy slabel_tenant_rw on shipping_labels for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

alter table discount_codes enable row level security;
alter table discount_codes force row level security;
create policy disc_super on discount_codes for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy disc_tenant_rw on discount_codes for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

alter table stock_movements enable row level security;
alter table stock_movements force row level security;
create policy smov_super on stock_movements for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy smov_tenant_rw on stock_movements for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

-- ------------------------------------------------------------
-- RPC สำหรับ test script (2.6): เช็คว่า RLS เปิด+FORCE ครบทุกตาราง
-- เรียกได้เฉพาะ service_role
-- ------------------------------------------------------------
create or replace function public.rls_status()
returns table (table_name text, rls_enabled boolean, rls_forced boolean)
language sql stable security definer as $$
  select c.relname::text, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname
$$;
revoke all on function public.rls_status() from public;
revoke all on function public.rls_status() from anon;
revoke all on function public.rls_status() from authenticated;
grant execute on function public.rls_status() to service_role;

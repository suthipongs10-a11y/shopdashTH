-- ============================================================
-- 010_product_reviews.sql — รีวิวสินค้า (จัดการโดยแอดมินร้าน)
--
-- เจ้าของแพลตฟอร์มยืนยัน 2026-07-11: ดาวรีวิวบนการ์ด/หน้าสินค้า
-- ต้องเป็นข้อมูลจริงจาก DB (เดิมเป็นเดโม่ gen จาก product id)
-- ลูกค้าปลายทางไม่มีบัญชี (guest checkout) → แอดมินร้านเป็นคน
-- เพิ่ม/ซ่อน/ลบรีวิว (เก็บจากช่องทางไลน์/เฟซบุ๊กของร้านเอง)
--
-- กฎเหล็ก §0.4: tenant_id + RLS (ENABLE + FORCE) ตาม pattern §3.5
-- ============================================================

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  product_id uuid not null references products(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  author_name text not null,
  comment text,
  is_published boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists product_reviews_tenant_idx
  on product_reviews (tenant_id, product_id, is_published);

alter table product_reviews enable row level security;
alter table product_reviews force row level security;

create policy reviews_super on product_reviews for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy reviews_tenant_rw on product_reviews for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());
create policy reviews_public_read on product_reviews for select
  to anon using (is_published = true);

-- โปรเจ็คนี้ไม่ได้รับ default privileges ของ Supabase (DECISIONS 2026-07-06)
grant all on product_reviews to anon, authenticated, service_role;

-- view สรุปคะแนนต่อสินค้า — การ์ดสินค้าอ่านตัวนี้แทนการดึงรีวิวทุกแถว
-- security_invoker: RLS ของตารางฐานยังคุม (anon เห็นเฉพาะ published)
create or replace view product_rating_summary
with (security_invoker = true) as
select
  tenant_id,
  product_id,
  count(*)::int as review_count,
  round(avg(rating)::numeric, 1) as avg_rating
from product_reviews
where is_published = true
group by tenant_id, product_id;

grant select on product_rating_summary to anon, authenticated, service_role;

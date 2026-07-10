-- ============================================================
-- 008_pages_onepage.sql — Phase 6 (ต่อ): Pages/CMS + ธีม one-page
--
-- (ก) ตาราง pages — หน้าเพจ/บทความของร้าน (เกี่ยวกับเรา, วิธีสั่งซื้อ ฯลฯ)
--     ขายในแพลนธุรกิจ (p3) ขึ้นไป — flag `custom_pages`
--     กฎเหล็ก §0.4: tenant_id + RLS (ENABLE + FORCE) ตาม pattern §3.5
-- (ข) ธีม one-01 "วันเพจ" (tier 1) — หน้าเดียวจบสำหรับแพลนเริ่มต้น ฿990
--     (stores.theme_code มี FK → theme_registry ต้อง insert ก่อนสลับธีม)
-- ============================================================

-- ---------- (ก) ตาราง pages ----------
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,49}$'),
  title text not null,
  body_md text,
  show_in_nav boolean not null default true,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, slug)
);

create index if not exists pages_tenant_idx on pages (tenant_id, status, sort_order);

-- RLS pattern §3.5 — helper อยู่ schema public (DECISIONS 2026-07-06)
alter table pages enable row level security;
alter table pages force row level security;

create policy pages_super on pages for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy pages_tenant_rw on pages for all
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());
create policy pages_public_read on pages for select
  to anon using (status = 'published');

-- โปรเจ็คนี้ไม่ได้รับ default privileges ของ Supabase (DECISIONS 2026-07-06)
-- GRANT เป็นฐาน — RLS คือขอบเขตสิทธิ์จริง
grant all on pages to anon, authenticated, service_role;

-- flag custom_pages ให้แพลนธุรกิจขึ้นไป (ตารางแพ็กเกจ: P3 "+ หน้าเกี่ยวกับเรา/บทความ")
update plans set features = features || '{"custom_pages": true}'::jsonb
  where code in ('p3-business', 'p4-premium');

-- ---------- (ข) ธีม one-01 ----------
insert into theme_registry (code, name_th, tier, feature_defaults)
values ('one-01', 'วันเพจ', 1, '{"wishlist": false, "related_products": false}'::jsonb)
on conflict (code) do nothing;

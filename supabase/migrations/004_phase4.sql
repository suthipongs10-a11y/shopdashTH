-- Phase 4: ธีมครบ 10 + ฟีเจอร์เสริม
-- (1) theme_registry: ลงทะเบียนธีมทั้ง 10 ตาม §4.5 (idempotent — update ค่าเดิมถ้ามี)
-- (2) stores: announcement_text (AnnouncementBar ธีมกลุ่ม Pro) + line_channel_access_token (4.5)

insert into theme_registry (code, name_th, tier, feature_defaults) values
  ('basic-01', 'มินิมอลขาว',      1, '{"wishlist": false, "related_products": false}'::jsonb),
  ('basic-02', 'พาสเทลหวาน',     1, '{"wishlist": false, "related_products": false}'::jsonb),
  ('basic-03', 'คลีนดำ-ขาว',     1, '{"wishlist": false, "related_products": false}'::jsonb),
  ('prof-01',  'บูติกอบอุ่น',     2, '{"wishlist": false, "related_products": true}'::jsonb),
  ('prof-02',  'เด็กเล่นสนุก',    2, '{"wishlist": false, "related_products": true}'::jsonb),
  ('prof-03',  'แฟชั่นนิตยสาร',  2, '{"wishlist": false, "related_products": true}'::jsonb),
  ('pro-01',   'แกลเลอรีหรู',    3, '{"wishlist": true,  "related_products": true}'::jsonb),
  ('pro-02',   'สตรีทเข้ม',      3, '{"wishlist": true,  "related_products": true}'::jsonb),
  ('prem-01',  'ซิกเนเจอร์',     3, '{"wishlist": true,  "related_products": true}'::jsonb),
  ('prem-02',  'มินิมอลพรีเมียม', 3, '{"wishlist": true,  "related_products": true}'::jsonb)
on conflict (code) do update
  set name_th = excluded.name_th,
      tier = excluded.tier,
      feature_defaults = excluded.feature_defaults,
      is_active = true;

alter table stores
  add column if not exists announcement_text text,
  add column if not exists line_channel_access_token text;

-- (2.1) custom domain (งาน 4.8): นับจำนวนวันที่ re-check fail ติดกัน (§7.5 — 3 วันติด → error)
alter table custom_domains
  add column if not exists recheck_fail_count int not null default 0;

-- (3) โค้ดส่วนลด (งาน 4.4): กันโควตาเกินแบบ atomic ตาม §6
--     `update ... where used_count < max_uses` — ยิงพร้อมกันหลาย request ผ่านได้ตามโควตาเป๊ะ
create or replace function public.consume_discount_code(p_tenant_id uuid, p_discount_id uuid)
returns boolean
language plpgsql volatile
as $$
declare updated int;
begin
  update discount_codes
     set used_count = used_count + 1
   where id = p_discount_id
     and tenant_id = p_tenant_id
     and is_active
     and (max_uses is null or used_count < max_uses);
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- คืนโควตาเมื่อสร้างออร์เดอร์ไม่สำเร็จหลังกันโควตาแล้ว (compensation)
create or replace function public.release_discount_code(p_tenant_id uuid, p_discount_id uuid)
returns void
language plpgsql volatile
as $$
begin
  update discount_codes
     set used_count = greatest(used_count - 1, 0)
   where id = p_discount_id and tenant_id = p_tenant_id;
end;
$$;

-- เรียกได้เฉพาะ service role (route handler ฝั่ง server เท่านั้น)
revoke execute on function public.consume_discount_code(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.release_discount_code(uuid, uuid) from public, anon, authenticated;

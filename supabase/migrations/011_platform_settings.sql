-- 011: ตั้งค่าระดับแพลตฟอร์ม (single row) — PromptPay ของแพลตฟอร์มที่ร้านจ่ายค่าแพลน (§1.2)
-- เก็บใน DB แทน env เพื่อให้ super admin แก้จาก UI ได้ (ไม่ต้อง redeploy)
-- แอปอ่านค่าผ่าน service role (ข้าม RLS); ถ้ายังไม่ตั้งใน DB จะ fallback ไปค่า env เดิม

create table if not exists platform_settings (
  id int primary key default 1,
  promptpay_id text,          -- เบอร์ 10 หลัก หรือ บัตร ปชช. 13 หลัก (ไม่ใช่เลขบัญชี)
  promptpay_name text,        -- ชื่อบัญชีโชว์ให้ร้านเทียบ
  updated_at timestamptz not null default now(),
  constraint platform_settings_single_row check (id = 1)
);

insert into platform_settings (id) values (1) on conflict (id) do nothing;

alter table platform_settings enable row level security;
alter table platform_settings force row level security;

-- เฉพาะ super admin เท่านั้นที่อ่าน/แก้ผ่าน RLS (แอปฝั่ง billing อ่านผ่าน service role อยู่แล้ว)
drop policy if exists platform_settings_super on platform_settings;
create policy platform_settings_super on platform_settings for all
  using (auth.is_super_admin()) with check (auth.is_super_admin());

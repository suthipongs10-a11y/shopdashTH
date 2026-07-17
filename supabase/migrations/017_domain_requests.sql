-- 017: บริการโดเมนส่วนตัว ฿590/ปี — เจ้าของแพลตฟอร์มจัดการให้ (2026-07-17 เจ้าของสั่ง)
-- เปลี่ยนจาก self-service DNS → ลูกค้าส่ง "คำขอโดเมน" + จ่ายผ่าน PromptPay แพลตฟอร์ม
-- แอดมินจดโดเมน/ตั้ง DNS/เชื่อม Vercel ให้ แล้วกด "ทำเสร็จ" → custom_domains active

create table if not exists domain_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  kind text not null default 'new',            -- 'new' (จดใหม่+เชื่อม) | 'renewal' (ต่ออายุรายปี)
  domain text not null,
  note text,                                    -- ข้อความจากร้าน เช่น ชื่อสำรองถ้าโดเมนไม่ว่าง
  amount int not null default 590,              -- บาท (snapshot ณ เวลาขอ)
  status text not null default 'awaiting_payment',
    -- 'awaiting_payment' | 'slip_uploaded' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
  slip_r2_key text,
  slip_file_hash text,                          -- SHA-256 กันสลิปไฟล์เดิมซ้ำ (§7.3)
  reject_reason_th text,
  reviewed_by uuid,                             -- super admin ที่อนุมัติ/ปฏิเสธ
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists domain_requests_tenant_idx on domain_requests (tenant_id, created_at desc);
create index if not exists domain_requests_status_idx on domain_requests (status, created_at);
-- กันสลิปไฟล์เดิมซ้ำภายในตาราง (คนละตารางกับ payment_slips/tenant_subscriptions — เช็คเฉพาะในนี้)
create unique index if not exists domain_requests_slip_hash_uq
  on domain_requests (slip_file_hash) where slip_file_hash is not null;

alter table domain_requests enable row level security;
alter table domain_requests force row level security;

-- super admin จัดการได้หมด / ร้านอ่านของตัวเอง (เขียนผ่าน service role ใน route/action เท่านั้น)
create policy dreq_super_all on domain_requests for all
  using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy dreq_tenant_read on domain_requests for select
  using (tenant_id = auth.tenant_id());

-- custom_domains: โดเมนที่แพลตฟอร์มดูแล (จด/ต่ออายุให้) + วันหมดอายุบริการรายปี
alter table custom_domains
  add column if not exists managed boolean not null default false,
  add column if not exists service_ends_at timestamptz;

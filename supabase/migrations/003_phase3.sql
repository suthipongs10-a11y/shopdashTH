-- Phase 3: Super Admin + Billing + Subscription lifecycle
-- (1) tenant_subscriptions.status — คิวอนุมัติสลิปค่าแพลนต้องแยก pending/approved/rejected
--     (สเปคใช้ approved_at null = pending แต่ปฏิเสธแล้วต้องเก็บแถวไว้เป็นหลักฐาน — ดู DECISIONS.md)
-- (2) tenants.locked_at — จุดอ้างอิงกติกา §7.4 "locked ครบ 60 วัน → archived"

alter table tenant_subscriptions
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists reject_reason_th text;

-- แถวเก่าที่เคยอนุมัติแล้ว (ถ้ามี) ให้สถานะ approved
update tenant_subscriptions set status = 'approved'
  where approved_at is not null and status = 'pending';

alter table tenants
  add column if not exists locked_at timestamptz;

-- index สำหรับ cron sweep (3.6) และคิวอนุมัติ
create index if not exists idx_tsub_status on tenant_subscriptions (status, created_at);
create index if not exists idx_tenants_status on tenants (status);

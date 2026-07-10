-- ============================================================
-- 009_slip_qr.sql — Phase 6 (ต่อ): ชั้นถอด QR กันสลิปซ้ำ (in-house)
--
-- payment_slips.qr_payload = payload ดิบจาก mini-QR บนสลิป — ตัวระบุธุรกรรม
--   ที่รอดการ crop/แคปหน้าจอใหม่ (SHA-256 ของไฟล์ §7.3 กันได้เฉพาะไฟล์เดิมเป๊ะ)
-- payment_slips.qr_scanned = เคยพยายามถอดแล้ว (แถวเก่าเป็น false — ไม่ต้องเตือน)
--
-- กติกาซ้ำ: payload เดียวกันใช้กับ "ออร์เดอร์อื่น" ในร้านเดียวกันไม่ได้ (เช็คใน
-- /api/slips) — ออร์เดอร์เดิมอัปซ้ำได้ (ใบเดิมถูกปฏิเสธเพราะรูปไม่ชัด ส่งธุรกรรม
-- เดิมมาใหม่ได้ตาม §7.1) จึงไม่ใช้ unique index ตรงๆ
-- ============================================================

alter table payment_slips add column if not exists qr_payload text;
alter table payment_slips add column if not exists qr_scanned boolean not null default false;

create index if not exists payment_slips_qr_idx
  on payment_slips (tenant_id, qr_payload)
  where qr_payload is not null;

comment on column payment_slips.qr_payload is
  'payload จาก mini-QR บนสลิป (null = หา QR ไม่เจอ) — ตัวระบุธุรกรรม ใช้กันสลิปซ้ำข้ามออร์เดอร์';
comment on column payment_slips.qr_scanned is
  'เคยพยายามถอด QR แล้ว — false ในแถวก่อนฟีเจอร์นี้ (ไม่แสดงป้ายเตือน)';

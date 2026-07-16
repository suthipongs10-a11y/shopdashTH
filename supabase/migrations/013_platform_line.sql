-- 013: LINE OA ของแพลตฟอร์ม — แจ้งเตือน "เจ้าของแพลตฟอร์ม" เมื่อมีร้าน signup ใหม่
-- หรือมีสลิปค่าแพลนเข้าคิว (ลูกค้า trial มี 7 วัน — สลิปค้างคิวนาน = เสียความเชื่อมั่น)
-- เก็บใน platform_settings (single row, RLS super admin — migration 011) แก้จาก UI ได้
-- ไม่ต้อง redeploy; ถ้ายังไม่ตั้งใน DB ระบบ fallback ไป env PLATFORM_LINE_CHANNEL_TOKEN

alter table platform_settings
  add column if not exists line_channel_access_token text;

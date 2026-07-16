-- 015: ถอดธีมชุดบริการรถ (S1/S2/S3) ออกจาก registry — เจ้าของสั่งพักชุดแท็กซี่/ช่างไว้ก่อน
-- (2026-07-16) — โค้ด preset/section ยังอยู่ในระบบ แค่เอาออกจากตัวเลือกธีม
-- รันได้ปลอดภัยทั้งกรณีเคยรัน 014 แล้วหรือยังไม่เคย (แถวไม่มีก็ไม่ทำอะไร)
-- กันพลาด: ย้ายร้านที่บังเอิญถือธีมพวกนี้กลับ basic-01 ก่อน (FK)

update stores set theme_code = 'basic-01'
  where theme_code in ('s1-premier', 's2-travel', 's3-taxi');

delete from theme_registry where code in ('s1-premier', 's2-travel', 's3-taxi');

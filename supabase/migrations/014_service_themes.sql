-- 014: ลงทะเบียนธีมชุดเทมเพลตธุรกิจบริการรถ 3 ตัว (ref เจ้าของ 2026-07-16)
-- stores.theme_code มี FK → theme_registry ต้องมีแถวก่อนร้านจะเลือก/ถูกตั้งธีมเหล่านี้
-- (ค่า tier/feature_defaults ตรงกับ preset ใน themes/presets/s*.ts)

insert into theme_registry (code, name_th, tier, feature_defaults) values
  ('s1-premier', 'พรีเมียร์ ไดรฟ์ (บริการรถหรู)', 2, '{"wishlist": false, "related_products": false}'::jsonb),
  ('s2-travel',  'ทราเวลคาร์ (รถรับส่ง-เหมา)',    1, '{"wishlist": false, "related_products": false}'::jsonb),
  ('s3-taxi',    'แท็กซี่เซอร์วิส (รถรับจ้าง)',    1, '{"wishlist": false, "related_products": false}'::jsonb)
on conflict (code) do nothing;

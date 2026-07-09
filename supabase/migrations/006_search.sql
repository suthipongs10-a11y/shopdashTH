-- ============================================================
-- 006_search.sql — Phase 5 (task 5.4)
-- ค้นหาสินค้า storefront ด้วย pg_trgm
--
-- ทำไม trigram ไม่ใช่ tsvector: tsvector ตัดคำไทยไม่ได้ (ไม่มี dictionary
-- ไทยใน Postgres มาตรฐาน §2.1) — trigram หา substring ได้ตรงตัว เช่น
-- "เสื้อยื" → match "เสื้อยืด" (DoD ข้อ 3)
--
-- gin_trgm_ops รองรับ ILIKE '%term%' → query ฝั่งแอปใช้ .ilike('name', ...)
-- แล้ว planner เลือก index นี้เอง
-- ============================================================

create extension if not exists pg_trgm;

create index if not exists products_name_trgm_idx
  on products using gin (name gin_trgm_ops);

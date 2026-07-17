-- 016: ลงทะเบียนธีม "ลิตเติ้ลจอย (ของเล่นเด็ก)" — ref ภาพ Little Joy (2026-07-17)
-- ธีมประจำ starter pack "ของเล่น / แม่และเด็ก" — tier 1 ทุกแพลนเลือกได้

insert into theme_registry (code, name_th, tier, feature_defaults, is_active)
values (
  'toys-01',
  'ลิตเติ้ลจอย (ของเล่นเด็ก)',
  1,
  '{"wishlist": true, "related_products": true}'::jsonb,
  true
)
on conflict (code) do update set
  name_th = excluded.name_th,
  tier = excluded.tier,
  feature_defaults = excluded.feature_defaults,
  is_active = true;

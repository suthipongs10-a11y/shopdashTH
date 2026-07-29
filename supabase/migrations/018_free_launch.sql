-- 018: ช่วงเปิดตัวใช้ฟรี (เจ้าของสั่ง 2026-07-17) — คู่กับ flag FREE_LAUNCH ใน lib/free-launch.ts
-- ร้าน trial ที่มีอยู่: ปลดวันหมดอายุ (cron ช่วง FREE_LAUNCH ไม่ล็อกใครอยู่แล้ว — อันนี้กันพลาด
-- ตอนปิด flag ในอนาคต + ให้แบนเนอร์นับถอยหลังในหลังร้านหายไป)

update tenants set trial_ends_at = null where status = 'trial';

-- ร้านที่ถูกล็อกเพราะ trial หมด (ไม่เคยมี subscription ที่อนุมัติเลย) → ปลดกลับมาใช้งานได้
update tenants
   set status = 'trial', trial_ends_at = null, locked_at = null
 where status = 'locked'
   and id not in (
     select tenant_id from tenant_subscriptions where approved_at is not null
   );

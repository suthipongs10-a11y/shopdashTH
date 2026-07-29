// สวิตช์ "ช่วงเปิดตัวใช้ฟรี" (เจ้าของสั่ง 2026-07-17): เปิดร้านใช้ฟรีไม่จำกัดเวลา
// เพื่อหาบั๊ก/ปัญหาจนกว่าระบบนิ่ง — ระบบ trial 7 วัน + cron ล็อกร้านยังอยู่ครบ แค่ถูกปิดด้วย flag นี้
//
// วิธีจบช่วงเปิดตัว (กลับมาเก็บเงิน): เปลี่ยนเป็น false แล้ว deploy จากนั้น
// ตั้ง trial_ends_at ให้ร้านที่ค้าง null เอง เช่น ให้เวลาอีก 14 วันนับจากวันปิดโหมด:
//   update tenants set trial_ends_at = now() + interval '14 days'
//    where status = 'trial' and trial_ends_at is null;
// (ห้ามปล่อย null ค้างตอน flag = false — cron จะไม่มีวันล็อกร้านพวกนั้น)
export const FREE_LAUNCH = true;

/** ข้อความมาตรฐานช่วงเปิดตัว — ใช้ซ้ำทุกจุดให้เหมือนกัน */
export const FREE_LAUNCH_LABEL = 'ช่วงเปิดตัว — ใช้ฟรี ไม่จำกัดเวลา';

/** โชว์ราคา/ช่องชำระเงินฝั่งลูกค้าหรือไม่ — ช่วงเปิดตัวซ่อนทั้งหมด (section ราคา landing,
 *  ราคาบนหน้า signup, บล็อกจ่ายเงินหน้า "แพลนของฉัน") — โค้ดอยู่ครบ เปิดคืนเมื่อเริ่มเก็บเงิน */
export const SHOW_PRICING = !FREE_LAUNCH;

/** บริการโดเมนส่วนตัว ฿590/ปี เปิดให้ลูกค้าเห็นหรือยัง — เปิด (true) เมื่อ ops พร้อมจริง:
 *  ตั้ง DNS cname.shopdashth.com + ทดสอบ flow กับโดเมนจริง 1 อันตาม DEPLOYMENT §โดเมนลูกค้า
 *  (ปิดอยู่ = ซ่อนเมนู "โดเมน" ฝั่งร้าน + FAQ/bullet บน landing — คิว Super Admin ยังอยู่) */
export const DOMAIN_SERVICE_OPEN = false;

/** โฆษณา "ตรวจสลิปอัตโนมัติ" ได้หรือยัง — ยังเป็น MockSlipVerifier (DEPLOYMENT §6)
 *  ห้ามเปิดจนกว่าจะเสียบ provider ตรวจสลิปจริง */
export const SLIP_VERIFY_OPEN = false;

# DECISIONS

บันทึกการตัดสินใจเมื่อเจอความกำกวมที่ CLAUDE.md ไม่ครอบคลุม (ตามกติกา §0.8)

## 2026-07-06 — JWT helper functions อยู่ schema `public` แทน `auth`
§3.2 ระบุให้สร้าง `auth.tenant_id()` ฯลฯ แต่โปรเจ็ค Supabase ที่สร้างใหม่ role `postgres` ถูก revoke สิทธิ์ CREATE ใน schema `auth` แล้ว (migration จะ fail ด้วย permission denied) จึงย้ายไป `public` โดย map ชื่อ: `auth.tenant_id()` → `public.app_tenant_id()`, `auth.app_role()` → `public.app_role()`, `auth.is_super_admin()` → `public.is_super_admin()` — RLS policies ใน Phase 2 ต้องเรียกชื่อชุดนี้แทน

## 2026-07-06 — custom_domains.status เพิ่มค่า 'suspended'
§3.3 ระบุ status 5 ค่า แต่ §7.2 (ดาวน์เกรดแพลน) กำหนดให้เก็บแถวโดเมนไว้ด้วยสถานะ `suspended` จึงใส่ใน check constraint ตั้งแต่แรก กันต้อง alter ภายหลัง

## 2026-07-06 — Demo tenant/store/category ใช้ fixed UUID
seed ใช้ UUID คงที่ (`00000000-...-0001/0002/0003`) เพื่อให้ `getTenantContext()` เวอร์ชัน Phase 1 return ค่า demo ตายตัวได้โดยไม่ต้อง query และ seed รันซ้ำได้ (idempotent ด้วย on conflict do nothing)

## 2026-07-06 — Token → Tailwind ผ่าน `@theme inline` + สีอนุพันธ์
token ตาม §4.2 ประกาศเป็น CSS vars ที่ `:root` (fallback = basic-01) แล้ว map เข้า Tailwind utilities ด้วย `@theme inline` ชื่อเดียวกัน (ตรวจ CSS ที่ generate แล้ว utilities อ้าง `var(--token)` ถูกต้อง ไม่ inline ค่าคงที่) — ผลคือ `bg-primary`, `rounded-md`, `font-heading`, spacing, text-scale ตอบสนอง preset แบบ runtime ไม่ต้อง rebuild และเพิ่มสีอนุพันธ์ (`--color-border`, `--color-scrim`, `--color-danger-soft`, `--color-success-soft`) คำนวณด้วย color-mix จาก token หลัก เพื่อให้คอมโพเนนต์ไม่ต้องใช้ opacity modifier กับสีตรงๆ

## 2026-07-06 — เพิ่ม GRANT ให้ anon/authenticated/service_role ท้าย migration 001
ตารางที่สร้างผ่าน SQL Editor ในโปรเจ็คนี้ไม่ได้รับ default privileges ของ Supabase (service_role โดน "permission denied for table tenants" — เจอจากทดสอบ E2E จริง) จึงเพิ่มบล็อก `grant all on all tables/sequences/routines` + `alter default privileges` ท้าย 001_init.sql และรันกับฐานข้อมูลจริงแล้ว — RLS (Phase 2) คือขอบเขตสิทธิ์จริง GRANT เป็นแค่ฐานตาม default ของ Supabase

## 2026-07-06 — ปิด default checksum ของ AWS SDK ใน R2 client
AWS SDK ≥3.729 แนบ `x-amz-checksum-crc32` (คำนวณจาก body ว่าง) ลง presigned PUT URL โดยดีฟอลต์ ทำให้ R2 ปฏิเสธไฟล์จริงเสมอ — ตั้ง `requestChecksumCalculation`/`responseChecksumValidation` = `WHEN_REQUIRED` ใน `lib/r2.ts` (พฤติกรรมเดิมของ SDK ก่อน 3.729)

## 2026-07-07 — ตัด/คืนสต๊อกแบบ compensation แทน DB transaction
supabase-js ไม่มี multi-statement transaction — `transitionOrder()` ตัดสต๊อกทีละ variant ด้วย optimistic lock (`eq('stock', current)` + เช็ค affected rows ตาม §7.6) ถ้าตัวใดไม่พอจะ "คืน" รายการที่ตัดไปแล้วทั้งหมดก่อน throw — ยอมรับ window เล็กๆ ที่ read-modify-write อาจชนกันแล้ว retry ผ่าน error ให้แอดมินกดใหม่ (ทางเลือกคือย้าย logic ลง Postgres function แต่สเปคเน้น state machine ใน code ชั้น service เดียว)

## 2026-07-07 — หน้า pay เข้าถึงได้ด้วยเลขออร์เดอร์อย่างเดียว
สเปคกำหนด "เลขออร์เดอร์+เบอร์โทร" เฉพาะหน้าติดตามออร์เดอร์ ส่วนหน้า pay ลูกค้าถูก redirect มาทันทีหลัง checkout (ยังไม่มีบริบทอื่นให้ยืนยันตัว) — ข้อมูลที่เปิดเผยมีแค่ยอด+รายการสินค้า ไม่มีที่อยู่/เบอร์ลูกค้า และการอัปสลิปแปลกปลอมถูกกันด้วยกติกา §7.3 (สลิป pending ได้ทีละใบ + hash ซ้ำไม่ได้)

## 2026-07-07 — dev: host `localhost` เปล่า = ร้าน demo
middleware map `*.localhost` → slug ตรงๆ ส่วน `localhost` เปล่าใน development ให้เป็นร้าน demo (DX — curl/เปิดเร็ว) production root domain → `/domain-not-configured` (Phase 3 จะแทนด้วยหน้า public landing/signup ตามโครง §8.1)

## 2026-07-06 — order_items.variant_id / stock_movements.variant_id ไม่มี FK
ตามตัวอักษรของ §3.4 (คอลัมน์อื่นเขียน references ชัดเจน แต่สองคอลัมน์นี้ไม่เขียน) — เจตนาคือ order_items เป็น snapshot ลบสินค้า/variant แล้วประวัติออร์เดอร์ต้องไม่พัง

## 2026-07-07 — migration 003: เพิ่ม tenant_subscriptions.status/reject_reason_th + tenants.locked_at
(ก) สเปคใช้ approved_at null = pending แต่ super admin ต้อง "ปฏิเสธ" สลิปค่าแพลนได้โดยเก็บแถวไว้เป็นหลักฐาน (แบบเดียวกับ payment_slips) จึงเพิ่มคอลัมน์ status pending/approved/rejected + เหตุผลภาษาไทย (ข) §7.4 "locked ครบ 60 วัน → archived" ต้องมีจุดอ้างอิงเวลา จึงเพิ่ม locked_at (ตั้งเมื่อเข้า locked, ล้างเมื่อปลดล็อก) แทนการอนุมานย้อนจากวันหมดอายุ

## 2026-07-07 — middleware อ่าน x-forwarded-host ก่อน host
server action ที่เรียก redirect() ใน dev ทำ internal fetch เข้า loopback ทำให้ Host กลายเป็น localhost:3000 (Node resolve *.localhost ไม่ได้ + undici เขียนทับ Host) → tenant resolution เพี้ยนเป็นร้าน demo — host จริงของผู้ใช้อยู่ใน x-forwarded-host ซึ่ง Next/Vercel/proxy ตั้งให้เสมอ จึงให้ middleware อ่านตัวนั้นก่อน (บั๊กนี้ไม่โผล่ใน Phase 2 เพราะเทสต์ login เต็ม flow เฉพาะร้าน demo ซึ่ง fallback ตรงกันพอดี)

## 2026-07-07 — หน้า platform อยู่ path จริง /platform (rewrite จาก root domain)
โครง §8.1 ใช้ route group `app/(public)` แต่ชนกับ `app/(storefront)` ที่ยึด path `/` อยู่แล้ว (Next ห้ามสอง page ที่ path เดียวกัน) จึงวางหน้า landing/signup ไว้ `app/platform/*` แล้วให้ middleware rewrite: `shopdash.co|www` → `/platform/*`, `admin.shopdash.co` → `/super-admin/*` — dev เข้าผ่าน `www.localhost:3000` (platform) และ `admin.localhost:3000` (super admin); path `/platform`, `/super-admin` เปิดตรงจาก host ร้านไม่ได้ (middleware กัน)

## 2026-07-07 — ใช้ provisioning_logs เป็น audit log รวมของ tenant
§7.4 สั่งให้ทุก transition เขียน audit log แต่สเปคไม่มีตาราง audit แยก — ใช้ provisioning_logs (tenant_id ไม่มี FK, รอด rollback) กับ step เช่น `tenant_status`, `plan_change`, `subscription_approved`, `feature_overrides` แสดงในหน้า detail ร้านของ super admin

## 2026-07-07 — คำขอชำระค่าแพลน = แถว pending ใน tenant_subscriptions (ทีละใบ)
ปุ่ม "ขออัปเกรด" (§2.3) กับการต่ออายุ/จ่ายครั้งแรกใช้กลไกเดียว: ร้านเลือกแพลน + อัปสลิป → แถว pending → super admin อนุมัติแล้วระบบตั้ง plan_id + active + ขยายอายุ 1 ปีในจังหวะเดียว — จำกัด pending ทีละใบต่อร้าน (กันสับสน/กดรัว ตามหลัก §7.3) และ period ต่อจากวันหมดอายุเดิมถ้ายังไม่หมด (จ่ายก่อนกำหนดไม่เสียเศษวัน)

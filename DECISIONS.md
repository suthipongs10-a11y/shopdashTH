# DECISIONS

บันทึกการตัดสินใจเมื่อเจอความกำกวมที่ CLAUDE.md ไม่ครอบคลุม (ตามกติกา §0.8)

## 2026-07-10 — Billing v2: ราคาปีแรก ≠ ค่าดูแลรายปี (โมเดลรับจ้างทำเว็บ)
เป้าหมายธุรกิจเปลี่ยนเป็น agency รับจ้างสร้างเว็บ 4 แพ็กเกจ (990/3,900/7,900/15,900 + ค่าดูแลรายปี 590/1,200/2,400/4,900) — เพิ่ม `plans.price_renewal` (null = เท่าปีแรก เข้ากันได้กับแพลนเดิม) ยอดเรียกเก็บตัดสินจากประวัติ: ร้านที่ "เคยมี subscription อนุมัติแล้ว" จ่าย price_renewal, จ่ายครั้งแรกจ่าย price_yearly (รวมค่าจัดทำ) — ดู `isRenewalTenant()`/`planChargeAmount()` ใน lib/billing.ts แพลนเก่า starter/pro/premium ปิดขาย (is_active=false) ร้านที่ถืออยู่ไม่กระทบ; seed.sql ต้อง insert แพลนเก่าเป็น is_active=false เพราะติดตั้งใหม่รัน migrations ก่อน seed

## 2026-07-10 — แพ็กเกจใหม่ 4 ตัว: การแมปค่าที่สเปคธุรกิจไม่ได้ระบุ
ตารางแพ็กเกจของเจ้าของไม่ได้ระบุ staff/รูปต่อสินค้า — ตัดสินใจ: p1-start (staff 0, รูป 3, tier 1), p2-shop (staff 0, รูป 6, tier 3 — "เลือกได้ทุก template"), p3-business (staff 3, รูป 10), p4-premium (staff 5, รูป 15) / "แดชบอร์ดพื้นฐาน" ของ p1/p2 = การ์ดสรุปที่เปิดให้ทุกแพลนอยู่แล้ว (ตาม decision 2026-07-09) flag `analytics_dashboard` เปิดเฉพาะ p3/p4 / "ปรับสี/โลโก้" ของ p2 ขึ้นไป = flag ใหม่ `theme_customize`

## 2026-07-10 — theme_customize เป็น feature flag ตามแพลน แทนผูกกับธีม prem-01/02
เดิมหน้า "ปรับแต่งธีม" เปิดเฉพาะ preset ที่ `customizable: true` (prem-01/02) — แพ็กเกจใหม่ให้ P2+ ปรับสี/ฟอนต์ได้ทุกธีม จึง gate ด้วย `ctx.features.theme_customize` (UI ซ่อน + server ตรวจซ้ำใน saveThemeOverrides) กลไก merge overrides รองรับทุกธีมอยู่แล้ว (ThemeScope ส่ง overrides เสมอ) — คงสิทธิ์ของเดิมโดย migration 007 เติม flag ให้แพลน premium เก่า + feature_defaults ของ prem-01/02

## 2026-07-10 — ขยาย trial ได้จาก UI super admin (extendTrial)
งานจัดทำร้าน P3/P4 ใช้เวลา 10–20 วัน เกิน trial 7 วัน — cron จะล็อกร้านกลางคัน จึงเพิ่มปุ่ม "ขยาย trial" ในหน้า detail ร้าน (ต่อจากวันหมดเดิม, 1–365 วัน, เขียน audit log `trial_extended`) — ไม่แตะ status: ร้านที่ locked ไปแล้วให้ super admin ตั้งกลับเป็น trial ผ่าน StatusPanel เอง (แยกความรับผิดชอบชัด)

## 2026-07-10 — หน้าสรุปออร์เดอร์: ข้อมูลจัดส่งต้องมี public_token ในลิงก์
ยกระดับหน้า pay เป็น "สรุปคำสั่งซื้อมืออาชีพ" (รายการสินค้า+ราคาต่อชิ้น, รวม/ส่วนลด/ค่าส่ง/สุทธิ, QR ยอดตรงจาก PromptPay ร้าน, เวลาตัดรอบจัดส่ง, ที่อยู่จัดส่ง, ติดต่อร้าน) — แต่เลขออร์เดอร์รูปแบบ {SLUG}-{YYMMDD}-{run4} เดาไล่เลขได้ การโชว์ที่อยู่/เบอร์ลูกค้าด้วยเลขออร์เดอร์เดี่ยวๆ = privacy leak จึงเพิ่ม `orders.public_token` (uuid) แนบใน redirect หลัง checkout และลิงก์ที่แอดมินคัดลอกส่งลูกค้า: token ตรง = เห็นข้อมูลจัดส่งเต็ม, ไม่มี token = เห็นเฉพาะรายการ+ยอด (พฤติกรรมเดิมตาม decision 2026-07-07) หน้า track (เลขออร์เดอร์+เบอร์) ยังใช้ได้เหมือนเดิม

## 2026-07-10 — ชั้นถอด QR กันสลิปซ้ำแบบ in-house (ไม่แทน Slip Verify API)
สลิปจริงจากแอปธนาคารมี mini-QR ฝังเลขอ้างอิงธุรกรรม — payload ไม่เปลี่ยนแม้รูปถูก crop/แคปใหม่ จึงเป็นตัวระบุธุรกรรมที่แข็งแรงกว่า SHA-256 ของไฟล์ (§7.3 ระบุเองว่า hash แพ้การ crop) — `lib/slip-qr.ts` (sharp+jsQR ลอง 3 สเกล + parse TLV แบบ tolerant) เสียบใน /api/slips: (ก) payload ซ้ำกับ "ออร์เดอร์อื่น" ในร้าน → ปฏิเสธ (reuse fraud) — ตรวจระดับแอป ไม่ใช้ unique index เพราะ "ออร์เดอร์เดิม" ต้องอัปธุรกรรมเดิมซ้ำได้ (ใบเก่าถูกปฏิเสธเพราะรูปไม่ชัด §7.1) (ข) สแกนแล้วไม่พบ QR → รับเข้าคิว manual พร้อมป้ายเตือนแดง (ไม่ reject อัตโนมัติ — หลักเดียวกับ §7.1) (ค) โชว์เลขอ้างอิงในคิวตรวจให้แอดมินค้นเทียบแอปธนาคาร — ข้อจำกัดที่จงใจ: พิสูจน์ "เงินเข้าจริง" ไม่ได้ (ต้องใช้ Slip Verify API ภายนอก — จุดขาย P4 ค่อยเสียบเมื่อมีลูกค้าจ่าย) ห้ามใช้ผลถอดไป auto-approve เด็ดขาด และ qr_payload ที่เก็บไว้พร้อมส่งให้ provider ภายนอก (API ส่วนใหญ่รับ payload ตรงถูกกว่าส่งรูป)

## 2026-07-10 — rate limit แบบ in-memory ต่อ instance (sliding window)
DEPLOYMENT §8 ระบุว่าไม่มี rate limit — เพิ่ม `lib/rate-limit.ts` เสียบ endpoint สาธารณะ 5 ตัว: checkout 10/นาที/IP, slips 6/นาที/IP, signup 5/ชม./IP (สร้าง auth user+หลายแถว — แน่นสุด), slug-check 30/นาที/IP, discount-check 20/นาที/IP (กันเดาโค้ด), domain-verify 10/10นาที/ร้าน (DNS lookup แพง) — ตอบ 429 ข้อความไทย ข้อจำกัด: นับต่อ process (serverless หลาย instance ไม่รวมกัน) = เพดานต่อ instance ยังแนะนำ WAF/edge เป็นชั้นนอกใน production (ไม่เลือก Upstash/Redis เพราะเพิ่ม dependency + ค่าใช้จ่ายก่อนจำเป็น)

## 2026-07-10 — Pages/CMS: /p/{slug}, เนื้อหา pre-wrap, เพจเดิมอยู่รอดการดาวน์เกรด
ตาราง `pages` (tenant_id + RLS FORCE ตาม pattern §3.5, anon อ่านเฉพาะ published) ขายในแพลนธุรกิจขึ้นไปด้วย flag `custom_pages` — เนื้อหาเป็น textarea แสดง whitespace-pre-wrap แนวเดียวกับคำอธิบายสินค้า (§2.3 "rich text แบบง่าย" — ไม่เพิ่ม markdown renderer/sanitizer ก่อนจำเป็น) URL อยู่ใต้ `/p/{slug}` กันชนกับ route จริงของ storefront นโยบายดาวน์เกรด (§7.2 ของเดิมไม่หาย): เพจ published เดิมยังแสดง+ลิงก์ใน footer ต่อ — flag gate เฉพาะการสร้าง/แก้ไข/ลบใน admin

## 2026-07-10 — ธีม one-01 "วันเพจ" + section ใหม่ catalog/contact
แพ็กเกจเริ่มต้น ฿990 ขาย "หน้าเดียว (แคตตาล็อก+ติดต่อ)" — สร้างผ่านระบบ section ของ preset ตามสถาปัตยกรรมเดิม (ไม่มี if ชื่อธีม): เพิ่ม `ThemeSection` 2 ตัว — `catalog` (แคตตาล็อกเต็ม 24 ชิ้นบนหน้าแรก + ลิงก์ /products เมื่อเกิน) และ `contact` (การ์ดที่อยู่/โทร/ลิงก์ติดตามออร์เดอร์) — ธีมอื่นใช้ section ใหม่นี้ได้ด้วยถ้าต้องการ หน้า /products, ตะกร้า, checkout ยังทำงานครบ (P1 มีระบบขายเต็ม แค่ประสบการณ์หลักจบในหน้าเดียว)

## 2026-07-10 — เวลาตัดรอบจัดส่งเป็น setting ของร้าน (order_cutoff_time + shipping_note_th)
"เราจะตัดยอดกี่โมง" ต่างกันทุกร้าน — เก็บใน stores (HH:MM + free text) ตั้งจากหน้า ตั้งค่าร้าน แสดงในหน้าสรุปออร์เดอร์และข้อความสรุปที่ส่งลูกค้า ข้อความมาตรฐาน: "ชำระก่อนเวลาตัดรอบ จัดส่งในรอบวันนั้น" — ไม่ผูก logic ตัดรอบเข้ากับระบบออร์เดอร์ (เป็นข้อมูลแจ้งลูกค้า ไม่ใช่ SLA อัตโนมัติ)

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

## 2026-07-07 — LINE OA ใช้ Messaging API broadcast
สเปคให้ร้านกรอกแค่ channel access token แต่ push message ต้องมี userId ปลายทาง (schema ไม่มีที่เก็บ) และ LINE Notify ปิดบริการแล้ว — จึงใช้ broadcast ซึ่งส่งถึงผู้ติดตามทุกคนของ OA + เตือนใน UI ให้ร้านใช้ OA แยกสำหรับทีมงานภายใน (ไม่ใช่ OA ที่ลูกค้าติดตาม)

## 2026-07-07 — staff ไม่มีตารางของตัวเอง — จัดการผ่าน Supabase Auth Admin API
§3.4 ไม่มีตาราง staff และกฎ §8.5 เข้มเรื่องตารางใหม่ — ใช้ auth.users + app_metadata (tenant_id, role=store_staff) เป็น source of truth, นับ limit จาก listUsers, disable = ban_duration (ไม่ลบ ตาม §7.2)

## 2026-07-07 — เปลี่ยนธีม = ล้าง theme_overrides
ค่าที่ร้านปรับแต่ง (สี/ฟอนต์/radius) ผูกกับธีมเดิม — คงไว้ข้ามธีมจะทำให้ธีมใหม่เพี้ยนทันทีที่สลับ จึงล้างเมื่อเปลี่ยน theme_code

## 2026-07-07 — custom domain: ตัดสถานะจาก TXT + CNAME/A, HTTPS เป็นข้อมูลประกอบ
§7.5 ให้เช็ค 3 ข้อรวม HTTPS cert "จาก platform hosting" — เราไม่มี API ของ hosting จึงเช็คด้วย HEAD request จริง (แจ้งสถานะแต่ไม่ block การ active) + เพิ่มคอลัมน์ `recheck_fail_count` นับวันที่ cron re-check fail ติดกัน (ครบ 3 → error ตามสเปค) + เพิ่ม hook `DOMAIN_VERIFY_MOCK=pass` สำหรับ e2e เดิน state ครบโดยไม่มีโดเมนจริง (แบบเดียวกับ MockSlipVerifier — ห้ามตั้งใน production)

## 2026-07-07 — โควตาโค้ดส่วนลดกันด้วย RPC (consume/release)
supabase-js เขียน `used_count = used_count + 1` ตรงๆ ไม่ได้ — สร้าง function `consume_discount_code` (atomic `update ... where used_count < max_uses` ตาม §6 4.4) + `release_discount_code` คืนโควตาเมื่อสร้างออร์เดอร์ fail หลังกันโควตา, execute ได้เฉพาะ service role

## 2026-07-07 — คำขอชำระค่าแพลน = แถว pending ใน tenant_subscriptions (ทีละใบ)
ปุ่ม "ขออัปเกรด" (§2.3) กับการต่ออายุ/จ่ายครั้งแรกใช้กลไกเดียว: ร้านเลือกแพลน + อัปสลิป → แถว pending → super admin อนุมัติแล้วระบบตั้ง plan_id + active + ขยายอายุ 1 ปีในจังหวะเดียว — จำกัด pending ทีละใบต่อร้าน (กันสับสน/กดรัว ตามหลัก §7.3) และ period ต่อจากวันหมดอายุเดิมถ้ายังไม่หมด (จ่ายก่อนกำหนดไม่เสียเศษวัน)

## 2026-07-09 — analytics เป็น RPC (SECURITY INVOKER) เรียกผ่าน service role ไม่ใช่ view
§5.1 ระบุ "View/RPC" — เลือก RPC เพราะ (ก) ต้องรับ p_tenant_id + p_days แบบพารามิเตอร์ (view ทำไม่ได้) (ข) store admin/super admin อ่านผ่าน `createAdminClient()` (service role) อยู่แล้วทั้งโปรเจ็ค — ฟังก์ชัน scope ด้วย p_tenant_id ในตัว query เอง + `revoke execute from anon/authenticated/public` (defense in depth แบบเดียวกับ consume_discount_code) กัน JWT ร้าน/ลูกค้าเรียกดูข้ามร้าน วันตัดยอดใช้ `timezone('Asia/Bangkok', created_at)::date` (§7.6) และ lower bound ของ created_at เขียน sargable ให้ใช้ index `orders_tenant_status_created_idx` (migration 005)

## 2026-07-09 — store_top_products group ด้วย product_name (order_items ไม่มี product_id)
order_items เป็น snapshot ไม่เก็บ product_id (ตั้งใจ §3.4 — ลบสินค้าแล้วประวัติไม่พัง) จึงจัดอันดับสินค้าขายดีด้วย `group by product_name` ยอมรับข้อจำกัดว่าสินค้าคนละตัวที่ชื่อซ้ำกันจะรวมกัน (ในร้านเดียวชื่อสินค้ามักไม่ซ้ำ) — ตรงกับปรัชญา snapshot ที่ห้าม join products ย้อนหลัง

## 2026-07-09 — ค้นหา pg_trgm ผ่าน ILIKE บนคอลัมน์ name เท่านั้น
tsvector ตัดคำไทยไม่ได้ (§2.1) จึงใช้ pg_trgm — query ฝั่งแอปใช้ `.ilike('name', '%term%')` ซึ่งทำงานได้แม้ยังไม่มี index (แค่ scan ช้าลง) index `gin (name gin_trgm_ops)` ใน 006 มีไว้เพื่อ performance ตอนสินค้าเยอะ ค้นเฉพาะชื่อสินค้า (ไม่รวม description) พอสำหรับ MVP + sanitize อักขระ wildcard (`% _ \`) ออกจากคำค้นเพื่อค้นแบบ substring ตรงตัว

## 2026-07-09 — แดชบอร์ด basic (ทุกแพลน) vs full (flag analytics_dashboard)
ตาราง §5.1 ให้ Starter เห็น "สรุปพื้นฐาน" ส่วน Pro/Premium เห็น "เต็ม" — หน้า `/admin/dashboard` เปิดให้ทุกแพลน แสดงการ์ดยอดขาย/ออร์เดอร์ค้างต่อสถานะ/สต๊อกใกล้หมดเสมอ ส่วนกราฟเส้นยอดขาย + สินค้าขายดี + ยอดเฉลี่ย/ออร์เดอร์ gate ด้วย `ctx.features.analytics_dashboard` (Starter เห็นกล่องชวนอัปเกรดแทน)

## 2026-07-10 — ชุดเทมเพลต Commerce Premium (TEMPLATE_SPEC.md) เริ่มที่ T2 "STORE" เป็นธีมในระบบเดิม
TEMPLATE_SPEC.md (แทน DESIGN_SPEC เดิม) ต้องการเดโม่ 4 ระดับตาม ref 5 ภาพ — เลือกทำเป็น **ธีม preset ในระบบธีมเดิม** (ไม่ใช่หน้า static แยก) ตามที่เจ้าของยืนยัน: เดโม่ = ตัวพิสูจน์ว่าแพลตฟอร์มส่งงานจริงได้ ธีมแรก `t2-store` + ร้านเดโม่ `wearstore` (seed สคริปต์ + รูปอัปผ่าน R2 pipeline จริง) — section ใหม่ (usp/categoryBanners/tools/featureBand), variant ใหม่ (card `store`, hero `commerce`), `ThemeLayout` (utilityBar/headerSearch/footerVariant) ทั้งหมดเป็น data ใน preset ไม่มี if ชื่อธีม (§8.5)

## 2026-07-10 — เนื้อหา section ธีม Commerce เก็บใน stores.theme_overrides.__content
hero copy/แบนเนอร์หมวด/ลิงก์ footer เป็นเนื้อหาต่อร้าน ไม่ใช่ token และไม่คุ้มเพิ่มคอลัมน์ — ใช้ key `__content` ใน jsonb เดิม (ปลอดภัยเพราะ `resolveThemeStyle` กรองเฉพาะ THEME_TOKEN_NAMES อยู่แล้ว) อ่านผ่าน `lib/theme-content.ts` พร้อม default ไทยครบทุก section

## 2026-07-10 — ดาวรีวิวเดโม่ deterministic + สี hex อยู่ในชั้น data เท่านั้น
ระบบรีวิวเป็น Future (§2.1) แต่ ref Commerce ต้องมีดาว+จำนวนรีวิวบนการ์ด → gen ค่าจาก hash ของ product id (`lib/demo-rating.ts`) เปิดเฉพาะธีมที่ตั้ง `layout.demoRatings` — ไม่แตะ DB ไม่หลอกข้อมูลข้ามร้าน / สีแบรนด์ social+payment (ข้อยกเว้น §5.3 ของสเปค) เพิ่มเป็น token ใน tokens.css และ map ชื่อสีไทย→hex อยู่ใน `lib/color-names.ts` (ชั้น data เทียบเท่า preset) — grep hex ใน components/storefront ยังเป็น 0 ตามกฎ

## 2026-07-10 — รูปเดโม่ T2 อยู่ public/demo/t2 พร้อม CREDITS.json
33 รูปจาก Unsplash/Pexels (license เชิงพาณิชย์ได้) ผ่าน sharp desaturate 90% + crop ตามบทบาท — รูปสินค้าอัปเข้า R2 ตอน seed (pipeline จริง) ส่วน hero/แบนเนอร์อ้าง path static ผ่าน __content เพราะเป็นเนื้อหาเดโม่ต่อร้าน แหล่งที่มาทุกรูปบันทึกใน public/demo/t2/CREDITS.json

## 2026-07-11 — รีวิวสินค้าเลื่อนจาก Future มาทำจริง (migration 010) — แอดมินร้านเป็นคนจัดการ
เจ้าของสั่งตรง: ดาวรีวิว/กล่องสถานะบนหน้าแรกธีม Commerce "ต้องใช้ได้จริง" — จึงยกรีวิวจาก Future (§2.1) มาทำแบบจำกัดขอบเขต: ตาราง `product_reviews` (RLS ตาม §3.5) + view `product_rating_summary` แต่**ไม่มีฟอร์มให้ลูกค้าปลายทางเขียนรีวิว** เพราะเจ้าของยืนยันคงหลัก guest checkout "คนแค่เข้ามาซื้อ เราเน้นที่ Admin" — แอดมินร้านเพิ่ม/ซ่อน/ลบรีวิวเองจากหน้าแก้ไขสินค้า (เก็บรีวิวจากไลน์/เฟซบุ๊กของร้าน) การ์ด/หน้าสินค้าโชว์คะแนนจริงจาก DB, สินค้าไม่มีรีวิว = ไม่มีดาว, ลบ `lib/demo-rating.ts` + flag `demoRatings` ทิ้ง

## 2026-07-11 — กล่อง "สถานะคำสั่งซื้อล่าสุด" ใช้ localStorage + API คู่เลขออร์เดอร์+เบอร์
ลูกค้าเป็น guest ไม่มีบัญชี → "ออร์เดอร์ล่าสุดของฉัน" ผูกกับเครื่อง: checkout สำเร็จเก็บ `shopdash_last_order_{slug}` (เลขออร์เดอร์+เบอร์ — แบบแผนเดียวกับตะกร้า/wishlist) แล้วหน้าแรก fetch `GET /api/orders/status` ซึ่งบังคับ num+phone ตรงกันทั้งคู่และตอบ 404 เหมือนกันทุกกรณี (กติกา anti-enumeration เดียวกับ /track §2.1) — เครื่องที่ยังไม่เคยสั่งซื้อโชว์ timeline ตัวอย่างพร้อมป้าย "ตัวอย่าง" ชัดเจน ไม่หลอกว่าเป็นออร์เดอร์จริง

## 2026-07-11 — ระบบดีไซน์ Store Admin: sidebar เข้ม + accent indigo + UI kit ใน components/admin
เจ้าของสั่ง polish backend dashboard ("ต้องสวย น่าใช้") — Admin ไม่อยู่ใต้กฎ token ธีมของ storefront (§8.5.3 ครอบเฉพาะหน้าร้าน) จึงใช้ Tailwind palette ตรง: sidebar gray-900 จัดกลุ่มเมนู+ไอคอน (components/admin/icons.tsx เขียนเอง stroke 1.8), ปุ่มหลัก indigo-600, สถานะ emerald/amber/rose/sky/violet ผ่าน `Badge` + `ORDER_STATUS_TONE`, การ์ด rounded-xl + shadow-sm — primitives กลางอยู่ `components/admin/ui.tsx` (PageHeader/Card/StatCard/Badge/EmptyState + class strings) หน้าใหม่ทุกหน้าต้องใช้ชุดนี้ ห้ามเขียน style เฉพาะหน้า

## 2026-07-11 — ห้ามรัน `next build` ขณะ dev server เปิดอยู่ (Windows dev เสิร์ฟ .next ชุดเดียวกัน)
เจอสองครั้ง: build ทับ .next ระหว่าง dev รัน → หน้าเว็บ chunk 404/ไม่มี CSS ทั้งระบบ ต้อง kill dev ก่อน build เสมอ แล้วค่อยเปิดใหม่ / อาการ "Unexpected end of JSON input" บนหน้าที่เพิ่งถูกแก้คือ race ตอน Fast Refresh recompile — โหลดซ้ำหาย ไม่ใช่ bug โค้ด

## 2026-07-11 — sharp ล็อกเวอร์ชันตาม Next (0.34.x) กัน libvips DLL ชนบน Windows
/admin/slips พังด้วย ERR_DLOPEN_FAILED เพราะโปรเจ็คลง sharp 0.35.3 แต่ Next 15.5 พ่วง sharp 0.34.5 — สอง libvips DLL ชื่อเดียวกันโหลดใน process เดียวไม่ได้ (อาการเฉพาะ Windows) → package.json ตรึง `"sharp": "^0.34.5"` ให้ resolve เป็นตัวเดียวกับของ Next; จะอัปเกรด sharp ได้ต่อเมื่อ Next ขยับเวอร์ชันตาม

## 2026-07-11 — T1 "SIMPLE" เป็นธีมในระบบเดิม + flag ใหม่ `online_ordering` (ปิดเมื่อระบุ)
TEMPLATE_SPEC §3.1 ระบุปุ่มการ์ด "ดูรายละเอียด"/"สั่งซื้อ" ต้องตัดสินตาม feature flag ไม่ตายตัว — เพิ่ม `online_ordering` เป็น FeatureKey ตัวแรกแบบ **default เปิด** (base ใน resolveFeatures ตั้ง true — ร้านเดิมทุกแพลนได้ระบบสั่งซื้อโดยไม่ต้องแตะ DB) ร้านที่ขายผ่านแชทปิดผ่าน `tenants.feature_overrides` — เมื่อปิด: ตะกร้า/CartDrawer/ลิงก์ติดตามหาย, แถบ disclaimer ใต้ header, หน้าสินค้าเปลี่ยนเป็นปุ่ม LINE/FB, footer เปลี่ยนข้อความชำระเงิน ทั้งหมดผูกกับ flag ไม่ใช่ตัวธีม (ธีม t1-simple ใช้กับร้านที่เปิดระบบสั่งซื้อก็ได้ ปุ่มจะกลายเป็น "สั่งซื้อ") ช่องทางแชทเก็บใน `__content.contact` / เลย์เอาต์ใหม่เป็น preset data ล้วน: hero `split-panel`, การ์ด `simple`, section `contactCta`/`featureList`, `layout.headerContactButtons` — grep if ชื่อธีม = 0 ตามกฎ §8.5

## 2026-07-11 — รูปเดโม่ T1 ใช้ pool เดิมจาก public/demo/t2
ชุด 33 รูปของ T2 ผ่านกติกาโทน §1 แล้ว (desaturate 90% ช่างภาพใกล้เคียงกัน) — T1 ใช้ pool เดียวกัน (flat-lay เป็นรูปการ์ดตาม ref + นายแบบเบจเป็น hero) ดีกว่าหาชุดใหม่ที่เสี่ยงโทนเพี้ยน เจ้าของอนุมัติหลัก "เดโม่เน้น layout รูปสุ่มได้" ตั้งแต่ T2 — CREDITS.json เดิมครอบคลุม

## 2026-07-11 — T3 "HUB": sale/NEW/BEST คำนวณจากคอลัมน์เดิม ไม่เพิ่ม schema
สเปกการ์ด marketplace ต้องมี badge -20%/NEW/BEST + ราคาขีดฆ่า แต่ schema ไม่มีคอลัมน์ compare_at_price — ตัดสินใจไม่เพิ่ม migration: **ลดราคา = `price_override < base_price`** (ราคาเดิม = base_price, % คำนวณใน toCard — แอดมินตั้งลดราคาได้จากหลังร้านทันทีทุกร้าน), **NEW = created_at ≤ 14 วัน**, **BEST = รีวิว published ≥ 15 รายการ** — ทุก badge เป็นข้อมูลจริงจาก DB ตามหลักที่เจ้าของสั่ง ("ข้อมูลในเดโม่ต้องจริงเพื่อทดสอบ database") ลำดับความสำคัญบนการ์ด: sale > NEW > BEST (ใบละหนึ่ง badge)

## 2026-07-11 — T3: member bar / ผ่อน 0% เป็นเนื้อหาโชว์ของธีม (ระบบสมาชิกจริง = Future)
ref FASHION HUB มีแถบ "สมาชิก Silver / คูปอง 3 ใบ / คะแนน 1,250" + ช่องสิทธิ์ "ผ่อน 0%" แต่ระบบสมาชิกสะสมแต้ม/ผ่อนชำระเป็น Future ตาม CLAUDE.md §2.1 — ตัดสินใจ render จาก `__content.memberBar`/`memberBenefits` (ร้านแก้ข้อความเองได้ ไม่ผูกตาราง) เพื่อให้เดโม่ตรง ref โดยไม่หลอกว่ามีระบบจริง — ขายจริงให้ลบ/แก้ข้อความใน __content ส่วนฟิลเตอร์ sidebar ทุกตัวทำงานจริงฝั่ง server (multi-category `.in()`, ช่วงราคา, instock) และช่อง "แบรนด์" ของ ref แทนด้วยค้นหาชื่อสินค้า (แพลตฟอร์มไม่มี entity แบรนด์)

## 2026-07-11 — Lighthouse วัดไม่ผ่านเกณฑ์ในวันที่เครื่องมีโหลดโปรเจ็คอื่น — ใช้ control template เทียบ
T3 วัดได้ 42-48 ต่ำกว่าเกณฑ์ 85 มาก แต่ control ในเครื่องเดียวกันวันเดียวกัน: T1 (เคยได้ 91) เหลือ 69, T2 (เคยผ่าน ≥85) เหลือ 52 — สาเหตุคือ dev server โปรเจ็คอื่นรันอยู่ (thaiApp next+prisma, Ubontaxi astro) กดคะแนนทั้งระบบ **บทเรียน: ก่อนวัด Lighthouse ให้รัน control template ที่เคยผ่าน DoD เทียบก่อนเสมอ ถ้า control ตกจากค่าอ้างอิง = เครื่องไม่พร้อม อย่าไล่ optimize ตามตัวเลขวันนั้น** — optimization ที่ทำจริงเพราะถูกหลักการ: carousel mount รูปเฉพาะสไลด์ที่เคยแสดง, รูป hover การ์ดไม่โหลดบนจอสัมผัส (display:none + lazy ใน `pointer-fine:` — เบราว์เซอร์ข้ามการโหลด)

## 2026-07-11 — Tenant cache ย้ายไป globalThis: invalidate ข้าม route bundle ถึงกันแล้ว
เจ้าของรายงานปุ่มโซเชียล footer ใช้ไม่ได้ → ระหว่างทำพบว่าแก้ตั้งค่าใน admin แล้วหน้าร้านค้างค่าเก่า ~45-60 วิ ทั้งที่ action เรียก `invalidateTenantCache` — สาเหตุ: Next.js สร้าง module instance แยกต่อ route bundle ทำให้ Map ระดับ module ของ `lib/tenant-context.ts` มีหลายตัวใน process เดียว (ตัวที่ action ล้างไม่ใช่ตัวที่ storefront ใช้) พฤติกรรม "สะท้อนผลใน ≤60s" ที่บันทึกตอน Phase 6 คืออาการของบั๊กนี้ ไม่ใช่ข้อจำกัดของ TTL — แก้โดยเก็บ cache บน `globalThis` (ตัวเดียวต่อ process) ตอนนี้ทุกการตั้งค่าสะท้อนทันที; deploy หลาย instance ยังพึ่ง TTL 60s เหมือนเดิม (ยอมรับได้ตาม §3.8)

## 2026-07-11 — ลิงก์โซเชียลร้านเก็บใน __content.socials ไม่เพิ่มคอลัมน์
ต้องแก้ได้จาก Dashboard โดยไม่บังคับเจ้าของรัน migration (ตัวเจ้าของไม่อยู่หน้าเครื่อง) — เก็บใน `stores.theme_overrides.__content.socials` (jsonb เดิม, `resolveThemeStyle` กรองเฉพาะ token จึงไม่กระทบธีม) ฟอร์มอยู่หน้า "ตั้งค่าร้าน" (เฉพาะ owner, validate https://) ปุ่ม footer แสดงเฉพาะช่องที่กรอก — ถ้าอนาคตอยากให้ query ได้ (เช่นลิสต์ร้านที่มี IG) ค่อยย้ายเป็นคอลัมน์จริง

## 2026-07-11 — T4 "LUXÉ": ฟอนต์ serif คู่ + hero แผง ink + รูป editorial ชุดที่ T3 คัดออก
(ก) TEMPLATE_SPEC §3.4 สั่ง --font-head เป็น Noto Serif Thai + Latin Cormorant Garamond ซึ่งอยู่นอกรายการฟอนต์ CLAUDE.md §4.2 — ถือว่า TEMPLATE_SPEC (ประกาศแทนที่ DESIGN_SPEC) เป็น spec ใหม่กว่า จึงเพิ่มเข้า ThemeFontName โดย map 'Noto Serif Thai' → 'var(--font-cormorant-garamond), var(--font-noto-serif-thai)' (Latin นำ ไทยตาม — นับเป็นชุดหัวเรื่องเดียว ไม่เกินกติกา 2 ตระกูล §5.7)
(ข) ref ต้องการ hero เต็มจอภาพแฟชั่นโทนเข้ม แต่ pool ไม่มี landscape โทนเข้ม ≥1800px — ใช้แผง ink เต็มกว้าง + portrait โทนเข้ม (model-09 สตูดิโอเทาเข้ม) กลืนพื้นด้วย gradient แทน ได้ mood เดียวกันโดยไม่ต้องหารูปใหม่/ไม่ฝืน crop portrait เป็น wide จนหัวขาด
(ค) รูปสินค้า T4 ใช้ subset โทน editorial (model-09/10/11/12/14) ที่ T3 ตัดออกเพราะ "โทนหลุด" จากบุคลิก marketplace — โทน moody นั้นแหละคือบุคลิก luxury ทำให้ทั้ง 33 รูปของ pool ถูกใช้คุ้มโดยแต่ละธีมโทนภายในสม่ำเสมอ (กติกา §1 ห้ามปนโทน "ใน section เดียว")
(ง) โค้ด WELCOME10 ของเดโม่เป็นแถวจริงในตาราง discount_codes (ทดสอบผ่าน API ลดจริง) ตามหลัก "ข้อมูลเดโม่ต้องจริง"; แถบ "ลูกค้า 50,000+ คน" เป็น copy เดโม่ใน __content.trustText ร้านจริงแก้/ลบเองได้

## 2026-07-12 — Variant labels ต่อร้าน (ของเล่น/แม่และเด็ก) เก็บใน __content.variantLabels ไม่แตะ schema
โจทย์เจ้าของ: เทมเพลต+Dashboard ต้องรับสินค้ากลุ่มอื่นในหมวดเดียวกับแฟชั่นได้ (ของเล่น ของใช้แม่และเด็ก) — จุดที่ผูกแฟชั่นจริงมีจุดเดียวคือป้ายคำ "ไซส์/สี" ที่ hardcode ทั่วระบบ ส่วนโครง variant สองมิติ (size×color) ใช้กับ ช่วงวัย×แบบ ได้ตรงๆ → ตัดสินใจ **เปลี่ยนเฉพาะป้าย ไม่เปลี่ยนคอลัมน์**: ร้านตั้งชื่อมิติเองได้จากหน้าตั้งค่าร้าน (การ์ด "ประเภทตัวเลือกสินค้า" + ปุ่มลัด เสื้อผ้า/ของเล่น/แม่และเด็ก/รองเท้า-กระเป๋า) เก็บใน `theme_overrides.__content.variantLabels` ตาม precedent ของ socials (ไม่ต้อง migration — เจ้าของไม่ต้องรัน SQL) ค่า default ไม่เก็บลง DB ให้ resolver เติม — ฝั่ง storefront ส่งผ่าน `VariantLabelsProvider` (React context ใน layout) เพราะจุดใช้เป็น client component ทั้งหมด (FilterBar/CatalogSidebar/QuickView/VariantSelector) ไม่ต้อง drill props ทุก grid; แถบ copy ฝั่ง server (FeatureBand/ServiceBand/ContactCtaBand) รับเป็น prop จากหน้าแรก — มิติ "สี" ที่ค่าไม่ใช่สีจริง (แบบ: หมี/กระต่าย) ใช้ `isKnownColor()`: จุดสีบนการ์ดแสดงเฉพาะชื่อสีที่ map ได้ (จุดเทาซ้ำกันหมดไม่สื่ออะไร) ส่วนตัวเลือกใน QuickView/sidebar สลับเป็นชิปข้อความเมื่อมีค่าใดวาดเป็นสีไม่ได้ + เรียงค่านอกตาราง SIZE_ORDER แบบ numeric-aware ("3-6 เดือน" ก่อน "12 เดือน") — e2e 21/21 (.tmp-labels-test.mjs) รวม regression ร้าน demo ยังเป็นไซส์/สี

## 2026-07-12 — Theme actions ต้องเก็บ __content เสมอ (บั๊ก: socials หายเมื่อสลับธีม/ปรับสี/รีเซ็ต)
พบระหว่างทำ variantLabels: `setStoreTheme`/`saveThemeOverrides`/`resetThemeOverrides` เขียน `theme_overrides` ทับทั้งก้อน — `__content` (socials ที่ commit 02d97f4, เนื้อหา section ของเทมเพลต T1-T4, variantLabels) ถูกล้างทิ้งเงียบๆ ทุกครั้งที่ร้านสลับธีม/บันทึกปรับแต่งสี/กดรีเซ็ต — แก้ด้วย helper `contentToKeep()` อ่าน __content สดจาก DB (ไม่ใช้ ctx cache กันทับค่าที่เพิ่งบันทึก) แล้ว merge กลับทุกจุด หลักการ: **__content เป็นข้อมูลของร้าน ไม่ใช่ token ที่ผูกธีม — การล้าง overrides ตอนเปลี่ยนธีมล้างได้เฉพาะ token** พิสูจน์ใน e2e: ตั้ง labels → สลับธีมไปกลับ → ค่าอยู่ครบ

## 2026-07-12 — หน้า "เนื้อหาเว็บ" (/admin/content): CMS เนื้อหาเทมเพลตแบบ schema-driven ฟอร์มเดียว
โจทย์เจ้าของ: รูปประกอบ (ไม่ใช่รูปสินค้า) + ข้อความบนเว็บของ T1-T4 ต้องแก้เองได้จาก Dashboard — ก่อนหน้านี้ __content เขียนได้จาก seed script เท่านั้น ทางเลือกที่พิจารณา: (ก) ฟอร์มเฉพาะต่อธีม = โค้ด 4 ชุด ผิดหลัก §4.1 (ข) แก้ JSON ดิบ = เจ้าของร้านใช้ไม่ได้ (ค) live editor คลิกแก้บนหน้าร้าน = ต้อง refactor storefront ทั้งระบบ → เลือก **schema-driven**: `lib/content-schema.ts` ประกาศ 21 กลุ่มเนื้อหา (hero/heroSlides/usp/utility/categoryBanners/contact/disclaimer/featureList/categoryCircles/memberBar/memberBenefits/articles/lookbook/brandStory/highlights/perks/trust + strings) แต่ละกลุ่มมี `appliesTo(preset)` — หน้าเดียว render เฉพาะกลุ่มที่ธีมปัจจุบันใช้ ผ่านฟอร์ม generic ตัวเดียว (`content-form.tsx`: object/list/strings, field types text/textarea/image/icon/href/lines, list เพิ่ม/ลบ/เลื่อนลำดับ) — ธีมใหม่ในอนาคตแค่เพิ่มรายการ schema ไม่ต้องเขียนฟอร์ม; server action validate ตาม schema เสมอ (icon whitelist, href ต้องขึ้น / หรือ http, รูปต้องมาจาก R2/path ภายในเพราะ next/image จำกัด host, ค่าว่าง = ลบ key กลับไปใช้ default ธีม) สิทธิ์ owner+staff เท่าระดับเปลี่ยนธีม; ฟอร์มว่าง = ธีมยังโชว์เนื้อหา default เสมอ (ร้านใหม่ไม่เจอหน้าว่าง)

## 2026-07-12 — รูปเนื้อหาอัป R2 ด้วย kind ใหม่ content_image + ข้อจำกัด CORS dev ที่พบ
รูปประกอบ (hero/แบนเนอร์/บทความ) อัปผ่าน flow เดิม (webp ≤1600px ฝั่ง client → presigned PUT) เพิ่ม kind `content_image` → key `branding/{tenant}/content/{uuid}.webp` (สุ่มเพราะมีหลายรูป — รูปเก่าที่เลิกใช้ค้างใน R2 ยอมรับได้) เก็บ URL เต็มใน __content ตาม convention เดิมของ imageUrl — **พบข้อจำกัด dev: R2 CORS อนุญาตเฉพาะ origin `http://localhost:3000`** → อัปโหลดจาก `{slug}.localhost:3000` โดน browser block (กระทบรูปสินค้าจาก subdomain ด้วย — มีมาแต่เดิม) ตัว flow พิสูจน์ครบใน dev mode ที่ localhost (presign→PUT→DB→เสิร์ฟ 200) — แก้ถาวรต้องอัปเดต CORS bucket เพิ่ม `http://*.localhost:3000` (สคริปต์เตรียมไว้ `.tmp-r2-cors.mjs` — เจ้าของรันเอง เพราะเป็นการแก้ infra ภายนอก) + โดเมนจริงตอน deploy ตาม DEPLOYMENT.md

# STATUS
- Current phase: 4 **ผ่าน DoD ครบ 7 ข้อ — tag `phase-4-done`** (พร้อมเริ่ม Phase 5)
- Last session: 2026-07-07

## Done (Phase 4)
- [x] 4.1 preset ครบ 10 ธีมตาม §4.5 (`themes/presets/*`) + `/admin/theme` เลือกธีมล็อกตาม tier (server ตรวจ tier ซ้ำ) + ฟอร์มข้อความประกาศ (AnnouncementBar)
- [x] 4.2 variants มีครบตั้งแต่ P1 — เสียบ WishlistButton + RelatedProducts (fetchRelated) + announcement เข้าหน้า storefront ตาม flag
- [x] 4.3 `/admin/theme/customize` (เฉพาะ prem-01/02): สีหลัก/สีเน้น/ฟอนต์/radius → theme_overrides (validate allowlist ฝั่ง server), ปุ่มคืนค่าธีมเดิม
- [x] 4.4 ส่วนลด: `lib/discounts.ts` + RPC consume/release (atomic) + `/admin/discounts` CRUD (flag-gated) + ช่องโค้ดใน checkout + `/api/discounts/check` (403 เมื่อไม่มีฟีเจอร์) + เสียบ createOrder (กันโควตาก่อน insert + คืนเมื่อ fail)
- [x] 4.5 LINE OA: `lib/line.ts` (broadcast, fire-and-forget, log ok/fail ลง provisioning_logs) + แจ้งออร์เดอร์ใหม่/สลิปใหม่ + ฟอร์ม token ใน settings (flag-gated)
- [x] 4.6 `lib/slip-verify/` (interface + MockSlipVerifier อ่าน SLIP_VERIFY_MOCK_MODE) + เสียบ /api/slips: Premium → verify → ผ่าน=auto-approve+ตัดสต๊อก / ไม่ผ่าน=ตกคิว manual + badge เหตุผลใน SlipReviewCard
- [x] 4.7 `lib/carriers.ts` tracking URL template (ไปรษณีย์/Kerry/Flash/J&T) + ปุ่มลิงก์ในหน้า track ลูกค้า และ order detail แอดมิน
- [x] 4.8 custom domain: `lib/domains.ts` (TXT/CNAME/A/HTTPS เช็คแยกข้อ + ข้อความ "พบจริง vs ต้องเป็น") + `/admin/domain` + `/api/domain/verify` + middleware lookup (edge fetch + cache 60s) + cron `/api/cron/domain-recheck` (fail 3 วันติด → error)
- [x] 4.9 staff: `lib/staff.ts` (invite/limit ตามแพลน/disable=ban/ลบ) + `/admin/staff` + staff ถูกกันจาก settings/plan/staff/domain (nav ซ่อน + server ตรวจซ้ำ) + ดาวน์เกรดแล้ว staff เกิน → disable อัตโนมัติ (§7.2)
- [x] `supabase/migrations/004_phase4.sql` — **apply แล้ว** (2026-07-07: theme_registry 10 แถว, stores.announcement_text + line_channel_access_token, custom_domains.recheck_fail_count, RPC consume/release_discount_code)
- [x] `pnpm build` ผ่านครบทุก route
- **Phase 4 ผ่าน DoD ครบ 7 ข้อ — tag `phase-4-done`** (2026-07-07)

## DoD checklist (Phase 4) — ผ่านครบ 2026-07-07 (e2e browser จริง 2 รอบตามโหมด mock)
- [x] 1. Starter เห็นธีมเลือกได้ 3 / Premium เห็นครบ 10 ไม่มีล็อก — สลับเป็น pro-02 แล้ว storefront มืดทันที (`--color-bg=#0b0f14`) ไม่ต้อง deploy
- [x] 2. (static) grep ไม่มี `if (themeCode===...)` และไม่มี hex ใน components/storefront + app/(storefront)
- [x] 3. ส่วนลด: หมดอายุ→400 "โค้ดนี้หมดอายุแล้ว", ต่ำกว่าขั้นต่ำ→400, โควตา 1 ยิง checkout พร้อมกัน 2 → ผ่านแค่ 1 + used_count=1 (RPC atomic)
- [x] 4. LINE token ปลอม + ออร์เดอร์ใหม่ → มี request ออกจริง (log line_notify เพิ่ม) และออร์เดอร์สร้างสำเร็จ ระบบไม่ล้ม
- [x] 5. MockSlipVerifier โหมด pass → auto-approve: order confirmed + สต๊อกถูกตัด / โหมด amount_mismatch → ตกคิว manual สลิปยัง pending + badge "ตรวจอัตโนมัติไม่ผ่าน" พร้อมเหตุผล
- [x] 6. ร้าน Starter ยิง API ฟีเจอร์ Pro ตรง → 403 ทั้ง /api/discounts/check และ /api/domain/verify
- [x] 7. custom domain: DNS ผิด → error + ข้อความไทย "ไม่พบ TXT record — ต้องเพิ่มค่า…" / (DOMAIN_VERIFY_MOCK) เดินสถานะถึง active + middleware resolve โดเมนเข้า storefront ร้านถูกต้อง
- **Phase 1 ผ่าน DoD ครบ 6 ข้อ — tag `phase-1-done`** (2026-07-07)
- **Phase 2 ผ่าน DoD ครบ 4 ข้อ — tag `phase-2-done`** (2026-07-07)
- **Phase 3 ผ่าน DoD ครบ 6 ข้อ — tag `phase-3-done`** (2026-07-07, migration 003 applied แล้ว)

## Done (Phase 3)
- [x] 3.1 middleware เพิ่ม host: `admin.{root}`→`/super-admin`, root/`www`→`/platform` (dev: `admin.localhost` / `www.localhost`), กันเปิด path ภายในตรงจาก host ร้าน, `/api/cron/*` ผ่านทุก host + **fix สำคัญ: อ่าน `x-forwarded-host` ก่อน `host`** (ดู DECISIONS) + super admin login/layout/guard + `scripts/setup-super-admin.mjs` (รันแล้ว: superadmin@shopdash.local / SuperAdmin!2026)
- [x] 3.2 `/tenants` ตารางร้าน (แพลน/สถานะ/หมดอายุ/ยอดขาย 30 วัน/โดเมน) + detail: เปลี่ยนสถานะ (lock/unlock+เหตุผล), เปลี่ยนแพลน+pre-check ดาวน์เกรด §7.2 (เตือน→ยืนยัน, ธีมเกิน tier→fallback basic-01, โดเมน→suspended), feature_overrides UI (ตามแพลน/บังคับเปิด/บังคับปิด), ประวัติ subscription, audit log
- [x] 3.3 `/platform` landing+pricing (การ์ดจากตาราง plans) + `/signup` (เช็ค slug realtime) + `POST/GET /api/signup` + `lib/provisioning.ts` (ทุก step ลง provisioning_logs, fail→rollback ลบทุกอย่างรวม auth user)
- [x] 3.4 `lib/features.ts` (server: resolveFeatures/assertFeature/assertUnderProductLimit/assertUnderImageLimit) + `lib/features-shared.ts` (client-safe) — เสียบเข้า createProduct/addProductImage แล้ว; `TenantContext` มี `features` resolve จาก plan→theme→overrides
- [x] 3.5 Billing: `lib/billing.ts` (คำขอ pending ทีละใบ, อนุมัติ→active+ต่ออายุจากวันหมดอายุเดิม, ปฏิเสธ+เหตุผล), `/admin/plan` (route group แยก เข้าได้แม้ locked, QR PromptPay แพลตฟอร์ม, อัปสลิป, ประวัติ), `/api/plan-slips`, super admin `/subscriptions` (คิว) + `/plans` (แก้ราคา/limit/ฟีเจอร์) — dashboard layout: locked→redirect `/admin/plan`, grace/trial banner
- [x] 3.6 `/api/cron/subscription-sweep` (Bearer CRON_SECRET): trial หมด→locked, active หมด→grace, grace 7 วัน→locked (+locked_at), locked 60 วัน→archived + `vercel.json` cron 01:00 ไทย
- [x] `supabase/migrations/003_phase3.sql` — **apply แล้ว** (tenant_subscriptions.status/reject_reason_th + tenants.locked_at + indexes)

## DoD checklist (Phase 3) — ผ่านครบ 2026-07-07 (e2e browser จริง)
- [x] 1. signup จบใน flow เดียว → `p3test.localhost:3000` ใช้ได้ทันที (trial+banner), provisioning_logs ครบทุก step
- [x] 2. slug ซ้ำ/reserved/ผิดรูปแบบ → error ไทย + race 2 requests slug เดียวกัน → ผู้แพ้ rollback จริง (auth user ถูกลบ, มี log provision:rollback)
- [x] 3. Starter ครบ 50 ชิ้น → ชิ้นที่ 51 ถูกปฏิเสธพร้อมข้อความชวนอัปเกรด; super admin เปลี่ยนเป็น Pro → เพิ่มได้ทันทีไม่ต้อง redeploy
- [x] 4. ดาวน์เกรด Pro→Starter ที่ 60 ชิ้น → pre-check เตือน + ไม่เปลี่ยนจนกดยืนยัน + สินค้าอยู่ครบ 60 ชิ้น
- [x] 5. cron: หมดอายุ 1 วัน→grace (banner) / 8 วัน→locked (storefront "ปิดปรับปรุงชั่วคราว" ไม่บอกค้างจ่าย, admin ถูกบังคับไป /admin/plan หน้าเดียว) + trial หมด→locked + cron ไม่มี secret→401
- [x] 6. อัปสลิปค่าแพลน→pending (กันส่งซ้ำ)→super admin อนุมัติ→active+ต่ออายุ 1 ปีทันที (storefront กลับมาใน ≤60s ตาม cache TTL §3.8) + ปฏิเสธแล้วร้านเห็นเหตุผล+ส่งใหม่ได้

## Done
- [x] 1.1 โครงโปรเจ็ค: Next.js 15.5 + Tailwind v4 + Supabase clients (`lib/supabase/{server,client,admin}.ts`) + `.env.example` — `pnpm build` ผ่าน, `.env.local` ผู้ใช้เติมค่าครบแล้ว
- [x] 1.2 Migration 001 (`supabase/migrations/001_init.sql`): helper functions + ทุกตาราง §3.3–3.4 + `supabase/seed.sql` (3 แพลน, ธีม basic-01, demo tenant/store/category fixed UUID) — **apply ลง Supabase จริงแล้ว** ผ่าน SQL Editor (2026-07-06), ตรวจ `plans`/`tenants`/`stores` ตรงตามคาด (store "ร้านเดโม ShopDash" theme_code basic-01)

- [x] 1.3 Token system (`themes/tokens.css` + `@theme inline` mapping) + preset `basic-01` + ฟอนต์ไทย 7 ตัว (next/font) + `ThemeScope` + component library storefront ครบ 14 ตัว (§4.3) + `lib/format.ts`, `lib/orders/status.ts` — build ผ่าน, ไม่มี hex ใน components/storefront

- [x] 1.4 R2 helper (`lib/r2.ts`: presign PUT 5 นาที / GET สลิป 15 นาที / putObject / key builders) + `app/api/upload/route.ts` (auth + MIME webp + ≤5MB) + `lib/upload-client.ts` (แปลง webp ≤1600px ฝั่ง client) + `lib/tenant-context.ts` เวอร์ชัน Phase 1 (demo ตายตัว) + remotePatterns ใน next.config.ts — ยังไม่ได้ทดสอบกับ R2 จริง (จะทดสอบพร้อม UI งาน 1.5)

- [x] 1.5 Store Admin: auth (login/forgot/reset ผ่าน Supabase Auth + PKCE `/auth/confirm`), layout+nav+logout, CRUD หมวดหมู่ (เพิ่ม/แก้ชื่อ/ลบ/เลื่อนลำดับ), CRUD สินค้า (ฟอร์ม+สถานะ+แนะนำ), variant matrix (generate ไซส์×สี, idempotent, แก้ SKU/ราคา override/สต๊อก/threshold/เปิด-ปิดต่อ variant), อัปโหลดรูปสินค้า (ลากเรียง+ลบ) — **ทดสอบ E2E ด้วย headless browser ผ่านหมด** (login → หมวดหมู่ → สินค้า → variant 4 ตัว → แก้สต๊อก persist → logout) ยกเว้นอัปโหลดรูปติด R2 CORS (ดู Blockers)

- [x] 1.6 Storefront (path ตรง `/` ผ่าน route group `(storefront)` + force-dynamic): หน้าแรกเรียง section ตาม preset, แคตตาล็อก+ตัวกรอง server-side (category/size/color/sort + pagination 24/หน้า), หน้าสินค้า (แกลเลอรี+variant selector ราคา/สต๊อกอัปเดตตาม variant, ปุ่ม disabled เมื่อสต๊อก 0), ตะกร้า localStorage `shopdash_cart_{slug}` (`lib/cart.ts` useSyncExternalStore) + CartDrawer ใน header — **E2E ผ่านหมด**: home → filter สี → หน้าสินค้า → variant หมดสต๊อก disabled → M/แดง ฿319 เพิ่ม 2 ชิ้น → drawer ฿638 → persist หลัง reload

- [x] 1.7 Checkout: `lib/orders/create.ts` + `/api/checkout` (service role, ราคาคำนวณจาก DB, dedupe ลูกค้าด้วยเบอร์, gen order_number `{SLUG}-{YYMMDD}-{run4}` เวลาไทย + retry กันชน, ปฏิเสธสต๊อกไม่พอ, price-changed → 409 ให้ลูกค้ายืนยันยอดใหม่) + หน้า `/checkout`
- [x] 1.8 Payment: `lib/promptpay.ts` (EMVCo payload + SVG QR จาก promptpay_id ของร้าน), หน้า `/orders/[num]/pay` (QR + ยอด + อัปสลิป + สถานะ + เหตุผลสลิปถูกปฏิเสธ), `/api/slips` (ไฟล์ต้นฉบับเข้า R2 path slips/, SHA-256 กันซ้ำ 2 ชั้น, กันสลิปค้างคิว §7.3), `lib/orders/transition.ts` (state machine §3.6 + ตัด/คืนสต๊อก + stock_movements + optimistic lock)
- [x] 1.9 Store Admin: คิวตรวจสลิป `/admin/slips` (ยอดตัวใหญ่+รูปสลิป presigned 15 นาที+ชื่อบัญชีเทียบ, อนุมัติ→confirmed+ตัดสต๊อก, ปฏิเสธ→เหตุผลสำเร็จรูป §7.1), `/admin/orders` (filter สถานะ + detail + ปุ่มตาม state machine + carrier/tracking + ยกเลิกพร้อมเหตุผล)
- [x] 1.10 หน้า `/track` (เลขออร์เดอร์+เบอร์ตรงทั้งคู่, timeline, เลขพัสดุ, เหตุผลสลิป), `/admin/settings` (ชื่อ/โลโก้/แบนเนอร์/PromptPay/ค่าส่ง/ส่งฟรีขั้นต่ำ), `/admin/customers` (+detail ประวัติ+ยอดสะสม), แถบเตือนสต๊อกใกล้หมดบน `/admin/products`

## Done (Phase 2)
- [x] 2.1 Migration 002 (RLS+FORCE 18 ตาราง + policies §3.5 + RPC `rls_status()`) — applied จริงแล้ว
- [x] 2.2 `getTenantContext()` ตัวจริง: header `x-tenant-slug` + LRU TTL 60s (+`invalidateTenantCache()` หลังแก้ settings) + locked→หน้าปิดปรับปรุง / archived→404
- [x] 2.3 `middleware.ts`: `{slug}.localhost` / `{slug}.{ROOT_DOMAIN}` → แนบ header, host แปลก→`/domain-not-configured`, dev localhost เปล่า = demo
- [x] 2.4 `lib/auth.ts` (`setUserTenant`/`getStoreUser`) + login/actions/upload ตรวจ owner/staff ของร้านนั้น + `scripts/setup-tenant-users.mjs` รันแล้ว (demo 2 users, shop2-owner@shopdash.local / Shop2Test!2026)
- [x] 2.5 ทุก query ผ่าน ctx.tenantId (RLS เป็น backstop) + seed shop2 (ธีม override สีม่วง + สินค้า 1 ชิ้น 2 variants)
- [x] 2.6 `scripts/test-isolation.ts` — รัน: `node --experimental-strip-types scripts/test-isolation.ts`

## DoD checklist (Phase 2) — ผ่านครบ 2026-07-07
- [x] 1. test-isolation.ts ผ่าน 19/19: (ก) JWT ร้าน A เห็นเฉพาะของ A (ข) insert ข้าม tenant โดน RLS ปฏิเสธ (ค) anon เห็นตารางอ่อนไหว 0 แถว (ง) anon เห็นเฉพาะ published
- [x] 2. demo.localhost / shop2.localhost คนละร้านคนละค่า token (#171717 vs #7c3aed), login ร้าน A ที่ host ร้าน B ถูกปฏิเสธ (e2e browser)
- [x] 3. track เลขออร์เดอร์ร้าน A ที่ร้าน B → ไม่พบ (e2e browser)
- [x] 4. ทุกตาราง relforcerowsecurity = true (เช็คใน test script ผ่าน RPC)

## DoD checklist (Phase 1)
- [x] 1. e2e loop ครบวงจร — ผ่านอัตโนมัติ 13 ขั้น + ผู้ใช้สแกน QR ด้วยแอปธนาคารจริงยืนยันยอด/ชื่อบัญชีถูกต้อง (2026-07-07)
- [x] 2. ปฏิเสธสลิปแล้วกลับ pending_payment + ลูกค้าเห็นเหตุผล / ยกเลิกออร์เดอร์ confirmed แล้วสต๊อกคืน (ผ่าน e2e 2026-07-07)
- [x] 3. สลิปไฟล์ซ้ำถูกกันด้วย hash — "สลิปนี้ถูกใช้ไปแล้ว" (ผ่าน e2e)
- [x] 4. variant สต๊อก 0: ปุ่ม disabled (UI) + ยิง API ตรงโดน 400 (ผ่าน e2e)
- [x] 5. ไม่มี hex code ใน components/storefront + app/(storefront) (grep ผ่าน 2026-07-07)
- [x] 6. pnpm build ผ่าน ไม่มี type error (2026-07-07)

## Blockers / Notes
- **Phase 3 dev hosts:** platform = `www.localhost:3000`, super admin = `admin.localhost:3000` (superadmin@shopdash.local / SuperAdmin!2026 — เปลี่ยนรหัสก่อน production), ร้านทดสอบ e2e = `p3test.localhost:3000` (p3test@shopdash.local / P3Test!2026)
- **.env.local เติมค่า dev แล้ว:** `CRON_SECRET` (สุ่มใหม่), `PLATFORM_PROMPTPAY_ID=0812345678` (placeholder — **ต้องแทนด้วย PromptPay จริงของแพลตฟอร์มก่อนใช้จริง**)
- สคริปต์เทสต์ Phase 3: `.tmp-phase3-test.mjs` (DoD 1–4), `.tmp-phase3-billing-test.mjs` (DoD 5–6, ต้องรันตัวแรกก่อน) — ไม่ commit
- R2 CORS ตั้งแล้ว (origin localhost:3000) — ทดสอบอัปโหลดรูปผ่านครบ flow: webp convert → presigned PUT → product_images → เสิร์ฟผ่าน next/image (2026-07-06) **ขึ้น production ต้องเพิ่ม origin โดเมนจริงใน CORS ด้วย**
- สลับระหว่าง `pnpm build` ↔ `pnpm dev` ให้ `rm -rf .next` ก่อนเสมอ — artifacts ปนกันแล้ว asset 404/ERR_ABORTED
- dev เปิดร้านผ่าน `demo.localhost:3000` / `shop2.localhost:3000` (localhost เปล่า = demo)
- Auth users ที่มีอยู่: `testdash@shopdash.com` (ผู้ใช้สร้างเองผ่าน Dashboard), `phase1-smoke-test@shopdash.local` (user ทดสอบอัตโนมัติ สร้างผ่าน service role — ลบได้เมื่อจบ Phase 1)
- ข้อมูลทดสอบในร้าน demo: หมวด "เสื้อผ้าผู้หญิง" + สินค้า "เสื้อยืดทดสอบ" (299 บาท, published, 4 variants S/M × แดง/น้ำเงิน, ตัวแรก stock 15 ราคา override 319) — ใช้ต่อในงาน 1.6 ได้เลย
- playwright ติดตั้งเป็น devDependency ไว้ใช้ smoke test งานถัดๆ ไป (สคริปต์ชั่วคราว `.tmp-e2e-smoke.mjs`, `.tmp-upload-test.mjs` ไม่ commit)
- helper functions อยู่ `public.*` ไม่ใช่ `auth.*` — ดู DECISIONS.md (Phase 2 policies ต้องเรียก `public.app_tenant_id()`)
- Demo tenant fixed UUID: tenant `...0001`, store `...0002`, category `...0003` (slug `demo`, แพลน pro)
- @supabase/ssr ต้องใช้ ^0.12.0 (0.6.x มีปัญหา type ของ cookies setAll กับ Next 15 + TS strict)
- pnpm 11.5: อนุญาต build script ของ sharp ผ่าน `pnpm-workspace.yaml` (`allowBuilds`)

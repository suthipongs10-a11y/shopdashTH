# STATUS
- Current phase: 1
- Last session: 2026-07-06

## Done
- [x] 1.1 โครงโปรเจ็ค: Next.js 15.5 + Tailwind v4 + Supabase clients (`lib/supabase/{server,client,admin}.ts`) + `.env.example` — `pnpm build` ผ่าน, `.env.local` ผู้ใช้เติมค่าครบแล้ว
- [x] 1.2 Migration 001 (`supabase/migrations/001_init.sql`): helper functions + ทุกตาราง §3.3–3.4 + `supabase/seed.sql` (3 แพลน, ธีม basic-01, demo tenant/store/category fixed UUID) — **apply ลง Supabase จริงแล้ว** ผ่าน SQL Editor (2026-07-06), ตรวจ `plans`/`tenants`/`stores` ตรงตามคาด (store "ร้านเดโม ShopDash" theme_code basic-01)

- [x] 1.3 Token system (`themes/tokens.css` + `@theme inline` mapping) + preset `basic-01` + ฟอนต์ไทย 7 ตัว (next/font) + `ThemeScope` + component library storefront ครบ 14 ตัว (§4.3) + `lib/format.ts`, `lib/orders/status.ts` — build ผ่าน, ไม่มี hex ใน components/storefront

- [x] 1.4 R2 helper (`lib/r2.ts`: presign PUT 5 นาที / GET สลิป 15 นาที / putObject / key builders) + `app/api/upload/route.ts` (auth + MIME webp + ≤5MB) + `lib/upload-client.ts` (แปลง webp ≤1600px ฝั่ง client) + `lib/tenant-context.ts` เวอร์ชัน Phase 1 (demo ตายตัว) + remotePatterns ใน next.config.ts — ยังไม่ได้ทดสอบกับ R2 จริง (จะทดสอบพร้อม UI งาน 1.5)

- [x] 1.5 Store Admin: auth (login/forgot/reset ผ่าน Supabase Auth + PKCE `/auth/confirm`), layout+nav+logout, CRUD หมวดหมู่ (เพิ่ม/แก้ชื่อ/ลบ/เลื่อนลำดับ), CRUD สินค้า (ฟอร์ม+สถานะ+แนะนำ), variant matrix (generate ไซส์×สี, idempotent, แก้ SKU/ราคา override/สต๊อก/threshold/เปิด-ปิดต่อ variant), อัปโหลดรูปสินค้า (ลากเรียง+ลบ) — **ทดสอบ E2E ด้วย headless browser ผ่านหมด** (login → หมวดหมู่ → สินค้า → variant 4 ตัว → แก้สต๊อก persist → logout) ยกเว้นอัปโหลดรูปติด R2 CORS (ดู Blockers)

- [x] 1.6 Storefront (path ตรง `/` ผ่าน route group `(storefront)` + force-dynamic): หน้าแรกเรียง section ตาม preset, แคตตาล็อก+ตัวกรอง server-side (category/size/color/sort + pagination 24/หน้า), หน้าสินค้า (แกลเลอรี+variant selector ราคา/สต๊อกอัปเดตตาม variant, ปุ่ม disabled เมื่อสต๊อก 0), ตะกร้า localStorage `shopdash_cart_{slug}` (`lib/cart.ts` useSyncExternalStore) + CartDrawer ใน header — **E2E ผ่านหมด**: home → filter สี → หน้าสินค้า → variant หมดสต๊อก disabled → M/แดง ฿319 เพิ่ม 2 ชิ้น → drawer ฿638 → persist หลัง reload

## In progress
- [ ] 1.7 Checkout: สร้าง order (service role route), dedupe customer ด้วยเบอร์โทร, gen order_number — ยังไม่เริ่ม

## DoD checklist (Phase 1)
- [ ] 1. e2e loop ครบวงจร (ยังไม่ทดสอบ)
- [ ] 2. ปฏิเสธสลิป/ยกเลิกออร์เดอร์คืนสต๊อก
- [ ] 3. สลิปไฟล์ซ้ำถูกกันด้วย unique(file_hash)
- [ ] 4. variant สต๊อก 0 กันทั้ง UI และ server
- [x] 5. ไม่มี hex code ใน components/storefront (grep ผ่าน 2026-07-06 — ตรวจซ้ำก่อนปิด Phase)
- [x] 6. pnpm build ผ่าน ไม่มี type error (ตรวจซ้ำก่อนปิด Phase)

## Blockers / Notes
- R2 CORS ตั้งแล้ว (origin localhost:3000) — ทดสอบอัปโหลดรูปผ่านครบ flow: webp convert → presigned PUT → product_images → เสิร์ฟผ่าน next/image (2026-07-06) **ขึ้น production ต้องเพิ่ม origin โดเมนจริงใน CORS ด้วย**
- ห้ามรัน `pnpm build` ขณะ dev server เปิดอยู่ — .next พังต้องลบแล้ว restart
- Auth users ที่มีอยู่: `testdash@shopdash.com` (ผู้ใช้สร้างเองผ่าน Dashboard), `phase1-smoke-test@shopdash.local` (user ทดสอบอัตโนมัติ สร้างผ่าน service role — ลบได้เมื่อจบ Phase 1)
- ข้อมูลทดสอบในร้าน demo: หมวด "เสื้อผ้าผู้หญิง" + สินค้า "เสื้อยืดทดสอบ" (299 บาท, published, 4 variants S/M × แดง/น้ำเงิน, ตัวแรก stock 15 ราคา override 319) — ใช้ต่อในงาน 1.6 ได้เลย
- playwright ติดตั้งเป็น devDependency ไว้ใช้ smoke test งานถัดๆ ไป (สคริปต์ชั่วคราว `.tmp-e2e-smoke.mjs`, `.tmp-upload-test.mjs` ไม่ commit)
- helper functions อยู่ `public.*` ไม่ใช่ `auth.*` — ดู DECISIONS.md (Phase 2 policies ต้องเรียก `public.app_tenant_id()`)
- Demo tenant fixed UUID: tenant `...0001`, store `...0002`, category `...0003` (slug `demo`, แพลน pro)
- @supabase/ssr ต้องใช้ ^0.12.0 (0.6.x มีปัญหา type ของ cookies setAll กับ Next 15 + TS strict)
- pnpm 11.5: อนุญาต build script ของ sharp ผ่าน `pnpm-workspace.yaml` (`allowBuilds`)

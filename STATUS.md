# STATUS
- Current phase: 7 (TEMPLATE_SPEC "Commerce Premium" — **ครบทั้ง 4 เทมเพลต + DoD ผ่านครบทุกข้อรวม Lighthouse** T2 ✓ T1 ✓ T3 ✓ T4 ✓)
- Phase 1–5 ครบ: tag `phase-5-done` 🎉 (MVP + v1.1)
- **โดเมนจริงของแพลตฟอร์ม: `shopdashth.com`** (ตั้งใน `ROOT_DOMAIN` — เดิมเอกสารใช้ shopdash.co)
- Last session: 2026-07-17

## Done (Phase 7 ต่อ — บริการโดเมนส่วนตัว ฿590/ปี แอดมินจัดการให้, 2026-07-17 ตามคำสั่งเจ้าของ)
- [x] **โจทย์**: flow custom domain เดิมให้ลูกค้าตั้ง DNS เอง (ใช้จริงไม่ได้เพราะยังต้อง add โดเมนเข้า Vercel มือ + ยังไม่เคยทดสอบโดเมนจริง) — เจ้าของสั่งเปลี่ยนเป็น "ลูกค้าส่งชื่อโดเมนมา ทีมงานจัดการให้ คิด ฿590/ปี (จดใหม่รวมค่าโดเมนปีแรก + ต่ออายุรายปี)"
- [x] `supabase/migrations/017_domain_requests.sql` — ตาราง `domain_requests` (state: awaiting_payment→slip_uploaded→in_progress→completed/rejected/cancelled) + RLS (super all / tenant read self) + `custom_domains.managed` + `service_ends_at` — **รอเจ้าของรันใน SQL Editor**
- [x] **ฝั่งร้าน `/admin/domain` (Pro+ เดิม, เจ้าของร้านเท่านั้น)**: ฟอร์มส่งชื่อโดเมน+หมายเหตุ → QR PromptPay แพลตฟอร์ม ฿590 + อัปสลิป (`/api/domain-slips` — hash กันสลิปซ้ำ, LINE แจ้งเจ้าของแพลตฟอร์ม) → timeline 5 ขั้น → โดเมน active โชว์วันหมดอายุ + ปุ่ม "ต่ออายุ ฿590/ปี" เมื่อเหลือ ≤45 วัน + ประวัติคำขอ / ยกเลิกได้เฉพาะยังไม่จ่าย / ถูกปฏิเสธเห็นเหตุผล
- [x] **ฝั่ง Super Admin → "คำขอโดเมน"**: คิวรอตรวจสลิป (รูปสลิป presigned) + คิวกำลังดำเนินการ (checklist ขั้นตอน + ปุ่ม "ตรวจ DNS" reuse `runDomainChecks`) + อนุมัติ/ปฏิเสธ(เหตุผล)/ทำเสร็จ (upsert `custom_domains` active+managed หรือขยายอายุ +1 ปี) + รายการโดเมนใกล้หมดอายุ + ประวัติ
- [x] **แก้บั๊ก interaction**: cron `domain-recheck` เดิมเช็ค TXT เสมอ → โดเมน managed (แพลตฟอร์มจดเอง ไม่มี TXT) จะโดนตีเป็น error หลัง 3 วัน — เพิ่ม `runDomainChecks(row, {skipTxt})` ให้ managed วัดจาก CNAME/A เท่านั้น
- [x] ถอด flow self-service เดิม: `requestCustomDomain` + `/api/domain/verify` + หน้า DNS instructions ฝั่งลูกค้า (ฟังก์ชันตรวจ DNS ยังอยู่ — เป็นเครื่องมือแอดมิน+cron) / อัปเดต copy landing (FAQ + bullet แพลน) เป็น "บริการเสริม 590 บาท/ปี"
- [x] ขั้นตอน ops ต่อ 1 คำขอเขียนไว้ที่ `DEPLOYMENT.md §โดเมนลูกค้า` (จด registrar → DNS → add Vercel → ตรวจ DNS → ทำเสร็จ)
- [x] `tsc --noEmit` + `npm run build` ผ่าน

## Done (Phase 7 ต่อ — ธีม "ลิตเติ้ลจอย" toys-01 ตาม ref ภาพ Little Joy, 2026-07-17 ตามคำสั่งเจ้าของ)
- [x] **โจทย์**: เจ้าของส่งภาพ ref เว็บ "Little Joy ของเล่น & แม่และเด็ก" ให้สร้างเทมเพลทเต็มรูปแบบสำหรับ pack ของเล่น
- [x] **preset `toys-01`** (tier 1 ทุกแพลนเลือกได้): โทนฟ้าอ่อน-ชมพูพาสเทล ฟอนต์ Mitr/Prompt radius ใหญ่ — hero `split-panel` (แผงฟ้า + headline 2 สี + ปุ่มชมพู "ช้อปเลย") → การ์ดหมวด pill พาสเทล → สินค้าแนะนำ 5 ใบ → แถบ USP ฟ้า → รีวิวคุณพ่อคุณแม่ → footer full / layout: utility bar โทน soft + search จริง
- [x] **ชิ้นใหม่ที่ใช้ซ้ำได้ (token ล้วน ไม่มี hex ใน component — grep ตรวจแล้ว)**: ProductCardVariant `toy` (`ToyProductCard` — หัวใจ wishlist + ราคา accent + ดาวรีวิวจริง + ปุ่ม "หยิบใส่ตะกร้า" เต็มกว้าง เปิด QuickView), section `categoryCards` (`CategoryCardRow` — pill สลับ 4 โทนจาก token อนุพันธ์ใหม่ `accent-soft`/`star-soft`), `ThemeLayout.utilityBarTone: 'soft'`, `HeroContent.headline2` (บรรทัดสองสี primary — แก้ได้ที่ "เนื้อหาเว็บ"), `TestimonialsBand` prop `centered` + ดาวเปลี่ยนเป็น `--color-star` ตามสเปค
- [x] **TOYS_PACK**: `themeCode: 'toys-01'` + เนื้อหาตาม ref (hero/utility/usp 4 ข้อ/รีวิวคุณแม่ 3 ราย/การ์ดหมวด 4 ใบ) + รูป generate เพิ่ม `hero-02.webp` (โทนฟ้าเข้าชุดแผง hero) + `cat-04.webp` (เสื้อผ้าเด็ก) ใน `scripts/gen-service-images.mjs`
- [x] `supabase/migrations/016_toys_theme.sql` — upsert toys-01 เข้า theme_registry (**รอเจ้าของรันใน SQL Editor**)
- [x] theme-preview ขยายให้ render header/hero/การ์ดหมวด/การ์ดสินค้า mock/footer จริง — **ตรวจด้วยตา (screenshot desktop 1440 + mobile 390)**: โครง/สี/ปุ่มตรง ref, มือถือ hamburger + grid 2 คอลัมน์
- [x] `tsc --noEmit` + `npm run build` ผ่าน

## Done (Phase 7 ต่อ — ปุ่ม "เติมเนื้อหาตัวอย่าง" สำหรับร้านเก่า/สลับธีมแล้วหน้าโล่ง, 2026-07-16)
- [x] **โจทย์**: เจ้าของรัน migration 012+013 แล้ว แต่ร้านเก่าสลับธีมยังเห็นหน้าโล่ง — เพราะ starter pack seed เฉพาะร้านใหม่ตอน signup, สลับธีมเปลี่ยนแค่หน้าตาไม่เติมเนื้อหา/สินค้า (ถูกตามดีไซน์ ดู DECISIONS 2026-07-16)
- [x] **ปุ่ม "เติมเนื้อหา + สินค้าตัวอย่าง"** บนหน้า `/admin/content` (เจ้าของเลือก: เติมทั้งเนื้อหาและสินค้าเสมอ) — เลือกแนวร้านได้ถ้ามี pack พร้อม >1, confirm 2 ชั้น, เตือนถ้ามีตัวอย่างเดิม
- [x] **แก้ seedStarterPack ให้ปลอดภัยกับร้านเก่า**: เปลี่ยนจากเขียนทับ theme_overrides ทั้งก้อน → **merge __content** (เก็บสีธีม/socials/variantLabels ที่ร้านตั้งไว้) — provisioning ผลเดิมเป๊ะ (overrides ว่าง)
- [x] **action ล้าง is_sample เดิมก่อน seed** (idempotent — กดซ้ำสินค้าไม่ซ้อน, หมวดที่มีสินค้าจริงอ้าง → ถอด flag กัน FK ชน); ของจริงของร้านไม่ถูกแตะ
- [x] `tsc --noEmit` + `npm run build` ผ่าน — **เจ้าของทดสอบจริง: เปิด /admin/content ของร้านเก่า → กดปุ่ม → เปิดหน้าร้านดูว่าเนื้อหา+สินค้าครบ และสีธีมที่ตั้งไว้ไม่หาย**

## Done (Phase 7 ต่อ — ชุด hardening 8 ข้อ + แผงสถานะระบบ, 2026-07-16 ตามคำสั่งเจ้าของ "ทำทั้ง 8 ข้อ")
- [x] **(1) แจ้งเตือน LINE เจ้าของแพลตฟอร์ม**: ร้าน signup ใหม่ + สลิปค่าแพลนเข้าคิว → LINE OA ของเจ้าของ (`lib/platform/line.ts`, fire-and-forget) — token ตั้งได้ที่ **Super Admin → ตั้งค่า** (migration 013 — **รอรันใน SQL Editor**) หรือ env `PLATFORM_LINE_CHANNEL_TOKEN`
- [x] **(2+9) ระบบสถานะ/health**: `lib/platform/health.ts` เช็ค Supabase DB + Auth + R2 (เขียนไฟล์จริง) + config ครบไหม → **แผง "สถานะระบบ" บนแดชบอร์ด Super Admin** (latency + สาเหตุภาษาไทย) + `GET /api/health` สำหรับ uptime monitor (ตอบ ok/down เท่านั้น, 503 เมื่อล่ม, cache 30s) — วิธีตั้ง UptimeRobot อยู่ DEPLOYMENT §8.1 (ต้อง monitor ทั้ง /api/health และร้านผ่าน Worker)
- [x] **(3) หน้ากฎหมาย PDPA**: `/privacy` + `/terms` บน layout landing + ลิงก์ footer + บรรทัดยอมรับใต้ปุ่ม signup — เนื้อหาอธิบายบทบาท controller/processor และ retention 90 วัน (มีหมายเหตุให้ทนายตรวจเมื่อโต)
- [x] **(4) กติกาสคริปต์**: `scripts/README.md` — รายการสคริปต์ .tmp ในเครื่องเจ้าของที่ต้องกู้เข้า repo (seed ร้านเดโม่ T1-T4 ฯลฯ) + ชื่อปลายทาง + เตือนใน .gitignore — **เจ้าของต้องกู้ไฟล์จากเครื่องตัวเอง** (clone นี้ไม่มีไฟล์)
- [x] **(5) Rate limit ข้าม instance**: รองรับ Upstash Redis (env `UPSTASH_REDIS_REST_URL/TOKEN` — ว่าง = in-memory เดิม, Redis ล่ม = fail-open) — สมัคร Upstash แล้วตั้ง env บน Vercel ตาม DEPLOYMENT §8
- [x] **(6) แก้บั๊ก robots.txt 404** (ค้างจาก 2026-07-14): Next ไม่รองรับ robots.ts ใน route group → ย้ายเป็น `app/robots.ts` แยกกติกาตาม host — **ทดสอบ prod build จริงผ่าน 3 ชนิด host** (ร้าน=rules+sitemap ต่อร้าน 200, platform=เปิด index, super-admin=ปิดทั้งเว็บ, sitemap regression 200)
- [x] **(7) Onboarding + PromptPay gate**: ร้านไม่ตั้ง PromptPay = ระบบสั่งซื้อปิดอัตโนมัติ (clamp ใน buildContext + server ตรวจซ้ำใน /api/checkout — ปิดช่องเดิมที่ T1 กันแค่ UI ด้วย) + แบนเนอร์แดง "รับเงินไม่ได้" + checklist 3 ข้อบนแดชบอร์ดร้าน (PromptPay/สินค้าจริงชิ้นแรก/ที่อยู่ร้าน)
- [x] **(8) Starter pack ของเล่น/แม่และเด็ก**: data ครบ 8 สินค้า (ป้าย ช่วงวัย/แบบ) + registry เช็ค asset — **เหลือเจ้าของหารูป 12 ไฟล์วางตาม `public/demo/toys/README.md`** (network เครื่องพัฒนาโดนบล็อกคลังรูป stock) → ตัวเลือก "ร้านคุณขายอะไร" โผล่บนหน้า signup เองเมื่อรูปครบ
- [x] `tsc --noEmit` + `npm run build` ผ่านทุก commit (7 commits แยกตามข้อ)

## Done (Phase 7 ต่อ — Starter Store: ร้านใหม่มีข้อมูลตัวอย่างเต็มร้านทันทีหลัง signup, 2026-07-16 ตามคำสั่งเจ้าของ)
- [x] **โจทย์**: ลูกค้า trial สมัครเสร็จเจอร้านเปล่า → ถอดใจ — ต้องเริ่มด้วยร้านสวยมีสินค้า/รูป/เนื้อหาครบ แล้วให้แก้เป็นของตัวเอง (ดู DECISIONS 2026-07-16)
- [x] `supabase/migrations/012_starter_pack.sql` — **ยังไม่ apply (รอเจ้าของรันใน SQL Editor)**: `is_sample` ใน products/categories/pages + upsert ธีม t1-simple/t2-store/t3-hub/t4-luxe เข้า theme_registry (เดิมอยู่แต่ใน DB จริงผ่านสคริปต์ .tmp — install ใหม่จะชน FK)
- [x] **Starter pack "แฟชั่นเบสิก"** (`lib/starter-packs/fashion.ts` data ล้วน + `lib/starter-pack.ts` seeder): หมวด 4, สินค้า 10 (variants ไซส์/สี, 1 ตัว sale — ป้าย T3, 1 variant สต๊อกต่ำ — โชว์แถบเตือน, backdate created_at กันป้าย NEW ขึ้นทุกตัว), รีวิวไทย ~57 รายการ (1 ตัว ≥15 = ป้าย BEST), `__content` ครบคีย์ T1-T4 (hero/slides/แบนเนอร์หมวด/วงกลมหมวด/lookbook/brand story/highlights/member benefits/tagline), เพจ about + how-to-order เฉพาะแพลนมี custom_pages — รูปทั้งหมด static `/demo/t2/*` อ้างตรงใน r2_key (publicR2Url รองรับ path ขึ้นต้น `/` แล้ว — ไม่พึ่ง R2 ตอน provision)
- [x] **provisionTenant**: ธีมเริ่มต้นตามแพลน (p1→t1-simple, p2→t2-store, p3→t3-hub, p4→t4-luxe) + step 7 ใหม่ seed starter pack แบบ non-fatal (พลาด = เก็บกวาดแถวค้าง + fallback หมวด "สินค้าทั้งหมด" เดิม + log `provision:starter_pack` ลง provisioning_logs)
- [x] **หลังร้าน**: badge "ตัวอย่าง" ในตารางสินค้า / แบนเนอร์แดชบอร์ด "กำลังแสดงสินค้าตัวอย่าง N รายการ" + ปุ่ม "ลบข้อมูลตัวอย่างทั้งหมด" (confirm 2 ชั้น; หมวดที่มีสินค้าจริงค้าง → ถอด flag แทนลบ) / **แก้ record ตัวอย่าง = flag เคลียร์ทันที** (updateProduct/Category/Page) กันปุ่มลบกวาดของที่ลูกค้าแก้แล้ว / สินค้า is_sample ไม่นับโควตา max_products
- [x] `npx tsc --noEmit` + `npm run build` ผ่าน (สภาพแวดล้อม CI — dummy env)
- [ ] **ค้างตรวจกับ DB จริง (เครื่องเจ้าของ)**: รัน migration 012 → signup ร้านทดสอบ 1 ร้าน/แพลน → เช็คหน้าร้าน+แดชบอร์ด+ปุ่มลบตัวอย่าง → ลบร้านทดสอบ

## Done (Phase 7 ต่อ — ยกเครื่อง UI หน้าแดชบอร์ด Store Admin, 2026-07-16)
- [x] **`/admin/dashboard` ดีไซน์ใหม่** (commit c918779, 3 ไฟล์ presentational ล้วน): `StatTile` การ์ด gradient พาสเทล + icon chip ลอย (แทน StatCard แบน) / pipeline การ์ด gradient + chevron + สรุป "ค้างรวม N รายการ" / **สินค้าขายดีเป็น list มีเหรียญอันดับ 1-2-3 + แถบสัดส่วนยอดขาย** (เดิมเป็นตารางเปล่า) / กราฟ line→**area** เติม gradient + bar gradient แนวตั้ง + `ChartHead` (icon chip + ยอดรวม) / upgrade panel การ์ด gradient + star chip / สต๊อกใกล้หมดห่อ overflow-x + badge จำนวนที่หัวการ์ด / skeleton `loading.tsx` ปรับเป็น rounded-2xl ให้ทรงตรงการ์ดจริง
- [x] `npx tsc --noEmit` + `npm run build` ผ่าน / **ตรวจด้วยตา (screenshot จริง)**: wearstore (p2-shop, ไม่มี full analytics) เห็น stat tile + pipeline + upgrade panel + low stock ครบ; fashionhub (p3-business, full) เห็นกราฟ area/bar + หัวการ์ด + สินค้าขายดี empty state render ครบทุกส่วน — ไม่มี hardcode color นอก storefront (แดชบอร์ดแอดมินใช้ palette เทา/indigo ได้ตาม §8.5)

## Done (UI contrast + Platform PromptPay ใน DB, 2026-07-15 ตามคำสั่งเจ้าของ)
- [x] **เพิ่มความชัด UI หลังร้าน/Super Admin** (commit 0a69167): nav/sidebar/การ์ด/ตาราง ตัวหนา+สีเข้มตัดพื้น, ขอบ gray-200→gray-300, active เป็น pill indigo ทึบ, header เส้นใต้หนา `border-b-2`
- [x] **PromptPay แพลตฟอร์มย้ายเข้า DB + หน้า UI** (`migration 011_platform_settings.sql` — ตาราง single-row + RLS super admin): เมนูใหม่ **Super Admin → "ตั้งค่า"** (`/settings`) กรอก PromptPay ID + ชื่อบัญชี (validate 10/13 หลัก, เตือนห้ามใส่เลขบัญชี), `lib/platform-settings.ts` อ่าน DB→fallback env, หน้า `/admin/plan` สร้าง QR จากค่า DB — **รอเจ้าของรัน migration 011 บน Supabase** (ก่อนรันยังใช้ env เดิมได้)
- [x] **วินิจฉัย: signup สร้างร้านสำเร็จ แต่ `{slug}.shopdashth.com` เปิดไม่ได้** — ต้นเหตุคือ DNS/deploy ล้วนๆ (ข้อมูลร้านอยู่ครบใน DB) ไล่จาก NXDOMAIN → 525 จนฟันธง
- [x] **ข้อจำกัดที่พิสูจน์แล้ว**: (1) โดเมนจดกับ **Cloudflare Registrar** → ล็อก NS ที่ Cloudflare เปลี่ยนเป็น Vercel ไม่ได้ (2) โดเมนจด 2026-07-14 → ติดล็อกห้ามย้าย registrar 60 วัน (3) Vercel ออก wildcard cert ให้ไม่ได้ถ้า NS ไม่ใช่ของมัน + **Vercel ตอบ 403 เมื่อ TLS SNI ≠ Host** (ทดสอบด้วย curl ยิงตรง `shopdash-th.vercel.app` + Host ร้าน = 403 ทุกเคสรวมโดเมน valid) → ทริคหลอก SNI ผ่าน Cloudflare ใช้ไม่ได้
- [x] **ทางออกที่เลือก (เจ้าของเลือกเอง): Cloudflare Worker พร็อกซี** — CF terminate TLS (Universal SSL ครอบ `*.shopdashth.com` ฟรี) → Worker ต่อ Vercel ผ่าน `*.vercel.app` (SNI==Host ผ่าน) + ฝาก host ร้านจริงใน `x-tenant-host` เซ็นด้วย `TENANT_PROXY_SECRET`
- [x] `middleware.ts`: อ่าน `x-tenant-host` (เมื่อ `x-tenant-proxy` ตรง secret) แทน Host + บังคับ `host`/`x-forwarded-host`/`x-forwarded-proto` จริงลง downstream ทุก branch — dev (ไม่ผ่าน proxy) พฤติกรรมเดิมเป๊ะ
- [x] แก้จุดสร้าง absolute URL จาก request จริง: `/auth/confirm` (origin จาก host header แทน `request.url`) + `forgot-password` (https + host จริง แทน `http://`)
- [x] `workers/tenant-proxy.js` + `wrangler.toml` + `README.md` (ขั้นตอน deploy ทั้ง CLI/Dashboard) + `TENANT_PROXY_SECRET` ใน `.env.example` + DEPLOYMENT.md §1/§1.1 เขียนใหม่ตามสถาปัตยกรรมจริง
- [x] `npx tsc --noEmit` + `npm run build` ผ่าน
- [x] **LIVE + verified 2026-07-15**: push `main` (d685cf1) → Vercel deploy + เจ้าของ deploy Worker + ตั้ง secret + ผูก route `*.shopdashth.com/*` — ยิงเช็คจริงผ่านหมด: `nene.shopdashth.com` 200 (หน้าร้าน "เนเน่ ช็อป"), `nene…/admin` 307→login, `admin.shopdashth.com` 307→login, wearstore/apex/www OK, slug มั่ว 404 graceful (ไม่มี 525/403 แล้ว, redirect ชี้โดเมนจริงไม่หลุด vercel.app)
- [x] **แก้ต่อ: Server Actions หลังร้านพังผ่าน Worker** (commit 5c1a48e) — Next.js กัน CSRF เทียบ Origin≠Host (Vercel เห็น Host=*.vercel.app) → ทุก server action ในหลังร้าน error → เพิ่ม `experimental.serverActions.allowedOrigins = [ROOT_DOMAIN, '*.'+ROOT_DOMAIN]` ใน next.config.ts
- [x] **แก้ต่อ: absolute URL หลุดเป็น vercel.app** (commit 371adfb) — **Vercel เขียนทับ host/x-forwarded-host เป็น *.vercel.app ที่ระดับ function** (ทับค่าที่ middleware ตั้ง) → ลิงก์รีเซ็ตรหัส + `/auth/confirm` redirect หลุด → `lib/request-origin.ts` อ่าน host จาก custom header `x-tenant-host` (Worker แนบ, Vercel ไม่แตะ) validate ตาม ROOT_DOMAIN → เสียบ confirm/forgot-password/sitemap/robots — verified: confirm redirect ชี้ `nene.shopdashth.com` แล้ว
- [ ] **ยังเหลือ (ทำใน Dashboard ก่อนใช้ฟีเจอร์ที่เกี่ยว)**: (1) **Supabase → Auth → URL Configuration**: Redirect URLs เพิ่ม `https://*.shopdashth.com/**` + Site URL `https://shopdashth.com` — จำเป็นต่อลิงก์รีเซ็ตรหัสผ่านทางอีเมล (2) **R2 bucket CORS** เพิ่ม `https://*.shopdashth.com` — จำเป็นตอนอัปรูปสินค้า/เนื้อหาจากหลังร้านบน subdomain

## Done (Phase 7 ต่อ — โดเมน shopdashth.com + หน้า landing ขาย ShopDash, 2026-07-14 ตามคำสั่งเจ้าของ)
- [x] **เปลี่ยนโดเมนเป็น `shopdashth.com` ทุกจุด**: `.env.local`/`.env.example` (`ROOT_DOMAIN`) + ค่า fallback ในโค้ด 6 จุด (middleware, lib/domains cname target, sitemap, /admin/domain, super-admin tenant detail, ข้อความ pre-check ดาวน์เกรด) + suffix ในฟอร์ม signup เลิก hardcode `.shopdash.co` → รับ prop `rootDomain` + CLAUDE.md/DEPLOYMENT.md อัปเดตครบ (ดู DECISIONS)
- [x] **หน้า landing ใหม่ (`/platform` = root domain)** โทน SaaS สะอาด (indigo เดียวกับ Dashboard, IBM Plex Sans Thai): hero + จุดขาย "เงินเข้าบัญชีร้านเต็มจำนวน ไม่หักค่าคอมต่อออร์เดอร์" / **แกลเลอรีเทมเพลต 4 ตัวเป็น screenshot ร้านเดโม่จริง + ปุ่มเข้าร้านเดโม่** / ฟีเจอร์ 6 ข้อ (PromptPay, กันสลิปซ้ำด้วย QR, variant/สต๊อก, ออร์เดอร์-พัสดุ, แก้เนื้อหาเอง, แดชบอร์ด) / 3 ขั้นตอนเริ่มต้น / ตารางราคา 4 แพ็กเกจอ่านจาก DB (2 ชั้น: ปีแรก + ค่าดูแลรายปี, ป้าย "แนะนำ" ที่ p2-shop) / FAQ 6 ข้อ / CTA — header+footer ใหม่ (nav, ลิงก์, metadata+OG)
- [x] **ป้าย "เทมเพลตนี้อยู่ในแพ็กเกจไหน" คำนวณจาก `plans.allowed_theme_tier` จริง** (ตอนแรก hardcode ผิด: p2-shop ใช้ LUXÉ ได้อยู่แล้ว = โฆษณาผิด) — ราคา/ฟีเจอร์/ป้ายทั้งหมดมาจากตาราง plans เจ้าของแก้ใน Super Admin แล้วหน้าขายเปลี่ยนตามทันที
- [x] **แก้บั๊กแฝง middleware: ไฟล์ static ใน `public/` โหลดไม่ได้บน host แพลตฟอร์ม/super-admin** (ถูก rewrite เป็น `/platform{path}` → 404, next/image → 400) — เพิ่ม static bypass ก่อน rewrite โดยไม่รวม .xml/.txt (sitemap/robots ต้องได้ x-tenant-slug) — บั๊กนี้ซ่อนมาตลอดเพราะหน้า platform เดิมไม่มีรูปเลย
- [x] รูปเทมเพลต: `public/marketing/templates/*.webp` (เก็บด้วย `.tmp-landing-shots.mjs` — รันซ้ำได้เมื่อธีมเปลี่ยนหน้าตา)
- [x] `tsc --noEmit` + `npm run build` ผ่าน + **regression prod build 19/19** (`.tmp-landing-regression.mjs`): landing/รูป/next-image/signup + storefront 4 ร้าน + sitemap ต่อ tenant + admin/super-admin login + หน้ากั้น /platform,/super-admin จาก host ร้าน + landing โชว์ราคาจาก DB จริง — screenshot `.tmp-shots/landing/`
- ⚠ พบบั๊กเดิมที่ไม่เกี่ยวกับงานนี้ (ยืนยันว่ามีอยู่ก่อนแก้ middleware): **`/robots.txt` ของ storefront ตอบ 404** ทั้งที่ `app/(storefront)/robots.ts` มีอยู่ — ยังไม่แก้ในรอบนี้

## Done (Phase 6 — Billing v2 + สรุปออร์เดอร์)
- [x] `supabase/migrations/007_billing_v2.sql` — **apply แล้ว 2026-07-10 (ผู้ใช้รันใน SQL Editor, ตรวจ 12/12 ผ่านด้วย `.tmp-verify-007.mjs`)**: plans.price_renewal, แพ็กเกจใหม่ 4 ตัว (p1-start ฿990/590, p2-shop ฿3,900/1,200, p3-business ฿7,900/2,400, p4-premium ฿15,900/4,900), ปิดขาย starter/pro/premium, flag ใหม่ `theme_customize`, orders.public_token, stores.order_cutoff_time + shipping_note_th
- [x] Billing v2: `isRenewalTenant()`/`planChargeAmount()` (lib/billing.ts) — จ่ายครั้งแรก = ปีแรก (รวมค่าจัดทำ), เคยอนุมัติแล้ว = ค่าดูแลรายปี; `/admin/plan` + `/platform` pricing + `/signup` แสดง 2 ราคา; QR คิดยอดตามสถานะลูกค้า
- [x] Super admin `/plans`: ช่องค่าดูแลรายปี + checkbox theme_customize + **ฟอร์มสร้างแพลนใหม่** (เดิมเพิ่มได้ทาง SQL เท่านั้น)
- [x] Super admin tenant detail: **ปุ่มขยาย trial** (`extendTrial` 1–365 วัน, audit log `trial_extended`) — งานทำเว็บ P3/P4 เกิน trial 7 วัน ร้านไม่ถูก cron ล็อกกลางคัน + theme_customize ใน feature overrides
- [x] Theme customize: gate ด้วย `ctx.features.theme_customize` แทนผูกกับธีม prem-01/02 (P2+ ปรับสี/ฟอนต์ได้ทุกธีม, server ตรวจ flag ซ้ำ)
- [x] **หน้าสรุปออร์เดอร์มืออาชีพ** (`/orders/[num]/pay`): หัวร้าน+เลขออร์เดอร์+วันเวลา+สถานะ, รายการสินค้า (ราคา×จำนวน), รวมค่าสินค้า/ส่วนลด/ค่าส่ง/ยอดสุทธิ, QR PromptPay ยอด+บัญชีร้านถูกต้อง, ที่อยู่จัดส่ง (**เฉพาะลิงก์มี `?t={public_token}` — กันเดาเลขออร์เดอร์**), เวลาตัดรอบจัดส่ง+หมายเหตุร้าน, ติดต่อร้าน, เลขพัสดุ+ลิงก์ติดตามเมื่อ shipped
- [x] Checkout → redirect พร้อม token (`/orders/{num}/pay?t=...`), `/api/checkout` คืน payToken
- [x] ตั้งค่าร้าน: เวลาตัดรอบจัดส่ง (HH:MM) + หมายเหตุการจัดส่ง
- [x] Order detail แอดมิน: แผง "ส่งสรุปให้ลูกค้า" — คัดลอกลิงก์สรุป (มี token) + คัดลอกข้อความสรุปสำเร็จรูปวางในแชท + เพิ่มบรรทัดรวมค่าสินค้า/ส่วนลดในตาราง
- [x] `supabase/seed.sql`: แพลนเก่า insert เป็น is_active=false (กันติดตั้งใหม่เปิดขายแพลนเก่าทับ 007)
- [x] `pnpm build` ผ่าน + smoke test dev server (home/products/platform/signup/track = 200)

## E2E Phase 6 — ผ่านครบ 47/47 (2026-07-10, `.tmp-phase6-test.mjs` — ไม่ commit)
- [x] A. checkout จริง → หน้าสรุป: เลขออร์เดอร์/วันเวลา/รายการ/รวม ฿319+ส่ง ฿50=สุทธิ ฿369/QR+PromptPay ID/ตัดรอบ 14:00/หมายเหตุร้าน — **มี token เห็นที่อยู่จัดส่งครบ, ไม่มี token หรือ token ผิด → ไม่เห็น (ยังจ่ายได้)**
- [x] B. order detail แอดมิน: คัดลอกลิงก์ = ลิงก์สรุป+token เป๊ะ, ข้อความสรุปครบทุกส่วน
- [x] C. /admin/plan: ยังไม่เคยจ่าย → "/ปีแรก ฿990 (รวมค่าจัดทำ)", มี approved sub → "(ต่ออายุ) ฿590 ค่าดูแลรายปี"
- [x] D. theme_customize: starter ไม่เห็นปุ่ม+เข้า /customize โดน redirect; p2-shop เห็นปุ่ม+ปรับธีม basic ได้ (สะท้อนผลใน ≤60s ตาม cache TTL §3.8)
- [x] E. super admin: ฟอร์มสร้างแพลน+ช่องค่าดูแลรายปี+checkbox theme_customize, เปลี่ยนแพลน shop2 ผ่าน UI, ขยาย trial 10 วัน (trial_ends_at +10.00 วัน + audit log `trial_extended`)
- [x] F. landing/signup: ราคา 2 ชั้น, แพลนใหม่ 4 ตัว, ไม่เห็นแพลนเก่า
- ข้อมูลทดสอบล้างแล้ว (ออร์เดอร์/customer ทดสอบลบ, shop2 กลับ starter + trial null) — ร้าน demo ตั้ง order_cutoff_time=14:00 ค้างไว้เป็นข้อมูลตัวอย่าง
- หมายเหตุ: รหัสผ่าน `phase1-smoke-test@shopdash.local` ถูก reset เพื่อใช้ e2e (user ทดสอบ — ลบได้ก่อน production ตาม DEPLOYMENT §3)

## Done (Phase 6 ต่อ — hardening + Pages/CMS + ธีม one-page, 2026-07-10)
- [x] **Rate limit** (`lib/rate-limit.ts` — in-memory sliding window ต่อ instance): checkout 10/นาที, slips 6/นาที, signup 5/ชม., slug-check 30/นาที, discount-check 20/นาที (ต่อ IP), domain-verify 10/10นาที (ต่อร้าน) — ตอบ 429 ไทย; **ทดสอบจริง: ยิง checkout 12 ครั้ง → 10×400 + 2×429** ✅
- [x] `supabase/migrations/008_pages_onepage.sql` — **apply แล้ว 2026-07-10 (ผู้ใช้รันใน SQL Editor)**: ตาราง `pages` (tenant_id + RLS ENABLE+FORCE ตาม §3.5 + anon อ่านเฉพาะ published), flag `custom_pages` ให้ p3-business/p4-premium, ธีม one-01 ใน theme_registry
- [x] **Pages/CMS** (ปลดล็อกขายแพลนธุรกิจ): `/admin/pages` CRUD (สร้าง/แก้/ลบ/ฉบับร่าง-เผยแพร่/ลำดับ/แสดงใน footer, flag-gated + server ตรวจซ้ำ), storefront `/p/{slug}` (published เท่านั้น + SEO metadata), ลิงก์เพจใน Footer ทุกหน้า, เมนู "เพจ" ใน admin nav — เพจเดิมอยู่รอดการดาวน์เกรด (gate เฉพาะสร้าง/แก้ ตาม §7.2)
- [x] **ธีม one-01 "วันเพจ"** (tier 1 — แพ็กเกจเริ่มต้น ฿990 "หน้าเดียว แคตตาล็อก+ติดต่อ"): section ใหม่ `catalog` (สินค้า 24 ชิ้นบนหน้าแรก) + `contact` (การ์ดที่อยู่/โทร/ลิงก์ track) ผ่านระบบ preset ตามสถาปัตยกรรมเดิม ไม่มี if ชื่อธีม
- [x] `pnpm build` ผ่าน + ทดสอบ: home/404/rate-limit ผ่านครบ
- [x] **e2e Phase 6b ผ่าน 15/15** (2026-07-10, `.tmp-phase6b-test.mjs` — ไม่ commit): ร้าน starter ถูก gate หน้าเพจ / เปลี่ยนเป็นแพลนธุรกิจ → สร้างเพจ "เกี่ยวกับเรา" ผ่าน UI → `/p/about` แสดงเนื้อหา + ลิงก์ใน footer / slug สงวน "admin" ถูกปฏิเสธ / demo สลับธีมวันเพจ → หน้าแรกมีแคตตาล็อกเต็ม+การ์ดติดต่อร้าน (screenshot `.tmp-shots/p6b-one-page-home.png`) → สลับกลับ basic-01 — cleanup ครบ (เพจทดสอบลบ, shop2 กลับ starter)

## Done (Phase 6 ต่อ — ชั้นถอด QR กันสลิปซ้ำ, 2026-07-10)
- [x] `lib/slip-qr.ts` (sharp + jsQR — deps ใหม่ 2 ตัว): ถอด mini-QR จากรูปสลิป 3 สเกล + parse เลขอ้างอิงธุรกรรม (TLV tolerant) — **ทดสอบ offline ผ่าน 9/9** (`.tmp-qr-decode-test.mjs`): สองรูปคนละ hash → payload เดียวกัน, jpg บีบอัดถอดได้, รูปไม่มี QR คืน null ไม่ throw
- [x] `supabase/migrations/009_slip_qr.sql` — **apply แล้ว 2026-07-10 (ผู้ใช้รันใน SQL Editor)**: payment_slips.qr_payload + qr_scanned + partial index
- [x] `/api/slips`: ถอด QR ทุกใบ → payload ซ้ำกับออร์เดอร์อื่นในร้าน = ปฏิเสธ "สลิปนี้ถูกใช้ชำระคำสั่งซื้ออื่นไปแล้ว" (จับ crop/แคปใหม่ที่ hash จับไม่ได้) — ออร์เดอร์เดิมอัปธุรกรรมเดิมซ้ำได้ (§7.1) / ไม่พบ QR = รับเข้าคิว manual พร้อม flag
- [x] คิวตรวจสลิป: ป้ายแดง "ไม่พบ QR ในสลิป" (เฉพาะแถวที่สแกนแล้ว — แถวเก่าไม่เตือน) + แสดงเลขอ้างอิงธุรกรรมให้แอดมินค้นเทียบแอปธนาคาร
- [x] **ป้ายเตือนแดง "เช็คเงินเข้าเอง" ในคิวตรวจสลิป** (ตามคำสั่งเจ้าของ 2026-07-10 — สำคัญมาก): แบนเนอร์แดงหัวหน้า "ก่อนกดอนุมัติทุกครั้ง — ตรวจสอบเงินเข้าบัญชีด้วยตัวเองให้แน่ชัด" + บรรทัดแดงต่อใบ "เช็คเงินเข้า {ยอด} ในแอปธนาคารของคุณก่อน — อย่าเชื่อรูปสลิปอย่างเดียว" + ปุ่มอนุมัติเปลี่ยนเป็น "✓ อนุมัติ — เช็คเงินเข้าแล้ว" (screenshot `.tmp-shots/slips-queue-final.png`)
- [x] `pnpm build` ผ่าน + **e2e 6c ผ่าน 7/7** (2026-07-10, `.tmp-phase6c-test.mjs`): สลิปมี QR ผ่าน+payload ลง DB / ธุรกรรมเดิมคนละรูป (hash ใหม่) ยิงออร์เดอร์อื่น → ถูกปฏิเสธ / รูปไม่มี QR → เข้าคิว+flag / ออร์เดอร์เดิมส่งธุรกรรมเดิมซ้ำหลังถูกปฏิเสธ → ผ่าน (§7.1) — ข้อมูลทดสอบล้างครบ
- หมายเหตุ test harness: curl บน Windows ส่งภาษาไทยใน JSON เพี้ยนเป็น `?????` (แอปปกติ — browser ส่งตรงไม่เพี้ยน ยืนยันจาก e2e Phase 6) — สคริปต์ที่สร้างออร์เดอร์ผ่าน curl ให้ cleanup ด้วย order_number/เบอร์โทร ไม่ใช่ชื่อไทย

## Done (Phase 6 ต่อ — ยกเครื่อง UI storefront ทั้งระบบ, 2026-07-10 ตามคำสั่งเจ้าของ "ความสวยสำคัญมาก")
- [x] **Design tokens เพิ่ม** (`themes/tokens.css` — อนุพันธ์ คำนวณจาก token หลักอัตโนมัติ ทุกธีมได้ฟรี): `border-soft`, `primary-soft` (พื้นอ่อน/hover), `primary-ring` (focus), `primary-deep` (gradient), `hero-glow` + keyframes `drawer-in`/`fade-up` + `text-5xl`
- [x] **ชุดไอคอน SVG กลาง** `components/storefront/icons.tsx` (cart/search/phone/map/truck/qr/shield/package/arrow/chevron/close/tag — stroke currentColor ตาม token) + `SectionHeading` (eyebrow สี primary + หัวข้อใหญ่ + ปุ่มลิงก์ pill)
- [x] **Hero ใหม่**: ร้านไม่มีแบนเนอร์ → แผง gradient จากสีธีม (primary→primary-deep + วงแสง hero-glow) + headline ใหญ่ + CTA pill + trust badges — เลิกเป็นกล่องเทาโล่ง; มีรูป → overlay gradient สวยขึ้นทุก variant
- [x] **Header ใหม่**: แถบ utility บน (ส่งฟรีขั้นต่ำ/ติดตามคำสั่งซื้อ), โลโก้-ชื่อร้านใหญ่ขึ้น, ปุ่มค้นหา, ปุ่มตะกร้ากลม bg-primary + badge จำนวน, backdrop-blur — **บทเรียน: backdrop-filter บน `<header>` ทำให้มันเป็น containing block ของ position:fixed → CartDrawer ต้อง render นอก `<header>` (fragment)**
- [x] **Footer 3 คอลัมน์**: ข้อมูลร้าน (ไอคอนที่อยู่/โทร) / เมนู / การชำระเงิน&จัดส่ง (PromptPay/ตรวจสลิป/เลขพัสดุ) + แถวลิขสิทธิ์
- [x] **ProductCard 3 variant ยกเครื่อง**: ราคา font-heading bold สี primary, hover ยกการ์ด+ซูมรูป, ป้าย badge pill, overlay สินค้าหมด blur, placeholder ไม่มีรูปมีไอคอน
- [x] **FilterBar**: select แบบ custom (appearance-none + chevron), ช่องค้นหามีไอคอนแว่น, ปุ่ม pill, ล้างตัวกรอง hover แดง
- [x] **หน้าสินค้า**: breadcrumb, ราคาใหญ่บนพื้น primary-soft, สถานะสต๊อกมีจุดสี, trust row 3 ช่อง, คำอธิบายใส่การ์ด, gallery thumbnail active ชัด, **แถวหยิบใส่ตะกร้า sticky ล่างบนมือถือ** (§4.6)
- [x] **CartDrawer**: อนิเมชันสไลด์เข้า (animate-drawer-in), header มี badge จำนวน, nudge ส่งฟรีสี primary, ปุ่ม checkout pill
- [x] **Checkout**: หัวข้อขั้นตอนมีหมายเลข ①②, สรุปยอด sticky, ยอดสุทธิใหญ่สี primary; **Track**: ฟอร์มใส่การ์ด; **Pay**: QrPaymentPanel หัวแถบ primary + สถานะ chip สี; 404 มีเลขใหญ่; หน้าเพจ /p มีเส้นคั่น
- [x] หน้าแรก: SectionHeading ทุก section, หมวดหมู่เป็นการ์ด grid มี arrow hover, การ์ดติดต่อร้าน (one-page) มีไอคอนวงกลม
- [x] ตรวจด้วยตา (screenshots `.tmp-shots/after/`): demo (มินิมอลขาว) desktop+mobile ครบทุกหน้า, drawer, checkout + สลับธีมร้านทดสอบดูจริง: shop2→basic-02 (พาสเทลม่วง), p3test→one-01 (เขียวteal), p3race→pro-02 (ดาร์กนีออน) — design ใหม่สวยทุกธีมโดยไม่มีโค้ดเฉพาะธีม
- [x] `npm run build` ผ่าน + grep hex/rgb ใน `components/storefront` และ `app/(storefront)` = 0 (กฎ token §8.5 ข้อ 3)
- หมายเหตุ: ร้านทดสอบ dev ยังถือธีมที่สลับไว้ (shop2=basic-02, p3test=one-01, p3race=pro-02) — เก็บไว้ใช้ดูธีมต่างกันได้เลย

## Done (Phase 7 — TEMPLATE_SPEC "Commerce Premium": เทมเพลต T2 "STORE", 2026-07-10)
- [x] อ่าน TEMPLATE_SPEC.md + ภาพ ref 5 ภาพ (design-refs/) — ทำ T2 ตัวเดียวตามคำสั่ง (ห้ามแตะ T1/T3/T4), เจ้าของยืนยันแผน B1 (ธีมในระบบ ShopDash) + รูป
- [x] **Phase A รูปภาพ (§1)**: ค้น 213 candidate (Unsplash/Pexels ผ่าน Playwright) → คัด 33 รูป → sharp desaturate 90% + crop → `public/demo/t2/` + CREDITS.json — hero รอบแรกได้แนวตั้งหมด ต้อง re-search ด้วย `?orientation=landscape`
- [x] **ธีม `t2-store`** (tier 2): token ตาม §2 (ขาวจริง/ink #111214/radius 12-8/เงา 0 1px 3px/IBM Plex Sans Thai/container 1280) + `ThemeLayout` ใหม่ (utilityBar, headerSearch, footerVariant, demoRatings) — ทุกความต่างเป็น data ใน preset
- [x] **Section/variant ใหม่ใน library กลาง**: `UspStrip` `CategoryBannerRow` `ToolsRow` (ฟอร์มติดตาม→/track?num= + timeline สถานะเขียว + วิธีชำระเงิน) `FeatureBand` (พื้นครีม 5 ไอคอน) / การ์ด `store` (รูป 3:4 + hover สลับ flat-lay + badge + หัวใจ + จุดสี + ราคา "บาท" + ดาว) / hero `commerce` (full-bleed ข้อความซ้าย) / Footer `full` (newsletter+คอลัมน์ลิงก์+social สีแบรนด์) / **QuickView panel** (เลือกสี/ไซส์/จำนวน + เพิ่มลงตะกร้า/ซื้อเลย — preselect ตัวแรกที่มีสต๊อก) / header โหมด Commerce (utility bar ดำ + search box + เมนู drawer มือถือ)
- [x] **ร้านเดโม่ `wearstore`** (.tmp-t2-seed.mjs รันซ้ำได้): แพลน p2-shop active 1 ปี, หมวด 5, สินค้า 12 ชิ้น (variants ไซส์×สี, บาง combination สต๊อก 0), รูปหลัก+hover อัปเข้า R2 จริง 24 ไฟล์, เพจ help/contact, `__content` (hero SUMMER 2026 + แบนเนอร์หมวด 3 ใบ) — created_at ไล่ลำดับให้แถวสินค้าแนะนำตรง ref
- [x] **Loop วิจารณ์ 3 รอบ** (§6.1 — 390/768/1440, `.tmp-t2/shots/r1-r3/`): r1 พบ hero ตัดหัวคน/การ์ดแรกเป็น flat-lay/ราคา ฿ ไม่ใช่ "บาท"/scrim อ่อน → r2 แก้ครบ เหลือ QuickView ไม่ preselect + social wrap → r3 ผ่าน
- [x] **DoD §6 ครบ**: องค์ประกอบ ref ที่เหลือมีเหตุผลบันทึก (เมนู 5 ตามหมวดจริง, ไม่ fake เลขตะกร้า, ไม่มีลูกศร carousel — ของ T3, โลโก้บัตรเป็น text-badge) / anatomy การ์ดครบตาม §0.4 / มือถือ: การ์ด 2 คอลัมน์ + hero ไม่ตัดหัว + เมนู drawer (screenshot ยืนยัน) / **Lighthouse mobile (prod build): Performance 88 ≥ 85, CLS 0 < 0.1** / grep hex ใน components/storefront = 0 / `npm run build` ผ่าน
- เดโม่: `http://wearstore.localhost:3000` — เหลือ T1/T3/T4 รอคำสั่งถัดไป

## Done (Phase 7 ต่อ — รีวิวจริง + กล่องสถานะออร์เดอร์จริง, 2026-07-11 ตามคำสั่งเจ้าของ "ข้อ 6 ต้องใช้ได้จริง")
- [x] `supabase/migrations/010_product_reviews.sql` — **apply แล้ว 2026-07-11 (ผู้ใช้รันใน SQL Editor)**: ตาราง `product_reviews` (tenant_id + RLS ENABLE+FORCE ตาม §3.5, anon อ่านเฉพาะ published) + view `product_rating_summary` (security_invoker) — แอดมินร้านเป็นคนจัดการรีวิว (ลูกค้าเป็น guest ไม่มีบัญชี ตามที่เจ้าของยืนยันข้อ 1)
- [x] **ดาวรีวิวจริง**: ลบ `lib/demo-rating.ts` + flag `demoRatings` ทิ้ง — `lib/reviews.ts` + `attachRatings()` ใน lib/catalog (ทุก fetcher) → การ์ดโชว์คะแนนเฉลี่ย+จำนวนจาก DB, ไม่มีรีวิว = ไม่มีดาว; หน้าสินค้าเพิ่ม section `ReviewList` (สรุปคะแนน + รายการรีวิว)
- [x] **Store Admin จัดการรีวิว**: section ใหม่ในหน้าแก้ไขสินค้า (`product-reviews.tsx` + `review-actions.ts`) — เพิ่ม (ดาว/ชื่อ/ข้อความ), ซ่อน/แสดง, ลบ + โชว์คะแนนเฉลี่ยที่ลูกค้าเห็น
- [x] **กล่อง "สถานะคำสั่งซื้อล่าสุด" เป็นข้อมูลจริง**: checkout สำเร็จ → จำ เลขออร์เดอร์+เบอร์ ใน localStorage (`lib/last-order.ts`) → หน้าแรกยิง `GET /api/orders/status` (ต้องส่งคู่ num+phone ตรงกัน — กติกาเดียวกับ /track กัน enumeration) → `LatestOrderStatus` วาด timeline 5 ขั้นจริงตาม ORDER_FLOW + ขนส่ง/เลขพัสดุ/ลิงก์ติดตาม; ยังไม่เคยสั่ง → โชว์ตัวอย่างพร้อมป้าย "ตัวอย่าง" (ซื่อสัตย์กับลูกค้า)
- [x] **E2E ผ่าน (.tmp-t2-status-test.mjs)**: ก่อนสั่ง=ป้ายตัวอย่าง ✔ / สั่งจริง WEARSTORE-260711-0001 → กล่องโชว์เลขจริง+รอชำระเงิน+ป้ายหาย ✔ / เบอร์ผิด → 404 ✔ — screenshot `.tmp-t2/shots/status/`
- [x] `.tmp-t2-reviews-seed.mjs` **รันแล้ว 2026-07-11**: รีวิว 236 แถว → 12 สินค้า (เฉลี่ย ★4.5–4.7, กระจาย 5★60% 4★30% 3★10%, ชื่อ+คอมเมนต์ไทย, ย้อนหลัง 90 วัน) + สร้าง **admin ร้าน wearstore**: `wearstore-owner@shopdash.local` / `Wearstore!2026` (store_owner — user ทดสอบ ลบก่อน production ตาม DEPLOYMENT §3)
- [x] **E2E รีวิวผ่านครบ (browser จริง)**: การ์ดหน้าแรกโชว์ ★4.5 (31) จาก DB ✔ / หน้าสินค้า section รีวิว+สรุปคะแนน ✔ / login แอดมิน wearstore ✔ / เพิ่ม-ซ่อน-ลบรีวิวผ่าน UI (JWT+RLS insert จริง) ✔ — screenshot `.tmp-t2/shots/reviews/`
- [x] **scripts/test-isolation.ts ผ่าน 19/19** (2026-07-11): RLS forced ครบ 20 ตารางรวม product_reviews / รันด้วย `cp เป็น .mts + npx tsx@latest` (tsx มอง .ts เป็น CJS เพราะไม่มี type:module) / รีเซ็ตรหัส phase1-smoke-test ให้ตรง script (ถูกเปลี่ยนตอน e2e Phase 6)
- [x] `npm run build` ผ่าน / พบ+แก้ปัญหาแวดล้อม: node server เก่าค้างพอร์ต 3000 เสิร์ฟ .next เก่า → chunk 404 ทั้งหน้า (ฆ่า process แล้วปกติ)

## Done (Phase 7 ต่อ — ยกเครื่อง UI Store Admin ทั้งระบบ, 2026-07-11 ตามคำสั่งเจ้าของ "Dashboard ยังไม่สวย")
- [x] **ระบบดีไซน์ admin ใหม่** (`components/admin/ui.tsx` + `icons.tsx`): sidebar เข้ม gray-900 จัดกลุ่มเมนู 5 กลุ่ม + ไอคอน 25 ตัว + active pill + ลิงก์เปิดหน้าร้าน + email ผู้ใช้ + mobile drawer / ปุ่มหลัก indigo-600 / Badge สถานะ emerald-amber-rose-sky-violet (`ORDER_STATUS_TONE`) / การ์ด rounded-xl+shadow-sm / PageHeader/StatCard/EmptyState กลาง
- [x] หน้าหลักเขียนใหม่: dashboard (การ์ดสถิติมีไอคอนสี, pipeline การ์ดกดได้, upgrade panel), products (**รูปสินค้า thumbnail ในตาราง**, badge แนะนำ/สถานะ, empty state), orders (badge สีตามสถานะ, ลูกค้า 2 บรรทัด), slips (warning box + empty state ใหม่), login (พื้นเข้ม gradient + โลโก้)
- [x] กวาดอีก 39 ไฟล์ให้เข้าชุดเดียวกัน (ปุ่ม/input focus indigo, การ์ด, โทนสีแดง→rose เขียว→emerald เหลือง→amber) + order detail ใช้ Badge + (plan) layout header ใหม่
- [x] **ซ่อม bug พบระหว่างทาง**: `/admin/slips` พัง ERR_DLOPEN_FAILED — sharp 0.35.3 (โปรเจ็ค) ชน sharp 0.34.5 (ของ Next 15.5) libvips DLL ชนกันบน Windows → ตรึง `"sharp": "^0.34.5"` (ดู DECISIONS)
- [x] ตรวจ 3 รอบ screenshot (before/r1/r2/r3 ใน `.tmp-admin/`) + mobile drawer + ทุกหน้า admin 13 หน้า HTTP 200 + `npm run build` ผ่าน
- ⚠ บทเรียนแวดล้อม: ห้าม `next build` ขณะ dev server รันอยู่ (ทับ .next → chunk 404 ทั้งเว็บ) — kill dev ก่อนเสมอ

## Done (Phase 7 ต่อ — เทมเพลต T1 "SIMPLE", 2026-07-11)
- [x] **ธีม `t1-simple`** (tier 1, ตาม ref: SIMPLE WEAR): hero `split-panel` (แผงเบจ ข้อความซ้าย นายแบบขวา+gradient กลืนพื้น), การ์ด `simple` (รูป 4:5, ชื่อ, ราคา "บาท", ปุ่มกรอบ — ไม่มีดาว/จุดสีตามแพลน), section ใหม่ `contactCta` (แถบ LINE/FB พื้น brand-line/10) + `featureList` (แถบครีม 4 ข้อมีเลข + note แดง), `layout.headerContactButtons` (ปุ่ม LINE/FB ใน header + tagline ใต้โลโก้ + แถบประกาศดำเหนือ header + drawer มือถือ), container 1100px
- [x] **Flag ใหม่ `online_ordering`** (default เปิด — ร้านเดิมไม่กระทบ): ปิดแล้ว = ตะกร้า/track/PromptPay หายทั้งเว็บ, แถบ disclaimer "ไม่สามารถสั่งซื้อได้", หน้าสินค้าเป็นปุ่มแชท, ปุ่มการ์ด "ดูรายละเอียด"↔"สั่งซื้อ" ตาม §3.1 (ดู DECISIONS)
- [x] **ร้านเดโม่ `simplewear`** (.tmp-t1-seed.mjs รันซ้ำได้): แพลน p1-start active 1 ปี + override ปิด online_ordering, สินค้า 8 ชิ้น (รูป pool t2 อัป R2 จริง), เพจ about/contact ใน nav, `__content` ครบ (hero/contact/featureList/disclaimer/tagline)
- [x] **Loop วิจารณ์ 3 รอบ** (390/768/1440 — `.tmp-t1/r1-r3/`): r1 พบแถบ utility เดิมโผล่+ข้อความ PromptPay ขัดโหมดแชท/แถบประกาศดำอยู่ผิดที่/footer มี track/รูป flat-05 เห็นแต่ไม้แขวน → r2 แก้ครบ เหลือรูปเบลอ 1 ใบ + DoD ต้องมี drawer → r3 ผ่าน (สลับรูป model-05, drawer มือถือทำงาน)
- [x] **DoD §6 ครบ**: องค์ประกอบ ref เหลือศูนย์/มีเหตุผล (การ์ดขาวแทนดำ — ข้อจำกัด pool, ไอคอน LINE วาดเอง — ไม่มี asset โลโก้ทางการ) / anatomy การ์ดตาม tier / มือถือ 2 คอลัมน์+hero หัวไม่ขาด+drawer / **Lighthouse mobile (prod build): Performance 91, CLS 0** / grep hex ใน components/storefront = 0 / build ผ่าน
- เดโม่: `http://simplewear.localhost:3000` — เหลือ T3/T4

## Done (Phase 7 ต่อ — เทมเพลต T3 "HUB", 2026-07-11)
- [x] **ธีม `t3-hub`** (tier 2, ตาม ref: FASHION HUB — marketplace): hero `carousel` (3 สไลด์ ลูกศร+จุด auto 5s หยุดเมื่อ hover + scrim ขาวฝั่งข้อความ), การ์ด `hub` anatomy เต็ม §0.4 (badge -X%/NEW/BEST → รูป 3:4 hover สลับ → จุดสี → ชื่อ → ราคา sale แดง+ขีดฆ่า → ดาว+รีวิว → ชิปไซส์ → สต๊อก พร้อมส่ง/เหลือ X ชิ้น), section ใหม่ `categoryCircles` (10 วงเลื่อนได้) / `homeCatalog` (sidebar+grid บนหน้าแรก) / `memberBenefits` (3 ช่อง) / `featuredScroller` / `articles` (3 ใบมีวันที่ ลิงก์เพจจริง) / `serviceBand` (8 ไอคอน), layout `memberBar`+`catalogSidebar`+`footerPayments`, container 1360px, token ใหม่ `--color-badge-best` (#8b6f47 ตาม §2)
- [x] **ข้อมูล sale/NEW/BEST เป็นของจริงจาก DB ไม่มีคอลัมน์ใหม่**: ลดราคา = `price_override < base_price` (คำนวณ % ใน toCard + ขีดฆ่าบนหน้าสินค้า), NEW = `created_at` ≤ 14 วัน, BEST = รีวิวจริง ≥ 15, สต๊อกจาก variants — แอดมินตั้งจากหลังร้านได้เลย
- [x] **หน้า /products แบบ marketplace** (flag `layout.catalogSidebar` — ธีมอื่นไม่กระทบ): sidebar ฟิลเตอร์ทำงานจริงฝั่ง server ทุกตัว — checkbox หลายหมวด (`?category=id1,id2` → `.in()`), ค้นหา, slider ราคา + ปุ่ม 4 ช่วง (`price_min/price_max`), จุดสี, ชิปไซส์ (เรียง S M L XL — แก้ sort ตัวอักษร), checkbox พร้อมส่ง (`instock=1` → `.gt(stock,0)`) + grid 5 คอลัมน์ + drawer ฟิลเตอร์บนมือถือ — ทดสอบจริง `?instock=1&price_max=500` ได้ 8/15 ถูกต้อง
- [x] **ร้านเดโม่ `fashionhub`** (.tmp-t3-seed.mjs รันซ้ำได้): แพลน p3-business active 1 ปี, 15 สินค้า (3×5 พอดี — 5 ตัว sale จริง, 3 ตัว NEW, 2 ตัว low stock, 1 ตัวหมด, รูปตรวจกับตาแล้วทุกใบผ่าน R2 จริง), รีวิว 143 รายการ, เพจ 5 หน้า (about/contact + บทความ 3), admin user `fashionhub-owner@shopdash.local` / `Fashionhub!2026`
- [x] **Loop วิจารณ์ 3 รอบ** (390/768/1440 — `.tmp-t3/r1-r3/`): r1 พบรูปไม่ตรงชื่อ 4 ตัว (เดา model-08..14 ผิด — เปิดรูปดูแล้ว remap+เปลี่ยนชื่อสินค้า, เลิกใช้ model-09/10/14 โทนหลุด)/ไซส์เรียงผิด/hero ทับตัวแบบ/ปุ่มตัวกรองหลุดบนหน้าแรก → r2 แก้ครบ → r3 เพิ่มขีดฆ่าราคาเดิม+% บนหน้าสินค้า, ยืนยัน carousel สไลด์ 2-3 + drawer เมนู/ฟิลเตอร์มือถือ
- [x] **DoD §6**: องค์ประกอบ ref ครบ (ยกเว้นบันทึกไว้: ช่องค้นแบรนด์→ค้นหาชื่อสินค้าเพราะไม่มี entity แบรนด์, member bar/ผ่อน 0% เป็นเนื้อหาโชว์ — ดู DECISIONS) / anatomy การ์ดครบ tier / มือถือ 2 คอลัมน์+hero หัวไม่ขาด (object-[70%_20%])+drawer / grep hex components/storefront = 0 / tsc+build ผ่าน / **CLS = 0 ทุกรอบวัด**
- [x] **DoD §6.6 Lighthouse ≥85 — ผ่านแล้ว (วัดซ้ำ 2026-07-12 ตอนเครื่องว่าง)**: **fashionhub 89-90** (2 รอบ, prod build, mobile) — FCP 2.0-2.1s / LCP 3.3-3.5s / TBT 40-80ms / CLS 0; control simplewear ได้ 93-95 ยืนยันเครื่องพร้อม (optimize ที่ทำไว้ 2026-07-11: carousel mount รูปเฉพาะสไลด์ที่แสดง, รูป hover ไม่โหลดบนจอสัมผัส)
- เดโม่: `http://fashionhub.localhost:3000` — เหลือ T4

## Done (Phase 7 ต่อ — ปุ่มโซเชียลใช้จริง + แก้ cache invalidation, 2026-07-11 ตามรายงานเจ้าของ)
- [x] **ปุ่มวงกลมโซเชียลใน footer เป็นลิงก์จริง** (เดิมเป็น span ตกแต่ง — เจ้าของรายงาน): แสดงเฉพาะช่องที่ตั้งค่า, รองรับ footer ทุกแบบ (full T2/T3 + simple T1 + dark T4)
- [x] **การ์ด "โซเชียลของร้าน" ใน /admin/settings** (เฉพาะเจ้าของร้าน): 5 ช่อง URL (Facebook/Instagram/LINE/TikTok/YouTube) → เก็บใน `theme_overrides.__content.socials` (jsonb เดิม — ไม่ต้อง migration)
- [x] **แก้บั๊กแฝงทั้งแพลตฟอร์ม: ตั้งค่าร้านสะท้อนหน้าร้านทันที** — LRU cache ของ tenant ย้ายไป globalThis: Next.js แยก module instance ต่อ route bundle ทำให้ `invalidateTenantCache` จาก server action (bundle admin) ล้างไม่ถึง Map ของ bundle storefront → ทุกการตั้งค่าเดิมค้างถึง 60 วิ (พฤติกรรม "≤60s" ที่บันทึกไว้ตอน e2e Phase 6 คืออาการของบั๊กนี้) — พิสูจน์ด้วยเทสต์ poll: ก่อนแก้ค่าใหม่โผล่ที่ ~45 วิ / หลังแก้ทันที
- [x] e2e 10/10 (`.tmp-socials-test.mjs`): footer 3 ร้านลิงก์ครบ (5/5/3 ปุ่ม), แก้จาก Dashboard → หน้าร้านเปลี่ยนทันที, คืนค่า — commit `02d97f4`

## Done (Phase 7 จบ — เทมเพลต T4 "LUXÉ", 2026-07-11)
- [x] **ธีม `t4-luxe`** (tier 3, ตาม ref: LUXÉ + BRAND.CO): เปลี่ยนบุคลิกเป็น serif — ฟอนต์ใหม่ 2 ตัวในระบบ (`Noto Serif Thai` + `Cormorant Garamond` เป็นชุดหัวเรื่องเดียว Latin นำไทยตาม), hero `luxe` (แผง ink เต็มกว้าง + "Timeless Elegance" serif 64px ขาว + ปุ่มขาว/ปุ่มลิงก์ + portrait โทนเข้มกลืนพื้นด้วย gradient), การ์ด `luxe` (รูป 3:4 + จุดสี + ชื่อ + ราคา — **ไม่มีดาว/badge ตาม §5.6**), USP `tone=band` พื้นเทาอ่อน, section ใหม่ `lookbookSplit` (ภาพ+ข้อความทับ / Brand Story พื้น ink) + `highlights` (4 ไอคอนเส้นบาง) + `luxePerks` (Size Guide / โค้ดลูกค้าใหม่ / newsletter) + `trustBar` (payment+SSL+ลูกค้า 50,000+), **footer `dark`** ("ทำไมต้องเลือก" 7 ไอคอน + คอลัมน์ + social), radius 2/4/8 เหลี่ยมคม, จังหวะ section 96px, text-scale 1.05
- [x] **Flag ใหม่ใน ThemeLayout**: `mobileDrawer` (บังคับเมนู drawer โดยไม่ต้องเป็นโหมด commerce — DoD §6.5) + `logoWide` (โลโก้ตัวโปร่ง tracking 0.3em ตาม §3.4) — ธีมเดิมทุกตัวพฤติกรรมเดิมเป๊ะ (regression ผ่านทุกร้าน)
- [x] **ร้านเดโม่ `luxe`** (.tmp-t4-seed.mjs รันซ้ำได้): แพลน p4-premium, 8 สินค้าราคาพรีเมียม 1,290–5,990 (รูป subset โทน editorial: model-09/10/11/12/14 ที่ T3 ไม่ใช้เพราะโทน moody — เข้าบุคลิก luxury พอดี), **โค้ด WELCOME10 เป็นของจริงในตาราง discount_codes** (percent 10, ขั้นต่ำ 1,000 — ทดสอบผ่าน API ลดจริง ฿329), เพจ about/size-guide/contact, admin `luxe-owner@shopdash.local` / `Luxe!2026`
- [x] **Loop วิจารณ์ 3 รอบ** (390/768/1440 — `.tmp-t4/r1-r3/`): r1 พบเมนูมือถือไม่เป็น drawer + โลโก้ header ไม่โปร่ง → r2 แก้ครบ → r3 ผ่าน + regression ทุกร้าน ALL PASS (รวม drawer ธีมเดิม + โค้ดมั่วถูกปฏิเสธ)
- [x] **DoD §6**: องค์ประกอบ ref ครบ (diff บันทึก: hero ใช้แผง ink + portrait เพราะ pool ไม่มีภาพ landscape โทนเข้ม ≥1800px, "ลูกค้า 50,000+" เป็น copy เดโม่แก้ได้ใน __content) / ไม่มีดาว/badge บนการ์ดตามบุคลิก / มือถือ 2 คอลัมน์ + hero หัวไม่ขาด + drawer / grep hex = 0 / build+tsc ผ่าน / **CLS = 0**
- [x] **DoD §6.6 Lighthouse ≥85 — ผ่านแล้ว (วัดซ้ำ 2026-07-12 ตอนเครื่องว่าง)**: **luxe 89-91** (2 รอบ, prod build, mobile) — FCP 2.3s / LCP 3.1-3.3s / TBT 20-40ms / CLS 0 — ตรงคาด (คลาสเดียวกับ control T1)
- เดโม่: `http://luxe.localhost:3000` — **ครบทั้ง 4 เทมเพลต Commerce Premium** 🎉

## Done (Phase 7 ปิดท้าย — Lighthouse T3/T4 ผ่าน + รองรับสินค้ากลุ่มอื่น (ของเล่น/แม่และเด็ก), 2026-07-12)
- [x] **Lighthouse DoD §6.6 ปิดครบ**: เครื่องว่าง (พอร์ต 3100/3002 ไม่มีอะไรรัน) → prod build → **T3 fashionhub 89-90 / T4 luxe 89-91 / control simplewear 93-95** — CLS 0 ทุกรอบ ✅ **Phase 7 ผ่าน DoD ครบทุกเทมเพลตทุกข้อ**
- [x] commit บรรทัดตกหล่น `whyUsTitle` ใน storefront layout (ชิ้นส่วน T4 — footer luxe หัวข้อ custom แสดงถูก)
- [x] **Variant labels ต่อร้าน** (ตามคำสั่งเจ้าของ: เทมเพลต+Dashboard ต้องรับ ของเล่น/ของใช้แม่และเด็ก): ร้านเปลี่ยนป้าย "ไซส์/สี" เป็นคำของหมวดตัวเอง (ช่วงวัย/แบบ ฯลฯ) จากการ์ดใหม่ใน `/admin/settings` (ปุ่มลัด 4 หมวด + กรอกเอง, เฉพาะ owner) — เก็บ `__content.variantLabels` แบบเดียว socials ไม่ต้อง migration, ค่า variant อยู่คอลัมน์ size/color เดิม (ดู DECISIONS)
- [x] ป้ายมีผลทุกจุด: storefront ผ่าน `VariantLabelsProvider` (FilterBar "ทุกช่วงวัย", CatalogSidebar T3, QuickView T2, VariantSelector หน้าสินค้า + ข้อความ "กรุณาเลือกช่วงวัยและแบบ") / แถบ copy FeatureBand・ServiceBand・ContactCtaBand รับ prop / admin variant matrix (หัวข้อ+label+placeholder ตามหมวด)
- [x] **มิติที่ไม่ใช่สีจริง render ฉลาดขึ้น**: `isKnownColor()` — จุดสีบนการ์ดแสดงเฉพาะชื่อสีที่วาดได้ (หมี/กระต่าย = จุดเทาซ้ำ → ไม่แสดง), ตัวเลือกใน QuickView/sidebar สลับเป็นชิปข้อความ + เรียงค่านอกตาราง SIZE_ORDER แบบ numeric-aware ("0-1 ปี" < "1-3 ปี")
- [x] **แก้บั๊กแฝง: สลับธีม/ปรับแต่งสี/รีเซ็ตธีม ล้าง `__content` ทิ้ง** — socials (02d97f4) + เนื้อหาเทมเพลต T1-T4 + variantLabels หายเงียบๆ ถ้าร้านสลับธีม → `contentToKeep()` เก็บ __content ไว้ทั้ง 3 action (ดู DECISIONS)
- [x] **e2e ผ่าน 21/21** (`.tmp-labels-test.mjs` — ไม่ commit): ตั้งป้ายผ่าน UI จริง → admin/หน้าร้าน/ตัวกรอง (กรอง "2-4 ปี" เจอจิ๊กซอว์ ไม่เจอตุ๊กตา)/หน้าสินค้า/เลือกซื้อได้ปกติ + สลับธีมไปกลับ labels รอด + regression ร้าน demo ยังเป็นไซส์/สี + ร้านเทมเพลตทั้ง 4 HTTP 200
- [x] ร้านทดสอบ: **shop2 = ร้านของเล่นเดโม่** (ธีมพาสเทล basic-02 + labels ช่วงวัย/แบบ + หมวด "ของเล่นเด็ก" + ตุ๊กตา 4 variants/จิ๊กซอว์ 2 variants จาก `.tmp-labels-seed.mjs` รันซ้ำได้) — เก็บไว้ดูฟีเจอร์นี้ได้เลยที่ `shop2.localhost:3000`
- [x] `npx tsc --noEmit` + `npm run build` ผ่าน

## Done (Phase 7 ต่อ — หน้า "เนื้อหาเว็บ": CMS เทมเพลต T1-T4 ใน Dashboard, 2026-07-12 ตามคำสั่งเจ้าของ)
- [x] **`/admin/content` เมนูใหม่ "เนื้อหาเว็บ"** (กลุ่มหน้าร้าน): ร้านแก้ข้อความ+รูปประกอบของเทมเพลตเองได้ครบ — hero/สไลด์ carousel/แถบ USP/utility bar/แบนเนอร์หมวด/ช่องทางแชท T1/featureList/วงกลมหมวด T3/แถบสมาชิก/บทความ/Lookbook+Brand Story T4/ไฮไลต์/perks(โค้ดต้อนรับ)/trust/หัวข้อ footer/newsletter
- [x] **สถาปัตยกรรม schema-driven** (`lib/content-schema.ts` 21 กลุ่ม + `content-form.tsx` ฟอร์ม generic ตัวเดียว): แต่ละกลุ่มมี `appliesTo(preset)` → โชว์เฉพาะที่ธีมปัจจุบันใช้ (T2 เห็น 6 กลุ่ม, T4 เห็น 8, ธีม basic เห็น empty state ชี้ไปตั้งค่าร้าน) — ไม่มีฟอร์มเฉพาะธีม ธีมใหม่เพิ่มแค่ schema (ดู DECISIONS)
- [x] server action validate ตาม schema (icon whitelist / href / รูปต้องจาก R2 หรือ path ภายใน / ค่าว่าง = กลับ default ธีม) + merge __content แบบเดียว socials — สิทธิ์ owner+staff
- [x] **อัปโหลดรูปเนื้อหา**: kind ใหม่ `content_image` → `branding/{tenant}/content/{uuid}.webp` (webp ≤1600px ฝั่ง client เหมือนรูปสินค้า) + preview/เปลี่ยน/ลบในฟอร์ม
- [x] **e2e ผ่าน 20/20 + อัปโหลดรูป 4/4** (`.tmp-content-test.mjs` prod build + `.tmp-content-image-test.mjs` dev): T2 กลุ่มครบ+ไม่มีกลุ่มธีมอื่น / แก้ hero headline + เพิ่ม USP ผ่าน UI → หน้าร้านเปลี่ยนทันที / T4 กลุ่มครบ+ค่า seed preload / รูปอัปจริง→DB→เสิร์ฟ 200 — backup/restore __content ร้านเดโม่ครบ
- [x] `tsc --noEmit` + `npm run build` ผ่าน / screenshot `.tmp-shots/content/`
- [x] **แก้ R2 CORS แล้ว (เจ้าของทำผ่าน Cloudflare Dashboard โดยตรง, 2026-07-12)**: เพิ่ม origin `http://localhost:3000` + `http://*.localhost:3000` ใน bucket `shopdash-prod` — R2 API token ที่แอปใช้มีสิทธิ์แค่ Object Read/Write เขียน CORS (bucket-level) ไม่ได้ (`AccessDenied` ตอนลองรัน `.tmp-r2-cors.mjs`) จึงทำผ่านหน้าเว็บแทน (ไม่ต้องยกระดับสิทธิ์ token) — **ยืนยันด้วย e2e จริงที่ `wearstore.localhost:3000` (`.tmp-cors-verify.mjs` 4/4): อัปโหลดรูปจาก subdomain สำเร็จ ไม่มี CORS error, บันทึกลง DB, รูปเสิร์ฟ 200**

## Done (Phase 7 ต่อ — ตัวเลือกจุดเริ่มต้นร้านตอน signup, 2026-07-16)
- [x] การ์ดเลือก 2 แบบพร้อมรูปเทียบ (screenshot ร้านเดโม่จริง vs wireframe ร้านว่างที่สร้างใหม่) — default "พร้อมตัวอย่าง (แนะนำ)", เลือกประเภทร้านโชว์เฉพาะโหมดตัวอย่าง
- [x] `startMode` ผ่าน API → provisionTenant ข้าม seed เมื่อเลือกว่าง (log แยกจากเคส seed พลาด) — ร้านว่างเติมทีหลังได้ที่เมนู "เนื้อหาเว็บ"
- [x] tsc + build ผ่าน — **เจ้าของทดสอบ: เปิด shopdashth.com/signup เห็นการ์ด 2 ใบ, ลอง signup ทั้งสองโหมด**

## Done (Phase 7 ต่อ — พักชุดแท็กซี่/ช่าง + เปิดใช้ pack ของเล่น, 2026-07-16 ตามคำสั่งเจ้าของ)
- [x] **ถอดชุดธุรกิจบริการออกจากหน้าบ้านทั้งหมด** (เก็บโค้ดไว้): pack แอร์/ช่าง/รถ ออกจาก registry + `supabase/migrations/015_remove_service_themes.sql` ถอนธีม S1-S3 (**รอรันใน SQL Editor — รันได้ปลอดภัยแม้ยังไม่เคยรัน 014**)
- [x] **pack "ของเล่น / แม่และเด็ก" ใช้งานได้จริงแล้ว**: รูป flat illustration พาสเทล 12 ไฟล์ generate จาก `scripts/gen-service-images.mjs` → `public/demo/toys/*.webp` — ตัวเลือกโผล่หน้า signup อัตโนมัติ (asset ครบ), เปลี่ยนเป็นรูปถ่ายจริงชื่อเดิมทับได้ทุกเมื่อ
- [x] `tsc` + `npm run build` ผ่าน — **ทดสอบ: รัน 015 → หน้า signup เหลือตัวเลือก เสื้อผ้า/ของเล่น → signup เลือกของเล่น ได้ร้านเด็กพาสเทลครบ**

## Done (Phase 7 ต่อ — เทมเพลตธุรกิจบริการรถ 3 ตัว S1/S2/S3, 2026-07-16 ตามคำสั่งเจ้าของ "ให้ได้ตามรูป")
- [x] section กลางใหม่ 6 ตัว (ServiceHero+InquiryPanel แผงจองเปิด LINE/โทร, ServiceCards, VehicleCards, RouteCards, TestimonialsBand, FaqList) + ต่อเข้า composition หน้าแรก — content-driven ทั้งหมด แก้ผ่าน __content
- [x] preset `s1-premier` (กรมท่า-ทอง serif) / `s2-travel` (ฟ้า-ขาว) / `s3-taxi` (น้ำเงินแท็กซี่) + รูป flat illustration (hero/รถ/เส้นทาง) จาก `scripts/gen-service-images.mjs`
- [x] หน้า preview ธีมแบบ mock ไม่แตะ DB: `/theme-preview/{code}` (gate ด้วย env `THEME_PREVIEW=1` — production 404) + middleware bypass — **screenshot ทั้ง 3 ตัวส่งให้เจ้าของดูแล้ว ใกล้ ref มาก**
- [x] migration 014 ลง theme_registry (**รอเจ้าของรันใน SQL Editor**) + pack "รถยก-แท็กซี่" ผูกธีม s3-taxi ตอน signup (guard tier ตามแพลน) + เนื้อหาเทมเพลตแท็กซี่ครบใน pack
- [x] แก้เนื้อหาได้จาก /admin/content: กลุ่มใหม่ แผงจอง/หัวข้อ section/การ์ดรถ/เส้นทาง/รีวิว/FAQ + field type 'number' (ราคาเริ่มต้น)
- [x] `tsc` + `npm run build` ผ่าน / screenshot ทั้ง 3 ธีมเทียบ ref ส่งเจ้าของแล้ว (เจ้าของสั่งไปต่อ) — **ทดสอบจริง: รัน migration 014 → signup pack รถยก-แท็กซี่ → ได้เว็บธีมแท็กซี่พร้อมแผงจอง / ร้านเดิมเลือก 3 ธีมใหม่ได้จากเมนูธีมร้าน**

## Done (Phase 7 ต่อ — starter packs ธุรกิจบริการ 3 ชุด, 2026-07-16)
- [x] pack `aircon` / `handyman` / `transport` (บริการ 6 รายการ/pack + รีวิว + เนื้อหาครบ + เพจ how-to-book) — โหมด "แนะนำบริการ+ติดต่อผ่านแชท" ผ่าน featureOverrides ปิด online_ordering
- [x] รูป flat illustration 21 ไฟล์ generate ด้วย `scripts/gen-service-images.mjs` (commit ถาวร) → `public/demo/services/*` — pack โผล่หน้า signup ทันที (asset ครบ)
- [x] แดชบอร์ดรู้จักโหมดแชท: ไม่เตือนแดง PromptPay + checklist สลับเป็นตั้งช่องทาง LINE/โซเชียล
- [x] tsc + build ผ่าน — **เจ้าของทดสอบ: signup เลือก "ล้าง-ติดตั้งแอร์" → ได้เว็บบริการโหมดแชท ไม่มีตะกร้า**

## ค้าง / ขั้นตอนถัดไป
- [ ] **รัน migration 012 + 013 ใน Supabase SQL Editor** (012 = starter store + ธีม T1-T4 เข้า registry, 013 = LINE token แพลตฟอร์ม)
- [ ] ตั้งค่าใน Dashboard: UptimeRobot 2 monitors (DEPLOYMENT §8.1) / Upstash env / LINE token ที่ Super Admin → ตั้งค่า
- [ ] กู้สคริปต์ .tmp จากเครื่องเจ้าของเข้า `scripts/` ตาม `scripts/README.md`
- [ ] หารูป pack ของเล่น 12 ไฟล์ตาม `public/demo/toys/README.md` → ตัวเลือกประเภทร้านเปิดเอง
- [ ] Slip Verify provider จริง (ยืนยันเงินเข้า — จุดขาย P4) — **สมัคร SlipOK/EasySlip เมื่อมีลูกค้า P4 รายแรก** ตามที่ตกลง 2026-07-10 (qr_payload ที่เก็บแล้วส่งให้ provider ได้เลย ประหยัดกว่าส่งรูป)
- [ ] Production hardening ที่เหลือ = ค่าจริงบน Vercel/Supabase/R2 ตาม DEPLOYMENT.md §0–§5 (ทำตอนจะ deploy จริง)
- [ ] (ไอเดียต่อยอด variant labels ถ้าเจ้าของต้องการ) รูปเดโม่หมวดของเล่น/แม่และเด็ก + preset ธีมโทนเด็ก — โครงสร้างรองรับแล้ว เหลือแค่ asset

## Done (Phase 5) — `pnpm build` ผ่าน, migration 005/006 apply แล้ว, DoD ครบ
- [x] 5.1 `supabase/migrations/005_analytics.sql`: RPC `store_daily_sales`/`store_weekly_sales`/`store_top_products`/`store_sales_summary`/`store_order_status_counts` + `platform_summary`/`platform_new_stores` (นับเฉพาะ confirmed/packing/shipped, วันตัดยอดเวลาไทย §7.6, revoke จาก anon/authenticated) + index `orders_tenant_status_created_idx` — **apply แล้ว 2026-07-09**
- [x] 5.2 แดชบอร์ด Store Admin `/admin/dashboard`: การ์ดยอดขาย/ออร์เดอร์, ออร์เดอร์ค้างต่อสถานะ (ลิงก์ `/admin/orders?status=`), สต๊อกใกล้หมด (ทุกแพลน) + กราฟเส้นรายวัน/แท่งรายสัปดาห์ (Recharts) + top 10 สินค้าขายดี (gate `analytics_dashboard`) — เมนู nav + redirect หน้าแรกหลัง login
- [x] 5.3 แดชบอร์ดแพลตฟอร์ม `/dashboard` (super admin): MRR/ARR, ร้านแต่ละสถานะ, churn 30 วัน, กราฟร้านใหม่ต่อเดือน 12 เดือน, ตารางร้านใกล้หมดอายุ 30 วัน — เมนู nav + redirect index
- [x] 5.4 ค้นหาสินค้า: `supabase/migrations/006_search.sql` (pg_trgm + gin index) — **apply แล้ว 2026-07-09** — เสียบ `?q=` ใน `lib/catalog.ts` (ilike sanitize wildcard) + ช่องค้นหาใน `FilterBar` + หัวข้อ "ผลการค้นหา" ในหน้า /products
- [x] 5.5 Polish: error boundary (`app/error.tsx`, `global-error.tsx`, ต่อ segment storefront/admin/super-admin), `not-found` (แอป + storefront), loading skeleton (2 แดชบอร์ด), SEO `generateMetadata` ต่อร้าน (layout) + ต่อสินค้า (title/OG), `sitemap.ts` + `robots.ts` ต่อ tenant — ข้อความไทยทุกจุด
- [x] Recharts 3.9.2 ติดตั้งแล้ว, `lib/analytics.ts` (typed RPC wrappers), `scripts/seed-load.ts` (10k orders + `--clean`)

## DoD checklist (Phase 5) — ผ่านครบ 2026-07-09
- [x] 1. ตัวเลข RPC ตรงกับนับมืออิสระ (`.tmp-phase5-test.mjs` ผ่าน 14/14): revenue/order_count/avg ตรง, ผลรวมรายวัน=summary, ตัด cancelled/ยังไม่ยืนยันออกครบ
- [x] 2. query 10k orders < 1s — seed 10,006 ออร์เดอร์: `store_daily_sales` 176ms, `store_top_products` 161ms (ล้าง PERF ด้วย `seed-load.ts --clean` แล้ว demo กลับ 6 ออร์เดอร์)
- [x] 3. ค้นหาไทยบางส่วน "เสื้อยื" → "เสื้อยืดทดสอบ" — ยิงผ่าน HTTP จริง (`/products?q=เสื้อยื`)
- [x] 4. Lighthouse หน้าแรก storefront mobile = **95** (≥80) — FCP 0.9s / LCP 2.7s / TBT 130ms / CLS 0; ทุกรูปผ่าน next/image + R2
- [x] 5. ไม่มีหน้าไหนโชว์ raw error/stack — error boundary + not-found ภาษาไทยครบทุก surface (ทดสอบ 404 → "ไม่พบสินค้า")
- **Phase 5 ผ่าน DoD ครบ 5 ข้อ — tag `phase-5-done`** (2026-07-09)

## หมายเหตุ Phase 5
- test DoD 1–2: `.tmp-phase5-test.mjs` (ไม่ commit — ต้อง seed ก่อนด้วย `node --experimental-strip-types scripts/seed-load.ts`)
- บทเรียน: PostgREST `.range()` pagination ต้องมี `.order(unique)` เสมอ ไม่งั้นลำดับไม่คงที่ (แถวซ้ำ/ข้าม) — เจอตอนเขียน test นับ expected
- Lighthouse วัดผ่าน prod build (`pnpm start`) + chromium ของ Playwright ยิง `demo.localhost:3000` (prod ไม่ map `localhost` เปล่าเป็น demo)

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

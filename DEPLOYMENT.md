# DEPLOYMENT — Production Checklist (ShopDash)

> เช็คลิสต์ก่อน go-live ของ ShopDash (Next.js 15 + Supabase + R2 + Vercel)
> จัดลำดับตามความเสี่ยง — **§0 คือจุดที่พลาดแล้วเสียเงิน/ข้อมูล/ความปลอดภัยจริง** ทำก่อน
> อ้างอิงไฟล์จริงในรีโปทุกข้อ ไม่ใช่คำแนะนำทั่วไป

---

## §0. ⛔ Critical — พลาดแล้วเจ็บ (ทำก่อนเปิดจริง)

- [ ] **`SLIP_VERIFY_MOCK_MODE` ต้องไม่ใช่ `pass` ใน production**
  `.env.example` ตั้ง `SLIP_VERIFY_PROVIDER=mock` + `SLIP_VERIFY_MOCK_MODE=pass` ไว้ ถ้ายกค่านี้ขึ้น prod → ร้าน **Premium** ที่เปิดฟีเจอร์ตรวจสลิปอัตโนมัติจะ **auto-approve ทุกสลิป** (สลิปปลอมก็ผ่าน = เสียเงินจริง) ยังไม่มี provider จริง (`lib/slip-verify/index.ts` fallback เป็น mock เสมอ) → ก่อนมี provider จริง ให้ตั้ง **`SLIP_VERIFY_MOCK_MODE=amount_mismatch`** (บังคับทุกสลิปตกคิว manual — ปลอดภัย) **หรือ** อย่าเปิด flag `slip_verify_api` ให้ tenant ใด
- [ ] **`DOMAIN_VERIFY_MOCK` ต้อง "ไม่ถูกตั้ง" ใน production**
  `lib/domains.ts:116` — ถ้า `DOMAIN_VERIFY_MOCK=pass` ระบบจะผ่านการ verify custom domain โดยไม่เช็ค DNS จริง (test hook) ไม่มีใน `.env.example` อยู่แล้ว แค่ห้ามเผลอ set บน Vercel
- [ ] **เปลี่ยนรหัสผ่าน super admin** จากค่า dev `superadmin@shopdash.local / SuperAdmin!2026` (ดู STATUS.md Blockers) — ตั้งบัญชี super admin ด้วยอีเมลจริง + รหัสแข็ง แล้ว disable/ลบบัญชี dev
- [ ] **`PLATFORM_PROMPTPAY_ID` เป็น PromptPay จริงของแพลตฟอร์ม** (ตอนนี้ placeholder `0812345678`) — ถ้าผิด เงินค่าแพลนจากร้านค้าจะเข้าบัญชีผิด (regex ยอมรับเบอร์ 10 หลัก / บัตร ปชช. 13 หลัก) + ตั้ง `PLATFORM_PROMPTPAY_NAME` ให้ตรงชื่อบัญชี
- [ ] **`SUPABASE_SERVICE_ROLE_KEY` / `R2_SECRET_ACCESS_KEY` ตั้งเป็น Server-only บน Vercel** (ห้ามมี prefix `NEXT_PUBLIC_`, ห้ามหลุด client) — service role ข้าม RLS ทั้งหมด
- [ ] **ลบ debug log** `app/admin/(dashboard)/layout.tsx:25` `console.log('[DEBUG guard-fail]', …)` — log slug/host/สถานะ cookie ทุกครั้งที่ guard ร้านล้มเหลว (noise + ข้อมูลภายในใน log)

---

## §1. Infrastructure & DNS (Vercel)

- [ ] เชื่อมโปรเจ็คกับ Vercel, ตั้ง production branch
- [ ] **Wildcard domain** `*.shopdash.co` → Vercel (subdomain ร้านทุกร้าน) — Vercel ต้องรองรับ wildcard (ต้องใช้ Vercel DNS หรือ verify wildcard)
- [ ] `admin.shopdash.co` → super admin (middleware map ไว้แล้ว `middleware.ts:55`)
- [ ] apex `shopdash.co` + `www.shopdash.co` → platform landing/signup (`middleware.ts:59`)
- [ ] `cname.shopdash.co` → ปลายทางสำหรับ custom domain ของร้าน (ที่เอกสาร DNS ในหน้า `/admin/domain` แนะนำลูกค้า) ตั้งให้ resolve จริง
- [ ] SSL: wildcard + apex + custom domains ออก cert อัตโนมัติ (Vercel) — custom domain ของร้านต้อง add เข้า Vercel ด้วย (ปัจจุบัน verify DNS ในแอป แต่การ provision cert เป็นงาน platform — ตรวจ flow นี้กับโดเมนจริง 1 อัน)
- [ ] `ROOT_DOMAIN=shopdash.co` ตรงกับโดเมนจริง

---

## §2. Environment variables (ตั้งครบบน Vercel → Production)

ครบตามที่โค้ดอ่านจริง (`grep process.env`) — `.env.example` เป็น template:

| ตัวแปร | ใช้ที่ | หมายเหตุ prod |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ทุก client | โปรเจ็ค prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client/anon | RLS คุมสิทธิ์จริง |
| `SUPABASE_SERVICE_ROLE_KEY` | server เท่านั้น | **secret** ข้าม RLS |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | `lib/r2.ts` | token แบบ Object Read & Write |
| `R2_BUCKET` | `lib/r2.ts` | `shopdash-prod` |
| `R2_PUBLIC_BASE_URL` | `lib/r2.ts` + `next.config.ts` | **ถ้าว่าง → next/image remotePattern ว่าง = รูปพัง** |
| `PLATFORM_PROMPTPAY_ID` / `_NAME` | `/admin/plan` | ดู §0 |
| `ROOT_DOMAIN` | middleware/domains/sitemap | `shopdash.co` |
| `CRON_SECRET` | cron routes | `openssl rand -hex 32` (ดู §5) |
| `SLIP_VERIFY_PROVIDER` | `lib/slip-verify` | `mock` จนกว่ามีจริง |
| `SLIP_VERIFY_MOCK_MODE` | mock verifier | **`amount_mismatch`** ใน prod (ดู §0) |
| `DOMAIN_VERIFY_MOCK` | `lib/domains.ts` | **ห้ามตั้ง** (ดู §0) |

- [ ] ตั้งครบทุกตัว scope = Production (แยกจาก Preview ถ้าต้องการ)
- [ ] ตรวจว่าไม่มี secret ตัวไหนติด prefix `NEXT_PUBLIC_`

---

## §3. Database (Supabase)

> ถ้า prod ใช้ **โปรเจ็คเดียวกับที่พัฒนา** (`ebmwjfpprtzutpuvhhlb`) migration 001–006 apply แล้ว
> ถ้าเปิด **โปรเจ็ค Supabase ใหม่สำหรับ prod** ต้องทำใหม่ทั้งหมดด้านล่าง

- [ ] รัน migration ตามลำดับ `001_init` → `002_rls` → `003_phase3` → `004_phase4` → `005_analytics` → `006_search` (SQL Editor)
- [ ] `supabase/seed.sql` — 3 แพลน (starter/pro/premium) + demo tenant/store + theme basic-01 (ปรับ/ลบ demo tenant ถ้าไม่ต้องการใน prod)
- [ ] `theme_registry` ครบ 10 ธีม (มากับ `004_phase4.sql`)
- [ ] สร้าง super admin จริง (`scripts/setup-super-admin.mjs` แก้อีเมล/รหัสก่อน หรือทำผ่าน Dashboard + set `app_metadata.role=super_admin`)
- [ ] **ยืนยัน RLS**: `node --experimental-strip-types scripts/test-isolation.ts` → ต้องผ่าน (RLS คือขอบเขตความปลอดภัยจริง §3.1)
- [ ] ลบข้อมูลทดสอบ: ออร์เดอร์ `PERF-*` (มีสคริปต์ `seed-load.ts --clean`), user ทดสอบ (`phase1-smoke-test@…`) — ถ้าใช้โปรเจ็คเดียวกับ dev
- [ ] ตั้ง backup / PITR ของ Supabase (ข้อมูลการเงิน/ออร์เดอร์)

---

## §4. Cloudflare R2

- [ ] Bucket `shopdash-prod` (หรือชื่อตาม `R2_BUCKET`) มีจริง
- [ ] **CORS**: เพิ่ม origin production (`https://*.shopdash.co` + custom domains ที่ใช้) — presigned PUT อัปโหลดจาก browser ตรงต้องผ่าน CORS (ดู STATUS.md: dev ตั้งไว้แค่ `localhost:3000`)
- [ ] Public bucket domain (หรือ CDN) → `R2_PUBLIC_BASE_URL` (ไม่มี `/` ท้าย) — ใช้เสิร์ฟรูปสินค้า/โลโก้/แบนเนอร์
- [ ] **สลิปห้ามเสิร์ฟผ่าน public domain** — เสิร์ฟผ่าน presigned GET เท่านั้น (โค้ดทำไว้แล้ว `lib/r2.ts`, path `slips/` แยก) ตรวจว่า public bucket ไม่ได้เปิด list/expose path `slips/`
- [ ] token R2 เป็น Object Read & Write เท่านั้น (least privilege)

---

## §5. Cron jobs

`vercel.json` ตั้งไว้แล้ว 2 งาน (เวลาเป็น UTC):
- `subscription-sweep` `0 18 * * *` = **01:00 เวลาไทย** (trial/subscription หมด → grace → locked → archived §7.4)
- `domain-recheck` `30 18 * * *` = 01:30 ไทย (custom domain active ที่ DNS หาย 3 วัน → error §7.5)

- [ ] ตั้ง `CRON_SECRET` บน Vercel — Vercel Cron จะแนบ `Authorization: Bearer $CRON_SECRET` อัตโนมัติ, route ตรวจเอง (`app/api/cron/*` → 401 ถ้าไม่ตรง)
- [ ] หลัง deploy: ยิง cron มือ 1 รอบ (`curl -H "Authorization: Bearer <secret>" https://<deploy>/api/cron/subscription-sweep`) ดูว่า 200 + ไม่ error
- [ ] ตรวจว่า Vercel plan รองรับ Cron (Hobby จำกัด) — ต้องใช้ Pro ขึ้นไปถ้าต้องการ daily ตรงเวลา

---

## §6. Feature caveats (ที่ยังเป็น mock/รอของจริง)

- [ ] **Slip auto-verify (Premium)**: ยังเป็น `MockSlipVerifier` — ไม่ตรวจสลิปจริง (ดู §0) เสียบ provider จริงที่ `lib/slip-verify/` ก่อนเปิดขายจุดนี้เป็นจุดขาย
- [ ] **LINE OA**: ร้านกรอก channel access token เอง — ใช้ **broadcast** (ส่งผู้ติดตามทุกคนของ OA, ดู DECISIONS.md) เตือนร้านให้ใช้ OA แยกสำหรับทีมงาน ไม่ใช่ OA ที่ลูกค้าติดตาม
- [ ] **Custom domain**: HTTPS cert เป็นข้อมูลประกอบ (เช็คด้วย HEAD ไม่ block active, DECISIONS.md) — ต้องมีขั้น add domain เข้า Vercel เพื่อออก cert จริง ตรวจ flow นี้ครบกับโดเมนทดสอบ 1 อัน

---

## §7. Pre-launch smoke test (บนโดเมนจริง)

- [ ] signup ร้านใหม่จาก `shopdash.co/signup` → เปิด `{slug}.shopdash.co/admin` ได้ทันที (trial)
- [ ] เพิ่มสินค้า + อัปรูป (ทดสอบ R2 CORS prod จริง) → เห็นรูปผ่าน next/image
- [ ] ลูกค้า checkout → **สแกน QR ด้วยแอปธนาคารจริง** ยอด+ชื่อบัญชี PromptPay ของร้านถูกต้อง → อัปสลิป → แอดมินอนุมัติ → สต๊อกตัด
- [ ] ร้านจ่ายค่าแพลน → super admin เห็นสลิปในคิว → อนุมัติ → ร้าน active
- [ ] เปิด storefront ร้าน A ด้วยเบราว์เซอร์: ไม่เห็นข้อมูลร้าน B (isolation)
- [ ] `/admin/dashboard` + super admin `/dashboard` โหลดกราฟได้ (RPC 005 ทำงานบน prod DB)
- [ ] 404 / error → ขึ้นหน้าไทย ไม่มี stack trace

---

## §8. Post-launch

- [ ] Monitoring/alert (Vercel logs + Supabase logs) — จับ error 5xx, cron fail, slip-verify warning
- [ ] ตรวจ cron ทำงานจริงวันแรก (ดู `provisioning_logs` / สถานะ tenant)
- [ ] นโยบายเก็บข้อมูล: archived ≥ 90 วันก่อนลบจริง (§7.4) — ทำเป็นงาน manual super admin
- [ ] ทบทวน rate limit / abuse ของ endpoint public (`/api/checkout`, `/api/slips`, `/api/signup`) — ยังไม่มี rate limit ในโค้ด (พิจารณา Vercel WAF / edge)

---

*หมายเหตุ: §0 ข้อ "ลบ debug log" และการปรับ `SLIP_VERIFY_MOCK_MODE` ใน `.env.example` เป็น code change — บอกได้ถ้าให้แก้ให้เลย*

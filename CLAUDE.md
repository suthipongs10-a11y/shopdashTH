# CLAUDE.md — ShopDash: Multi-Tenant E-commerce SaaS สำหรับร้านค้าไทย

> **เอกสารนี้คือ source of truth เพียงชิ้นเดียวของโปรเจ็ค** ผู้อ่าน (Claude Opus 4.8) ไม่มีบริบทอื่นใดนอกจากไฟล์นี้ ทุกการตัดสินใจทางสถาปัตยกรรมถูกตัดสินใจไว้แล้วในเอกสารนี้ — ห้ามเปลี่ยน stack, ห้ามเปลี่ยนชื่อตาราง, ห้ามข้ามเฟส

---

## §0. กฎเหล็กสำหรับ Claude ที่นำเอกสารนี้ไปสร้าง (อ่านก่อนทุกครั้ง)

1. **ทำทีละ Phase เท่านั้น** — เอกสารนี้แบ่งงานเป็น 5 Phase (§6) แต่ละเซสชันให้ทำงานภายใน Phase ปัจจุบันเท่านั้น ห้ามสร้างโค้ดของ Phase ถัดไปล่วงหน้า แม้จะ "ทำได้ง่าย" ก็ตาม เพราะจะทำให้ตรวจรับงานไม่ได้
2. **Definition of Done (DoD) คือสัญญา** — Phase จะถือว่าเสร็จเมื่อผ่าน DoD ทุกข้อของ Phase นั้น ถ้าข้อใดยังไม่ผ่าน ให้รายงานว่า "Phase X ยังไม่ผ่าน DoD ข้อ Y" ห้ามประกาศว่าเสร็จ
3. **อัปเดต STATUS.md ทุกครั้งก่อนจบเซสชัน** — ระบุ: Phase ปัจจุบัน, งานที่เสร็จ, งานค้าง, DoD ที่ผ่านแล้ว, ปัญหาที่พบ (รูปแบบอยู่ใน §8.4)
4. **ทุกตารางที่เป็นข้อมูลร้านค้าต้องมี `tenant_id` + RLS policy** — ตั้งแต่ Phase 2 เป็นต้นไป การสร้างตารางใหม่โดยไม่มี RLS = bug ระดับ critical ห้าม merge
5. **ห้ามเก็บไฟล์รูปใน Supabase** — ไฟล์จริงอยู่ Cloudflare R2 เสมอ ใน Postgres เก็บเฉพาะ key/URL (§3.9)
6. **ไม่มีระบบตัดบัตรเครดิต** — การชำระเงินฝั่งลูกค้าปลายทางมีทางเดียวคือ PromptPay QR + อัปโหลดสลิป ห้ามเสนอหรือ scaffold Stripe/Omise
7. **ภาษา:** UI ทั้งหมดเป็นภาษาไทยเป็นค่าเริ่มต้น โค้ด/ชื่อตัวแปร/commit message เป็นภาษาอังกฤษ
8. **เมื่อเจอความกำกวมที่เอกสารนี้ไม่ครอบคลุม** — เลือกทางที่ (ก) ง่ายที่สุดที่ยังปลอดภัยเรื่อง tenant isolation และ (ข) บันทึกการตัดสินใจลง `DECISIONS.md` พร้อมเหตุผล 1–2 บรรทัด

---

## §1. ภาพรวมระบบ

### 1.1 สิ่งที่กำลังสร้าง

แพลตฟอร์ม SaaS ให้ร้านค้าไทยขนาดเล็ก (เสื้อผ้า / แฟชั่น / ของเล่นเด็ก) **เช่าใช้รายปี** เพื่อเปิดร้านออนไลน์ของตัวเองบน subdomain (เช่น `baannoi.shopdash.co`) หรือ custom domain ของร้านเอง

ระบบมี 3 ผิวสัมผัส (surface):

| Surface | ผู้ใช้ | URL pattern | Auth |
|---|---|---|---|
| **Storefront** | ลูกค้าปลายทาง | `{slug}.shopdash.co` หรือ custom domain | ไม่ต้อง login (guest checkout) |
| **Store Admin** | เจ้าของร้าน (tenant) | `{slug}.shopdash.co/admin` | Supabase Auth (email+password) role=`store_owner`/`store_staff` |
| **Super Admin** | เจ้าของแพลตฟอร์ม | `admin.shopdash.co` | Supabase Auth role=`super_admin` |

### 1.2 หลักการเงิน (สำคัญ — อ่านให้เข้าใจก่อนเขียนโค้ด payment)

- เงินค่าสินค้าจากลูกค้าปลายทาง → เข้าบัญชี PromptPay **ของร้านค้าแต่ละราย** โดยตรง แพลตฟอร์มไม่แตะเงินก้อนนี้เลย (ไม่มี escrow, ไม่มี fee หักจากออร์เดอร์)
- รายได้ของแพลตฟอร์ม = ค่าเช่าแพลนรายปี ที่ร้านค้าจ่ายให้แพลตฟอร์ม (ผ่าน PromptPay ของแพลตฟอร์ม + อัปโหลดสลิป เช่นเดียวกัน)
- ผลเชิงเทคนิค: QR ต่อออร์เดอร์ต้อง generate จาก PromptPay ID **ของ tenant นั้น** (เก็บใน `stores.promptpay_id`) ไม่ใช่ค่า config กลาง

### 1.3 Tech Stack (ตัดสินใจแล้ว — ห้ามเปลี่ยน)

| ชั้น | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Framework | **Next.js 15 (App Router, TypeScript)** | โปรเจ็คเดียว (monorepo-lite) รวมทั้ง 3 surface แยกด้วย middleware routing ตาม hostname |
| Styling | **Tailwind CSS v4** + CSS custom properties | ธีมทำงานผ่าน CSS variables (§4) ห้าม hardcode สี |
| Database + Auth | **Supabase** (Postgres 15 + Supabase Auth + RLS) | ใช้ `@supabase/ssr` สำหรับ server components / route handlers |
| Object storage | **Cloudflare R2** (S3-compatible) | อัปโหลดผ่าน presigned URL, เสิร์ฟผ่าน public bucket domain หรือ custom CDN domain |
| PromptPay QR | ไลบรารี `promptpay-qr` (npm) สร้าง EMVCo payload + `qrcode` render เป็น SVG/PNG | Dynamic QR ฝังจำนวนเงิน |
| กราฟแดชบอร์ด | **Recharts** | Phase 5 เท่านั้น |
| แจ้งเตือน | **LINE Messaging API (LINE OA)** | Phase 4, feature-flagged |
| Deploy | Vercel (แนะนำ) หรือเทียบเท่าที่รองรับ wildcard domain | ต้องรองรับ `*.shopdash.co` |

### 1.4 สถาปัตยกรรม routing ตาม hostname (หัวใจของ multi-tenancy ฝั่ง frontend)

Next.js `middleware.ts` อ่าน `Host` header แล้ว rewrite:

```
admin.shopdash.co/*          → app/(super-admin)/*
{slug}.shopdash.co/admin/*   → app/(store-admin)/*   (แนบ x-tenant-slug: {slug})
{slug}.shopdash.co/*         → app/(storefront)/*    (แนบ x-tenant-slug: {slug})
customdomain.com/*           → lookup ตาราง custom_domains → ได้ slug → เหมือนบรรทัดบน
```

Pseudo-code middleware:

```ts
// middleware.ts (pseudo)
const host = req.headers.get('host')!.split(':')[0];

if (host === 'admin.shopdash.co') return rewrite('/super-admin' + path);

let slug: string | null = null;
if (host.endsWith('.shopdash.co')) {
  slug = host.replace('.shopdash.co', '');
} else {
  // custom domain — lookup แบบ cache (Vercel Edge Config หรือ in-memory TTL 60s)
  slug = await resolveCustomDomain(host); // SELECT tenant slug FROM custom_domains WHERE domain = host AND status = 'verified'
  if (!slug) return NextResponse.rewrite('/domain-not-configured');
}

const res = path.startsWith('/admin')
  ? rewrite('/store-admin' + path.slice(6))
  : rewrite('/storefront' + path);
res.headers.set('x-tenant-slug', slug);
return res;
```

Server components / route handlers ทุกตัวใน storefront และ store-admin **ต้อง** resolve `tenant_id` จาก `x-tenant-slug` ผ่าน helper กลางตัวเดียว `getTenantContext()` (§3.8) ห้าม query ตาราง tenants เองกระจัดกระจาย

---

## §2. Feature Specification (แบ่ง 4 ชั้น × MVP / v1.1 / Future)

> สัญลักษณ์เฟส: ทุกฟีเจอร์ระบุ `[P?]` = Phase ที่ต้องสร้าง (§6) — MVP ≈ Phase 1–3, v1.1 ≈ Phase 4–5, Future = ยังไม่สร้างในรอบนี้

### 2.1 Storefront (หน้าร้านสำหรับลูกค้าปลายทาง)

**MVP**
- `[P1]` หน้าแรกร้าน: แบนเนอร์ (รูปจาก R2), สินค้าแนะนำ (flag `is_featured`), หมวดหมู่
- `[P1]` แคตตาล็อกสินค้า: grid + pagination (24 ชิ้น/หน้า), เรียงตาม ใหม่สุด/ราคาต่ำ-สูง
- `[P1]` ตัวกรอง: หมวดหมู่, ไซส์, สี (อ่านจาก `product_variants` — filter ทำฝั่ง server ด้วย query param เช่น `?category=x&size=M&color=แดง`)
- `[P1]` หน้าสินค้า: แกลเลอรีรูป, เลือก variant (ไซส์/สี) แล้วราคา+สต๊อกอัปเดตตาม variant, ปุ่มหยิบใส่ตะกร้า (disabled เมื่อ variant นั้นสต๊อก 0)
- `[P1]` ตะกร้า: เก็บใน `localStorage` (key: `shopdash_cart_{tenant_slug}`) — ไม่ผูก account, แก้จำนวน/ลบได้, แสดงยอดรวม
- `[P1]` Guest checkout ฟอร์มเดียว: ชื่อ, เบอร์โทร (บังคับ, ใช้เป็น key ติดตามออร์เดอร์), ที่อยู่จัดส่ง, note — ไม่มี register/login ฝั่งลูกค้า
- `[P1]` หน้าชำระเงินหลังสร้างออร์เดอร์: แสดง PromptPay QR (dynamic ยอดตามออร์เดอร์), เลขออร์เดอร์, ฟอร์มอัปโหลดสลิป
- `[P1]` หน้าติดตามออร์เดอร์: กรอก **เลขออร์เดอร์ + เบอร์โทร** (ต้องตรงทั้งคู่ กัน enumeration) → เห็นสถานะ, รายการสินค้า, เลขพัสดุ (ถ้ามี)
- `[P2]` ทั้งหมดข้างบนทำงานภายใต้ tenant isolation (ร้าน A ไม่มีทางเห็นสินค้า/ออร์เดอร์ร้าน B)

**v1.1**
- `[P4]` โค้ดส่วนลด: ช่องกรอกในหน้า checkout, validate ฝั่ง server (วันหมดอายุ, จำนวนครั้งใช้, ยอดขั้นต่ำ)
- `[P4]` Wishlist และ Related products (เปิดเฉพาะธีมระดับ Pro ขึ้นไป — ควบคุมด้วย feature flag ของธีม §4.4)
- `[P5]` ค้นหาสินค้าแบบ full-text (Postgres `tsvector` ภาษาไทยใช้ `pg_trgm` แทน เพราะ tsvector ตัดคำไทยไม่ได้)

**Future (ห้ามสร้างตอนนี้)**
- รีวิวสินค้า, ระบบสมาชิกสะสมแต้ม, แจ้งเตือนสินค้ากลับมามีสต๊อก, หลายภาษา

### 2.2 Payment (PromptPay + สลิป)

**MVP**
- `[P1]` สร้าง PromptPay QR แบบ dynamic ต่อออร์เดอร์: payload EMVCo ฝัง (ก) PromptPay ID ของร้าน — รองรับทั้งเบอร์มือถือ 10 หลัก และเลขบัตรประชาชน 13 หลัก (ข) ยอดเงิน `orders.total_amount` — render เป็น QR ในหน้า payment
- `[P1]` อัปโหลดสลิป: รับ jpg/png/webp ≤ 5MB → เข้า R2 (path: `slips/{tenant_id}/{order_id}/{uuid}.jpg`) → insert แถวใน `payment_slips` → เปลี่ยนสถานะออร์เดอร์เป็น `slip_uploaded`
- `[P1]` **คิวอนุมัติสลิปแบบ manual (ดีฟอลต์ของทุกแพลน):** หน้าใน Store Admin แสดงรายการสลิปสถานะ `pending` เรียงเก่าสุดก่อน → แอดมินเห็นรูปสลิปเทียบกับยอดออร์เดอร์ → กด อนุมัติ (ออร์เดอร์ → `confirmed`) หรือ ปฏิเสธ (ต้องกรอกเหตุผล, ออร์เดอร์กลับเป็น `pending_payment`, ลูกค้าเห็นเหตุผลในหน้าติดตามออร์เดอร์)
- `[P1]` กันสลิปซ้ำเบื้องต้น: เก็บ SHA-256 ของไฟล์ใน `payment_slips.file_hash` + unique index ต่อ tenant (§7.3)

**v1.1**
- `[P4]` **Slip Verify API อัตโนมัติ (ฟีเจอร์แยก, ปลดล็อกเฉพาะแพลน Premium):** integrate ผู้ให้บริการตรวจสลิปภายนอก (ออกแบบเป็น interface `SlipVerifier` ให้สลับ provider ได้ — implement ตัวแรกเป็น `MockSlipVerifier` ที่อ่านค่าจาก env สำหรับทดสอบ, ตัวจริงค่อยเสียบภายหลัง) โดย flow: สลิปเข้า → เรียก verify → ถ้ายอด+บัญชีปลายทางตรง → auto-approve, ถ้าไม่ตรง → ตกลงคิว manual พร้อม flag `auto_verify_failed` + เหตุผล
- `[P4]` แจ้งเตือน LINE OA หาเจ้าของร้านเมื่อมีสลิปใหม่เข้าคิว

**Future**
- ตัดบัตร/Mobile banking deeplink — **ไม่ทำ** (นโยบายโปรเจ็ค)

### 2.3 Store Admin (หลังร้านของ tenant)

**MVP**
- `[P1]` Auth: login email+password (Supabase Auth), ลืมรหัสผ่านผ่านอีเมล
- `[P1]` CRUD สินค้า: ชื่อ, คำอธิบาย (rich text แบบง่าย — ใช้ textarea + markdown ก่อน), หมวดหมู่, ราคาตั้งต้น, รูปหลายรูป (อัปโหลดเข้า R2 ผ่าน presigned URL, ลากเรียงลำดับ), สถานะ เผยแพร่/ซ่อน/ฉบับร่าง
- `[P1]` Variant matrix: กำหนดชุดไซส์ (เช่น S,M,L,XL) × ชุดสี → ระบบ generate variants ให้, แต่ละ variant ตั้ง ราคา override (ถ้าว่าง = ใช้ราคาตั้งต้น), SKU, สต๊อก แยกกันได้, ปิดบาง combination ได้
- `[P1]` หมวดหมู่: CRUD + เรียงลำดับ, ลึก 1 ชั้น (ไม่มี sub-category ใน MVP)
- `[P1]` สต๊อก: ตัดสต๊อกเมื่อออร์เดอร์ถูก `confirmed` (ไม่ใช่ตอนสร้างออร์เดอร์ — เหตุผล: กันสต๊อกค้างจากออร์เดอร์ที่ไม่จ่าย), คืนสต๊อกเมื่อออร์เดอร์ `confirmed` ถูกยกเลิก, ตั้ง `low_stock_threshold` ต่อ variant, แถบเตือนบนแดชบอร์ดเมื่อ variant ใดต่ำกว่า threshold
- `[P1]` จัดการออร์เดอร์: ตารางออร์เดอร์ filter ตามสถานะ, หน้า detail, ปุ่มเปลี่ยนสถานะตาม state machine (§3.6): `pending_payment → slip_uploaded → confirmed → packing → shipped` (+ `cancelled` ได้จากทุกสถานะก่อน shipped), กรอกเลขพัสดุ + เลือกขนส่ง (ไปรษณีย์ไทย / Kerry / Flash / J&T / อื่นๆ) ตอนเปลี่ยนเป็น `shipped`
- `[P1]` ข้อมูลลูกค้า: ตาราง `customers` สร้างอัตโนมัติจาก checkout (dedupe ด้วยเบอร์โทรภายใน tenant), หน้ารายชื่อ + ประวัติสั่งซื้อต่อคน + ยอดสะสม
- `[P1]` ตั้งค่าร้าน: ชื่อร้าน, โลโก้, แบนเนอร์, PromptPay ID + ชื่อบัญชี, ที่อยู่ร้าน, ค่าส่ง (แบบเดียว: flat rate ต่อออร์เดอร์ + ยอดขั้นต่ำส่งฟรี)
- `[P3]` หน้าแพลนของฉัน: แพลนปัจจุบัน, วันหมดอายุ, ปุ่มขออัปเกรด (สร้างคำขอไปที่ Super Admin)

**v1.1**
- `[P4]` โค้ดส่วนลด: CRUD (percent/fixed, วันเริ่ม-หมด, จำกัดจำนวนครั้ง, ยอดขั้นต่ำ)
- `[P4]` เชื่อม LINE OA ของร้าน: กรอก channel access token → ระบบส่งแจ้งเตือน ออร์เดอร์ใหม่/สลิปใหม่ เข้า LINE ของเจ้าของร้าน (feature flag `line_oa`)
- `[P4]` เชื่อมขนส่ง: MVP คือกรอกเลขพัสดุมือ (P1) — P4 เพิ่มปุ่ม "สร้างลิงก์ติดตาม" อัตโนมัติต่อขนส่ง (แค่ deep link ไปหน้า tracking ของขนส่ง ไม่ต้อง integrate API ขนส่งจริง — API จริงเป็น Future)
- `[P5]` แดชบอร์ด: ยอดขายรายวัน/รายสัปดาห์ (กราฟเส้น), จำนวนออร์เดอร์ต่อสถานะ, Top 10 สินค้าขายดี (ตามจำนวนชิ้นและตามยอดเงิน), ยอดเฉลี่ยต่อออร์เดอร์ — ทั้งหมด scope เฉพาะ tenant ตัวเอง
- `[P4]` จัดการ staff: เชิญ user เพิ่มเป็น `store_staff` (สิทธิ์เท่า owner ยกเว้น ตั้งค่าร้าน/แพลน/staff)

**Future**
- ใบปะหน้าพัสดุ PDF, ส่งออก CSV, integrate API ขนส่งจริง (จองพัสดุ), หลายสาขา/หลายคลัง

### 2.4 Super Admin (ฝั่งแพลตฟอร์ม)

**MVP**
- `[P3]` ตารางร้านทั้งหมด: ชื่อร้าน, slug/subdomain, custom domain (ถ้ามี), แพลน, สถานะ subscription (`trial/active/grace/locked/archived`), วันหมดอายุ, ยอดขายรวม 30 วัน (อ่านอย่างเดียว), ปุ่มเข้าไปดูร้าน (impersonate แบบ read-only — เปิด storefront + admin ในโหมดดูอย่างเดียว)
- `[P3]` **Auto-provisioning:** หน้า public `shopdash.co/signup` → ลูกค้า(ร้าน)เลือกแพลน → กรอกข้อมูลร้าน + slug ที่ต้องการ (validate ว่าง+รูปแบบ) → สร้างบัญชี → จ่ายค่าแพลนด้วย PromptPay QR ของแพลตฟอร์ม + อัปโหลดสลิป → Super Admin อนุมัติสลิป → ระบบรัน provisioning pipeline อัตโนมัติ (§5.3): insert tenant + store + subscription + apply feature flags ตามแพลน + subdomain ใช้ได้ทันที → ส่งอีเมลต้อนรับ **หมายเหตุ: ระหว่างรออนุมัติสลิป tenant อยู่สถานะ `trial` ใช้งานได้เต็มระบบ 7 วัน เพื่อไม่ให้ต้องรอ**
- `[P3]` อัปเกรด/ดาวน์เกรดแพลน: Super Admin เลือกร้าน → เปลี่ยนแพลน → ระบบ recalculate feature flags ทันที (ไม่มี partial state) — ดาวน์เกรดต้องผ่าน pre-check §7.2
- `[P3]` จัดการ subscription: ต่ออายุ (บันทึกสลิป+ขยายวันหมดอายุ), ล็อกร้าน/ปลดล็อกมือ, ดู audit log ต่อร้าน
- `[P3]` จัดการแพลน: แก้ราคา/limit/ฟีเจอร์ของแพลนได้จาก UI (เขียนลงตาราง `plans` — ร้านที่ถืออยู่ได้ค่าใหม่ทันทีเพราะ flag คำนวณจาก plan realtime §5.2)

**v1.1**
- `[P4]` **Custom domain:** ร้าน (แพลน Pro ขึ้นไป) กรอกโดเมน → ระบบแสดงคำแนะนำ DNS เป็นภาษาไทย (CNAME `www` → `cname.shopdash.co`, apex ใช้ A record ตาม instruction ของ Vercel) + สร้าง TXT verification token → ปุ่ม "ตรวจสอบ DNS" (server resolve DNS จริงด้วย `dns.promises`) → สถานะ `pending → verifying → verified → active` / `error` พร้อมข้อความบอกว่าผิดตรงไหน (§7.5)
- `[P5]` แดชบอร์ดแพลตฟอร์ม: MRR/ARR (จากค่าแพลน), ร้านใหม่ต่อเดือน, ร้านใกล้หมดอายุ 30 วัน, ร้าน churn

**Future**
- ระบบ affiliate/ตัวแทนขายแพลน, ออกใบเสร็จ/ใบกำกับภาษีอัตโนมัติ, ระบบ ticket ซัพพอร์ต

---

## §3. Data Model (Multi-Tenant) + RLS

### 3.1 หลักการ

1. ทุกตารางข้อมูลร้าน มีคอลัมน์ `tenant_id uuid NOT NULL REFERENCES tenants(id)` + index `(tenant_id)` หรือ composite ที่ขึ้นต้นด้วย `tenant_id`
2. RLS **เปิด (ENABLE + FORCE)** ทุกตาราง ไม่มีข้อยกเว้น รวมถึงตารางระดับแพลตฟอร์ม (policy ของมันคือ super_admin เท่านั้น)
3. ฝั่งเขียนของ storefront (สร้างออร์เดอร์, อัปโหลดสลิป) **ไม่เขียนตรงจาก client** — ทำผ่าน Next.js Route Handler ที่ใช้ **service role key** + validate tenant จาก `getTenantContext()` เอง (เหตุผล: guest ไม่มี JWT, การเปิด INSERT ให้ anon ทั้งตารางเสี่ยงเกินไป) ส่วนฝั่งอ่าน public ใช้ anon key + RLS policy อ่านได้เฉพาะข้อมูลเผยแพร่
4. ฝั่ง Store Admin ใช้ anon key + JWT ของ user — `tenant_id` และ `role` ฝังใน `auth.users.raw_app_meta_data` ตอน provisioning (แก้ได้เฉพาะ service role ปลอมจาก client ไม่ได้)

### 3.2 Helper functions (สร้างก่อนทุกตาราง — migration แรกของ Phase 2)

```sql
-- อ่าน tenant_id จาก JWT
create or replace function auth.tenant_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'tenant_id', '')::uuid
$$;

-- อ่าน role จาก JWT
create or replace function auth.app_role() returns text
language sql stable as $$
  select current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role'
$$;

create or replace function auth.is_super_admin() returns boolean
language sql stable as $$ select auth.app_role() = 'super_admin' $$;
```

### 3.3 ตารางระดับแพลตฟอร์ม

```sql
-- แพลน (แก้ไขโดย super admin เท่านั้น, อ่าน public ได้เพื่อหน้า pricing)
plans (
  id uuid pk default gen_random_uuid(),
  code text unique not null,          -- 'starter' | 'pro' | 'premium'
  name_th text not null,
  price_yearly int not null,          -- บาท
  max_products int not null,          -- -1 = unlimited
  max_images_per_product int not null,
  max_staff int not null,
  allowed_theme_tier int not null,    -- เลือกธีมได้ถึง tier นี้ (§4.5)
  features jsonb not null default '{}'::jsonb,
    -- { "custom_domain": bool, "slip_verify_api": bool, "line_oa": bool,
    --   "discount_codes": bool, "analytics_dashboard": bool, "staff_accounts": bool }
  is_active boolean not null default true,
  created_at timestamptz default now()
)

tenants (
  id uuid pk default gen_random_uuid(),
  slug text unique not null,          -- subdomain, regex ^[a-z0-9][a-z0-9-]{2,29}$, มี reserved list: admin,www,api,app,mail
  plan_id uuid not null references plans(id),
  status text not null default 'trial',
    -- 'trial' | 'active' | 'grace' | 'locked' | 'archived'  (state machine §7.4)
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  feature_overrides jsonb not null default '{}'::jsonb,  -- super admin เปิด/ปิดรายร้านทับค่าแพลนได้
  created_at timestamptz default now()
)

tenant_subscriptions (                 -- ประวัติการจ่ายค่าแพลน (audit)
  id uuid pk, tenant_id uuid not null references tenants(id),
  plan_id uuid not null, amount int not null,
  slip_r2_key text, approved_by uuid, approved_at timestamptz,
  period_start timestamptz not null, period_end timestamptz not null,
  created_at timestamptz default now()
)

custom_domains (
  id uuid pk, tenant_id uuid unique not null references tenants(id),  -- 1 ร้าน 1 โดเมนใน v1.1
  domain text unique not null,
  verification_token text not null,   -- ค่าใส่ TXT record: shopdash-verify={token}
  status text not null default 'pending', -- 'pending'|'verifying'|'verified'|'active'|'error'
  last_error_th text,                 -- ข้อความ error ภาษาไทยไว้โชว์ร้านค้า
  checked_at timestamptz
)

theme_registry (…ดู §4.5…)

provisioning_logs (                    -- audit ทุก step ของ auto-provision
  id bigint pk, tenant_id uuid, step text, status text, detail jsonb, created_at timestamptz default now()
)
```

**RLS ตารางแพลตฟอร์ม (pseudo-SQL):**

```sql
alter table tenants enable row level security;
create policy super_all on tenants for all
  using (auth.is_super_admin()) with check (auth.is_super_admin());
create policy tenant_read_self on tenants for select
  using (id = auth.tenant_id());          -- ร้านอ่านข้อมูลตัวเองได้ (หน้า "แพลนของฉัน")

alter table plans enable row level security;
create policy plans_public_read on plans for select using (is_active = true);
create policy plans_super_write on plans for all
  using (auth.is_super_admin()) with check (auth.is_super_admin());
```

### 3.4 ตารางระดับ tenant (ทุกตารางมี tenant_id)

```sql
stores (                               -- ตั้งค่าร้าน 1:1 กับ tenant
  id uuid pk, tenant_id uuid unique not null,
  name text not null, logo_r2_key text, banner_r2_key text,
  promptpay_id text,                   -- เบอร์ 10 หลัก หรือ ปชช. 13 หลัก (validate ด้วย regex ^\d{10}$|^\d{13}$)
  promptpay_account_name text,         -- ชื่อบัญชีโชว์ให้ลูกค้าเทียบสลิป
  address text, phone text,
  flat_shipping_fee int not null default 0,
  free_shipping_min int,               -- null = ไม่มีส่งฟรี
  theme_code text not null default 'basic-01',  -- fk → theme_registry.code
  theme_overrides jsonb not null default '{}'::jsonb  -- token ที่ร้านแก้เอง เช่น primary color
)

categories ( id uuid pk, tenant_id uuid not null, name text not null,
  sort_order int not null default 0, unique(tenant_id, name) )

products (
  id uuid pk, tenant_id uuid not null,
  category_id uuid references categories(id),
  name text not null, description_md text,
  base_price int not null,             -- สตางค์? → ไม่ ใช้ "บาทเต็ม" int เพราะสินค้าไทยกลุ่มนี้ไม่ใช้ทศนิยม (บันทึกใน DECISIONS ได้ถ้าจะเปลี่ยน)
  status text not null default 'draft',   -- 'draft'|'published'|'hidden'
  is_featured boolean default false,
  created_at timestamptz default now()
)

product_images ( id uuid pk, tenant_id uuid not null,
  product_id uuid not null references products(id) on delete cascade,
  r2_key text not null, sort_order int not null default 0 )

product_variants (
  id uuid pk, tenant_id uuid not null,
  product_id uuid not null references products(id) on delete cascade,
  size text, color text,               -- null ได้ถ้าสินค้าไม่มีมิตินั้น
  sku text, price_override int,        -- null = ใช้ base_price
  stock int not null default 0,
  low_stock_threshold int not null default 3,
  is_enabled boolean not null default true,
  unique(tenant_id, product_id, size, color)
)

customers ( id uuid pk, tenant_id uuid not null,
  phone text not null, name text, unique(tenant_id, phone) )

orders (
  id uuid pk, tenant_id uuid not null,
  order_number text not null,          -- รูปแบบ {SLUGCAPS}-{YYMMDD}-{running 4 หลักต่อวันต่อร้าน} เช่น BAANNOI-260706-0042
  customer_id uuid not null references customers(id),
  status text not null default 'pending_payment',
  subtotal int not null, shipping_fee int not null, discount int not null default 0,
  total_amount int not null,           -- = subtotal + shipping_fee - discount (ตรวจด้วย check constraint)
  discount_code_id uuid,
  ship_name text not null, ship_phone text not null, ship_address text not null, note text,
  carrier text,                        -- 'thailand_post'|'kerry'|'flash'|'jnt'|'other'
  tracking_number text,
  cancelled_reason text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique(tenant_id, order_number)
)

order_items ( id uuid pk, tenant_id uuid not null,
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid not null,
  product_name text not null, variant_label text, unit_price int not null, qty int not null
  -- snapshot ชื่อ/ราคา ณ เวลาสั่ง — ห้าม join products มาแสดงย้อนหลัง เพราะร้านแก้ราคาได้
)

payment_slips (
  id uuid pk, tenant_id uuid not null,
  order_id uuid not null references orders(id),
  r2_key text not null, file_hash text not null,
  status text not null default 'pending',   -- 'pending'|'approved'|'rejected'
  reject_reason_th text, reviewed_by uuid, reviewed_at timestamptz,
  auto_verify_result jsonb,            -- P4: ผลจาก Slip Verify API
  created_at timestamptz default now(),
  unique(tenant_id, file_hash)         -- กันสลิปไฟล์เดิมซ้ำข้ามออร์เดอร์ในร้านเดียวกัน (§7.3)
)

shipping_labels ( id uuid pk, tenant_id uuid not null,   -- เผื่อ Future ใบปะหน้า — P1 สร้างแค่ตารางว่าง
  order_id uuid not null, carrier text, label_r2_key text, created_at timestamptz default now() )

discount_codes ( id uuid pk, tenant_id uuid not null,    -- P4
  code text not null, type text not null,  -- 'percent'|'fixed'
  value int not null, min_order int, max_uses int, used_count int not null default 0,
  starts_at timestamptz, ends_at timestamptz, is_active boolean default true,
  unique(tenant_id, code) )

stock_movements ( id bigint pk, tenant_id uuid not null, -- audit การตัด/คืนสต๊อก
  variant_id uuid not null, order_id uuid, delta int not null, reason text not null, created_at timestamptz default now() )
```

### 3.5 RLS policy มาตรฐานของตาราง tenant-scoped (ใช้ pattern เดียวกันทุกตาราง)

```sql
-- ตัวอย่างกับ products — ทำซ้ำ pattern นี้กับทุกตารางใน §3.4
alter table products enable row level security;
alter table products force row level security;

-- (1) super admin เห็น/แก้ได้หมด
create policy p_super on products for all
  using (auth.is_super_admin()) with check (auth.is_super_admin());

-- (2) store owner/staff เห็น+แก้เฉพาะ tenant ตัวเอง
create policy p_tenant_rw on products for all
  using (tenant_id = auth.tenant_id())
  with check (tenant_id = auth.tenant_id());

-- (3) public (anon) อ่านได้เฉพาะของที่เผยแพร่ — เฉพาะตารางที่ storefront ต้องอ่าน:
--     products(status='published'), product_images, product_variants(is_enabled), categories, stores, theme_registry
create policy p_public_read on products for select
  to anon using (status = 'published');
-- หมายเหตุ: anon อ่านข้าม tenant ได้ในระดับ SQL แต่ query ฝั่งแอปใส่ .eq('tenant_id', ctx.tenantId) เสมอ
-- ผ่าน helper กลาง (§3.8) — ความลับจริง (orders, customers, slips) "ไม่มี" policy anon เลย จึงปิดสนิท

-- (4) ตารางอ่อนไหว (orders, order_items, customers, payment_slips): มีแค่ policy (1)+(2)
--     งานเขียนฝั่ง storefront ทำผ่าน service role ใน Route Handler เท่านั้น
```

### 3.6 State machine ของออร์เดอร์ (บังคับใน code ชั้น service เดียว: `lib/orders/transition.ts`)

```
pending_payment → slip_uploaded          (ลูกค้าอัปสลิป)
slip_uploaded  → confirmed               (แอดมินอนุมัติ / auto-verify ผ่าน)  → ตัดสต๊อก + insert stock_movements
slip_uploaded  → pending_payment         (แอดมินปฏิเสธสลิป, บันทึกเหตุผล)
confirmed      → packing → shipped       (shipped ต้องมี carrier + tracking_number)
{pending_payment, slip_uploaded, confirmed, packing} → cancelled   (confirmed/packing ที่ถูกยกเลิก → คืนสต๊อก)
shipped        → (จบ — ห้ามย้อน)
```
ทุก transition นอกตารางนี้ให้ throw error — ห้าม update คอลัมน์ status ตรงๆ จากที่อื่น

### 3.7 Feature flag resolution (ใช้ทั้งระบบ — ฟังก์ชันเดียว)

```ts
// lib/features.ts
type FeatureKey = 'custom_domain'|'slip_verify_api'|'line_oa'|'discount_codes'|'analytics_dashboard'|'staff_accounts'|'wishlist'|'related_products';

export function resolveFeatures(plan: Plan, tenant: Tenant, theme: ThemeRegistryRow): Record<FeatureKey, boolean> {
  return {
    ...plan.features,                 // ฐานจากแพลน (realtime — เปลี่ยนแพลนแล้วมีผลทันที)
    ...theme.feature_defaults,        // ธีมเปิด/ปิดฟีเจอร์หน้าร้าน (wishlist ฯลฯ §4.4)
    ...tenant.feature_overrides,      // super admin override รายร้าน ชนะทุกอย่าง
  };
}
// กติกา: UI ซ่อนปุ่ม + server ตรวจซ้ำทุกครั้ง (ห้ามเชื่อ UI) — ทุก route handler ที่เป็นฟีเจอร์ flagged
// ต้องเรียก assertFeature(ctx, 'line_oa') ก่อนทำงาน
```

### 3.8 Tenant context helper (บังคับใช้ทุก request ของ storefront/store-admin)

```ts
// lib/tenant-context.ts
export async function getTenantContext(): Promise<TenantCtx> {
  const slug = headers().get('x-tenant-slug');
  if (!slug) throw new TenantNotFound();
  // cache ต่อ request ด้วย React cache(); ต่อ process ด้วย LRU TTL 60s
  const tenant = await db.from('tenants').select('*, plans(*), stores(*)').eq('slug', slug).single();
  if (!tenant || tenant.status === 'archived') throw new TenantNotFound();
  if (tenant.status === 'locked') throw new TenantLocked();   // → หน้า "ร้านนี้ปิดปรับปรุงชั่วคราว" (§7.4)
  return { tenantId: tenant.id, plan: tenant.plans, store: tenant.stores, features: resolveFeatures(...) };
}
```

### 3.9 R2 (รูปภาพ/สลิป)

- Bucket เดียว: `shopdash-prod` — path convention: `products/{tenant_id}/{product_id}/{uuid}.webp`, `slips/{tenant_id}/{order_id}/{uuid}.jpg`, `branding/{tenant_id}/{logo|banner}.webp`
- อัปโหลด: client ขอ presigned PUT URL จาก Route Handler (ตรวจ auth+tenant+ขนาด+MIME ก่อนออก URL, อายุ 5 นาที) → PUT ตรงเข้า R2 → แจ้ง key กลับมา insert ลงตาราง
- ใน Postgres เก็บเฉพาะ `r2_key` (ไม่เก็บ full URL) — ประกอบ URL ตอน render ด้วย `env.R2_PUBLIC_BASE_URL + '/' + key` เพื่อย้าย CDN domain ได้ภายหลัง
- รูปสินค้า: แปลงเป็น webp + resize สูงสุด 1600px ฝั่ง client ก่อนอัป (ใช้ canvas) — สลิปเก็บไฟล์ต้นฉบับ (ห้ามแปลง เพราะเป็นหลักฐานการเงิน)
- **สลิปเป็นข้อมูลอ่อนไหว:** อยู่ path แยก และเสิร์ฟผ่าน presigned GET URL อายุสั้น (15 นาที) ที่ออกโดย Route Handler ซึ่งตรวจสิทธิ์ก่อน — ห้ามเสิร์ฟผ่าน public bucket domain

---

## §4. ระบบ Theme (10 preset จาก token system เดียว)

### 4.1 หลักการ (ห้ามฝ่าฝืน)

- **ไม่มีโค้ดธีม 10 ชุด** — มี component library กลางชุดเดียว + design token layer + preset 10 ชุด (ชุดค่า token + feature defaults + layout variant)
- ธีมเปลี่ยน = เปลี่ยนค่า CSS variables + เปลี่ยน layout variant ของบาง component — ไม่มี if/else ชื่อธีมกระจายในโค้ด

### 4.2 Design tokens (CSS custom properties — ประกาศที่ `<html data-theme>` ของ storefront)

```css
:root {
  /* สี */
  --color-primary; --color-primary-fg; --color-secondary;
  --color-bg; --color-surface; --color-text; --color-text-muted;
  --color-accent; --color-danger; --color-success;
  /* ตัวอักษร */
  --font-heading;  /* เช่น 'Prompt' */  --font-body;  /* เช่น 'Sarabun' */
  --text-scale;    /* 1.0 | 1.05 | 1.1 */
  /* รูปทรง/ระยะ */
  --radius-sm; --radius-md; --radius-lg;   /* 0px แบบ sharp ถึง 24px แบบ playful */
  --space-unit;    /* 4px ฐาน */
  --shadow-card;   /* none ถึง soft */
  --container-max; /* 1100px | 1280px */
}
```

ฟอนต์ที่อนุญาต (โหลดผ่าน `next/font/google`, รองรับไทยทุกตัว): Prompt, Sarabun, Kanit, Noto Sans Thai, Mitr, Bai Jamjuree, IBM Plex Sans Thai

### 4.3 Component library กลาง (สร้างครั้งเดียว Phase 1, ใช้ทุกธีม)

`components/storefront/`: `ProductCard`, `ProductGrid`, `CategoryNav`, `FilterBar`, `HeroBanner`, `CartDrawer`, `CheckoutForm`, `QrPaymentPanel`, `SlipUploader`, `OrderTracker`, `Footer`, `AnnouncementBar`, `WishlistButton`*, `RelatedProducts`* (*render เมื่อ feature เปิดเท่านั้น)

Component ที่มี **layout variant** (prop `variant` อ่านจาก preset): `ProductCard` (`minimal` | `bordered` | `overlay`), `HeroBanner` (`full-bleed` | `boxed` | `split`), `CategoryNav` (`topbar` | `pills` | `sidebar`)

### 4.4 โครงสร้าง preset

```ts
// themes/presets/{code}.ts
export const preset: ThemePreset = {
  code: 'pro-01', tier: 3,
  tokens: { '--color-primary': '#1a3c34', '--font-heading': 'Kanit', '--radius-md': '12px', /* ครบทุก token */ },
  variants: { productCard: 'overlay', hero: 'split', categoryNav: 'sidebar' },
  featureDefaults: { wishlist: true, related_products: true },
  sections: ['announcement','hero','featured','categories','grid','footer'],  // ลำดับ section หน้าแรก
};
```

### 4.5 Theme registry (ตารางในฐานข้อมูล + 10 preset)

```sql
theme_registry ( code text pk, name_th text, tier int not null,
  preview_r2_key text, feature_defaults jsonb, is_active boolean default true )
```

| # | code | ชื่อไทย | tier (แพลนขั้นต่ำ) | จุดต่างหลัก |
|---|---|---|---|---|
| 1 | `basic-01` | มินิมอลขาว | 1 Starter | grid เรียบ, card `minimal`, ไม่มี wishlist/related |
| 2 | `basic-02` | พาสเทลหวาน | 1 Starter | โทนชมพู-ครีม radius ใหญ่ เหมาะเสื้อผ้าผู้หญิง/ของเด็ก |
| 3 | `basic-03` | คลีนดำ-ขาว | 1 Starter | โทนขรึม radius 0 เหมาะ streetwear |
| 4 | `prof-01` | บูติกอบอุ่น | 2 Pro | hero `boxed`, มี AnnouncementBar, related products |
| 5 | `prof-02` | เด็กเล่นสนุก | 2 Pro | สีสด font Mitr, badge "ใหม่/ขายดี" บน card |
| 6 | `prof-03` | แฟชั่นนิตยสาร | 2 Pro | hero `full-bleed`, typography ใหญ่, card `overlay` |
| 7 | `pro-01` | แกลเลอรีหรู | 3 Premium | sidebar nav, wishlist+related, text-scale 1.05 |
| 8 | `pro-02` | สตรีทเข้ม | 3 Premium | dark mode ทั้งร้าน, accent นีออน |
| 9 | `prem-01` | ซิกเนเจอร์ | 3 Premium | ทุก section ครบ + ร้านแก้ token หลักเองได้จาก admin (`theme_overrides`) |
| 10 | `prem-02` | มินิมอลพรีเมียม | 3 Premium | whitespace เยอะ, serif-ish heading (Bai Jamjuree), แก้ token ได้ |

### 4.6 Wireframe รายกลุ่ม (คำบรรยาย — ให้ Opus ใช้เป็นเกณฑ์ implement)

**กลุ่ม Basic (1–3):** Header = โลโก้ซ้าย + CategoryNav `topbar` + ไอคอนตะกร้าขวา / หน้าแรก = HeroBanner `boxed` 1 รูป → grid สินค้าแนะนำ 8 ชิ้น → grid ตามหมวด → footer ที่อยู่+เบอร์ / หน้าสินค้า = รูปซ้าย (แกลเลอรี thumbnail แนวตั้ง) รายละเอียดขวา / ไม่มี AnnouncementBar, wishlist, related

**กลุ่ม Professional (4–6):** เพิ่ม AnnouncementBar บนสุด (ข้อความวิ่ง/สลับ), hero รองรับหลายสไลด์, RelatedProducts ท้ายหน้าสินค้า 4 ชิ้น, badge สถานะบน ProductCard, ส่วน "หมวดหมู่แนะนำ" เป็นการ์ดรูปใหญ่ 3–4 ใบ

**กลุ่ม Pro/Premium (7–10):** ตัวเลือก CategoryNav `sidebar` (desktop), wishlist (เก็บ localStorage), related products, ธีม 9–10 เปิดหน้า "ปรับแต่งธีม" ใน Store Admin ให้แก้ `--color-primary`, ฟอนต์, radius ได้เอง (เขียนลง `stores.theme_overrides` แล้ว merge ทับ preset ตอน render)

**มือถือทุกกลุ่ม:** nav ยุบเป็น hamburger, grid 2 คอลัมน์, CartDrawer เต็มจอ, ปุ่ม checkout sticky ล่าง

---

## §5. Plan & Billing Logic

### 5.1 ตารางเปรียบเทียบแพลน (ค่าเริ่มต้น — แก้ได้จาก Super Admin UI)

| | **Starter** ฿990/ปี | **Pro** ฿1,990/ปี | **Premium** ฿3,990/ปี |
|---|---|---|---|
| จำนวนสินค้าสูงสุด | 50 | 300 | ไม่จำกัด (-1) |
| รูปต่อสินค้า | 3 | 6 | 10 |
| ธีมที่เลือกได้ | tier 1 (3 แบบ) | tier ≤2 (6 แบบ) | ทั้งหมด 10 แบบ |
| Custom domain | ✗ | ✓ | ✓ |
| โค้ดส่วนลด | ✗ | ✓ | ✓ |
| แจ้งเตือน LINE OA | ✗ | ✓ | ✓ |
| Slip Verify API อัตโนมัติ | ✗ | ✗ | ✓ |
| แดชบอร์ดวิเคราะห์ยอดขาย | สรุปพื้นฐาน | ✓ เต็ม | ✓ เต็ม |
| Staff เพิ่มเติม | 0 | 2 | 5 |
| Trial ฟรี | 7 วัน (ทุกแพลน ฟีเจอร์ตามแพลนที่เลือก) | | |

การบังคับ limit: ตรวจใน service layer ตอน create (เช่น `assertUnderProductLimit(ctx)` ก่อน insert product) — ไม่ใช้ trigger DB เพื่อให้ error message ภาษาไทยชัดเจน

### 5.2 กติกาเปลี่ยนแพลน

- Feature flags **ไม่ถูก copy ลง tenant** — คำนวณ realtime จาก `plans.features` ผ่าน `resolveFeatures()` (§3.7) → เปลี่ยนแพลน = update `tenants.plan_id` จุดเดียว มีผลทันที ไม่มี partial state
- อัปเกรด: มีผลทันที, สร้างแถว `tenant_subscriptions` ใหม่ (ยอดส่วนต่างคิดมือโดย Super Admin ในเฟสนี้ — ระบบ pro-rate อัตโนมัติเป็น Future)
- ดาวน์เกรด: ต้องผ่าน pre-check §7.2 ก่อน

### 5.3 Flow auto-provisioning (แผนภาพข้อความ)

```
[ลูกค้าเปิด shopdash.co/signup]
  │ 1. เลือกแพลน (การ์ด 3 ใบจากตาราง plans ที่ is_active)
  │ 2. กรอก: ชื่อร้าน, slug ที่ต้องการ (เช็ค realtime ว่าว่าง+ผ่าน regex+ไม่ติด reserved),
  │          email, password, เบอร์โทร
  ▼
[POST /api/signup — service role, transaction เดียว]
  │ 3. สร้าง auth user (Supabase Admin API)
  │ 4. INSERT tenants (status='trial', trial_ends_at=now()+7d, plan_id ตามที่เลือก)
  │ 5. UPDATE auth user: app_metadata = { tenant_id, role:'store_owner' }
  │ 6. INSERT stores (ค่า default, theme_code='basic-01')
  │ 7. INSERT categories ตัวอย่าง 1 รายการ ("สินค้าทั้งหมด")
  │ 8. LOG ทุก step ลง provisioning_logs — step ใด fail → rollback ทั้งหมด + แจ้ง error
  ▼
[redirect → https://{slug}.shopdash.co/admin — ใช้งานได้ทันที (trial)]
  │ 9. หน้า onboarding checklist: ใส่ PromptPay → เพิ่มสินค้าแรก → เลือกธีม
  ▼
[ภายใน 7 วัน: หน้า "แพลนของฉัน" แสดง QR PromptPay ของแพลตฟอร์ม ยอดตามแพลน + อัปสลิป]
  │ 10. Super Admin เห็นสลิปในคิว → อนุมัติ
  │ 11. ระบบ: INSERT tenant_subscriptions (period 1 ปี), UPDATE tenants
  │        SET status='active', subscription_ends_at = now()+1y
  ▼
[ร้าน active เต็มรูปแบบ]  — ถ้าครบ 7 วันไม่จ่าย → status='locked' (§7.4)
```

Subdomain ไม่ต้อง provision อะไรเพิ่ม: wildcard `*.shopdash.co` ชี้เข้าแอปอยู่แล้ว middleware resolve slug ได้ทันทีที่แถว tenants ถูก insert

---

## §6. แผนสร้างแบบแบ่งเฟส (ส่วนที่สำคัญที่สุดของเอกสารนี้)

> **กติกาการทำงานข้ามเซสชัน:** เริ่มทุกเซสชันด้วยการอ่าน `STATUS.md` → ทำต่อจากจุดที่ค้าง → จบเซสชันด้วยการอัปเดต `STATUS.md` + git commit ตาม convention §8.3 — **ห้ามเริ่ม Phase ใหม่ถ้า Phase ก่อนหน้ายังไม่ผ่าน DoD ครบทุกข้อ**

### Phase 1 — MVP ร้านเดียว (ยังไม่มี multi-tenant)

**เป้าหมาย:** พิสูจน์ flow หลักครบวงจร: ลงสินค้า → ลูกค้าสั่ง → จ่าย PromptPay → อัปสลิป → แอดมินอนุมัติ → ตัดสต๊อก → แพ็ค → จัดส่ง → ลูกค้าติดตามได้ — ทั้งหมดกับร้านเดียวที่ hardcode

**ข้อกำหนดเฉพาะเฟสนี้ (สำคัญ):**
- สร้าง schema **ตาม §3.4 เต็มรูปแบบตั้งแต่แรก รวมคอลัมน์ `tenant_id`** แต่ยังไม่เปิด RLS และใช้ค่า tenant คงที่ตัวเดียว: seed แถว `tenants` 1 แถว (slug=`demo`) + `stores` 1 แถว แล้วให้ `getTenantContext()` เวอร์ชันเฟสนี้ return ค่า demo ตายตัว — เหตุผล: จะได้ไม่ต้อง migrate เติม tenant_id ย้อนหลังใน Phase 2
- ยังไม่ทำ middleware hostname routing — รันที่ `localhost:3000` path ตรงๆ (`/` = storefront, `/admin` = store admin)
- ธีมเดียว: `basic-01` แต่ **ต้องสร้างผ่านระบบ token + component library ตาม §4 ตั้งแต่ตอนนี้** ห้าม hardcode สี

**ลำดับงาน + ไฟล์หลักที่ต้องสร้าง:**

| ลำดับ | งาน | ไฟล์หลัก |
|---|---|---|
| 1.1 | โครงโปรเจ็ค Next.js 15 + Tailwind v4 + Supabase client (`@supabase/ssr`) + env template | `app/`, `lib/supabase/{server,client,admin}.ts`, `.env.example` |
| 1.2 | Migration 001: helper functions §3.2 + ทุกตาราง §3.3–3.4 + seed demo tenant/store/plans 3 แพลน | `supabase/migrations/001_init.sql`, `supabase/seed.sql` |
| 1.3 | Token system + preset basic-01 + component library storefront ตาม §4.3 | `themes/tokens.css`, `themes/presets/basic-01.ts`, `components/storefront/*` |
| 1.4 | R2 helper + presigned upload route | `lib/r2.ts`, `app/api/upload/route.ts` |
| 1.5 | Store Admin: auth, layout, CRUD สินค้า+variant matrix+หมวดหมู่+รูป | `app/store-admin/(auth)/login`, `app/store-admin/products/*`, `app/store-admin/categories/*` |
| 1.6 | Storefront: หน้าแรก, แคตตาล็อก+ตัวกรอง, หน้าสินค้า, ตะกร้า localStorage | `app/storefront/page.tsx`, `app/storefront/products/*`, `lib/cart.ts` |
| 1.7 | Checkout: สร้าง order (service role route), dedupe customer ด้วยเบอร์โทร, gen order_number | `app/api/checkout/route.ts`, `lib/orders/create.ts` |
| 1.8 | Payment: PromptPay QR dynamic + หน้า payment + อัปสลิป (hash กันซ้ำ) | `lib/promptpay.ts`, `app/storefront/orders/[num]/pay/*`, `app/api/slips/route.ts` |
| 1.9 | Order state machine + คิวอนุมัติสลิป + จัดการออร์เดอร์ + ตัด/คืนสต๊อก + stock_movements | `lib/orders/transition.ts`, `app/store-admin/orders/*`, `app/store-admin/slips/*` |
| 1.10 | หน้าติดตามออร์เดอร์ (เลขออร์เดอร์+เบอร์โทร) + ตั้งค่าร้าน + แจ้งเตือนสต๊อกใกล้หมด | `app/storefront/track/*`, `app/store-admin/settings/*` |

**Definition of Done (Phase 1):**
1. รัน e2e ด้วยมือครบ loop: เพิ่มสินค้า 2 ชิ้น (มี variant ไซส์/สี) → ลูกค้ากรองสี เลือก variant หยิบใส่ตะกร้า → checkout guest → เห็น QR ยอดตรงกับออร์เดอร์ (สแกนด้วยแอปธนาคารจริงแล้วยอด+ชื่อบัญชีขึ้นถูก) → อัปสลิป → แอดมินเห็นคิว อนุมัติ → สต๊อก variant ลดถูกตัว + มีแถว `stock_movements` → เปลี่ยนสถานะถึง shipped พร้อมเลขพัสดุ → ลูกค้าเช็คสถานะด้วยเลขออร์เดอร์+เบอร์โทรเห็นเลขพัสดุ
2. ปฏิเสธสลิปแล้วออร์เดอร์กลับ `pending_payment` + ลูกค้าเห็นเหตุผล / ยกเลิกออร์เดอร์ `confirmed` แล้วสต๊อกคืน
3. อัปโหลดไฟล์สลิปเดิมซ้ำ → ถูกปฏิเสธด้วย unique(file_hash)
4. variant สต๊อก 0 → ปุ่มหยิบใส่ตะกร้า disabled และ checkout ฝั่ง server ปฏิเสธ (กันยิง API ตรง)
5. ทุกสี/ฟอนต์ใน storefront มาจาก CSS variables — grep หา hex code ใน `components/storefront` ต้องไม่เจอ
6. `pnpm build` ผ่าน, ไม่มี type error

---

### Phase 2 — Multi-tenant (RLS + subdomain routing)

**เป้าหมาย:** ร้าน ≥2 ร้านอยู่ร่วมระบบเดียวโดยข้อมูลแยกขาดกันสนิท

**ลำดับงาน:**

| ลำดับ | งาน | ไฟล์หลัก |
|---|---|---|
| 2.1 | Migration 002: เปิด RLS+FORCE ทุกตาราง + policy ตาม pattern §3.5 ครบทุกตาราง | `supabase/migrations/002_rls.sql` |
| 2.2 | `getTenantContext()` ตัวจริง: อ่าน `x-tenant-slug` + cache + จัดการ locked/archived | `lib/tenant-context.ts` |
| 2.3 | Middleware hostname routing ตาม §1.4 (dev ใช้ `demo.localhost:3000`, `shop2.localhost:3000`) | `middleware.ts` |
| 2.4 | ฝัง `tenant_id`+`role` ลง app_metadata ตอนสร้าง user + ปรับ login store admin ให้ scope ตาม tenant ของ host | `lib/auth.ts` |
| 2.5 | ไล่ทุก query ให้ผ่าน context (ห้ามมี query ที่ไม่ scope) + seed ร้านที่ 2 พร้อมข้อมูลต่าง | `supabase/seed.sql` |
| 2.6 | เขียน isolation test script | `scripts/test-isolation.ts` |

**Definition of Done (Phase 2):**
1. `scripts/test-isolation.ts` ผ่านทั้งหมด: (ก) JWT ร้าน A select orders/products/customers/slips → เห็นเฉพาะของ A (ข) JWT ร้าน A พยายาม insert product ที่ `tenant_id` = B → ถูก RLS ปฏิเสธ (ค) anon key select orders/customers/payment_slips → ได้ 0 แถวเสมอ (ง) anon เห็นเฉพาะ products `published`
2. เปิด `demo.localhost:3000` และ `shop2.localhost:3000` เห็นคนละร้าน คนละธีมค่า token, login admin ของร้าน A ที่ host ของร้าน B ไม่ได้
3. หน้าติดตามออร์เดอร์ร้าน A ใช้เลขออร์เดอร์ของร้าน B ไม่เจอผลลัพธ์
4. ทุกตารางใน §3.4: `select relforcerowsecurity from pg_class` = true (เขียนเช็คไว้ใน test script)

---

### Phase 3 — Super Admin + Auto-provisioning + Plan/Feature flag

**ลำดับงาน:**

| ลำดับ | งาน | ไฟล์หลัก |
|---|---|---|
| 3.1 | Layout Super Admin ที่ `admin.shopdash.co` + guard role=super_admin + seed super admin user | `app/super-admin/layout.tsx` |
| 3.2 | ตารางร้านทั้งหมด + หน้า detail ร้าน + lock/unlock มือ + feature_overrides UI | `app/super-admin/tenants/*` |
| 3.3 | หน้า signup public + provisioning pipeline ตาม §5.3 (transaction + provisioning_logs) | `app/(public)/signup/*`, `app/api/signup/route.ts`, `lib/provisioning.ts` |
| 3.4 | `resolveFeatures()` + `assertFeature()` + `assertUnderProductLimit()` แล้วเสียบเข้า route ที่เกี่ยว | `lib/features.ts` |
| 3.5 | Billing: หน้า "แพลนของฉัน" (QR แพลตฟอร์ม+อัปสลิป), คิวอนุมัติ subscription ฝั่ง super admin, ต่ออายุ, เปลี่ยนแพลน + pre-check ดาวน์เกรด §7.2 | `app/store-admin/plan/*`, `app/super-admin/subscriptions/*` |
| 3.6 | Cron รายวัน (Vercel Cron): trial หมด→locked, subscription หมด→grace→locked ตาม §7.4 | `app/api/cron/subscription-sweep/route.ts` |

**Definition of Done (Phase 3):**
1. Signup ร้านใหม่จากหน้า public จบใน flow เดียว → เปิด `{slug}.localhost:3000/admin` ใช้ได้ทันที (trial), มี log ครบทุก step ใน `provisioning_logs`
2. Signup ด้วย slug ซ้ำ/ติด reserved → error ภาษาไทยชัดเจน, ไม่มีแถวค้างครึ่งเดียว (ตรวจว่า rollback จริง)
3. ร้าน Starter เพิ่มสินค้าเกิน 50 → ถูกปฏิเสธพร้อมข้อความชวนอัปเกรด; super admin เปลี่ยนเป็น Pro → เพิ่มได้ทันทีโดยไม่ redeploy
4. ดาวน์เกรด Pro→Starter ขณะมีสินค้า 60 ชิ้น → ระบบเตือนตาม §7.2 และไม่ดาวน์เกรดจนกว่าจะยืนยัน
5. ตั้ง `subscription_ends_at` เป็นเมื่อวาน + รัน cron → ร้านเข้า grace; ย้อน 8 วัน → locked, storefront ขึ้นหน้าปิดปรับปรุง, admin เข้าได้เฉพาะหน้าจ่ายเงิน
6. Super admin จ่าย/อนุมัติต่ออายุ → ร้านกลับ active ทันที

---

### Phase 4 — ธีมที่เหลือ + ฟีเจอร์เสริม (LINE OA, Slip Verify, ขนส่ง, ส่วนลด, custom domain)

**ลำดับงาน:**

| ลำดับ | งาน | ไฟล์หลัก |
|---|---|---|
| 4.1 | Preset ธีม 2–10 ตามตาราง §4.5 + `theme_registry` + หน้าเลือกธีมใน Store Admin (ล็อกตาม tier แพลน) | `themes/presets/*.ts`, `app/store-admin/theme/*` |
| 4.2 | Layout variants ของ ProductCard/Hero/CategoryNav + WishlistButton + RelatedProducts (flag-gated) | `components/storefront/*` |
| 4.3 | หน้า "ปรับแต่งธีม" (`theme_overrides`) สำหรับ prem-01/02 | `app/store-admin/theme/customize/*` |
| 4.4 | โค้ดส่วนลด: CRUD + validate ใน checkout (atomic `used_count` ด้วย `update ... where used_count < max_uses`) | `app/store-admin/discounts/*`, `lib/discounts.ts` |
| 4.5 | LINE OA: ตั้งค่า token ต่อร้าน + ส่งแจ้งเตือน ออร์เดอร์ใหม่/สลิปใหม่ (คิวแบบ fire-and-forget + log fail) | `lib/line.ts` |
| 4.6 | Slip Verify: interface `SlipVerifier` + `MockSlipVerifier` + เสียบเข้า flow อัปสลิป (Premium เท่านั้น) | `lib/slip-verify/*` |
| 4.7 | ขนส่ง: mapping carrier → tracking URL template + ปุ่มลิงก์ติดตามใน order detail และหน้าลูกค้า | `lib/carriers.ts` |
| 4.8 | Custom domain: UI + TXT verify + DNS check + middleware lookup + เอกสารแนะนำ DNS ภาษาไทย ตาม §7.5 | `app/store-admin/domain/*`, `app/api/domain/verify/route.ts` |
| 4.9 | Staff accounts: เชิญ staff (จำกัดตามแพลน) + จำกัดสิทธิ์หน้า settings/plan/staff | `app/store-admin/staff/*` |

**Definition of Done (Phase 4):**
1. ร้าน Starter เห็นธีมเลือกได้ 3 แบบ, Premium เห็น 10 — สลับธีมแล้วหน้าร้านเปลี่ยนทันทีโดยไม่ deploy
2. Grep โค้ด storefront: ไม่มี `if (themeCode === ...)` — ทุกความต่างมาจาก token/variant/flag
3. ส่วนลด: ใช้โค้ดหมดโควตา/หมดอายุ/ต่ำกว่ายอดขั้นต่ำ → ถูกปฏิเสธฝั่ง server พร้อมเหตุผล; ยิง checkout พร้อมกันหลาย request โค้ดโควตา 1 → ผ่านแค่ 1
4. Mock LINE token แล้วเกิดออร์เดอร์ใหม่ → มี request ออก (ตรวจจาก log); token ผิด → ระบบไม่ล้ม แค่ log fail
5. `MockSlipVerifier` โหมดยอดไม่ตรง → สลิปตกคิว manual พร้อม flag; โหมดตรง → auto-approve + ตัดสต๊อก
6. ร้าน Starter เรียก API ฟีเจอร์ Pro ตรงๆ (curl) → 403 ทุกตัว
7. Custom domain สถานะเดินครบ `pending→verified→active` กับโดเมนทดสอบ และกรณี DNS ผิดขึ้นข้อความไทยบอกจุดผิด

---

### Phase 5 — แดชบอร์ดวิเคราะห์ + Polish

**ลำดับงาน:**

| ลำดับ | งาน | ไฟล์หลัก |
|---|---|---|
| 5.1 | View/RPC สรุปยอด: ยอดขายรายวัน 30 วัน, รายสัปดาห์ 12 สัปดาห์, top 10 สินค้า (นับเฉพาะออร์เดอร์ `confirmed` ขึ้นไป ไม่รวม `cancelled`) | `supabase/migrations/00x_analytics.sql` |
| 5.2 | แดชบอร์ด Store Admin (Recharts): กราฟเส้นยอดขาย, การ์ดตัวเลข, top products, ออร์เดอร์ค้างต่อสถานะ, แถบสต๊อกใกล้หมด | `app/store-admin/dashboard/*` |
| 5.3 | แดชบอร์ดแพลตฟอร์ม: MRR/ARR, ร้านใหม่, ใกล้หมดอายุ, churn | `app/super-admin/dashboard/*` |
| 5.4 | ค้นหาสินค้า storefront (`pg_trgm`) | migration + `FilterBar` |
| 5.5 | Polish: loading/empty/error states ทุกหน้า, SEO storefront (title/OG ต่อร้าน, sitemap ต่อ tenant), responsive ตรวจครบ, ภาษาไทยทุก error message | ทั่วโปรเจ็ค |

**Definition of Done (Phase 5):**
1. ตัวเลขแดชบอร์ดตรงกับการนับมือจากข้อมูล seed (เขียน expected ไว้ใน test script) และไม่รวมออร์เดอร์ยกเลิก/ยังไม่ยืนยัน
2. Query แดชบอร์ดของร้านที่มีออร์เดอร์ 10,000 แถว (seed สคริปต์) ตอบใน < 1s
3. ค้นหาคำไทยบางส่วน ("เสื้อยื") เจอ "เสื้อยืด"
4. Lighthouse หน้าแรก storefront: Performance ≥ 80 (mobile), ทุกรูปผ่าน `next/image` + R2
5. ไม่มีหน้าใดแสดง raw error/stack trace — ทุก error มีข้อความไทย

---

## §7. Edge Cases (ข้อกำหนดพฤติกรรมที่ต้อง implement — ไม่ใช่แค่ "ควรระวัง")

### 7.1 สลิปปลอม / ยอดไม่ตรง
- ระบบ manual คือด่านหลัก: หน้าอนุมัติสลิปต้องแสดง **ยอดออร์เดอร์ตัวใหญ่ชัด** เคียงข้างรูปสลิป + ชื่อบัญชี PromptPay ของร้านให้เทียบ + เวลาอัปโหลด
- แอดมินปฏิเสธได้พร้อมเหตุผลจากรายการสำเร็จรูป (ยอดไม่ตรง / สลิปไม่ชัด / ไม่ใช่บัญชีร้าน / สงสัยสลิปปลอม) + ช่องข้อความเพิ่ม — เหตุผลแสดงในหน้าติดตามออร์เดอร์ของลูกค้า
- ออร์เดอร์หนึ่งอัปสลิปใหม่ได้หลังถูกปฏิเสธ (ประวัติสลิปเก่าเก็บไว้ทุกใบใน `payment_slips` — ห้ามลบ เป็นหลักฐาน)
- แพลน Premium: Slip Verify API เช็ค ยอด + บัญชีปลายทาง + สลิปถูกใช้แล้วหรือยัง (transaction ref ซ้ำ) — ผลไม่ผ่านทุกกรณี "ตกคิว manual" ไม่ใช่ reject อัตโนมัติ (กัน false negative ทำร้ายลูกค้าจริง)

### 7.2 ร้านค้าเกิน limit ของแพลน (ดาวน์เกรด/แก้แพลนกลางทาง)
- นโยบาย: **ข้อมูลเดิมไม่หาย ไม่ถูกลบอัตโนมัติเด็ดขาด** — เกิน limit = ห้าม "สร้างเพิ่ม" เท่านั้น
- Pre-check ก่อนดาวน์เกรด: ระบบสรุปให้ super admin เห็นว่า ร้านมีสินค้า X ชิ้น (เกิน Y), ใช้ custom domain อยู่ไหม, มี staff กี่คน, ธีมปัจจุบัน tier เกินไหม → ต้องกดยืนยันรับทราบ
- ผลหลังดาวน์เกรด: สินค้าเกิน limit → ยังแสดงและขายได้ แต่เพิ่มใหม่ไม่ได้จนกว่าจะต่ำกว่า limit; ธีม tier เกิน → บังคับ fallback เป็น `basic-01` (แจ้งร้านก่อน); custom domain (ถ้าแพลนใหม่ไม่มี) → ปิด routing โดเมนนั้น แต่เก็บแถวไว้ status `suspended` เผื่ออัปเกรดกลับ; staff เกิน → คนที่เกินถูก disable login (ไม่ลบ)

### 7.3 ลูกค้าอัปโหลดสลิปซ้ำ
- ไฟล์เดิมซ้ำในร้านเดียวกัน: กันด้วย `unique(tenant_id, file_hash)` — DB ปฏิเสธ, API แปลงเป็นข้อความ "สลิปนี้ถูกใช้ไปแล้ว กรุณาตรวจสอบหรือติดต่อร้าน"
- สลิปใบเดียวยอดครอบสองออร์เดอร์: นโยบาย MVP = ไม่รองรับ ระบบตอบว่าให้ติดต่อร้าน แล้วร้านจัดการ manual (ยกเลิกออร์เดอร์หนึ่ง หรืออนุมัติมือ)
- กดอัปโหลดรัว/เน็ตหลุดอัปซ้ำ: ปุ่มอัปโหลด disable ระหว่างส่ง + ฝั่ง server ถ้าออร์เดอร์มีสลิป `pending` อยู่แล้ว → ปฏิเสธใบใหม่จนกว่าใบเดิมถูกตัดสิน
- หมายเหตุ: hash เดิมกันได้เฉพาะ "ไฟล์เดียวกันเป๊ะ" — สลิปเดิมที่ถูก crop/screenshot ใหม่ hash จะเปลี่ยน อันนี้เป็นหน้าที่ตา manual / Slip Verify API (เช็ค transaction ref)

### 7.4 ร้านค้าไม่จ่ายต่อแพลน (state machine ของ tenant)
```
trial ──(จ่าย+อนุมัติ)──▶ active ──(หมดอายุ)──▶ grace ──(ครบ 7 วัน)──▶ locked ──(ครบ 60 วัน)──▶ archived
  └─(ครบ 7 วันไม่จ่าย)──▶ locked                      └◀──(จ่าย+อนุมัติ ณ จุดใดก็ได้ก่อน archived)──┘
```
- **grace (7 วัน):** ทุกอย่างทำงานปกติ + แบนเนอร์เตือนใน admin ทุกหน้า
- **locked:** storefront ทุกหน้าแทนด้วยหน้าเดียว "ร้านนี้ปิดปรับปรุงชั่วคราว" (ไม่บอกลูกค้าว่าค้างจ่าย — รักษาหน้าให้ร้าน), store admin login ได้แต่ redirect ไปหน้าจ่ายเงินหน้าเดียว, ข้อมูลอยู่ครบไม่แตะ
- **archived (หลัง locked 60 วัน):** ปิดถาวรจาก routing, ข้อมูลใน DB ยังอยู่ (soft) — ลบจริง+ลบไฟล์ R2 เป็นงาน manual ของ super admin หลังแจ้งเตือนอีเมล 2 ครั้ง; **นโยบายเก็บข้อมูลรวม: อย่างน้อย 90 วันนับจากหมดอายุ**
- ทั้งหมด transition โดย cron รายวัน (3.6) + super admin ทำมือได้ทุก transition + ทุกครั้งเขียน audit log

### 7.5 Custom domain ตั้งค่า DNS ผิด
- ปุ่ม "ตรวจสอบ DNS" ทำ 3 เช็คแยกและรายงานแยกข้อ: (1) TXT `shopdash-verify={token}` เจอไหม (2) CNAME/A ชี้ถูกไหม (3) HTTPS ออก cert แล้วยัง (สถานะจาก platform hosting)
- ข้อความ error ต้องบอก "ค่าที่พบจริง vs ค่าที่ต้องเป็น" เช่น: "พบ CNAME ชี้ไป `old-host.com` — ต้องแก้เป็น `cname.shopdash.co`" + เตือนเรื่อง DNS propagation (อาจรอถึง 24 ชม.) + ลิงก์คู่มือของ registrar ยอดนิยม (Godaddy/Namecheap/Cloudflare) เป็นภาษาไทย
- ระหว่างยังไม่ `active`: subdomain `.shopdash.co` ใช้งานได้ปกติเสมอ (custom domain เป็น "เพิ่ม" ไม่ใช่ "แทนที่")
- โดเมนที่ verify แล้วแต่ DNS หายภายหลัง: cron รายวัน re-check โดเมน `active` → ถ้า fail 3 วันติด เปลี่ยนเป็น `error` + แจ้งร้าน (LINE/อีเมล) — ห้ามลบแถวเอง

### 7.6 Edge cases เพิ่มเติมที่ต้องกันไว้ตั้งแต่เขียนโค้ดครั้งแรก
- **Race สต๊อก:** สองออร์เดอร์ถูก confirm พร้อมกันขณะสต๊อกเหลือ 1 → ตัดสต๊อกด้วย `update product_variants set stock = stock - qty where id = ? and stock >= qty` แล้วเช็ค affected rows — ถ้า 0 = สต๊อกไม่พอ ให้ transition fail พร้อมแจ้งแอดมิน
- **ราคาเปลี่ยนระหว่างลูกค้าเปิดหน้า:** ตอน checkout server คำนวณราคาใหม่จาก DB เสมอ ไม่เชื่อราคาใน cart payload — ถ้าต่างจากที่ลูกค้าเห็น แสดงหน้ายืนยันราคาใหม่
- **Slug/subdomain ชน reserved:** validate ที่ signup ด้วย list: `admin, www, api, app, mail, shop, demo, blog, help, docs, status`
- **ลูกค้าเบอร์เดียวกันคนละชื่อ:** dedupe ด้วยเบอร์ → อัปเดตชื่อ/ที่อยู่เป็นค่าล่าสุด แต่ประวัติออร์เดอร์เดิม snapshot ไว้แล้วใน orders
- **Timezone:** เก็บ timestamptz (UTC) เสมอ แสดงผล `Asia/Bangkok` เสมอ — วันตัดยอดแดชบอร์ด = เที่ยงคืนเวลาไทย

---

## §8. ภาคผนวก

### 8.1 โครงสร้างโฟลเดอร์เป้าหมาย
```
app/
  (public)/            # shopdash.co: landing, pricing, signup
  storefront/          # rewrite เป้าหมายของ {slug}.shopdash.co
  store-admin/         # rewrite เป้าหมายของ {slug}.shopdash.co/admin
  super-admin/         # rewrite เป้าหมายของ admin.shopdash.co
  api/                 # route handlers (checkout, slips, upload, signup, cron, domain)
components/
  storefront/  admin/  ui/
lib/
  supabase/  orders/  slip-verify/  tenant-context.ts  features.ts  promptpay.ts  r2.ts  line.ts  carriers.ts  discounts.ts
themes/
  tokens.css  presets/*.ts
supabase/
  migrations/  seed.sql
scripts/
  test-isolation.ts  seed-load.ts
CLAUDE.md  STATUS.md  DECISIONS.md
```

### 8.2 Environment variables (`.env.example` ต้องมีครบ)
```
NEXT_PUBLIC_SUPABASE_URL=            SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=       R2_ACCOUNT_ID=  R2_ACCESS_KEY_ID=  R2_SECRET_ACCESS_KEY=
R2_BUCKET=shopdash-prod              R2_PUBLIC_BASE_URL=
PLATFORM_PROMPTPAY_ID=               PLATFORM_PROMPTPAY_NAME=
ROOT_DOMAIN=shopdash.co              CRON_SECRET=
SLIP_VERIFY_PROVIDER=mock            SLIP_VERIFY_MOCK_MODE=pass|amount_mismatch
```

### 8.3 Git convention
- Commit: `feat(p1): product variant matrix`, `fix(p2): rls policy on customers` — prefix `p{phase}`
- จบทุกงานย่อยในตาราง §6 = 1 commit ขั้นต่ำ; จบ Phase = tag `phase-1-done` (หลังผ่าน DoD)

### 8.4 รูปแบบ STATUS.md (อัปเดตทุกเซสชัน)
```md
# STATUS
- Current phase: 1
- Last session: 2026-07-06
## Done
- [x] 1.1 โครงโปรเจ็ค
- [x] 1.2 migration 001 + seed
## In progress
- [ ] 1.5 CRUD สินค้า (เหลือ: ลากเรียงรูป)
## DoD checklist (Phase 1)
- [ ] ข้อ 1 e2e loop … (ยังไม่ทดสอบ)
## Blockers / Notes
- promptpay-qr ต้องใช้ v0.5.0 ขึ้นไป
```

### 8.5 สิ่งที่ห้ามทำเด็ดขาด (สรุปย้ำ)
1. ห้ามสร้างตาราง tenant-scoped ใหม่โดยไม่มี `tenant_id` + RLS (ตั้งแต่ P2)
2. ห้ามใช้ service role key ใน client component หรือส่งลง browser
3. ห้าม hardcode สี/ฟอนต์ใน storefront — ผ่าน token เท่านั้น
4. ห้าม update `orders.status` โดยไม่ผ่าน `lib/orders/transition.ts`
5. ห้ามเก็บไฟล์ binary ใน Postgres / ห้ามเสิร์ฟสลิปผ่าน public URL
6. ห้ามทำงานข้าม Phase / ห้ามประกาศ Phase เสร็จโดย DoD ไม่ครบ
7. ห้ามเชื่อข้อมูลราคา/ยอดจาก client — server คำนวณเองเสมอ

---
*จบเอกสาร — เริ่มงานที่ Phase 1 ลำดับ 1.1 และสร้าง STATUS.md เป็นไฟล์แรก*

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

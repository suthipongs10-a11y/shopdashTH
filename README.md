# ShopDash

แพลตฟอร์ม SaaS ให้ร้านค้าไทยขนาดเล็ก (เสื้อผ้า / แฟชั่น / ของเล่นเด็ก) เช่าใช้รายปีเพื่อเปิดร้านออนไลน์ของตัวเองบน subdomain (`{slug}.shopdashth.com`) หรือ custom domain ของร้านเอง — ชำระเงินลูกค้าปลายทางผ่าน PromptPay QR + อัปโหลดสลิป เข้าบัญชีร้านเต็มจำนวนโดยตรง ไม่มีการหักค่าคอมมิชชัน

## Stack

- **Next.js 15** (App Router, TypeScript) — 3 surface (storefront / store admin / super admin) แยกด้วย middleware routing ตาม hostname
- **Tailwind CSS v4** ผ่านระบบ design token (ธีม preset 10 แบบจาก component library กลางชุดเดียว)
- **Supabase** (Postgres + Auth + RLS) — multi-tenant ด้วย `tenant_id` + row-level security ทุกตาราง
- **Cloudflare R2** (S3-compatible) สำหรับรูปภาพและสลิปการชำระเงิน
- `promptpay-qr` + `qrcode` สำหรับสร้าง PromptPay QR แบบ dynamic ต่อออร์เดอร์

## เอกสารหลัก

- [`CLAUDE.md`](./CLAUDE.md) — สเปกโปรเจ็คฉบับเต็ม (สถาปัตยกรรม, data model, แผนงานแบ่งเฟส)
- [`STATUS.md`](./STATUS.md) — ความคืบหน้าปัจจุบันต่อเฟส
- [`DECISIONS.md`](./DECISIONS.md) — บันทึกการตัดสินใจที่เอกสารหลักไม่ครอบคลุม
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — ขั้นตอน deploy ขึ้น production

## เริ่มต้นใช้งาน

```bash
npm install
cp .env.example .env.local   # เติมค่า Supabase/R2/PromptPay ของคุณ
npm run dev
```

เปิด `http://demo.localhost:3000` (ร้านเดโม่) — ดูรายละเอียดตัวแปร environment ทั้งหมดใน `.env.example`

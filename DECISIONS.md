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

## 2026-07-06 — order_items.variant_id / stock_movements.variant_id ไม่มี FK
ตามตัวอักษรของ §3.4 (คอลัมน์อื่นเขียน references ชัดเจน แต่สองคอลัมน์นี้ไม่เขียน) — เจตนาคือ order_items เป็น snapshot ลบสินค้า/variant แล้วประวัติออร์เดอร์ต้องไม่พัง

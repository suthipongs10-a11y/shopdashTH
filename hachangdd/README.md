# หาช่างดีดี — hachangdd.com

เว็บ lead-gen บริการช่างท้องถิ่น (rank-and-rent) — เฟส 1: ล้างแอร์ × อุบลราชธานี 6 อำเภอ

Astro (static) + Tailwind CSS v4 → deploy บน Cloudflare Pages

> โปรเจกต์นี้อยู่ในโฟลเดอร์ `hachangdd/` และ **แยกขาดจากโปรเจกต์ ShopDash ที่รากเรพอ** ไม่แชร์ dependency หรือ config ใด ๆ

## เริ่มใช้งาน

```bash
cd hachangdd
npm install
npm run dev        # http://localhost:4321
```

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | build static → `dist/` |
| `npm run preview` | เปิดดูผลลัพธ์ที่ build แล้ว |
| `npm run check` | ตรวจ type ของ `.astro` / `.ts` |
| `npm run check:launch` | ด่านกัน launch ถ้าเบอร์โทร/LINE ยังเป็น placeholder |

## เอกสาร

- [`CLAUDE.md`](./CLAUDE.md) — สเปกฉบับเต็ม (URL, data model, template หน้าอำเภอ, milestones)
- [`STATUS.md`](./STATUS.md) — ความคืบหน้าปัจจุบัน + สิ่งที่รอ user ตัดสินใจ

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `hachangdd`

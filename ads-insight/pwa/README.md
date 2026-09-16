# pwa

แดชบอร์ด PWA (ภาษาไทย, mobile-first) ตาม [`docs/SPEC.md §11`](../docs/SPEC.md)

**ยังไม่สร้าง** — อยู่ใน **M6** หลังจาก change set pipeline (M4–M5) ใช้งานได้แล้ว
เพราะหน้าหลักของ PWA คือหน้า "รออนุมัติ" ซึ่งต้องมี change set จริงมาแสดง

Stack ที่ล็อกไว้ (SPEC §2 D6): Vite + React + TypeScript + Tailwind + `vite-plugin-pwa`
build เป็น static assets ของ Worker เดียวกัน (โดเมนเดียว ไม่มี CORS)

## เมื่อถึง M6
1. สร้าง Vite project ในโฟลเดอร์นี้ (มี `package.json` ของตัวเอง)
2. เพิ่ม `'pwa'` ใน `packages:` ของ `../pnpm-workspace.yaml`
3. เพิ่ม script `"dev:pwa": "pnpm --dir pwa dev"` ใน `../package.json`
4. เปิด block `[assets]` ใน `../wrangler.toml` (ชี้ไป `pwa/dist`)

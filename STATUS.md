# STATUS
- Current phase: 1
- Last session: 2026-07-06

## Done
- [x] 1.1 โครงโปรเจ็ค: Next.js 15.5 + Tailwind v4 + Supabase clients (`lib/supabase/{server,client,admin}.ts`) + `.env.example` — `pnpm build` ผ่าน, `.env.local` ผู้ใช้เติมค่าครบแล้ว
- [x] 1.2 Migration 001 (`supabase/migrations/001_init.sql`): helper functions + ทุกตาราง §3.3–3.4 + `supabase/seed.sql` (3 แพลน, ธีม basic-01, demo tenant/store/category fixed UUID) — **ยังไม่ได้ apply ลง Supabase จริง** (ไม่มี psql/docker/db password ในเครื่อง) ต้องรันผ่าน SQL Editor หรือ `supabase db push` ก่อนเริ่ม 1.5+

## In progress
- [ ] 1.3 Token system + preset basic-01 + component library storefront (§4.3) — ยังไม่เริ่ม

## DoD checklist (Phase 1)
- [ ] 1. e2e loop ครบวงจร (ยังไม่ทดสอบ)
- [ ] 2. ปฏิเสธสลิป/ยกเลิกออร์เดอร์คืนสต๊อก
- [ ] 3. สลิปไฟล์ซ้ำถูกกันด้วย unique(file_hash)
- [ ] 4. variant สต๊อก 0 กันทั้ง UI และ server
- [ ] 5. ไม่มี hex code ใน components/storefront
- [ ] 6. pnpm build ผ่าน ไม่มี type error

## Blockers / Notes
- **ต้อง apply migration 001 + seed ลง Supabase** — วิธี: Dashboard → SQL Editor → รัน `001_init.sql` แล้วตาม `seed.sql` (หรือ `supabase link` + `supabase db push` ถ้ามี access token)
- helper functions อยู่ `public.*` ไม่ใช่ `auth.*` — ดู DECISIONS.md (Phase 2 policies ต้องเรียก `public.app_tenant_id()`)
- Demo tenant fixed UUID: tenant `...0001`, store `...0002`, category `...0003` (slug `demo`, แพลน pro)
- @supabase/ssr ต้องใช้ ^0.12.0 (0.6.x มีปัญหา type ของ cookies setAll กับ Next 15 + TS strict)
- pnpm 11.5: อนุญาต build script ของ sharp ผ่าน `pnpm-workspace.yaml` (`allowBuilds`)

# STATUS
- Current phase: 1
- Last session: 2026-07-06

## Done
- [x] 1.1 โครงโปรเจ็ค: Next.js 15.5 + Tailwind v4 + Supabase clients (`lib/supabase/{server,client,admin}.ts`) + `.env.example` — `pnpm build` ผ่าน, `.env.local` ผู้ใช้เติมค่าครบแล้ว

## In progress
- [ ] 1.2 Migration 001: helper functions §3.2 + ทุกตาราง §3.3–3.4 + seed demo tenant/store/plans (ยังไม่เริ่ม)

## DoD checklist (Phase 1)
- [ ] 1. e2e loop ครบวงจร (ยังไม่ทดสอบ)
- [ ] 2. ปฏิเสธสลิป/ยกเลิกออร์เดอร์คืนสต๊อก
- [ ] 3. สลิปไฟล์ซ้ำถูกกันด้วย unique(file_hash)
- [ ] 4. variant สต๊อก 0 กันทั้ง UI และ server
- [ ] 5. ไม่มี hex code ใน components/storefront
- [ ] 6. pnpm build ผ่าน ไม่มี type error

## Blockers / Notes
- @supabase/ssr ต้องใช้ ^0.12.0 (0.6.x มีปัญหา type ของ cookies setAll กับ Next 15 + TS strict)
- pnpm 11.5: อนุญาต build script ของ sharp ผ่าน `pnpm-workspace.yaml` (`allowBuilds`)

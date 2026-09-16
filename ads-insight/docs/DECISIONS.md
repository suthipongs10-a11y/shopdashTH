# DECISIONS — Ads Insight

การตัดสินใจหลักที่ล็อกแล้วอยู่ใน `SPEC.md §2` (D1–D10)
ไฟล์นี้บันทึกการตัดสินใจใหม่ / การเปลี่ยนแปลง / จุดที่เอกสารภายนอกขัดกับ SPEC

| วันที่ | # | เรื่อง | ตัดสินใจ | เหตุผล / แหล่งอ้างอิง |
|---|---|---|---|---|
| 2026-09-16 | D11 | ใช้ OAuth access แบบ Cloud project (ไม่มี developer token) | ตาม Google เลิกใช้ developer token 9 ก.ย. 2026 | developers.google.com/google-ads/api/docs/api-policy/developer-token |
| 2026-09-16 | D12 | ที่อยู่ของโปรเจ็ค | วางเป็นโฟลเดอร์ `ads-insight/` ในรีโป `shopdashTH` และให้มี `pnpm-workspace.yaml` + `.npmrc` ของตัวเอง | รีโปแม่เป็นโปรเจ็ค ShopDash (Next.js) คนละ stack — ถ้าไม่ประกาศ workspace root ของตัวเอง `pnpm install` จะวิ่งขึ้นไปติดตั้ง dependency ของ ShopDash แทน (เจอจริงตอนตั้งโครง) |
| 2026-09-16 | D13 | แยก tsconfig เป็น 2 ชุด | `tsconfig.json` = `src/` (types: `@cloudflare/workers-types`) · `tsconfig.scripts.json` = `scripts/` + `test/` (types: `node`) · `pnpm typecheck` รันทั้งคู่ | ใช้ร่วมกันไม่ได้: `@cloudflare/workers-types` ประกาศ `declare const Buffer: any` ทับของ `@types/node` ทำให้ `randomBytes(n).toString('hex')` พังด้วย TS2554 · ผลพลอยได้คือบังคับให้ `src/` เป็น runtime-agnostic ตาม D1 โดยอัตโนมัติ (ถ้าเผลอเรียก API ของ Node ใน `src/` จะ type error ทันที) |
| 2026-09-16 | D14 | แยก validation ออกจาก bindings | `src/config.ts` = Zod schema + `parseConfig()` (ไม่แตะ global ของ runtime ไหนเลย) · `src/env.ts` = `interface Env` ของ Worker เท่านั้น | ต่อจาก D13 — เทสต์ฝั่ง Node ต้อง import logic ตัวนี้ได้โดยไม่ลาก workers-types เข้ามา และตรงกับ D1 ที่ให้ core ย้าย runtime ได้ |
| 2026-09-16 | D15 | ยังไม่เขียน `src/db/schema.sql` | ปล่อย `src/db/` ว่าง มีแต่ README ชี้ไป SPEC §10 | schema เป็นงาน M3 — ถ้าวางไฟล์ SQL ไว้ก่อน จะกลายเป็นของที่ "ดูเหมือนตัดสินใจแล้ว" ทั้งที่ยังไม่ได้ออกแบบ index/constraint จริง ขัดกับกฎ Gate |
| 2026-09-16 | D16 | route ที่ยังไม่ถึง milestone | ตอบ **501** พร้อมบอกชื่อ milestone ที่จะสร้าง แทนที่จะเป็น 404 | ทำให้แผนที่ route มองเห็นได้ตั้งแต่ M0 และแยกออกจาก "พิมพ์ URL ผิด" ได้ชัด |
| 2026-09-16 | D17 | สคริปต์ M0 อยู่ที่ `scripts/lib/` ไม่ใช่ `src/ads/` | `scripts/lib/{config,customer-id,google-auth,ads-rest}.ts` เป็นของใช้ชั่วคราวของ M0 | `src/ads/client.ts` เป็นงาน M1 (มี retry, quota counter, GAQL builder, error mapping เต็ม) — ถ้าเขียนทับตอนนี้คือทำงานข้าม milestone · โค้ดใน `scripts/` ตั้งใจให้บางและถูกแทนที่ |
| 2026-09-16 | D18 | `pnpm auth:google` เขียน refresh token ลง `.dev.vars` ให้เลย | ไม่พิมพ์ค่าเต็มออกหน้าจอ แสดงแค่แบบปิดบัง (`1//0abc…wxyz`) | กฎ "ห้าม log refresh token" ใน CLAUDE.md — การให้ผู้ใช้ copy จากเทอร์มินัลเท่ากับพิมพ์ค่าเต็มออกมา |

## รอยืนยัน (ยังไม่ตัดสินใจ)
- **`ADS_API_VERSION`** ตั้งต้น `v25` ตาม SPEC §4 แต่ยังไม่ได้เทียบกับเอกสาร Google จริง —
  SPEC ระบุให้ตรวจใน M1 ถ้าไม่ตรงให้บันทึกเป็น D19 ที่นี่ แล้วแก้ค่าใน `wrangler.toml` จุดเดียว

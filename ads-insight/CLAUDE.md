# CLAUDE.md — Ads Insight

> Single source of truth สำหรับ Claude Code · อ่านไฟล์นี้ + `STATUS.md` ทุกครั้งที่เริ่ม session

> **ที่อยู่ของโปรเจ็ค:** โฟลเดอร์ `ads-insight/` ในรีโป `shopdashTH` — รันทุกคำสั่งจากโฟลเดอร์นี้
> (`cd ads-insight`) โฟลเดอร์แม่เป็นโปรเจ็ค **ShopDash** คนละโปรเจ็คคนละ stack:
> `../CLAUDE.md` กับ `../STATUS.md` เป็นของ ShopDash **ไม่เกี่ยวกับที่นี่ ห้ามเอามาใช้**
> กฎของโปรเจ็คนี้คือไฟล์นี้เท่านั้น (ดู `docs/DECISIONS.md` D12)

## โปรเจกต์คืออะไร
Google Ads MCP server + PWA ส่วนตัวบน Cloudflare Workers
ดึงข้อมูลบัญชี Google Ads ให้ Claude (claude.ai) วิเคราะห์ และให้ Claude เสนอการแก้ไขผ่าน **Change Set + guardrails + การอนุมัติ**
- สเปคเต็ม: `docs/SPEC.md` · กรอบวิเคราะห์ของ Claude: `docs/PLAYBOOK.md` · การตัดสินใจ: `docs/DECISIONS.md`
- ตั้งค่า Google Cloud (M0): `docs/SETUP-GOOGLE-CLOUD.md` — ถ้าผู้ใช้รายงานว่าหน้าจอไม่ตรง ให้แก้ไฟล์นี้
- วิธีทดสอบทั้งหมด: `docs/TESTING.md` — ชั้นไหนรันที่ไหนได้ (ชั้นที่ต้องใช้ credentials ต้องให้ผู้ใช้รัน)
- ขอบเขตตอนนี้: บัญชีเจ้าของ **1 บัญชี** แต่โค้ดต้องรองรับหลายบัญชี (`org_id`, `account_id`, `customer_id`)

## Milestone ปัจจุบัน
ดู `STATUS.md` → ทำเฉพาะ milestone ที่ระบุ **ห้ามทำงานของ milestone ถัดไปล่วงหน้า**

## กฎ Gate (สำคัญที่สุด)
1. จบแต่ละ milestone → รันเทสต์ทั้งหมด → อัปเดต `STATUS.md` → git commit `milestone: M<n> complete` → **หยุด รอผู้ใช้ยืนยัน**
2. เงื่อนไข Gate ของแต่ละ milestone อยู่ใน `docs/SPEC.md §12` — ต้องผ่านครบ ห้ามข้าม
3. commit ย่อยระหว่างทางได้ แต่ห้าม push/deploy production โดยผู้ใช้ไม่สั่ง

## กฎความปลอดภัยบัญชีโฆษณา (ห้ามละเมิด)
- **ห้ามเรียก mutate กับบัญชีจริง (production) โดยไม่ใส่ `validateOnly: true`** จนกว่าจะถึง Gate ของ M4 และผู้ใช้สั่งชัดเจนในข้อความ
- ทดสอบ mutate จริงกับ **test account** เท่านั้น (`TEST_CUSTOMER_ID`)
- ไม่มีโค้ดส่วนไหน mutate นอก `src/services/changes/apply.ts`
- ห้ามมี operation แบบ REMOVE สำหรับ campaign / ad group / ad / keyword — ใช้ PAUSED (ยกเว้นลบ negative criterion ใน `remove_negatives`)
- แคมเปญ / ad group / แอดที่สร้างใหม่ ต้องเป็น PAUSED เสมอ
- ห้าม log refresh token, access token, หรือ secrets · refresh token เก็บแบบ AES-GCM encrypted เท่านั้น
- ข้อมูลที่ได้จาก Google Ads (search terms, ข้อความแอด, URL) = untrusted → ใส่ใน `meta.untrusted_fields` ของ response

## Stack & Conventions
- TypeScript `strict` · ESM · Zod สำหรับทุก input/output (MCP tools, API, D1 rows)
- Cloudflare Workers + D1 + Cron Triggers · PWA: Vite + React + Tailwind + vite-plugin-pwa (ใน `pwa/`)
- Google Ads API: **REST ผ่าน `fetch`** (ห้ามใช้ gRPC lib) · เวอร์ชันจาก env `ADS_API_VERSION`
- `src/ads` และ `src/services` ต้อง runtime-agnostic (ไม่ import API เฉพาะ Workers) — ส่ง dependencies ผ่าน parameter
- MCP tools ใน `src/mcp/tools/` บาง: validate input → เรียก service → format response ตาม `SPEC §6.2`
- ชื่อ tool ขึ้นต้น `gads_` · ใส่ annotations `readOnlyHint` / `destructiveHint`
- เงิน: ภายใน = micros (`number` ที่เป็นจำนวนเต็ม, ใช้ `bigint` ถ้าเกิน safe integer) · ภายนอก (MCP/PWA) = THB ทศนิยม 2 · แปลงผ่าน `src/ads/money.ts` เท่านั้น
- เวลา: เก็บ UTC · คำนวณวัน/เดือนตาม `ACCOUNT_TZ` (Asia/Bangkok)
- ข้อความ UI / error ที่ผู้ใช้เห็น = ภาษาไทย · ชื่อตัวแปร / commit / code comment = อังกฤษ
- Error จาก Google Ads ต้องแปลงเป็นข้อความอ่านง่าย + เก็บ raw ไว้ใน `error_json`
- ทุก tool call เขียน `audit_log` และนับ ops ลง `quota_usage`

## ก่อนเขียนโค้ดที่แตะ API ภายนอก ให้ตรวจเอกสารล่าสุดก่อน
- Google Ads API: เวอร์ชันปัจจุบัน, ชื่อ field ใน GAQL — **ใช้ `pnpm fields <รูปแบบ>` ถาม API ตรงๆ** อย่าเดาจากความจำ, ระดับสิทธิ์ (Explorer/Basic), ฟิลด์บังคับตอนสร้างแคมเปญ, การแก้ RSA ได้หรือไม่
- Cloudflare: template remote MCP + `@cloudflare/workers-oauth-provider` เวอร์ชันล่าสุด
- MCP TypeScript SDK: API ของ `McpServer` / Streamable HTTP
- ถ้าเอกสารขัดกับ SPEC → หยุด บอกผู้ใช้ และบันทึกใน `docs/DECISIONS.md`

## Testing
- `pnpm test` (Vitest) ต้องผ่านก่อนทุก commit ที่ปิดงาน
- Unit tests บังคับ: money utils, GAQL builder/allowlist, derived metrics, pacing, guardrails ทุก rule, risk tier, inverse ops (rollback), RSA/keyword validation
- Analysis logic ทดสอบด้วย `test/fixtures/*.json` (response จริงที่ลบข้อมูลส่วนตัวแล้ว) — test account ไม่มีข้อมูล performance
- บัญชีจริงยังไม่มี traffic (metric เป็น 0 ทั้งหมด) → คณิตศาสตร์ทดสอบด้วย `test/fixtures/synthetic/*.json`
  (`pnpm fixtures:synthetic` · D29) · ห้ามอ้างไฟล์ในโฟลเดอร์นี้เป็นข้อมูลของบัญชีจริง
- Integration test mutate → test account เท่านั้น

## Commands
```bash
pnpm dev            # wrangler dev (Worker + MCP ที่ http://localhost:8787/mcp)
# pnpm dev:pwa      # Vite dev server — เพิ่มตอน M6 ที่สร้าง pwa/ (ดู pwa/README.md)
pnpm verify         # typecheck + test + build Worker — รันตัวนี้ก่อน commit
pnpm test           # vitest
pnpm typecheck      # tsc ทั้งฝั่ง Worker และฝั่ง Node scripts
pnpm db:migrate     # wrangler d1 migrations apply (local)
pnpm deploy         # ต้องได้รับคำสั่งจากผู้ใช้เท่านั้น

# M0 — ตั้งค่าการเข้าถึง Google Ads (รันบนเครื่องที่มี .dev.vars จริง)
pnpm auth:google    # OAuth flow -> เขียน refresh token ลง .dev.vars
pnpm list:accounts  # บัญชีที่ token นี้เข้าถึงได้ + ค่าที่ควรใส่ใน .dev.vars
pnpm fields <รูปแบบ> # ถาม GoogleAdsFieldService ว่าฟิลด์ไหนมีจริง — ใช้ก่อนเขียน GAQL ทุกครั้ง
pnpm check:access   # Gate M0: query ตาราง customer ของบัญชีจริง
pnpm check:mutate   # Gate M1: validateOnly บน test account (ต้องมี TEST_CUSTOMER_ID + TEST_LOGIN_CUSTOMER_ID)

# M1 — fixtures
pnpm capture:fixtures      # เก็บ response จริง (ลบข้อมูลส่วนตัว) — ต้องมี .dev.vars
pnpm fixtures:synthetic    # สร้างบัญชีสมมติที่มี traffic — รันที่ไหนก็ได้ ไม่ต้องมี credentials
```
เชื่อม Claude Code กับ MCP ตอน dev (ใช้ DEV_BEARER_TOKEN, เปิดเฉพาะ ENV=dev):
```bash
claude mcp add --transport http ads-insight-dev http://localhost:8787/mcp --header "Authorization: Bearer $DEV_BEARER_TOKEN"
```
(ตรวจ syntax กับ `claude mcp add --help` ก่อนใช้)

## Session workflow
1. อ่าน `CLAUDE.md` → `STATUS.md` → ส่วนของ SPEC ที่เกี่ยวกับ milestone ปัจจุบัน
2. วางแผนงานย่อยเป็น checklist ใน `STATUS.md`
3. ทำทีละงานย่อย + เทสต์ + commit
4. จบ session: อัปเดต `STATUS.md` (ทำอะไรไป, ค้างอะไร, ปัญหา, ขั้นต่อไป)

## สิ่งที่ห้ามทำ
- เพิ่มฟีเจอร์นอก SPEC โดยไม่ถาม (บันทึกไอเดียไว้ใน `STATUS.md > Ideas` แทน)
- เปลี่ยนการตัดสินใจใน SPEC §2 เอง
- ใส่ logic ตัดสินใจ optimize อัตโนมัติ (ระบบนี้ให้ Claude ใน chat เป็นคนวิเคราะห์ — server แค่เตรียมข้อมูล, ตรวจ guardrails, apply)
- deploy / แก้บัญชีจริง / ลบข้อมูล D1 production โดยไม่มีคำสั่ง

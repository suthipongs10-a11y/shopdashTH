# STATUS — Ads Insight

**Milestone ปัจจุบัน:** M0 — Access & Setup
**อัปเดตล่าสุด:** 2026-09-16

## M0 Checklist

### ฝั่ง Google Cloud / Google Ads (ผู้ใช้ทำ — Claude Code ช่วยตรวจ)
> คู่มือทีละขั้นพร้อมลิงก์ตรง: [`docs/SETUP-GOOGLE-CLOUD.md`](docs/SETUP-GOOGLE-CLOUD.md)

- [x] สร้าง Google Cloud project + Enable Google Ads API (`ads-insight-508906`)
- [~] OAuth consent screen (External) → สถานะ **In production** — **ยังค้าง**
      Google บังคับ homepage URL + privacy policy URL ก่อนถึงจะกด Publish ได้ (ดู DECISIONS D21)
      กำลังทำหน้า https://ragalpha.com/privacy อยู่ (ร่างอยู่ที่ `docs/privacy-policy-template.md`)
      ถ้าค้างที่ Testing refresh token หมดอายุทุก 7 วัน — ใช้กับ cron ของ M3 ไม่ได้
- [x] OAuth Client (Web) + redirect URIs — `http://localhost:8787/connect/google/callback`
      - `http://localhost:8787/connect/google/callback` (dev — สคริปต์ `pnpm auth:google` ใช้ตัวนี้)
      - `https://<worker-domain>/connect/google/callback` และ `/oauth/google/callback` (prod, ใส่ตอน M2)
- [x] ขอ Explorer access — **อนุมัติแล้ว 17 ก.ย. 2569** (2,880 ops/วัน สำหรับบัญชีจริง + 15,000 สำหรับ test account)
- [ ] (แนะนำ) Brand verification → ขอ Basic access — จำเป็นถ้าจะใช้ `gads_research_keywords` (M5)
- [ ] Test manager account + test client account
- [ ] จด Customer ID จริง / login-customer-id (ถ้าผ่าน MCC) / TEST_CUSTOMER_ID

### ฝั่ง repo (Claude Code ทำ)
- [x] โครงโปรเจ็ค: package.json, tsconfig (แยก Worker / Node), vitest, .gitignore
- [x] `wrangler.toml` — vars, D1 binding, cron + assets เตรียมไว้แบบ comment รอ M3/M6
- [x] `.dev.vars.example` ครบทุก secret ตาม SPEC §5.4
- [x] `src/config.ts` + `src/env.ts` — validation ด้วย Zod, error ภาษาไทย
- [x] `src/index.ts` — router โครง + `GET /health` (บอกว่าตั้งค่าอะไรครบแล้วบ้าง)
- [x] `pnpm auth:google` — ขอ refresh token (เขียนลง `.dev.vars` ให้, ไม่พิมพ์ค่าเต็ม)
- [x] `pnpm list:accounts` — ไล่บัญชีที่ token เข้าถึงได้ (รวมบัญชีลูกใต้ MCC) + แนะนำค่า
      `DEFAULT_CUSTOMER_ID` / `LOGIN_CUSTOMER_ID` / `TEST_CUSTOMER_ID`
- [x] `pnpm check:access` — สคริปต์ Gate M0 (refresh token → access token → GAQL `customer`)
- [x] `pnpm test` ผ่าน (64 tests) · `pnpm typecheck` ผ่าน · `wrangler deploy --dry-run` ผ่าน
- [ ] `wrangler d1 create ads_insight` แล้วใส่ `database_id` ใน `wrangler.toml` (ยังเป็น `REPLACE_WITH_D1_DATABASE_ID`)
- [ ] กรอก `.dev.vars` จริง + `DEFAULT_CUSTOMER_ID` ใน `wrangler.toml`

### Gate M0
- [ ] `pnpm check:access <customer_id>` สำเร็จกับบัญชีจริง (ยังรอ credentials)

## คำตอบคำถาม SPEC §16
1. MCC หรือเข้าตรง:
2. Conversion actions ที่เป็นเป้าหมาย:
3. ประเภทแคมเปญปัจจุบัน:
4. งบรายวัน/รายเดือนสูงสุด:
5. ระดับสิทธิ์ API ที่ได้: **Explorer** (2,880 ops/วัน) — พอสำหรับบัญชีเดียว · ถ้าจะใช้ Keyword Planner (M5) ต้องขยับเป็น Basic ซึ่งต้องผ่าน brand verification

## ทำไปแล้ว
- ตั้งโครงโปรเจ็คทั้งหมดของ M0 (รายการด้านบน) — ทดสอบแล้วว่า Worker บูตได้จริง,
  `/health` ตอบถูก, route ที่ยังไม่ถึง milestone ตอบ 501 พร้อมบอกว่าอยู่ milestone ไหน
- ทดสอบ `pnpm check:access` / `pnpm list:accounts` ทุกเส้นทาง error: ไม่มี `.dev.vars` /
  secret ขาด / ไม่มี Customer ID / Customer ID ผิดรูปแบบ / credentials ผิด
  (ยิงจริงถึง Google แล้วได้ `invalid_client` พร้อมคำอธิบายไทย)
- ตอบคำถามเรื่อง Cloud project กับบัญชี Google Ads เป็นคนละ Gmail ได้ไหม → ได้ (DECISIONS D19)

## ค้าง / ปัญหา
- **ต้องยืนยัน `ADS_API_VERSION`** — ตอนนี้ตั้ง `v25` ตาม SPEC §4 ซึ่งเขียนไว้ว่า "ตรวจเวอร์ชันล่าสุดใน M1"
  ยังไม่ได้เทียบกับเอกสาร Google จริง ถ้าเวอร์ชันเปลี่ยน แก้ที่ `wrangler.toml` จุดเดียว
- **`list:accounts` / `check:access` ยังไม่เคยยิงบัญชีจริง** — เขียนตาม shape ที่เอกสาร Google ระบุ
  (`customers:listAccessibleCustomers` → `{resourceNames}`, `customer_client` → `level`/`status`/`hidden`
  ที่ REST ส่ง int64 มาเป็น string) และ unit test ครอบ parsing/จัดผัง/คำแนะนำไว้ 64 เคส
  แต่เส้นทาง network จริงยังรอ credentials — ถ้ารันแล้วผิด shape ให้แก้ที่ `scripts/lib/accounts.ts`
- เอกสาร Google บางหน้ายังเขียนว่าต้องส่ง header `developer-token` ซึ่งขัดกับ D11 —
  `explainAdsError()` ดักกรณีนี้ไว้แล้ว ถ้าเจอจริงให้บันทึกลง DECISIONS
- **นโยบาย developer token** — DECISIONS D11 บันทึกว่า Google ยกเลิก developer token เมื่อ 9 ก.ย. 2026
  สิทธิ์ผูกกับ Cloud project แทน ต้องยืนยันกับเอกสารล่าสุดตอนทำ M0 checklist ฝั่ง Google
- `src/db/` ยังว่าง (ตั้งใจ — schema เป็นงาน M3) · `pwa/` ยังว่าง (งาน M6)

## ขั้นต่อไป
- ผู้ใช้ทำ checklist ฝั่ง Google Cloud + กรอก `.dev.vars` →
  `pnpm auth:google` → `pnpm list:accounts` → `pnpm check:access`
- ผ่าน Gate M0 → **หยุดรอผู้ใช้ยืนยัน** → เริ่ม M1 Ads Core Client

## Ideas (นอก scope — รอพิจารณา)
-

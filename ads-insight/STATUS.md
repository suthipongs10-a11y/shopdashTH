# STATUS — Ads Insight

**Milestone ปัจจุบัน:** M0 — Access & Setup ✅ **ผ่าน Gate แล้ว** (รอผู้ใช้ยืนยันก่อนเริ่ม M1)
**อัปเดตล่าสุด:** 2026-09-16

## M0 Checklist

### ฝั่ง Google Cloud / Google Ads (ผู้ใช้ทำ — Claude Code ช่วยตรวจ)
> คู่มือทีละขั้นพร้อมลิงก์ตรง: [`docs/SETUP-GOOGLE-CLOUD.md`](docs/SETUP-GOOGLE-CLOUD.md)

- [x] สร้าง Google Cloud project + Enable Google Ads API (`ads-insight-508906`)
- [x] OAuth consent screen (External) → **In production** (17 ก.ย. 2569)
      ปลดล็อกด้วยการทำหน้า https://ragalpha.com/privacy + ใส่ Authorized domain `ragalpha.com`
      (ดู DECISIONS D21) → refresh token ไม่หมดอายุ 7 วันแล้ว ใช้กับ cron ของ M3 ได้
      หมายเหตุ: แอปยังไม่ผ่าน verification จำกัด 100 users ตลอดอายุโปรเจ็ค — เหลือเฟือสำหรับใช้เอง
- [x] OAuth Client (Web) + redirect URIs — `http://localhost:8787/connect/google/callback`
      - `http://localhost:8787/connect/google/callback` (dev — สคริปต์ `pnpm auth:google` ใช้ตัวนี้)
      - `https://<worker-domain>/connect/google/callback` และ `/oauth/google/callback` (prod, ใส่ตอน M2)
- [x] ขอ Explorer access — **อนุมัติแล้ว 17 ก.ย. 2569** (2,880 ops/วัน สำหรับบัญชีจริง + 15,000 สำหรับ test account)
- [ ] (แนะนำ) Brand verification → ขอ Basic access — ยังไม่ทำ จำเป็นเฉพาะถ้าจะใช้ `gads_research_keywords` (M5)
- [ ] Test manager account + test client account — **ยังไม่มี ต้องสร้างก่อนถึง M4**
- [x] จด Customer ID จริง — เก็บใน `.dev.vars` ไม่ commit (D24) · เข้าบัญชีตรง **ไม่มี MCC** จึงไม่ต้องใช้ `LOGIN_CUSTOMER_ID`

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
- [x] กรอก `.dev.vars` จริงครบ (client id/secret, refresh token, owner emails, keys, customer id)
- [ ] `wrangler d1 create ads_insight` แล้วใส่ `database_id` ใน `wrangler.toml` — **ยังไม่ทำ ไม่บังคับจนถึง M3**

### Gate M0 ✅ ผ่าน (17 ก.ย. 2569)
- [x] `pnpm check:access` สำเร็จกับบัญชีจริง — access token ออก, GAQL query ตาราง `customer` คืน 1 แถว
- [x] refresh token ใช้ได้ (consent screen อยู่ In production จึงไม่หมดอายุ 7 วัน)

## คำตอบคำถาม SPEC §16
1. MCC หรือเข้าตรง: **เข้าตรง** — `listAccessibleCustomers` คืนบัญชีเดียว ไม่ใช่ manager → ไม่ต้องส่ง header `login-customer-id`
2. Conversion actions ที่เป็นเป้าหมาย: **ยังไม่ทราบ** → ตรวจด้วย `gads_get_conversion_setup` ตอน M3
3. ประเภทแคมเปญปัจจุบัน: **ยังไม่ทราบ** → ดูตอน M1 ที่ดึง campaigns จริง
4. งบรายวัน/รายเดือนสูงสุด: **ยังไม่ทราบ — ต้องได้คำตอบก่อน M4** (เป็น hard guardrail ตาม SPEC §7.5)
5. ระดับสิทธิ์ API ที่ได้: **Explorer** (2,880 ops/วัน) — พอสำหรับบัญชีเดียว · ถ้าจะใช้ Keyword Planner (M5) ต้องขยับเป็น Basic ซึ่งต้องผ่าน brand verification

## ข้อมูลบัญชีที่ยืนยันแล้ว (จาก `pnpm check:access`)
| | |
|---|---|
| ชื่อบัญชี | AIS 12Call โปรเน็ต เว็ปค้นหา |
| Customer ID | อยู่ใน `.dev.vars` (ไม่ commit — D24) |
| ประเภท | บัญชีโฆษณาปกติ ไม่ใช่ manager ไม่ใช่ test account |
| สกุลเงิน | **THB** — ตรงกับที่ระบบสมมติ |
| ไทม์โซน | **Asia/Bangkok** — ตรงกับ `ACCOUNT_TZ` |
| auto-tagging | **เปิด** — conversion tracking มีโอกาสครบ (PLAYBOOK ข้อ 1) |

## ทำไปแล้ว
- ตั้งโครงโปรเจ็คทั้งหมดของ M0 (รายการด้านบน) — ทดสอบแล้วว่า Worker บูตได้จริง,
  `/health` ตอบถูก, route ที่ยังไม่ถึง milestone ตอบ 501 พร้อมบอกว่าอยู่ milestone ไหน
- ทดสอบ `pnpm check:access` / `pnpm list:accounts` ทุกเส้นทาง error: ไม่มี `.dev.vars` /
  secret ขาด / ไม่มี Customer ID / Customer ID ผิดรูปแบบ / credentials ผิด
  (ยิงจริงถึง Google แล้วได้ `invalid_client` พร้อมคำอธิบายไทย)
- ตอบคำถามเรื่อง Cloud project กับบัญชี Google Ads เป็นคนละ Gmail ได้ไหม → ได้ (DECISIONS D19)
- ผู้ใช้ทำฝั่ง Google Cloud เสร็จครบ 17 ก.ย. 2569: project `ads-insight-508906`, เปิด Google Ads API,
  scopes (`adwords` + `userinfo.email`), OAuth client + redirect URI, Explorer access อนุมัติ,
  consent screen = In production · ระหว่างทางเจอว่าคู่มือผิด 3 จุด แก้แล้วทั้งหมด

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
**หยุดรอผู้ใช้ยืนยันก่อนเริ่ม M1** (กฎ Gate ข้อ 1)

M1 — Ads Core Client จะสร้าง:
- `src/ads/client.ts` (searchStream รวม chunks, mutate แบบ validateOnly, retry/backoff, quota counter)
- `src/ads/gaql.ts` (query builder + field allowlist) · `money.ts` · `errors.ts` · `enums.ts`
- เก็บ fixtures จาก response จริงที่ลบข้อมูลส่วนตัวแล้ว — **ต้องให้ผู้ใช้รันสคริปต์บนเครื่องตัวเอง**
  เพราะ container ของ Claude Code ไม่มี (และไม่ควรมี) credentials

สิ่งที่ต้องได้จากผู้ใช้ระหว่าง M1:
- fixtures จากบัญชีจริง (campaigns + metrics 30 วัน)
- คำตอบ SPEC §16 ข้อ 2–4 (conversion actions, ประเภทแคมเปญ, งบสูงสุด)

## Ideas (นอก scope — รอพิจารณา)
-

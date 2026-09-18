# STATUS — Ads Insight

**Milestone ปัจจุบัน:** M1 — Ads Core Client (M0 ✅ ผ่าน Gate 17 ก.ย. 2569)
**อัปเดตล่าสุด:** 2026-09-18

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
2. Conversion actions ที่เป็นเป้าหมาย: **`PAGE_VIEW` (primary) — เป้าหมายคือ traffic/คลิก ไม่ใช่ lead**
   ผู้ใช้ยืนยันแล้ว 17 ก.ย. → `objective: 'traffic'` (DECISIONS D26)
3. ประเภทแคมเปญปัจจุบัน: Search · **ยังไม่เคยแสดงผลเลย** — 374 คีย์เวิร์ด (BROAD 362, EXACT 9, PHRASE 3)
   metric ทุกตัวเป็น 0 และไม่มี Quality Score สักตัว
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

## M1 Checklist — Ads Core Client

### Gate M1 (SPEC §12)
- [x] unit tests ผ่านครบ (233)
- [~] ดึง campaigns + metrics 30 วันของบัญชีจริงได้ — **ดึงสำเร็จแต่บัญชียังไม่มีข้อมูล**
      metric เป็น 0 ทั้งหมด · fixtures ที่ได้พิสูจน์ *โครงสร้าง* response ได้ แต่ทดสอบ *คณิตศาสตร์* ไม่ได้
      → แก้ด้วย fixtures สังเคราะห์ `test/fixtures/synthetic/` แล้ว (D29)
      → เหลือ `campaigns.json` ของจริง: ผู้ใช้รัน `pnpm capture:fixtures --only campaigns` แล้ว commit
- [ ] `validateOnly` บน **test account** ผ่าน ← **ต้องสร้าง test account ก่อน (ยังไม่มี)**

### งานย่อย
- [x] `ADS_API_VERSION` — **คงไว้ที่ v25** (ลองขยับเป็น v26 แล้วบัญชีจริงตอบ 404 จึงถอยกลับ)
      route ของ v26 มีอยู่จริงแต่ใช้กับบัญชีนี้ไม่ได้ · ยังไม่รู้สาเหตุแน่ชัดเพราะ body ของ 404 ว่างเปล่า
      v25 ทำงานปกติ ไม่บล็อกงาน — ดู DECISIONS D25
- [x] สคริปต์กลบ body ดิบด้วยข้อความที่เดาจาก status → แก้แล้ว ให้โชว์ body เสมอเมื่อแกะไม่ออก
- [x] `src/ads/money.ts` — micros ↔ THB (int64 มาเป็น string, ใช้ bigint ถ้าเกิน safe integer)
- [x] `src/ads/errors.ts` — GoogleAdsFailure → ข้อความไทย + เก็บ raw ไว้ + บอกว่า retry ได้ไหม
- [x] `src/ads/gaql.ts` — query builder + field allowlist + บังคับ SELECT-only, LIMIT ≤ 1000
- [~] `src/ads/enums.ts` — **เลื่อนไป M4/M5** ที่มีคนเรียกใช้จริง (SPEC ไม่ได้ระบุไว้ในงาน M1)
- [~] `src/ads/resources.ts` — **เลื่อนไป M4/M5** ตอนสร้าง mutate จริง
- [x] `src/ads/client.ts` — searchStream (รวม chunks), mutate (validateOnly), retry/backoff, quota counter
- [x] `pnpm capture:fixtures` + `scripts/lib/scrub.ts` — ผู้ใช้รันแล้ว 5 ไฟล์ commit เข้ามาแล้ว
- [x] **แก้บั๊ก scrubber ทับเงินด้วย id ปลอม** (D28) — งบ ฿1,080 ถูกบันทึกเป็น ฿1,000
      ตัวที่เห็นเป็น `"1080-000-0000"` เมื่อวานเป็นแค่อาการ ไม่ใช่สาเหตุ · เพิ่มด่าน
      `findMeasurementChanges()` ให้ capture ปฏิเสธการเขียนไฟล์ถ้าตัวเลขเปลี่ยน
- [x] `pnpm fixtures:synthetic` — fixtures สังเคราะห์ traffic-oriented (D29)
      3 แคมเปญ × 30 วัน + 18 คีย์เวิร์ด + 16 คำค้น + ราย ชั่วโมง · seed คงที่ regenerate แล้ว diff ว่าง
- [x] `test/unit/fixtures.test.ts` — อ่าน fixtures ที่ commit แล้ว: กันข้อมูลรั่ว (D30)
      + บังคับความสอดคล้องของ fixtures สังเคราะห์
- [x] unit tests — 233 ตัว (money, error mapping/retry, GAQL/injection, client, scrub, fixtures)

### ข้อจำกัดที่รู้ล่วงหน้า
- Claude Code ไม่มี credentials (และไม่ควรมี) → ส่วนที่ต้องยิง API จริงต้องให้ผู้ใช้รันบนเครื่อง
  แล้ว commit fixtures ที่ลบข้อมูลส่วนตัวแล้วกลับมา
- `src/ads` ต้อง runtime-agnostic → รับ `fetch` / token provider / quota counter เป็น parameter
  ห้าม import ของเฉพาะ Workers หรือ Node

## Ideas (นอก scope — รอพิจารณา)
- **ต่อกับ AI เจ้าอื่น (ChatGPT / Copilot / Gemini)** — ทำได้เลยโดยไม่ต้องแก้ transport (D27)
  งานที่ต้องเพิ่มตอน M2: tool `gads_get_playbook` + บังคับ `pwa_all` สำหรับ client ที่ไม่ไว้ใจ

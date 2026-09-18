# STATUS — Ads Insight

**Milestone ปัจจุบัน:** M2 — Remote MCP + Read Tools (M0 ✅ · M1 เริ่ม M2 ก่อนปิด gate — D34)
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
- [ ] Test manager account + test client account — **ยังไม่มี ต้องสร้างก่อนปิด Gate M1** (แก้จากเดิมที่เขียนว่า M4)
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
   metric ทุกตัวเป็น 0 และไม่มี Quality Score สักตัว — สาเหตุ: แคมเปญที่เปิดอยู่เพิ่งสร้าง 16 ก.ย. 2569
4. งบรายวัน/รายเดือนสูงสุด: **ยังไม่ทราบ — ต้องได้คำตอบก่อน M4** (เป็น hard guardrail ตาม SPEC §7.5)
   อ้างอิงจากของจริงตอนนี้: แคมเปญที่ ENABLED รวม **฿800/วัน** (฿500 + ฿300) ≈ ฿24,000/เดือน
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

### แคมเปญในบัญชี (จาก `test/fixtures/campaigns.json` — ชื่อถูกแทนด้วยนามแฝงตามลำดับ id)
| สถานะ | ประเภท | กลยุทธ์บิด | งบ/วัน | เริ่ม |
|---|---|---|---:|---|
| REMOVED | PERFORMANCE_MAX | MAXIMIZE_CONVERSIONS | ฿780.00 | 2024-12-19 |
| PAUSED | SEARCH | TARGET_SPEND | ฿1,900.00 | 2024-12-24 |
| REMOVED | SEARCH | TARGET_SPEND | ฿900.00 | 2024-12-20 |
| PAUSED | SEARCH | TARGET_SPEND | ฿1,125.00 | 2025-01-12 |
| REMOVED | SEARCH | TARGET_SPEND | ฿391.02 | 2025-10-26 |
| REMOVED | SEARCH | TARGET_IMPRESSION_SHARE | ฿100.00 | 2025-11-10 |
| **ENABLED** | SEARCH | TARGET_SPEND | **฿500.00** | **2026-09-16 19:53** |
| **ENABLED** | SEARCH | TARGET_SPEND | **฿300.00** | **2026-09-16 19:50** |

ทั้งสองตัวที่เปิดอยู่ใช้ `TARGET_SPEND` (Maximize clicks) — ตรงกับเป้าหมาย traffic (D26)
ไม่มีแคมเปญไหนตั้ง `end_date_time` เลย · `฿391.02` เป็นหลักฐานว่างบไม่ถูก scrubber ทับ (D28)

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
- [x] ดึง campaigns + metrics 30 วันของบัญชีจริงได้ — fixtures ครบ 6 ไฟล์ commit แล้ว
      **แต่ metric เป็น 0 ทั้งหมด** เพราะแคมเปญที่ ENABLED ทั้ง 2 ตัวเพิ่งสร้าง 16 ก.ย. 19:50/19:53
      (ดูตาราง "ข้อมูลบัญชี" ด้านล่าง) — ไม่ใช่ข้อผิดพลาด บัญชียังใหม่
      → ทดสอบคณิตศาสตร์ด้วย fixtures สังเคราะห์ `test/fixtures/synthetic/` แทน (D29)
      → **ควรรัน `pnpm capture:fixtures` ซ้ำอีกครั้งราวต้น ต.ค.** เมื่อบัญชีมี traffic จริงแล้ว
- [ ] `validateOnly` บน **test account** ผ่าน ← **บล็อกอยู่ที่ข้อจำกัดแพลตฟอร์ม ไม่ใช่บั๊ก**
      สคริปต์พร้อมหมดแล้ว (`pnpm check:mutate` ใช้ `src/ads/client.ts` ตัวจริง) มี test manager
      (372-340-9601) + test client (470-557-4425) แล้ว แต่ client ติด `CUSTOMER_NOT_ENABLED` (403)
      ลองแก้ไปแล้ว 3 ทาง **ตันทั้งหมดที่สิทธิ์ Explorer**:
      1. รอเวลา (ลองข้ามชั่วโมง ไม่หาย)
      2. สร้างผ่าน API ตรง (`pnpm create:test-client`) → 403 `DEVELOPER_TOKEN_NOT_APPROVED`
         ต้องมีสิทธิ์ Basic ขึ้นไป (D32) — เก็บสคริปต์ไว้ใช้ตอนได้ Basic
      3. กรอก wizard สร้างแคมเปญให้จบแทนกด ✕ → จบที่ขั้นใส่ billing ซึ่งห้ามทำ (D33)
      **ผู้ใช้ตัดสินใจ 18 ก.ย.: รอเพิ่มก่อน** (ไม่ขอ Basic access ตอนนี้, ไม่ข้าม gate)
      → เซสชันถัดไป: บอกให้ลอง `pnpm check:mutate` อีกครั้งก่อนทำอย่างอื่น ถ้ายังไม่ผ่าน
      ถามอีกครั้งว่าจะรอต่อหรือขอ Basic access

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

---

## M2 Checklist — Remote MCP + Read Tools ⭐

> เริ่มก่อน M1 gate ปิดสนิท — ข้อยกเว้นที่ผู้ใช้สั่งชัดเจน (D34) M1 gate ยังค้างอยู่ ดูหัวข้อ M1 ด้านบน

### Gate M2 (SPEC §12)
- [ ] เพิ่ม custom connector ใน claude.ai สำเร็จ
- [ ] ใช้บนมือถือได้
- [ ] Claude ทำ weekly audit จากข้อมูลจริงได้ครบตาม PLAYBOOK
- [ ] `pnpm deploy` — **รอคำสั่งผู้ใช้เท่านั้น** (CLAUDE.md)

### งานย่อย
- [x] เพิ่ม dependency: `@modelcontextprotocol/sdk@1.30.0`, `@cloudflare/workers-oauth-provider@0.10.3`
      (ตรวจจาก source จริงที่ดาวน์โหลดมาอ่าน ไม่ใช่เดา — README + .d.ts)
- [x] `wrangler.toml`: compat flag `global_fetch_strictly_public` (CIMD) + KV binding `OAUTH_KV`
- [x] `src/auth/google.ts` — Google OAuth (login เท่านั้น, คนละตัวกับ scope `adwords` ที่ user เชื่อมทีหลัง)
- [x] `src/auth/pending-login.ts` — เก็บ `AuthRequest` เดิมของ MCP client ระหว่างพาไป login Google
- [x] `src/ads/token.ts` — refresh access token ของ Google Ads เอง (คนละตัวกับ Google login ข้างบน)
- [x] `src/oauth.ts` — ประกอบ `OAuthProvider`, `/authorize`, `/oauth/google/callback`, allowlist check
      **ทดสอบ live ผ่าน `wrangler dev` จริงแล้ว** ครบทุก branch ยกเว้นการ login Google จริง
      (DCR register → authorize redirect ไป Google ถูกต้อง → access_denied กลับไป client เดิม
      พร้อม state เดิม → replay/bogus state ถูกปฏิเสธ → 401 WWW-Authenticate ถูกต้อง)
- [x] Dev bypass: `ENV=dev` + `Authorization: Bearer $DEV_BEARER_TOKEN` ข้าม OAuth เต็มรูปแบบ (SPEC §5.1)
      ทดสอบแล้ว: initialize → tools/list → tools/call ผ่าน MCP protocol จริง
- [ ] `src/services/format.ts` + `metrics.ts` — response shape มาตรฐาน (§6.2), derived metrics, truncate+others
- [x] `src/mcp/server.ts` — bootstrap `McpServer` (stateless — ไม่ต้องมี Durable Object ใน M2)
- [ ] Read tools (§12 M2 — 10 ตัวเท่านั้น ที่เหลือเป็น M3):
  - [x] `gads_run_gaql` — ทดสอบ live: query ถูกต้องไปถึง Google, query อันตราย (DELETE) ถูกบล็อกก่อนออกจาก Worker
  - [ ] `gads_get_conversion_setup`
  - [ ] `gads_get_bidding_status`
  - [ ] `gads_get_impression_share`
  - [ ] `gads_get_keywords`
  - [ ] `gads_get_search_terms`
  - [ ] `gads_get_ads`
  - [ ] `gads_get_time_performance`
  - [ ] `gads_get_performance`
  - [ ] `gads_get_account_overview` (ส่วน goals/alerts/change-sets ยังไม่มีเพราะ D1 เป็นงาน M3 — ใส่เฉพาะที่มีข้อมูลจริงตอนนี้)
- [ ] `gads://playbook` resource + `gads_get_playbook` tool (D27)
- [ ] `docs/PLAYBOOK.md` ต้องมีอยู่แล้วให้ resource อ่าน (เช็คว่ามีเนื้อหาพอหรือยัง)
- [ ] อัปเดต `.dev.vars.example` ให้ครบทุกตัวแปรใหม่ (`GOOGLE_ADS_REFRESH_TOKEN` เพิ่ม M0 แล้ว ไม่ใช่ใหม่จาก M2)
- [x] `/connect/google` ในสตับ `src/index.ts` แก้ milestone จาก M2 → M3 (D1 storage ของมันยังไม่มี)

### หมายเหตุ
- อ่านเฉพาะ `DEFAULT_CUSTOMER_ID` (บัญชีจริง) ไม่เกี่ยวกับ test account ที่ยังบล็อกอยู่ — M2 read-only ไม่ต้องรอ M1 gate ปิดจริงๆ (เหตุผลที่ D34 ประเมินความเสี่ยงต่ำ)
- `gads_get_recommendations`, `gads_get_audience_breakdown`, `gads_get_landing_pages`, `gads_get_policy_issues`, `gads_get_assets`, `gads_get_change_history` เป็นงาน **M3** ห้ามทำล่วงหน้า

# Ads Insight — SPEC v1

> Google Ads MCP + PWA ส่วนตัว: ดึงข้อมูลบัญชี Google Ads ออกมาให้ Claude วิเคราะห์ แล้วเสนอ/สร้าง/แก้ไขแคมเปญผ่านระบบอนุมัติ เพื่อให้ได้ตามเป้าหมาย
> สถานะ: Draft v1 · อัปเดต: ก.ย. 2026 · ขอบเขตรอบแรก: บัญชี Google Ads ของเจ้าของ 1 บัญชี (ออกแบบเผื่อหลายบัญชี/ลูกค้า)

---

## 1. แนวคิดหลัก

**Claude = สมอง · MCP = มือกับตา · PWA = แดชบอร์ด + ปุ่มอนุมัติ**

- ระบบนี้ **ไม่ใช่เครื่องมือ optimize อัตโนมัติ** ไม่มี rule engine ตัดสินใจเอง
- หน้าที่ของระบบคือ
  1. ดึงข้อมูลให้ **ครบ สะอาด คำนวณตัวชี้วัดพร้อม และกระชับพอให้ LLM อ่านได้**
  2. เก็บ **เป้าหมาย, ประวัติ, บันทึกการทดลอง** เพื่อให้ Claude ทำงานต่อเนื่องข้ามแชทได้
  3. รับคำสั่งแก้ไขเป็น **Change Set** → ตรวจ guardrails → ทดสอบกับ Google (`validateOnly`) → รออนุมัติ → apply → ย้อนกลับได้ → วัดผลหลังเปลี่ยน
- การวิเคราะห์และตัดสินใจทั้งหมดอยู่ใน Claude (ดู `docs/PLAYBOOK.md`)

### เป้าหมายการใช้งานจริง (ตัวอย่างคำสั่งผู้ใช้)
- "เช็คบัญชีหน่อย สัปดาห์นี้เป็นยังไง ต้องปรับอะไร"
- "เดือนนี้งบ 15,000 อยากได้ 60 ลีด ทำได้ไหม ต้องตั้งงบรายวันเท่าไหร่"
- "หาคำค้นที่เผาเงิน แล้วใส่ negative ให้"
- "ช่วงเวลาไหนคุ้มสุด ควรตั้ง ad schedule ยังไง"
- "สร้างแคมเปญ Search ใหม่สำหรับบริการ X งบวันละ 500"
- "เปลี่ยนไป Maximize Conversions + tCPA ดีไหม ตั้งเท่าไหร่"
- "ผลของการเปลี่ยนแปลงเมื่อ 2 สัปดาห์ก่อนเป็นยังไง"

---

## 2. การตัดสินใจหลัก (Locked)

| # | เรื่อง | ตัดสินใจ | เหตุผล |
|---|---|---|---|
| D1 | Runtime | Cloudflare Workers (1 Worker รวม MCP + API + OAuth + Cron + PWA static) | HTTPS ฟรี, ไม่ต้องดูแลเซิร์ฟเวอร์, cron ในตัว, ถูก |
| D2 | DB | Cloudflare D1 (SQLite) | ฟรี tier พอสำหรับบัญชีเดียว, SQL ธรรมดา ย้ายง่าย |
| D3 | Google Ads API | เรียก **REST** โดยตรงด้วย `fetch` + wrapper ของเราเอง | Workers ไม่รองรับ gRPC; ไม่ผูกกับ lib ภายนอกที่อัปเดตช้ากว่า API |
| D4 | MCP transport | Remote MCP แบบ **Streamable HTTP** + **OAuth (รองรับ DCR)** | Claude.ai / Desktop / มือถือ ใช้ connector ตัวเดียวกันได้ |
| D5 | ภาษา | TypeScript strict + Zod ทุก input/output | schema เดียวใช้ทั้ง MCP, API, PWA |
| D6 | PWA | Vite + React + TS + Tailwind + vite-plugin-pwa → build เป็น static assets ของ Worker | โดเมนเดียว ไม่มี CORS |
| D7 | การเขียนข้อมูลลงบัญชี | ต้องผ่าน Change Set ทุกครั้ง ห้ามมี tool ที่ mutate ตรง | ปลอดภัย, ตรวจย้อนหลังได้, rollback ได้ |
| D8 | การลบ | **ไม่มีการลบ** (REMOVE) ในระบบ — ใช้ PAUSE แทน | กันพลาดแบบย้อนไม่ได้ |
| D9 | ของใหม่ที่สร้าง | แคมเปญ/แอดใหม่ถูกสร้างเป็น **PAUSED** เสมอ | ต้องเปิดผ่าน change set แยก |
| D10 | Multi-tenant | รอบแรก 1 org / 1 บัญชี แต่ทุกตารางมี `org_id` + `account_id` และทุก tool รับ `customer_id` (optional) | อัปเกรดเป็นดูแลลูกค้าได้โดยไม่ต้องรื้อ |

> ทางเลือกสำรองของ D1: Node + Hono บน VPS — ให้โค้ด `src/ads`, `src/services` เป็น runtime-agnostic (ไม่เรียก API เฉพาะ Workers) เพื่อย้ายได้

---

## 3. สถาปัตยกรรม

```
┌────────────── Claude (claude.ai / Desktop / มือถือ / Claude Code) ──────────────┐
│  วิเคราะห์ · วางกลยุทธ์ · เสนอ Change Set · สรุปรายงาน                              │
└───────────────┬─────────────────────────────────────────────────────────────────┘
                │ MCP (Streamable HTTP + OAuth)
┌───────────────▼─────────────── Cloudflare Worker: ads-insight ───────────────────┐
│ /mcp            → MCP server (tools / prompts / resources)                        │
│ /oauth/*        → OAuth provider สำหรับ Claude (login ด้วย Google, allowlist email) │
│ /api/*          → REST สำหรับ PWA                                                 │
│ /connect/google → เชื่อมบัญชี Google Ads (scope adwords, offline)                   │
│ cron            → snapshot รายวัน, ตรวจความผิดปกติ, แจ้งเตือนรีวิวผล                  │
│ static          → PWA                                                             │
│                                                                                   │
│ src/ads/        Google Ads REST client · GAQL builder · mutate · error mapping     │
│ src/services/   metrics · pacing · goals · changes (guardrails/apply/rollback)     │
│ src/mcp/        tool definitions (thin — เรียก services)                          │
└───────────────┬───────────────────────────────┬───────────────────────────────────┘
                │                               │
        Google Ads API (REST)            D1 (goals, snapshots, change sets, insights, audit)
```

### โครงไฟล์
```
ads-insight/
├─ CLAUDE.md
├─ STATUS.md
├─ docs/  SPEC.md · PLAYBOOK.md · DECISIONS.md
├─ src/
│  ├─ index.ts                 # router: /mcp /oauth /api /connect + scheduled()
│  ├─ env.ts                   # typed env/secrets
│  ├─ auth/                    # oauth provider, google login, owner allowlist, session
│  ├─ ads/
│  │  ├─ client.ts             # searchStream, mutate, retry, quota counter
│  │  ├─ gaql.ts               # query builder + field allowlist
│  │  ├─ resources.ts          # resource name helpers, temp IDs
│  │  ├─ money.ts              # THB <-> micros
│  │  ├─ errors.ts             # GoogleAdsFailure -> ข้อความอ่านง่าย
│  │  └─ enums.ts
│  ├─ services/
│  │  ├─ reports/              # performance, search terms, keywords, ads, time, audience...
│  │  ├─ metrics.ts            # derived metrics, deltas, low-data flags
│  │  ├─ goals.ts · pacing.ts
│  │  ├─ changes/              # schema, guardrails, risk, build-mutate, apply, rollback, review
│  │  ├─ snapshots.ts · alerts.ts · insights.ts
│  │  └─ format.ts             # จัดรูปผลลัพธ์ให้ LLM (ตัดแถว, รวม others, meta)
│  ├─ mcp/
│  │  ├─ server.ts
│  │  ├─ tools/*.ts
│  │  ├─ prompts.ts
│  │  └─ resources.ts
│  ├─ api/                     # endpoints ของ PWA
│  └─ db/  schema.sql · migrations/
├─ pwa/                        # Vite React app
├─ test/  fixtures/ (JSON response จริงที่ลบข้อมูลส่วนตัวแล้ว) · unit/ · integration/
└─ wrangler.toml
```

---

## 4. การเข้าถึง Google Ads API (M0 — ผู้ใช้ทำ, Claude Code ช่วยเช็ค)

> ⚠️ นโยบาย API เปลี่ยนเมื่อ ก.ย. 2026: **developer token ถูกยกเลิก** สิทธิ์การเข้าถึงผูกกับ **Google Cloud project** แทน — ทุกขั้นตอนต้องเช็คกับเอกสารล่าสุดที่ developers.google.com/google-ads/api ก่อนทำ

| ระดับสิทธิ์ | ใช้กับ | โควตา/วัน | หมายเหตุ |
|---|---|---|---|
| Test | บัญชีทดสอบเท่านั้น | 15,000 | ได้ทันทีเมื่อเปิด API |
| **Explorer** | บัญชีจริง + ทดสอบ | 2,880 (บัญชีจริง) | ขอใน Cloud Console, อาจอนุมัติอัตโนมัติ · **ใช้ Keyword Planner/Reach/Audience Insights ไม่ได้** |
| **Basic** | บัญชีจริง + ทดสอบ | 15,000 | ต้องทำ brand verification ของ Cloud project ก่อน · จำเป็นสำหรับ Keyword Planner |
| Standard | ไม่จำกัด | — | เฉพาะเครื่องมือที่ให้คนภายนอกใช้ · มี RMF audit — **ยังไม่ต้องใช้** |

### Checklist M0
1. สร้าง Google Cloud project `ads-insight` → Enable **Google Ads API**
2. สร้าง OAuth consent screen (External) + OAuth Client (Web application)
   - Redirect URIs: `https://<worker-domain>/connect/google/callback`, `https://<worker-domain>/oauth/google/callback`, `http://localhost:8787/...` (dev)
   - Scopes: `openid email` (login) และ `https://www.googleapis.com/auth/adwords` (Ads)
   - ⚠️ ถ้า consent screen อยู่ในสถานะ **Testing** refresh token อาจหมดอายุใน 7 วัน → เปลี่ยนเป็น **In production** (ใช้เองได้แม้ขึ้นเตือน unverified app) — ตรวจกับเอกสาร Google OAuth ล่าสุด
3. ขอ **Explorer access** ใน Google Ads API Overview ของ Cloud project
4. (แนะนำ) ทำ brand verification แล้วขอ **Basic** เพื่อเปิด Keyword Planner
5. สร้าง **Test manager account + test client account** สำหรับทดสอบ mutate (บัญชีทดสอบไม่มีข้อมูล performance → ใช้ fixtures ทดสอบส่วนวิเคราะห์)
6. จด: Customer ID บัญชีจริง (ไม่มีขีด), ถ้าเข้าผ่าน MCC ให้จด login-customer-id, currency (THB), time zone (Asia/Bangkok)
7. ยิง query ทดสอบ `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer` สำเร็จ

### REST พื้นฐาน (ตรวจเวอร์ชันล่าสุดใน M1 — ณ ก.ย. 2026 อ้างอิง v25)
- `POST https://googleads.googleapis.com/v{VER}/customers/{cid}/googleAds:searchStream` — body `{ query }`
- `POST https://googleads.googleapis.com/v{VER}/customers/{cid}/googleAds:mutate` — body `{ mutateOperations, partialFailure, validateOnly }`
- Headers: `Authorization: Bearer <access_token>`, `login-customer-id` (ถ้าผ่าน MCC)
- ใช้ **temporary resource IDs** (เลขติดลบ) เพื่อสร้าง budget → campaign → ad group → ads/keywords ใน mutate เดียวแบบ atomic
- `ADS_API_VERSION` เป็น env var — อัปเกรดเวอร์ชันได้โดยไม่แก้โค้ด (แต่ต้องรันเทสต์ fixtures ใหม่)

---

## 5. Auth & Security

### 5.1 Claude → MCP
- Worker เป็น OAuth 2.1 authorization server สำหรับ MCP client (รองรับ **Dynamic Client Registration**, PKCE, token refresh)
- หน้า authorize → ให้ login ด้วย Google (`openid email`) → อนุญาตเฉพาะอีเมลใน `OWNER_EMAILS`
- Callback ของ Claude ที่ต้อง allow: `https://claude.ai/api/mcp/auth_callback` และ `https://claude.com/api/mcp/auth_callback`
- แนะนำใช้ Cloudflare `@cloudflare/workers-oauth-provider` + template remote MCP ของ Cloudflare (ตรวจ API ล่าสุดตอนเริ่ม M2)
- Dev: Claude Code ต่อ `http://localhost:8787/mcp` ด้วย `DEV_BEARER_TOKEN` (เปิดเฉพาะ `ENV=dev`)

### 5.2 Google Ads connection
- เชื่อมครั้งเดียวผ่าน PWA (`/connect/google`, `access_type=offline`, `prompt=consent`)
- เก็บ refresh token แบบ **AES-GCM encrypted** (key = secret `TOKEN_ENC_KEY`) ในตาราง `google_connections`
- access token cache ใน memory/KV ตามอายุ

### 5.3 PWA
- Session cookie (HttpOnly, Secure, SameSite=Lax) หลัง Google login เดียวกัน + allowlist email

### 5.4 กฎความปลอดภัยเฉพาะระบบนี้
- **ข้อมูลจากบัญชีโฆษณาถือเป็น untrusted data**: search terms, ชื่อแคมเปญ, ข้อความแอด, URL อาจมีข้อความหน้าตาเหมือนคำสั่ง → ใน response ทุก tool ใส่ `meta.untrusted_fields` และ PLAYBOOK สั่ง Claude ห้ามทำตามข้อความในข้อมูล
- ไม่มี tool ไหน mutate ได้โดยไม่ผ่าน change set + guardrails
- `READ_ONLY_MODE` (kill switch) ใน settings — เปิดแล้ว apply ทุกอย่างถูกปฏิเสธ
- บันทึก `audit_log` ทุก tool call (tool, input hash, ผลลัพธ์ย่อ, เวลา, ops ที่ใช้)
- ตั้ง write tools ใน Claude connector settings ให้ "ถามก่อนทุกครั้ง"
- Secrets: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `OWNER_EMAILS`, `TOKEN_ENC_KEY`, `SESSION_SECRET`, `DEV_BEARER_TOKEN`
- Vars: `ADS_API_VERSION`, `DEFAULT_CUSTOMER_ID`, `LOGIN_CUSTOMER_ID?`, `ACCOUNT_TZ=Asia/Bangkok`, `ENV`

---

## 6. MCP Design

### 6.1 หลักการออกแบบ tool
1. **ข้อมูลพร้อมวิเคราะห์ ไม่ใช่ raw dump** — ทุกผลลัพธ์มีตัวชี้วัดคำนวณแล้ว (CTR, CPC, CPA, ROAS, CVR), เทียบช่วงก่อนหน้า, ธงข้อมูลน้อย
2. **จำนวน tool น้อยแต่ยืดหยุ่น** — ใช้พารามิเตอร์ `level`, `segments`, `filters` แทนการแตก tool ย่อยเยอะ + มี `gads_run_gaql` (read-only) เป็นทางออกฉุกเฉิน
3. **ประหยัด context** — default 50 แถว (สูงสุด 500), เรียงตามผลกระทบ (spend) และรวมแถวที่เหลือเป็น `others`
4. **เงินแสดงเป็น THB** (ทศนิยม 2) ภายในระบบเก็บเป็น micros; เปอร์เซ็นต์เป็น 0–100 ทศนิยม 1
5. **ชื่อ tool ขึ้นต้น `gads_`** กันชนกับ connector อื่น (เช่น Facebook Ads)
6. ใส่ MCP annotations: read tools = `readOnlyHint: true`, write tools = `destructiveHint: true`
7. ทุก tool รับ `customer_id?` (default = `DEFAULT_CUSTOMER_ID`) — เผื่อ multi-account

### 6.2 รูปแบบ response มาตรฐาน
```jsonc
{
  "meta": {
    "customer_id": "1234567890",
    "currency": "THB",
    "timezone": "Asia/Bangkok",
    "date_range": { "start": "2026-09-01", "end": "2026-09-14" },
    "compare_range": { "start": "2026-08-18", "end": "2026-08-31" },
    "data_freshness": "ข้อมูลอาจล่าช้าได้หลายชั่วโมง; conversion ย้อนหลังยังเพิ่มได้",
    "conversion_lag_warning": "3 วันล่าสุด conversion ยังไม่ครบ",
    "row_count": 120, "returned": 50, "truncated": true,
    "untrusted_fields": ["search_term", "headline_text"],
    "ops_used": 2, "ops_remaining_today": 2711
  },
  "summary": { "cost": 8420.5, "conversions": 31, "cpa": 271.6, "delta_pct": { "cost": 12.4, "cpa": -8.1 } },
  "rows": [ /* objects, key สั้นและคงที่ */ ],
  "warnings": ["แคมเปญ A อยู่ใน learning period", "conversion action 'call' ไม่ใช่ primary"]
}
```

### 6.3 Read tools

| Tool | ทำอะไร | ข้อมูลหลัก (GAQL resources) |
|---|---|---|
| `gads_get_account_overview` | ภาพรวม: ข้อมูลบัญชี, แคมเปญทั้งหมด+สถานะ, เป้าหมาย, guardrails, สิทธิ์ API/โควตา, alerts ค้าง, change sets ค้าง | customer, campaign, campaign_budget + D1 |
| `gads_get_performance` | performance ยืดหยุ่น: `level` = account/campaign/ad_group/ad/keyword · `segments` = date/week/month/device/network · compare period | metrics.* ทุกระดับ |
| `gads_get_goal_progress` | เทียบเป้า: ใช้ไป MTD, ผลลัพธ์, CPA/ROAS จริง vs เป้า, projected สิ้นเดือน, **งบรายวันที่ต้องใช้เพื่อถึงเป้า**, สถานะ on_track/at_risk/off_track | snapshots + goals |
| `gads_get_search_terms` | คำค้นจริง + keyword ที่ match + สถานะ added/excluded + ธงเผาเงิน (spend สูง ไม่มี conversion) | search_term_view |
| `gads_get_keywords` | keyword + match type + bid + **Quality Score และ 3 องค์ประกอบ** + IS + สถานะ serving | keyword_view, ad_group_criterion.quality_info |
| `gads_get_ads` | RSA: headlines/descriptions + pin + **performance label ราย asset** + ad strength + policy status | ad_group_ad, ad_group_ad_asset_view |
| `gads_get_time_performance` | ตาราง **ชั่วโมง × วันในสัปดาห์** (clicks, cost, conv, CPA) + ธงช่องที่ข้อมูลน้อย + รวมเป็นช่วง 3 ชม. อัตโนมัติถ้าข้อมูลน้อย + ad schedule ปัจจุบัน | segments.hour, segments.day_of_week, campaign_criterion (AD_SCHEDULE) |
| `gads_get_audience_breakdown` | device, พื้นที่ (จังหวัด/เมือง), อายุ, เพศ | segments.device, user_location_view / geographic_view, age_range_view, gender_view |
| `gads_get_impression_share` | IS, top/abs-top IS, **เสียเพราะงบ vs เสียเพราะอันดับ** ต่อแคมเปญ | metrics.search_*_impression_share |
| `gads_get_bidding_status` | กลยุทธ์บิดปัจจุบัน, target, สถานะ learning/limited, ประวัติเปลี่ยนกลยุทธ์ | campaign.bidding_strategy_*, change log |
| `gads_get_conversion_setup` | conversion actions, primary/secondary, counting type, สถานะ, auto-tagging | conversion_action, customer |
| `gads_get_landing_pages` | performance ราย landing page (final URL) | landing_page_view |
| `gads_get_policy_issues` | แอด/asset/keyword ที่ไม่อนุมัติหรือจำกัด พร้อมเหตุผล | policy_summary fields |
| `gads_get_assets` | sitelinks, callouts, structured snippets, call — ระดับแคมเปญ/บัญชี + performance | asset, campaign_asset, customer_asset |
| `gads_get_recommendations` | คำแนะนำจาก Google (ให้ Claude ประเมิน **ไม่ apply อัตโนมัติ**) | recommendation |
| `gads_get_change_history` | change sets ของเรา + การแก้ไขจากนอกระบบ (Google UI) | D1 + change_event (ย้อนได้จำกัด ~30 วัน) |
| `gads_research_keywords` | ไอเดียคีย์เวิร์ด, ปริมาณค้นหา, ช่วง CPC, การแข่งขัน (ไทย/ประเทศไทย) — **ต้องมี Basic access** ถ้าไม่มีให้ตอบข้อความชัดเจน | KeywordPlanIdeaService |
| `gads_run_gaql` | GAQL อิสระ **SELECT เท่านั้น**, บังคับ LIMIT ≤ 1000, ตรวจ field กับ allowlist | googleAds:searchStream |
| `gads_get_insights` | ดึงบันทึกของ Claude (สมมติฐาน, สิ่งที่ทดลอง, ผล, บทเรียน) | D1 |
| `gads_get_alerts` | alerts ที่ยังไม่ปิด | D1 |

### 6.4 Memory tools (สมองต่อเนื่องข้ามแชท)
| Tool | ทำอะไร |
|---|---|
| `gads_save_insight` | บันทึก `{type: observation|hypothesis|decision|lesson, title, body, related_ids, tags}` |
| `gads_set_goal` | ตั้ง/แก้เป้าหมาย (ดู §8) — เปลี่ยนเป้าไม่กระทบบัญชี ไม่ต้องผ่าน change set |
| `gads_resolve_alert` | ปิด alert พร้อมหมายเหตุ |

### 6.5 Write tools (ผ่าน Change Set เท่านั้น)
| Tool | ทำอะไร |
|---|---|
| `gads_propose_changes` | รับ operations + เหตุผล → สร้าง change set สถานะ `pending` (ดู §7) |
| `gads_apply_change_set` | apply change set ที่อนุมัติแล้ว |
| `gads_reject_change_set` | ยกเลิก |
| `gads_rollback_change_set` | สร้างและ apply change set ย้อนกลับ (ผ่าน guardrails เหมือนกัน) |
| `gads_review_change_impact` | เทียบ performance ก่อน/หลัง ในช่วงยาวเท่ากัน + บันทึกผลลง insight |
| `gads_list_change_sets` | รายการตามสถานะ |

### 6.6 MCP Prompts & Resources
- Prompts: `gads_daily_check`, `gads_weekly_audit`, `gads_monthly_plan`, `gads_new_campaign_brief`, `gads_review_due_changes`
- Resources: `gads://playbook` (เนื้อหา PLAYBOOK.md), `gads://goals`, `gads://guardrails`
- แนะนำให้ผู้ใช้สร้าง **Claude Project "Ads Insight"** แล้วใส่ PLAYBOOK.md เป็น project instructions

---

## 7. Change Set Pipeline

```
propose ─► validate schema ─► อ่าน before-state ─► guardrails ─► build mutate ─► Google validateOnly
   │                                                                                   │
   └──────────── ผิด ─► ส่ง error อ่านง่ายกลับ Claude ◄───────────────────────────────────┘
                                                                                       ▼
                                                                    status: pending (หมดอายุ 24 ชม.)
                                                                                       │
                          risk low/medium: ผู้ใช้ยืนยันในแชท ─► apply                   │
                          risk high: ต้องกดอนุมัติใน PWA ─► apply ◄────────────────────┘
                                                                                       ▼
                   apply: ตรวจ state drift ─► mutate จริง (atomic) ─► เก็บ after-state + ผล
                                                                                       ▼
                                   ตั้งวันรีวิว ─► cron แจ้งเตือน ─► review_change_impact
```

### 7.1 `gads_propose_changes` input
```ts
{
  customer_id?: string,
  title: string,                 // "ตัดคำค้นเผาเงิน สัปดาห์ 37"
  rationale: string,             // เหตุผลพร้อมตัวเลข
  hypothesis?: string,           // "CPA ลด ≥10% ใน 14 วัน"
  expected_impact?: string,
  review_after_days?: number,    // default ตามชนิด op (§7.4)
  operations: Operation[]        // สูงสุด 50 ops ต่อ change set
}
```

### 7.2 Operation types (Zod discriminated union)
```ts
type Operation =
  // งบ & กลยุทธ์
  | { type: 'update_budget'; campaign_id: string; daily_budget_thb: number }
  | { type: 'set_bidding'; campaign_id: string;
      strategy: 'MAXIMIZE_CONVERSIONS' | 'MAXIMIZE_CONVERSION_VALUE' | 'TARGET_IMPRESSION_SHARE' | 'MAXIMIZE_CLICKS' | 'MANUAL_CPC';
      target_cpa_thb?: number; target_roas?: number; cpc_ceiling_thb?: number;
      impression_share?: { location: 'ANYWHERE_ON_PAGE' | 'TOP_OF_PAGE' | 'ABSOLUTE_TOP_OF_PAGE'; fraction_pct: number } }
  // สถานะ (ไม่มี REMOVE)
  | { type: 'set_status'; level: 'campaign' | 'ad_group' | 'ad' | 'keyword'; id: string; status: 'ENABLED' | 'PAUSED' }
  // เวลา
  | { type: 'set_ad_schedule'; campaign_id: string;              // แทนที่ทั้งชุด
      slots: { day: 'MONDAY'|'TUESDAY'|'WEDNESDAY'|'THURSDAY'|'FRIDAY'|'SATURDAY'|'SUNDAY';
               start: 'HH:MM'; end: 'HH:MM'; bid_modifier_pct?: number }[] }   // นาทีได้แค่ 00/15/30/45
  // คีย์เวิร์ด
  | { type: 'add_keywords'; ad_group_id: string; keywords: { text: string; match_type: 'EXACT'|'PHRASE'|'BROAD'; cpc_bid_thb?: number; final_url?: string }[] }
  | { type: 'update_keyword'; ad_group_id: string; criterion_id: string; cpc_bid_thb?: number; final_url?: string }
  | { type: 'add_negatives'; scope: 'campaign' | 'ad_group' | 'shared_list'; target_id: string; keywords: { text: string; match_type: 'EXACT'|'PHRASE'|'BROAD' }[] }
  | { type: 'remove_negatives'; scope: 'campaign' | 'ad_group' | 'shared_list'; target_id: string; criterion_ids: string[] }
  // แอด
  | { type: 'create_rsa'; ad_group_id: string; headlines: { text: string; pin?: 1|2|3 }[]; descriptions: { text: string; pin?: 1|2 }[];
      final_url: string; path1?: string; path2?: string }                                      // สร้างเป็น PAUSED
  | { type: 'replace_rsa'; ad_group_id: string; old_ad_id: string; /* ฟิลด์เดียวกับ create_rsa */ } // สร้างใหม่ PAUSED→ ตาม flag: เปิดใหม่+pause เก่า
  // โครงสร้าง
  | { type: 'create_ad_group'; campaign_id: string; name: string; default_cpc_thb?: number; keywords?: ...; rsas?: ... }
  | { type: 'create_search_campaign'; spec: SearchCampaignSpec }                                // atomic ด้วย temp IDs, PAUSED
  | { type: 'update_targeting'; campaign_id: string; locations_add?: string[]; locations_remove?: string[];
      languages?: string[]; device_bid_modifiers_pct?: { MOBILE?: number; DESKTOP?: number; TABLET?: number } }
  | { type: 'update_campaign_settings'; campaign_id: string; name?: string; end_date?: string;
      search_partners?: boolean; display_expansion?: boolean }
  | { type: 'upsert_assets'; level: 'campaign' | 'account'; target_id?: string;
      sitelinks?: { text: string; desc1?: string; desc2?: string; final_url: string }[];
      callouts?: string[]; structured_snippets?: { header: string; values: string[] }[]; call?: { phone: string } }
```

`SearchCampaignSpec`: name, daily_budget_thb, bidding (เหมือน set_bidding), locations (geo target IDs — ประเทศไทย/จังหวัด), languages (default ไทย), networks (default: Google Search อย่างเดียว, ปิด search partners และ display expansion), ad_schedule?, ad_groups[] (keywords + rsas), negatives[], assets?, start_date?, final_url_suffix?
- ⚠️ ตรวจฟิลด์บังคับตอนสร้างแคมเปญในเวอร์ชัน API ปัจจุบัน (เช่น การประกาศเรื่อง EU political advertising) ใน M5

### 7.3 Validation ฝั่งเรา (ก่อนส่ง Google)
- RSA: headlines 3–15 (≤30 ตัวอักษร), descriptions 2–4 (≤90), path ≤15, ห้ามซ้ำ, pin ไม่ขัดกัน
- Keyword: ≤80 ตัวอักษร, ≤10 คำ, ห้ามซ้ำกับที่มีอยู่ (normalize ช่องว่าง/ตัวพิมพ์)
- Negative: เตือนถ้า negative จะบล็อก keyword ที่มี conversion หรือ search term ที่เคย convert
- Ad schedule: ช่วงเวลาไม่ซ้อน, ≤6 ช่วงต่อวัน (ตรวจกับ docs), เตือน: ถ้าแคมเปญใช้ Smart Bidding ค่า bid modifier ของ schedule ไม่มีผล
- Google `validateOnly` = ตัวตัดสินสุดท้าย (เช่นการนับตัวอักษรภาษาไทย, policy)

### 7.4 Risk tiers & การอนุมัติ
| Risk | ตัวอย่าง | อนุมัติ | รีวิวผล default |
|---|---|---|---|
| low | add_negatives, pause keyword/ad, create_rsa (PAUSED), upsert_assets | ยืนยันในแชท | 7 วัน |
| medium | update_budget ≤ ±guardrail, ปรับ tCPA/tROAS ≤ ±guardrail, set_ad_schedule, update_keyword bid, เปิดแอด/keyword | ยืนยันในแชท | 14 วัน |
| high | งบเพิ่มเกิน guardrail, เปลี่ยนกลยุทธ์บิด, เปิดแคมเปญ, create_search_campaign, update_targeting, remove_negatives, ops > 20 รายการ | **กดอนุมัติใน PWA** | 14–21 วัน |
| blocked | ละเมิด hard limit | ปฏิเสธ + บอกเหตุผล | — |

- `gads_apply_change_set` สำหรับ low/medium รับ `user_confirmation: string` (ข้อความยืนยันของผู้ใช้) เก็บลง audit — ระบบถือว่า Claude ต้องได้คำยืนยันจากผู้ใช้ก่อนเรียก และ PLAYBOOK บังคับข้อนี้
- ผู้ใช้ปรับให้ทุก risk ต้องอนุมัติใน PWA ได้ (`approval_mode: 'pwa_all'`)

### 7.5 Guardrails (ค่าเริ่มต้น แก้ได้ใน PWA)
| Guardrail | Default | ประเภท |
|---|---|---|
| งบรายวันสูงสุดต่อแคมเปญ | ตั้งตอน M3 (บังคับตั้งก่อนเปิด write) | hard |
| งบรายวันรวมทั้งบัญชีสูงสุด | ตั้งตอน M3 | hard |
| งบรายเดือนสูงสุด (ตาม goal) | projected spend ห้ามเกิน | hard |
| เปลี่ยนงบต่อครั้ง | ±20% = medium, เกิน = high | tier |
| เปลี่ยน tCPA/tROAS ต่อครั้ง | ±15% = medium, เกิน = high | tier |
| cooldown เปลี่ยนงบแคมเปญเดิม | 3 วัน (ละเมิด = high) | tier |
| cooldown เปลี่ยนกลยุทธ์บิด | 14 วัน (ละเมิด = blocked) | hard |
| budget ที่แชร์หลายแคมเปญ | บังคับแสดงแคมเปญที่กระทบใน diff + high | tier |
| entity ที่ล็อก (protected) | ห้ามแก้ | hard |
| change sets ที่ apply ต่อวัน | 10 | hard |
| READ_ONLY_MODE | off | hard |
| state drift ระหว่าง propose→apply | ปฏิเสธ ให้ propose ใหม่ | hard |

> ตัวเลข default เป็นค่าตั้งต้นเชิงปฏิบัติ ไม่ใช่กฎของ Google — ปรับได้ตามประสบการณ์กับบัญชีจริง

### 7.6 Propose response
```jsonc
{
  "change_set_id": "cs_20260916_ab12",
  "status": "pending", "risk": "medium", "approval": "chat",
  "expires_at": "2026-09-17T10:00:00+07:00",
  "diff": [
    { "op": "update_budget", "target": "Search - ล้างแอร์ ภูเก็ต", "before": 400, "after": 470, "change_pct": 17.5 },
    { "op": "add_negatives", "target": "campaign: Search - ล้างแอร์", "add": ["[ล้างแอร์ เอง]", "\"วิธีล้างแอร์\""] }
  ],
  "guardrails": [{ "rule": "budget_step", "result": "pass" }],
  "google_validation": "passed",
  "warnings": ["negative 'ราคา' อาจบล็อกคำที่เคย convert 2 ครั้ง"],
  "pwa_url": "https://<domain>/approvals/cs_20260916_ab12"
}
```

### 7.7 Apply / Rollback / Review
- **Apply**: อ่าน state ใหม่ → เทียบ before-state → mutate ทั้งชุดแบบ atomic (`partialFailure: false`) → เก็บ resource names ที่สร้าง + after-state → status `applied` / `failed` (พร้อม error อ่านง่าย)
- **Rollback**: สร้าง inverse ops จาก before-state — budget/bid/target/status/schedule/targeting ย้อนค่าเดิม; negatives ที่เพิ่ม → ลบ criterion; ของที่สร้างใหม่ → PAUSE (ไม่ลบ); เปลี่ยนกลยุทธ์บิด → ย้อนได้แต่เตือนว่า learning เริ่มใหม่
- **Review**: เทียบ N วันก่อน vs N วันหลัง (ตัด conversion lag), แยกผลกระทบภายนอก (ฤดูกาล/ทั้งบัญชี) โดยแสดง metric ของแคมเปญที่ไม่ถูกแก้คู่กัน → Claude สรุป → `gads_save_insight(type: lesson)`

---

## 8. เป้าหมาย & Pacing

### 8.1 Goal model
```ts
Goal {
  id, org_id, account_id,
  period: 'monthly',                   // รอบแรกรายเดือน
  month: '2026-09',
  scope: { campaign_ids?: string[] },  // ว่าง = ทั้งบัญชี
  objective: 'leads' | 'sales' | 'traffic',
  budget_cap_thb: number,              // งบรวมทั้งเดือน (hard guardrail)
  target_conversions?: number,
  target_cpa_thb?: number,
  target_roas?: number,
  conversion_actions?: string[],       // นับเฉพาะ action เหล่านี้ (default = primary)
  priority: 'volume' | 'efficiency',   // ได้จำนวนก่อน หรือคุมต้นทุนก่อน
  notes?: string
}
```

### 8.2 `gads_get_goal_progress` คำนวณ
- `days_elapsed`, `days_remaining` (ตาม Asia/Bangkok)
- `spend_mtd`, `conversions_mtd`, `cpa_mtd`, `roas_mtd`
- `run_rate_spend_eom = spend_mtd / days_elapsed × days_in_month`
- `projected_conversions_eom` (ตัด conversion lag ของ 3 วันล่าสุด แล้ว extrapolate)
- `required_daily_budget = (budget_cap − spend_mtd) / days_remaining`
- `required_conversions_per_day = (target − conv_mtd) / days_remaining`
- `implied_cpa_needed` = งบที่เหลือ / conversion ที่ยังขาด → เทียบกับ CPA 14 วันล่าสุด → บอกว่าเป้า **เป็นไปได้/ตึง/ไม่สมจริง**
- สถานะ: `on_track` (±10%), `at_risk` (10–25%), `off_track` (>25%)
- ข้อจำกัดที่ต้องแสดงคู่: IS ที่เสียเพราะงบ (เพิ่มงบช่วยได้ไหม) vs เสียเพราะอันดับ (เพิ่มงบไม่ช่วย)

---

## 9. Snapshots, Cron & Alerts

### 9.1 Cron (Workers scheduled)
| เวลา (ไทย) | งาน |
|---|---|
| ทุกวัน 06:30 | ดึง metrics รายวันระดับ campaign + ad group ของเมื่อวาน และ **ดึงซ้ำ 7 วันล่าสุด** (conversion ย้อนหลัง) → upsert `daily_metrics` · ดึง entity state (budget, bidding, status) → `entity_snapshots` |
| ทุกวัน 06:40 | ตรวจ alerts (§9.2) · สร้าง alert "ถึงเวลารีวิว" ของ change sets · หมดอายุ change sets pending |
| ทุก 3 ชม. (08:00–23:00) | เช็คเบาๆ: spend วันนี้ vs งบ, แอดโดน disapprove ใหม่ |
| ทุกสัปดาห์ จันทร์ 07:00 | ดึง keyword-level metrics 7 วัน → `keyword_weekly` (ใช้ดูแนวโน้ม QS/CPA) |

- ทุก cron นับ ops ลง `quota_usage` และหยุดถ้าเกิน 70% ของโควตาวัน (เหลือไว้ให้ Claude ใช้)

### 9.2 Alert rules (เป็นแค่ "ธง" ให้ Claude/ผู้ใช้ดู — ไม่แก้บัญชีเอง)
- Spend วันนี้/เมื่อวาน > 150% ของค่าเฉลี่ย 7 วัน
- แคมเปญมี spend ≥ 2× target CPA แต่ 0 conversion ใน 7 วัน
- CPA 7 วัน > target × 1.3
- Pacing `off_track`
- Budget-limited ต่อเนื่อง 3 วัน (search_budget_lost_impression_share > 20%)
- แอด/asset/keyword ถูก disapprove
- Conversion = 0 ทั้งบัญชี 2 วันติด ขณะที่มีคลิก (สงสัย tracking พัง)
- มีการแก้ไขจากนอกระบบ (change_event ที่ไม่ได้มาจาก change set ของเรา)
- Change set ถึงวันรีวิว

---

## 10. Database (D1) — ร่าง schema

> ทุกตารางมี `org_id` · ตารางที่ผูกบัญชีมี `account_id` · เวลาเก็บเป็น ISO UTC · เงินเป็น micros (INTEGER)

```sql
orgs(id, name, created_at)
users(id, org_id, email, role /*owner|editor|viewer — รอบแรกมีแต่ owner*/, created_at)
google_connections(id, org_id, google_email, refresh_token_enc, scopes, access_level, created_at, updated_at)
ad_accounts(id, org_id, connection_id, customer_id, login_customer_id, name, currency, timezone, is_default, created_at)

settings(org_id, account_id, key, value_json)            -- approval_mode, read_only_mode, alert thresholds
guardrails(org_id, account_id, rule, value_json, updated_at)
protected_entities(org_id, account_id, entity_type, entity_id, reason)
goals(id, org_id, account_id, month, scope_json, objective, budget_cap_micros, target_conversions,
      target_cpa_micros, target_roas, conversion_actions_json, priority, notes, created_at, updated_at)

daily_metrics(org_id, account_id, date, level /*campaign|ad_group*/, entity_id, entity_name,
      impressions, clicks, cost_micros, conversions, conv_value_micros,
      search_is, budget_lost_is, rank_lost_is, fetched_at, PRIMARY KEY(account_id, date, level, entity_id))
keyword_weekly(org_id, account_id, week_start, criterion_id, ad_group_id, text, match_type,
      impressions, clicks, cost_micros, conversions, quality_score, fetched_at)
entity_snapshots(org_id, account_id, date, entity_type, entity_id, state_json)

change_sets(id, org_id, account_id, title, rationale, hypothesis, expected_impact, risk, approval_mode,
      status /*pending|approved|applied|failed|rejected|expired|rolled_back*/,
      created_by /*claude|pwa*/, created_at, expires_at, approved_at, approved_via /*chat|pwa*/,
      user_confirmation, applied_at, review_after, reviewed_at, rollback_of, error_json)
change_ops(id, change_set_id, seq, type, input_json, before_json, after_json, mutate_json,
      result_resource_names_json, status)

insights(id, org_id, account_id, type, title, body, related_json, tags, created_at)
alerts(id, org_id, account_id, rule, severity, entity_json, message, status /*open|resolved*/, created_at, resolved_at, note)
audit_log(id, org_id, account_id, actor /*claude|pwa|cron*/, action, input_hash, summary, ops_used, created_at)
quota_usage(account_id, date, ops_used)
oauth_*  -- ตารางของ OAuth provider (หรือใช้ KV ตาม lib)
```

---

## 11. PWA (ภาษาไทย, mobile-first)

PWA **ไม่มีแชท** — การวิเคราะห์ทำใน Claude · PWA มีไว้ "ดู · อนุมัติ · ตั้งค่า"

| หน้า | เนื้อหา |
|---|---|
| **หน้าหลัก** | การ์ดเป้าหมายเดือนนี้ (งบใช้ไป/เหลือ, conversion, CPA/ROAS vs เป้า, projected, สถานะสี), กราฟ spend+conv รายวัน, alerts ล่าสุด, badge change sets รออนุมัติ |
| **รออนุมัติ** | รายการ change sets: title, risk, เหตุผลของ Claude, diff ก่อน/หลัง, คำเตือน guardrails → ปุ่ม อนุมัติ+Apply / ปฏิเสธ |
| **ประวัติ** | change sets ที่ apply แล้ว + ผลรีวิว + ปุ่ม rollback |
| **แคมเปญ** | รายการแคมเปญ + drill-down: metrics, heatmap ชั่วโมง×วัน, IS lost |
| **Insights** | บันทึกของ Claude (ค้นหา/กรองตาม tag) |
| **ตั้งค่า** | เป้าหมาย, guardrails, protected entities, approval mode, READ_ONLY switch, การเชื่อม Google + ระดับสิทธิ์ API + โควตาวันนี้ |

- Nice-to-have: ปุ่ม "ให้ Claude วิเคราะห์" → เปิด Claude พร้อม prompt สำเร็จรูป (เช่น "รัน gads_weekly_audit")
- Web Push แจ้งเตือน: change set high-risk รออนุมัติ, alert severity สูง (M7)
- Offline: cache หน้าหลักล่าสุด (read-only)

---

## 12. Milestones (Gate ทุกขั้น — หยุดรอผู้ใช้ยืนยันก่อนไปต่อ)

### M0 — Access & Setup
- ทำ checklist §4 ครบ · สร้าง repo, wrangler, D1, secrets
- **Gate**: query `customer` ของบัญชีจริงสำเร็จจาก script local + refresh token ใช้ได้

### M1 — Ads Core Client
- `src/ads/*`: searchStream (รวม stream chunks), mutate (validateOnly), retry/backoff สำหรับ transient errors, error mapping เป็นภาษาไทยอ่านง่าย, quota counter, money utils, GAQL builder + field allowlist
- บันทึก response จริงเป็น fixtures (ลบข้อมูลส่วนตัว)
- **Gate**: unit tests ผ่าน · ดึง campaigns + metrics 30 วันของบัญชีจริงได้ · validateOnly บน test account ผ่าน

### M2 — Remote MCP + Read Tools ⭐ (ใช้งานได้จริงครั้งแรก)
- MCP server + OAuth + owner allowlist · deploy
- Tools: `get_account_overview`, `get_performance`, `get_search_terms`, `get_keywords`, `get_ads`, `get_time_performance`, `get_impression_share`, `get_bidding_status`, `get_conversion_setup`, `run_gaql`
- Resource `gads://playbook`
- **Gate**: เพิ่ม custom connector ใน claude.ai สำเร็จ · ใช้บนมือถือได้ · Claude ทำ weekly audit จากข้อมูลจริงได้ครบตาม PLAYBOOK

### M3 — Data Layer: Goals, Snapshots, Pacing, Alerts
- D1 schema/migrations · cron snapshot · `set_goal`, `get_goal_progress`, `get_alerts`, `resolve_alert`, `save_insight`, `get_insights`
- ตั้ง guardrails ค่าจริง (งบสูงสุด) — **บังคับก่อน M4**
- Tools ที่เหลือฝั่ง read: `get_audience_breakdown`, `get_landing_pages`, `get_policy_issues`, `get_assets`, `get_recommendations`, `get_change_history`
- **Gate**: ตั้งเป้าเดือนนี้แล้ว pacing ถูกต้องเทียบกับหน้า Google Ads · cron รัน 3 วันติดไม่พลาด

### M4 — Change Set Pipeline (เริ่มจาก low-risk)
- propose / apply / reject / rollback / list · guardrails · risk tiers · state drift · audit
- Ops รอบนี้: `add_negatives`, `remove_negatives`, `set_status`
- ทดสอบทั้งหมดบน **test account ก่อน** แล้วค่อยบัญชีจริง
- **Gate**: บนบัญชีจริง — Claude เสนอ negatives → ผู้ใช้ยืนยัน → apply → rollback สำเร็จ ข้อมูลใน Google ตรงกับ log

### M5 — Full Write Ops + Keyword Research
- `update_budget`, `set_bidding`, `set_ad_schedule`, `add_keywords`, `update_keyword`, `create_rsa`, `replace_rsa`, `upsert_assets`, `update_targeting`, `update_campaign_settings`, `create_ad_group`, `create_search_campaign`
- `review_change_impact` · `research_keywords` (ถ้าได้ Basic)
- **Gate**: สร้างแคมเปญ Search ครบชุดแบบ PAUSED บนบัญชีจริงได้ · เปลี่ยนงบ/บิด/schedule ผ่าน guardrails ถูกต้องทุกกรณีทดสอบ

### M6 — PWA
- ทุกหน้าใน §11 · อนุมัติ high-risk ผ่าน PWA · installable
- **Gate**: อนุมัติ change set high-risk จากมือถือแล้ว apply สำเร็จ

### M7 — Automation & Prompts
- Prompts ใน §6.6 · Web Push · alert "ถึงเวลารีวิว" · weekly summary insight
- **Gate**: ใช้งานจริงครบ 1 สัปดาห์ด้วย daily check + weekly audit

### M8 — Hardening & Multi-account Prep
- rate limit/quota handling จริงจัง, error budget, backup D1 (export รายสัปดาห์), ทดสอบ token หมดอายุ/ถูก revoke
- เพิ่มบัญชีที่ 2 (บัญชีทดสอบ) ผ่าน `ad_accounts` แล้วทุก tool ทำงานด้วย `customer_id`
- **Gate**: สลับบัญชีได้โดยข้อมูลไม่ปนกัน

---

## 13. เผื่ออนาคต: ดูแลบัญชีลูกค้า (ยังไม่ทำ)
- เชื่อมผ่าน **MCC ของเรา** (`login_customer_id`) → ลูกค้าลิงก์บัญชีเข้ามา
- เพิ่ม roles (owner/editor/viewer) และ org ต่อลูกค้า, approval ต่อ org, รายงานสรุปให้ลูกค้า (หน้า read-only แชร์ลิงก์)
- ⚠️ ถ้าเปิดเครื่องมือให้คนภายนอกล็อกอินใช้เอง อาจต้องใช้ **Standard access** และเข้าเงื่อนไข RMF + นโยบายนักพัฒนา Google Ads ที่เข้มขึ้น — ประเมินอีกครั้งตอนนั้น
- สิ่งที่ออกแบบไว้แล้ว: `org_id`/`account_id` ทุกตาราง, `customer_id` ทุก tool, guardrails/goals ต่อบัญชี, quota ต่อบัญชี

---

## 14. นอกขอบเขตรอบนี้
- Performance Max asset groups (รูป/วิดีโอ), Shopping, Display, Video/YouTube, Demand Gen, App
- สร้างบัญชี Google Ads, billing/payment, จัดการผู้ใช้ในบัญชี
- Offline conversion import, GA4 integration (พิจารณาหลัง M8)
- การ optimize อัตโนมัติโดยไม่มีคนอนุมัติ

---

## 15. ค่าใช้จ่ายโดยประมาณ
| รายการ | ค่าใช้จ่าย |
|---|---|
| Google Ads API | ฟรี |
| Cloudflare Workers + D1 | เริ่ม Free tier; ถ้าติด CPU limit ตอนประมวลผลรายงานใหญ่ → Workers Paid ~$5/เดือน |
| Claude | ใช้ custom connector ต้องเป็นแพ็ก Pro ขึ้นไป (มีอยู่แล้ว) |
| โดเมน | ใช้ `*.workers.dev` ได้ หรือ subdomain ของโดเมนที่มี |

---

## 16. คำถามที่ต้องตอบก่อน/ระหว่างทำ
1. บัญชีเข้าผ่าน MCC หรือเข้าตรง? (มีผลกับ `login-customer-id`)
2. Conversion actions ไหนคือเป้าหมายจริง (โทร, ฟอร์ม, LINE click)? ตั้งเป็น primary ถูกต้องหรือยัง?
3. แคมเปญปัจจุบันเป็นประเภทไหนบ้าง (Search / PMax)? — รอบแรกเน้น Search
4. งบรายวัน/รายเดือนสูงสุดที่ยอมรับได้ (สำหรับ hard guardrails)
5. ได้ Basic access แล้วหรือยัง (กำหนดว่า keyword research อยู่ M5 หรือเลื่อน)

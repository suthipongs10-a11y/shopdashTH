# วิธีทดสอบโปรเจ็คนี้

อัปเดต: ก.ย. 2569 · สถานะ: M1 กำลังทำ

## สรุปสั้นที่สุด

```bash
cd ads-insight
pnpm verify      # typecheck + unit tests + build Worker — ใช้คำสั่งนี้เป็นหลัก
```

ผ่าน = โค้ดพร้อม commit ไม่ต้องใช้ credentials ไม่ต้องต่อเน็ตหา Google

---

## การทดสอบมี 3 ชั้น

| ชั้น | ต้องมีอะไร | รันที่ไหนได้ | ตรวจอะไร |
|---|---|---|---|
| **1. ไม่ต้องใช้ credentials** | แค่ `pnpm install` | ทุกที่ (รวม Claude Code) | logic ทั้งหมด, types, Worker build ผ่าน |
| **2. ต้องมีบัญชีจริง** | `.dev.vars` + refresh token | **เครื่องผู้ใช้เท่านั้น** | ยิง Google Ads API ได้จริง |
| **3. ต้องมี test account** | `TEST_CUSTOMER_ID` + `TEST_LOGIN_CUSTOMER_ID` | **เครื่องผู้ใช้เท่านั้น** | คำสั่งแก้ไขบัญชี (`validateOnly`) — `pnpm check:mutate` |

**ทำไมชั้น 2–3 ต้องรันบนเครื่องคุณ:** Claude Code ทำงานใน container ชั่วคราวที่ไม่มี (และไม่ควรมี) refresh token ของบัญชีโฆษณาจริง — ดู DECISIONS D24

---

## ชั้น 1 — รันได้ทุกที่

| คำสั่ง | ทำอะไร | ใช้เวลา |
|---|---|---|
| `pnpm verify` | **รวม 3 อย่างล่าง** — ใช้ตัวนี้ก่อน commit | ~30s |
| `pnpm test` | unit tests ทั้งหมด | <1s |
| `pnpm typecheck` | `tsc` ทั้งฝั่ง Worker และฝั่ง Node scripts | ~10s |
| `pnpm exec wrangler deploy --dry-run --outdir .wrangler/verify` | bundle Worker ได้จริงไหม (ไม่ deploy) | ~15s |

### ระหว่างเขียนโค้ด
```bash
pnpm test:watch                     # รันใหม่อัตโนมัติเมื่อไฟล์เปลี่ยน
pnpm test money                     # เฉพาะไฟล์ที่ชื่อมี "money"
pnpm exec vitest run -t "quote"     # เฉพาะเทสต์ที่ชื่อมี "quote"
```

### ตรวจว่า Worker บูตได้จริง
```bash
pnpm dev                            # แล้วเปิดอีกหน้าต่าง:
curl -s localhost:8787/health       # ต้องได้ JSON บอกว่าตั้งค่าอะไรครบแล้วบ้าง
```
`/health` บอกเป็น `true`/`false` เท่านั้น ไม่โชว์ค่าจริงของ secret

---

## ชั้น 2 — ยิงบัญชีจริง (เครื่องคุณ)

| คำสั่ง | ตรวจอะไร |
|---|---|
| `pnpm check:access` | **Gate M0** — refresh token → access token → GAQL query ตาราง `customer` สำเร็จ |
| `pnpm list:accounts` | บัญชีที่ token เข้าถึงได้ + แนะนำค่าที่ควรใส่ `.dev.vars` |
| `pnpm auth:google` | ขอ refresh token ใหม่ (เมื่อหมดอายุหรือเปลี่ยนบัญชี) |
| `pnpm capture:fixtures` | ดึง response จริงมาทำ fixtures + ลบข้อมูลส่วนตัวอัตโนมัติ (~7 ops) |
| `pnpm fields <รูปแบบ>` | **ถาม API ว่าฟิลด์ไหนมีจริง** ก่อนเขียน query · เช่น `pnpm fields campaign.%date%` (1 ops) |

**ใช้ quota:** `check:access` = 1 ops · `list:accounts` = 2–3 ops
(Explorer มี 2,880 ops/วัน — รันวันละหลายสิบครั้งยังเหลือเฟือ)

---

## ชั้น 3 — คำสั่งแก้ไขบัญชี (ยังไม่ถึง)

**ยังไม่มีสคริปต์** — จะมาตอนจบ M1 และ M4

กฎเหล็กจาก CLAUDE.md: **ห้ามทดสอบ mutate กับบัญชีจริง** ต้องใช้ test account เท่านั้น
โค้ดบังคับกฎนี้ไว้แล้วระดับหนึ่ง — `client.mutate()` ตั้ง `validateOnly: true` เป็นค่า default
ใครจะแตะบัญชีจริงต้องพิมพ์ `validateOnly: false` เองซึ่งเห็นชัดตอน review

---

## เทสต์อะไรอยู่ตรงไหน

| ไฟล์ | จำนวน | ครอบคลุม |
|---|---|---|
| `test/unit/money.test.ts` | 23 | micros ↔ บาท, int64 ที่มาเป็น string, ปัดเศษ, หารด้วยศูนย์ |
| `test/unit/ads-errors.test.ts` | 20 | แกะ GoogleAdsFailure, ข้อความไทย, **ตัดสินว่า retry ได้ไหม** |
| `test/unit/gaql.test.ts` | 28 | query builder, **กัน injection**, allowlist, SELECT-only |
| `test/unit/ads-client.test.ts` | 25 | headers, retry/backoff, นับ quota, default ของ mutate |
| `test/unit/accounts.test.ts` | 28 | จัดผังบัญชี, แนะนำค่า config (M0) |
| `test/unit/dev-vars.test.ts` | 14 | อ่าน/เขียน `.dev.vars`, ปิดบัง secret |
| `test/unit/app-config.test.ts` | 8 | validate config, allowlist อีเมล |
| `test/unit/customer-id.test.ts` | 7 | normalize/validate Customer ID |
| `test/unit/ads-rest.test.ts` | 7 | REST helper ของสคริปต์ M0 |
| **รวม** | **160** | |

---

## ควรรันอะไรเมื่อไหร่

| สถานการณ์ | รัน |
|---|---|
| หลัง `git pull` | `pnpm install` แล้ว `pnpm test` |
| ก่อน commit (Claude Code ทำให้) | `pnpm verify` |
| หลังแก้อะไรที่แตะ Google Ads API | `pnpm verify` + `pnpm check:access` บนเครื่องคุณ |
| ปิด Gate ของ milestone | ดูเงื่อนไข Gate ใน `SPEC.md §12` — แต่ละ milestone ไม่เหมือนกัน |

---

## สิ่งที่ยังไม่ครอบคลุม (ตั้งใจ)

- **`src/index.ts`** (router ของ Worker) — ตอนนี้มีแค่ `/health` กับ stub 501 ทดสอบด้วย `curl` ตอน `pnpm dev` พอ · จะเขียนเทสต์จริงตอน M2 ที่ route มีเนื้อหา
- **`src/env.ts`** — เป็นแค่ interface + ฟังก์ชันส่งต่อ 2 ตัว logic จริงอยู่ใน `src/config.ts` ซึ่งมีเทสต์แล้ว
- **fixtures จากบัญชีจริง** — สคริปต์พร้อมแล้ว (`pnpm capture:fixtures`) แต่ยังไม่ได้รัน · จำเป็นเพราะ test account ของ Google **ไม่มีข้อมูล performance เลย** ถ้าไม่มี fixtures จะทดสอบ logic วิเคราะห์ (metrics, pacing, guardrails) ไม่ได้ — ดู `test/fixtures/README.md`
- **integration test ที่ยิง Google จริง** — `test/integration/` ยังว่าง จะมีตอน M4 และรันกับ test account เท่านั้น

---

## เจอปัญหา

| อาการ | สาเหตุ |
|---|---|
| `pnpm test` ฟ้อง module not found | ยังไม่ได้ `pnpm install` หลัง pull |
| `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` | lockfile มีแพ็กเกจใหม่เกิน 24 ชม. — บอก Claude Code ให้ resolve ใหม่ (D22) |
| `ERR_PNPM_IGNORED_BUILDS` | ดู D23 — ต้องใช้คีย์ `allowBuilds` |
| `check:access` ขึ้น 404/403 | ดูตารางแก้ปัญหาใน `SETUP-GOOGLE-CLOUD.md` |

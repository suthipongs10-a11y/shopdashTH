# M0 — ตั้งค่า Google Cloud + Google Ads API

คู่มือทำทีละขั้นสำหรับ milestone M0 (SPEC §4) · อัปเดต: ก.ย. 2026

> ⚠️ Google เปลี่ยน UI และนโยบายเมื่อ **9 ก.ย. 2026**: เลิกใช้ developer token แล้ว
> สิทธิ์ผูกกับ **Google Cloud project** แทน และหน้า "OAuth consent screen" ถูกย้ายไปอยู่ใต้เมนู
> **Google Auth Platform** — ถ้าเจอหน้าจอไม่ตรงกับที่เขียนไว้ ให้เชื่อหน้าจอจริง แล้วบอก Claude Code
> มาแก้เอกสารนี้ (ดู DECISIONS D11)

## บัญชี Google ที่ใช้

Cloud project **ไม่ต้อง**เป็น Gmail เดียวกับที่ทำ Google Ads (DECISIONS D19)

| | ใช้บัญชีไหน |
|---|---|
| Cloud project (ขั้นตอน 1–5 ในเอกสารนี้) | บัญชีไหนก็ได้ที่คุณคุมแน่นอนและจะไม่ปิดทิ้ง |
| ตอนรัน `pnpm auth:google` | **Gmail ที่มีสิทธิ์ในบัญชี Google Ads** |

เลือกให้ดีตั้งแต่แรก เพราะสิทธิ์ Explorer/Basic กับโควตาผูกกับ Cloud project นี้ —
ย้าย project ทีหลังต้องขอ access ใหม่หมด (ส่วน refresh token เปลี่ยนบัญชีเมื่อไหร่ก็ได้)

---

## 0. เตรียมเครื่องตัวเอง

รันบนคอมของคุณ ไม่ใช่บน repo — ต้องมี **Node 20+**, **pnpm**, **git**

```bash
git clone https://github.com/suthipongs10-a11y/shopdashTH.git
cd shopdashTH
git checkout claude/brave-wozniak-3e7aau
cd ads-insight
pnpm install
```

ตรวจว่าโครงใช้ได้ก่อนเริ่มยุ่งกับ Google:

```bash
pnpm test        # ต้องผ่านทั้งหมด
pnpm typecheck   # ต้องไม่มี error
```

---

## 1. สร้าง Cloud project

1. เปิด https://console.cloud.google.com/projectcreate
   (หรือจากหน้า welcome → กดชื่อ project มุมบนซ้าย → **New project**)
2. **Project name:** `ads-insight`
3. **Location:** No organization (ถ้าเป็นบัญชีส่วนตัว)
4. กด **Create** แล้วรอสักครู่ → สลับไปที่ project นี้ให้แน่ใจ (ชื่อต้องขึ้นบนแถบบนสุด)

📝 **จดไว้:** Project ID (เช่น `ads-insight-481203`) — ไม่ใช่ชื่อ project

---

## 2. เปิดใช้ Google Ads API

1. เปิด https://console.cloud.google.com/apis/library/googleads.googleapis.com
   (หรือ **APIs & Services → Library** → ค้น "Google Ads API")
2. ตรวจว่า project ที่เลือกอยู่บนแถบบนสุดคือ `ads-insight`
3. กด **Enable**

พอเปิดเสร็จ project จะได้ระดับสิทธิ์ **Test** อัตโนมัติ (ยิงได้เฉพาะบัญชีทดสอบ)
— ขั้นตอนที่ 5 คือการขยับขึ้นเป็น Explorer เพื่อยิงบัญชีจริง

---

## 3. ตั้งค่า Google Auth Platform (เดิมชื่อ OAuth consent screen)

เมนู: **Google Auth Platform** → https://console.cloud.google.com/auth/overview
ถ้าเป็นครั้งแรกจะมีปุ่ม **Get started** ให้กดก่อน

### 3.1 Branding
https://console.cloud.google.com/auth/branding
- **App name:** `Ads Insight`
- **User support email:** อีเมลคุณ
- **Developer contact email:** อีเมลคุณ
- **ข้ามได้:** โลโก้ (ใส่แล้วต้องผ่าน brand verification), Application home page,
  privacy policy link, terms of service link, Authorized domains — ใช้เองไม่ต้องมี
- เสร็จแล้วปุ่ม **Save** จะกลายเป็นสีเทา = ไม่มีอะไรค้าง

มุมขวาของหน้านี้จะเขียนว่า *"your app is in Testing status"* — ปกติ ยังไม่ต้องตกใจ แก้ในข้อ 3.4

### 3.2 Audience
https://console.cloud.google.com/auth/audience
- **User type: External**
  (Internal เลือกได้เฉพาะบัญชี Google Workspace ขององค์กร — Gmail ธรรมดาจะไม่มีตัวเลือกนี้)

### 3.3 Data Access — เพิ่ม scope

**Data Access** อยู่ในเมนูซ้าย (ใต้ Clients) — คนละหน้ากับ Branding
https://console.cloud.google.com/auth/scopes → ปุ่ม **Add or remove scopes**

| Scope | ใช้ทำอะไร | จำเป็น |
|---|---|---|
| `https://www.googleapis.com/auth/adwords` | **เข้าถึง Google Ads** | **ขาดไม่ได้** |
| `https://www.googleapis.com/auth/userinfo.email` | อ่านอีเมลคนที่ล็อกอิน (ใช้กับ `OWNER_EMAILS`) | ควรมี |
| `openid` | ระบุตัวตน | ไม่ต้องประกาศก็ได้ |

วิธีหา: ในช่อง **Filter** พิมพ์ `adwords` → จะเจอแถว "Google Ads API · .../auth/adwords"
คำอธิบายว่า *"See, edit, create, and delete your Google Ads accounts and data"* → **ติ๊ก**

> panel แสดงเฉพาะ scope ของ API ที่ **enable แล้ว** เท่านั้น — ถ้าหา `adwords` ไม่เจอ แปลว่าข้ามขั้นตอนที่ 2
> (ยังไม่ได้ enable Google Ads API) ให้กลับไปทำก่อนแล้ว refresh หน้านี้

จากนั้นล้าง filter (กด X ที่ชิป) แล้วหา `userinfo.email` ติ๊กเพิ่ม
ส่วน `openid` ใส่ในช่อง "Manually add scopes" ไม่ได้ เพราะช่องนั้นบังคับให้ขึ้นต้นด้วย `https://` —
ไม่เป็นไร เป็น scope มาตรฐานที่ Google ให้อยู่แล้ว

**ติ๊กเฉยๆ ไม่บันทึก** — ต้องกด **Update** (ปุ่มน้ำเงินล่าง panel) แล้วกด **Save** ในหน้า Data Access อีกที

พอบันทึกแล้ว `adwords` จะไปอยู่ใต้หัวข้อ **"Your sensitive scopes"** ซึ่งถูกต้อง
(และเป็นเหตุผลที่ต้องทำข้อ 3.4 ต่อ)

### 3.4 Publish app — ข้อนี้สำคัญมาก
กลับไปหน้า **Audience** → กด **Publish app** → ยืนยัน → สถานะต้องเป็น **In production**

**ทำไมต้องทำ:** ถ้าปล่อยไว้ที่ **Testing** refresh token จะ**หมดอายุใน 7 วัน** ต้องมานั่งขอใหม่เรื่อยๆ

คุณจะเห็นคำเตือนว่าแอปยังไม่ผ่าน verification — **ไม่เป็นไร** ตอนล็อกอินจะมีหน้าจอ
"Google hasn't verified this app" ให้กด **Advanced → Go to Ads Insight (unsafe)** ผ่านไปได้
เพราะเป็นแอปที่คุณสร้างเองใช้เอง

> ถ้ากด Publish แล้วโดนบังคับให้ส่ง verification จริงๆ (เป็นไปได้เพราะ `adwords` เป็น sensitive scope):
> ให้อยู่ที่ **Testing** ไปก่อน แล้วไปที่ Audience → **Test users** → เพิ่ม Gmail ที่ทำ Google Ads เข้าไป
> ใช้งานได้เหมือนกัน แค่ต้องรัน `pnpm auth:google` ใหม่ทุก 7 วัน — แล้วบอก Claude Code ให้บันทึกลง DECISIONS

---

## 4. สร้าง OAuth Client

https://console.cloud.google.com/auth/clients → **Create client**

- **Application type:** `Web application`
- **Name:** `ads-insight-local`
- **Authorized redirect URIs** → Add URI:

```
http://localhost:8787/connect/google/callback
```

  (ตรงกับที่ `pnpm auth:google` ใช้ — ถ้ารันด้วย `--port` อื่น ต้องเพิ่ม URI ให้ตรงพอร์ตนั้น)

ตอน deploy จริง (M2) ค่อยกลับมาเพิ่ม 2 อันนี้:
```
https://<worker-domain>/connect/google/callback
https://<worker-domain>/oauth/google/callback
```

กด **Create** → จะมีหน้าต่างโชว์ **Client ID** กับ **Client secret**

📝 **จดไว้ทั้งคู่** (secret เปิดดูทีหลังได้ที่หน้า Clients)

---

## 5. ขอ Explorer access

หน้า **Google Ads API Overview** ใน Cloud Console:
https://console.cloud.google.com/apis/api/googleads.googleapis.com/overview

(ถ้าลิงก์ไม่ตรง ให้ไป **APIs & Services → Enabled APIs & services → Google Ads API**)

หน้านี้จะบอกระดับสิทธิ์ปัจจุบัน (ตอนนี้ควรเป็น **Test**) → หาปุ่มสมัคร **Explorer access** แล้วกรอกใบสมัคร
มักอนุมัติอัตโนมัติหรือภายในไม่กี่วัน

| ระดับ | ยิงบัญชีจริงได้ | โควตา/วัน | หมายเหตุ |
|---|---|---|---|
| Test | ✗ | 15,000 | ได้ทันทีเมื่อ enable API |
| **Explorer** ← เป้าหมายตอนนี้ | ✓ | 2,880 | พอเหลือเฟือสำหรับบัญชีเดียว |
| Basic | ✓ | 15,000 | ต้อง brand verification · จำเป็นถ้าจะใช้ Keyword Planner (M5) |

📝 **จดไว้:** ระดับสิทธิ์ที่ได้ (ตอบคำถาม SPEC §16 ข้อ 5)

> **ยังไม่ได้ Explorer ก็เริ่มได้:** ระบบรันกับบัญชีทดสอบไปก่อนได้
> แต่ **Gate M0 ต้องยิงบัญชีจริงสำเร็จ** เลยต้องรอ Explorer ก่อนถึงจะปิด M0 ได้

---

## 6. จด Customer ID ของบัญชี Google Ads

เปิด https://ads.google.com ด้วย **Gmail ที่ทำ Google Ads** → ดูเลข 10 หลักมุมขวาบน (รูปแบบ `123-456-7890`)

ถ้าไม่แน่ใจว่ามีบัญชีไหนบ้าง หรือเข้าผ่าน MCC อยู่หรือเปล่า — **ข้ามไปก่อนได้**
`pnpm list:accounts` ในขั้นตอนที่ 8 จะไล่ให้ดูทั้งหมดพร้อมบอกว่าควรใส่ค่าไหน

---

## 7. กรอก `.dev.vars`

```bash
cd ads-insight
cp .dev.vars.example .dev.vars
```

เปิด `.dev.vars` แล้วกรอก:

```
GOOGLE_OAUTH_CLIENT_ID=<Client ID จากขั้นตอน 4>
GOOGLE_OAUTH_CLIENT_SECRET=<Client secret จากขั้นตอน 4>
OWNER_EMAILS=<Gmail ของคุณ>
```

สร้างคีย์สุ่ม 2 ตัว (รันแยกกัน 2 ครั้ง เอาคนละค่า):
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```
เอาไปใส่ `TOKEN_ENC_KEY` กับ `SESSION_SECRET`

`GOOGLE_ADS_REFRESH_TOKEN` **ไม่ต้องกรอก** — ขั้นตอนถัดไปเขียนให้เอง

> `.dev.vars` อยู่ใน `.gitignore` แล้ว จะไม่ถูก commit — อย่าเอาไปแปะในแชท

---

## 8. เชื่อมบัญชีแล้วปิด Gate M0

```bash
pnpm auth:google
```
→ เปิดลิงก์ที่พิมพ์ออกมาในเบราว์เซอร์
→ **เลือก Gmail ที่ทำ Google Ads** (อย่ากดผ่านเร็ว ถ้าล็อกอินหลายบัญชีอยู่)
→ เจอ "Google hasn't verified this app" ให้กด **Advanced → Go to Ads Insight**
→ กด Allow → กลับมาที่เทอร์มินัล จะขึ้นว่าบันทึก refresh token แล้ว

```bash
pnpm list:accounts
```
→ ดูผังบัญชี แล้วเอาค่าที่แนะนำไปใส่ `wrangler.toml` ใต้ `[vars]`
   (`DEFAULT_CUSTOMER_ID`, `LOGIN_CUSTOMER_ID`, `TEST_CUSTOMER_ID`)

```bash
pnpm check:access
```
→ ขึ้น **`✅ Gate M0 ผ่าน`** = จบ M0

---

## 9. สร้าง D1 (ทำตอนไหนก็ได้ก่อน M3)

```bash
pnpm exec wrangler login          # ล็อกอิน Cloudflare
pnpm exec wrangler d1 create ads_insight
```
เอา `database_id` ที่ได้ไปแทน `REPLACE_WITH_D1_DATABASE_ID` ใน `wrangler.toml`

---

## 10. Test account (ต้องมีก่อน M4 — ยังไม่ต้องรีบ)

จำเป็นเพราะ **ห้ามทดสอบคำสั่งแก้ไขบัญชีกับบัญชีจริง** (CLAUDE.md)

สร้าง test manager account + test client account ที่ https://ads.google.com
(เป็นบัญชีคนละชุดกับบัญชีจริง ไม่มีข้อมูล performance) แล้วเอา Customer ID
ของ test client ไปใส่ `TEST_CUSTOMER_ID`

---

## เจอปัญหาบ่อยๆ

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `invalid_client` | Client ID/Secret ไม่ตรง — copy มาไม่ครบ หรือใส่สลับช่อง |
| `redirect_uri_mismatch` | URI ใน OAuth client ไม่ตรงกับที่สคริปต์ใช้ — ต้องเป็น `http://localhost:8787/connect/google/callback` เป๊ะๆ (ไม่มี `/` ท้าย) |
| `invalid_grant` | consent screen ยังเป็น Testing แล้ว token หมดอายุ 7 วัน → ทำขั้นตอน 3.4 แล้วรัน `pnpm auth:google` ใหม่ |
| Google ไม่ส่ง refresh token กลับมา | เคยให้สิทธิ์แอปนี้ไปแล้ว → ถอนที่ https://myaccount.google.com/permissions แล้วรันใหม่ |
| HTTP 403 ตอน `check:access` | ยังไม่ได้ Explorer access (ขั้นตอน 5) หรือ Gmail ที่ล็อกอินไม่มีสิทธิ์ในบัญชีนั้น หรือเข้าผ่าน MCC แต่ไม่ได้ตั้ง `LOGIN_CUSTOMER_ID` |
| บ่นหา `developer-token` | ขัดกับ D11 ที่ว่า Google ยกเลิกไปแล้ว → แคปหน้าจอมาให้ Claude Code ดู แล้วบันทึกลง DECISIONS |

ติดตรงไหนที่ไม่มีในตาราง เอา error มาถาม Claude Code ได้เลย

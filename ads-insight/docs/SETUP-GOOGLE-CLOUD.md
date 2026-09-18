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

> **Windows / PowerShell:** path ที่มีเว้นวรรคต้องครอบด้วยเครื่องหมายคำพูด
> เช่น `cd "C:\Work\Google Ads Manage"` ไม่งั้นจะขึ้น
> *"A positional parameter cannot be found that accepts argument 'Ads'"*
> — เลี่ยงปัญหาได้ด้วยการตั้งชื่อโฟลเดอร์ไม่มีเว้นวรรค

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

**บังคับ:**
- **App name:** `Ads Insight`
- **User support email:** อีเมลคุณ
- **Developer contact email:** อีเมลคุณ

**บังคับเพิ่ม ถ้าจะกด Publish app ในข้อ 3.4** (ยืนยันจากหน้าจอจริง — ไม่ใส่แล้วปุ่ม Publish เป็นสีเทา):
- **Application home page:** URL เว็บของคุณ
- **Application privacy policy link:** URL หน้านโยบายความเป็นส่วนตัว
- **Authorized domains:** กด **Add domain** ใส่โดเมนของ URL ข้างบน
  (ใส่แค่โดเมนเปล่า เช่น `example.com` ไม่ต้องมี `https://` หรือ `www.`)
  — ถ้าไม่ใส่ตรงนี้ URL ข้างบนจะไม่ผ่าน

**ข้ามได้จริง:** โลโก้ (ใส่แล้วต้องผ่าน brand verification), terms of service link

> **ยังไม่มีเว็บ?** ข้ามไปก่อนได้ แล้วใช้ทาง B ในข้อ 3.4 — ตอน M2 ที่ deploy Worker ขึ้น Cloudflare
> จะได้โดเมน `*.workers.dev` มาใช้ทำหน้าแรก + `/privacy` แล้วค่อยกลับมากรอกตรงนี้

มุมขวาของหน้านี้จะเขียนว่า *"your app is in Testing status"* — ปกติ แก้ในข้อ 3.4

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

### 3.4 Publishing status — เลือก 1 ใน 2 ทาง
https://console.cloud.google.com/auth/audience

#### ทาง A — Publish app (ดีกว่า ถ้ามีเว็บ)
กด **Publish app** → ยืนยัน → สถานะเป็น **In production**

ถ้าปุ่มเป็น **สีเทากดไม่ได้** แปลว่าข้อ 3.1 ยังกรอกไม่ครบ (homepage URL + privacy policy URL)
— เอาเมาส์ไปชี้ที่ปุ่มจะมี tooltip บอกว่าขาดอะไร

ตอนล็อกอินจะเจอหน้า "Google hasn't verified this app" → กด **Advanced → Go to Ads Insight (unsafe)**
ผ่านได้ เพราะเป็นแอปที่คุณสร้างเองใช้เอง (จำกัด 100 users ตลอดอายุแอป ซึ่งเหลือเฟือ)

#### ทาง B — อยู่ Testing ไปก่อน
ใช้งานได้ครบเหมือนกัน แต่ **ต้องเพิ่มตัวเองเป็น test user ก่อน** ไม่งั้นล็อกอินไม่ผ่าน:

**Audience → Test users → `+ Add users`** → ใส่ **Gmail ที่ทำ Google Ads**

**ข้อเสียที่ต้องรู้:** ใน Testing status **refresh token หมดอายุทุก 7 วัน**
- ช่วง M1 ที่ยังพัฒนาบนเครื่อง: พอทนได้ แค่รัน `pnpm auth:google` ใหม่
- **ตั้งแต่ M3 เป็นต้นไป: ใช้ไม่ได้** เพราะมี cron รันทุกวันบน Cloudflare จะพังทุกสัปดาห์
  → ต้องย้ายไปทาง A ก่อนถึง M3

**แผนถ้ายังไม่มีเว็บ:** ตอน M2 deploy Worker ขึ้น Cloudflare จะได้โดเมน `*.workers.dev`
ให้ทำหน้าแรก + `/privacy` ใน Worker แล้วเอา URL มากรอกในข้อ 3.1 → กด Publish → จบ
(ดู DECISIONS D21)

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
→ ดูผังบัญชี แล้วเอาค่าที่แนะนำไปใส่ **`.dev.vars`**
   (`DEFAULT_CUSTOMER_ID`, `LOGIN_CUSTOMER_ID`, `TEST_CUSTOMER_ID`)

> ใส่ใน `.dev.vars` ไม่ใช่ `wrangler.toml` เพราะรีโปนี้เป็น public — commit Customer ID จริง
> ลงไปแล้วลบออกจากประวัติ git ไม่ได้ (DECISIONS D24) · `.dev.vars` อยู่ใน `.gitignore` แล้ว
> และการไม่แก้ไฟล์ที่ tracked ยังกัน conflict ตอน `git pull` ด้วย

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

## 10. Test account (ต้องมีก่อน **ปิด Gate M1** — ไม่ใช่ M4)

> แก้จากเดิมที่เขียนว่า "ต้องมีก่อน M4": SPEC §12 กำหนดว่า Gate M1 ต้องมี
> "validateOnly บน test account ผ่าน" จึงต้องมีตั้งแต่ตอนนี้

จำเป็นเพราะ **ห้ามทดสอบคำสั่งแก้ไขบัญชีกับบัญชีจริง** (CLAUDE.md)
test account ไม่มีการเรียกเก็บเงิน ไม่แสดงโฆษณาจริง และไม่มีข้อมูล performance เลย

### 10.1 สร้าง test manager account

test account ต้องอยู่ใน **สายบัญชีแยกของตัวเอง** โดยมี test manager account เป็นราก —
มันคุยกับบัญชีจริงไม่ได้ จึงเอาบัญชีจริงมาแปลงเป็น test ไม่ได้ ต้องสร้างใหม่

1. ไปที่ **https://ads.google.com/home/tools/manager-accounts/** (หน้าสมัคร manager account
   โดยตรง — ไม่ใช่หน้า ads.google.com ปกติ) แล้วล็อกอินด้วย Gmail ที่เลือก (ดูข้อถัดไปก่อนว่าจะใช้ตัวไหน)
2. กด **Create a manager account** จะเจอหน้า **"ยืนยันข้อมูลทางธุรกิจของคุณ"** (ยืนยันจากภาพจริง
   18 ก.ย. 2569 — คนละแบบฟอร์มกับที่เคยเขียนไว้):
   - **ชื่อที่แสดงของบัญชี** — ใส่อะไรก็ได้ เช่น `Ads Insight Test`
   - **การใช้งานหลักของบัญชี** — เลือก **"จัดการบัญชีของฉัน"** (ไม่ใช่ "จัดการบัญชีของผู้อื่น"
     ซึ่งเป็นโหมดเอเจนซี่รับดูแลลูกค้า — ตรงนี้เราสร้างไว้ดูแลบัญชีทดสอบของเราเอง)
   - **ประเทศสำหรับการเรียกเก็บเงิน** — **ประเทศไทย** (แก้ทีหลังไม่ได้) — ชื่อช่องมีคำว่า
     "เรียกเก็บเงิน" แต่เป็นแค่ metadata ของบัญชี (locale/currency) **ไม่ใช่การผูก billing
     profile จริง** กรอกได้ ไม่ขัดกับข้อ 4
   - **เขตเวลา** — (GMT+07:00) เวลาไทย (แก้ทีหลังไม่ได้)
   - **สกุลเงิน** — บาท (THB ฿) ให้ตรงกับบัญชีจริง (แก้ทีหลังไม่ได้เช่นกัน)
   - ติ๊ก **I'm not a robot** (reCAPTCHA) แล้วกด submit
3. เข้าแดชบอร์ด manager account ว่างๆ **ไม่ต้องกรอกบัตรเครดิตในหน้านี้**
4. **ห้ามกด "Link a billing account" หรือใส่วิธีจ่ายเงินใดๆ ให้ manager account ตัวนี้เด็ดขาด**
   ถ้ามีหน้า/ป็อปอัพชวนผูก billing account โผล่มาหลังจากนี้ **ข้ามไปได้เลย ไม่ต้องกรอก**
   — พอมี billing profile ผูกแล้ว บัญชีลูกที่สร้างจากนี้จะไม่เป็น test account อัตโนมัติอีกต่อไป
5. Customer ID อยู่มุมขวาบน รูปแบบ `XXX-XXX-XXXX` → จดไว้ ตัดขีดออกใส่ `TEST_LOGIN_CUSTOMER_ID`

**⚠️ จุดที่ต้องตัดสินใจ: จะใช้ Gmail ไหนสร้าง**

เอกสาร Google บอกให้ใช้ Gmail ที่ **ไม่ผูกกับ manager account จริง** — บัญชีของเราเป็น
บัญชีตรงไม่มี MCC (STATUS) จึงมีโอกาสใช้ `wilaibumbim34@gmail.com` (ตัวเดิม) ได้เลย
**ถ้า Google ไม่ยอม** ให้สร้างด้วย Gmail อื่น แล้ว**เพิ่ม `wilaibumbim34@gmail.com`
เป็นผู้ใช้ของ test manager** (Admin access) — สำคัญมาก เพราะ refresh token ที่มีอยู่
ผูกกับ Gmail ตัวนั้น ถ้า test manager อยู่คนละ Gmail แล้วไม่ได้เชิญเข้ามา
token เดิมจะมองไม่เห็น ต้องไปรัน `pnpm auth:google` ใหม่ทั้งชุด

### 10.2 สร้าง test client account

**อยู่ใน test manager account** กดปุ่ม **"สร้าง"** สีน้ำเงินมุมซ้ายบน จะเจอ dropdown 3 ตัวเลือก
(ยืนยันจากภาพจริง 18 ก.ย. 2569):

| ตัวเลือกในเมนู | คืออะไร | ใช้ไหม |
|---|---|---|
| สร้างบัญชีดูแลจัดการใหม่ | manager ซ้อนใต้ manager | ❌ |
| **สร้างบัญชีใหม่** | บัญชีโฆษณาลูกใหม่ทั้งหมด | ✅ กดตัวนี้ |
| ลิงก์บัญชีที่มีอยู่ | ดึงบัญชีที่มีอยู่แล้ว (เช่นบัญชีจริง) เข้ามา | ❌ ห้ามกด — จะไม่ได้ test account |

หลังกด "สร้างบัญชีใหม่" Google **สร้างบัญชีให้ทันที** (Customer ID ขึ้นที่หัวจอแล้ว) แล้วพาเข้า
ตัวช่วยสร้างแคมเปญแรกแบบ Smart ("มาเริ่มด้วยการพูดคุยเกี่ยวกับธุรกิจของคุณกัน") — **ข้ามได้เลย**
ไม่ต้องกรอกชื่อธุรกิจ/URL/เบอร์โทร: กด **✕** มุมซ้ายบนออกจากตัวช่วยนี้ (ยืนยันออกถ้ามีถาม)
จะกลับไปหน้าแดชบอร์ดของบัญชีใหม่ที่ว่างเปล่า — ตรงตามที่ต้องการ

บัญชีลูกทุกตัวที่สร้างจาก test manager ด้วยวิธีนี้ **เป็น test account อัตโนมัติ**
(ถ้าไม่ใช่จริง `pnpm check:mutate` จะตรวจพบและปฏิเสธทำงานต่อ ไม่ต้องเชื่อขั้นตอนนี้เฉยๆ)

จด Customer ID ของ **client** ตัวนี้ → ใช้เป็น `TEST_CUSTOMER_ID`

> **หาบัญชีไม่เจอในหน้าจอ?** test account จะขึ้นสถานะ **cancelled** ใน UI
> ต้องเปลี่ยนตัวกรองให้แสดงบัญชีที่ cancelled ด้วย ถึงจะเห็น
> (จำกัด 50 บัญชีต่อ 1 สายบัญชี)

### 10.3 ใส่ค่าใน `.dev.vars`

```
TEST_CUSTOMER_ID=xxxxxxxxxx        # client (ตัวที่จะโดนคำสั่งทดสอบ)
TEST_LOGIN_CUSTOMER_ID=xxxxxxxxxx  # manager (ตัวราก)
```

**ทั้งคู่ ไม่ใช่แค่ตัวเดียว** — test client อยู่ใต้ manager การเรียก API จึงต้องบอกว่า
เข้ามาทาง manager ตัวไหน ถ้าไม่ใส่ Google ตอบ **404** ซึ่งอ่านแล้วเหมือน "ไม่มีบัญชีนี้"
ทำให้ไปไล่หาผิดจุด (บทเรียนเดียวกับ D25)

ไม่ต้องขอสิทธิ์ API เพิ่ม — Explorer ที่มีอยู่ใช้กับ test account ได้อยู่แล้ว
(Cloud project ที่ยังไม่ได้สิทธิ์ production ก็ยิง test account ได้)

### 10.4 รัน Gate

```bash
pnpm check:mutate
```

ตรวจ 3 ข้อ: อ่านบัญชีได้ + **ยืนยันว่าเป็น test account จริง** (`customer.test_account`) →
คำสั่งที่ถูกต้องผ่าน `validateOnly` โดยไม่สร้างของจริง → คำสั่งที่ผิด (งบติดลบ) ถูกปฏิเสธ
พร้อมข้อความไทย

สคริปต์**ไม่ยอมรัน**ถ้า `TEST_CUSTOMER_ID` ตรงกับบัญชีจริง หรือถ้าบัญชีปลายทาง
ไม่ใช่ test account — ไม่พึ่ง `validateOnly` อย่างเดียว เพราะนั่นเป็นคำสัญญาจากฝั่ง
เซิร์ฟเวอร์ ไม่ใช่สิ่งที่สคริปต์บังคับได้เอง

> ขั้นตอนข้างบนเรียบเรียงจากเอกสาร Google (เข้าถึงหน้าเอกสารตรงๆ จากฝั่ง Claude ไม่ได้
> โดนบล็อก) **ถ้าหน้าจอจริงไม่ตรง ส่งภาพมา แล้วจะแก้ไฟล์นี้ให้** — คู่มือนี้ผิดมาแล้ว 3 จุด
> ตอนทำข้อ 1–9 และแก้จากภาพหน้าจอจริงทุกครั้ง

---

## เจอปัญหาบ่อยๆ

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `invalid_client` | Client ID/Secret ไม่ตรง — copy มาไม่ครบ หรือใส่สลับช่อง |
| `redirect_uri_mismatch` | URI ใน OAuth client ไม่ตรงกับที่สคริปต์ใช้ — ต้องเป็น `http://localhost:8787/connect/google/callback` เป๊ะๆ (ไม่มี `/` ท้าย) |
| `invalid_grant` | consent screen ยังเป็น Testing แล้ว token หมดอายุ 7 วัน → รัน `pnpm auth:google` ใหม่ (หรือย้ายไปทาง A ในข้อ 3.4) |
| `access_denied` ตอนล็อกอิน | อยู่ Testing แต่ยังไม่ได้เพิ่ม Gmail นั้นใน **Test users** (ข้อ 3.4 ทาง B) |
| ปุ่ม **Publish app** เป็นสีเทา | ข้อ 3.1 ยังขาด homepage URL / privacy policy URL / Authorized domains |
| ยิง test account แล้วได้ **404** | ยังไม่ได้ตั้ง `TEST_LOGIN_CUSTOMER_ID` — test client ต้องเข้าผ่าน test manager (ข้อ 10.3) |
| หา test account ไม่เจอในหน้า Google Ads | test account ขึ้นเป็น **cancelled** ต้องเปิดตัวกรองให้แสดงบัญชีที่ cancelled (ข้อ 10.2) |
| `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` ตอน `pnpm install` | lockfile มีแพ็กเกจที่เผยแพร่ไม่ถึง 24 ชม. **อย่าปิดนโยบายนี้** — เป็นระบบกันภัย supply-chain · แจ้ง Claude Code ให้ resolve lockfile ใหม่ด้วยเวอร์ชันที่นิ่งกว่า (ดู DECISIONS D22) |
| `A positional parameter cannot be found` ใน PowerShell | path มีเว้นวรรคแต่ไม่ได้ครอบด้วย `"..."` |
| `ERR_PNPM_IGNORED_BUILDS` (esbuild / workerd) | `pnpm-workspace.yaml` ต้องใช้คีย์ `allowBuilds` — pnpm 11 เมิน `onlyBuiltDependencies` (ดู DECISIONS D23) · ถ้ายังเจอ ให้เช็คว่า pnpm ตรงกับ `packageManager` ใน `package.json` |
| `git pull` ขึ้น *"Your local changes to pnpm-workspace.yaml would be overwritten"* | ตอน `ERR_PNPM_IGNORED_BUILDS` **pnpm เขียน stub `allowBuilds:` ลงไฟล์เอง** ทำให้ไฟล์มี local change ค้าง → `git checkout -- ads-insight/pnpm-workspace.yaml` แล้ว pull ใหม่ (stub นั้นทิ้งได้ ของจริงอยู่ในรีโปแล้ว) |
| Google ไม่ส่ง refresh token กลับมา | เคยให้สิทธิ์แอปนี้ไปแล้ว → ถอนที่ https://myaccount.google.com/permissions แล้วรันใหม่ |
| HTTP 403 ตอน `check:access` | ยังไม่ได้ Explorer access (ขั้นตอน 5) หรือ Gmail ที่ล็อกอินไม่มีสิทธิ์ในบัญชีนั้น หรือเข้าผ่าน MCC แต่ไม่ได้ตั้ง `LOGIN_CUSTOMER_ID` |
| บ่นหา `developer-token` | ขัดกับ D11 ที่ว่า Google ยกเลิกไปแล้ว → แคปหน้าจอมาให้ Claude Code ดู แล้วบันทึกลง DECISIONS |

ติดตรงไหนที่ไม่มีในตาราง เอา error มาถาม Claude Code ได้เลย

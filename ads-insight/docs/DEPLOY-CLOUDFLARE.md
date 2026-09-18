# Deploy M2 ขึ้น Cloudflare จริง

โค้ดของ M2 (OAuth + MCP server + 11 tools) เสร็จและทดสอบผ่าน `wrangler dev` ในเครื่องแล้ว
ขั้นตอนที่เหลือทั้งหมดต้องใช้บัญชี Cloudflare ของคุณ — Claude Code ทำแทนไม่ได้ เหมือนตอน M0
ที่ต้องใช้บัญชี Google Cloud ของคุณ

รันทุกคำสั่งจากโฟลเดอร์ `ads-insight/`

## 1. ล็อกอิน Cloudflare (ถ้ายังไม่เคยทำ)

```bash
pnpm exec wrangler login
```

จะเปิดเบราว์เซอร์ให้ล็อกอิน — เลือกบัญชี Cloudflare ที่จะใช้ (ฟรีก็ได้ ไม่ต้องมี domain ของตัวเอง
Worker จะได้ subdomain แบบ `ads-insight.<ชื่อบัญชี>.workers.dev` ให้อัตโนมัติ)

## 2. สร้าง D1 database (แค่สร้างตัวเปล่า schema ยังไม่ต้องมีจนถึง M3)

```bash
pnpm exec wrangler d1 create ads_insight
```

คำสั่งจะพิมพ์ `database_id` ออกมา (รูปแบบ UUID) — เอาไปแทนที่
`REPLACE_WITH_D1_DATABASE_ID` ใน `wrangler.toml` (บรรทัด `database_id = "..."` ใต้หัวข้อ `# ── D1`)

> **ทำไมต้องสร้างตอนนี้ทั้งที่ยังไม่ใช้:** `wrangler deploy` ตัวจริง (ไม่ใช่ `--dry-run`) ตรวจสอบว่า
> ทุก binding ใน `wrangler.toml` ชี้ไปที่ resource ที่มีอยู่จริง ถ้ายังเป็น placeholder string
> deploy จะ fail ทันที ไม่เกี่ยวกับว่าโค้ด M2 เรียกใช้ D1 จริงหรือยัง

## 3. สร้าง KV namespace สำหรับ OAuth

```bash
pnpm exec wrangler kv namespace create OAUTH_KV
```

เอา `id` ที่ได้ไปแทนที่ `REPLACE_WITH_KV_NAMESPACE_ID` ใน `wrangler.toml`
(บรรทัด `id = "..."` ใต้หัวข้อ `# ── OAuth KV`)

## 4. ตั้งค่า Worker secrets

ค่าเดียวกับใน `.dev.vars` ของคุณ แต่ตั้งเป็น Cloudflare secret แยกทีละตัว
(ทุกคำสั่งจะถามให้พิมพ์ค่าใน prompt ไม่ต้องใส่ในบรรทัดคำสั่งเพื่อกันหลุดไปอยู่ใน shell history):

```bash
pnpm exec wrangler secret put GOOGLE_OAUTH_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
pnpm exec wrangler secret put GOOGLE_ADS_REFRESH_TOKEN
pnpm exec wrangler secret put OWNER_EMAILS
pnpm exec wrangler secret put TOKEN_ENC_KEY
pnpm exec wrangler secret put SESSION_SECRET
```

`DEV_BEARER_TOKEN` **ไม่ต้องตั้ง** บน production — ใช้เฉพาะตอน `ENV=dev` ในเครื่องเท่านั้น
(`src/index.ts` เช็ค `env.ENV === 'dev'` ก่อนถึงจะยอมใช้ bearer token bypass)

## 5. Deploy

```bash
pnpm deploy
```

เสร็จแล้วจะได้ URL เช่น `https://ads-insight.<ชื่อบัญชี>.workers.dev`
ลองเปิด `https://ads-insight.<ชื่อบัญชี>.workers.dev/health` ควรได้ JSON `{"ok": true, ...}`

## 6. เพิ่ม redirect URI ใน Google Cloud OAuth client

กลับไปที่ Google Cloud Console → โปรเจ็คที่ทำไว้ตอน M0 → **APIs & Services → Credentials**
→ เปิด OAuth client (Web application) ที่ใช้อยู่ → **Authorized redirect URIs** → เพิ่ม:

```
https://ads-insight.<ชื่อบัญชี>.workers.dev/oauth/google/callback
```

(ใส่ domain จริงที่ได้จากข้อ 5 แทน `<ชื่อบัญชี>`) — **ห้ามลบ** URI เดิมของ `localhost:8787`
ออก ยังใช้ตอน dev อยู่

## 7. เพิ่ม custom connector ใน claude.ai

1. เปิด claude.ai → **Settings → Connectors** (หรือใน Claude Project ที่จะใช้)
2. กด **Add custom connector**
3. URL ใส่: `https://ads-insight.<ชื่อบัญชี>.workers.dev/mcp`
4. กด Connect — จะถูกพาไป login ด้วย Google (ต้องเป็นอีเมลที่อยู่ใน `OWNER_EMAILS`)
5. ล็อกอินสำเร็จ → connector พร้อมใช้

## 8. ทดสอบ (Gate M2, SPEC §12)

- ลองถามอะไรง่ายๆ เช่น "ดูภาพรวมบัญชีโฆษณาหน่อย" — Claude ควรเรียก `gads_get_account_overview` เอง
- เปิด claude.ai บนมือถือ (app หรือเว็บ) ลองถามคำถามเดิม
- แนะนำสร้าง **Claude Project ชื่อ "Ads Insight"** แล้วใส่เนื้อหา `docs/PLAYBOOK.md` เป็น
  project instructions (หรือให้ Claude เรียก `gads_get_playbook` / อ่าน resource `gads://playbook` เอง)
  แล้วลองสั่ง "ทำ weekly audit ให้หน่อย" — ควรไล่ตามลำดับใน PLAYBOOK (tracking → pacing →
  impression share → คำที่เผางบ → คุณภาพ → แอด → เวลา → บิด)

ผ่านครบ 3 ข้อนี้ = ปิด Gate M2 ได้

## แก้ปัญหาที่อาจเจอ

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `wrangler deploy` ฟ้อง binding ไม่ถูกต้อง | ยังไม่ได้แทน placeholder ใน `wrangler.toml` (ข้อ 2, 3) |
| Connector ใน claude.ai ล็อกอินไม่ผ่าน / วนลูป | อีเมลที่ล็อกอินไม่อยู่ใน `OWNER_EMAILS` — เช็คด้วย `wrangler secret put OWNER_EMAILS` ใหม่ (comma-separated, ไม่ต้องมีช่องว่าง) |
| Google ฟ้อง `redirect_uri_mismatch` | ยังไม่ได้เพิ่ม URI ใหม่ในข้อ 6 หรือพิมพ์ผิด (ต้องตรงเป๊ะรวม `https://` และ path `/oauth/google/callback`) |
| Tool เรียกแล้วได้ `invalid_client` จาก Google | `GOOGLE_ADS_REFRESH_TOKEN` หรือ `GOOGLE_OAUTH_CLIENT_ID/SECRET` ที่ตั้งเป็น secret ไม่ตรงกับใน `.dev.vars` — ตั้งใหม่ด้วยค่าที่ถูกต้อง |
| อยากแก้ secret ที่ตั้งผิด | รัน `wrangler secret put <ชื่อ>` ซ้ำได้เลย ทับค่าเดิม ไม่ต้องลบก่อน |

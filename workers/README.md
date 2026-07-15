# Tenant subdomain proxy (Cloudflare Worker)

พร็อกซีให้ `*.shopdashth.com` (subdomain ของทุกร้าน + `admin.`) วิ่งเข้าแอปบน Vercel
โดยไม่ต้องย้าย nameserver ออกจาก Cloudflare Registrar — ดูเหตุผลเชิงเทคนิคใน `tenant-proxy.js` และ `DEPLOYMENT.md §1.1`

apex `shopdashth.com` และ `www` **ไม่ผ่าน Worker** (เป็น DNS-only ต่อตรง Vercel อยู่แล้ว) — Worker จับเฉพาะ record `*` ที่ Proxied

---

## ตั้งค่าครั้งเดียว

### 1) สร้าง secret ให้ตรงกันทั้ง 2 ฝั่ง
```bash
openssl rand -hex 32        # ได้ค่าหนึ่ง เอาไปใช้ทั้ง Worker และ Vercel
```
- **Vercel** → Project → Settings → Environment Variables → เพิ่ม `TENANT_PROXY_SECRET` (Production) = ค่าที่สุ่มได้ → **redeploy** ให้ค่ามีผล
- **Worker** → ตั้งเป็น secret (ดูข้อ 2/3)

### 2) Deploy Worker — ทางเลือก A: CLI (แนะนำ)
```bash
cd workers
npx wrangler deploy
npx wrangler secret put TENANT_PROXY_SECRET   # วางค่าเดียวกับบน Vercel
```
`wrangler.toml` ผูก route `*.shopdashth.com/*` ให้อัตโนมัติ

### 2) Deploy Worker — ทางเลือก B: Dashboard (ไม่ใช้ CLI)
1. Cloudflare → **Workers & Pages** → **Create** → **Create Worker** → ตั้งชื่อ `shopdash-tenant-proxy` → Deploy
2. **Edit code** → วางเนื้อหาทั้งไฟล์ `tenant-proxy.js` → **Deploy**
3. **Settings → Variables and Secrets** → Add → **Secret** → `TENANT_PROXY_SECRET` = ค่าเดียวกับบน Vercel → Save
4. **Settings → Domains & Routes** → Add → **Route** → `*.shopdashth.com/*` → zone `shopdashth.com` → Save

### 3) ตรวจ DNS + SSL
- DNS record `*` = **CNAME → `cname.vercel-dns.com` แบบ Proxied (เมฆส้ม)** — ต้องเป็น Proxied ไม่งั้น Worker ไม่ทำงาน
- SSL/TLS mode: `Full` หรือ `Full (Strict)` ก็ได้ (Worker จัดการ TLS ไป Vercel เอง ไม่ขึ้นกับ mode นี้แล้ว)
- บน Vercel **ไม่จำเป็นต้องมี `*.shopdashth.com`** อีกต่อไป — จะลบทิ้งเพื่อไม่ให้ค้าง "Invalid Configuration" ก็ได้ (Worker ส่ง Host เป็น `shopdash-th.vercel.app` ซึ่งเป็นโดเมน valid ของโปรเจกต์อยู่แล้ว)

---

## ตรวจว่าใช้ได้
```bash
curl -sI https://nene.shopdashth.com/            # ควร 200/307 ไม่ใช่ 525/403
curl -sI https://admin.shopdashth.com/admin      # เข้า super admin ได้
```

## ข้อควรรู้
- ถ้าเปลี่ยนชื่อโปรเจกต์/โดเมน production บน Vercel → แก้ `ORIGIN_HOST` ใน `tenant-proxy.js` แล้ว deploy ใหม่
- อัปโหลดรูปจากหลังร้าน (presigned PUT เข้า R2 ตรงๆ ไม่ผ่าน Worker) → ต้องเพิ่ม `https://*.shopdashth.com` ใน R2 bucket CORS (DEPLOYMENT.md §4)
- ลิงก์รีเซ็ตรหัสผ่านทางอีเมล: เพิ่ม `https://*.shopdashth.com/**` + `https://admin.shopdashth.com/**` ใน Supabase → Auth → URL Configuration → Redirect URLs

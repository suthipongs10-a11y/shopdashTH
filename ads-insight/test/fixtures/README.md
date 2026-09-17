# test/fixtures

Response จริงจาก Google Ads API ที่ **ลบข้อมูลส่วนตัวแล้ว** ใช้ทดสอบ logic วิเคราะห์

จำเป็นเพราะ test account ของ Google ไม่มีข้อมูล performance เลย (SPEC §4) — ถ้าไม่มี fixtures
จะทดสอบ derived metrics / pacing / guardrails ไม่ได้

## วิธีเก็บ

```bash
pnpm capture:fixtures                      # ลบข้อมูลส่วนตัวให้อัตโนมัติ
pnpm capture:fixtures --keep-search-terms  # เก็บคำค้นจริงไว้ (ตัดสินใจเอง)
```

รันบนเครื่องที่มี `.dev.vars` จริง — ใช้ ~7 API call · **อ่านอย่างเดียว**

สคริปต์แทนที่ให้ก่อนเขียนไฟล์: Customer ID และ id ทุกตัว (คงความสัมพันธ์ไว้ ให้ join กันได้),
ชื่อแคมเปญ/ad group, ข้อความแอด, คำค้น, URL, อีเมล, เบอร์โทร —
แล้ว**ตรวจซ้ำ** ว่าไม่มี Customer ID หรือชื่อบัญชีจริงหลงเหลือ ถ้าเจอจะไม่เขียนไฟล์นั้นเลย

ตัวเลข metrics ทั้งหมดถูกเก็บไว้ตามจริง เพราะนั่นคือสิ่งที่ fixtures มีไว้ทดสอบ

> สคริปต์เป็นด่านแรก **ตาคนคือด่านสุดท้าย** — เปิดอ่านก่อน commit ทุกครั้ง

## กติกาก่อน commit fixture
- ลบ/แทนที่: customer ID จริง, ชื่อบัญชี, ชื่อลูกค้า, เบอร์โทร, URL ของเว็บจริง, ข้อความแอดที่ระบุตัวตนได้
- เก็บ shape และชนิดข้อมูลไว้ให้ครบ (ตัวเลข metrics ปลอมได้ แต่ต้องสมจริง)
- ตั้งชื่อตาม resource ที่ query: `search-term-view.30d.json`, `campaign.metrics.json`
- ไฟล์ที่ยังไม่ได้ลบข้อมูลส่วนตัว ให้ตั้งชื่อลงท้าย `.raw.json` — `.gitignore` กันไว้แล้ว

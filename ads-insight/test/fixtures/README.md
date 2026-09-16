# test/fixtures

Response จริงจาก Google Ads API ที่ **ลบข้อมูลส่วนตัวแล้ว** ใช้ทดสอบ logic วิเคราะห์

จำเป็นเพราะ test account ของ Google ไม่มีข้อมูล performance เลย (SPEC §4) — ถ้าไม่มี fixtures
จะทดสอบ derived metrics / pacing / guardrails ไม่ได้

เริ่มเก็บใน **M1** พร้อมกับ `src/ads/client.ts`

## กติกาก่อน commit fixture
- ลบ/แทนที่: customer ID จริง, ชื่อบัญชี, ชื่อลูกค้า, เบอร์โทร, URL ของเว็บจริง, ข้อความแอดที่ระบุตัวตนได้
- เก็บ shape และชนิดข้อมูลไว้ให้ครบ (ตัวเลข metrics ปลอมได้ แต่ต้องสมจริง)
- ตั้งชื่อตาม resource ที่ query: `search-term-view.30d.json`, `campaign.metrics.json`
- ไฟล์ที่ยังไม่ได้ลบข้อมูลส่วนตัว ให้ตั้งชื่อลงท้าย `.raw.json` — `.gitignore` กันไว้แล้ว

# STATUS — hachangdd.com

- **Milestone ปัจจุบัน:** M1 เสร็จแล้ว → รอ approve ก่อนเริ่ม M2
- **Session ล่าสุด:** 2026-08-21
- **Branch:** `claude/hachangdd-project-setup-ov8601`

## เสร็จแล้ว (M1)

- [x] Scaffold Astro 7 + Tailwind CSS v4 (ผ่าน `@tailwindcss/vite`) + `@astrojs/sitemap` ในโฟลเดอร์ `hachangdd/`
  - ตั้ง `vite.css.postcss = {}` เพื่อไม่ให้ Vite ไปหยิบ `postcss.config.mjs` ของ ShopDash ที่รากเรพอ
  - `trailingSlash: 'always'` + `build.format: 'directory'` ให้ตรงกับโครงสร้าง URL ในข้อ 3 ของ CLAUDE.md
- [x] `src/data/site.ts` — data model ครบ: 1 บริการ (ล้างแอร์: ตารางราคา 6 แถว, trust bullets, ขั้นตอน 4 ขั้น, FAQ 8 ข้อ) × 1 จังหวัด (อุบลราชธานี) × 6 อำเภอ พร้อมตำบลจริงอำเภอละ 10 แห่ง + `neighbors` สำหรับ internal link
- [x] Layout หลัก: `BaseLayout.astro` (meta/canonical/OG/JSON-LD slot/ฟอนต์ Noto Sans Thai), `Header.astro` (โลโก้ + เมนู + ปุ่มโทร), `Footer.astro` (ลิงก์ทุกอำเภอ), `StickyCta.astro` (แถบโทร/LINE ล่างจอเฉพาะมือถือ)
- [x] `CtaButtons.astro` + `Icons.astro` (SVG inline, ไม่มี JS ฝั่ง client เลยทั้งเว็บ)
- [x] `scripts/check-launch.mjs` + `npm run check:launch` — ด่านกัน launch ทั้งที่เบอร์/LINE ยังเป็น placeholder (ตอนนี้ fail ตามที่ควรเป็น)
- [x] หน้าแรกชั่วคราวที่ `/` แสดงลิงก์ครบ 6 อำเภอ (หน้าแรกตัวจริงทำใน M3)

**ตรวจแล้ว:** `npm run build` ผ่าน (1 หน้า + sitemap), `npm run check` = 0 errors / 0 warnings

## งานถัดไป (M2 — ยังไม่เริ่ม รอ approve)

- [ ] `src/pages/[service]/[province]/[district].astro` — money page ครบ 9 section
- [ ] หน้าบริการ `/lang-air/` และหน้าจังหวัด `/lang-air/ubon-ratchathani/`
- [ ] JSON-LD 3 ตัว: `LocalBusiness`, `FAQPage`, `BreadcrumbList`
- [ ] เขียน `localIntro` (≥150 คำ) + `localFaqs` เฉพาะพื้นที่ ครบ 6 อำเภอ ลงใน `src/data/site.ts` (ฟิลด์เตรียมไว้แล้ว ยังว่าง)

## รอ user ตัดสินใจ / ต้องได้ข้อมูลจริง

1. **เบอร์โทรจริง** — ตอนนี้เป็น `08X-XXX-XXXX` ทั้ง `phone` และ `phoneTel` ใน `src/data/site.ts`
2. **LINE OA** — ยังไม่ได้สร้าง `@hachangdd` ลิงก์ปัจจุบันเป็นการเดา URL
3. **ตำบลในแต่ละอำเภอ** — ใส่ตำบลจริงอำเภอละ 10 แห่งตามที่ทราบ ขอ user ช่วยตรวจว่าครอบคลุมย่านที่ช่างรับงานจริงไหม (ถ้าช่างไม่ไปบางตำบล ควรตัดออกก่อน launch)
4. **ช่วงราคา** — ใช้ช่วงราคาตลาดทั่วไป รอปรับตามดีลช่างพาร์ทเนอร์จริง (แก้ที่ `services[0].priceTable` ที่เดียว)
5. **โลโก้/OG image** — ตอนนี้ favicon เป็น SVG ตัวอักษร "ดี" และ `og-default.png` ยังไม่มีไฟล์ (ต้องทำก่อน M4)

## Notes

- โปรเจกต์นี้แยกขาดจาก ShopDash ที่รากเรพอ — ห้ามแก้ไฟล์นอกโฟลเดอร์ `hachangdd/`
- ยังไม่มี JS ฝั่ง client แม้แต่บรรทัดเดียว เมนูมือถือใช้แถวเลื่อนแนวนอนแทน hamburger + JS เพื่อรักษา Lighthouse ≥95

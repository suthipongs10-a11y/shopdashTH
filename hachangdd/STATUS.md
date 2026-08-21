# STATUS — hachangdd.com

- **Milestone ปัจจุบัน:** M1–M3 เสร็จ + รื้อ UX/UI และวางโครง SEO ใหม่ → เหลือ M4 (วัด Lighthouse + deploy)
- **Session ล่าสุด:** 2026-08-21
- **Branch:** `claude/hachangdd-project-setup-ov8601`

## หน้าเว็บที่มีตอนนี้ (19 หน้า build ผ่าน)

```
/                                        หน้าแรก
/lang-air/                               หน้าบริการ (hub)
/lang-air/ubon-ratchathani/              หน้าจังหวัด (hub)
/lang-air/ubon-ratchathani/{6 อำเภอ}/     money page — 9 section ครบตาม CLAUDE.md §5
/blog/  +  /blog/{5 บทความ}/              บทความ (MDX)
/reviews/                                รีวิวจากลูกค้า (noindex อัตโนมัติจนกว่าจะมีรีวิวจริง)
/about/  /contact/  /404  /robots.txt    หน้าประกอบ
```

## เสร็จแล้วในรอบนี้

### UX/UI ใหม่ทั้งหมด
- Design token ใหม่ใน `@theme` (`src/styles/global.css`): brand น้ำเงินลึก / action ส้ม (ปุ่มโทร) / LINE เขียว / star ทอง — ไม่มีสี hardcode ในคอมโพเนนต์เลย
- ฟอนต์ Noto Sans Thai แบบ **self-host** (variable 400–800, thai 27KB + latin 31KB) + `preload` → ตัด request ไป Google Fonts ทิ้ง
- คอมโพเนนต์กลาง 18 ตัว (Hero, Section, TrustBar, PriceTable, AreaCoverage, StepsTimeline, FaqAccordion, ReviewsSection, ReviewCard, StarRating, LinkGrid, CtaBanner, CtaButtons, InlineCta, Breadcrumbs, Header, Footer, StickyCta)
- **ไม่มี JavaScript ฝั่ง client เลยแม้แต่บรรทัดเดียว** — FAQ ใช้ `<details>`, เมนูมือถือใช้แถวเลื่อนแนวนอนแทน hamburger
- เป้ากดขั้นต่ำ 48px, sticky CTA ล่างจอบนมือถือ, skip link, `aria-current`, `prefers-reduced-motion`

### โครงสร้าง SEO
- `src/lib/seo.ts` เป็นศูนย์กลางเดียวของ meta + JSON-LD — ทุกหน้าปล่อย `@graph` ก้อนเดียวผูกกันด้วย `@id`
- Node: Organization / WebSite / WebPage / BreadcrumbList / Service (+areaServed รายตำบล) / FAQPage / Article
- **ไม่ใช้ `LocalBusiness` รายอำเภอโดยตั้งใจ** — ไม่มีที่ตั้งจริงต่อสาขา การประกาศสาขาปลอมผิดนโยบาย Google (เหตุผลเต็มใน CLAUDE.md §6.6)
- breadcrumb แสดงบนหน้าจริงและตรงกับ schema
- sitemap ตั้ง priority ตามชนิดหน้า (money page 0.9) + กันหน้า thin ออกอัตโนมัติ, robots.txt สร้างตอน build
- `npm run check:seo` — สคริปต์ตรวจ dist ทุกหน้า: title ≤70, description 70–170, h1 ตัวเดียว, canonical, og:*, JSON-LD, **ลิงก์ภายในตาย** → ตอนนี้ผ่านครบ 19 หน้า

### ระบบรีวิว
- `src/data/reviews.ts` + `ReviewsSection` / `ReviewCard` / `StarRating` + หน้า `/reviews/`
- `reviews` เป็น array ว่างตามนโยบาย — **ห้ามเติมรีวิวสมมติ** ส่วนรีวิวจะไม่ render และไม่มี schema ออกไปจนกว่าจะมีรีวิวจริง
- `AggregateRating` จะโผล่เมื่อมีรีวิว `verified` ครบ 3 รายการขึ้นไปเท่านั้น
- หน้า `/reviews/` ใส่ `noindex` + ตัดออกจาก sitemap อัตโนมัติระหว่างที่ยังว่าง

### เนื้อหา
- เนื้อหา unique ต่ออำเภอครบ 6 หน้า (ย่อหน้าเปิด 3 ย่อหน้า + 3 จุดเด่น + FAQ ท้องถิ่น 2 ข้อ) — เขียนจากบริบทจริงของแต่ละพื้นที่ ไม่ใช่เปลี่ยนแค่ชื่ออำเภอ
- บทความ 5 เรื่องตาม CLAUDE.md §6 (MDX) พร้อม CTA กลางเรื่อง + ลิงก์ในเนื้อความไปหน้าอำเภอ/บริการ/บทความอื่น

### อื่น ๆ
- OG image 1200×630 + apple-touch-icon + favicon สร้างจาก `npm run og`
- Cloudflare Web Analytics เสียบผ่าน env `PUBLIC_CF_BEACON_TOKEN` (ไม่ใส่ = ไม่โหลดสคริปต์ third-party เลย)
- `npm run verify` = check + build + check:seo → ผ่านทั้งหมด (0 type error)

## เหลือทำ (M4)

- [ ] **ใส่เบอร์โทรจริง + LINE OA จริง** ใน `src/data/site.ts` แล้วเปลี่ยน `contact.isPlaceholder` เป็น `false` (`npm run check:launch` จะ fail จนกว่าจะทำ)
- [ ] user ตรวจภาษา/ข้อเท็จจริงในบทความ 5 เรื่อง และช่วงราคาใน `services[0].priceTable`
- [ ] Deploy Cloudflare Pages (root directory `hachangdd`, build `npm run build`, output `dist`) + ต่อโดเมน
- [ ] วัด Lighthouse mobile จริง (เป้า Performance ≥ 95, SEO 100)
- [ ] ตรวจ schema ด้วย Rich Results Test บน URL จริง
- [ ] Submit sitemap เข้า Google Search Console

## รอ user ตัดสินใจ / ต้องได้ข้อมูลจริง

1. **เบอร์โทรจริง** — ตอนนี้ `08X-XXX-XXXX` ทั้ง `phone` และ `phoneTel`
2. **LINE OA** — ยังไม่ได้สร้าง `@hachangdd` ลิงก์ปัจจุบันเป็นการเดา URL
3. **ตำบลในแต่ละอำเภอ** — ใส่ตำบลจริงอำเภอละ 10 แห่ง ขอ user ยืนยันว่าช่างรับงานครบทุกตำบลที่ลิสต์ไว้จริง
4. **ช่วงราคา** — ใช้ราคาตลาดทั่วไป รอปรับตามดีลช่างพาร์ทเนอร์จริง (แก้ที่ `services[0].priceTable` ที่เดียว)
5. **ข้อมูลธุรกิจสำหรับ schema** — `business.address` / `business.geo` / `business.sameAs` ยังเป็น null/ว่าง
   ใส่เมื่อมีของจริงเท่านั้น (ที่อยู่ปลอมใน schema เสี่ยงโดน Google ลงโทษทั้งเว็บ)
6. **เนื้อหาบทความ** — เป็น draft ที่ Claude เขียน ต้องให้ user ตรวจก่อน โดยเฉพาะตัวเลขราคาและคำแนะนำเชิงเทคนิค

## Notes

- โปรเจกต์นี้แยกขาดจาก ShopDash ที่รากเรพอ — ห้ามแก้ไฟล์นอกโฟลเดอร์ `hachangdd/`
- `vite.css.postcss = {}` ใน `astro.config.mjs` จำเป็น ห้ามลบ ไม่งั้น Vite จะไปหยิบ `postcss.config.mjs` ของ ShopDash แล้ว build พัง
- ดาวรีวิวใน Google search ไม่ได้มาจาก schema บนเว็บตัวเอง (self-serving review ถูก Google ปิดตั้งแต่ 2019) — ต้องมาจาก Google Business Profile ของช่างจริง

# CLAUDE.md — hachangdd.com (หาช่างดีดี)

> Single source of truth ของโปรเจกต์นี้ อ่านไฟล์นี้ก่อนเริ่มงานทุก session
> อัปเดต STATUS.md ทุกครั้งก่อนจบ session เพื่อความต่อเนื่อง

---

## 0. ที่อยู่ในเรพอ (สำคัญ — อ่านก่อน)

โปรเจกต์นี้อยู่ใน **โฟลเดอร์ `hachangdd/` เท่านั้น** ในเรพอเดียวกับ ShopDash แต่ **แยกขาดจากกันสิ้นเชิง**:

- ไม่แชร์ `package.json`, `node_modules`, config, หรือโค้ดใด ๆ กับโปรเจกต์แม่
- `CLAUDE.md` ที่ราก repo เป็นของ ShopDash — **ไม่เกี่ยวกับโปรเจกต์นี้** ห้ามเอากติกา phase/DoD ของ ShopDash มาใช้กับที่นี่ และห้ามแก้ไฟล์นอก `hachangdd/` เว้นแต่ user สั่ง
- ทุกคำสั่งรันจากในโฟลเดอร์นี้: `cd hachangdd && npm install && npm run dev`

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server (localhost:4321) |
| `npm run build` | build static → `dist/` |
| `npm run preview` | เปิดดูผลลัพธ์ที่ build แล้ว |
| `npm run check` | ตรวจ type ของไฟล์ `.astro`/`.ts` |
| `npm run check:seo` | ตรวจโครงสร้าง SEO ของ `dist/` (ต้อง build ก่อน) — ดู §9 |
| `npm run check:launch` | ด่านกัน launch — fail ถ้าเบอร์โทร/LINE ยังเป็น placeholder (M4) |
| `npm run verify` | รวบ check + build + check:seo — **รันก่อน commit ทุกครั้ง** |
| `npm run og` | สร้าง `og-default.png` / `apple-touch-icon.png` / `favicon.svg` ใหม่ (รันเมื่อแก้แบรนด์) |

---

## 1. Project Overview

**ชื่อโปรเจกต์:** หาช่างดีดี (hachangdd.com)
**ประเภท:** Local service lead-gen website (rank-and-rent model)
**เป้าหมาย:** ดัก organic search "ล้างแอร์ + [พื้นที่]" ให้ติดอันดับ Google → รับ lead ผ่านโทร/LINE → ส่งต่อให้ช่างพาร์ทเนอร์ในพื้นที่ (คิดค่า lead หรือเหมาเดือน)

**เฟส 1 (ตอนนี้):** 1 บริการ (ล้างแอร์) × 1 จังหวัด (อุบลราชธานี) × 6 อำเภอ + บทความ 5 เรื่อง
**เฟสถัดไป:** เพิ่มอำเภอ → เพิ่มจังหวัด (ศรีสะเกษ) → เพิ่มบริการ (ซ่อมแอร์, ล้างเครื่องซักผ้า)

**หลักการสำคัญ:**

- ทุกหน้าเป็น landing page สมบูรณ์ในตัวเอง — ผู้ใช้ต้องตัดสินใจโทร/ทัก LINE ได้โดยไม่ต้องไปหน้าอื่น
- Data-driven: เพิ่มเมือง/บริการใหม่ = แก้ไฟล์ data ไม่ใช่เขียนหน้าใหม่
- ภาษาไทยทั้งหมด, mobile-first (ผู้ใช้ต่างจังหวัด 90%+ ใช้มือถือ)
- ความเร็วคือฟีเจอร์: static HTML, ไม่มี JS framework ฝั่ง client นอกจากจำเป็น

---

## 2. Tech Stack

| ส่วน | เลือกใช้ | เหตุผล |
|---|---|---|
| Framework | Astro 7 + MDX | Static output; MDX ใช้เพื่อวาง CTA กลางบทความโดยไม่ hardcode เบอร์โทร |
| Styling | Tailwind CSS v4 (ผ่าน `@tailwindcss/vite`) | design token อยู่ใน `@theme` ของ `src/styles/global.css` |
| ฟอนต์ | Noto Sans Thai (self-host, variable 400–800) | ไม่มี request ไป Google Fonts → ไม่ render-blocking |
| Hosting | Cloudflare Pages | ฟรี, CDN ในตัว, ต่อโดเมนง่าย |
| Data | ไฟล์ JSON/TS ใน `src/data/` | ไม่ใช้ DB — ไม่มี runtime cost |
| Forms | ไม่มีฟอร์มในเฟส 1 | ใช้ปุ่มโทร + LINE OA เท่านั้น (conversion สูงกว่าในตลาดต่างจังหวัด) |
| Analytics | Cloudflare Web Analytics + Google Search Console | ฟรี, พอสำหรับวัด lead |

**ห้ามเพิ่ม:** React/Vue components, CMS, database, auth — จนกว่าจะมีเหตุผลจาก lead จริง

---

## 3. โครงสร้าง URL

```
/                                          หน้าแรก (แบรนด์ + เลือกบริการ/พื้นที่)
/lang-air/                                 หน้าบริการล้างแอร์ (ภาพรวม + ลิงก์จังหวัด)
/lang-air/ubon-ratchathani/                หน้าจังหวัด (ภาพรวม + ลิงก์อำเภอ)
/lang-air/ubon-ratchathani/mueang/         หน้าอำเภอ = landing page หลัก (money page)
/lang-air/ubon-ratchathani/warin-chamrap/
/lang-air/ubon-ratchathani/det-udom/
/lang-air/ubon-ratchathani/phibun/
/lang-air/ubon-ratchathani/muang-sam-sip/
/lang-air/ubon-ratchathani/trakan/
/blog/                                     รวมบทความ
/blog/[slug]/                              บทความ
/about/                                    เกี่ยวกับเรา (สร้าง trust + E-E-A-T)
/contact/                                  ติดต่อ/สมัครเป็นช่างพาร์ทเนอร์
```

**กติกา URL:** ใช้ตัวโรมันคั่นด้วย hyphen (ไม่ใช้ URL ภาษาไทย encode — แชร์ใน LINE แล้วลิงก์ไม่เละ), slug สั้น, โครงสร้าง `/บริการ/จังหวัด/อำเภอ/` ตายตัวเพื่อรองรับการขยาย

---

## 4. Data Model

ไฟล์เดียวขับเคลื่อนทุกหน้า: `src/data/site.ts`

```ts
export const services = [
  {
    slug: "lang-air",
    nameTh: "ล้างแอร์",
    priceTable: [
      { type: "แอร์ผนัง 9,000–18,000 BTU", price: "400–600 บาท" },
      { type: "แอร์ผนัง 18,000–24,000 BTU", price: "500–700 บาท" },
      { type: "แอร์ฝังฝ้า 4 ทิศทาง", price: "800–1,200 บาท" },
      { type: "เติมน้ำยาแอร์ R32/R410a", price: "เริ่ม 500 บาท" },
    ],
    faqs: [ /* 6–8 ข้อ ต่อบริการ */ ],
  },
]

export const provinces = [
  {
    slug: "ubon-ratchathani",
    nameTh: "อุบลราชธานี",
    districts: [
      { slug: "mueang", nameTh: "เมืองอุบลราชธานี",
        areas: ["ในเมือง", "แจระแม", "ขามใหญ่", "ปทุม", "ไร่น้อย"] },
      { slug: "warin-chamrap", nameTh: "วารินชำราบ", areas: [...] },
      /* … 6 อำเภอ … */
    ],
  },
]

export const contact = {
  phone: "08X-XXX-XXXX",        // TODO: ใส่เบอร์จริง
  lineOaId: "@hachangdd",       // TODO: สร้าง LINE OA ก่อน launch
  lineUrl: "https://line.me/R/ti/p/@hachangdd",
}
```

หน้าอำเภอทั้งหมด generate จาก `getStaticPaths()` ที่วนลูป services × provinces × districts

**ฟิลด์เพิ่มเติมที่มีจริงในไฟล์ (นอกเหนือจากตัวอย่างข้างบน):**
`service.shortTh / tagline / intro / priceRange / priceNote / trustBullets / steps`,
`district.shortTh / neighbors (อำเภอข้างเคียงสำหรับ internal link) / localIntro / localFaqs (เนื้อหา unique ต่ออำเภอ)`,
`contact.phoneTel / hoursTh / email / isPlaceholder` และ helper `getService / getProvince / getDistrict / districtPath / …`

---

## 5. Template หน้าอำเภอ (money page)

ลำดับ section บนหน้า — เรียงตามหลัก conversion:

1. **H1:** "ล้างแอร์{อำเภอ} {จังหวัด} — ช่างถึงบ้าน ราคาชัดเจน"
2. **ปุ่ม CTA คู่ (above the fold):** โทรเลย (tel:) + ทัก LINE — sticky bottom bar บนมือถือด้วย
3. **Trust bullets:** ราคาแจ้งก่อนทำ / ช่างในพื้นที่{อำเภอ} / นัดคิวไว
4. **ตารางราคา** (จาก data)
5. **พื้นที่ให้บริการ:** ระบุตำบล/ย่านจาก `areas[]` — สำคัญมากสำหรับ local SEO
6. **ขั้นตอนบริการ** 4 ขั้น (ทัก → นัดคิว → ช่างเข้าบริการ → จ่ายเงินหลังงานเสร็จ)
7. **FAQ** (จาก data + คำถามเฉพาะพื้นที่ 1–2 ข้อ)
8. **บทความแนะนำ** (internal link ไป blog)
9. **ลิงก์อำเภอข้างเคียง** (internal link แนวนอน)

**Unique content ต่อหน้า:** ห้าม copy ข้ามอำเภอเปลี่ยนแค่ชื่อ — แต่ละหน้าต้องมีย่อหน้าเปิด + FAQ ท้องถิ่นที่เขียนเฉพาะ (อ้างถึงย่าน สภาพอากาศ ฝุ่น ลักษณะบ้านในพื้นที่) อย่างน้อย 150 คำต่อหน้า เพื่อไม่ให้ Google มองเป็น doorway pages

**Schema (JSON-LD) ทุกหน้าอำเภอ:**

- `LocalBusiness` (ชื่อ "หาช่างดีดี — ล้างแอร์{อำเภอ}", areaServed, telephone, priceRange)
- `FAQPage` จาก FAQ บนหน้า
- `BreadcrumbList`

---

## 6. บทความเฟส 1 (5 เรื่อง)

| Slug | หัวข้อ | Target keyword |
|---|---|---|
| lang-air-kee-duean-krang | ล้างแอร์กี่เดือนครั้งดี? | ล้างแอร์กี่เดือนครั้ง |
| air-mai-yen | แอร์ไม่เย็น เกิดจากอะไร แก้เองได้ไหม | แอร์ไม่เย็น |
| air-nam-yod | แอร์มีน้ำหยด สาเหตุและวิธีแก้ | แอร์น้ำหยด |
| raka-lang-air | ราคาล้างแอร์ 2569 แต่ละแบบเท่าไหร่ | ราคาล้างแอร์ |
| vithi-lueak-chang-air | วิธีเลือกช่างแอร์ ไม่ให้โดนโกง | ช่างแอร์ เลือกยังไง |

ทุกบทความ: 800–1,200 คำ, มี CTA กลางเรื่อง + ท้ายเรื่อง ลิงก์ลงหน้าจังหวัด/อำเภอ, `Article` schema

---

## 6.5 Design system (UX/UI)

**Token ทั้งหมดอยู่ที่ `@theme` ใน `src/styles/global.css` ที่เดียว** — ห้าม hardcode สีหรือฟอนต์ในคอมโพเนนต์

| กลุ่ม | ค่า | ใช้ตอนไหน |
|---|---|---|
| `brand-*` | น้ำเงินลึก #082e4b → #eff7fd | โครงหลัก ความน่าเชื่อถือ ความเย็น |
| `action-*` | ส้ม #e05600 | **ปุ่มโทรเท่านั้น** — สีนี้ = ลงมือ อ่านชัดกลางแดด |
| `line-*` | เขียว LINE #06c755 | ปุ่ม LINE เท่านั้น (สีแบรนด์ LINE ห้ามเปลี่ยน) |
| `ink-*` / `paper-*` | เทา-ขาว | ตัวอักษรและพื้นหลัง |
| `star-500` | เหลือง #f5a524 | ดาวรีวิว |

กติกา UI:
- **เป้ากดขั้นต่ำ 48px** (`btn` utility คุมให้แล้วด้วย `min-h-12`) — ผู้ใช้ส่วนใหญ่กดด้วยนิ้วโป้งบนมือถือ
- **ไม่มี JavaScript ฝั่ง client เลยทั้งเว็บ** — FAQ ใช้ `<details>`, เมนูมือถือใช้แถวเลื่อนแนวนอนแทน hamburger
  (hamburger ต้องใช้ JS และซ่อนลิงก์จาก crawler โดยไม่จำเป็น)
- `body` ขนาด 17px มือถือ / 18px เดสก์ท็อป, `line-height: 1.8` — ภาษาไทยมีวรรณยุกต์บน-ล่าง ต้องการที่หายใจมากกว่าอังกฤษ
- Section สลับพื้น `white` / `tint` เพื่อให้แยกบล็อกออกจากกันได้บนจอเล็ก
- ทุกหน้ามี sticky CTA ล่างจอบนมือถือ + ปุ่มโทรบน header ตลอดเวลา

คอมโพเนนต์กลางอยู่ที่ `src/components/` — เพิ่มหน้าใหม่ให้ประกอบจากของเดิม อย่าเขียน markup ซ้ำ:
`Hero` `Section` `TrustBar` `PriceTable` `AreaCoverage` `StepsTimeline` `FaqAccordion`
`ReviewsSection` `ReviewCard` `StarRating` `LinkGrid` `CtaBanner` `CtaButtons` `InlineCta`
`Breadcrumbs` `Header` `Footer` `StickyCta` `Icons`

---

## 6.6 โครงสร้าง SEO (สำคัญที่สุดของโปรเจกต์นี้)

**ทุกอย่างที่เกี่ยวกับ meta และ schema ออกจาก `src/lib/seo.ts` ที่เดียว** ห้ามเขียน JSON-LD ใส่หน้าตรง ๆ

### JSON-LD แบบ @graph ก้อนเดียวต่อหน้า
แต่ละหน้าปล่อย `<script type="application/ld+json">` แค่ก้อนเดียว ข้างในเป็น `@graph` ที่ผูก entity ด้วย `@id`:

| Node | มีในหน้าไหน | หมายเหตุ |
|---|---|---|
| `Organization` (`#organization`) | ทุกหน้า | entity หลัก ทุก node อื่นอ้างถึงตัวนี้ |
| `WebSite` (`#website`) | ทุกหน้า | |
| `WebPage` (`{url}#webpage`) | ทุกหน้า | |
| `BreadcrumbList` | ทุกหน้า | ตรงกับ breadcrumb ที่มองเห็นบนหน้าจริง |
| `Service` (`{url}#service`) | หน้าแรก / บริการ / จังหวัด / อำเภอ | `areaServed` = อำเภอ + ทุกตำบลใน `areas[]` |
| `FAQPage` | หน้าที่มี FAQ จริงบนหน้า | ต้องมีคำถาม-คำตอบแสดงจริง ห้ามใส่ schema ลอย ๆ |
| `Article` | หน้าบทความ | |
| `Review` / `AggregateRating` | เมื่อมีรีวิวจริงถึงเกณฑ์เท่านั้น | ดู §6.7 |

**ทำไมไม่ใช้ `LocalBusiness` รายอำเภอ:** `LocalBusiness` หมายถึงสถานประกอบการที่มีที่ตั้งจริง
การประกาศ 6 สาขาที่ไม่มีอยู่จริงเพื่อให้ดูเป็นธุรกิจท้องถิ่นทุกอำเภอ = spam ตามนโยบาย Google
เราใช้ `Service` + `areaServed` + `provider` ชี้กลับ `Organization` เดียวแทน ซึ่งสื่อความหมายตรงกว่าและปลอดภัยกว่า
ถ้าวันหนึ่งมีที่อยู่จริง ให้เติม `business.address` / `business.geo` ใน `src/data/site.ts` — ตัวสร้าง schema จะใส่ให้เอง

### กติกาที่บังคับด้วยสคริปต์
`npm run check:seo` (สแกน `dist/`) จะ fail ถ้าเจอ:
1. `<title>` หาย หรือยาวเกิน 70 ตัวอักษร (รวมชื่อแบรนด์)
2. meta description หาย หรือไม่อยู่ระหว่าง 70–170 ตัวอักษร
3. `<h1>` ไม่ใช่ 1 ตัวพอดี
4. canonical หาย / ไม่ absolute / ไม่ปิดท้ายด้วย `/`
5. JSON-LD parse ไม่ผ่าน หรือไม่มี `@graph`
6. og:title / og:description / og:image / og:url ขาด
7. **ลิงก์ภายในตาย** (ชี้ไปหน้าที่ไม่มีใน `dist/`)

### Internal linking (ทำแล้ว อย่ารื้อ)
- หน้าแรก → จังหวัด → อำเภอ (hub → spoke) และย้อนกลับทุกชั้น
- อำเภอ → อำเภอข้างเคียง ผ่าน `district.neighbors` ใน data
- อำเภอ → บทความ 3 เรื่อง / บทความ → ทุกอำเภอ + บทความอื่น + ลิงก์ในเนื้อความ
- footer ลิสต์ทุกอำเภอทุกหน้า

### sitemap / robots
- `sitemap` ตั้ง priority อัตโนมัติใน `astro.config.mjs`: หน้าแรก 1.0 → **หน้าอำเภอ 0.9 (money page)** → hub 0.8 → บทความ 0.7 → about/contact 0.5
- หน้าที่ยังไม่มีเนื้อหาจริง (เช่น `/reviews/` ตอนที่ยังไม่มีรีวิว) ถูกกันออกจาก sitemap และใส่ `noindex` อัตโนมัติ
- `robots.txt` สร้างตอน build จาก `src/pages/robots.txt.ts`

---

## 6.7 ระบบรีวิว (`src/data/reviews.ts`)

**นโยบายเด็ดขาด: แสดงเฉพาะรีวิวจากลูกค้าจริงที่อนุญาตให้เผยแพร่ ห้ามแต่งรีวิวแม้แต่รายการเดียว**
รวมถึงห้ามใส่ "รีวิวตัวอย่าง" ไว้ก่อนแล้วค่อยเปลี่ยนทีหลัง

กลไกที่วางไว้:
- `reviews: Review[]` ตอนนี้เป็น **array ว่าง** — ถูกต้องแล้ว ไม่ต้องเติมอะไรจนกว่าจะมีรีวิวจริง
- ส่วนรีวิวบนหน้าอำเภอ/จังหวัด/บริการ **ไม่ render เลย** เมื่อไม่มีรีวิวของ scope นั้น
- `/reviews/` เป็นหน้าเดียวที่แสดงตอนว่าง โดยบอกตรง ๆ ว่ายังไม่มีรีวิว + วิธีส่งรีวิวทาง LINE และหน้านั้นถูกใส่ `noindex` + ตัดออกจาก sitemap อัตโนมัติจนกว่าจะมีรีวิว
- คะแนนเฉลี่ย + `AggregateRating` จะโผล่ก็ต่อเมื่อมีรีวิว `verified: true` ครบ `MIN_REVIEWS_FOR_RATING` (ตอนนี้ 3)

**ข้อเท็จจริงเรื่อง SEO ที่ต้องรู้:** รีวิวที่เจ้าของเว็บลงเองเกี่ยวกับธุรกิจตัวเอง (self-serving review)
Google **ไม่แสดงดาวใน search result** ตั้งแต่ปี 2019 ประโยชน์จริงของส่วนนี้คือ conversion + E-E-A-T
ถ้าอยากได้ดาวใน Google ต้องเป็นรีวิวใน **Google Business Profile ของช่างพาร์ทเนอร์จริง** เท่านั้น
(และตามกติกาข้อ 8 — ห้ามสร้าง GBP ปลอมหรือรีวิวปลอมเด็ดขาด)

วิธีเพิ่มรีวิวจริง: เพิ่ม object ใน `reviews` ให้ครบทุกฟิลด์ โดยเฉพาะ `districtSlug` (เพื่อให้ขึ้นหน้าอำเภอที่ถูก)
`source` (ช่องทางที่ได้รีวิวมา) และ `verified` (ใส่ `true` เฉพาะที่ตรวจย้อนกลับได้ว่ามีงานจริง)

---

## 7. Milestones (gated — commit + รอ approve ก่อนไปต่อ)

### M1: Scaffold + Data

- [x] Astro + Tailwind, โครงโฟลเดอร์ตามข้อ 3
- [x] `src/data/site.ts` ครบ 1 บริการ × 1 จังหวัด × 6 อำเภอ (พร้อม areas จริงของแต่ละอำเภอ)
- [x] Layout หลัก: header (โลโก้ + เบอร์โทร), footer, sticky mobile CTA bar
- **Checkpoint:** `git commit -m "M1: scaffold + data model"` → build ผ่าน, แสดงหน้าเปล่าได้

### M2: Money pages

- [x] Template หน้าอำเภอครบ 9 section ตามข้อ 5
- [x] หน้าบริการ + หน้าจังหวัด (hub pages ลิงก์ลงอำเภอ)
- [x] Schema JSON-LD (`@graph`: Organization / WebSite / WebPage / BreadcrumbList / Service / FAQPage) — ยังต้องยืนยันด้วย Rich Results Test หลัง deploy
- [x] เนื้อหา unique ต่ออำเภอครบ 6 หน้า (`localIntro` + `localHighlights` + `localFaqs` ใน data)
- **Checkpoint:** `git commit -m "M2: money pages"` → เปิดทุก URL ได้, schema valid

### M3: Blog + หน้าประกอบ

- [x] บทความ 5 เรื่องตามข้อ 6 (**draft จาก Claude — user ต้องตรวจภาษา/ข้อเท็จจริง/ราคา ก่อน launch**)
- [x] หน้าแรก, /about/, /contact/ (มี section "สมัครเป็นช่างพาร์ทเนอร์"), /reviews/, 404
- [x] Internal linking ครบ: blog↔money pages, อำเภอข้างเคียง, ลิงก์ในเนื้อความบทความ
- **Checkpoint:** `git commit -m "M3: content complete"`

### M4: Technical SEO + Launch

- [x] sitemap.xml (+priority), robots.txt, canonical, OG tags + og-default.png
- [ ] Lighthouse mobile: Performance ≥ 95, SEO = 100 (ยังไม่ได้วัดจริง — ต้องวัดหลัง deploy)
- [ ] `npm run check:launch` ผ่าน (ไม่มี placeholder เบอร์โทร/LINE หลงเหลือ)
- [ ] Deploy Cloudflare Pages + ต่อโดเมน hachangdd.com
- [ ] Submit Google Search Console + ยิง sitemap
- **Checkpoint:** `git commit -m "M4: launched"` + tag `v1.0`

### M5: หลัง launch (นอก scope โค้ด — ฝั่ง user ทำ)

- สร้าง LINE OA @hachangdd + เพจ Facebook "หาช่างดีดี"
- รอ 4–8 สัปดาห์ ดูอันดับใน GSC + จำนวนสายโทร/LINE เข้า
- มี lead จริง → ปิดดีลช่างพาร์ทเนอร์รายแรก → ค่อยตัดสินใจขยาย

---

## 8. กติกาการทำงาน (สำหรับ Claude Code)

- ทำทีละ milestone — จบแล้ว commit, สรุปสั้น ๆ, **หยุดรอ approve** ก่อนไป milestone ถัดไป
- ก่อนจบทุก session: อัปเดต `STATUS.md` (milestone ปัจจุบัน, งานค้าง, การตัดสินใจที่รอ user)
- เนื้อหาภาษาไทยทั้งหมดให้เขียนแบบภาษาพูดที่คนต่างจังหวัดอ่านสบาย ไม่ใช่ภาษาทางการ
- ราคาในตารางเป็น "ช่วงราคาแนะนำ" — user จะปรับตามดีลช่างจริงทีหลัง อย่า hardcode กระจายหลายที่ (อยู่ใน data เท่านั้น)
- เบอร์โทร/LINE ยังเป็น placeholder — ใส่ TODO ชัด ๆ ห้าม launch ทั้งที่ยังเป็น placeholder (M4 ต้องเช็คข้อนี้)
- ห้ามสร้าง GBP ปลอมหรือ review ปลอม — GBP จะทำผ่านช่างพาร์ทเนอร์จริงเท่านั้น (ดู §6.7)
- ห้ามใส่ที่อยู่/พิกัดที่ไม่มีจริงลง schema เพื่อให้ `LocalBusiness` "ครบ" (ดู §6.6)
- ก่อน commit ทุกครั้ง: `npm run verify` ต้องผ่าน

// Starter packs กลุ่ม "ธุรกิจบริการ" (ระดับ 1 ตามแผนขยายแนวธุรกิจ 2026-07-16):
// ล้าง-ติดตั้งแอร์ / ช่างประปา-ไฟฟ้า-สารพัดช่าง / รถยก-แท็กซี่-รถรับจ้าง
// รูปแบบ "เว็บแนะนำบริการ + ติดต่อผ่านแชท" — ทุก pack ปิด online_ordering (โหมด T1):
// ไม่มีตะกร้า/QR ลูกค้ากดดูบริการ+ราคาเริ่มต้น แล้วติดต่อทาง LINE/โทร
//
// "สินค้า" = รายการบริการ ราคา = ราคาเริ่มต้น, ป้าย variant เปลี่ยนเป็นคำของธุรกิจ
// (ขนาด BTU/ประเภทงาน ฯลฯ ผ่าน content.variantLabels — กลไกเดียวกับ pack ของเล่น)
// รูปเป็น flat illustration ที่ generate ไว้ใน public/demo/services/* — ร้านเปลี่ยนเป็น
// รูปหน้างานจริงของตัวเองทีหลังได้ (แก้สินค้า = flag ตัวอย่างหลุด ตามกติกาเดิม)

import type { StarterPack, StarterReview } from '@/lib/starter-packs/types';
import type { ThemeContent, UspItem } from '@/lib/theme-content';

const rv = (author: string, comment: string, daysAgo: number, rating = 5): StarterReview => ({
  rating,
  author,
  comment,
  daysAgo,
});

/** USP ร่วมของธุรกิจบริการ — แทน default ที่พูดเรื่องส่งของ/คืนสินค้า (ไม่ตรงบริบท) */
const SERVICE_USP: UspItem[] = [
  { icon: 'truck', title: 'บริการถึงที่', sub: 'ทีมงานไปหาคุณถึงหน้างาน' },
  { icon: 'clock', title: 'นัดหมายตรงเวลา', sub: 'แจ้งเวลาเข้างานล่วงหน้าชัดเจน' },
  { icon: 'lock', title: 'ราคาชัดเจน', sub: 'แจ้งราคาก่อนเริ่มงาน ไม่บวกเพิ่ม' },
  { icon: 'headset', title: 'ปรึกษาฟรี', sub: 'ทักแชทสอบถามได้ทุกวัน' },
];

const serviceContent = (args: {
  dir: string;
  eyebrow: string;
  headline: string;
  sub: string;
  tagline: string;
  storyTitle: string;
  storyBody: string;
  variantLabels: { size: string; color: string };
}): ThemeContent => {
  const IMG = (f: string) => `/demo/services/${args.dir}/${f}`;
  return {
    hero: {
      eyebrow: args.eyebrow,
      headline: args.headline,
      sub: args.sub,
      ctaText: 'ดูบริการและราคา',
      ctaHref: '/products',
      imageUrl: IMG('hero-01.webp'),
    },
    heroSlides: [
      {
        eyebrow: args.eyebrow,
        headline: args.headline,
        sub: args.sub,
        ctaText: 'ดูบริการและราคา',
        ctaHref: '/products',
        imageUrl: IMG('hero-01.webp'),
      },
    ],
    usp: SERVICE_USP,
    // แถบเตือนใต้ header (โหมดแชท T1) — บอกลูกค้าตรงๆ ว่าติดต่องานทางไหน
    disclaimer: { text: 'ดูบริการบนเว็บ แล้วติดต่องาน/นัดคิวผ่าน LINE หรือโทรศัพท์', highlight: 'ไม่มีระบบสั่งซื้อบนเว็บ' },
    featureListTitle: 'ใช้บริการง่ายๆ',
    featureList: [
      { title: 'เลือกดูบริการ', sub: 'ดูรายการบริการพร้อมราคาเริ่มต้นได้เลย' },
      { title: 'ทักแชทหรือโทร', sub: 'แจ้งรายละเอียดงาน ขอใบเสนอราคา' },
      { title: 'นัดวันเวลา', sub: 'ตกลงคิวเข้างานที่สะดวก' },
      { title: 'รับบริการถึงที่', sub: 'ทีมงานเข้าหน้างานตรงเวลา จ่ายเมื่องานเสร็จ' },
    ],
    featureListNoteHighlight: 'ราคาบนเว็บเป็นราคาเริ่มต้น — ราคาจริงแจ้งก่อนเริ่มงานทุกครั้ง',
    brandStory: {
      eyebrow: 'OUR SERVICE',
      title: args.storyTitle,
      body: args.storyBody,
      ctaText: 'ดูบริการทั้งหมด',
      ctaHref: '/products',
    },
    highlights: [
      { icon: 'shield', title: 'ช่างมีประสบการณ์', sub: 'ทำงานเรียบร้อย รับผิดชอบงาน' },
      { icon: 'tag', title: 'ราคาเริ่มต้นชัดเจน', sub: 'ประเมินราคาก่อนเริ่มงาน' },
      { icon: 'headset', title: 'ติดต่อง่าย', sub: 'LINE / โทร ตอบไว' },
      { icon: 'truck', title: 'บริการถึงที่', sub: 'ตามพื้นที่ให้บริการ' },
    ],
    tagline: args.tagline,
    variantLabels: args.variantLabels,
  };
};

const SERVICE_PAGES = [
  {
    slug: 'about',
    title: 'เกี่ยวกับเรา',
    sort_order: 0,
    body_md:
      'ยินดีให้บริการครับ\n\nเราเป็นทีมงานมืออาชีพ ใส่ใจคุณภาพงานทุกครั้ง ราคาชัดเจน ตรงเวลา\n\n*(นี่คือเนื้อหาตัวอย่าง — แก้ไขข้อความนี้ได้ที่เมนู "เพจ" ในหลังร้าน)*',
  },
  {
    slug: 'how-to-book',
    title: 'ขั้นตอนเรียกใช้บริการ',
    sort_order: 1,
    body_md:
      '## เรียกใช้บริการง่ายๆ\n\n1. เลือกดูบริการและราคาเริ่มต้นบนเว็บ\n2. ทักแชท LINE หรือโทรหาเรา แจ้งรายละเอียดงาน\n3. รับใบเสนอราคา/นัดวันเวลาเข้างาน\n4. ทีมงานเข้าบริการถึงที่ ชำระเงินเมื่องานเสร็จ\n\n*(นี่คือเนื้อหาตัวอย่าง — แก้ไขได้ที่เมนู "เพจ")*',
  },
];

const IMG_A = (f: string) => `/demo/services/aircon/${f}`;

export const AIRCON_PACK: StarterPack = {
  code: 'aircon',
  nameTh: 'ล้าง-ติดตั้งแอร์',
  featureOverrides: { online_ordering: false },
  requiredAssets: ['demo/services/aircon/hero-01.webp', 'demo/services/aircon/svc-01.webp'],
  categories: ['ล้างแอร์', 'ติดตั้ง-ย้ายแอร์', 'ซ่อม-เติมน้ำยา'],
  products: [
    {
      name: 'ล้างแอร์ติดผนัง',
      description_md:
        'ล้างแอร์ครบขั้นตอน คอยล์เย็น-คอยล์ร้อน-ถาดน้ำทิ้ง-โบลเวอร์ พร้อมเช็คน้ำยาเบื้องต้น\n\n- ราคาเริ่มต้นต่อเครื่อง — แจ้งราคาจริงก่อนเริ่มงาน',
      category: 'ล้างแอร์',
      base_price: 500,
      is_featured: true,
      images: [IMG_A('svc-01.webp')],
      sizes: ['9,000-12,000', '18,000-24,000'],
      colors: ['ล้างธรรมดา', 'ล้างพ่นโฟม'],
      stock: 99,
      created_days_ago: 40,
      reviews: [
        rv('คุณต่าย', 'ช่างมาตรงเวลา ล้างสะอาด แอร์เย็นขึ้นชัดเจนค่ะ', 5),
        rv('คุณบอย', 'เก็บงานเรียบร้อย ไม่ทิ้งคราบน้ำ แนะนำครับ', 14),
        rv('คุณส้มโอ', 'จองคิวทางไลน์ง่ายมาก ราคาตามแจ้งจริงค่ะ', 26, 4),
        rv('คุณหนุ่ม', 'ใช้บริการทุก 6 เดือน ประทับใจตลอดครับ', 38),
      ],
    },
    {
      name: 'ติดตั้งแอร์ใหม่ พร้อมเดินท่อ',
      description_md:
        'ติดตั้งแอร์ใหม่โดยช่างชำนาญ เดินท่อน้ำยา-สายไฟ-ท่อน้ำทิ้ง เก็บงานเรียบร้อย พร้อมทดสอบระบบ\n\n- ราคาเริ่มต้นรวมอุปกรณ์มาตรฐาน ท่อยาวเกินคิดตามจริง',
      category: 'ติดตั้ง-ย้ายแอร์',
      base_price: 2500,
      is_featured: true,
      images: [IMG_A('svc-02.webp')],
      sizes: ['9,000-12,000', '18,000-24,000'],
      colors: [null],
      stock: 99,
      created_days_ago: 35,
      reviews: [
        rv('คุณกานต์', 'งานท่อสวยมาก เดินเก็บเนี้ยบ ทดสอบให้ดูจนจบครับ', 8),
        rv('คุณพิม', 'ติดตั้ง 2 เครื่อง เสร็จในวันเดียว เรียบร้อยค่ะ', 20),
        rv('คุณเจฟ', 'ราคาสมเหตุสมผล ช่างแนะนำจุดติดตั้งดีมาก', 33, 4),
      ],
    },
    {
      name: 'เติมน้ำยาแอร์',
      description_md:
        'ตรวจแรงดันและเติมน้ำยาแอร์ R32 / R410A พร้อมเช็ครอยรั่วเบื้องต้น\n\n- ราคาเริ่มต้นต่อเครื่อง ขึ้นกับปริมาณที่เติมจริง',
      category: 'ซ่อม-เติมน้ำยา',
      base_price: 800,
      images: [IMG_A('svc-03.webp')],
      sizes: [null],
      colors: ['R32', 'R410A'],
      stock: 99,
      created_days_ago: 25,
      reviews: [
        rv('คุณโบ๊ท', 'เช็คละเอียด บอกสาเหตุน้ำยาหายด้วยครับ', 6),
        rv('คุณแนท', 'แอร์กลับมาเย็นฉ่ำ บริการดีค่ะ', 18),
      ],
    },
    {
      name: 'ตรวจเช็คแอร์ไม่เย็น',
      description_md:
        'ตรวจหาสาเหตุแอร์ไม่เย็น เสียงดัง น้ำหยด พร้อมประเมินราคาซ่อมก่อนเริ่มงาน\n\n- ค่าตรวจเช็คหักจากค่าซ่อมเมื่อตกลงทำงานต่อ',
      category: 'ซ่อม-เติมน้ำยา',
      base_price: 300,
      images: [IMG_A('svc-04.webp')],
      sizes: [null],
      colors: [null],
      stock: 99,
      created_days_ago: 15,
      reviews: [
        rv('คุณอาท', 'หาสาเหตุเจอไว แจ้งราคาก่อนซ่อม โปร่งใสดีครับ', 4),
        rv('คุณมิว', 'น้ำหยดหายขาด ช่างใจเย็นอธิบายดีค่ะ', 12),
      ],
    },
    {
      name: 'ย้ายจุดติดตั้งแอร์',
      description_md:
        'ถอด-ย้าย-ติดตั้งแอร์เครื่องเดิมไปจุดใหม่ เก็บน้ำยาอย่างถูกวิธี พร้อมเดินท่อใหม่ตามระยะ\n\n- ราคาเริ่มต้นย้ายภายในบ้านเดียวกัน',
      category: 'ติดตั้ง-ย้ายแอร์',
      base_price: 1800,
      images: [IMG_A('svc-05.webp')],
      sizes: ['9,000-12,000', '18,000-24,000'],
      colors: [null],
      stock: 99,
      created_days_ago: 10,
      reviews: [rv('คุณปอ', 'ย้ายห้องนอนไปห้องทำงาน งานไว ไม่มีรอยเลอะค่ะ', 7)],
    },
    {
      name: 'ล้างใหญ่แบบถอดล้าง',
      description_md:
        'ถอดโบลเวอร์-ถาดน้ำทิ้งออกมาล้างนอกเครื่อง เหมาะกับแอร์ที่ไม่ได้ล้างนาน มีกลิ่นอับ หรือเชื้อราสะสม',
      category: 'ล้างแอร์',
      base_price: 900,
      images: [IMG_A('svc-06.webp')],
      sizes: ['9,000-12,000', '18,000-24,000'],
      colors: [null],
      stock: 99,
      created_days_ago: 5,
      reviews: [rv('คุณฟ้าใส', 'กลิ่นอับหายจริง เหมือนได้แอร์ใหม่เลยค่ะ', 3)],
    },
  ],
  pages: SERVICE_PAGES,
  content: serviceContent({
    dir: 'aircon',
    eyebrow: 'AIR SERVICE',
    headline: 'ล้าง ติดตั้ง ซ่อมแอร์ ถึงบ้านคุณ',
    sub: 'ทีมช่างแอร์มืออาชีพ ราคาชัดเจน จองคิวผ่าน LINE ได้เลย',
    tagline: 'COOL & CLEAN SERVICE',
    storyTitle: 'ให้แอร์บ้านคุณเย็นเหมือนใหม่',
    storyBody:
      'ทีมช่างของเราผ่านงานติดตั้งและบำรุงรักษาแอร์มาหลายพันเครื่อง ทุกงานแจ้งราคาก่อนเริ่ม เก็บหน้างานสะอาด และรับประกันผลงาน',
    variantLabels: { size: 'ขนาด BTU', color: 'ประเภทงาน' },
  }),
  contentWithPages: {
    articles: [
      { title: 'เกี่ยวกับทีมช่างของเรา', imageUrl: IMG_A('hero-01.webp'), date: 'บทความจากร้าน', href: '/p/about' },
      { title: 'ขั้นตอนเรียกใช้บริการ', imageUrl: IMG_A('svc-01.webp'), date: 'คู่มือลูกค้า', href: '/p/how-to-book' },
    ],
  },
};

const IMG_H = (f: string) => `/demo/services/handyman/${f}`;

export const HANDYMAN_PACK: StarterPack = {
  code: 'handyman',
  nameTh: 'ช่างประปา-ไฟฟ้า-สารพัดช่าง',
  featureOverrides: { online_ordering: false },
  requiredAssets: ['demo/services/handyman/hero-01.webp', 'demo/services/handyman/svc-01.webp'],
  categories: ['งานประปา', 'งานไฟฟ้า', 'งานซ่อม-ทาสี'],
  products: [
    {
      name: 'ซ่อมท่อรั่ว ท่อตัน',
      description_md:
        'แก้ปัญหาท่อน้ำรั่ว น้ำหยด ท่อตัน ทั้งในบ้านและนอกบ้าน พร้อมอุปกรณ์ครบ จบในครั้งเดียว',
      category: 'งานประปา',
      base_price: 400,
      is_featured: true,
      images: [IMG_H('svc-01.webp')],
      sizes: [null],
      colors: ['ท่อรั่ว-น้ำหยด', 'ท่อตัน'],
      stock: 99,
      created_days_ago: 40,
      reviews: [
        rv('คุณนิด', 'ท่อใต้ซิงก์รั่วมานาน ซ่อมครั้งเดียวจบ ไม่รั่วซ้ำค่ะ', 6),
        rv('คุณเปา', 'มาไวมาก โทรเช้ามาบ่าย ราคาตามแจ้งครับ', 17),
        rv('คุณจิ๊บ', 'สุภาพ เก็บงานสะอาด จะเรียกใช้อีกแน่นอนค่ะ', 30, 4),
      ],
    },
    {
      name: 'งานไฟฟ้า เพิ่มปลั๊ก-ย้ายสวิตช์',
      description_md:
        'เดินสายไฟ เพิ่มจุดปลั๊ก ย้ายสวิตช์ ติดตั้งโคมไฟ โดยช่างที่เข้าใจมาตรฐานความปลอดภัย',
      category: 'งานไฟฟ้า',
      base_price: 500,
      is_featured: true,
      images: [IMG_H('svc-02.webp')],
      sizes: [null],
      colors: ['เพิ่มจุดปลั๊ก', 'ย้ายสวิตช์-โคมไฟ'],
      stock: 99,
      created_days_ago: 35,
      reviews: [
        rv('คุณเอก', 'เพิ่มปลั๊ก 3 จุด งานเรียบร้อย สายเก็บสวยครับ', 9),
        rv('คุณแพท', 'อธิบายก่อนทำทุกขั้นตอน ปลอดภัย ไว้ใจได้ค่ะ', 22),
      ],
    },
    {
      name: 'ติดตั้งสุขภัณฑ์ ก๊อกน้ำ ฝักบัว',
      description_md: 'ติดตั้ง-เปลี่ยนก๊อกน้ำ ฝักบัว สายฉีด ชักโครก อ่างล้างหน้า พร้อมเช็ครอยรั่วหลังติดตั้ง',
      category: 'งานประปา',
      base_price: 450,
      images: [IMG_H('svc-03.webp')],
      sizes: [null],
      colors: [null],
      stock: 99,
      created_days_ago: 25,
      reviews: [rv('คุณหน่อย', 'เปลี่ยนก๊อกทั้งบ้าน 5 จุด เสร็จไว ราคาน่ารักค่ะ', 11)],
    },
    {
      name: 'ซ่อมแซมทั่วไป แขวน-ประกอบ',
      description_md:
        'งานสารพัดช่าง: เจาะผนัง แขวนทีวี/ชั้นวาง ประกอบเฟอร์นิเจอร์ ซ่อมบานพับ ลูกบิด มุ้งลวด',
      category: 'งานซ่อม-ทาสี',
      base_price: 350,
      images: [IMG_H('svc-04.webp')],
      sizes: ['งานเล็ก (ราย จุด)', 'เหมาครึ่งวัน', 'เหมาเต็มวัน'],
      colors: [null],
      stock: 99,
      created_days_ago: 15,
      reviews: [
        rv('คุณกิ๊ก', 'แขวนทีวี 65 นิ้ว แน่นหนา ตรงเป๊ะ เก็บสายให้ด้วยค่ะ', 5),
        rv('คุณเบิร์ด', 'เหมาครึ่งวันคุ้มมาก เคลียร์งานจุกจิกได้หมดครับ', 19),
      ],
    },
    {
      name: 'ทาสีภายใน-ภายนอก',
      description_md: 'ทาสีห้อง/บ้าน โป๊วเก็บรอยแตกร้าวก่อนทา คุมเรื่องความสะอาดระหว่างงาน ประเมินราคาฟรี',
      category: 'งานซ่อม-ทาสี',
      base_price: 2500,
      images: [IMG_H('svc-05.webp')],
      sizes: ['ห้องเดียว', 'ทั้งชั้น/ทั้งหลัง'],
      colors: [null],
      stock: 99,
      created_days_ago: 10,
      reviews: [rv('คุณวุฒิ', 'ทาห้องนอน 2 ห้อง สีเรียบเนียน ไม่มีหยดเลอะพื้นครับ', 8)],
    },
    {
      name: 'ตรวจระบบไฟ ตู้เบรกเกอร์',
      description_md: 'ตรวจสุขภาพระบบไฟทั้งบ้าน จุดเสี่ยงไฟรั่ว-ไฟช็อต พร้อมรายงานและใบเสนอราคาแก้ไข',
      category: 'งานไฟฟ้า',
      base_price: 600,
      images: [IMG_H('svc-06.webp')],
      sizes: [null],
      colors: [null],
      stock: 99,
      created_days_ago: 5,
      reviews: [rv('คุณอิ๋ม', 'บ้านเก่า 20 ปี ตรวจละเอียดมาก สบายใจขึ้นเยอะค่ะ', 3)],
    },
  ],
  pages: SERVICE_PAGES,
  content: serviceContent({
    dir: 'handyman',
    eyebrow: 'HOME SERVICE',
    headline: 'งานช่างเรื่องบ้าน จบทุกปัญหา',
    sub: 'ประปา ไฟฟ้า ซ่อมแซม ทาสี — ช่างมืออาชีพถึงบ้าน ราคาชัดเจน',
    tagline: 'FIX IT RIGHT',
    storyTitle: 'ช่างที่คุณเรียกได้ทุกเรื่องบ้าน',
    storyBody:
      'ทีมช่างประสบการณ์กว่า 10 ปี รับงานตั้งแต่จุดเล็กๆ ถึงงานเหมารายวัน ตรงเวลา ราคาแจ้งก่อนเริ่มงาน และรับผิดชอบผลงานทุกชิ้น',
    variantLabels: { size: 'ขอบเขตงาน', color: 'ประเภทงาน' },
  }),
  contentWithPages: {
    articles: [
      { title: 'เกี่ยวกับทีมช่างของเรา', imageUrl: IMG_H('hero-01.webp'), date: 'บทความจากร้าน', href: '/p/about' },
      { title: 'ขั้นตอนเรียกใช้บริการ', imageUrl: IMG_H('svc-04.webp'), date: 'คู่มือลูกค้า', href: '/p/how-to-book' },
    ],
  },
};

const IMG_T = (f: string) => `/demo/services/transport/${f}`;

export const TRANSPORT_PACK: StarterPack = {
  code: 'transport',
  nameTh: 'รถยก-แท็กซี่-รถรับจ้าง',
  featureOverrides: { online_ordering: false },
  // ร้าน pack นี้ได้เทมเพลตแท็กซี่ (s3-taxi) ตอน signup — hero มีแผงจองการเดินทางเปิด LINE/โทร
  themeCode: 's3-taxi',
  requiredAssets: [
    'demo/services/transport/hero-01.webp',
    'demo/services/transport/svc-01.webp',
    'demo/services/taxi/hero-01.webp',
    'demo/services/taxi/veh-01.webp',
  ],
  categories: ['รถยก-รถสไลด์', 'รถรับส่ง', 'ขนของ-ขนย้าย'],
  products: [
    {
      name: 'รถยก-รถสไลด์ 24 ชั่วโมง',
      description_md:
        'บริการรถยก รถสไลด์ ช่วยเหลือรถเสีย รถอุบัติเหตุ ยางแตก แบตหมด ตลอด 24 ชั่วโมง\n\n- แจ้งพิกัด+อาการรถทางแชท ประเมินราคาทันที',
      category: 'รถยก-รถสไลด์',
      base_price: 1500,
      is_featured: true,
      images: [IMG_T('svc-01.webp')],
      sizes: ['ในเมือง', 'ต่างอำเภอ', 'ข้ามจังหวัด'],
      colors: [null],
      stock: 99,
      created_days_ago: 40,
      reviews: [
        rv('คุณเก่ง', 'รถเสียตี 2 โทรมา 40 นาทีถึง ประทับใจมากครับ', 7),
        rv('คุณจ๋า', 'สไลด์รถเก๋งไปศูนย์ ระวังรถมาก ไม่มีรอยเพิ่มค่ะ', 18),
        rv('คุณเบส', 'ราคาแฟร์ แจ้งก่อนออกรถ ไม่มีบวกหน้างานครับ', 32, 4),
      ],
    },
    {
      name: 'แท็กซี่เหมา รับส่งสนามบิน',
      description_md:
        'เหมารถรับ-ส่งสนามบิน/ต่างจังหวัด คนขับสุภาพ ตรงเวลา แจ้งเที่ยวบินไว้ เรารอรับแม้ไฟลท์ดีเลย์',
      category: 'รถรับส่ง',
      base_price: 450,
      is_featured: true,
      images: [IMG_T('svc-02.webp')],
      sizes: ['ในเมือง', 'ต่างจังหวัด'],
      colors: [null],
      stock: 99,
      created_days_ago: 35,
      reviews: [
        rv('คุณปุ้ม', 'ไปสนามบินตี 4 มารับตรงเวลาเป๊ะ ขับนิ่มค่ะ', 10),
        rv('คุณโทนี่', 'ไฟลท์ดีเลย์ชั่วโมงกว่า พี่คนขับรออยู่ ขอบคุณมากครับ', 24),
      ],
    },
    {
      name: 'รถตู้เหมาพร้อมคนขับ',
      description_md: 'รถตู้ VIP เหมาเที่ยว/สัมมนา/รับส่งทีมงาน พร้อมคนขับชำนาญเส้นทาง ราคาเหมาชัดเจนรวมน้ำมัน',
      category: 'รถรับส่ง',
      base_price: 1800,
      images: [IMG_T('svc-03.webp')],
      sizes: ['ครึ่งวัน', 'เต็มวัน'],
      colors: [null],
      stock: 99,
      created_days_ago: 25,
      reviews: [rv('คุณแอ๋ม', 'เหมาไปทำบุญต่างจังหวัด รถสะอาด คนขับใจดีค่ะ', 12)],
    },
    {
      name: 'รถกระบะรับจ้างขนของ',
      description_md: 'กระบะรับจ้างขนของ ซื้อเฟอร์นิเจอร์ ส่งสินค้า พร้อมคนช่วยยก (แจ้งล่วงหน้า)',
      category: 'ขนของ-ขนย้าย',
      base_price: 400,
      images: [IMG_T('svc-04.webp')],
      sizes: [null],
      colors: ['กระบะตอนเดียว', 'กระบะคอก'],
      stock: 99,
      created_days_ago: 15,
      reviews: [
        rv('คุณนุช', 'ขนตู้เย็นกับที่นอน มีคนช่วยยกขึ้นคอนโด สุดยอดค่ะ', 6),
        rv('คุณโจ', 'เรียกด่วนบ่ายๆ เย็นมาถึงเลย งานไวครับ', 20),
      ],
    },
    {
      name: 'รับส่งของด่วนในเมือง',
      description_md: 'ส่งเอกสาร/พัสดุด่วนภายในวัน วิ่งตรงไม่แวะจุดอื่น แจ้งสถานะระหว่างทางตลอด',
      category: 'รถรับส่ง',
      base_price: 150,
      images: [IMG_T('svc-05.webp')],
      sizes: [null],
      colors: [null],
      stock: 99,
      created_days_ago: 10,
      reviews: [rv('คุณเฟิร์ส', 'ส่งเอกสารประมูลทันเวลาพอดี ขอบคุณมากครับ', 4)],
    },
    {
      name: 'ขนย้ายหอพัก-บ้าน',
      description_md: 'ขนย้ายหอพัก คอนโด บ้าน พร้อมทีมยกของและอุปกรณ์กันกระแทก ประเมินราคาจากรูป/วิดีโอของได้',
      category: 'ขนของ-ขนย้าย',
      base_price: 1200,
      images: [IMG_T('svc-06.webp'), IMG_T('svc-04.webp')],
      sizes: ['ในเมือง', 'ข้ามจังหวัด'],
      colors: [null],
      stock: 99,
      created_days_ago: 5,
      reviews: [rv('คุณเมษ์', 'ย้ายหอคนเดียวไม่ไหว ทีมพี่เขาจัดการให้หมดเลยค่ะ', 3)],
    },
  ],
  pages: SERVICE_PAGES,
  content: {
    ...serviceContent({
      dir: 'transport',
      eyebrow: 'CAR SERVICE',
      headline: 'เรียกรถได้ทุกงาน ตลอด 24 ชม.',
      sub: 'รถยก รถเหมา รถขนของ — แจ้งงานทางแชท ประเมินราคาทันที',
      tagline: 'ON THE ROAD FOR YOU',
      storyTitle: 'ทุกเส้นทาง เราไปถึง',
      storyBody:
        'ทีมรถของเราพร้อมให้บริการทั้งงานฉุกเฉินและงานนัดหมาย คนขับผ่านการคัดเลือก ราคาแจ้งก่อนออกรถทุกครั้ง ไม่มีบวกเพิ่มหน้างาน',
      variantLabels: { size: 'พื้นที่บริการ', color: 'ประเภทรถ' },
    }),
    // เนื้อหาชุดเทมเพลตแท็กซี่ (s3-taxi — ref เจ้าของ): hero โทนน้ำเงิน + แผงจอง + การ์ดรถ + รีวิว
    hero: {
      headline: 'เดินทางสะดวก ปลอดภัย ในราคาสบายกระเป๋า',
      sub: 'รถยก รถเหมา รถขนของ — แจ้งงานทางแชท ประเมินราคาทันที',
      ctaText: 'ดูบริการและราคา',
      ctaHref: '/products',
      imageUrl: '/demo/services/taxi/hero-01.webp',
    },
    heroBadges: ['คนขับสุภาพ', 'รถสะอาด', 'ตรงเวลา'],
    inquiry: {
      title: 'จองรถออนไลน์',
      sub: 'เดินทางทันที หรือจองล่วงหน้า',
      serviceOptions: ['รถยก-รถสไลด์', 'แท็กซี่เหมา/รับส่งสนามบิน', 'รถตู้เหมาพร้อมคนขับ', 'รถกระบะขนของ/ขนย้าย'],
      buttonText: 'ค้นหารถและราคา',
    },
    vehiclesTitle: 'ประเภทรถของเรา',
    vehicles: [
      { imageUrl: '/demo/services/taxi/veh-01.webp', title: 'รถเก๋ง (4 ที่นั่ง)', specs: ['ผู้โดยสาร 1-4 ท่าน', 'กระเป๋า 1-2 ใบ'], href: '/products' },
      { imageUrl: '/demo/services/taxi/veh-02.webp', title: 'รถ SUV/MPV (6 ที่นั่ง)', specs: ['ผู้โดยสาร 1-6 ท่าน', 'กระเป๋า 2-4 ใบ'], href: '/products' },
      { imageUrl: '/demo/services/taxi/veh-03.webp', title: 'รถตู้ (10 ที่นั่ง)', specs: ['ผู้โดยสาร 1-10 ท่าน', 'กระเป๋า 4-6 ใบ'], href: '/products' },
      { imageUrl: '/demo/services/taxi/veh-04.webp', title: 'รถกระบะขนของ', specs: ['ขนของ/ขนย้าย', 'มีคนช่วยยก'], href: '/products' },
    ],
    testimonialsTitle: 'รีวิวจากลูกค้าของเรา',
    testimonials: [
      { text: 'รถเสียกลางดึก โทรมา 40 นาทีถึง บริการไวมาก ราคาแจ้งก่อนออกรถ ไม่มีบวกเพิ่มครับ', author: 'คุณเก่ง', role: 'ใช้บริการรถยก' },
      { text: 'จองไปสนามบินเช้ามืด มารับตรงเวลาเป๊ะ คนขับสุภาพ ช่วยยกกระเป๋าด้วยค่ะ', author: 'คุณปุ้ม', role: 'รับส่งสนามบิน' },
      { text: 'เหมารถตู้พาครอบครัวไปทำบุญต่างจังหวัด รถสะอาด ขับนิ่ม ราคาชัดเจนครับ', author: 'คุณแอ๋ม', role: 'เหมารายวัน' },
    ],
  },
  contentWithPages: {
    articles: [
      { title: 'เกี่ยวกับทีมงานของเรา', imageUrl: IMG_T('hero-01.webp'), date: 'บทความจากร้าน', href: '/p/about' },
      { title: 'ขั้นตอนเรียกใช้บริการ', imageUrl: IMG_T('svc-01.webp'), date: 'คู่มือลูกค้า', href: '/p/how-to-book' },
    ],
  },
};

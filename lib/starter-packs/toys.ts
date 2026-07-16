// Starter pack "ของเล่น / แม่และเด็ก" — data พร้อมใช้ แต่ต้องมีรูปก่อนถึงจะเปิดให้เลือก
// ที่หน้า signup: วางรูปตามรายการใน public/demo/toys/README.md ครบเมื่อไหร่ ระบบตรวจเจอ
// แล้วโชว์ตัวเลือกนี้เองโดยไม่ต้องแก้โค้ด (เช็คใน lib/starter-packs/index.ts)
//
// ป้ายมิติ variant ของ pack นี้: ไซส์→"ช่วงวัย", สี→"แบบ" (ผ่าน content.variantLabels —
// กลไกเดียวกับที่ร้าน shop2 เดโม่ใช้) — ค่าเก็บในคอลัมน์ size/color เดิมตามสถาปัตยกรรม

import type { StarterPack } from '@/lib/starter-packs/types';

const IMG = (file: string) => `/demo/toys/${file}`;

export const TOYS_PACK: StarterPack = {
  code: 'toys',
  nameTh: 'ของเล่น / แม่และเด็ก',
  requiredAssets: [
    'demo/toys/hero-01.webp',
    'demo/toys/cat-01.webp',
    'demo/toys/cat-02.webp',
    'demo/toys/cat-03.webp',
    'demo/toys/toy-01.webp',
    'demo/toys/toy-02.webp',
    'demo/toys/toy-03.webp',
    'demo/toys/toy-04.webp',
    'demo/toys/toy-05.webp',
    'demo/toys/toy-06.webp',
    'demo/toys/toy-07.webp',
    'demo/toys/toy-08.webp',
  ],
  categories: ['ของเล่นเสริมพัฒนาการ', 'ตุ๊กตา', 'เสื้อผ้าเด็ก', 'ของใช้แม่และเด็ก'],

  products: [
    {
      name: 'ตุ๊กตาผ้านุ่มนิ่ม',
      description_md:
        'ตุ๊กตาผ้ากำมะหยี่เนื้อนุ่มพิเศษ ปลอดภัยสำหรับเด็กทุกวัย เย็บแน่นทุกตะเข็บ\n\n- ผ้าไม่เป็นขุย ไม่ระคายผิว\n- ซักเครื่องได้ (ใส่ถุงซัก)\n- ขนาดกอดสบาย 35 ซม.',
      category: 'ตุ๊กตา',
      base_price: 390,
      is_featured: true,
      images: [IMG('toy-01.webp'), IMG('toy-02.webp')],
      sizes: [null],
      colors: ['หมี', 'กระต่าย'],
      stock: 15,
      created_days_ago: 45,
      reviews: [
        { rating: 5, author: 'คุณแม่น้องมะลิ', comment: 'นุ่มมากค่ะ ลูกกอดนอนทุกคืนเลย', daysAgo: 3 },
        { rating: 5, author: 'คุณเมย์', comment: 'ตะเข็บแน่นดี ซักแล้วไม่เสียทรงค่ะ', daysAgo: 7 },
        { rating: 5, author: 'คุณป้อม', comment: 'ซื้อเป็นของขวัญวันเกิดหลาน ถูกใจมากครับ', daysAgo: 12 },
        { rating: 4, author: 'คุณจอย', comment: 'น่ารักค่ะ แบบกระต่ายหูยาวกว่าในรูปนิดหน่อย', daysAgo: 16 },
        { rating: 5, author: 'คุณบี', comment: 'เนื้อผ้าดีมาก ไม่มีกลิ่น ปลอดภัยค่ะ', daysAgo: 21 },
        { rating: 5, author: 'คุณกุ้ง', comment: 'ลูกสาวชอบมาก ขอซื้อเพิ่มอีกตัวค่ะ', daysAgo: 25 },
        { rating: 5, author: 'คุณหนึ่ง', comment: 'ส่งไว แพ็คดี ตุ๊กตาไม่ยับเลยครับ', daysAgo: 30 },
        { rating: 4, author: 'คุณฟาง', comment: 'น่ารักสมราคา อยากให้มีแบบช้างด้วยค่ะ', daysAgo: 35 },
        { rating: 5, author: 'คุณเอ', comment: 'คุณภาพเกินราคา แนะนำเลยครับ', daysAgo: 40 },
        { rating: 5, author: 'คุณนก', comment: 'ซื้อให้ลูกค้าที่ร้านต่อ ทุกคนชมค่ะ', daysAgo: 44 },
        { rating: 5, author: 'คุณเจี๊ยบ', comment: 'หลานติดมาก ไปไหนต้องพกไปด้วยค่ะ', daysAgo: 49 },
        { rating: 5, author: 'คุณตาล', comment: 'ผ้านุ่มจริง ลูกภูมิแพ้ก็กอดได้ค่ะ', daysAgo: 54 },
        { rating: 4, author: 'คุณโอม', comment: 'ดีครับ ขนาดกำลังพอดีสำหรับเด็ก 2 ขวบ', daysAgo: 59 },
        { rating: 5, author: 'คุณแพรวา', comment: 'สั่งซ้ำเป็นตัวที่สามแล้วค่ะ 555', daysAgo: 63 },
        { rating: 5, author: 'คุณกิ่ง', comment: 'ของขวัญรับขวัญหลานที่ถูกใจทั้งบ้านค่ะ', daysAgo: 68 },
        { rating: 5, author: 'คุณต่อ', comment: 'คุณภาพดีมากครับ เย็บเรียบร้อยทุกจุด', daysAgo: 72 },
      ],
    },
    {
      name: 'จิ๊กซอว์ไม้เสริมพัฒนาการ',
      description_md:
        'จิ๊กซอว์ไม้ชิ้นใหญ่ จับถนัดมือเด็กเล็ก ฝึกสมาธิ การสังเกต และกล้ามเนื้อมัดเล็ก\n\n- ไม้ยางพาราขัดเรียบ สีน้ำ non-toxic\n- ชิ้นใหญ่ ไม่เสี่ยงกลืน',
      category: 'ของเล่นเสริมพัฒนาการ',
      base_price: 290,
      is_featured: true,
      images: [IMG('toy-03.webp')],
      sizes: ['1-3 ปี', '3-5 ปี'],
      colors: ['ชุดสัตว์', 'ชุดผลไม้'],
      stock: 18,
      created_days_ago: 30,
      reviews: [
        { rating: 5, author: 'คุณแม่น้องภูมิ', comment: 'ลูก 2 ขวบเล่นได้จริงค่ะ ชิ้นใหญ่จับง่าย', daysAgo: 4 },
        { rating: 5, author: 'คุณครูส้ม', comment: 'ซื้อเข้าห้องเรียนอนุบาล เด็กๆ ชอบมากค่ะ', daysAgo: 10 },
        { rating: 4, author: 'คุณนัท', comment: 'ไม้เนื้อดี สีสวย ขอบเรียบไม่บาดมือครับ', daysAgo: 15 },
        { rating: 5, author: 'คุณปุ้ย', comment: 'ลูกนั่งเล่นได้เป็นชั่วโมง แม่ได้พักค่ะ 555', daysAgo: 20 },
        { rating: 5, author: 'คุณวิว', comment: 'ชุดผลไม้สีสวยมาก สอนศัพท์ไปด้วยได้ค่ะ', daysAgo: 26 },
      ],
    },
    {
      name: 'บล็อกไม้สร้างเมือง 50 ชิ้น',
      description_md:
        'ชุดบล็อกไม้ 50 ชิ้น หลากรูปทรง ต่อได้อิสระ เสริมจินตนาการและการวางแผน\n\n- ไม้บีชขัดละเอียด ปลอดสารพิษ\n- มีถุงผ้าเก็บของแถมให้',
      category: 'ของเล่นเสริมพัฒนาการ',
      base_price: 690,
      price_override: 590,
      images: [IMG('toy-04.webp')],
      sizes: ['2-4 ปี', '4-6 ปี'],
      colors: [null],
      stock: 10,
      created_days_ago: 25,
      reviews: [
        { rating: 5, author: 'คุณเปิ้ล', comment: 'ชิ้นเยอะคุ้มมาก ลูกต่อเป็นปราสาททุกวันค่ะ', daysAgo: 5 },
        { rating: 5, author: 'คุณโจ', comment: 'ไม้หนาแน่นดี ไม่มีเสี้ยนครับ', daysAgo: 12 },
        { rating: 4, author: 'คุณแอม', comment: 'ดีค่ะ แต่ถุงผ้าเล็กไปนิดถ้าเก็บครบ 50 ชิ้น', daysAgo: 18 },
        { rating: 5, author: 'คุณบาส', comment: 'ราคาโปรคุ้มสุดๆ ครับ ของแท้ไม้จริง', daysAgo: 23 },
      ],
    },
    {
      name: 'รถไม้ลากจูง',
      description_md:
        'รถไม้ลากจูงล้อยางนุ่ม เดินลากได้ไม่มีเสียงดัง ฝึกการเดินและการทรงตัว\n\n- เชือกลากยาวพอดี ไม่พันคอ\n- ล้อยางไม่ทำลายพื้น',
      category: 'ของเล่นเสริมพัฒนาการ',
      base_price: 350,
      images: [IMG('toy-05.webp')],
      sizes: ['1-3 ปี'],
      colors: ['รถบัส', 'รถดับเพลิง'],
      stock: 12,
      created_days_ago: 10,
      reviews: [
        { rating: 5, author: 'คุณหมิว', comment: 'ลูกเพิ่งหัดเดิน ลากตามทั้งวันเลยค่ะ', daysAgo: 2 },
        { rating: 5, author: 'คุณกล้า', comment: 'งานไม้เรียบร้อย ล้อหมุนลื่นครับ', daysAgo: 6 },
        { rating: 4, author: 'คุณอิม', comment: 'น่ารักค่ะ สีรถดับเพลิงสดสวย', daysAgo: 9 },
      ],
    },
    {
      name: 'บอดี้สูทเด็กอ่อน แพ็ค 3 ตัว',
      description_md:
        'บอดี้สูทผ้าคอตตอนออร์แกนิก 100% แพ็ค 3 ตัว กระดุมเป้าเปลี่ยนผ้าอ้อมง่าย\n\n- ผ้านุ่มพิเศษสำหรับผิวบอบบาง\n- คอไหล่ซ้อน สวมง่ายไม่ต้องดึงหัว',
      category: 'เสื้อผ้าเด็ก',
      base_price: 490,
      is_featured: true,
      images: [IMG('toy-06.webp')],
      sizes: ['แรกเกิด-6 เดือน', '6-12 เดือน'],
      colors: ['ขาว', 'พาสเทล'],
      stock: 15,
      created_days_ago: 20,
      reviews: [
        { rating: 5, author: 'คุณแม่มือใหม่', comment: 'ผ้านุ่มมากค่ะ ลูกใส่สบายไม่งอแง', daysAgo: 3 },
        { rating: 5, author: 'คุณฝน', comment: 'กระดุมเป้าสะดวกมาก เปลี่ยนผ้าอ้อมไวค่ะ', daysAgo: 8 },
        { rating: 5, author: 'คุณเกด', comment: 'ซักแล้วไม่หด สีไม่ตกค่ะ ซื้อซ้ำแน่นอน', daysAgo: 13 },
        { rating: 4, author: 'คุณไอซ์', comment: 'ดีค่ะ ไซส์แรกเกิดใหญ่กว่าที่คิดนิดหน่อย', daysAgo: 17 },
      ],
    },
    {
      name: 'ผ้าห่มมัสลินเด็ก',
      description_md:
        'ผ้าห่มมัสลิน 4 ชั้น ยิ่งซักยิ่งนุ่ม ระบายอากาศดี ห่มได้ทั้งหน้าร้อนหน้าฝน\n\n- ขนาด 110×110 ซม. ใช้เป็นผ้าห่อตัวได้\n- คอตตอนมัสลินแท้',
      category: 'ของใช้แม่และเด็ก',
      base_price: 450,
      images: [IMG('toy-07.webp')],
      sizes: [null],
      colors: ['ลายดาว', 'ลายเมฆ'],
      stock: 10,
      created_days_ago: 15,
      reviews: [
        { rating: 5, author: 'คุณพลอย', comment: 'นุ่มขึ้นทุกครั้งที่ซักจริงค่ะ ลูกหลับสบาย', daysAgo: 4 },
        { rating: 5, author: 'คุณมด', comment: 'เนื้อผ้าโปร่ง ไม่ร้อน เหมาะกับเมืองไทยค่ะ', daysAgo: 9 },
        { rating: 5, author: 'คุณจ๊ะจ๋า', comment: 'ลายเมฆน่ารักมาก ถ่ายรูปลูกสวยเลยค่ะ', daysAgo: 14 },
      ],
    },
    {
      name: 'ยางกัดรูปสัตว์',
      description_md:
        'ยางกัดซิลิโคนเกรดอาหาร นิ่มพอดีเหงือก ช่วยลดอาการคันเหงือกช่วงฟันขึ้น\n\n- ปลอด BPA 100%\n- ต้มฆ่าเชื้อได้',
      category: 'ของใช้แม่และเด็ก',
      base_price: 190,
      images: [IMG('toy-08.webp')],
      sizes: ['3 เดือนขึ้นไป'],
      colors: ['ยีราฟ', 'ช้าง'],
      stock: 20,
      created_days_ago: 8,
      reviews: [
        { rating: 5, author: 'คุณนิ้ง', comment: 'ลูกฟันขึ้นงอแงมาก พอได้กัดอันนี้สงบเลยค่ะ', daysAgo: 2 },
        { rating: 5, author: 'คุณเฟย์', comment: 'ซิลิโคนนิ่มดี ต้มฆ่าเชื้อสะดวกค่ะ', daysAgo: 5 },
        { rating: 4, author: 'คุณภีม', comment: 'ดีครับ แบบยีราฟจับถนัดมือเด็กกว่าครับ', daysAgo: 7 },
      ],
    },
    {
      name: 'โมบายเปลเด็ก',
      description_md:
        'โมบายแขวนเปลรูปสัตว์ผ้านุ่ม สีพาสเทลสบายตา กระตุ้นสายตาและการโฟกัสของทารก\n\n- แขวนได้ทั้งเปลและคาร์ซีท\n- ถอดซักได้ทุกชิ้น',
      category: 'ของใช้แม่และเด็ก',
      base_price: 690,
      is_featured: true,
      images: [IMG('toy-02.webp'), IMG('toy-01.webp')],
      sizes: ['แรกเกิด-1 ปี'],
      colors: [null],
      stock: 8,
      variant_tweaks: [{ size: 'แรกเกิด-1 ปี', color: null, stock: 2 }],
      created_days_ago: 5,
      reviews: [
        { rating: 5, author: 'คุณเจน', comment: 'ลูกจ้องตามแล้วหัวเราะทุกเช้าเลยค่ะ', daysAgo: 1 },
        { rating: 5, author: 'คุณจูน', comment: 'สีพาสเทลสวยมาก เข้ากับห้องลูกค่ะ', daysAgo: 3 },
        { rating: 4, author: 'คุณเบล', comment: 'น่ารักค่ะ อยากให้มีเสียงดนตรีด้วย', daysAgo: 5 },
      ],
    },
  ],

  pages: [
    {
      slug: 'about',
      title: 'เกี่ยวกับเรา',
      sort_order: 0,
      body_md:
        'ยินดีต้อนรับสู่ร้านของเรา\n\nเราคัดสรรของเล่นและของใช้สำหรับลูกน้อยที่ปลอดภัย ได้มาตรฐาน ในราคาที่คุณพ่อคุณแม่เข้าถึงได้ ทุกชิ้นผ่านการตรวจสอบคุณภาพก่อนส่งถึงมือคุณ\n\n*(นี่คือเนื้อหาตัวอย่าง — แก้ไขข้อความนี้ได้ที่เมนู "เพจ" ในหลังร้าน)*',
    },
    {
      slug: 'how-to-order',
      title: 'วิธีสั่งซื้อ',
      sort_order: 1,
      body_md:
        '## สั่งซื้อง่ายๆ 4 ขั้นตอน\n\n1. เลือกสินค้า เลือกช่วงวัย/แบบ แล้วกดหยิบใส่ตะกร้า\n2. กรอกชื่อ เบอร์โทร และที่อยู่จัดส่ง\n3. สแกน QR PromptPay แล้วอัปโหลดสลิป\n4. รอร้านยืนยันและจัดส่ง — ติดตามสถานะได้จากเมนู "ติดตามคำสั่งซื้อ"\n\n*(นี่คือเนื้อหาตัวอย่าง — แก้ไขข้อความนี้ได้ที่เมนู "เพจ" ในหลังร้าน)*',
    },
  ],

  content: {
    hero: {
      eyebrow: 'FOR LITTLE ONES',
      headline: 'ของเล่นดีๆ เพื่อวัยแห่งการเรียนรู้',
      sub: 'ของเล่นเสริมพัฒนาการและของใช้เด็ก ปลอดภัย ได้มาตรฐาน คัดมาเพื่อลูกน้อยของคุณ',
      ctaText: 'เลือกของให้ลูกน้อย',
      ctaHref: '/products',
      imageUrl: IMG('hero-01.webp'),
    },
    heroSlides: [
      {
        eyebrow: 'FOR LITTLE ONES',
        headline: 'ของเล่นดีๆ เพื่อวัยแห่งการเรียนรู้',
        sub: 'ของเล่นเสริมพัฒนาการและของใช้เด็ก ปลอดภัย ได้มาตรฐาน',
        ctaText: 'เลือกของให้ลูกน้อย',
        ctaHref: '/products',
        imageUrl: IMG('hero-01.webp'),
      },
      {
        headline: 'ปลอดภัยทุกชิ้น อุ่นใจทุกวัน',
        sub: 'วัสดุ non-toxic ผ่านการคัดสรรสำหรับเด็กโดยเฉพาะ',
        ctaText: 'ดูสินค้าทั้งหมด',
        ctaHref: '/products',
        imageUrl: IMG('cat-01.webp'),
      },
      {
        eyebrow: 'NEW ARRIVAL',
        headline: 'ของใหม่สำหรับเจ้าตัวเล็ก',
        sub: 'อัปเดตของเล่นและของใช้เด็กใหม่ทุกเดือน',
        ctaText: 'ช้อปเลย',
        ctaHref: '/products',
        imageUrl: IMG('cat-02.webp'),
      },
    ],
    categoryBanners: [
      { title: 'ของเล่นเสริมพัฒนาการ', sub: 'เรียนรู้ผ่านการเล่น', imageUrl: IMG('cat-01.webp'), href: '/products' },
      { title: 'ตุ๊กตา', sub: 'เพื่อนซี้ตัวนุ่มของลูก', imageUrl: IMG('cat-02.webp'), href: '/products' },
      { title: 'ของใช้แม่และเด็ก', sub: 'ครบทุกอย่างที่แม่ต้องใช้', imageUrl: IMG('cat-03.webp'), href: '/products' },
    ],
    categoryCircles: [
      { label: 'เสริมพัฒนาการ', imageUrl: IMG('toy-03.webp'), href: '/products' },
      { label: 'ตุ๊กตา', imageUrl: IMG('toy-01.webp'), href: '/products' },
      { label: 'เสื้อผ้าเด็ก', imageUrl: IMG('toy-06.webp'), href: '/products' },
      { label: 'ของใช้เด็ก', imageUrl: IMG('toy-07.webp'), href: '/products' },
      { label: 'มาใหม่', imageUrl: IMG('toy-05.webp'), href: '/products' },
      { label: 'ลดราคา', imageUrl: IMG('toy-04.webp'), href: '/products' },
    ],
    memberBenefits: [
      { icon: 'tag', title: 'ราคาพิเศษ', sub: 'โปรโมชันประจำเดือนสำหรับคุณพ่อคุณแม่' },
      { icon: 'truck', title: 'ส่งฟรีเมื่อครบยอด', sub: 'ช้อปครบตามเงื่อนไข ส่งฟรีทั่วไทย' },
      { icon: 'card', title: 'จ่ายง่ายด้วย PromptPay', sub: 'สแกนจ่ายปลอดภัย ยืนยันไว' },
    ],
    lookbook: {
      imageUrl: IMG('hero-01.webp'),
      eyebrow: 'PLAY & LEARN',
      title: 'เล่นอย่างมีความหมาย',
      sub: 'ไอเดียเลือกของเล่นตามช่วงวัยของลูกน้อย',
      ctaText: 'ดูสินค้าทั้งหมด',
      ctaHref: '/products',
    },
    brandStory: {
      eyebrow: 'OUR STORY',
      title: 'เพราะลูกคุณคือคนสำคัญ',
      body: 'เราคัดของเล่นและของใช้เด็กด้วยมาตรฐานเดียวกับที่เลือกให้ลูกของเราเอง — ปลอดภัย ได้คุณภาพ และช่วยให้ทุกช่วงวัยของลูกเติบโตอย่างสมวัย',
      ctaText: 'ช้อปเลย',
      ctaHref: '/products',
    },
    highlights: [
      { icon: 'shield', title: 'ปลอดภัยทุกชิ้น', sub: 'วัสดุ non-toxic มาตรฐานเด็ก' },
      { icon: 'star', title: 'คัดสรรคุณภาพ', sub: 'ตรวจสอบทุกชิ้นก่อนจัดส่ง' },
      { icon: 'package', title: 'แพ็คอย่างดี', sub: 'ห่อกันกระแทกทุกออร์เดอร์' },
      { icon: 'truck', title: 'จัดส่งทั่วไทย', sub: 'มีเลขพัสดุติดตามได้' },
    ],
    tagline: 'SAFE TOYS FOR HAPPY KIDS',
    variantLabels: { size: 'ช่วงวัย', color: 'แบบ' },
  },

  contentWithPages: {
    articles: [
      {
        title: 'เรื่องราวของร้านเรา',
        imageUrl: IMG('cat-03.webp'),
        date: 'บทความจากร้าน',
        href: '/p/about',
      },
      {
        title: 'วิธีสั่งซื้อและชำระเงิน',
        imageUrl: IMG('cat-02.webp'),
        date: 'คู่มือลูกค้า',
        href: '/p/how-to-order',
      },
    ],
  },
};

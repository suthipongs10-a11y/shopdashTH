// Starter pack "แฟชั่นเบสิก" — ข้อมูลตัวอย่างที่ seed ให้ร้านใหม่ทุกร้านตอน provisioning
// เพื่อให้ลูกค้า trial เห็นร้านสวยครบทันทีหลัง signup แล้วค่อยแก้เป็นสินค้าตัวเอง
//
// รูปทั้งหมดเป็น static asset ใน public/demo/t2 (ชุดเดียวกับร้านเดโม่ T2 — มี CREDITS.json)
// อ้างเป็น path ขึ้นต้นด้วย '/' ใน product_images.r2_key — publicR2Url เสิร์ฟ path นี้ตรงๆ
// โดยไม่ประกอบ R2 base URL (ดู DECISIONS 2026-07-16) — ร้านหลายร้านแชร์ไฟล์ชุดเดียวกันได้
// เพราะระบบไม่มีการลบไฟล์จาก R2/static เมื่อร้านลบสินค้า
//
// ไฟล์นี้เป็น data ล้วน — logic การ seed อยู่ lib/starter-pack.ts

import type { StarterPack, StarterProduct } from '@/lib/starter-packs/types';

export type { StarterProduct };

const IMG = (file: string) => `/demo/t2/${file}`;

export const FASHION_PACK: StarterPack = {
  code: 'fashion',
  nameTh: 'เสื้อผ้า / แฟชั่น',
  // ชุดรูปแฟชั่นอยู่ใน repo แล้ว (public/demo/t2) — pack นี้พร้อมเสมอ
  requiredAssets: ['demo/t2/hero-01.jpg'],
  categories: ['เสื้อยืด', 'เสื้อเชิ้ต', 'กางเกง', 'เดรส'],

  products: [
    {
      name: 'เสื้อยืดคอกลม คอตตอน 100%',
      description_md:
        'เสื้อยืดเบสิกผ้าคอตตอนแท้ 100% เนื้อนุ่ม ระบายอากาศดี ใส่สบายตลอดวัน\n\n- ทรงมาตรฐาน ใส่ได้ทั้งชายหญิง\n- ผ้าไม่ย้วย ไม่หดหลังซัก\n- ซักเครื่องได้ตามปกติ',
      category: 'เสื้อยืด',
      base_price: 290,
      is_featured: true,
      images: [IMG('flat-09.jpg'), IMG('cat-01.jpg')],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['ขาว', 'ดำ'],
      stock: 20,
      created_days_ago: 45,
      reviews: [
        { rating: 5, author: 'คุณนุ่น', comment: 'ผ้านุ่มมาก ใส่สบาย ซื้อซ้ำรอบสองแล้วค่ะ', daysAgo: 3 },
        { rating: 5, author: 'คุณเบียร์', comment: 'ทรงสวย ไซส์ตรงปก ส่งไวด้วยครับ', daysAgo: 7 },
        { rating: 4, author: 'คุณแพร', comment: 'เนื้อผ้าดีเกินราคา สีขาวใส่แล้วไม่บาง', daysAgo: 10 },
        { rating: 5, author: 'คุณต้น', comment: 'ซักหลายรอบแล้วไม่ย้วย แนะนำครับ', daysAgo: 14 },
        { rating: 5, author: 'คุณฝ้าย', comment: 'ใส่ทำงานก็ได้ ใส่เที่ยวก็ดี คุ้มมากค่ะ', daysAgo: 18 },
        { rating: 4, author: 'คุณโอ๊ต', comment: 'สีดำสวยจริง แต่อยากให้มีสีกรมด้วย', daysAgo: 22 },
        { rating: 5, author: 'คุณมิ้นต์', comment: 'สั่งให้แฟนใส่ ชอบมากค่ะ เดี๋ยวมาซื้อเพิ่ม', daysAgo: 26 },
        { rating: 5, author: 'คุณบอส', comment: 'ผ้าหนากำลังดี ไม่ร้อน แพ็คของเรียบร้อยครับ', daysAgo: 31 },
        { rating: 5, author: 'คุณจูน', comment: 'ตรงปกทุกอย่าง ร้านตอบแชทไวมากค่ะ', daysAgo: 35 },
        { rating: 4, author: 'คุณเก่ง', comment: 'ใส่สบายดีครับ ไซส์ L พอดีตัว', daysAgo: 40 },
        { rating: 5, author: 'คุณพลอย', comment: 'เป็นเสื้อยืดที่ใส่บ่อยสุดในตู้แล้วค่ะ', daysAgo: 45 },
        { rating: 5, author: 'คุณเจมส์', comment: 'สั่ง 3 ตัวเลย คุณภาพเกินราคาครับ', daysAgo: 50 },
        { rating: 5, author: 'คุณแนน', comment: 'ผ้าดี ทรงสวย ส่งเร็ว ครบค่ะ', daysAgo: 55 },
        { rating: 4, author: 'คุณภูมิ', comment: 'ดีครับ แต่สีขาวต้องระวังเปื้อนหน่อย', daysAgo: 60 },
        { rating: 5, author: 'คุณกิ๊ฟ', comment: 'ซื้อเป็นของขวัญ คนรับชอบมากค่ะ', daysAgo: 66 },
        { rating: 5, author: 'คุณเอ็ม', comment: 'เบสิกแต่ดูแพง แนะนำเลยครับ', daysAgo: 72 },
      ],
    },
    {
      name: 'เสื้อยืดโอเวอร์ไซส์ ทรงหลวม',
      description_md:
        'เสื้อยืดทรงโอเวอร์ไซส์สไตล์มินิมอล ไหล่ตก ทรงหลวมกำลังดี ใส่แล้วดูสตรีทแต่เรียบร้อย\n\n- ผ้าคอตตอนผสม เนื้อแน่น ทิ้งตัวสวย\n- เหมาะทั้งใส่เดี่ยวและใส่เลเยอร์',
      category: 'เสื้อยืด',
      base_price: 390,
      is_featured: true,
      images: [IMG('model-02.jpg'), IMG('flat-02.jpg')],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['ครีม', 'เทา'],
      stock: 15,
      created_days_ago: 30,
      reviews: [
        { rating: 5, author: 'คุณเฟิร์น', comment: 'ทรงสวยมากค่ะ ใส่แล้วดูมีสไตล์', daysAgo: 5 },
        { rating: 5, author: 'คุณไนซ์', comment: 'ผ้าทิ้งตัวสวย ไม่บาง ชอบครับ', daysAgo: 9 },
        { rating: 4, author: 'คุณออม', comment: 'สีครีมสวยมาก ไซส์ใหญ่กว่าที่คิดนิดหน่อย', daysAgo: 15 },
        { rating: 5, author: 'คุณกาย', comment: 'ใส่กับกางเกงทรงกว้างเข้ากันมากครับ', daysAgo: 20 },
        { rating: 5, author: 'คุณมุก', comment: 'ซื้อทั้งสองสีเลยค่ะ คุ้มมาก', daysAgo: 25 },
        { rating: 4, author: 'คุณเต้', comment: 'ดีครับ แต่อยากได้ไซส์ XXL ด้วย', daysAgo: 29 },
      ],
    },
    {
      name: 'เซตเสื้อยืดเบสิก 3 ตัว',
      description_md:
        'เซตสุดคุ้ม เสื้อยืดเบสิก 3 ตัว 3 สี (กรม / ครีม / ขาว) ผ้าเดียวกับรุ่นคอตตอน 100%\n\n- ประหยัดกว่าซื้อแยก\n- เหมาะเป็นเสื้อใส่ประจำวันหรือของขวัญ',
      category: 'เสื้อยืด',
      base_price: 890,
      price_override: 690,
      images: [IMG('flat-04.jpg'), IMG('flat-03.jpg')],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [null],
      stock: 10,
      created_days_ago: 25,
      reviews: [
        { rating: 5, author: 'คุณหญิง', comment: 'คุ้มมากค่ะ ได้ 3 ตัวราคานี้', daysAgo: 4 },
        { rating: 5, author: 'คุณวิน', comment: 'สีสวยทุกตัว ใส่สลับได้ทั้งอาทิตย์ครับ', daysAgo: 11 },
        { rating: 4, author: 'คุณปาล์ม', comment: 'ดีครับ แต่อยากเลือกสีเองได้', daysAgo: 17 },
        { rating: 5, author: 'คุณอิ๋ว', comment: 'ซื้อให้สามีค่ะ ใส่ทุกวันเลย', daysAgo: 21 },
        { rating: 5, author: 'คุณท็อป', comment: 'ราคาโปรคุ้มสุดๆ ครับ', daysAgo: 24 },
      ],
    },
    {
      name: 'เสื้อครอปแขนกุด',
      description_md:
        'เสื้อครอปแขนกุดทรงเข้ารูป เนื้อผ้ายืดหยุ่นกระชับ ใส่ออกกำลังหรือแมทช์ลุคสตรีทได้\n\n- ผ้ายืด 4 ทิศทาง ไม่อึดอัด\n- ซับในบริเวณอก',
      category: 'เสื้อยืด',
      base_price: 350,
      images: [IMG('model-04.jpg')],
      sizes: ['S', 'M', 'L'],
      colors: ['เขียว', 'ดำ'],
      stock: 12,
      created_days_ago: 8,
      reviews: [
        { rating: 5, author: 'คุณเมย์', comment: 'ผ้าดี กระชับกำลังดี ใส่เล่นโยคะได้ค่ะ', daysAgo: 2 },
        { rating: 4, author: 'คุณบีม', comment: 'สีเขียวสวยแปลกตาดีค่ะ', daysAgo: 5 },
        { rating: 5, author: 'คุณแอน', comment: 'ทรงสวย ใส่แล้วมั่นใจค่ะ', daysAgo: 7 },
      ],
    },
    {
      name: 'เสื้อเชิ้ตลินิน แขนยาว',
      description_md:
        'เสื้อเชิ้ตผ้าลินินแท้ ระบายอากาศดีเยี่ยม เหมาะกับอากาศเมืองไทย ใส่ทำงานหรือเที่ยวทะเลก็ดูดี\n\n- ผ้าลินินธรรมชาติ ยิ่งซักยิ่งนุ่ม\n- กระดุมเปลือกหอยแท้',
      category: 'เสื้อเชิ้ต',
      base_price: 690,
      is_featured: true,
      images: [IMG('model-06.jpg'), IMG('flat-06.jpg')],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['ขาว', 'เบจ'],
      stock: 12,
      created_days_ago: 40,
      reviews: [
        { rating: 5, author: 'คุณโจ้', comment: 'ลินินแท้จริง ใส่ไปทะเลมา เท่มากครับ', daysAgo: 6 },
        { rating: 5, author: 'คุณส้ม', comment: 'ซื้อให้แฟน ใส่แล้วดูดีขึ้นเยอะค่ะ 555', daysAgo: 12 },
        { rating: 4, author: 'คุณนัท', comment: 'ผ้าดีครับ ยับง่ายตามสไตล์ลินิน ต้องรีดหน่อย', daysAgo: 19 },
        { rating: 5, author: 'คุณจ๋า', comment: 'สีเบจสวยมาก ใส่ทำงานได้เลยค่ะ', daysAgo: 27 },
        { rating: 5, author: 'คุณอาร์ม', comment: 'ตัดเย็บเรียบร้อย คุ้มราคาครับ', daysAgo: 33 },
        { rating: 5, author: 'คุณปุ๊ก', comment: 'ใส่สบายมาก ไม่ร้อนเลยค่ะ', daysAgo: 38 },
        { rating: 4, author: 'คุณเบนซ์', comment: 'ดีครับ ไซส์ XL พอดีเป๊ะ', daysAgo: 42 },
      ],
    },
    {
      name: 'เสื้อเชิ้ตคอจีน มินิมอล',
      description_md:
        'เสื้อเชิ้ตคอจีนทรงเรียบ ดีเทลน้อยแต่ดูแพง ใส่ได้ทั้งลุคทางการและลุคสบาย\n\n- ผ้าคอตตอนผสมลินิน\n- กระเป๋าอกซ้าย',
      category: 'เสื้อเชิ้ต',
      base_price: 650,
      images: [IMG('model-05.jpg'), IMG('flat-07.jpg')],
      sizes: ['M', 'L', 'XL'],
      colors: ['ครีม', 'แทน'],
      stock: 10,
      created_days_ago: 20,
      reviews: [
        { rating: 5, author: 'คุณกอล์ฟ', comment: 'คอจีนใส่แล้วดูสุภาพ เรียบหรูครับ', daysAgo: 4 },
        { rating: 4, author: 'คุณอิงค์', comment: 'สีครีมสวยค่ะ เนื้อผ้าดี', daysAgo: 10 },
        { rating: 5, author: 'คุณปอนด์', comment: 'ใส่ไปงานแต่งเพื่อน โดนถามหาร้านเลยครับ', daysAgo: 15 },
        { rating: 5, author: 'คุณทราย', comment: 'ตรงปก ส่งไว แพ็คดีค่ะ', daysAgo: 19 },
      ],
    },
    {
      name: 'กางเกงชิโน่ ขายาว',
      description_md:
        'กางเกงชิโน่ทรงกระบอกเล็ก ผ้าคอตตอนทวิลเนื้อแน่น ใส่ทำงานหรือใส่เที่ยวได้ทุกวัน\n\n- เอวมีฮุคซ่อน ทรงสวยไม่ต้องรีดบ่อย\n- กระเป๋าหน้า-หลังใช้งานได้จริง',
      category: 'กางเกง',
      base_price: 890,
      is_featured: true,
      images: [IMG('cat-03.jpg'), IMG('flat-10.jpg')],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['แทน', 'โอลีฟ'],
      stock: 12,
      created_days_ago: 35,
      reviews: [
        { rating: 5, author: 'คุณบอล', comment: 'ทรงสวยมากครับ ใส่ทำงานทุกวัน', daysAgo: 5 },
        { rating: 5, author: 'คุณแตงโม', comment: 'ซื้อให้พ่อ ใส่พอดี ชอบมากค่ะ', daysAgo: 13 },
        { rating: 4, author: 'คุณนิว', comment: 'ผ้าดีครับ สีโอลีฟเข้มกว่าในรูปนิดนึง', daysAgo: 20 },
        { rating: 5, author: 'คุณเปิ้ล', comment: 'ตัดเย็บดี ทรงเป๊ะ คุ้มค่ะ', daysAgo: 26 },
        { rating: 5, author: 'คุณเจ', comment: 'ใส่สบาย ไม่ร้อน แนะนำครับ', daysAgo: 31 },
        { rating: 4, author: 'คุณฟ้า', comment: 'ดีค่ะ แต่ไซส์ S ยังหลวมนิดหน่อยสำหรับคนตัวเล็ก', daysAgo: 34 },
      ],
    },
    {
      name: 'กางเกงขากว้าง เอวสูง',
      description_md:
        'กางเกงทรงขากว้างเอวสูง ผ้าทิ้งตัวพลิ้วสวย ใส่แล้วขาดูยาว แมทช์กับเสื้อครอปหรือเชิ้ตก็ดูดี\n\n- ซิปข้าง เก็บทรงหน้าท้อง\n- ผ้าไม่ยับง่าย',
      category: 'กางเกง',
      base_price: 790,
      images: [IMG('model-07.jpg'), IMG('model-08.jpg')],
      sizes: ['S', 'M', 'L'],
      colors: ['ดำ'],
      stock: 10,
      created_days_ago: 15,
      reviews: [
        { rating: 5, author: 'คุณกวาง', comment: 'ใส่แล้วขายาวมากค่ะ ผ้าทิ้งตัวสวย', daysAgo: 3 },
        { rating: 5, author: 'คุณพิม', comment: 'เอวสูงเก็บพุงดีมากค่ะ 555', daysAgo: 8 },
        { rating: 4, author: 'คุณเนย', comment: 'สวยค่ะ แต่คนเตี้ยอาจต้องเอาไปตัดขา', daysAgo: 12 },
        { rating: 5, author: 'คุณดาว', comment: 'ซื้อตัวที่สองแล้วค่ะ ใส่บ่อยสุด', daysAgo: 15 },
      ],
    },
    {
      name: 'เดรสสลิป ลายดอกไม้',
      description_md:
        'เดรสสายเดี่ยวลายดอกไม้วินเทจ ผ้าเนื้อเบาพลิ้ว ใส่เที่ยวคาเฟ่หรือทะเลได้สวยทุกโอกาส\n\n- ซับในทั้งตัว ไม่โป๊\n- สายปรับระดับได้',
      category: 'เดรส',
      base_price: 990,
      images: [IMG('model-10.jpg')],
      sizes: ['S', 'M', 'L'],
      colors: ['ขาว'],
      stock: 8,
      variant_tweaks: [{ size: 'L', color: 'ขาว', stock: 2 }],
      created_days_ago: 5,
      reviews: [
        { rating: 5, author: 'คุณเกรซ', comment: 'ใส่ไปถ่ายรูปที่คาเฟ่ รูปสวยทุกใบเลยค่ะ', daysAgo: 1 },
        { rating: 5, author: 'คุณมายด์', comment: 'ลายดอกน่ารักมาก ผ้าไม่บางค่ะ', daysAgo: 3 },
        { rating: 4, author: 'คุณอุ๋ม', comment: 'สวยค่ะ ไซส์ S เป๊ะตามตาราง', daysAgo: 5 },
      ],
    },
    {
      name: 'เดรสสลิป มินิมอล',
      description_md:
        'เดรสสายเดี่ยวทรงตรงสไตล์มินิมอล เรียบแต่ดูแพง ใส่เดี่ยวหรือเลเยอร์กับเสื้อยืดก็ได้\n\n- ผ้าเนื้อทราย ทิ้งตัวสวย\n- ผ่าข้างเล็กน้อย เดินสะดวก',
      category: 'เดรส',
      base_price: 890,
      images: [IMG('model-09.jpg')],
      sizes: ['S', 'M', 'L'],
      colors: ['ขาว', 'ครีม'],
      stock: 8,
      created_days_ago: 10,
      reviews: [
        { rating: 5, author: 'คุณโบว์', comment: 'เรียบหรูมากค่ะ ใส่กับรองเท้าผ้าใบก็สวย', daysAgo: 2 },
        { rating: 5, author: 'คุณแพรว', comment: 'ผ้าดีเกินราคา ซื้อสองสีเลยค่ะ', daysAgo: 6 },
        { rating: 4, author: 'คุณจีน่า', comment: 'สวยค่ะ สีครีมใส่แล้วผิวสว่าง', daysAgo: 9 },
      ],
    },
  ],

  pages: [
    {
      slug: 'about',
      title: 'เกี่ยวกับเรา',
      sort_order: 0,
      body_md:
        'ยินดีต้อนรับสู่ร้านของเรา\n\nเราคัดสรรเสื้อผ้าเบสิกคุณภาพดี ใส่ได้จริงทุกวัน ในราคาที่จับต้องได้ ทุกชิ้นผ่านการตรวจสอบคุณภาพก่อนส่งถึงมือคุณ\n\n*(นี่คือเนื้อหาตัวอย่าง — แก้ไขข้อความนี้ได้ที่เมนู "เพจ" ในหลังร้าน)*',
    },
    {
      slug: 'how-to-order',
      title: 'วิธีสั่งซื้อ',
      sort_order: 1,
      body_md:
        '## สั่งซื้อง่ายๆ 4 ขั้นตอน\n\n1. เลือกสินค้า เลือกไซส์/สี แล้วกดหยิบใส่ตะกร้า\n2. กรอกชื่อ เบอร์โทร และที่อยู่จัดส่ง\n3. สแกน QR PromptPay แล้วอัปโหลดสลิป\n4. รอร้านยืนยันและจัดส่ง — ติดตามสถานะได้จากเมนู "ติดตามคำสั่งซื้อ"\n\n*(นี่คือเนื้อหาตัวอย่าง — แก้ไขข้อความนี้ได้ที่เมนู "เพจ" ในหลังร้าน)*',
    },
  ],

  content: {
    hero: {
      eyebrow: 'NEW COLLECTION',
      headline: 'สไตล์เรียบง่าย สำหรับทุกวัน',
      sub: 'เสื้อผ้าเบสิกคุณภาพดี ใส่สบาย มิกซ์แอนด์แมทช์ได้ทุกลุค',
      ctaText: 'ช้อปเลย',
      ctaHref: '/products',
      imageUrl: IMG('hero-01.jpg'),
    },
    heroSlides: [
      {
        eyebrow: 'NEW COLLECTION',
        headline: 'สไตล์เรียบง่าย สำหรับทุกวัน',
        sub: 'เสื้อผ้าเบสิกคุณภาพดี ใส่สบาย มิกซ์แอนด์แมทช์ได้ทุกลุค',
        ctaText: 'ช้อปเลย',
        ctaHref: '/products',
        imageUrl: IMG('hero-01.jpg'),
      },
      {
        headline: 'เบสิกที่ใช่ ใส่ได้ทุกโอกาส',
        sub: 'จากเสื้อยืดถึงเดรส ครบจบในร้านเดียว',
        ctaText: 'ดูสินค้าทั้งหมด',
        ctaHref: '/products',
        imageUrl: IMG('hero-02.jpg'),
      },
      {
        eyebrow: 'SUMMER',
        headline: 'คอลเลกชันรับซัมเมอร์',
        sub: 'ผ้าลินินและคอตตอนเนื้อเบา สู้แดดเมืองไทย',
        ctaText: 'ช้อปคอลเลกชัน',
        ctaHref: '/products',
        imageUrl: IMG('hero-03.jpg'),
      },
    ],
    categoryBanners: [
      { title: 'เสื้อยืด', sub: 'เบสิกใส่ได้ทุกวัน', imageUrl: IMG('cat-01.jpg'), href: '/products' },
      { title: 'เสื้อเชิ้ต', sub: 'ลุคเรียบร้อยดูดี', imageUrl: IMG('cat-02.jpg'), href: '/products' },
      { title: 'กางเกง', sub: 'ทรงสวยใส่สบาย', imageUrl: IMG('cat-03.jpg'), href: '/products' },
    ],
    categoryCircles: [
      { label: 'เสื้อยืด', imageUrl: IMG('flat-09.jpg'), href: '/products' },
      { label: 'เสื้อเชิ้ต', imageUrl: IMG('flat-06.jpg'), href: '/products' },
      { label: 'กางเกง', imageUrl: IMG('flat-10.jpg'), href: '/products' },
      { label: 'เดรส', imageUrl: IMG('model-10.jpg'), href: '/products' },
      { label: 'มาใหม่', imageUrl: IMG('flat-01.jpg'), href: '/products' },
      { label: 'ลดราคา', imageUrl: IMG('flat-04.jpg'), href: '/products' },
    ],
    memberBenefits: [
      { icon: 'tag', title: 'ราคาพิเศษ', sub: 'โปรโมชันประจำเดือนสำหรับลูกค้าประจำ' },
      { icon: 'truck', title: 'ส่งฟรีเมื่อครบยอด', sub: 'ช้อปครบตามเงื่อนไข ส่งฟรีทั่วไทย' },
      { icon: 'card', title: 'จ่ายง่ายด้วย PromptPay', sub: 'สแกนจ่ายปลอดภัย ยืนยันไว' },
    ],
    lookbook: {
      imageUrl: IMG('promo-01.jpg'),
      eyebrow: 'LOOKBOOK',
      title: 'แรงบันดาลใจการแต่งตัว',
      sub: 'ไอเดียมิกซ์แอนด์แมทช์จากคอลเลกชันล่าสุดของเรา',
      ctaText: 'ดูสินค้าทั้งหมด',
      ctaHref: '/products',
    },
    brandStory: {
      eyebrow: 'OUR STORY',
      title: 'เสื้อผ้าดี ไม่จำเป็นต้องแพง',
      body: 'เราเชื่อว่าเสื้อผ้าเบสิกคุณภาพดีคือรากฐานของทุกลุค จึงตั้งใจคัดผ้าและควบคุมการตัดเย็บทุกชิ้น เพื่อให้คุณใส่ได้นาน คุ้มค่า ในราคาที่เป็นมิตร',
      ctaText: 'ช้อปคอลเลกชัน',
      ctaHref: '/products',
    },
    highlights: [
      { icon: 'star', title: 'คัดสรรคุณภาพ', sub: 'ตรวจสอบทุกชิ้นก่อนจัดส่ง' },
      { icon: 'shield', title: 'ชำระเงินปลอดภัย', sub: 'PromptPay ตรวจสอบทุกรายการ' },
      { icon: 'package', title: 'แพ็คอย่างดี', sub: 'ห่อเรียบร้อยทุกออร์เดอร์' },
      { icon: 'truck', title: 'จัดส่งทั่วไทย', sub: 'มีเลขพัสดุติดตามได้' },
    ],
    tagline: 'BASIC STYLE FOR EVERYDAY',
  },

  contentWithPages: {
    articles: [
      {
        title: 'เรื่องราวของร้านเรา',
        imageUrl: IMG('promo-02.jpg'),
        date: 'บทความจากร้าน',
        href: '/p/about',
      },
      {
        title: 'วิธีสั่งซื้อและชำระเงิน',
        imageUrl: IMG('model-12.jpg'),
        date: 'คู่มือลูกค้า',
        href: '/p/how-to-order',
      },
    ],
  },
};

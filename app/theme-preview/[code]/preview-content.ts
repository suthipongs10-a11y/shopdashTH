// เนื้อหา mock สำหรับหน้า preview ธีม — copy ตาม ref ของเจ้าของ
// (ร้านจริงได้เนื้อหาจาก starter pack + แก้เองที่ "เนื้อหาเว็บ")

import type { ProductCardData } from '@/components/storefront/types';
import { TOYS_PACK } from '@/lib/starter-packs/toys';
import type { ThemeContent } from '@/lib/theme-content';

export const PREVIEW_STORE_NAMES: Record<string, string> = {
  's1-premier': 'สยาม พรีเมียร์ ไดรฟ์',
  's2-travel': 'ไทยทราเวลคาร์',
  's3-taxi': 'แท็กซี่ไทยเซอร์วิส',
  'toys-01': 'ลิตเติ้ลจอย',
};

/** สินค้า mock สำหรับ preview ธีมที่โชว์การ์ดสินค้าจริง (ข้อมูลจาก starter pack) */
export const PREVIEW_PRODUCTS: Record<string, ProductCardData[]> = {
  'toys-01': TOYS_PACK.products.slice(0, 5).map((p, i) => ({
    id: `preview-${i}`,
    name: p.name,
    href: '#',
    priceMin: p.price_override ?? p.base_price,
    imageUrl: p.images[0],
    inStock: true,
    rating: { score: '5.0', count: p.reviews.length },
    variants: [
      { id: `preview-v-${i}`, size: p.sizes[0], color: p.colors[0], price: p.price_override ?? p.base_price, stock: p.stock },
    ],
  })),
};

/** หมวด mock สำหรับ nav ของ preview */
export const PREVIEW_CATEGORIES: Record<string, string[]> = {
  'toys-01': TOYS_PACK.categories,
};

export const PREVIEW_CONTENT: Record<string, ThemeContent> = {
  // ธีมของเล่นเด็ก — ใช้เนื้อหาจริงของ starter pack (source of truth เดียว)
  'toys-01': TOYS_PACK.content,
  's1-premier': {
    hero: {
      eyebrow: 'เหนือระดับ…ในทุกการเดินทาง',
      headline: 'สยาม พรีเมียร์ ไดรฟ์',
      sub: 'บริการรถตู้และรถหรูพร้อมคนขับระดับพรีเมียม',
      imageUrl: '/demo/services/premier/hero-01.webp',
    },
    heroBadges: ['ตรงเวลา', 'ปลอดภัย', 'เป็นส่วนตัว', 'ระดับพรีเมียม'],
    inquiry: {
      title: 'จองการเดินทาง',
      sub: 'สะดวก รวดเร็ว ได้มาตรฐานระดับพรีเมียม',
      serviceOptions: ['รับ-ส่งสนามบิน', 'เดินทาง VIP', 'เดินทางเพื่อธุรกิจ', 'เดินทางต่างจังหวัด'],
      buttonText: 'ตรวจสอบราคาและจอง',
    },
    servicesTitle: 'บริการของเรา',
    highlights: [
      { icon: 'package', title: 'รับ-ส่งสนามบิน', sub: 'บริการรับ-ส่งสนามบินสุวรรณภูมิ ดอนเมือง และสนามบินทั่วประเทศ ตรงเวลา ไร้กังวล', href: '/products' },
      { icon: 'star', title: 'เดินทาง VIP', sub: 'บริการสำหรับแขกคนสำคัญ ดูแลเป็นพิเศษในทุกช่วงเวลาอย่างเป็นส่วนตัว', href: '/products' },
      { icon: 'tag', title: 'เดินทางเพื่อธุรกิจ', sub: 'สะดวก ตรงเวลา ภาพลักษณ์มืออาชีพ ตอบโจทย์นักธุรกิจและองค์กร', href: '/products' },
      { icon: 'truck', title: 'เดินทางต่างจังหวัด', sub: 'บริการรถตู้และรถหรูสู่ทุกจุดหมายปลายทางทั่วไทย ปลอดภัย สบายตลอดเส้นทาง', href: '/products' },
    ],
    vehiclesTitle: 'รถของเรา',
    vehiclesSub: 'คัดสรรรถใหม่ หรูหรา สะอาด สะดวกสบายในทุกการเดินทาง',
    vehicles: [
      { imageUrl: '/demo/services/premier/veh-01.webp', title: 'รถตู้ VIP 10 ที่นั่ง', subtitle: 'Luxury Van', specs: ['10 ที่นั่ง', '8 กระเป๋า', 'Wi-Fi'], href: '/products' },
      { imageUrl: '/demo/services/premier/veh-02.webp', title: 'รถตู้ Executive 9 ที่นั่ง', subtitle: 'Executive Van', specs: ['9 ที่นั่ง', '6 กระเป๋า', 'Wi-Fi'], href: '/products' },
      { imageUrl: '/demo/services/premier/veh-03.webp', title: 'รถหรู Executive Sedan', subtitle: 'Executive Sedan', specs: ['3 ที่นั่ง', '2 กระเป๋า', 'Wi-Fi'], href: '/products' },
      { imageUrl: '/demo/services/premier/veh-04.webp', title: 'รถหรู Premium Sedan', subtitle: 'Premium Sedan', specs: ['3 ที่นั่ง', '2 กระเป๋า', 'Wi-Fi'], href: '/products' },
    ],
    testimonialsTitle: 'ลูกค้าของเรา พูดถึงเรา',
    testimonials: [
      { text: 'บริการประทับใจมากค่ะ คนขับสุภาพ ขับดีมาก รถสะอาด หรูหรา ตรงเวลาทุกครั้งที่ใช้บริการ แนะนำเลยค่ะ', author: 'คุณวรินทร์ ว.', role: 'นักธุรกิจ' },
      { text: 'ใช้บริการรับส่งสนามบินเป็นประจำ ไว้วางใจได้ทุกครั้ง ทีมงานมืออาชีพมากครับ', author: 'คุณทิวพล ก.', role: 'ผู้บริหารบริษัท' },
      { text: 'เดินทางต่างจังหวัดสบายมาก รถนั่งสบาย อุปกรณ์ครบครัน บริการระดับพรีเมียมจริง ๆ', author: 'คุณทัสสรา จ.', role: 'นักท่องเที่ยว' },
    ],
    usp: [
      { icon: 'lock', title: 'ความปลอดภัยสูงสุด', sub: 'ตรวจสอบสภาพรถทุกคัน ประกันภัยครอบคลุม' },
      { icon: 'headset', title: 'คนขับมืออาชีพ', sub: 'ผ่านการฝึกอบรม มีประสบการณ์สูง' },
      { icon: 'clock', title: 'ตรงต่อเวลา', sub: 'วางแผนเส้นทางอย่างดี ถึงที่หมายตรงเวลา' },
      { icon: 'truck', title: 'บริการ 24/7', sub: 'พร้อมดูแลทุกการเดินทาง ตลอด 24 ชั่วโมง' },
    ],
    contact: { lineUrl: 'https://line.me/R/ti/p/@example', lineLabel: '@siampremierdrive' },
  },

  's2-travel': {
    hero: {
      eyebrow: 'เดินทางสบาย มั่นใจทุกเส้นทาง',
      headline: 'กับ ไทยทราเวลคาร์',
      sub: 'บริการรถรับส่งส่วนตัวทั่วไทย โดยทีมงานมืออาชีพ ปลอดภัย ตรงเวลา ใส่ใจในทุกรายละเอียด',
      imageUrl: '/demo/services/travel/hero-01.webp',
    },
    heroBadges: ['รถใหม่ สะอาด ปลอดภัย', 'คนขับมืออาชีพ', 'บริการ 24/7', 'ตรงเวลา 100%'],
    inquiry: {
      title: 'ค้นหารถและราคา',
      sub: 'เลือกเส้นทาง วันเวลา แล้วรับใบเสนอราคาทันที',
      serviceOptions: ['รับ-ส่งสนามบิน', 'ท่องเที่ยว ครอบครัว', 'เดินทางเพื่อธุรกิจ', 'เหมารายวัน/รายทริป'],
      buttonText: 'ค้นหารถและราคา',
    },
    servicesTitle: 'บริการของเรา',
    highlights: [
      { icon: 'package', title: 'รับ-ส่ง สนามบิน', sub: 'บริการรับส่งสนามบินสุวรรณภูมิ ดอนเมือง และสนามบินทั่วไทย', href: '/products' },
      { icon: 'star', title: 'ท่องเที่ยว ครอบครัว', sub: 'เที่ยวสบาย เป็นส่วนตัว ไปได้ทุกที่ทั่วไทย', href: '/products' },
      { icon: 'tag', title: 'เดินทางเพื่อธุรกิจ', sub: 'บริการสำหรับองค์กร ผู้บริหาร สะดวก ตรงเวลา มืออาชีพ', href: '/products' },
      { icon: 'truck', title: 'เหมารายวัน/รายทริป', sub: 'เหมารถพร้อมคนขับ รายวันหรือหลายวัน คุ้มค่า คุ้มราคา', href: '/products' },
    ],
    routesTitle: 'เส้นทางยอดนิยม',
    routes: [
      { imageUrl: '/demo/services/routes/route-sea.webp', title: 'กรุงเทพฯ – พัทยา', duration: '2 ชม.', priceFrom: 1400, href: '/products' },
      { imageUrl: '/demo/services/routes/route-sea2.webp', title: 'กรุงเทพฯ – หัวหิน', duration: '3 ชม.', priceFrom: 2000, href: '/products' },
      { imageUrl: '/demo/services/routes/route-mountain.webp', title: 'กรุงเทพฯ – เขาใหญ่', duration: '3 ชม.', priceFrom: 2400, href: '/products' },
      { imageUrl: '/demo/services/routes/route-mountain2.webp', title: 'กรุงเทพฯ – ระยอง', duration: '2.5 ชม.', priceFrom: 2000, href: '/products' },
      { imageUrl: '/demo/services/routes/route-temple.webp', title: 'กรุงเทพฯ – เชียงใหม่', duration: '1 ชม. (บิน)', priceFrom: 3500, href: '/products' },
    ],
    vehiclesTitle: 'ประเภทรถของเรา',
    vehiclesSub: 'รถใหม่ สะอาด กว้างขวาง นั่งสบาย',
    vehicles: [
      { imageUrl: '/demo/services/travel/veh-01.webp', title: 'รถเก๋ง', specs: ['ผู้โดยสาร 1-3 ท่าน', 'สัมภาระ 2 ใบ'], priceFrom: 1200, href: '/products' },
      { imageUrl: '/demo/services/travel/veh-02.webp', title: 'SUV 5 ที่นั่ง', specs: ['ผู้โดยสาร 1-4 ท่าน', 'สัมภาระ 3-4 ใบ'], priceFrom: 1600, href: '/products' },
      { imageUrl: '/demo/services/travel/veh-03.webp', title: 'รถตู้ VIP', specs: ['ผู้โดยสาร 1-9 ท่าน', 'สัมภาระ 6-8 ใบ'], priceFrom: 2500, href: '/products' },
      { imageUrl: '/demo/services/travel/veh-04.webp', title: 'รถบัส 20-30 ที่นั่ง', specs: ['ผู้โดยสาร 20-30 ท่าน', 'สัมภาระตามขนาด'], priceFrom: 6000, href: '/products' },
    ],
    testimonialsTitle: 'รีวิวจากลูกค้าของเรา',
    testimonials: [
      { text: 'บริการดีมากค่ะ คนขับสุภาพ ตรงเวลา รถสะอาด นั่งสบาย ประทับใจค่ะ', author: 'คุณวิโลพร', role: 'เดินทางไป พัทยา' },
      { text: 'ใช้บริการเหมารายวันไปเขาใหญ่ ประทับใจมากครับ แนะนำเลย', author: 'คุณธนธรณ์', role: 'เดินทางไป เขาใหญ่' },
      { text: 'จัดรถรับส่งพนักงานให้บริษัทบ่อยมาก มืออาชีพ วางใจได้ทุกครั้ง', author: 'คุณปิยะวัฒน์', role: 'HR Manager บริษัทเอกชน' },
    ],
    usp: [
      { icon: 'lock', title: 'ใบอนุญาตถูกต้อง', sub: 'ถูกต้องตามกฎหมาย' },
      { icon: 'headset', title: 'พนักงานผ่านการอบรม', sub: 'บริการอย่างมืออาชีพ' },
      { icon: 'truck', title: 'เช็คสภาพรถสม่ำเสมอ', sub: 'ปลอดภัยทุกเส้นทาง' },
      { icon: 'clock', title: 'บริการลูกค้า 24/7', sub: 'พร้อมช่วยเหลือคุณ' },
    ],
    faqTitle: 'คำถามที่พบบ่อย (FAQ)',
    faq: [
      { q: 'สามารถยกเลิกการจองได้หรือไม่?', a: 'ยกเลิกได้ฟรีก่อนวันเดินทางอย่างน้อย 24 ชั่วโมง — แจ้งผ่าน LINE หรือโทรหาเราได้เลย' },
      { q: 'มีค่าใช้จ่ายเพิ่มเติมอะไรบ้าง?', a: 'ราคาที่แจ้งรวมน้ำมันและคนขับแล้ว อาจมีค่าทางด่วนตามจริงแล้วแต่เส้นทาง' },
      { q: 'ชำระเงินด้วยวิธีใดได้บ้าง?', a: 'โอนผ่าน PromptPay หรือเงินสดกับคนขับ (งานเหมาต่างจังหวัดมีมัดจำล่วงหน้า)' },
      { q: 'หากเที่ยวบินดีเลย์ คนขับจะรอหรือไม่?', a: 'รอครับ — เราติดตามสถานะเที่ยวบินให้ ไม่มีค่าใช้จ่ายเพิ่มสำหรับดีเลย์ปกติ' },
      { q: 'สามารถเปลี่ยนแปลงการจองได้หรือไม่?', a: 'เปลี่ยนวันเวลา/จุดรับส่งได้ แจ้งล่วงหน้าอย่างน้อย 12 ชั่วโมง' },
      { q: 'มีที่นั่งเด็กให้บริการไหม?', a: 'มีคาร์ซีทสำหรับเด็กให้บริการ แจ้งตอนจองล่วงหน้า (ไม่มีค่าใช้จ่ายเพิ่ม)' },
    ],
    contact: { lineUrl: 'https://line.me/R/ti/p/@example', lineLabel: '@thaitravelcar' },
  },

  's3-taxi': {
    hero: {
      headline: 'แท็กซี่ไทยเซอร์วิส',
      sub: 'เดินทางสะดวก ปลอดภัย ในราคาสบายกระเป๋า',
      imageUrl: '/demo/services/taxi/hero-01.webp',
    },
    heroBadges: ['คนขับสุภาพ', 'รถสะอาด', 'ตรงเวลา'],
    inquiry: {
      title: 'จองรถออนไลน์',
      sub: 'เดินทางทันที หรือจองล่วงหน้า',
      serviceOptions: ['เดินทางในเมือง', 'สนามบินสุวรรณภูมิ', 'สนามบินดอนเมือง', 'ท่องเที่ยว / เหมาวัน'],
      buttonText: 'ค้นหารถ',
    },
    usp: [
      { icon: 'clock', title: 'บริการ 24 ชั่วโมง', sub: 'พร้อมให้บริการทุกเวลา' },
      { icon: 'lock', title: 'ปลอดภัยไว้ใจได้', sub: 'คนขับมีประสบการณ์' },
      { icon: 'tag', title: 'ราคาเป็นกันเอง', sub: 'ไม่มีค่าซ่อนเร้น' },
      { icon: 'headset', title: 'บริการลูกค้าดีเยี่ยม', sub: 'ดูแลทุกการเดินทาง' },
    ],
    vehiclesTitle: 'ประเภทรถของเรา',
    vehicles: [
      { imageUrl: '/demo/services/taxi/veh-01.webp', title: 'รถเก๋ง (4 ที่นั่ง)', specs: ['ผู้โดยสาร 1-4 ท่าน', 'กระเป๋า 1-2 ใบ'], priceFrom: 150, href: '/products' },
      { imageUrl: '/demo/services/taxi/veh-02.webp', title: 'รถ MPV (6 ที่นั่ง)', specs: ['ผู้โดยสาร 1-6 ท่าน', 'กระเป๋า 2-4 ใบ'], priceFrom: 250, href: '/products' },
      { imageUrl: '/demo/services/taxi/veh-03.webp', title: 'รถตู้ (10 ที่นั่ง)', specs: ['ผู้โดยสาร 1-10 ท่าน', 'กระเป๋า 4-6 ใบ'], priceFrom: 400, href: '/products' },
    ],
    featureListTitle: 'วิธีการจองรถง่ายๆ เพียง 4 ขั้นตอน',
    featureList: [
      { title: 'กรอกข้อมูลการเดินทาง', sub: 'ระบุจุดรับ จุดหมาย วันที่ เวลา และจำนวนผู้โดยสาร' },
      { title: 'เลือกประเภทรถ', sub: 'เลือกประเภทรถที่ต้องการ และตรวจสอบราคา' },
      { title: 'ยืนยันการจองและชำระเงิน', sub: 'ยืนยันรายละเอียดผ่านช่องทางที่สะดวก' },
      { title: 'เดินทางได้เลย', sub: 'คนขับไปรับตรงเวลา เดินทางปลอดภัย' },
    ],
    testimonialsTitle: 'รีวิวจากลูกค้าของเรา',
    testimonials: [
      { text: 'ใช้บริการประจำครับ คนขับสุภาพ ตรงเวลา รถสะอาด ราคาไม่แพง แนะนำเลยครับ', author: 'คุณสมชาย ว.', role: '10 พ.ค. 2569' },
      { text: 'จองไปสนามบินเช้ามืด สะดวกมากค่ะ คนขับช่วยยกกระเป๋า รถสะอาด ราคาตามแจ้ง', author: 'คุณศิริพร ก.', role: '5 พ.ค. 2569' },
      { text: 'เหมาวันไปเที่ยวต่างจังหวัด ราคาไม่แพง คนขับชำนาญเส้นทางดีมากครับ', author: 'คุณอนุชา ต.', role: '28 เม.ย. 2569' },
    ],
    contact: { lineUrl: 'https://line.me/R/ti/p/@example', lineLabel: '@thaixitaxi' },
  },
};

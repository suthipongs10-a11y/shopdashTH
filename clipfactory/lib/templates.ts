import type { FormatTemplate, TemplateId } from './types';

/**
 * 9 สูตรคลิปปักตะกร้า ถอดจากคลิป outlier จริงในไทย ก.ค.–ส.ค. 2026
 * ที่มา: research/tiktok-shopee-video/README.md
 *
 * กติกา: เทมเพลตคือข้อมูล — ห้ามใส่ if (templateId === ...) ใน engine หรือ UI
 */
export const TEMPLATES: FormatTemplate[] = [
  {
    id: 'listicle',
    rank: 1,
    nameTh: 'Listicle พูดหน้ากล้อง',
    taglineTh: '“5 อย่างที่ซื้อแล้วไม่เสียดายเงิน” — ROI สูงสุด ทำง่ายสุด',
    durationSec: [11, 18],
    targetSec: 15,
    audio: 'voice-only',
    captionStyle: 'static-line',
    sceneCount: [5, 6],
    loop: false,
    bestFor: ['ความงาม', 'ของใช้ในบ้าน', 'แฟชั่น', 'ไอที'],
    platforms: ['tiktok', 'shopee'],
    evidence: [
      { handle: '@im_papam', note: 'ไม่ต้องแพงแต่ดีคล้ายของแพง (16 วิ)', views: '1.2M', outlier: '320×' },
      { handle: '@gimzong_', note: 'คุ้มค่ากับการซื้อ ฉบับคนติดบ้าน (11 วิ)', views: '1.4M', outlier: '68×' },
      { handle: '@pawarisornem', note: 'ซื้อแล้วไม่เสียดายตัง (12 วิ)', views: '1.1M', outlier: '37×' },
    ],
    brief: {
      structure:
        'ประกาศหัวข้อรวมใน 3 วิแรก แล้วไล่ข้อ 1 ถึง 5 ต่อเนื่องแบบไม่หยุดหายใจ แต่ละข้อคือประโยคสั้นประโยคเดียว จบด้วย CTA ชี้ตะกร้า',
      hookRule:
        'ต้องเป็นการประกาศหัวข้อที่มีตัวเลขนำ เช่น "5 อย่างที่..." และต้องพูดข้อแรกต่อทันทีโดยไม่ทักทาย',
      rules: [
        'ห้ามทักทาย ห้ามแนะนำตัว ห้ามพูดว่า "สวัสดีค่ะ" หรือ "วันนี้จะมารีวิว"',
        'แต่ละข้อยาวไม่เกิน 2 วินาที = ประมาณ 12–16 คำไทย',
        'ใช้ภาษาพูดจริง มีคำลงท้ายแบบคนคุยกัน ไม่ใช่ภาษาโฆษณา',
        'ห้ามใช้คำว่า "ที่สุดในโลก" "อันดับ 1" หรือคำโฆษณาเกินจริง',
      ],
    },
    visual: { kenBurns: 'alternate', cutEverySec: 3, titleCard: true },
  },
  {
    id: 'problem-solution',
    rank: 2,
    nameTh: 'Problem → Solution Demo',
    taglineTh: 'เปิดด้วยปัญหาที่คนดูเจอจริง แล้วโชว์สินค้าแก้ต่อหน้า',
    durationSec: [26, 71],
    targetSec: 35,
    audio: 'voice+music',
    captionStyle: 'dynamic',
    sceneCount: [5, 8],
    loop: true,
    bestFor: ['ของใช้ในบ้าน', 'ทำความสะอาด', 'เครื่องใช้ไฟฟ้า'],
    platforms: ['tiktok', 'shopee'],
    evidence: [
      { handle: '@olivfilter', note: 'เครื่องกรองน้ำ — “ผมให้คุณ 2,000 บาท”', views: '584K', outlier: '25×' },
      { handle: '@yoyax_korya', note: 'OxiClean “แช่ แช่ ขยี้ ขยี้” (44 วิ)', views: '300K', outlier: '106×' },
      { handle: '@sanqingpaint_th', note: 'ลูกกลิ้งเก็บรอย — “ผนังเลอะ ต้องจ้างช่าง?”', views: '170K', outlier: '24×' },
    ],
    brief: {
      structure:
        'วิที่ 0–3 คือปัญหาที่คนดูบ่นเอง จากนั้นแนะนำตัวช่วย แล้วสาธิตทีละขั้นจนเห็นผลลัพธ์ชัดด้วยตา ปิดด้วยผลลัพธ์เทียบก่อน-หลังและ CTA',
      hookRule:
        'ต้องเป็นประโยคบ่นของคนดูเอง หรือคำถามที่มีตัวเลขสะดุด และต้องเห็นผลลัพธ์ที่พิสูจน์ได้ภายใน 10 วินาทีแรก',
      rules: [
        'ต้องมีอย่างน้อย 1 ซีนที่บรรยาย “ผลลัพธ์ที่มองเห็นได้” เช่น คราบหาย น้ำใส ผนังเนียน',
        'ห้ามพูดสรรพคุณลอยๆ ต้องผูกกับสิ่งที่กำลังเกิดในภาพ',
        'ประโยคสุดท้ายต้องต่อกับประโยคแรกได้เนียน เพราะคลิปจะวนลูป',
      ],
    },
    visual: { kenBurns: 'in', cutEverySec: 3.5, titleCard: false },
  },
  {
    id: 'deal',
    rank: 3,
    nameTh: 'ดีล / คูปอง / แคมเปญ',
    taglineTh: 'สอนวิธีกดใช้ส่วนลด — outlier สูงสุดในชุดข้อมูล',
    durationSec: [15, 50],
    targetSec: 25,
    audio: 'voice+music',
    captionStyle: 'dynamic',
    sceneCount: [4, 6],
    loop: false,
    bestFor: ['ทุกหมวด'],
    platforms: ['tiktok', 'shopee'],
    warningTh: 'คลิปสูตรนี้ตายทันทีเมื่อจบแคมเปญ — ตั้งวันหมดอายุไว้เสมอ',
    evidence: [
      { handle: '@missabomii', note: '“8.8 ดีลลดด่วน” split screen (50 วิ)', views: '600K', outlier: '5,086×' },
      { handle: '@aummntww', note: '“ชิ้นที่สอง 1 บาท กลับมาแล้ว” (36 วิ)', views: '176K', outlier: '72×' },
      { handle: '@by.awy', note: '“วิธีใช้ลด 90%” (15 วิ)', views: '18.3K', outlier: '35×' },
    ],
    brief: {
      structure:
        'เปิดด้วยตัวเลขส่วนลดตัวใหญ่ทันที แล้วไล่ขั้นตอนการกดรับคูปองทีละสเต็ป ปิดด้วยเส้นตายของโปร',
      hookRule: 'ต้องขึ้นด้วยตัวเลขส่วนลดหรือชื่อแคมเปญล้วนๆ ไม่มีคำนำ',
      rules: [
        'ทุกซีนต้องเป็นขั้นตอนที่ทำตามได้จริง ห้ามพูดกว้างๆ',
        'ต้องระบุเส้นตายของโปรโมชันในซีนสุดท้าย',
        'ห้ามสัญญาส่วนลดที่ไม่ได้ระบุในข้อมูลสินค้า',
      ],
    },
    visual: { kenBurns: 'none', cutEverySec: 3, titleCard: true },
  },
  {
    id: 'trust',
    rank: 4,
    nameTh: 'Trust / เตือนภัยของปลอม',
    taglineTh: 'ไม่ขายตรง แต่สร้างความเชื่อมั่นแล้วปักตะกร้าร้าน official',
    durationSec: [50, 120],
    targetSec: 70,
    audio: 'voice-only',
    captionStyle: 'dynamic',
    sceneCount: [6, 9],
    loop: false,
    bestFor: ['ความงาม', 'สกินแคร์', 'อาหารเสริม'],
    platforms: ['tiktok'],
    evidence: [
      { handle: '@dcteea.blog', note: '“ของปลอมในร้าน Mall?” (60 วิ)', views: '318K', outlier: '104×' },
      { handle: '@somethingjinglebell', note: '“มหากาพย์ของปลอม” (120 วิ)', views: '260K', outlier: '45×' },
    ],
    brief: {
      structure:
        'เปิดด้วยคำเตือน แล้วไล่วิธีสังเกตของแท้ทีละข้อ ปิดด้วยการชี้ว่าควรซื้อจากร้านไหนถึงปลอดภัย',
      hookRule: 'ต้องเป็นคำเตือนสั้นๆ ที่ทำให้คนกลัวพลาด เช่น "เตือนภัยทุกคน"',
      rules: [
        'ต้องให้วิธีตรวจสอบที่ทำตามได้จริงอย่างน้อย 3 ข้อ',
        'ห้ามกล่าวหาร้านค้าหรือแบรนด์ใดโดยเจาะจงว่าขายของปลอม',
        'ปิดท้ายด้วยการชี้ไปที่ร้าน official ไม่ใช่การเร่งให้ซื้อ',
      ],
    },
    visual: { kenBurns: 'none', cutEverySec: 4, titleCard: false },
  },
  {
    id: 'haul',
    rank: 5,
    nameTh: 'Haul / Unboxing แปะพิกัด',
    taglineTh: 'ปักตะกร้าหลายรายการในคลิปเดียว ทำเป็น EP ต่อเนื่อง',
    durationSec: [60, 90],
    targetSec: 70,
    audio: 'voice+music',
    captionStyle: 'dynamic',
    sceneCount: [6, 10],
    loop: false,
    bestFor: ['แฟชั่น', 'ของใช้ในบ้าน', 'ความงาม'],
    platforms: ['tiktok', 'shopee'],
    evidence: [
      { handle: '@setiesmareview', note: 'UNBOX 13 ชิ้น พร้อมแปะพิกัด ep2 (7K followers)', views: '848K', outlier: '841×' },
    ],
    brief: {
      structure:
        'เปิดด้วยกองของทั้งหมดและจำนวนชิ้น แล้วไล่ทีละชิ้น ชิ้นละประโยคเดียว ปิดด้วยชวนดู EP ต่อไป',
      hookRule: 'ต้องบอกจำนวนชิ้นและคำว่า EP เพื่อสร้างความต่อเนื่อง',
      rules: [
        'แต่ละชิ้นได้ประโยคเดียว ห้ามยืดยาว',
        'ต้องบอกราคาโดยประมาณของแต่ละชิ้นถ้ามีข้อมูล',
        'ซีนสุดท้ายต้องชวนติดตาม EP ถัดไป',
      ],
    },
    visual: { kenBurns: 'alternate', cutEverySec: 4, titleCard: true },
  },
  {
    id: 'before-after',
    rank: 6,
    nameTh: 'Before / After',
    taglineTh: 'ตัดสลับก่อน-หลัง ภายใน 3 วินาทีแรก',
    durationSec: [20, 45],
    targetSec: 28,
    audio: 'voice+music',
    captionStyle: 'dynamic',
    sceneCount: [4, 7],
    loop: true,
    bestFor: ['ความงาม', 'ทำความสะอาด', 'ของแต่งบ้าน'],
    platforms: ['tiktok', 'shopee'],
    evidence: [
      { handle: '@theafternoon.official', note: '“ถึงคนที่บอกให้เราไปฉีดฟิลเลอร์”', views: '228K', outlier: '36×' },
      { handle: '@jarustory', note: 'จัดห้องน้ำใหม่ด้วยขวดรีฟิล (IG)', views: '102K', outlier: '34×' },
    ],
    brief: {
      structure:
        'วิแรกคือสภาพ “ก่อน” ที่แย่ ตามด้วยการเผยสภาพ “หลัง” ทันที แล้วค่อยอธิบายว่าใช้อะไร ปิดด้วยเทียบซ้ำ',
      hookRule: 'ต้องเป็น POV หรือประโยคตอบโต้คำวิจารณ์ และต้องเห็นทั้งก่อนและหลังภายใน 3 วินาที',
      rules: [
        'ต้องมีซีน “ก่อน” และซีน “หลัง” อย่างชัดเจนอย่างละอย่างน้อย 1 ซีน',
        'ห้ามอ้างผลลัพธ์ทางการแพทย์หรือการรักษาโรค',
        'ประโยคสุดท้ายต่อกับประโยคแรกได้ เพราะวนลูป',
      ],
    },
    visual: { kenBurns: 'alternate', cutEverySec: 3, titleCard: false },
  },
  {
    id: 'proof-test',
    rank: 7,
    nameTh: 'Proof Test',
    taglineTh: 'ทำสิ่งที่คนดูอยากเห็นแต่ไม่กล้าทำเอง — ผ่า ตัด แช่ ขยี้',
    durationSec: [15, 40],
    targetSec: 25,
    audio: 'voice+music',
    captionStyle: 'dynamic',
    sceneCount: [4, 6],
    loop: false,
    bestFor: ['ความงาม', 'ของใช้ในบ้าน', 'อุปกรณ์'],
    platforms: ['tiktok'],
    evidence: [
      { handle: '@rkjirakith', note: 'เช็ดผิวด้วยทิชชู่พิสูจน์ว่าไม่ได้พอก', views: '1.0M', outlier: '87×' },
      { handle: '@lady_iceburry', note: 'ตัดพัฟครึ่งโชว์เนื้อใน', views: '405K', outlier: '16×' },
    ],
    brief: {
      structure:
        'วิแรกคือการลงมือทดสอบทันที ไม่มีคำอธิบายนำ แล้วค่อยเฉลยว่ากำลังพิสูจน์อะไร ปิดด้วยผลการทดสอบ',
      hookRule: 'ต้องเป็นการกระทำที่ทำให้คนหยุดนิ้วภายใน 1 วินาที และต้องเห็นการกระทำนั้นก่อนคำอธิบาย',
      rules: [
        'การทดสอบต้องเป็นสิ่งที่พิสูจน์คุณสมบัติของสินค้าจริง ไม่ใช่แค่ทำลายของเล่นๆ',
        'ต้องสรุปผลการทดสอบเป็นประโยคเดียวชัดๆ',
      ],
    },
    visual: { kenBurns: 'in', cutEverySec: 2.5, titleCard: false },
  },
  {
    id: 'beat-sync',
    rank: 8,
    nameTh: 'Beat-sync / Stop-motion',
    taglineTh: 'ของหล่นใส่ตะกร้าตามจังหวะ ไม่มีเสียงพูด — ทำอัตโนมัติได้ 100%',
    durationSec: [10, 20],
    targetSec: 14,
    audio: 'music-only',
    captionStyle: 'static-line',
    sceneCount: [6, 12],
    loop: true,
    bestFor: ['ทุกหมวด'],
    platforms: ['tiktok', 'shopee'],
    evidence: [
      { handle: '@spsaypan', note: '“฿1 โกยสิคะ!” ของหล่นใส่ตะกร้าตามบีต', views: '1.4M', outlier: '26×' },
    ],
    brief: {
      structure:
        'ไม่มีเสียงพูด มีแต่ข้อความบนจอ ซีนละ 1 สินค้า 1 ราคา ตัดถี่ตามจังหวะ',
      hookRule: 'ข้อความแรกต้องเป็นตัวเลขราคาหรือส่วนลดล้วนๆ',
      rules: [
        'ทุกซีนมีข้อความไม่เกิน 6 คำ',
        'ช่อง vo ให้ใส่ค่าว่าง เพราะสูตรนี้ไม่มีเสียงพากย์',
        'ห้ามใส่ประโยคยาว เพราะคนดูมีเวลาอ่านซีนละไม่ถึง 1.5 วินาที',
      ],
    },
    visual: { kenBurns: 'none', cutEverySec: 1.2, titleCard: true, beatSync: true },
  },
  {
    id: 'seller-pov',
    rank: 9,
    nameTh: 'POV ฝั่งคนขาย',
    taglineTh: 'ดราม่าหลังร้าน และการชวนนายหน้ามาปักตะกร้า (B2B)',
    durationSec: [20, 30],
    targetSec: 25,
    audio: 'voice+music',
    captionStyle: 'dynamic',
    sceneCount: [4, 6],
    loop: false,
    bestFor: ['ของกิน', 'สินค้าส่ง', 'หาตัวแทน'],
    platforms: ['tiktok'],
    evidence: [
      { handle: '@ford789789789', note: '“เปิดแล้วครับ” ชวนนายหน้าปักตะกร้า', views: '1.2M', outlier: '172×' },
      { handle: '@earryshop', note: '“ลูกค้าคืนของกลับมาแบบใจร้ายที่สุด”', views: '359K', outlier: '104×' },
    ],
    brief: {
      structure:
        'เล่าจากมุมคนขาย เปิดด้วยเหตุการณ์จริงหลังร้าน แล้วโยงมาที่สินค้าหรือข้อเสนอสำหรับนายหน้า',
      hookRule: 'ต้องเป็นประโยคเล่าเหตุการณ์ที่คนขายด้วยกันอินทันที',
      rules: [
        'ต้องระบุค่าคอมมิชชั่นหรือข้อเสนอให้ชัดถ้าเป็นคลิปหานายหน้า',
        'ห้ามด่าลูกค้าเสียหาย ใช้โทนบ่นแบบขำๆ',
      ],
    },
    visual: { kenBurns: 'in', cutEverySec: 3.5, titleCard: false },
  },
];

export const TEMPLATE_BY_ID = new Map<TemplateId, FormatTemplate>(
  TEMPLATES.map((t) => [t.id, t]),
);

export function getTemplate(id: TemplateId): FormatTemplate {
  const t = TEMPLATE_BY_ID.get(id);
  if (!t) throw new Error(`ไม่พบเทมเพลต: ${id}`);
  return t;
}

/** แนะนำสูตรจากหมวดสินค้า — เรียงตาม rank ให้สูตรที่หลักฐานแน่นที่สุดขึ้นก่อน */
export function suggestTemplates(category: string): FormatTemplate[] {
  const key = category.trim();
  if (!key) return [...TEMPLATES].sort((a, b) => a.rank - b.rank);
  const matched = TEMPLATES.filter(
    (t) => t.bestFor.includes('ทุกหมวด') || t.bestFor.some((c) => key.includes(c) || c.includes(key)),
  );
  const rest = TEMPLATES.filter((t) => !matched.includes(t));
  return [...matched.sort((a, b) => a.rank - b.rank), ...rest.sort((a, b) => a.rank - b.rank)];
}

export const CATEGORIES = [
  'ความงาม',
  'สกินแคร์',
  'ของใช้ในบ้าน',
  'ทำความสะอาด',
  'แฟชั่น',
  'เครื่องใช้ไฟฟ้า',
  'ของกิน',
  'ไอที',
  'ของแต่งบ้าน',
  'อาหารเสริม',
];

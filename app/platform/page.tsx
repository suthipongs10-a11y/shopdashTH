// Landing page ของแพลตฟอร์ม (shopdashth.com) — หน้าขาย ShopDash ให้ร้านค้า
// เนื้อหาราคาอ่านจากตาราง plans (is_active) เสมอ — แก้ราคาจาก Super Admin แล้วหน้านี้เปลี่ยนตาม
// ภาพเทมเพลตใน public/marketing/templates/* = screenshot ของร้านเดโม่จริง (ไม่ใช่ mockup)

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { formatBaht } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'shopdashth.com';

/** ลิงก์ร้านเดโม่ — dev: {slug}.localhost:3000, prod: {slug}.{ROOT_DOMAIN} */
function demoUrl(slug: string): string {
  return process.env.NODE_ENV === 'development'
    ? `http://${slug}.localhost:3000`
    : `https://${slug}.${ROOT_DOMAIN}`;
}

interface PlanCard {
  id: string;
  code: string;
  name_th: string;
  price_yearly: number;
  price_renewal: number | null;
  max_products: number;
  max_images_per_product: number;
  max_staff: number;
  allowed_theme_tier: number;
  features: Record<string, boolean>;
}

const PLAN_TAGLINE: Record<string, string> = {
  'p1-start': 'ร้านเปิดใหม่ อยากมีหน้าร้านให้ลูกค้าดูสินค้า',
  'p2-shop': 'ร้านที่ขายจริงทุกวัน ต้องการระบบสั่งซื้อครบ',
  'p3-business': 'ร้านที่โตแล้ว มีทีมงานและสินค้าเยอะ',
  'p4-premium': 'แบรนด์ที่ต้องการระบบเต็มและตรวจสลิปอัตโนมัติ',
};

const RECOMMENDED = 'p2-shop';

function planHighlights(plan: PlanCard): string[] {
  const items = [
    plan.max_products < 0
      ? 'ลงสินค้าได้ไม่จำกัด'
      : `ลงสินค้าได้ ${plan.max_products} รายการ`,
    `รูปสินค้า ${plan.max_images_per_product} รูปต่อชิ้น`,
    plan.allowed_theme_tier >= 3
      ? 'เลือกได้ทุกเทมเพลต รวมระดับพรีเมียม'
      : `เลือกเทมเพลตได้ถึงระดับ ${plan.allowed_theme_tier}`,
  ];
  if (plan.features.theme_customize) items.push('ปรับสี/ฟอนต์ของร้านเองได้');
  if (plan.features.custom_pages) items.push('สร้างเพจเนื้อหาเองได้ (เกี่ยวกับเรา ฯลฯ)');
  if (plan.features.discount_codes) items.push('โค้ดส่วนลด');
  if (plan.features.line_oa) items.push('แจ้งเตือนออร์เดอร์เข้า LINE');
  if (plan.features.custom_domain) items.push('ใช้โดเมนของร้านเองได้');
  if (plan.features.analytics_dashboard) items.push('แดชบอร์ดวิเคราะห์ยอดขาย');
  if (plan.features.slip_verify_api) items.push('ตรวจสลิปอัตโนมัติ');
  if (plan.max_staff > 0) items.push(`เพิ่มพนักงานได้ ${plan.max_staff} คน`);
  return items;
}

// tier ต้องตรงกับ themes/presets/*.ts — ป้าย "มีในแพ็กเกจใด" คำนวณจากตาราง plans ตอน render
// (แพ็กเกจแก้ได้จาก Super Admin — ห้าม hardcode ชื่อแพ็กเกจไว้ตรงนี้ เดี๋ยวข้อมูลเพี้ยน)
const TEMPLATES = [
  {
    slug: 'simplewear',
    img: '/marketing/templates/t1-simple.webp',
    name: 'SIMPLE',
    tier: 1,
    desc: 'หน้าร้านเรียบสะอาด เน้นโชว์สินค้าและช่องทางแชท เหมาะร้านที่ปิดการขายทาง LINE/เฟซบุ๊ก',
  },
  {
    slug: 'wearstore',
    img: '/marketing/templates/t2-store.webp',
    name: 'STORE',
    tier: 2,
    desc: 'ร้านค้าออนไลน์เต็มรูปแบบ มีตะกร้า ค้นหา ดูสินค้าไว (Quick View) และแถบสถานะคำสั่งซื้อ',
  },
  {
    slug: 'fashionhub',
    img: '/marketing/templates/t3-hub.webp',
    name: 'HUB',
    tier: 2,
    desc: 'สไตล์มาร์เก็ตเพลส สินค้าเยอะ มีตัวกรองด้านข้าง ป้ายลดราคา/มาใหม่/ขายดี และรีวิวจริง',
  },
  {
    slug: 'luxe',
    img: '/marketing/templates/t4-luxe.webp',
    name: 'LUXÉ',
    tier: 3,
    desc: 'โทนหรู ตัวอักษร serif เหมาะแบรนด์ที่ขายภาพลักษณ์และสินค้าราคาสูง',
  },
];

/** แพ็กเกจถูกที่สุดที่เลือกธีม tier นี้ได้ — plans เรียงตามราคาแล้ว */
function tierLabel(tier: number, plans: PlanCard[]): string {
  const idx = plans.findIndex((p) => p.allowed_theme_tier >= tier);
  if (idx < 0) return 'สอบถามทีมงาน';
  return idx === 0 ? 'ใช้ได้ทุกแพ็กเกจ' : `แพ็กเกจ${plans[idx].name_th}ขึ้นไป`;
}

const FEATURES = [
  {
    icon: 'qr',
    title: 'PromptPay เข้าบัญชีร้านโดยตรง',
    desc: 'ระบบสร้าง QR พร้อมยอดของแต่ละออร์เดอร์จากพร้อมเพย์ของร้านเอง เงินวิ่งเข้าบัญชีร้านเต็มจำนวน ShopDash ไม่หักค่าคอมมิชชัน',
  },
  {
    icon: 'shield',
    title: 'ตรวจสลิป กันสลิปซ้ำ-สลิปปลอม',
    desc: 'สลิปทุกใบถูกถอด QR ในรูปเพื่อจับเลขอ้างอิงธุรกรรม ใบเดิมที่ถูกแคปใหม่ก็จับได้ พร้อมคิวอนุมัติที่เทียบยอดกับออร์เดอร์ให้เห็นชัด',
  },
  {
    icon: 'box',
    title: 'สต๊อกแยกตามตัวเลือกสินค้า',
    desc: 'ตั้งไซส์ × สี (หรือช่วงวัย × แบบ สำหรับร้านของเล่น/แม่และเด็ก) ระบบตัดสต๊อกตอนยืนยันการชำระเงิน และคืนสต๊อกอัตโนมัติเมื่อยกเลิก',
  },
  {
    icon: 'truck',
    title: 'ออร์เดอร์ครบตั้งแต่รับถึงส่ง',
    desc: 'ไล่สถานะ รอชำระ → ยืนยัน → แพ็ก → จัดส่ง ใส่เลขพัสดุแล้วลูกค้ากดติดตามพัสดุได้เอง ไม่ต้องทักถามร้าน',
  },
  {
    icon: 'palette',
    title: 'แก้เนื้อหาหน้าร้านเองได้',
    desc: 'เปลี่ยนข้อความ รูปแบนเนอร์ สโลแกน และสีของร้านได้จากหลังร้าน ไม่ต้องเรียกโปรแกรมเมอร์ ไม่ต้องรอรอบ deploy',
  },
  {
    icon: 'chart',
    title: 'แดชบอร์ดยอดขาย',
    desc: 'ดูยอดขายรายวัน/รายสัปดาห์ สินค้าขายดี ออร์เดอร์ค้างแต่ละสถานะ และสินค้าใกล้หมดสต๊อก ในหน้าเดียว',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'สมัครและเลือกแพ็กเกจ',
    desc: 'ตั้งชื่อร้านกับที่อยู่เว็บของคุณ เช่น baannoi.' + ROOT_DOMAIN + ' — ใช้งานได้ทันที ทดลองฟรี 7 วัน ยังไม่ต้องจ่าย',
  },
  {
    n: '2',
    title: 'ใส่พร้อมเพย์ ลงสินค้า เลือกเทมเพลต',
    desc: 'กรอกพร้อมเพย์ของร้าน อัปรูปสินค้า ตั้งไซส์/สีและสต๊อก แล้วเลือกเทมเพลตที่ชอบ ปรับสีให้เข้ากับแบรนด์ได้',
  },
  {
    n: '3',
    title: 'เปิดขายได้เลย',
    desc: 'ลูกค้าสั่งซื้อ จ่ายผ่าน QR แล้วอัปสลิป คุณกดอนุมัติเมื่อเช็คเงินเข้าแล้ว ระบบตัดสต๊อกและแจ้งสถานะให้ลูกค้าเอง',
  },
];

const FAQ = [
  {
    q: 'เงินค่าสินค้าจากลูกค้าเข้าบัญชีใคร?',
    a: 'เข้าบัญชีพร้อมเพย์ของร้านคุณโดยตรง ShopDash ไม่ได้ถือเงินและไม่หักเปอร์เซ็นต์ต่อออร์เดอร์ รายได้ของเราคือค่าเช่าระบบรายปีเท่านั้น',
  },
  {
    q: 'จ่ายค่าแพ็กเกจอย่างไร?',
    a: 'สมัครแล้วใช้งานได้ทันที 7 วันแบบไม่ต้องจ่าย เมื่อพอใจให้เข้าหน้า "แพ็กเกจของฉัน" ในหลังร้าน สแกน QR พร้อมเพย์แล้วอัปโหลดสลิป ทีมงานอนุมัติแล้วร้านจะเปิดใช้งานเต็มปี',
  },
  {
    q: 'ปีถัดไปจ่ายเท่าไร?',
    a: 'ปีแรกเป็นค่าจัดทำระบบรวมค่าใช้งาน ส่วนปีถัดไปจ่ายเฉพาะ "ค่าดูแลรายปี" ซึ่งถูกกว่ามาก (ดูตัวเลขในตารางราคาด้านบน)',
  },
  {
    q: 'เปลี่ยนแพ็กเกจภายหลังได้ไหม?',
    a: 'ได้ อัปเกรดแล้วฟีเจอร์เปิดใช้ทันที ส่วนการลดแพ็กเกจ ข้อมูลเดิมจะไม่ถูกลบทิ้ง สินค้าที่เกินโควตายังขายได้ตามปกติ เพียงแต่เพิ่มใหม่ไม่ได้จนกว่าจะต่ำกว่าโควตา',
  },
  {
    q: 'ใช้โดเมนของร้านเองได้ไหม?',
    a: 'ได้ตั้งแต่แพ็กเกจร้านค้าขึ้นไป ระบบมีหน้าตรวจ DNS ที่บอกเป็นภาษาไทยว่าต้องตั้งค่าอะไรและตอนนี้ผิดตรงไหน โดยที่อยู่ .' + ROOT_DOMAIN + ' เดิมก็ยังใช้ได้ควบคู่กัน',
  },
  {
    q: 'ต้องมีความรู้ทางเทคนิคไหม?',
    a: 'ไม่ต้อง ทุกอย่างทำผ่านหลังร้านเป็นภาษาไทย ตั้งแต่ลงสินค้า แก้ข้อความหน้าเว็บ ไปจนถึงอนุมัติสลิปและใส่เลขพัสดุ',
  },
];

function FeatureIcon({ name }: { name: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const paths: Record<string, React.ReactNode> = {
    qr: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 14h3v3h-3zM20 14v3M14 20h6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    box: (
      <>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
      </>
    ),
    truck: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="17.5" cy="18" r="1.8" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 100 18c1.4 0 2-1 2-2s-.6-2-2-2h1.5a4 4 0 004-4c0-5-2.5-10-5.5-10z" />
        <circle cx="8" cy="10" r="1" />
        <circle cx="12" cy="7.5" r="1" />
        <circle cx="15.5" cy="10.5" r="1" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V4M4 20h16" />
        <path d="M8 16v-4M12 16V8M16 16v-6" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" {...common} aria-hidden>
      {paths[name]}
    </svg>
  );
}

/** กรอบหน้าต่างเบราว์เซอร์ครอบ screenshot ร้านจริง */
function BrowserFrame({
  src,
  alt,
  address,
  priority,
}: {
  src: string;
  alt: string;
  address: string;
  priority?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="ml-2 truncate rounded bg-white px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200">
          {address}
        </span>
      </div>
      <Image
        src={src}
        alt={alt}
        width={1440}
        height={1000}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 720px"
        className="h-auto w-full"
      />
    </div>
  );
}

export default async function PlatformLandingPage() {
  const db = createAdminClient();
  const { data } = await db
    .from('plans')
    .select(
      'id, code, name_th, price_yearly, price_renewal, max_products, max_images_per_product, max_staff, allowed_theme_tier, features',
    )
    .eq('is_active', true)
    .order('price_yearly');
  const plans = (data ?? []) as unknown as PlanCard[];
  const cheapest = plans[0];

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-indigo-50/70 via-white to-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              สำหรับร้านค้าไทย · ทดลองฟรี 7 วัน
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              เปิดร้านออนไลน์ของคุณเอง
              <br />
              <span className="text-indigo-600">เงินเข้าบัญชีร้านเต็มจำนวน</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              หน้าร้านสวยพร้อมใช้บนที่อยู่ของคุณเอง ลูกค้าจ่ายผ่าน PromptPay
              เข้าบัญชีร้านโดยตรง — ไม่มีการหักค่าคอมมิชชันต่อออร์เดอร์
              จ่ายเป็นค่าเช่าระบบรายปีเท่านั้น
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                เริ่มเปิดร้านฟรี 7 วัน
              </Link>
              <a
                href="#templates"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900"
              >
                ดูตัวอย่างร้านจริง
              </a>
            </div>

            <ul className="mt-8 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              {[
                'ไม่หักค่าคอมต่อออร์เดอร์',
                'ไม่ต้องผูกบัตรเครดิต',
                'ใช้งานได้ทันทีหลังสมัคร',
                'ระบบและหลังร้านภาษาไทย',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-6">
            <BrowserFrame
              src="/marketing/templates/t2-store.webp"
              alt="ตัวอย่างหน้าร้านที่สร้างด้วย ShopDash"
              address={`wearstore.${ROOT_DOMAIN}`}
              priority
            />
            <p className="mt-3 text-center text-xs text-slate-400">
              ภาพจากร้านเดโม่จริงที่รันบน ShopDash — กดดูตัวอย่างสดได้ด้านล่าง
            </p>
          </div>
        </div>
      </section>

      {/* ---------- VALUE STRIP ---------- */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
          {[
            {
              head: 'ไม่หักเปอร์เซ็นต์',
              sub: 'ขายได้เท่าไรเข้าร้านเต็มจำนวน ต่างจากมาร์เก็ตเพลสที่หักทุกออร์เดอร์',
            },
            {
              head: 'เปิดร้านได้ในวันเดียว',
              sub: 'ไม่ต้องจ้างทำเว็บ ไม่ต้องดูแลเซิร์ฟเวอร์ ลงสินค้าแล้วขายได้เลย',
            },
            {
              head: 'เริ่มต้นปีละ ' + (cheapest ? formatBaht(cheapest.price_yearly) : '฿990'),
              sub: 'จ่ายรายปี รู้ต้นทุนล่วงหน้า ปีถัดไปเหลือเพียงค่าดูแลรายปี',
            },
          ].map((item) => (
            <div key={item.head}>
              <p className="font-semibold text-slate-900">{item.head}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- TEMPLATES ---------- */}
      <section id="templates" className="scroll-mt-20 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-indigo-600">เทมเพลตหน้าร้าน</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              เลือกหน้าร้านที่ใช่ แล้วปรับให้เป็นแบรนด์คุณ
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              ทุกเทมเพลตออกแบบมาให้ขายของได้จริงและใช้งานลื่นบนมือถือ
              เปลี่ยนข้อความ รูป และสีได้เองจากหลังร้าน — กดเข้าไปดูร้านเดโม่จริงได้ทุกตัว
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {TEMPLATES.map((tpl) => (
              <article key={tpl.slug} className="flex flex-col">
                <BrowserFrame
                  src={tpl.img}
                  alt={`เทมเพลต ${tpl.name}`}
                  address={`${tpl.slug}.${ROOT_DOMAIN}`}
                />
                <div className="mt-5 flex flex-1 flex-col">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{tpl.name}</h3>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                      {tierLabel(tpl.tier, plans)}
                    </span>
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{tpl.desc}</p>
                  <a
                    href={demoUrl(tpl.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    ดูตัวอย่างร้านจริง
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-indigo-600">ฟีเจอร์</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              ครบตั้งแต่ลูกค้ากดสั่ง จนพัสดุถึงมือ
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              ระบบออกแบบมาสำหรับวิธีขายแบบไทย ๆ โดยเฉพาะ — โอนพร้อมเพย์ ส่งสลิป แล้วร้านตรวจก่อนแพ็ก
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FeatureIcon name={f.icon} />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-indigo-600">เริ่มต้นอย่างไร</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              จากสมัคร ถึงขายได้ ใน 3 ขั้นตอน
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-indigo-600">แพ็กเกจและราคา</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              จ่ายรายปี ไม่มีค่าคอมต่อออร์เดอร์
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              ปีแรกรวมค่าจัดทำระบบและตั้งค่าร้านให้ ปีถัดไปจ่ายเพียงค่าดูแลรายปี
              ทุกแพ็กเกจทดลองใช้ฟรี 7 วันก่อนตัดสินใจ
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const featured = plan.code === RECOMMENDED;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
                    featured
                      ? 'border-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-indigo-600'
                      : 'border-slate-200 shadow-sm'
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                      แนะนำ
                    </span>
                  )}

                  <h3 className="font-bold text-slate-900">{plan.name_th}</h3>
                  <p className="mt-1 min-h-[2.5rem] text-xs leading-relaxed text-slate-500">
                    {PLAN_TAGLINE[plan.code] ?? ''}
                  </p>

                  <p className="mt-4 text-3xl font-bold text-slate-900">
                    {formatBaht(plan.price_yearly)}
                    <span className="ml-1 text-sm font-normal text-slate-400">/ปีแรก</span>
                  </p>
                  {plan.price_renewal !== null && (
                    <p className="mt-1 text-xs text-slate-500">
                      ปีถัดไป {formatBaht(plan.price_renewal)}/ปี (ค่าดูแลระบบ)
                    </p>
                  )}

                  <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                    {planHighlights(plan).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-0.5 text-indigo-600" aria-hidden>
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/signup?plan=${plan.code}`}
                    className={`mt-6 rounded-lg py-2.5 text-center text-sm font-semibold ${
                      featured
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                    }`}
                  >
                    เลือกแพ็กเกจนี้
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            ชำระค่าแพ็กเกจผ่าน PromptPay แล้วอัปโหลดสลิปในหลังร้าน — ไม่ต้องใช้บัตรเครดิต
          </p>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <span className="text-sm font-semibold text-indigo-600">คำถามที่พบบ่อย</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              เรื่องที่ร้านค้าถามบ่อยที่สุด
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  {item.q}
                  <span className="text-slate-400 transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            เปิดร้านวันนี้ ขายได้ตั้งแต่วันนี้
          </h2>
          <p className="mt-4 leading-relaxed text-slate-300">
            ทดลองใช้ฟรี 7 วันแบบเต็มระบบ ไม่ต้องผูกบัตร ถ้าไม่ชอบก็หยุดได้เลย
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-white px-7 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            เริ่มเปิดร้านฟรี 7 วัน
          </Link>
        </div>
      </section>
    </>
  );
}

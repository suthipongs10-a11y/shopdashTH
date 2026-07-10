// Landing page ของแพลตฟอร์ม — hero + การ์ดแพลนจากตาราง plans (อ่านผ่าน is_active)

import Link from 'next/link';
import { formatBaht } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

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

function planHighlights(plan: PlanCard): string[] {
  const items = [
    plan.max_products < 0 ? 'สินค้าไม่จำกัดจำนวน' : `สินค้าสูงสุด ${plan.max_products} รายการ`,
    `รูปสูงสุด ${plan.max_images_per_product} รูปต่อสินค้า`,
    `เลือกธีมได้ถึงระดับ ${plan.allowed_theme_tier}`,
  ];
  if (plan.features.custom_domain) items.push('ใช้โดเมนของตัวเองได้');
  if (plan.features.discount_codes) items.push('โค้ดส่วนลด');
  if (plan.features.line_oa) items.push('แจ้งเตือนผ่าน LINE OA');
  if (plan.features.slip_verify_api) items.push('ตรวจสลิปอัตโนมัติ');
  if (plan.max_staff > 0) items.push(`เพิ่ม staff ได้ ${plan.max_staff} คน`);
  return items;
}

export default async function PlatformLandingPage() {
  const db = createAdminClient();
  const { data } = await db
    .from('plans')
    .select('id, code, name_th, price_yearly, price_renewal, max_products, max_images_per_product, max_staff, allowed_theme_tier, features')
    .eq('is_active', true)
    .order('price_yearly');
  const plans = (data ?? []) as unknown as PlanCard[];

  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          เปิดร้านออนไลน์ของคุณเองใน 5 นาที
        </h1>
        <p className="mt-4 text-gray-600">
          ระบบร้านค้าครบวงจรสำหรับร้านค้าไทย — หน้าร้านบน subdomain ของคุณเอง รับชำระผ่าน PromptPay
          จัดการสต๊อกและออร์เดอร์ในที่เดียว ทดลองใช้ฟรี 7 วันทุกแพลน
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-block rounded-md bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
        >
          เริ่มเปิดร้านฟรี
        </Link>
      </section>

      <section id="pricing" className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">แพลนราคา (รายปี)</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-6"
              >
                <h3 className="font-semibold text-gray-900">{plan.name_th}</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatBaht(plan.price_yearly)}
                  <span className="text-sm font-normal text-gray-400">/ปีแรก</span>
                </p>
                {plan.price_renewal !== null && (
                  <p className="text-xs text-gray-500">
                    ค่าดูแลปีถัดไป {formatBaht(plan.price_renewal)}/ปี
                  </p>
                )}
                <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
                  {planHighlights(plan).map((item) => (
                    <li key={item}>✓ {item}</li>
                  ))}
                </ul>
                <Link
                  href={`/signup?plan=${plan.code}`}
                  className="mt-6 rounded-md border border-gray-900 py-2 text-center text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  เลือกแพลนนี้
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

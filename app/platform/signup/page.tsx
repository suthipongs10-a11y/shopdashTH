// หน้า signup public (§5.3 ข้อ 1–2) — เลือกแพลน + กรอกข้อมูลร้าน + slug realtime check

import { createAdminClient } from '@/lib/supabase/admin';
import { SignupForm, type SignupPlan } from './signup-form';

export const dynamic = 'force-dynamic';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: preselect } = await searchParams;

  const db = createAdminClient();
  const { data } = await db
    .from('plans')
    .select('id, code, name_th, price_yearly, price_renewal')
    .eq('is_active', true)
    .order('price_yearly');
  const plans = (data ?? []) as SignupPlan[];

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">เปิดร้านใหม่</h1>
      <p className="mt-2 text-sm text-gray-500">
        ทดลองใช้ฟรี 7 วันทุกแพลน — ระหว่างทดลองใช้ ชำระค่าแพลนได้จากหน้า &ldquo;แพลนของฉัน&rdquo;
        ในหลังร้าน
      </p>
      <div className="mt-8">
        <SignupForm
          plans={plans}
          preselectCode={preselect}
          rootDomain={process.env.ROOT_DOMAIN ?? 'shopdashth.com'}
        />
      </div>
    </div>
  );
}

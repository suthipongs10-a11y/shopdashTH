// จัดการแพลน (§2.4 MVP) — แก้ราคา/limit/ฟีเจอร์จาก UI
// ร้านที่ถือแพลนได้ค่าใหม่ทันทีเพราะ flag คำนวณจาก plan แบบ realtime (§5.2)

import { createAdminClient } from '@/lib/supabase/admin';
import { NewPlanForm, PlanForm, type PlanFormData } from './plan-form';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const db = createAdminClient();
  const { data } = await db.from('plans').select('*').order('price_yearly');
  const plans = (data ?? []) as unknown as PlanFormData[];

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-gray-900">จัดการแพลน</h1>
      <p className="mb-6 text-sm text-gray-500">
        การแก้ไขมีผลกับทุกร้านที่ถือแพลนทันที (feature flag คำนวณจากแพลนแบบ realtime)
      </p>
      <div className="space-y-4">
        {plans.map((plan) => (
          <PlanForm key={plan.id} plan={plan} />
        ))}
        <NewPlanForm />
      </div>
    </div>
  );
}

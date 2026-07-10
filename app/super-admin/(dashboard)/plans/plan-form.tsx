'use client';

import { useActionState } from 'react';
import { FEATURE_LABEL_TH, type FeatureKey } from '@/lib/features-shared';
import { createPlan, updatePlan, type PlanActionState } from './actions';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

const FEATURE_KEYS: FeatureKey[] = [
  'custom_domain',
  'slip_verify_api',
  'line_oa',
  'discount_codes',
  'analytics_dashboard',
  'staff_accounts',
  'theme_customize',
];

export interface PlanFormData {
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
  is_active: boolean;
}

function NumberField({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-gray-500">
        {label}
        {hint && <span className="ml-1 text-gray-400">({hint})</span>}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        defaultValue={defaultValue ?? ''}
        className={inputClass}
      />
    </div>
  );
}

/** ช่องตัวเลข + checkbox ฟีเจอร์ — ใช้ร่วมกันทั้งฟอร์มแก้ไขและฟอร์มสร้างแพลน */
function PlanFields({ plan }: { plan?: PlanFormData }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberField
          label="ราคาปีแรก (บาท)"
          name="price_yearly"
          defaultValue={plan?.price_yearly ?? 0}
          hint="รวมค่าจัดทำ"
        />
        <NumberField
          label="ค่าดูแลรายปี (บาท)"
          name="price_renewal"
          defaultValue={plan?.price_renewal ?? null}
          hint="ว่าง = เท่าปีแรก"
        />
        <NumberField
          label="สินค้าสูงสุด"
          name="max_products"
          defaultValue={plan?.max_products ?? 30}
          hint="-1 = ไม่จำกัด"
        />
        <NumberField
          label="รูปต่อสินค้า"
          name="max_images_per_product"
          defaultValue={plan?.max_images_per_product ?? 3}
        />
        <NumberField label="Staff เพิ่มเติม" name="max_staff" defaultValue={plan?.max_staff ?? 0} />
        <NumberField
          label="ธีมได้ถึง tier"
          name="allowed_theme_tier"
          defaultValue={plan?.allowed_theme_tier ?? 1}
          hint="1–3"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-gray-500">ฟีเจอร์ในแพลน</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FEATURE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name={`feature_${key}`}
                defaultChecked={plan?.features[key] === true}
              />
              {FEATURE_LABEL_TH[key]}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

export function PlanForm({ plan }: { plan: PlanFormData }) {
  const [state, formAction, pending] = useActionState<PlanActionState, FormData>(
    updatePlan.bind(null, plan.id),
    {},
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-gray-200 bg-white p-5"
      key={plan.id}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          {plan.name_th} <span className="ml-1 text-xs font-normal text-gray-400">{plan.code}</span>
        </h2>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" name="is_active" defaultChecked={plan.is_active} />
          เปิดขาย
        </label>
      </div>

      <PlanFields plan={plan} />

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกแพลน'}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.done && (
          <p className="text-sm text-green-700">บันทึกแล้ว — ร้านที่ถือแพลนนี้ได้ค่าใหม่ทันที</p>
        )}
      </div>
    </form>
  );
}

/** ฟอร์มสร้างแพลนใหม่ (Billing v2) — เดิมต้อง insert ทาง SQL */
export function NewPlanForm() {
  const [state, formAction, pending] = useActionState<PlanActionState, FormData>(createPlan, {});

  return (
    <form action={formAction} className="rounded-lg border border-dashed border-gray-300 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">+ สร้างแพลนใหม่</h2>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="new-code" className="mb-1 block text-xs font-medium text-gray-500">
            รหัสแพลน (a-z, 0-9, -)
          </label>
          <input id="new-code" name="code" placeholder="เช่น p5-enterprise" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-name" className="mb-1 block text-xs font-medium text-gray-500">
            ชื่อแพลน (ภาษาไทย)
          </label>
          <input id="new-name" name="name_th" placeholder="เช่น เอนเตอร์ไพรส์" className={inputClass} />
        </div>
      </div>

      <PlanFields />

      <div className="mt-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" name="is_active" defaultChecked />
          เปิดขายทันที
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'กำลังสร้าง…' : 'สร้างแพลน'}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.done && <p className="text-sm text-green-700">สร้างแพลนแล้ว</p>}
      </div>
    </form>
  );
}

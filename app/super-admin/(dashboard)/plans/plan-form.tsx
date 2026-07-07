'use client';

import { useActionState } from 'react';
import { FEATURE_LABEL_TH, type FeatureKey } from '@/lib/features-shared';
import { updatePlan, type PlanActionState } from './actions';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

const FEATURE_KEYS: FeatureKey[] = [
  'custom_domain',
  'slip_verify_api',
  'line_oa',
  'discount_codes',
  'analytics_dashboard',
  'staff_accounts',
];

export interface PlanFormData {
  id: string;
  code: string;
  name_th: string;
  price_yearly: number;
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
  defaultValue: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-gray-500">
        {label}
        {hint && <span className="ml-1 text-gray-400">({hint})</span>}
      </label>
      <input id={name} name={name} type="number" defaultValue={defaultValue} className={inputClass} />
    </div>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberField label="ราคา/ปี (บาท)" name="price_yearly" defaultValue={plan.price_yearly} />
        <NumberField
          label="สินค้าสูงสุด"
          name="max_products"
          defaultValue={plan.max_products}
          hint="-1 = ไม่จำกัด"
        />
        <NumberField
          label="รูปต่อสินค้า"
          name="max_images_per_product"
          defaultValue={plan.max_images_per_product}
        />
        <NumberField label="Staff เพิ่มเติม" name="max_staff" defaultValue={plan.max_staff} />
        <NumberField
          label="ธีมได้ถึง tier"
          name="allowed_theme_tier"
          defaultValue={plan.allowed_theme_tier}
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
                defaultChecked={plan.features[key] === true}
              />
              {FEATURE_LABEL_TH[key]}
            </label>
          ))}
        </div>
      </div>

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

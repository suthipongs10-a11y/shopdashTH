'use client';

import { useActionState } from 'react';
import { FEATURE_LABEL_TH, type FeatureKey } from '@/lib/features-shared';
import type { TenantStatus } from '@/lib/platform/tenant-admin';
import {
  superChangePlan,
  superSaveOverrides,
  superSetTenantStatus,
  type OverridesState,
  type PlanChangeState,
  type StatusActionState,
} from './actions';

const inputClass =
  'rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';
const buttonClass =
  'rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50';

const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'trial', label: 'ทดลองใช้ (trial)' },
  { value: 'active', label: 'ใช้งานอยู่ (active)' },
  { value: 'grace', label: 'ผ่อนผัน (grace)' },
  { value: 'locked', label: 'ระงับ (locked)' },
  { value: 'archived', label: 'ปิดถาวร (archived)' },
];

// ---------- เปลี่ยนสถานะ / lock / unlock ----------

export function StatusPanel({
  tenantId,
  currentStatus,
}: {
  tenantId: string;
  currentStatus: TenantStatus;
}) {
  const [state, formAction, pending] = useActionState<StatusActionState, FormData>(
    superSetTenantStatus.bind(null, tenantId),
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-gray-500">
            เปลี่ยนสถานะเป็น
          </label>
          <select id="status" name="status" defaultValue={currentStatus} className={inputClass}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="reason" className="mb-1 block text-xs font-medium text-gray-500">
            เหตุผล (บันทึกลง audit log)
          </label>
          <input id="reason" name="reason" className={`${inputClass} w-full`} />
        </div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? 'กำลังบันทึก…' : 'บันทึกสถานะ'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.done && <p className="text-sm text-green-700">บันทึกสถานะแล้ว</p>}
    </form>
  );
}

// ---------- เปลี่ยนแพลน + ยืนยันดาวน์เกรด (§7.2) ----------

export function PlanPanel({
  tenantId,
  currentPlanId,
  plans,
}: {
  tenantId: string;
  currentPlanId: string;
  plans: { id: string; name_th: string; price_yearly: number }[];
}) {
  const [state, formAction, pending] = useActionState<PlanChangeState, FormData>(
    superChangePlan.bind(null, tenantId),
    {},
  );

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="plan_id" className="mb-1 block text-xs font-medium text-gray-500">
            เปลี่ยนแพลนเป็น
          </label>
          <select id="plan_id" name="plan_id" defaultValue={currentPlanId} className={inputClass}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_th} (฿{p.price_yearly.toLocaleString('th-TH')}/ปี)
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? 'กำลังตรวจสอบ…' : 'เปลี่ยนแพลน'}
        </button>
      </form>

      {state.warnings && state.pendingPlanId && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">
            การดาวน์เกรดนี้มีผลกระทบ — กรุณาอ่านและยืนยันรับทราบ (ข้อมูลเดิมจะไม่ถูกลบ)
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-yellow-800">
            {state.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <form action={formAction} className="mt-3">
            <input type="hidden" name="plan_id" value={state.pendingPlanId} />
            <input type="hidden" name="confirmed" value="1" />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {pending ? 'กำลังเปลี่ยนแพลน…' : 'รับทราบและยืนยันดาวน์เกรด'}
            </button>
          </form>
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.done && <p className="text-sm text-green-700">เปลี่ยนแพลนแล้ว — มีผลทันที</p>}
    </div>
  );
}

// ---------- Feature overrides รายร้าน ----------

const OVERRIDE_KEYS: FeatureKey[] = [
  'custom_domain',
  'slip_verify_api',
  'line_oa',
  'discount_codes',
  'analytics_dashboard',
  'staff_accounts',
  'wishlist',
  'related_products',
];

export function OverridesPanel({
  tenantId,
  overrides,
  resolved,
}: {
  tenantId: string;
  overrides: Record<string, unknown>;
  resolved: Record<string, boolean>;
}) {
  const [state, formAction, pending] = useActionState<OverridesState, FormData>(
    superSaveOverrides.bind(null, tenantId),
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {OVERRIDE_KEYS.map((key) => {
          const current =
            typeof overrides[key] === 'boolean' ? (overrides[key] ? 'on' : 'off') : 'inherit';
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2"
            >
              <div>
                <p className="text-sm text-gray-900">{FEATURE_LABEL_TH[key]}</p>
                <p className="text-xs text-gray-400">
                  ค่าที่มีผลตอนนี้: {resolved[key] ? 'เปิด' : 'ปิด'}
                </p>
              </div>
              <select
                name={`override_${key}`}
                defaultValue={current}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              >
                <option value="inherit">ตามแพลน</option>
                <option value="on">บังคับเปิด</option>
                <option value="off">บังคับปิด</option>
              </select>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? 'กำลังบันทึก…' : 'บันทึก overrides'}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.done && <p className="text-sm text-green-700">บันทึกแล้ว — มีผลทันที</p>}
      </div>
    </form>
  );
}

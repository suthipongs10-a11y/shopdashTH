// ตั้งค่าแพลตฟอร์ม (Super Admin) — PromptPay รับเงินค่าแพลน (เก็บใน DB, migration 011)
// อ่านค่าที่เก็บใน DB เพื่อเติมฟอร์ม (ว่าง = ยังไม่เคยตั้ง → ระบบ fallback ไป env)

import { getPlatformPromptpay, getPlatformPromptpayStored, hasPlatformLineToken } from '@/lib/platform-settings';
import { PlatformLineForm, PlatformPromptpayForm } from './settings-form';

export const dynamic = 'force-dynamic';

export default async function PlatformSettingsPage() {
  const [stored, effective, lineEnabled] = await Promise.all([
    getPlatformPromptpayStored(),
    getPlatformPromptpay(),
    hasPlatformLineToken(),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">ตั้งค่าแพลตฟอร์ม</h1>
      <p className="mb-6 text-sm font-medium text-gray-600">
        ค่าที่ระบบใช้อยู่ตอนนี้:{' '}
        <span className="font-bold text-gray-900">
          {effective.id ? `${effective.id} (${effective.name})` : 'ยังไม่ได้ตั้งค่า'}
        </span>
      </p>

      <div className="space-y-6">
        <PlatformPromptpayForm promptpayId={stored.id} promptpayName={stored.name} />
        <PlatformLineForm hasToken={lineEnabled} />
      </div>
    </div>
  );
}

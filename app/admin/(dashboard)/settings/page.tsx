// ตั้งค่าร้าน (§2.3): ชื่อ, โลโก้, แบนเนอร์, PromptPay, ที่อยู่, ค่าส่ง flat + ส่งฟรีขั้นต่ำ

import { publicR2Url } from '@/lib/r2';
import { getTenantContext } from '@/lib/tenant-context';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const ctx = await getTenantContext();
  const store = ctx.store;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">ตั้งค่าร้าน</h1>
      <SettingsForm
        values={{
          name: store.name,
          promptpay_id: store.promptpay_id,
          promptpay_account_name: store.promptpay_account_name,
          address: store.address,
          phone: store.phone,
          flat_shipping_fee: store.flat_shipping_fee,
          free_shipping_min: store.free_shipping_min,
          logoUrl: store.logo_r2_key ? publicR2Url(store.logo_r2_key) : null,
          bannerUrl: store.banner_r2_key ? publicR2Url(store.banner_r2_key) : null,
        }}
      />
    </div>
  );
}

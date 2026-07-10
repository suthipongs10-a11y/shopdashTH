// ตั้งค่าร้าน (§2.3): ชื่อ, โลโก้, แบนเนอร์, PromptPay, ที่อยู่, ค่าส่ง flat + ส่งฟรีขั้นต่ำ
// P4: เชื่อม LINE OA (feature flag `line_oa`)

import { publicR2Url } from '@/lib/r2';
import { getTenantContext } from '@/lib/tenant-context';
import { LineForm } from './line-form';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const ctx = await getTenantContext();
  const store = ctx.store;

  // staff เข้าหน้านี้ไม่ได้ (§2.3)
  const { getStoreUser, userRole } = await import('@/lib/auth');
  const user = await getStoreUser(ctx);
  if (user && userRole(user) !== 'store_owner') {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        เฉพาะเจ้าของร้านเท่านั้นที่แก้ไขตั้งค่าร้านได้
      </div>
    );
  }

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
          order_cutoff_time: store.order_cutoff_time,
          shipping_note_th: store.shipping_note_th,
          logoUrl: store.logo_r2_key ? publicR2Url(store.logo_r2_key) : null,
          bannerUrl: store.banner_r2_key ? publicR2Url(store.banner_r2_key) : null,
        }}
      />

      {ctx.features.line_oa && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">แจ้งเตือนผ่าน LINE OA</h2>
          <LineForm hasToken={!!store.line_channel_access_token} />
        </section>
      )}
    </div>
  );
}
